/**
 * Content-stream interpreter for text.
 *
 * Walks a page (recursing into Form XObjects) with the graphics and text state
 * machine from PDF 32000 §9.4, producing one record per shown glyph: its exact
 * page-space position and the operator/byte range that drew it. Interpretation
 * is deterministic, so running it on a copy of the same page yields the same
 * glyph ids — edits made in the preview apply unchanged to the exported file.
 */
import { PDFArray, PDFContext, PDFDict, PDFName, PDFNumber, PDFObject, PDFPage, PDFRef, PDFStream } from 'pdf-lib';
import { FontCache, FontInfo } from './fonts';
import { parseContent, type Op, type Operand } from './lexer';
import { IDENTITY, type Mat, type Rect, apply, applyVec, mul, translate } from './matrix';
import { N, arrayNumbers, contentBytes, getArray, getDict, getName, getNumber, resolve, streamBytes } from './pdfobj';

export interface Color {
    space: 'gray' | 'rgb' | 'cmyk';
    c: number[];
}

export const BLACK: Color = { space: 'gray', c: [0] };

export function colorToRgb(col: Color): [number, number, number] {
    const cl = (v: number) => Math.min(1, Math.max(0, v));
    if (col.space === 'gray') return [cl(col.c[0]), cl(col.c[0]), cl(col.c[0])];
    if (col.space === 'rgb') return [cl(col.c[0]), cl(col.c[1]), cl(col.c[2])];
    const [c, m, y, k] = col.c.map(cl);
    return [(1 - c) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k)];
}

export function colorToCss(col: Color): string {
    const [r, g, b] = colorToRgb(col);
    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

export interface GlyphRec {
    /** Stable id: `${container}|${opIndex}|${arrIndex}|${start}`. */
    key: string;
    container: string;
    opIndex: number;
    arrIndex: number;
    start: number;
    len: number;
    code: number;
    unicode: string;
    font: FontInfo;
    fontRes: string;
    fontSize: number;
    /** Glyph origin on the baseline, page user space. */
    x: number;
    y: number;
    /** Baseline end of the glyph's own width (no Tc/Tw), page space. */
    ex: number;
    ey: number;
    /** Effective font size in page space. */
    size: number;
    /** Baseline direction in radians (page space). */
    angle: number;
    hScale: number;
    charSpace: number;
    wordSpace: number;
    rise: number;
    renderMode: number;
    fill: Color;
    stroke: Color;
    /** Text-space advance used by the writer (w0*Tfs + Tc + Tw) * Th, pre-CTM. */
    txAdvance: number;
    visible: boolean;
    /** Glyphs drawn inside one /ActualText span share a cluster id (-1 when none). */
    cluster: number;
    /** Linear part of Tm × CTM (text-space unit -> page), without font size / Tz. */
    lin: [number, number, number, number];
}

export interface Container {
    key: string;
    /** Decoded content bytes the op offsets refer to. */
    bytes: Uint8Array;
    ops: Op[];
    resources: PDFDict | undefined;
    /** Form XObject ref (undefined for page content). */
    formRef?: PDFRef;
    /** Parent container key + Do op index that invoked this form. */
    parent?: { key: string; opIndex: number; name: string };
    /** Net unclosed `q` at end of stream / count of `Q` underflows. */
    finalDepth: number;
    underflow: number;
}

export interface ImageRec {
    container: string;
    opIndex: number;
    bbox: Rect;
}

export interface PageModel {
    glyphs: GlyphRec[];
    containers: Map<string, Container>;
    images: ImageRec[];
    /** Painted horizontal/vertical line segments and rectangle edges (table rules, cell borders), page space. */
    rules: Rect[];
    /** Page user-space box used for rendering (CropBox ∩ MediaBox). */
    view: Rect;
    rotate: number;
}

interface GState {
    ctm: Mat;
    fill: Color;
    stroke: Color;
    fillSpace: string;
    strokeSpace: string;
    charSpace: number;
    wordSpace: number;
    hScale: number;
    leading: number;
    font: FontInfo | null;
    fontRes: string;
    fontSize: number;
    renderMode: number;
    rise: number;
}

const nums = (args: Operand[]) => args.map((a) => (a.t === 'num' ? a.v : 0));

const MAX_FORM_DEPTH = 8;
const MAX_RULES = 5000;
/** Shortest segment kept as a rule (page units). */
const MIN_RULE = 3;
let clusterSeq = 0;

/** PDF text string -> JS string (UTF-16BE with BOM, UTF-8 with BOM, else PDFDocEncoding≈Latin-1). */
export function decodeTextString(b: Uint8Array): string {
    if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) {
        let s = '';
        for (let i = 2; i + 1 < b.length; i += 2) s += String.fromCharCode((b[i] << 8) | b[i + 1]);
        return s;
    }
    if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return new TextDecoder().decode(b.subarray(3));
    let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return s;
}

