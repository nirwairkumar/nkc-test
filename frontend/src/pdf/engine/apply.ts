/**
 * Applies a page's edit list to a pdf-lib document page. The same function
 * runs on the single-page preview copy and on the full document at export, so
 * what the user sees is exactly what they download.
 */
import { PDFArray, PDFDict, PDFDocument, PDFImage, PDFPage, PDFRef, PDFStream } from 'pdf-lib';
import { emitGlyphs } from './emit';
import type { PageEdit, StoredImage } from './edits';
import { CustomFace, OrigFace, StdFace, type Face, type FaceRegistry } from './faces';
import type { FontCache } from './fonts';
import { interpretPage, type GlyphRec, type PageModel } from './interpreter';
import { analyzeText, type PageText } from './layout';
import { concatBytes, encodeLatin1, num } from './lexer';
import type { Rect } from './matrix';
import { N, resolve } from './pdfobj';
import { customFontsFor, customFontsForEdit, planAddText, planTextEdit, type TextPlan } from './planner';
import { rewriteContent } from './rewrite';

export interface PageEnv {
    faces: FaceRegistry;
    fonts: FontCache;
    images: Map<string, StoredImage>;
    /** Per-document cache of embedded images. */
    embeddedImages: Map<string, PDFImage>;
}

export interface PageReport {
    plans: Map<string, TextPlan>;
    missingBlocks: string[];
}

export function analyzePage(doc: PDFDocument, page: PDFPage, fonts: FontCache): { model: PageModel; text: PageText } {
    const model = interpretPage(doc.context, page, fonts);
    return { model, text: analyzeText(model) };
}

const glyphCenter = (g: GlyphRec): [number, number] => {
    const up = 0.3 * g.size;
    return [(g.x + g.ex) / 2 - Math.sin(g.angle) * up, (g.y + g.ey) / 2 + Math.cos(g.angle) * up];
};

const inRects = (x: number, y: number, rects: Rect[]) => rects.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);

const depth = (key: string) => (key === '' ? 0 : key.split('/').length);

function uniqueName(dict: PDFDict | undefined, taken: Set<string>, prefix: string): string {
    for (let i = 1; ; i++) {
        const n = prefix + i;
        if (!taken.has(n) && !(dict && dict.has(N(n)))) {
            taken.add(n);
            return n;
        }
    }
}

function cloneDict(doc: PDFDocument, d: PDFDict | undefined): PDFDict {
    const out = doc.context.obj({}) as PDFDict;
    if (d) for (const [k, v] of d.entries()) out.set(k, v);
    return out;
}

const addTextClass = (family: string) => (family === 'times' || family === 'noto-serif' ? 'serif' : family === 'courier' ? 'mono' : 'sans');

