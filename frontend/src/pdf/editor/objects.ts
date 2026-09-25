/** Geometry helpers for added objects (move / resize / bounds) in PDF space. */
import type { PageEdit } from '../engine/edits';
import type { Rect } from '../engine/matrix';

export type ObjectEdit = Exclude<PageEdit, { kind: 'text' }>;

export const isObject = (e: PageEdit): e is ObjectEdit => e.kind !== 'text';

export function translateEdit<T extends ObjectEdit>(e: T, dx: number, dy: number): T {
    const r = (x: Rect): Rect => ({ x0: x.x0 + dx, y0: x.y0 + dy, x1: x.x1 + dx, y1: x.y1 + dy });
    switch (e.kind) {
        case 'add-text':
            return { ...e, x: e.x + dx, y: e.y + dy };
        case 'image':
            return { ...e, rect: r(e.rect) };
        case 'shape':
            return { ...e, x0: e.x0 + dx, y0: e.y0 + dy, x1: e.x1 + dx, y1: e.y1 + dy };
        case 'ink':
            return { ...e, paths: e.paths.map((p) => p.map(([x, y]) => [x + dx, y + dy] as [number, number])) };
        case 'highlight':
        case 'erase':
            return { ...e, rects: e.rects.map(r) };
    }
    return e;
}

/** PDF-space bounds (null for add-text, whose extent depends on layout). */
export function objectBounds(e: ObjectEdit): Rect | null {
    const union = (rs: Rect[]) =>
        rs.reduce<Rect | null>((a, b) => (a ? { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) } : { ...b }), null);
    switch (e.kind) {
        case 'image':
            return e.rect;
        case 'shape': {
            const pad = e.width / 2 + (e.shape === 'arrow' ? Math.max(6, e.width * 4) : 0);
            return { x0: Math.min(e.x0, e.x1) - pad, y0: Math.min(e.y0, e.y1) - pad, x1: Math.max(e.x0, e.x1) + pad, y1: Math.max(e.y0, e.y1) + pad };
        }
        case 'ink': {
            const pts = e.paths.flat();
            if (!pts.length) return null;
            const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
            const pad = e.width / 2;
            return { x0: Math.min(...xs) - pad, y0: Math.min(...ys) - pad, x1: Math.max(...xs) + pad, y1: Math.max(...ys) + pad };
        }
        case 'highlight':
        case 'erase':
            return union(e.rects);
        default:
            return null;
    }
}

/** Ramer–Douglas–Peucker simplification for ink strokes (tolerance in PDF units). */
export function simplify(points: [number, number][], tol = 0.35): [number, number][] {
    if (points.length < 3) return points;
    const sq = (a: [number, number], b: [number, number]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
    const segDist = (p: [number, number], a: [number, number], b: [number, number]) => {
        const l = sq(a, b);
        if (!l) return sq(p, a);
        let t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / l;
        t = Math.max(0, Math.min(1, t));
        return sq(p, [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    };
    const keep = new Uint8Array(points.length);
    keep[0] = keep[points.length - 1] = 1;
    const stack: [number, number][] = [[0, points.length - 1]];
    while (stack.length) {
        const [s, e] = stack.pop()!;
        let max = 0, idx = -1;
        for (let i = s + 1; i < e; i++) {
            const d = segDist(points[i], points[s], points[e]);
            if (d > max) {
                max = d;
                idx = i;
            }
        }
        if (idx >= 0 && max > tol * tol) {
            keep[idx] = 1;
            stack.push([s, idx], [idx, e]);
        }
    }
    return points.filter((_, i) => keep[i]);
}

const urls = new Map<string, string>();
export function imageUrl(id: string, bytes: Uint8Array, mime: string): string {
    let u = urls.get(id);
    if (!u) {
        u = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: mime }));
        urls.set(id, u);
    }
    return u;
}