export function pageView(ctx: PDFContext, page: PDFPage): { view: Rect; rotate: number } {
    const box = (key: string) => {
        const own = getArray(ctx, page.node, key);
        const inherited = own ?? resolve(ctx, page.node.getInheritableAttribute(PDFName.of(key)));
        const a = arrayNumbers(ctx, inherited instanceof PDFArray ? inherited : undefined);
        return a.length === 4 ? { x0: Math.min(a[0], a[2]), y0: Math.min(a[1], a[3]), x1: Math.max(a[0], a[2]), y1: Math.max(a[1], a[3]) } : null;
    };
    const media = box('MediaBox') ?? { x0: 0, y0: 0, x1: 612, y1: 792 };
    const crop = box('CropBox');
    const view = crop
        ? { x0: Math.max(media.x0, crop.x0), y0: Math.max(media.y0, crop.y0), x1: Math.min(media.x1, crop.x1), y1: Math.min(media.y1, crop.y1) }
        : media;
    const rot = page.getRotation().angle;
    return { view: view.x1 > view.x0 && view.y1 > view.y0 ? view : media, rotate: ((rot % 360) + 360) % 360 };
}

export function interpretPage(ctx: PDFContext, page: PDFPage, fonts: FontCache): PageModel {
    const { view, rotate } = pageView(ctx, page);
    const model: PageModel = { glyphs: [], containers: new Map(), images: [], rules: [], view, rotate };
    const { bytes } = contentBytes(ctx, page.node.get(N('Contents')));
    const resources = page.node.Resources() as PDFDict | undefined;

    const initial: GState = {
        ctm: [...IDENTITY],
        fill: BLACK,
        stroke: BLACK,
        fillSpace: 'DeviceGray',
        strokeSpace: 'DeviceGray',
        charSpace: 0,
        wordSpace: 0,
        hScale: 1,
        leading: 0,
        font: null,
        fontRes: '',
        fontSize: 0,
        renderMode: 0,
        rise: 0,
    };
    runStream(ctx, fonts, model, '', bytes, resources, initial, undefined, undefined, 0, new Set());
    return model;
}

