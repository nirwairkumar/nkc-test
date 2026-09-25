/**
 * Turns a user image (file, canvas) into bytes pdf-lib can embed (PNG/JPEG),
 * downscaling very large photos so exported PDFs stay small.
 */
import type { StoredImage } from '../engine/edits';

const MAX_SIDE = 2400;

async function canvasBytes(canvas: HTMLCanvasElement, mime: 'image/png' | 'image/jpeg', quality = 0.9): Promise<Uint8Array> {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mime, quality));
    if (!blob) throw new Error('Could not encode image');
    return new Uint8Array(await blob.arrayBuffer());
}

function hasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
    const step = Math.max(1, Math.floor((w * h) / 20000));
    const d = ctx.getImageData(0, 0, w, h).data;
    for (let i = 3; i < d.length; i += 4 * step) if (d[i] < 250) return true;
    return false;
}

export async function imageFromFile(file: File): Promise<StoredImage> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const bitmap = await createImageBitmap(new Blob([bytes as unknown as BlobPart], { type: file.type || 'image/png' }));
    const { width, height } = bitmap;
    const small = Math.max(width, height) <= MAX_SIDE;
    if (small && (file.type === 'image/png' || file.type === 'image/jpeg')) {
        bitmap.close?.();
        return { bytes, mime: file.type, width, height };
    }
    // Re-encode (WebP/GIF/huge images): JPEG for opaque photos, PNG when transparent.
    const k = Math.min(1, MAX_SIDE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * k);
    canvas.height = Math.round(height * k);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const mime = hasAlpha(ctx, canvas.width, canvas.height) ? 'image/png' : 'image/jpeg';
    return { bytes: await canvasBytes(canvas, mime, 0.88), mime, width: canvas.width, height: canvas.height };
}

/** Crops a canvas to its non-transparent content and encodes it as PNG. */
export async function trimmedPng(canvas: HTMLCanvasElement, pad = 6): Promise<StoredImage | null> {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const { width: w, height: h } = canvas;
    const d = ctx.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (d[(y * w + x) * 4 + 3] > 8) {
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
            }
        }
    }
    if (x1 < 0) return null;
    x0 = Math.max(0, x0 - pad);
    y0 = Math.max(0, y0 - pad);
    x1 = Math.min(w - 1, x1 + pad);
    y1 = Math.min(h - 1, y1 + pad);
    const out = document.createElement('canvas');
    out.width = x1 - x0 + 1;
    out.height = y1 - y0 + 1;
    out.getContext('2d')!.drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return { bytes: await canvasBytes(out, 'image/png'), mime: 'image/png', width: out.width, height: out.height };
}

/**
 * For photographed/scanned signatures: makes near-white pixels transparent
 * and darkens the ink so it reads cleanly on any page.
 */
export async function removeWhiteBackground(img: StoredImage): Promise<StoredImage | null> {
    const bitmap = await createImageBitmap(new Blob([img.bytes as unknown as BlobPart], { type: img.mime }));
    const k = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * k);
    canvas.height = Math.round(bitmap.height * k);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const p = data.data;
    for (let i = 0; i < p.length; i += 4) {
        const lum = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
        // Smooth ramp: paper (>200) becomes transparent, ink stays opaque.
        const a = Math.max(0, Math.min(255, ((215 - lum) / 90) * 255));
        p[i + 3] = Math.min(p[i + 3], a);
    }
    ctx.putImageData(data, 0, 0);
    return trimmedPng(canvas, 2);
}
