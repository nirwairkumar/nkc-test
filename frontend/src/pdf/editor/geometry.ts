/**
 * Page <-> screen geometry. Mirrors pdf.js's PageViewport transform (which is
 * no longer exported in pdf.js 6) so layouts can be computed for every page
 * without loading it.
 */
import type { Rect } from '../engine/matrix';

/** CSS pixels per PDF point at 100% zoom. */
export const CSS_UNITS = 96 / 72;

export class View {
    readonly width: number;
    readonly height: number;
    readonly transform: [number, number, number, number, number, number];
    private readonly inv: [number, number, number, number, number, number];

    constructor(
        readonly box: Rect,
        readonly scale: number,
        readonly rotation: number,
    ) {
        const { x0, y0, x1, y1 } = box;
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        const rot = ((rotation % 360) + 360) % 360;
        let a: number, b: number, c: number, d: number;
        if (rot === 90) [a, b, c, d] = [0, 1, 1, 0];
        else if (rot === 180) [a, b, c, d] = [-1, 0, 0, 1];
        else if (rot === 270) [a, b, c, d] = [0, -1, -1, 0];
        else [a, b, c, d] = [1, 0, 0, -1];
        let ox: number, oy: number;
        if (a === 0) {
            ox = Math.abs(cy - y0) * scale;
            oy = Math.abs(cx - x0) * scale;
            this.width = (y1 - y0) * scale;
            this.height = (x1 - x0) * scale;
        } else {
            ox = Math.abs(cx - x0) * scale;
            oy = Math.abs(cy - y0) * scale;
            this.width = (x1 - x0) * scale;
            this.height = (y1 - y0) * scale;
        }
        this.transform = [a * scale, b * scale, c * scale, d * scale, ox - a * scale * cx - c * scale * cy, oy - b * scale * cx - d * scale * cy];
        const [m0, m1, m2, m3, m4, m5] = this.transform;
        const det = m0 * m3 - m1 * m2;
        this.inv = [m3 / det, -m1 / det, -m2 / det, m0 / det, (m2 * m5 - m3 * m4) / det, (m1 * m4 - m0 * m5) / det];
    }

    /** PDF user space -> CSS px within the page. */
    toScreen(x: number, y: number): [number, number] {
        const m = this.transform;
        return [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]];
    }

    /** CSS px within the page -> PDF user space. */
    toPdf(x: number, y: number): [number, number] {
        const m = this.inv;
        return [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]];
    }

    /** Axis-aligned screen rect of a PDF rect. */
    rectToScreen(r: Rect): { left: number; top: number; width: number; height: number } {
        const a = this.toScreen(r.x0, r.y0), b = this.toScreen(r.x1, r.y1);
        return { left: Math.min(a[0], b[0]), top: Math.min(a[1], b[1]), width: Math.abs(b[0] - a[0]), height: Math.abs(b[1] - a[1]) };
    }

    /** PDF rect from two screen points. */
    rectToPdf(x0: number, y0: number, x1: number, y1: number): Rect {
        const a = this.toPdf(x0, y0), b = this.toPdf(x1, y1);
        return { x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]) };
    }

    /** Screen-space angle (radians, clockwise) of a PDF direction — rotates overlays for rotated pages/text. */
    screenAngle(pdfAngle: number): number {
        const [x0, y0] = this.toScreen(0, 0);
        const [x1, y1] = this.toScreen(Math.cos(pdfAngle), Math.sin(pdfAngle));
        const a = Math.atan2(y1 - y0, x1 - x0);
        return Math.abs(a) < 1e-6 ? 0 : a;
    }

    /** PDF-space angle for text that should read left-to-right on screen. */
    uprightPdfAngle(): number {
        const [x0, y0] = this.toPdf(0, 0);
        const [x1, y1] = this.toPdf(1, 0);
        return Math.atan2(y1 - y0, x1 - x0);
    }
}

/** Largest canvas we allow (iOS Safari caps canvases around 16.7M pixels). */
export const MAX_CANVAS_PIXELS = 16_000_000;

export function outputScale(view: View): number {
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 1;
    const px = view.width * view.height * dpr * dpr;
    return px > MAX_CANVAS_PIXELS ? Math.sqrt(MAX_CANVAS_PIXELS / (view.width * view.height)) : dpr;
}