export async function applyPageEdits(doc: PDFDocument, page: PDFPage, edits: PageEdit[], env: PageEnv): Promise<PageReport> {
    const ctx = doc.context;
    const { model, text } = analyzePage(doc, page, env.fonts);
    const blocks = new Map(text.blocks.map((b) => [b.id, b]));
    const docFonts = env.fonts.all().filter((f) => f.editable);
    const report: PageReport = { plans: new Map(), missingBlocks: [] };
    if (!edits.length) return report;

    // Custom (Noto) fonts must be loaded before planning.
    const needed = new Set<string>();
    for (const e of edits) {
        if (e.kind === 'text') {
            const b = blocks.get(e.blockId);
            if (b) customFontsForEdit(b, e).forEach((id) => needed.add(id));
        } else if (e.kind === 'add-text') {
            customFontsFor(e.text, e.family, addTextClass(e.family), e.bold, e.italic).forEach((id) => needed.add(id));
        }
    }
    await env.faces.prepare(needed);

    // ---- Plan text and collect glyph removals
    const remove = new Set<string>();
    for (const e of edits) {
        if (e.kind === 'text') {
            const b = blocks.get(e.blockId);
            if (!b) {
                report.missingBlocks.push(e.blockId);
                continue;
            }
            const plan = planTextEdit(b, e, env.faces, docFonts);
            if (plan) {
                report.plans.set(e.id, plan);
                plan.remove.forEach((k) => remove.add(k));
            }
        } else if (e.kind === 'add-text') {
            report.plans.set(e.id, planAddText(e, env.faces, docFonts));
        } else if (e.kind === 'erase' && e.text) {
            for (const g of model.glyphs) {
                const [cx, cy] = glyphCenter(g);
                if (inRects(cx, cy, e.rects)) remove.add(g.key);
            }
        }
    }

    // ---- Resources: isolate this page's dicts before adding names
    const pageRes = cloneDict(doc, page.node.Resources());
    const subDict = (res: PDFDict, key: string) => {
        const cur = resolve(ctx, res.get(N(key)));
        const d = cloneDict(doc, cur instanceof PDFDict ? cur : undefined);
        res.set(N(key), d);
        return d;
    };
    const fontDict = subDict(pageRes, 'Font');
    const xobjDict = subDict(pageRes, 'XObject');
    const gsDict = subDict(pageRes, 'ExtGState');
    page.node.set(N('Resources'), pageRes);
    const takenNames = new Set<string>();

    // ---- Rewrite containers with removed glyphs (deepest forms first)
    const byOp = new Map<string, Map<number, GlyphRec[]>>();
    for (const g of model.glyphs) {
        let m = byOp.get(g.container);
        if (!m) byOp.set(g.container, (m = new Map()));
        let arr = m.get(g.opIndex);
        if (!arr) m.set(g.opIndex, (arr = []));
        arr.push(g);
    }
    const modified = new Set<string>();
    for (const g of model.glyphs) if (remove.has(g.key)) modified.add(g.container);
    for (const key of [...modified]) {
        let c = model.containers.get(key);
        while (c?.parent) {
            modified.add(c.parent.key);
            c = model.containers.get(c.parent.key);
        }
    }
    // Per container: operators to replace (Do of a cloned form) and XObjects to add.
    const replaceOps = new Map<string, Map<number, string>>();
    const extraXObj = new Map<string, Map<string, PDFRef>>();
    const replaceFor = (k: string) => {
        let m = replaceOps.get(k);
        if (!m) replaceOps.set(k, (m = new Map()));
        return m;
    };
    const extrasFor = (k: string) => {
        let m = extraXObj.get(k);
        if (!m) extraXObj.set(k, (m = new Map()));
        return m;
    };

    // A form drawn on several pages is cloned, so only this page changes.
    const forms = [...modified].filter((k) => k !== '').sort((a, b) => depth(b) - depth(a));
    for (const key of forms) {
        const c = model.containers.get(key)!;
        if (!c.formRef || !c.parent) continue;
        const orig = ctx.lookup(c.formRef);
        if (!(orig instanceof PDFStream)) continue;
        const bytes = rewriteContent(c.bytes, c.ops, byOp.get(key) ?? new Map(), remove, replaceFor(key));
        const clone = ctx.flateStream(bytes);
        for (const [k, v] of orig.dict.entries()) {
            const n = k.decodeText();
            if (n === 'Length' || n === 'Filter' || n === 'DecodeParms' || n === 'DL') continue;
            clone.dict.set(k, v);
        }
        const extras = extraXObj.get(key);
        if (extras?.size) {
            const res = cloneDict(doc, (resolve(ctx, orig.dict.get(N('Resources'))) as PDFDict | undefined) ?? c.resources);
            const xo = subDict(res, 'XObject');
            for (const [n, r] of extras) xo.set(N(n), r);
            clone.dict.set(N('Resources'), res);
        }
        const newRef = ctx.register(clone);
        const parentKey = c.parent.key;
        const parentXObj = parentKey === '' ? xobjDict : (resolve(ctx, model.containers.get(parentKey)?.resources?.get(N('XObject'))) as PDFDict | undefined);
        const name = uniqueName(parentXObj, takenNames, 'PnX');
        extrasFor(parentKey).set(name, newRef);
        replaceFor(parentKey).set(c.parent.opIndex, `/${name} Do`);
    }
    for (const [n, r] of extraXObj.get('') ?? []) xobjDict.set(N(n), r);

    // ---- Font / graphics-state resources for the overlay
    const faceNames = new Map<string, string>();
    const fontRes = (face: Face): string => {
        const cached = faceNames.get(face.key);
        if (cached) return cached;
        let ref: PDFRef | null = null;
        if (face instanceof OrigFace) ref = face.info.ref ?? ctx.register(face.info.dict);
        else if (face instanceof StdFace || face instanceof CustomFace) ref = face.pdfFont.ref;
        let name: string | null = null;
        if (ref) {
            for (const [k, v] of fontDict.entries()) {
                if (v instanceof PDFRef && v.objectNumber === ref.objectNumber && v.generationNumber === ref.generationNumber) {
                    name = k.decodeText();
                    break;
                }
            }
        }
        if (!name) {
            name = uniqueName(fontDict, takenNames, 'PnF');
            if (ref) fontDict.set(N(name), ref);
        }
        faceNames.set(face.key, name);
        return name;
    };

    const gsNames = new Map<string, string>();
    const gsRes = (opacity: number, blend: 'Normal' | 'Multiply'): string => {
        const k = opacity.toFixed(3) + blend;
        const c = gsNames.get(k);
        if (c) return c;
        const d = ctx.obj({ Type: 'ExtGState', ca: opacity, CA: opacity, BM: blend });
        const name = uniqueName(gsDict, takenNames, 'PnGS');
        gsDict.set(N(name), ctx.register(d));
        gsNames.set(k, name);
        return name;
    };

    // ---- Overlay operators, in edit order
    const overlay: string[] = [];
    const rgb = (c: [number, number, number]) => c.map(num).join(' ');
    const rectOp = (r: Rect) => `${num(r.x0)} ${num(r.y0)} ${num(r.x1 - r.x0)} ${num(r.y1 - r.y0)} re f`;
    for (const e of edits) {
        switch (e.kind) {
            case 'text':
            case 'add-text': {
                const plan = report.plans.get(e.id);
                if (plan?.glyphs.length) overlay.push(emitGlyphs(plan.glyphs, plan.angle, fontRes));
                break;
            }
            case 'erase':
                if (e.cover) overlay.push('q', `${rgb(e.cover)} rg`, ...e.rects.map(rectOp), 'Q');
                break;
            case 'highlight':
                overlay.push('q', `/${gsRes(e.opacity, 'Multiply')} gs`, `${rgb(e.color)} rg`, ...e.rects.map(rectOp), 'Q');
                break;
            case 'ink':
                overlay.push('q');
                if (e.opacity < 1) overlay.push(`/${gsRes(e.opacity, 'Normal')} gs`);
                overlay.push(`${rgb(e.color)} RG`, `${num(e.width)} w`, '1 J', '1 j', ...e.paths.map(smoothPath), 'Q');
                break;
            case 'shape':
                overlay.push(shapeOps(e, e.opacity < 1 ? gsRes(e.opacity, 'Normal') : null));
                break;
            case 'image': {
                const stored = env.images.get(e.imageId);
                if (!stored) break;
                let img = env.embeddedImages.get(e.imageId);
                if (!img) {
                    img = stored.mime === 'image/png' ? await doc.embedPng(stored.bytes) : await doc.embedJpg(stored.bytes);
                    env.embeddedImages.set(e.imageId, img);
                }
                const name = uniqueName(xobjDict, takenNames, 'PnIm');
                xobjDict.set(N(name), img.ref);
                const r = e.rect;
                const w = r.x1 - r.x0, h = r.y1 - r.y0;
                const turns = (((e.rotation ?? 0) % 4) + 4) % 4;
                // Map the unit square to the rect, rotating the image content clockwise.
                const m =
                    turns === 0 ? [w, 0, 0, h, r.x0, r.y0]
                    : turns === 1 ? [0, -h, w, 0, r.x0, r.y1]
                    : turns === 2 ? [-w, 0, 0, -h, r.x1, r.y1]
                    : [0, h, -w, 0, r.x1, r.y0];
                overlay.push('q');
                if (e.opacity !== undefined && e.opacity < 1) overlay.push(`/${gsRes(e.opacity, 'Normal')} gs`);
                overlay.push(`${m.map(num).join(' ')} cm`, `/${name} Do`, 'Q');
                break;
            }
        }
    }

    // ---- Assemble the page content
    const pageC = model.containers.get('')!;
    const pre = 'q\n'.repeat(1 + pageC.underflow);
    const post = '\nQ'.repeat(1 + pageC.finalDepth) + '\n';
    const overlayStr = overlay.join('\n');
    if (modified.has('')) {
        const body = rewriteContent(pageC.bytes, pageC.ops, byOp.get('') ?? new Map(), remove, replaceFor(''));
        const full = concatBytes([encodeLatin1(pre), body, encodeLatin1(post + overlayStr + '\n')]);
        page.node.set(N('Contents'), ctx.register(ctx.flateStream(full)));
    } else if (overlayStr) {
        const existing = page.node.get(N('Contents'));
        const items: PDFRef[] = [];
        const ex = existing instanceof PDFRef ? ctx.lookup(existing) : existing;
        if (ex instanceof PDFArray) {
            for (let i = 0; i < ex.size(); i++) {
                const it = ex.get(i);
                if (it instanceof PDFRef) items.push(it);
            }
        } else if (existing instanceof PDFRef) items.push(existing);
        const preRef = ctx.register(ctx.stream(encodeLatin1(pre)));
        const postRef = ctx.register(ctx.flateStream(encodeLatin1(post + overlayStr + '\n')));
        page.node.set(N('Contents'), ctx.obj([preRef, ...items, postRef]));
    }
    return report;
}

