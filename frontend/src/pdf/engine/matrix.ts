/** PDF affine matrices [a b c d e f] with row-vector convention: p' = p × M. */
export type Mat = [number, number, number, number, number, number];

export const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

/** m1 × m2 — apply m1 first, then m2. */
export function mul(m1: Mat, m2: Mat): Mat {
    return [
        m1[0] * m2[0] + m1[1] * m2[2],
        m1[0] * m2[1] + m1[1] * m2[3],
        m1[2] * m2[0] + m1[3] * m2[2],
        m1[2] * m2[1] + m1[3] * m2[3],
        m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
        m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
    ];
}

export function apply(m: Mat, x: number, y: number): [number, number] {
    return [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]];
}

/** Applies only the linear part (for direction vectors). */
export function applyVec(m: Mat, x: number, y: number): [number, number] {
    return [x * m[0] + y * m[2], x * m[1] + y * m[3]];
}

export const translate = (tx: number, ty: number): Mat => [1, 0, 0, 1, tx, ty];

export interface Rect {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

export function rectUnion(a: Rect | null, b: Rect): Rect {
    if (!a) return { ...b };
    return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}
