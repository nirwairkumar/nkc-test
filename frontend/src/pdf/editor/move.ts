/**
 * Moving existing text. A block's position is an offset in page units (dx, dy)
 * on its TextEdit; the planner redraws the block there when the page is
 * rebuilt. These helpers keep such edits tidy, convert between screen and page
 * moves and describe the page's contents as alignment-guide targets.
 */
import type { PageReport } from '../engine/apply';
import type { PageEdit, PageKey, TextEdit } from '../engine/edits';
import { fromFrame, type TextBlock } from '../engine/layout';
import type { Rect } from '../engine/matrix';
import type { PdfSession } from '../session/session';
import type { View } from './geometry';
import { toBox, type Baseline, type Box, type Item, type Rules } from './guides';
import { isObject, objectBounds, translateEdit } from './objects';
import { textEditId, type Action, type Selection } from './store';

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Page-space vector for a move of (sx, sy) screen pixels. */
export function pdfVector(view: View, sx: number, sy: number): [number, number] {
    const [ax, ay] = view.toPdf(0, 0);
    const [bx, by] = view.toPdf(sx, sy);
    return [bx - ax, by - ay];
}

/** Screen-pixel vector for a page-space move. */
export function screenVector(view: View, dx: number, dy: number): [number, number] {
    const [ax, ay] = view.toScreen(0, 0);
    const [bx, by] = view.toScreen(dx, dy);
    return [bx - ax, by - ay];
}

/** Vertical (top-to-bottom) text can't be redrawn by the planner, so it stays put. */
export const canMove = (b: TextBlock) => b.lines.every((l) => l.glyphs.every((g) => !g.font.isVertical));

/** Blocks in fonts that can't be re-encoded are retyped as new text; the original is erased. */
export const isRetyped = (edits: PageEdit[], page: PageKey, blockId: string) => edits.some((e) => e.id === `x:${page}:${blockId}`);

/** The block's text edit with a new offset; null when that leaves the block untouched. */
export function withOffset(page: PageKey, block: TextBlock, edit: TextEdit | undefined, dx: number, dy: number): TextEdit | null {
    const src: TextEdit = edit ?? { kind: 'text', id: textEditId(page, block.id), page, blockId: block.id, text: block.text };
    // Same key order as the inline editor builds, so equal edits serialise equally.
    const e: TextEdit = { kind: 'text', id: src.id, page: src.page, blockId: src.blockId, text: src.text };
    if (Math.abs(dx) >= 0.01) e.dx = round2(dx);
    if (Math.abs(dy) >= 0.01) e.dy = round2(dy);
    if (src.family !== undefined) e.family = src.family;
    if (src.size !== undefined) e.size = src.size;
    if (src.color) e.color = src.color;
    if (src.bold !== undefined) e.bold = src.bold;
    if (src.italic !== undefined) e.italic = src.italic;
    if (src.align !== undefined) e.align = src.align;
    if (src.width !== undefined) e.width = src.width;
    const untouched =
        e.text === block.text &&
        e.family === undefined &&
        e.size === undefined &&
        !e.color &&
        e.bold === undefined &&
        e.italic === undefined &&
        e.align === undefined &&
        e.width === undefined &&
        !e.dx &&
        !e.dy;
    return untouched ? null : e;
}

/** Store action giving a block a new offset; null when nothing would change. */
export function offsetAction(page: PageKey, block: TextBlock, edit: TextEdit | undefined, dx: number, dy: number): Action | null {
    const next = withOffset(page, block, edit, dx, dy);
    if (!next) return edit ? { type: 'remove', id: edit.id } : null;
    if (edit && (edit.dx ?? 0) === (next.dx ?? 0) && (edit.dy ?? 0) === (next.dy ?? 0)) return null;
    return { type: 'upsert', edit: next };
}

/** Store action moving the selected block or object by (sx, sy) points along the screen axes. */
export function nudgeAction(session: PdfSession, edits: PageEdit[], sel: Selection, view: View, sx: number, sy: number): Action | null {
    if (!sel) return null;
    const [dx, dy] = pdfVector(view, sx * view.scale, sy * view.scale);
    if (sel.kind === 'object') {
        const o = edits.find((e) => e.id === sel.id);
        return o && isObject(o) ? { type: 'upsert', edit: translateEdit(o, dx, dy) } : null;
    }
    const block = session.analyze(sel.page)?.text.blocks.find((b) => b.id === sel.blockId);
    if (!block || !canMove(block) || isRetyped(edits, sel.page, block.id)) return null;
    const edit = edits.find((e): e is TextEdit => e.kind === 'text' && e.id === textEditId(sel.page, block.id));
    if (edit?.text === '') return null;
    return offsetAction(sel.page, block, edit, (edit?.dx ?? 0) + dx, (edit?.dy ?? 0) + dy);
}

