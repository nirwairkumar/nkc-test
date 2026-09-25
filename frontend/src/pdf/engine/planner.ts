/**
 * Text-edit planner: turns (original block, new text, overrides) into
 *  - the set of original glyphs to remove, and
 *  - positioned glyphs to draw.
 *
 * Fidelity rules, in priority order:
 *  1. Untouched lines are not touched at all (byte-identical in the output).
 *  2. Unchanged atoms on a changed line are redrawn from their ORIGINAL glyph
 *     codes — identical shapes, even for Hindi clusters.
 *  3. Typed characters are encoded in the original embedded font when its
 *     subset has the glyph.
 *  4. Only missing glyphs fall back to a close standard/Noto font, and the plan
 *     reports every substitution so the UI can be honest about it.
 */
import { FaceRegistry, notoId, type Face } from './faces';
import type { FontInfo } from './fonts';
import { diff } from './diff';
import type { AddTextEdit, RGB, TextEdit } from './edits';
import { BLACK, type Color, type GlyphRec } from './interpreter';
import { type Align, type Atom, type TextBlock, type TextStyle, fromFrame, joinsDirectly, spaceGap, toFrame } from './layout';
import type { Rect } from './matrix';

export interface PlannedGlyph {
    face: Face;
    bytes: Uint8Array;
    /** Glyph origin in the angle frame (page units). */
    u: number;
    v: number;
    /** Advance the viewer applies after this glyph (page units). */
    adv: number;
    /** Tf size to use. */
    tf: number;
    /** Linear text matrix (text unit -> page), without size. */
    lin: [number, number, number, number];
    hScale: number;
    renderMode: number;
    fill: Color;
    stroke: Color;
    ascent: number;
    descent: number;
    /**
     * Marked-content /ActualText span: shaped scripts (Devanagari) draw glyphs in
     * visual order, so copy/paste and search need the logical text attached.
     */
    actual?: { text: string; start: boolean; end: boolean };
}

export interface TextPlan {
    angle: number;
    glyphs: PlannedGlyph[];
    remove: Set<string>;
    /** Characters no available font could show (dropped). */
    missing: string[];
    /** Characters drawn with a substitute font: char -> font label. */
    substituted: Map<string, string>;
    bbox: Rect | null;
    overflow: boolean;
    /** Number of original lines left untouched at the top of a paragraph. */
    keptLines: number;
}

type Tok =
    | { t: 'atom'; atom: Atom; line: number; idx: number }
    | { t: 'char'; ch: string; style: number; line: number }
    /** `width`/`glyphs` are set for an unchanged original space: keep its exact gap and glyph. */
    | { t: 'space'; style: number; line: number; width?: number; glyphs?: GlyphRec[] }
    | { t: 'break'; line: number };

const rgbColor = (c: RGB): Color => ({ space: 'rgb', c: [...c] });

/** Max fraction of a word space a justified line may give up to avoid wrapping. */
const SQUEEZE = 0.2;

/** Attaches an /ActualText span to glyphs[from..]. */
function markActual(glyphs: { actual?: PlannedGlyph['actual'] }[], from: number, text: string) {
    if (glyphs.length - from <= 0 || !text) return;
    for (let i = from; i < glyphs.length; i++) glyphs[i].actual = { text, start: i === from, end: i === glyphs.length - 1 };
}

const norm = (a: number, b: number) => Math.hypot(a, b) || 1;

/** Glyph code bytes as they appear in the content stream. */
export function glyphBytes(g: GlyphRec): Uint8Array {
    const out = new Uint8Array(g.len);
    for (let k = 0; k < g.len; k++) out[k] = (g.code >> (8 * (g.len - 1 - k))) & 0xff;
    return out;
}

interface Overrides {
    family?: string;
    scale: number;
    color?: RGB;
    bold?: boolean;
    italic?: boolean;
    align?: Align;
    du: number;
    dv: number;
    width?: number;
}

/**
 * The box (along the baseline, angle frame) a block's text wraps in when given
 * a width: it keeps the edge — or the centre — the original text was aligned to.
 */
export function textBox(block: TextBlock, width: number): { left: number; right: number } {
    const l = block.paragraph ? block.uLeft : block.lines[0].u0;
    const r = block.paragraph ? block.uRight : block.lines[0].u1;
    if (block.align === 'right') return { left: r - width, right: r };
    if (block.align === 'center') return { left: (l + r) / 2 - width / 2, right: (l + r) / 2 + width / 2 };
    return { left: l, right: l + width };
}

