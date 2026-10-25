/**
 * Question pictures are links (Storage, Cloudinary), not base64 inside the test, so the
 * exam screen would fetch each one only when its question opens. Fetch them all as soon as
 * the paper loads, so a candidate whose connection drops mid-exam still sees every picture.
 * The browser keeps them in its cache; the <img> on each question then loads instantly.
 */
const IMAGE_URL = /https?:\/\/[^\s"'()<>\\]+?\.(?:png|jpe?g|gif|webp|bmp)(?![\w.-])(?:\?[^\s"'()<>\\]*)?/gi;

const warmed = new Map<string, HTMLImageElement>();

export function preloadTestImages(test: any): void {
    if (typeof window === 'undefined' || !test) return;
    let text = '';
    try {
        text = JSON.stringify([test.questions, test.institution_logo]);
    } catch {
        return;
    }
    for (const url of text.match(IMAGE_URL) || []) {
        if (warmed.has(url)) continue;
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
        // Held so the request isn't dropped with the object.
        warmed.set(url, img);
    }
}