function runStream(
    ctx: PDFContext,
    fonts: FontCache,
    model: PageModel,
    key: string,
    bytes: Uint8Array,
    resources: PDFDict | undefined,
    start: GState,
    formRef: PDFRef | undefined,
    parent: Container['parent'],
    depth: number,
    visiting: Set<string>,
) {
    const ops = parseContent(bytes);
    const container: Container = { key, bytes, ops, resources, formRef, parent, finalDepth: 0, underflow: 0 };
    model.containers.set(key, container);

    let gs: GState = { ...start };
    const stack: GState[] = [];
    let tm: Mat = [...IDENTITY];
    let tlm: Mat = [...IDENTITY];
    // Marked-content stack; entries carry /ActualText when present.
    const marked: ({ text: string; consumed: boolean; id: number } | null)[] = [];

    const fontRes = getDict(ctx, resources, 'Font');
    const xobjRes = getDict(ctx, resources, 'XObject');
    const csRes = getDict(ctx, resources, 'ColorSpace');

    const setFont = (name: string, size: number) => {
        gs.fontRes = name;
        gs.fontSize = size;
        const f = fontRes?.get(N(name));
        if (f instanceof PDFRef) gs.font = fonts.get(f);
        else if (f instanceof PDFDict) gs.font = fonts.get(f);
        else gs.font = null;
    };

    const nextLine = (tx: number, ty: number) => {
        tlm = mul(translate(tx, ty), tlm);
        tm = [...tlm];
    };

    const show = (str: Uint8Array, opIndex: number, arrIndex: number) => {
        const font = gs.font;
        if (!font) return;
        const glyphs = font.decode(str);
        const th = gs.hScale;
        const tfs = gs.fontSize;
        const visible = gs.renderMode !== 3 && gs.renderMode !== 7;
        const span = marked.find((m) => m !== null) ?? null;
        for (const g of glyphs) {
            let unicode = g.unicode;
            if (span) {
                unicode = span.consumed ? '' : span.text;
                span.consumed = true;
            }
            if (!font.usedCodes.has(g.code)) {
                font.usedCodes.add(g.code);
                font.resetReverse();
            }
            const trmBase = mul(tm, gs.ctm);
            const [ox, oy] = apply(trmBase, 0, gs.rise);
            const [vx, vy] = applyVec(trmBase, g.width * tfs * th, 0);
            const [ux, uy] = applyVec(trmBase, 0, tfs);
            const size = Math.hypot(ux, uy);
            const tx = (g.width * tfs + gs.charSpace + (g.wordSpace ? gs.wordSpace : 0)) * th;
            const [ax, ay] = applyVec(trmBase, 1, 0);
            model.glyphs.push({
                key: `${key}|${opIndex}|${arrIndex}|${g.start}`,
                container: key,
                opIndex,
                arrIndex,
                start: g.start,
                len: g.len,
                code: g.code,
                unicode,
                font,
                fontRes: gs.fontRes,
                fontSize: tfs,
                x: ox,
                y: oy,
                ex: ox + vx,
                ey: oy + vy,
                size,
                angle: Math.atan2(ay, ax),
                hScale: th,
                charSpace: gs.charSpace,
                wordSpace: gs.wordSpace,
                rise: gs.rise,
                renderMode: gs.renderMode,
                fill: gs.fill,
                stroke: gs.stroke,
                txAdvance: tx,
                visible: visible && size > 0.5,
                cluster: span ? span.id : -1,
                lin: [trmBase[0], trmBase[1], trmBase[2], trmBase[3]],
            });
            tm = mul(translate(tx, 0), tm);
        }
    };

    type Space = { kind: 'gray' | 'rgb' | 'cmyk' | 'other'; indexed?: { base: 'gray' | 'rgb' | 'cmyk'; lookup: Uint8Array } };
    const resolveSpace = (name: string): Space => {
        if (name === 'DeviceGray' || name === 'G' || name === 'CalGray') return { kind: 'gray' };
        if (name === 'DeviceRGB' || name === 'RGB' || name === 'CalRGB') return { kind: 'rgb' };
        if (name === 'DeviceCMYK' || name === 'CMYK') return { kind: 'cmyk' };
        const fromObj = (o: PDFObject | undefined): Space => {
            const r = resolve(ctx, o);
            if (r instanceof PDFName) return resolveSpace(r.decodeText());
            if (r instanceof PDFArray) {
                const fam = resolve(ctx, r.get(0));
                const famName = fam instanceof PDFName ? fam.decodeText() : '';
                if (famName === 'ICCBased') {
                    const s = resolve(ctx, r.get(1));
                    const n = s instanceof PDFStream ? getNumber(ctx, s.dict, 'N') : undefined;
                    return { kind: n === 1 ? 'gray' : n === 4 ? 'cmyk' : 'rgb' };
                }
                if (famName === 'CalRGB' || famName === 'Lab') return { kind: 'rgb' };
                if (famName === 'CalGray') return { kind: 'gray' };
                if (famName === 'Indexed' || famName === 'I') {
                    const base = fromObj(r.get(1));
                    const lk = resolve(ctx, r.get(3));
                    let lookup: Uint8Array | undefined;
                    if (lk instanceof PDFStream) {
                        try {
                            lookup = streamBytes(lk);
                        } catch {
                            lookup = undefined;
                        }
                    } else if (lk && 'asBytes' in lk) {
                        lookup = (lk as unknown as { asBytes(): Uint8Array }).asBytes();
                    }
                    if (lookup && base.kind !== 'other') return { kind: 'other', indexed: { base: base.kind, lookup } };
                }
            }
            return { kind: 'other' };
        };
        return fromObj(csRes && resolve(ctx, csRes.get(N(name))));
    };

    const setColor = (which: 'fill' | 'stroke', args: Operand[]) => {
        const values = nums(args.filter((a) => a.t === 'num'));
        const sp = resolveSpace(which === 'fill' ? gs.fillSpace : gs.strokeSpace);
        let col: Color = BLACK;
        if (sp.kind === 'gray') col = { space: 'gray', c: [values[0] ?? 0] };
        else if (sp.kind === 'rgb') col = { space: 'rgb', c: [values[0] ?? 0, values[1] ?? 0, values[2] ?? 0] };
        else if (sp.kind === 'cmyk') col = { space: 'cmyk', c: [values[0] ?? 0, values[1] ?? 0, values[2] ?? 0, values[3] ?? 1] };
        else if (sp.indexed) {
            const n = sp.indexed.base === 'gray' ? 1 : sp.indexed.base === 'rgb' ? 3 : 4;
            const i = Math.round(values[0] ?? 0) * n;
            const comps = Array.from(sp.indexed.lookup.slice(i, i + n)).map((v) => v / 255);
            col = comps.length === n ? { space: sp.indexed.base, c: comps } : BLACK;
        } else if (values.length === 1) {
            // Separation / DeviceN tint: approximate as darkness
            col = { space: 'gray', c: [1 - Math.min(1, Math.max(0, values[0]))] };
        }
        if (which === 'fill') gs.fill = col;
        else gs.stroke = col;
    };

    const recordImage = (i: number) => {
        const pts = [apply(gs.ctm, 0, 0), apply(gs.ctm, 1, 0), apply(gs.ctm, 1, 1), apply(gs.ctm, 0, 1)];
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
        model.images.push({ container: key, opIndex: i, bbox: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) } });
    };

    // Current path as straight page-space segments (curves only move the pen).
    let segs: [number, number, number, number][] = [];
    let pen: [number, number] | null = null;
    let subStart: [number, number] | null = null;
    const lineTo = (p: [number, number]) => {
        if (pen) segs.push([pen[0], pen[1], p[0], p[1]]);
        pen = p;
    };
    const closePath = () => {
        if (pen && subStart) lineTo(subStart);
    };
    const endPath = (painted: boolean) => {
        if (painted) {
            for (const [x0, y0, x1, y1] of segs) {
                if (model.rules.length >= MAX_RULES) break;
                const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
                if ((w < 0.3 && h >= MIN_RULE) || (h < 0.3 && w >= MIN_RULE)) {
                    model.rules.push({ x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1) });
                }
            }
        }
        segs = [];
        pen = subStart = null;
    };

    for (let i = 0; i < ops.length; i++) {
        const { op, args } = ops[i];
        switch (op) {
            case 'q':
                stack.push({ ...gs });
                break;
            case 'Q':
                if (stack.length) gs = stack.pop()!;
                else container.underflow++;
                break;
            case 'cm': {
                const m = nums(args);
                if (m.length === 6) gs.ctm = mul(m as Mat, gs.ctm);
                break;
            }
            case 'm': {
                const [x, y] = nums(args);
                pen = subStart = apply(gs.ctm, x ?? 0, y ?? 0);
                break;
            }
            case 'l': {
                const [x, y] = nums(args);
                lineTo(apply(gs.ctm, x ?? 0, y ?? 0));
                break;
            }
            case 'c': {
                const a = nums(args);
                pen = apply(gs.ctm, a[4] ?? 0, a[5] ?? 0);
                break;
            }
            case 'v':
            case 'y': {
                const a = nums(args);
                pen = apply(gs.ctm, a[2] ?? 0, a[3] ?? 0);
                break;
            }
            case 'h':
                closePath();
                break;
            case 're': {
                const [x = 0, y = 0, w = 0, h = 0] = nums(args);
                const p = [apply(gs.ctm, x, y), apply(gs.ctm, x + w, y), apply(gs.ctm, x + w, y + h), apply(gs.ctm, x, y + h)];
                pen = subStart = p[0];
                for (let k = 1; k <= 4; k++) lineTo(p[k % 4]);
                break;
            }
            case 's':
            case 'b':
            case 'b*':
                closePath();
                endPath(true);
                break;
            case 'S':
            case 'f':
            case 'F':
            case 'f*':
            case 'B':
            case 'B*':
                endPath(true);
                break;
            case 'n':
                endPath(false);
                break;
            case 'BT':
                tm = [...IDENTITY];
                tlm = [...IDENTITY];
                break;
            case 'Tf':
                setFont(args[0]?.t === 'name' ? args[0].v : '', args[1]?.t === 'num' ? args[1].v : 0);
                break;
            case 'Tc':
                gs.charSpace = nums(args)[0] ?? 0;
                break;
            case 'Tw':
                gs.wordSpace = nums(args)[0] ?? 0;
                break;
            case 'Tz':
                gs.hScale = (nums(args)[0] ?? 100) / 100;
                break;
            case 'TL':
                gs.leading = nums(args)[0] ?? 0;
                break;
            case 'Tr':
                gs.renderMode = nums(args)[0] ?? 0;
                break;
            case 'Ts':
                gs.rise = nums(args)[0] ?? 0;
                break;
            case 'Td': {
                const [tx, ty] = nums(args);
                nextLine(tx ?? 0, ty ?? 0);
                break;
            }
            case 'TD': {
                const [tx, ty] = nums(args);
                gs.leading = -(ty ?? 0);
                nextLine(tx ?? 0, ty ?? 0);
                break;
            }
            case 'Tm': {
                const m = nums(args);
                if (m.length === 6) {
                    tlm = m as Mat;
                    tm = [...tlm];
                }
                break;
            }
            case 'T*':
                nextLine(0, -gs.leading);
                break;
            case 'Tj':
                if (args[0]?.t === 'str') show(args[0].v, i, 0);
                break;
            case "'":
                nextLine(0, -gs.leading);
                if (args[0]?.t === 'str') show(args[0].v, i, 0);
                break;
            case '"': {
                const [aw, ac] = nums(args.slice(0, 2));
                gs.wordSpace = aw ?? 0;
                gs.charSpace = ac ?? 0;
                nextLine(0, -gs.leading);
                if (args[2]?.t === 'str') show(args[2].v, i, 0);
                break;
            }
            case 'TJ': {
                const arr = args[0]?.t === 'arr' ? args[0].v : [];
                arr.forEach((item, k) => {
                    if (item.t === 'str') show(item.v, i, k);
                    else if (item.t === 'num') tm = mul(translate((-item.v / 1000) * gs.fontSize * gs.hScale, 0), tm);
                });
                break;
            }
            case 'g':
                gs.fillSpace = 'DeviceGray';
                setColor('fill', args);
                break;
            case 'G':
                gs.strokeSpace = 'DeviceGray';
                setColor('stroke', args);
                break;
            case 'rg':
                gs.fillSpace = 'DeviceRGB';
                setColor('fill', args);
                break;
            case 'RG':
                gs.strokeSpace = 'DeviceRGB';
                setColor('stroke', args);
                break;
            case 'k':
                gs.fillSpace = 'DeviceCMYK';
                setColor('fill', args);
                break;
            case 'K':
                gs.strokeSpace = 'DeviceCMYK';
                setColor('stroke', args);
                break;
            case 'cs':
                gs.fillSpace = args[0]?.t === 'name' ? args[0].v : 'DeviceGray';
                gs.fill = BLACK;
                break;
            case 'CS':
                gs.strokeSpace = args[0]?.t === 'name' ? args[0].v : 'DeviceGray';
                gs.stroke = BLACK;
                break;
            case 'sc':
            case 'scn':
                setColor('fill', args);
                break;
            case 'SC':
            case 'SCN':
                setColor('stroke', args);
                break;
            case 'gs': {
                const extRes = getDict(ctx, resources, 'ExtGState');
                const nm = args[0]?.t === 'name' ? args[0].v : '';
                const ext = extRes && getDict(ctx, extRes, nm);
                const fontArr = ext && getArray(ctx, ext, 'Font');
                if (fontArr) {
                    const fref = fontArr.get(0);
                    const sz = resolve(ctx, fontArr.get(1));
                    if (fref instanceof PDFRef) {
                        gs.font = fonts.get(fref);
                        gs.fontRes = '';
                        gs.fontSize = sz instanceof PDFNumber ? sz.asNumber() : gs.fontSize;
                    }
                }
                break;
            }
            case 'BMC':
                marked.push(null);
                break;
            case 'BDC': {
                let props = args[1];
                if (props?.t === 'name') {
                    const propRes = getDict(ctx, resources, 'Properties');
                    const pd = propRes && getDict(ctx, propRes, props.v);
                    const at = pd && resolve(ctx, pd.get(N('ActualText')));
                    const b = at && 'asBytes' in at ? (at as unknown as { asBytes(): Uint8Array }).asBytes() : undefined;
                    props = b ? { t: 'dict', v: new Map([['ActualText', { t: 'str', v: b, hex: true }]]) } : undefined;
                }
                const at = props?.t === 'dict' ? props.v.get('ActualText') : undefined;
                marked.push(at?.t === 'str' ? { text: decodeTextString(at.v), consumed: false, id: clusterSeq++ } : null);
                break;
            }
            case 'EMC':
                marked.pop();
                break;
            case 'Do': {
                const nm = args[0]?.t === 'name' ? args[0].v : '';
                const xref = xobjRes?.get(N(nm));
                const xo = resolve(ctx, xref);
                if (!(xo instanceof PDFStream)) break;
                const sub = getName(ctx, xo.dict, 'Subtype');
                if (sub === 'Image') {
                    recordImage(i);
                } else if (sub === 'Form' && depth < MAX_FORM_DEPTH) {
                    const refKey = xref instanceof PDFRef ? xref.toString() : `inline${i}`;
                    if (visiting.has(refKey)) break;
                    visiting.add(refKey);
                    const fm = arrayNumbers(ctx, getArray(ctx, xo.dict, 'Matrix'));
                    const formCtm = fm.length === 6 ? mul(fm as Mat, gs.ctm) : gs.ctm;
                    let formBytes: Uint8Array;
                    try {
                        formBytes = streamBytes(xo);
                    } catch {
                        visiting.delete(refKey);
                        break;
                    }
                    const formRes = getDict(ctx, xo.dict, 'Resources') ?? resources;
                    const childKey = key ? `${key}/${i}` : `${i}`;
                    runStream(ctx, fonts, model, childKey, formBytes, formRes, { ...gs, ctm: formCtm }, xref instanceof PDFRef ? xref : undefined, { key, opIndex: i, name: nm }, depth + 1, visiting);
                    visiting.delete(refKey);
                }
                break;
            }
            case 'BI':
                recordImage(i);
                break;
            default:
                break;
        }
    }
    container.finalDepth = stack.length;
}

/** Glyph extent box in page space (axis-aligned), using font ascent/descent. */
export function glyphBox(g: GlyphRec): Rect {
    const ux = -Math.sin(g.angle), uy = Math.cos(g.angle);
    const asc = g.font.ascent * g.size, desc = g.font.descent * g.size;
    const pts = [
        [g.x + ux * desc, g.y + uy * desc],
        [g.ex + ux * desc, g.ey + uy * desc],
        [g.x + ux * asc, g.y + uy * asc],
        [g.ex + ux * asc, g.ey + uy * asc],
    ];
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
