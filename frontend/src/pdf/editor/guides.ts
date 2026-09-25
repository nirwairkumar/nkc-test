/**
 * Alignment guides for moving text and objects. While something is dragged,
 * its edges, centre and text baseline snap to the same features of the other
 * text and objects on the page, to the page centre, to the centre of the table
 * cell under it (from the page's own ruling lines) and back to where the text
 * originally was. Everything here is in screen pixels within the page.
 */

export interface Box {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

/** What a guide lines up: the near edge, the centre, the far edge, or a text baseline. */
export type Feature = 'start' | 'center' | 'end' | 'baseline';

/** A text baseline: a y position for horizontal text, x for text running down the screen. */
export interface Baseline {
    axis: 'x' | 'y';
    pos: number;
}

export interface Target {
    pos: number;
    feature: Feature;
    /** Extent along the other axis, for drawing the guide. */
    from: number;
    to: number;
    label?: string;
    dashed?: boolean;
}

/** Ruling lines of the page, for finding the table cell something is in. */
export interface Rules {
    v: { x: number; y0: number; y1: number }[];
    h: { y: number; x0: number; x1: number }[];
}

export interface Targets {
    x: Target[];
    y: Target[];
    rules: Rules;
}

/** Something on the page that others can line up with. */
export interface Item {
    box: Box;
    baseline?: Baseline;
}

export interface Guide {
    axis: 'x' | 'y';
    pos: number;
    from: number;
    to: number;
    label?: string;
    dashed?: boolean;
}

export interface SnapSpec {
    /** The moving element where the drag started. */
    box: Box;
    baseline?: Baseline;
    targets: Targets;
    /** Page size: moves never take an element further off the page than it started. */
    page: { width: number; height: number };
}

export interface Snapped {
    dx: number;
    dy: number;
    guides: Guide[];
}

/** How close (screen px) a feature must come to a target to snap to it. */
export const SNAP_PX = 6;

export const shiftBox = (b: Box, dx: number, dy: number): Box => ({ left: b.left + dx, top: b.top + dy, right: b.right + dx, bottom: b.bottom + dy });

export const toBox = (r: { left: number; top: number; width: number; height: number }): Box => ({ left: r.left, top: r.top, right: r.left + r.width, bottom: r.top + r.height });

type Point = { pos: number; feature: Feature };

function features(b: Box, axis: 'x' | 'y', baseline?: Baseline): Point[] {
    const f: Point[] =
        axis === 'x'
            ? [
                  { pos: b.left, feature: 'start' },
                  { pos: (b.left + b.right) / 2, feature: 'center' },
                  { pos: b.right, feature: 'end' },
              ]
            : [
                  { pos: b.top, feature: 'start' },
                  { pos: (b.top + b.bottom) / 2, feature: 'center' },
                  { pos: b.bottom, feature: 'end' },
              ];
    if (baseline?.axis === axis) f.push({ pos: baseline.pos, feature: 'baseline' });
    return f;
}

/** Guide targets for the items on a page, the page centre and (optionally) the moving thing's original place. */
export function buildTargets(items: Item[], page: { width: number; height: number }, rules: Rules, home?: Item): Targets {
    const x: Target[] = [];
    const y: Target[] = [];
    const add = (it: Item, extra?: { label: string; dashed: boolean }) => {
        const b = it.box;
        const across = { from: b.top, to: b.bottom };
        const along = { from: b.left, to: b.right };
        if (extra) {
            // The original place: one line per axis is enough (the rest follow).
            x.push({ pos: b.left, feature: 'start', ...across, ...extra });
            if (it.baseline) (it.baseline.axis === 'x' ? x : y).push({ pos: it.baseline.pos, feature: 'baseline', ...(it.baseline.axis === 'x' ? across : along), ...extra });
            else y.push({ pos: b.top, feature: 'start', ...along, ...extra });
            return;
        }
        x.push({ pos: b.left, feature: 'start', ...across }, { pos: (b.left + b.right) / 2, feature: 'center', ...across }, { pos: b.right, feature: 'end', ...across });
        y.push({ pos: b.top, feature: 'start', ...along }, { pos: (b.top + b.bottom) / 2, feature: 'center', ...along }, { pos: b.bottom, feature: 'end', ...along });
        if (it.baseline) (it.baseline.axis === 'x' ? x : y).push({ pos: it.baseline.pos, feature: 'baseline', ...(it.baseline.axis === 'x' ? across : along) });
    };
    for (const it of items) add(it);
    x.push({ pos: page.width / 2, feature: 'center', from: 0, to: page.height, label: 'page centre' });
    y.push({ pos: page.height / 2, feature: 'center', from: 0, to: page.width, label: 'page centre' });
    if (home) add(home, { label: 'original position', dashed: true });
    return { x, y, rules };
}

/** Centre of the table cell (or ruled box) around a box, from the nearest ruling lines on each side. */
function cellTargets(rules: Rules, b: Box): { x: Target[]; y: Target[] } {
    const cx = (b.left + b.right) / 2, cy = (b.top + b.bottom) / 2;
    const tol = 2;
    let l: Rules['v'][number] | null = null;
    let r: Rules['v'][number] | null = null;
    for (const v of rules.v) {
        if (v.y0 - tol > cy || v.y1 + tol < cy) continue;
        if (v.x < cx - 0.5 && (!l || v.x > l.x)) l = v;
        if (v.x > cx + 0.5 && (!r || v.x < r.x)) r = v;
    }
    let t: Rules['h'][number] | null = null;
    let d: Rules['h'][number] | null = null;
    for (const h of rules.h) {
        if (h.x0 - tol > cx || h.x1 + tol < cx) continue;
        if (h.y < cy - 0.5 && (!t || h.y > t.y)) t = h;
        if (h.y > cy + 0.5 && (!d || h.y < d.y)) d = h;
    }
    const x: Target[] = [];
    const y: Target[] = [];
    if (l && r && r.x - l.x > 4) x.push({ pos: (l.x + r.x) / 2, feature: 'center', from: Math.max(l.y0, r.y0), to: Math.min(l.y1, r.y1), label: 'cell centre' });
    // Only a row-sized gap is a cell; a whole table between two rules is not.
    const h = b.bottom - b.top;
    if (t && d && d.y - t.y > 4 && d.y - t.y < Math.max(4 * h, h + 40)) y.push({ pos: (t.y + d.y) / 2, feature: 'center', from: Math.max(t.x0, d.x0), to: Math.min(t.x1, d.x1), label: 'cell centre' });
    return { x, y };
}

/** Correction that snaps the closest matching feature/target pair, or 0. */
function correction(fs: Point[], ts: Target[]): number {
    let best = 0;
    let bestScore = Infinity;
    for (const f of fs) {
        for (const t of ts) {
            if (t.feature !== f.feature) continue;
            const d = t.pos - f.pos;
            if (Math.abs(d) > SNAP_PX) continue;
            // Text lines up by its baseline first: font boxes differ between fonts.
            const score = Math.abs(d) - (f.feature === 'baseline' ? 1.5 : 0);
            if (score < bestScore) {
                bestScore = score;
                best = d;
            }
        }
    }
    return best;
}

/** Guides for every feature that lines up with a target, merged per position. */
function collect(axis: 'x' | 'y', fs: Point[], ts: Target[], b: Box, out: Guide[]) {
    const [a0, a1] = axis === 'x' ? [b.top, b.bottom] : [b.left, b.right];
    const hits: [Point, Target][] = [];
    for (const f of fs) for (const t of ts) if (t.feature === f.feature && Math.abs(t.pos - f.pos) <= 0.5) hits.push([f, t]);
    // Text lined up by its baseline has its font box lined up too: one line says it all.
    const byBaseline = hits.some(([f]) => f.feature === 'baseline');
    for (const [f, t] of hits) {
        if (byBaseline && f.feature !== 'baseline' && !t.label) continue;
        const from = Math.min(t.from, a0), to = Math.max(t.to, a1);
        const g = out.find((o) => o.axis === axis && Math.abs(o.pos - t.pos) < 0.5);
        if (g) {
            g.from = Math.min(g.from, from);
            g.to = Math.max(g.to, to);
            g.label ??= t.label;
            g.dashed = g.dashed && !!t.dashed;
        } else {
            out.push({ axis, pos: t.pos, from, to, label: t.label, dashed: !!t.dashed });
        }
    }
}

/**
 * Snaps an edge being dragged to resize something (x = the edge's screen
 * position) to the same edge of other things and to ruling lines crossing
 * `span` (the thing's vertical extent).
 */
export function snapEdge(targets: Targets, x: number, feature: 'start' | 'end', span: [number, number], free: boolean): { x: number; guides: Guide[] } {
    if (free) return { x, guides: [] };
    let best: { pos: number; from: number; to: number; label?: string } | null = null;
    const closer = (pos: number) => Math.abs(pos - x) <= SNAP_PX && (!best || Math.abs(pos - x) < Math.abs(best.pos - x));
    for (const t of targets.x) if (t.feature === feature && closer(t.pos)) best = t;
    const mid = (span[0] + span[1]) / 2;
    for (const v of targets.rules.v) if (v.y0 - 2 <= mid && v.y1 + 2 >= mid && closer(v.x)) best = { pos: v.x, from: v.y0, to: v.y1 };
    if (!best) return { x, guides: [] };
    const b: { pos: number; from: number; to: number; label?: string } = best;
    return { x: b.pos, guides: [{ axis: 'x', pos: b.pos, from: Math.min(b.from, span[0]), to: Math.max(b.to, span[1]), label: b.label }] };
}

const clampMove = (d: number, lo: number, hi: number, size: number, page: number) => {
    // Never further off the page than it started (text may already overhang an edge).
    if (size > page) return d;
    return Math.min(Math.max(d, Math.min(0, -lo)), Math.max(0, page - hi));
};

/**
 * Snaps a raw drag offset. `lock` keeps the move horizontal or vertical
 * (whichever is larger), `free` turns snapping off.
 */
export function snapMove(spec: SnapSpec, rawDx: number, rawDy: number, mods: { lock?: boolean; free?: boolean } = {}): Snapped {
    const { box, baseline, targets, page } = spec;
    let dx = rawDx, dy = rawDy;
    let lockX = false, lockY = false;
    if (mods.lock) {
        if (Math.abs(dx) >= Math.abs(dy)) {
            dy = 0;
            lockY = true;
        } else {
            dx = 0;
            lockX = true;
        }
    }
    const at = (ox: number, oy: number) => shiftBox(box, ox, oy);
    const base = (ox: number, oy: number): Baseline | undefined => baseline && { axis: baseline.axis, pos: baseline.pos + (baseline.axis === 'x' ? ox : oy) };

    let tx = targets.x, ty = targets.y;
    if (!mods.free) {
        const cells = cellTargets(targets.rules, at(dx, dy));
        tx = cells.x.length ? [...tx, ...cells.x] : tx;
        ty = cells.y.length ? [...ty, ...cells.y] : ty;
        if (!lockX) dx += correction(features(at(dx, dy), 'x', base(dx, dy)), tx);
        if (!lockY) dy += correction(features(at(dx, dy), 'y', base(dx, dy)), ty);
    }
    dx = clampMove(dx, box.left, box.right, box.right - box.left, page.width);
    dy = clampMove(dy, box.top, box.bottom, box.bottom - box.top, page.height);

    const guides: Guide[] = [];
    if (!mods.free) {
        const b = at(dx, dy);
        collect('x', features(b, 'x', base(dx, dy)), tx, b, guides);
        collect('y', features(b, 'y', base(dx, dy)), ty, b, guides);
    }
    return { dx, dy, guides };
}