/** The block's first baseline on screen at a given offset (none for slanted text). */
export function blockBaseline(view: View, b: TextBlock, off: [number, number]): Baseline | undefined {
    const l = b.lines[0];
    const [x, y] = fromFrame(b.angle, l.u0, l.v);
    const [sx, sy] = view.toScreen(x + off[0], y + off[1]);
    const a = view.screenAngle(b.angle);
    if (Math.abs(Math.sin(a)) < 0.01) return { axis: 'y', pos: sy };
    if (Math.abs(Math.cos(a)) < 0.01) return { axis: 'x', pos: sx };
    return undefined;
}

/** The page's ruling lines on screen. */
export function screenRules(view: View, rects: Rect[]): Rules {
    const v: Rules['v'] = [];
    const h: Rules['h'] = [];
    for (const r of rects) {
        const s = view.rectToScreen(r);
        if (s.width < 1 && s.height >= 1) v.push({ x: s.left + s.width / 2, y0: s.top, y1: s.top + s.height });
        else if (s.height < 1 && s.width >= 1) h.push({ y: s.top + s.height / 2, x0: s.left, x1: s.left + s.width });
    }
    return { v, h };
}

/** Text blocks as guide targets, where the page shows them (or where `boxOf` says). */
export function textItems(
    blocks: TextBlock[],
    edits: PageEdit[],
    page: PageKey,
    report: PageReport | undefined,
    view: View,
    exclude?: string,
    boxOf?: (b: TextBlock) => Box,
): Item[] {
    const byBlock = new Map<string, TextEdit>();
    const retyped = new Set<string>();
    const prefix = `x:${page}:`;
    for (const e of edits) {
        if (e.kind === 'text' && e.page === page) byBlock.set(e.blockId, e);
        else if (e.id.startsWith(prefix)) retyped.add(e.id.slice(prefix.length));
    }
    const out: Item[] = [];
    for (const b of blocks) {
        const e = byBlock.get(b.id);
        if (b.id === exclude || e?.text === '' || retyped.has(b.id)) continue;
        const box = boxOf ? boxOf(b) : toBox(view.rectToScreen(report?.plans.get(textEditId(page, b.id))?.bbox ?? b.bbox));
        out.push({ box, baseline: blockBaseline(view, b, [e?.dx ?? 0, e?.dy ?? 0]) });
    }
    return out;
}

/** Added images, shapes and text boxes as guide targets. Text boxes are measured in the page's DOM. */
export function objectItems(edits: PageEdit[], page: PageKey, view: View, host: HTMLElement | null, exclude?: string): Item[] {
    const out: Item[] = [];
    const origin = host?.getBoundingClientRect();
    for (const e of edits) {
        if (e.page !== page || e.id === exclude || !isObject(e)) continue;
        if (e.kind === 'add-text') {
            const el = origin && host!.querySelector(`[data-object-id="${CSS.escape(e.id)}"]`);
            if (!el) continue;
            const r = el.getBoundingClientRect();
            const [, sy] = view.toScreen(e.x, e.y);
            out.push({
                box: { left: r.left - origin.left, top: r.top - origin.top, right: r.right - origin.left, bottom: r.bottom - origin.top },
                baseline: Math.abs(view.screenAngle(e.angle)) < 0.01 ? { axis: 'y', pos: sy } : undefined,
            });
            continue;
        }
        // Highlights, erasures and ink sit on text; they are not things to line up with.
        if (e.kind !== 'image' && e.kind !== 'shape') continue;
        const bb = objectBounds(e);
        if (bb) out.push({ box: toBox(view.rectToScreen(bb)) });
    }
    return out;
}

/** "→ 4.2 mm  ↑ 1.0 mm": a move in page units as shown on screen. */
export function describeOffset(view: View, dx: number, dy: number): string {
    const [sx, sy] = screenVector(view, dx, dy);
    const mm = (px: number) => ((Math.abs(px) / view.scale) * 25.4) / 72;
    const parts: string[] = [];
    if (mm(sx) >= 0.05) parts.push(`${sx > 0 ? '→' : '←'} ${mm(sx).toFixed(1)} mm`);
    if (mm(sy) >= 0.05) parts.push(`${sy > 0 ? '↓' : '↑'} ${mm(sy).toFixed(1)} mm`);
    return parts.length ? parts.join('  ') : 'original position';
}