function smoothPath(pts: [number, number][]): string {
    if (!pts.length) return '';
    const f = (p: [number, number]) => `${num(p[0])} ${num(p[1])}`;
    if (pts.length === 1) return `${f(pts[0])} m ${f(pts[0])} l S`;
    if (pts.length === 2) return `${f(pts[0])} m ${f(pts[1])} l S`;
    const out = [`${f(pts[0])} m`];
    // Quadratic smoothing through midpoints, expressed as cubics.
    let start = pts[0];
    for (let i = 1; i < pts.length - 1; i++) {
        const c = pts[i];
        const end: [number, number] = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
        const c1: [number, number] = [start[0] + (2 / 3) * (c[0] - start[0]), start[1] + (2 / 3) * (c[1] - start[1])];
        const c2: [number, number] = [end[0] + (2 / 3) * (c[0] - end[0]), end[1] + (2 / 3) * (c[1] - end[1])];
        out.push(`${f(c1)} ${f(c2)} ${f(end)} c`);
        start = end;
    }
    out.push(`${f(pts[pts.length - 1])} l S`);
    return out.join('\n');
}

function shapeOps(e: Extract<PageEdit, { kind: 'shape' }>, gs: string | null): string {
    const o: string[] = ['q'];
    if (gs) o.push(`/${gs} gs`);
    const rgb = (c: [number, number, number]) => c.map(num).join(' ');
    if (e.stroke) o.push(`${rgb(e.stroke)} RG`, `${num(e.width)} w`, '1 J', '1 j');
    if (e.fill) o.push(`${rgb(e.fill)} rg`);
    const paint = e.fill && e.stroke ? 'B' : e.fill ? 'f' : 'S';
    const x0 = Math.min(e.x0, e.x1), x1 = Math.max(e.x0, e.x1), y0 = Math.min(e.y0, e.y1), y1 = Math.max(e.y0, e.y1);
    if (e.shape === 'rect') {
        o.push(`${num(x0)} ${num(y0)} ${num(x1 - x0)} ${num(y1 - y0)} re ${paint}`);
    } else if (e.shape === 'ellipse') {
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
        const k = 0.5522847498;
        const p = (x: number, y: number) => `${num(x)} ${num(y)}`;
        o.push(
            `${p(cx + rx, cy)} m`,
            `${p(cx + rx, cy + k * ry)} ${p(cx + k * rx, cy + ry)} ${p(cx, cy + ry)} c`,
            `${p(cx - k * rx, cy + ry)} ${p(cx - rx, cy + k * ry)} ${p(cx - rx, cy)} c`,
            `${p(cx - rx, cy - k * ry)} ${p(cx - k * rx, cy - ry)} ${p(cx, cy - ry)} c`,
            `${p(cx + k * rx, cy - ry)} ${p(cx + rx, cy - k * ry)} ${p(cx + rx, cy)} c`,
            `h ${paint}`,
        );
    } else {
        o.push(`${num(e.x0)} ${num(e.y0)} m ${num(e.x1)} ${num(e.y1)} l S`);
        if (e.shape === 'arrow' && e.stroke) {
            const ang = Math.atan2(e.y1 - e.y0, e.x1 - e.x0);
            const len = Math.max(6, e.width * 4);
            const a1 = ang + Math.PI - 0.45, a2 = ang + Math.PI + 0.45;
            o.push(`${num(e.x1 + len * Math.cos(a1))} ${num(e.y1 + len * Math.sin(a1))} m ${num(e.x1)} ${num(e.y1)} l ${num(e.x1 + len * Math.cos(a2))} ${num(e.y1 + len * Math.sin(a2))} l S`);
        }
    }
    o.push('Q');
    return o.join('\n');
}