/** Custom fonts the planner may reach for — prepare these on the registry first. */
export function customFontsForEdit(block: TextBlock, edit: TextEdit): string[] {
    const st = block.styles[block.mainStyle];
    return customFontsFor(edit.text, edit.family, st.font.fontClass, edit.bold ?? st.font.bold, edit.italic ?? st.font.italic);
}

export function customFontsFor(text: string, family: string | undefined, cls: FontInfo['fontClass'], bold: boolean, italic: boolean): string[] {
    const ids = new Set<string>(FaceRegistry.neededCustomFonts(text, cls, bold, italic));
    if (family?.startsWith('noto-')) ids.add(notoId(family, bold, italic));
    return [...ids];
}

export function familyFace(faces: FaceRegistry, family: string, bold: boolean, italic: boolean, docFonts: FontInfo[]): Face | null {
    if (family.startsWith('doc:')) {
        const f = docFonts.find((d) => d.ref?.toString() === family.slice(4));
        return f ? faces.origFace(f) : null;
    }
    if (family === 'helvetica' || family === 'times' || family === 'courier') return faces.stdFace(family, bold, italic);
    if (family.startsWith('noto-')) return faces.customFace(notoId(family, bold, italic));
    return faces.stdFace('helvetica', bold, italic);
}

export function planTextEdit(block: TextBlock, edit: TextEdit, faces: FaceRegistry, docFonts: FontInfo[]): TextPlan | null {
    const angle = block.angle;
    const main = block.styles[block.mainStyle];
    const [du, dv] = toFrame(angle, edit.dx ?? 0, edit.dy ?? 0);
    const ov: Overrides = {
        family: edit.family && edit.family !== 'original' ? edit.family : undefined,
        scale: edit.size && main.size > 0 ? edit.size / main.size : 1,
        color: edit.color,
        bold: edit.bold !== undefined && edit.bold !== main.font.bold ? edit.bold : undefined,
        italic: edit.italic !== undefined && edit.italic !== main.font.italic ? edit.italic : undefined,
        align: edit.align && edit.align !== block.align ? edit.align : undefined,
        du,
        dv,
        width: edit.width && edit.width > 0 ? edit.width : undefined,
    };
    const hasOverrides =
        !!ov.family ||
        Math.abs(ov.scale - 1) > 1e-3 ||
        !!ov.color ||
        ov.bold !== undefined ||
        ov.italic !== undefined ||
        !!ov.align ||
        Math.abs(du) > 1e-3 ||
        Math.abs(dv) > 1e-3 ||
        ov.width !== undefined;

    // ---- 1. Old units (chars) with their atom/line origin
    type Unit = { ch: string; line: number; atom: number; join: boolean; style: number };
    const units: Unit[] = [];
    block.lines.forEach((line, li) => {
        if (li > 0 && !joinsDirectly(block.lines[li - 1])) units.push({ ch: ' ', line: li - 1, atom: -1, join: true, style: block.mainStyle });
        line.atoms.forEach((a, ai) => {
            if (a.soft) return;
            for (const ch of Array.from(a.text)) units.push({ ch, line: li, atom: ai, join: false, style: a.style });
        });
    });
    const newChars = Array.from(edit.text);
    const ops = diff(
        units.map((u) => u.ch),
        newChars,
    );

    // ---- 2. Which atoms survive intact
    const keptNewPos = new Int32Array(units.length).fill(-1);
    for (const o of ops) if (o.op === 'equal') for (let k = 0; k < o.len; k++) keptNewPos[o.a + k] = o.b + k;
    const atomUnits = new Map<string, number[]>();
    units.forEach((u, i) => {
        if (u.atom < 0) return;
        const key = u.line + ':' + u.atom;
        if (!atomUnits.has(key)) atomUnits.set(key, []);
        atomUnits.get(key)!.push(i);
    });
    const retained = new Set<string>();
    for (const [key, idxs] of atomUnits) {
        const pos = idxs.map((i) => keptNewPos[i]);
        if (pos.every((p, k) => p >= 0 && (k === 0 || p === pos[k - 1] + 1))) retained.add(key);
    }

    // ---- 3. Token stream in new-text order + dirty lines
    const toks: Tok[] = [];
    const dirty = new Set<number>();
    const newToOld = new Int32Array(newChars.length).fill(-1);
    for (const o of ops) if (o.op === 'equal') for (let k = 0; k < o.len; k++) newToOld[o.b + k] = o.a + k;
    // Style/line context for inserted chars: the old unit just before the insertion point.
    const ctxBefore = new Int32Array(newChars.length + 1).fill(-1);
    {
        let lastOld = -1;
        for (const o of ops) {
            if (o.op === 'equal') {
                for (let k = 0; k < o.len; k++) ctxBefore[o.b + k] = o.a + k;
                lastOld = o.a + o.len - 1;
            } else if (o.op === 'delete') {
                lastOld = o.a; // replacement text takes the style of what it replaced
                for (let k = 0; k < o.len; k++) dirty.add(units[o.a + k].line);
                if (units[o.a].join) dirty.add(units[o.a].line + 1);
            } else {
                for (let k = 0; k < o.len; k++) ctxBefore[o.b + k] = lastOld;
            }
        }
    }
    for (let j = 0; j < newChars.length; j++) {
        const oldIdx = newToOld[j];
        if (oldIdx >= 0) {
            const u = units[oldIdx];
            if (u.join) {
                toks.push({ t: 'space', style: u.style, line: u.line + 1 });
                continue;
            }
            const srcLine = block.lines[u.line];
            const srcAtom = srcLine.atoms[u.atom];
            if (/^\s+$/.test(srcAtom.text)) {
                toks.push({ t: 'space', style: u.style, line: u.line, width: spaceGap(srcLine, u.atom), glyphs: srcAtom.glyphs });
                continue;
            }
            const key = u.line + ':' + u.atom;
            if (retained.has(key)) {
                // Emit the atom once, at its first unit.
                if (atomUnits.get(key)![0] === oldIdx) toks.push({ t: 'atom', atom: srcAtom, line: u.line, idx: u.atom });
                continue;
            }
            dirty.add(u.line);
            if (/\s/.test(u.ch)) toks.push({ t: 'space', style: u.style, line: u.line });
            else toks.push({ t: 'char', ch: u.ch, style: u.style, line: u.line });
            continue;
        }
        // Inserted
        const c = ctxBefore[j] >= 0 ? units[ctxBefore[j]] : units[0];
        const style = c ? c.style : block.mainStyle;
        const line = c ? (c.join ? c.line + 1 : c.line) : 0;
        dirty.add(line);
        const ch = newChars[j];
        if (ch === '\n') toks.push({ t: 'break', line });
        else if (/\s/.test(ch)) toks.push({ t: 'space', style, line });
        else toks.push({ t: 'char', ch, style, line });
    }

    if (!dirty.size && !hasOverrides) return null;

    const nLines = block.lines.length;
    /** Index of the first non-space atom of each line. */
    const firstWordAtom = block.lines.map((l) => l.atoms.findIndex((a) => !/^\s*$/.test(a.text)));
    const remove = new Set<string>();
    const out: PlannedGlyph[] = [];
    const missing: string[] = [];
    const substituted = new Map<string, string>();

    // ---- 4. Face selection
    const variantOf = (font: FontInfo, bold: boolean, italic: boolean): FontInfo | null => {
        if (font.bold === bold && font.italic === italic) return font;
        const stem = (f: FontInfo) => f.baseFont.toLowerCase().replace(/[-,]?(bold|italic|oblique|regular|roman|mt|ps|semibold|light|medium)+/g, '');
        const s = stem(font);
        return docFonts.find((f) => f !== font && f.editable && stem(f) === s && f.bold === bold && f.italic === italic) ?? null;
    };

    const preferredFace = (st: TextStyle): Face | null => {
        const bold = ov.bold ?? st.font.bold;
        const italic = ov.italic ?? st.font.italic;
        if (!ov.family) {
            const v = variantOf(st.font, bold, italic);
            return v && v.editable ? faces.origFace(v) : null;
        }
        return familyFace(faces, ov.family, bold, italic, docFonts);
    };

    const faceFor = (ch: string, st: TextStyle, current: Face | null): Face | null => {
        const pref = preferredFace(st);
        // Neutral chars (digits, punctuation) stay in the current run's font to avoid flip-flopping.
        if (current && /^[\s\d\p{P}\p{S}]$/u.test(ch) && current.supports(ch)) return current;
        if (pref?.supports(ch)) return pref;
        const fb = faces.fallbackFor(ch, st.font.fontClass, ov.bold ?? st.font.bold, ov.italic ?? st.font.italic);
        if (fb) substituted.set(ch, fb.label);
        return fb;
    };

    // ---- 5. Word shaping
    interface PieceGlyph extends Omit<PlannedGlyph, 'u' | 'v'> {
        du: number;
        dv: number;
    }
    interface Word {
        glyphs: PieceGlyph[];
        width: number;
        spaceAfter: number;
        spaceGlyph: PieceGlyph | null;
        breakAfter: boolean;
        line: number;
        /** Original line this word begins, when it is that line's unchanged first word. */
        startsLine: number;
        fresh: boolean;
    }

    const styleScale = (st: TextStyle) => ({ sx: norm(st.lin[0], st.lin[1]), sy: norm(st.lin[2], st.lin[3]) });
    const fillOf = (st: TextStyle) => (ov.color ? rgbColor(ov.color) : st.fill);

    const words: Word[] = [];
    let curWord: Word | null = null;
    const newWord = (line: number): Word => {
        const w: Word = { glyphs: [], width: 0, spaceAfter: 0, spaceGlyph: null, breakAfter: false, line, startsLine: -1, fresh: false };
        words.push(w);
        return w;
    };

    let prevAtom: { atom: Atom; line: number; idx: number } | null = null;
    let runFace: Face | null = null;

    const pushFresh = (text: string, st: TextStyle) => {
        if (!curWord) return;
        const { sx, sy } = styleScale(st);
        const tf = st.fontSize * ov.scale;
        const cps = Array.from(text);
        let i = 0;
        while (i < cps.length) {
            const face = faceFor(cps[i], st, runFace);
            if (!face) {
                missing.push(cps[i]);
                i++;
                continue;
            }
            let j = i + 1;
            while (j < cps.length && faceFor(cps[j], st, face) === face) j++;
            runFace = face;
            const shaped = face.shape(cps.slice(i, j).join(''));
            // Keep the original letter-spacing (Tc) so edited text matches its neighbours.
            const tc = st.charSpace;
            for (const g of shaped) {
                const k = tf * st.hScale * sx;
                curWord.glyphs.push({
                    face,
                    bytes: g.bytes,
                    du: curWord.width + g.xOffset * k,
                    dv: g.yOffset * tf * sy,
                    adv: g.advance * k,
                    tf,
                    lin: st.lin,
                    hScale: st.hScale,
                    renderMode: st.renderMode,
                    fill: fillOf(st),
                    stroke: st.stroke,
                    ascent: face.ascent,
                    descent: face.descent,
                    actual: g.cluster,
                });
                curWord.width += g.xAdvance * k + tc * st.hScale * sx;
            }
            i = j;
        }
        prevAtom = null;
    };

    // Batch consecutive fresh chars of the same style so shaping sees whole clusters.
    let pending = '';
    let pendingStyle = -1;
    const flushPending = () => {
        if (pending && pendingStyle >= 0) pushFresh(pending, block.styles[pendingStyle]);
        pending = '';
        pendingStyle = -1;
    };

    /** An original glyph, redrawn from its own code bytes at a new offset. */
    const pieceFromGlyph = (g: GlyphRec, pdu: number, pdv: number): PieceGlyph => ({
        face: faces.origFace(g.font),
        bytes: glyphBytes(g),
        du: pdu,
        dv: pdv,
        adv: Math.hypot(g.ex - g.x, g.ey - g.y) * ov.scale,
        tf: g.fontSize * ov.scale,
        lin: g.lin,
        hScale: g.hScale,
        renderMode: g.renderMode,
        fill: ov.color ? rgbColor(ov.color) : g.fill,
        stroke: g.stroke,
        ascent: g.font.ascent,
        descent: g.font.descent,
    });

    const retainAtom = (tok: { atom: Atom; line: number; idx: number }) => {
        if (!curWord) return;
        const atom = tok.atom;
        const st = block.styles[atom.style];
        // Original inter-atom gap when this atom directly followed the previous one.
        if (prevAtom && prevAtom.line === tok.line && prevAtom.idx === tok.idx - 1 && curWord.glyphs.length) {
            curWord.width += (atom.u0 - prevAtom.atom.u1) * ov.scale;
        } else if (curWord.glyphs.length) {
            curWord.width += st.charSpace * st.hScale * styleScale(st).sx * ov.scale;
        }
        // Font may need to change (bold/italic/family override) -> re-encode instead.
        if (ov.family || ov.bold !== undefined || ov.italic !== undefined) {
            pushFresh(atom.text, st);
            prevAtom = null;
            return;
        }
        const line = block.lines[tok.line];
        const base = curWord.width;
        const first = curWord.glyphs.length;
        for (const g of atom.glyphs) {
            const [gu, gv] = toFrame(angle, g.x, g.y);
            curWord.glyphs.push(pieceFromGlyph(g, base + (gu - atom.u0) * ov.scale, (gv - line.v) * ov.scale));
        }
        // Clusters that came with /ActualText keep it.
        if (atom.glyphs.some((g) => g.cluster >= 0)) markActual(curWord.glyphs, first, atom.text);
        curWord.width = base + (atom.u1 - atom.u0) * ov.scale;
        prevAtom = tok;
        runFace = faces.origFace(atom.glyphs[0]?.font ?? st.font);
    };

    const spaceWidthFor = (st: TextStyle) => {
        if (ov.family) {
            const f = preferredFace(st);
            if (f?.space) return f.space.xAdvance * st.fontSize * ov.scale * st.hScale * styleScale(st).sx;
        }
        return block.spaceWidth * ov.scale;
    };

    const spaceGlyphFor = (st: TextStyle): PieceGlyph | null => {
        const f = runFace?.space ? runFace : null;
        if (!f || !f.space) return null;
        const tf = st.fontSize * ov.scale;
        return {
            face: f,
            bytes: f.space.bytes,
            du: 0,
            dv: 0,
            adv: f.space.advance * tf * st.hScale * styleScale(st).sx,
            tf,
            lin: st.lin,
            hScale: st.hScale,
            renderMode: st.renderMode,
            fill: fillOf(st),
            stroke: st.stroke,
            ascent: f.ascent,
            descent: f.descent,
        };
    };

    // Unchanged text that is only moved and/or recoloured: redraw every original
    // glyph exactly where it was, shifted, so line breaks, spacing and
    // hyphenation stay identical (re-wrapping could reflow a paragraph).
    const sameLayout = Math.abs(ov.scale - 1) <= 1e-3 && !ov.family && ov.bold === undefined && ov.italic === undefined && !ov.align && ov.width === undefined;
    if (!dirty.size && sameLayout) {
        for (const line of block.lines) {
            for (const g of line.glyphs) remove.add(g.key);
            for (const atom of line.atoms) {
                const first = out.length;
                for (const g of atom.glyphs) {
                    const [gu, gv] = toFrame(angle, g.x, g.y);
                    out.push({ ...pieceFromGlyph(g, 0, 0), u: gu + du, v: gv + dv });
                }
                if (atom.glyphs.some((g) => g.cluster >= 0)) markActual(out, first, atom.text);
            }
        }
        return { angle, glyphs: out, remove, missing, substituted, bbox: planBBox(out, angle), overflow: false, keptLines: 0 };
    }

    // Determine which tokens to lay out.
    const firstDirty = hasOverrides ? 0 : Math.min(...dirty);
    const k0 = block.paragraph ? Math.max(0, Math.min(firstDirty, nLines - 1)) : 0;
    const fromTok = toks.findIndex((t) => t.line >= k0);
    const layoutToks = fromTok < 0 ? [] : toks.slice(fromTok);

    for (const tok of layoutToks) {
        if (tok.t === 'space') {
            flushPending();
            if (curWord) {
                const st = block.styles[tok.style];
                const keepOriginal = tok.width !== undefined && !ov.family;
                curWord.spaceAfter += keepOriginal ? tok.width! * ov.scale : spaceWidthFor(st);
                if (!curWord.spaceGlyph) {
                    const og = keepOriginal ? tok.glyphs?.[0] : undefined;
                    curWord.spaceGlyph = og ? pieceFromGlyph(og, 0, 0) : spaceGlyphFor(st);
                }
            }
            curWord = null;
            prevAtom = null;
            continue;
        }
        if (tok.t === 'break') {
            flushPending();
            if (!curWord) curWord = newWord(tok.line);
            curWord.breakAfter = true;
            curWord = null;
            prevAtom = null;
            continue;
        }
        if (!curWord) {
            curWord = newWord(tok.line);
            if (tok.t === 'atom' && tok.idx === firstWordAtom[tok.line]) curWord.startsLine = tok.line;
        }
        if (tok.t === 'char') {
            curWord.fresh = true;
            if (pendingStyle !== tok.style) flushPending();
            pending += tok.ch;
            pendingStyle = tok.style;
        } else {
            flushPending();
            retainAtom(tok);
        }
    }
    flushPending();

    // ---- 6. Line layout
    const lines = block.lines;
    const bodyLeft = lines.length > 1 ? Math.min(...lines.slice(1).map((l) => l.u0)) : lines[0].u0;
    const align: Align = ov.align ?? block.align;
    const lineGap = block.lineGap * ov.scale;

    const placeLine = (ws: Word[], startU: number, v: number, width: number | null, justify: boolean, lineAlign: Align) => {
        let natural = 0;
        ws.forEach((w, i) => (natural += w.width + (i < ws.length - 1 ? w.spaceAfter : 0)));
        let extra = 0;
        let u = startU;
        const gaps = ws.length - 1;
        if (width !== null) {
            // Justified lines stretch, or squeeze spaces by at most SQUEEZE of a space.
            if (justify && gaps > 0) extra = Math.max(-SQUEEZE * block.spaceWidth * ov.scale, (width - natural) / gaps);
            else if (lineAlign === 'center') u = startU + (width - natural) / 2;
            else if (lineAlign === 'right') u = startU + (width - natural);
        }
        ws.forEach((w, i) => {
            for (const g of w.glyphs) out.push({ ...g, u: u + g.du + ov.du, v: v + g.dv + ov.dv });
            u += w.width;
            if (i < ws.length - 1) {
                if (w.spaceGlyph) out.push({ ...w.spaceGlyph, u: u + ov.du, v: v + ov.dv });
                u += w.spaceAfter + extra;
            }
        });
        return natural;
    };

    // Greedy wrap into lines of given widths. Justified text may squeeze its
    // spaces a little (as TeX does) rather than push a word to a new line.
    const squeezable = align === 'justify';
    const wrap = (ws: Word[], firstWidth: number, width: number) => {
        const res: Word[][] = [];
        let cur: Word[] = [];
        let curW = 0;
        let limit = firstWidth;
        for (const w of ws) {
            const add = (cur.length ? cur[cur.length - 1].spaceAfter : 0) + w.width;
            const slack = squeezable ? cur.length * SQUEEZE * block.spaceWidth * ov.scale : 0;
            if (cur.length && curW + add > limit + slack + 0.01) {
                res.push(cur);
                cur = [];
                curW = 0;
                limit = width;
            }
            cur.push(w);
            curW += cur.length === 1 ? w.width : add;
            if (w.breakAfter) {
                res.push(cur);
                cur = [];
                curW = 0;
                limit = width;
            }
        }
        if (cur.length) res.push(cur);
        return res;
    };

    let keptLines = 0;
    let overflow = false;

    if (block.paragraph && !hasOverrides) {
        const uRight = block.uRight;
        const onlyLine = dirty.size === 1 && !layoutToks.some((t) => t.t === 'break');
        const lineToks = layoutToks.filter((t) => t.line === k0);
        const lineWords = words.filter((w) => w.line === k0);
        const available = uRight - lines[k0].u0;
        let natural = 0;
        lineWords.forEach((w, i) => (natural += w.width + (i < lineWords.length - 1 ? w.spaceAfter : 0)));
        const isLast = k0 === nLines - 1;
        const next = lines[k0 + 1];
        const nextSpace = next ? next.atoms.findIndex((a) => /\s/.test(a.text)) : -1;
        const nextFww = !next ? Infinity : nextSpace <= 0 ? next.u1 - next.u0 : next.atoms[nextSpace - 1].u1 - next.u0;
        const tooShort = !isLast && available - natural > nextFww + block.spaceWidth;
        if (onlyLine && lineToks.length && natural <= available + 0.5 && !tooShort) {
            // Rewrite just this line.
            for (const g of lines[k0].glyphs) remove.add(g.key);
            const justify = align === 'justify' && !isLast;
            placeLine(lineWords, lines[k0].u0, lines[k0].v, justify ? available : null, justify, 'left');
            keptLines = k0;
        } else {
            const firstStart = k0 === 0 ? lines[0].u0 : bodyLeft;
            const wrapped = wrap(words, uRight - firstStart, uRight - bodyLeft);
            // Stop re-flowing once our breaks line up with the original ones again:
            // the rest of the paragraph then stays exactly as it was.
            const lastDirty = Math.max(...dirty);
            let upto = wrapped.length;
            for (let i = 1; i < wrapped.length; i++) {
                const w = wrapped[i][0];
                if (w.startsLine === k0 + i && !w.fresh && w.startsLine > lastDirty) {
                    upto = i;
                    break;
                }
            }
            const lastRemoved = upto === wrapped.length ? nLines : Math.min(nLines, k0 + upto);
            for (let i = k0; i < lastRemoved; i++) for (const g of lines[i].glyphs) remove.add(g.key);
            wrapped.slice(0, upto).forEach((ws, i) => {
                const start = i === 0 ? firstStart : bodyLeft;
                const lastInPara = (i === wrapped.length - 1 && upto === wrapped.length) || ws[ws.length - 1].breakAfter;
                const justify = align === 'justify' && !lastInPara;
                placeLine(ws, start, lines[k0].v - i * lineGap, uRight - start, justify, align === 'justify' ? 'left' : align);
            });
            keptLines = k0;
            overflow = upto === wrapped.length && k0 + wrapped.length > nLines;
        }
    } else {
        // Whole block redraw (single-line segment, or overrides requested).
        for (const l of lines) for (const g of l.glyphs) remove.add(g.key);
        const u0 = lines[0].u0;
        const u1 = Math.max(...lines.map((l) => l.u1));
        const box = ov.width !== undefined ? textBox(block, ov.width) : null;
        if (block.paragraph) {
            // A chosen width moves the paragraph's edges; the first-line indent stays.
            const left = box ? box.left : block.uLeft;
            const right = box ? box.right : block.uRight;
            const firstStart = left + (lines[0].u0 - block.uLeft);
            const bodyStart = left + (bodyLeft - block.uLeft);
            const wrapped = wrap(words, right - firstStart, right - bodyStart);
            wrapped.forEach((ws, i) => {
                const start = i === 0 ? firstStart : bodyStart;
                const lastInPara = i === wrapped.length - 1 || ws[ws.length - 1].breakAfter;
                placeLine(ws, start, lines[0].v - i * lineGap, right - start, align === 'justify' && !lastInPara, align === 'justify' ? 'left' : align);
            });
            overflow = wrapped.length > nLines;
        } else if (box) {
            // A single line given a box wraps inside it.
            const gap = main.size * 1.25 * ov.scale;
            const wrapped = wrap(words, box.right - box.left, box.right - box.left);
            wrapped.forEach((ws, i) => {
                const last = i === wrapped.length - 1 || ws[ws.length - 1].breakAfter;
                placeLine(ws, box.left, lines[0].v - i * gap, box.right - box.left, align === 'justify' && !last, align === 'justify' ? 'left' : align);
            });
        } else {
            // Hard breaks only; each line anchored per alignment against the original extent.
            const groups: Word[][] = [];
            let cur: Word[] = [];
            for (const w of words) {
                cur.push(w);
                if (w.breakAfter) {
                    groups.push(cur);
                    cur = [];
                }
            }
            if (cur.length) groups.push(cur);
            const gap = main.size * 1.25 * ov.scale;
            groups.forEach((ws, i) => {
                let natural = 0;
                ws.forEach((w, k) => (natural += w.width + (k < ws.length - 1 ? w.spaceAfter : 0)));
                let start = u0;
                if (align === 'right') start = u1 - natural;
                else if (align === 'center') start = (u0 + u1) / 2 - natural / 2;
                placeLine(ws, start, lines[0].v - i * gap, null, false, 'left');
            });
        }
    }

    return { angle, glyphs: out, remove, missing, substituted, bbox: planBBox(out, angle), overflow, keptLines };
}

export function planBBox(glyphs: PlannedGlyph[], angle: number): Rect | null {
    let r: Rect | null = null;
    for (const g of glyphs) {
        const size = g.tf * norm(g.lin[2], g.lin[3]);
        const pts = [
            fromFrame(angle, g.u, g.v + g.descent * size),
            fromFrame(angle, g.u + g.adv, g.v + g.ascent * size),
            fromFrame(angle, g.u, g.v + g.ascent * size),
            fromFrame(angle, g.u + g.adv, g.v + g.descent * size),
        ];
        for (const [x, y] of pts) {
            if (!r) r = { x0: x, y0: y, x1: x, y1: y };
            else {
                r.x0 = Math.min(r.x0, x);
                r.y0 = Math.min(r.y0, y);
                r.x1 = Math.max(r.x1, x);
                r.y1 = Math.max(r.y1, y);
            }
        }
    }
    return r;
}

// ---------------------------------------------------------------------------
// New text boxes

export function planAddText(edit: AddTextEdit, faces: FaceRegistry, docFonts: FontInfo[]): TextPlan {
    const angle = edit.angle;
    const lin: [number, number, number, number] = [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle)];
    const fill = rgbColor(edit.color);
    const pref = familyFace(faces, edit.family, edit.bold, edit.italic, docFonts);
    const cls = edit.family === 'times' || edit.family === 'noto-serif' ? 'serif' : edit.family === 'courier' ? 'mono' : 'sans';
    const missing: string[] = [];
    const substituted = new Map<string, string>();
    const [u0, v0] = toFrame(angle, edit.x, edit.y);
    const size = edit.size;

    const choose = (ch: string, current: Face | null): Face | null => {
        if (current && /^[\d\p{P}\p{S}]$/u.test(ch) && current.supports(ch)) return current;
        if (pref?.supports(ch)) return pref;
        const fb = faces.fallbackFor(ch, cls, edit.bold, edit.italic);
        if (fb) substituted.set(ch, fb.label);
        return fb;
    };

    type W = { glyphs: Omit<PlannedGlyph, 'u' | 'v'>[]; offs: [number, number][]; width: number };
    const shapeWord = (text: string): W => {
        const w: W = { glyphs: [], offs: [], width: 0 };
        const cps = Array.from(text);
        let i = 0;
        let cur: Face | null = null;
        while (i < cps.length) {
            const face = choose(cps[i], cur);
            if (!face) {
                missing.push(cps[i]);
                i++;
                continue;
            }
            let j = i + 1;
            while (j < cps.length && choose(cps[j], face) === face) j++;
            cur = face;
            for (const g of face.shape(cps.slice(i, j).join(''))) {
                w.glyphs.push({ face, bytes: g.bytes, adv: g.advance * size, tf: size, lin, hScale: 1, renderMode: 0, fill, stroke: BLACK, ascent: face.ascent, descent: face.descent, actual: g.cluster });
                w.offs.push([w.width + g.xOffset * size, g.yOffset * size]);
                w.width += g.xAdvance * size;
            }
            i = j;
        }
        return w;
    };

    const spaceW = (pref?.space?.xAdvance ?? 0.278) * size;
    const lineGap = size * (edit.lineHeight || 1.25);
    const out: PlannedGlyph[] = [];
    let lineNo = 0;
    for (const para of edit.text.split('\n')) {
        const words = para.split(/ +/).map(shapeWord);
        const lines: W[][] = [];
        let cur: W[] = [];
        let curW = 0;
        for (const w of words) {
            const add = (cur.length ? spaceW : 0) + w.width;
            if (edit.width > 0 && cur.length && curW + add > edit.width + 0.01) {
                lines.push(cur);
                cur = [];
                curW = 0;
            }
            cur.push(w);
            curW += cur.length === 1 ? w.width : add;
        }
        lines.push(cur);
        for (const ws of lines) {
            const natural = ws.reduce((a, w, i) => a + w.width + (i ? spaceW : 0), 0);
            const boxW = edit.width > 0 ? edit.width : natural;
            let u = u0;
            let extra = 0;
            if (edit.align === 'center') u += (boxW - natural) / 2;
            else if (edit.align === 'right') u += boxW - natural;
            else if (edit.align === 'justify' && edit.width > 0 && ws !== lines[lines.length - 1] && ws.length > 1) extra = (boxW - natural) / (ws.length - 1);
            const v = v0 - lineNo * lineGap;
            ws.forEach((w, i) => {
                w.glyphs.forEach((g, k) => out.push({ ...g, u: u + w.offs[k][0], v: v + w.offs[k][1] }));
                u += w.width;
                if (i < ws.length - 1) u += spaceW + extra;
            });
            lineNo++;
        }
    }
    return { angle, glyphs: out, remove: new Set(), missing, substituted, bbox: planBBox(out, angle), overflow: false, keptLines: 0 };
}
