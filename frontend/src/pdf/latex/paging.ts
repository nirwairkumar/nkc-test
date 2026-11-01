/**
 * Page geometry shared by the live preview and the PDF export, so the page
 * breaks the user sees on screen are exactly the ones in the downloaded file.
 * Everything is measured on the rendered document in its own CSS pixels.
 */

/** PDF points per CSS pixel. */
export const PT_PER_PX = 72 / 96;

export type PageSizeId = 'a4' | 'letter';
export const PAGE_SIZES: Record<PageSizeId, { label: string; size: [number, number] }> = {
    a4: { label: 'A4', size: [595.28, 841.89] },
    letter: { label: 'Letter', size: [612, 792] },
};

export type MarginId = 'narrow' | 'normal' | 'wide';
export const MARGINS: Record<MarginId, { label: string; pt: number }> = {
    narrow: { label: 'Narrow', pt: 36 }, // 12.7 mm
    normal: { label: 'Normal', pt: 56.69 }, // 20 mm
    wide: { label: 'Wide', pt: 72 }, // 25.4 mm
};

export interface PageSetup {
    size: [number, number];
    margin: number;
}

export const contentWidthPx = (p: PageSetup) => (p.size[0] - 2 * p.margin) / PT_PER_PX;
export const contentHeightPx = (p: PageSetup) => (p.size[1] - 2 * p.margin) / PT_PER_PX;

/** Maps viewport coordinates to the document's own CSS px (undoing any preview scaling). */
export function docFrame(root: HTMLElement) {
    const r = root.getBoundingClientRect();
    const k = r.width / (root.offsetWidth || r.width) || 1;
    return { X: (x: number) => (x - r.left) / k, Y: (y: number) => (y - r.top) / k, k };
}

/** Parts of the DOM that are never painted (KaTeX's MathML copy for screen readers). */
export const NOT_PAINTED = '.katex-mathml, style, script';

/**
 * Vertical extents that must not be cut by a page break (text lines, formulas,
 * table rows, images; headings stay with the line after them) and forced breaks.
 */
export function layoutAtoms(root: HTMLElement) {
    const { Y } = docFrame(root);
    const atomic: [number, number][] = [];
    const forced: number[] = [];
    const add = (r: DOMRect, extra = 0) => {
        if (r.width > 0 || r.height > 0) atomic.push([Y(r.top), Y(r.bottom) + extra]);
    };
    const range = document.createRange();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.nodeValue?.trim() || n.parentElement?.closest(NOT_PAINTED)) continue;
        range.selectNodeContents(n);
        for (const r of Array.from(range.getClientRects())) if (r.width > 0) add(r);
    }
    root.querySelectorAll('.katex-display, .katex-html > .base, tr, img, svg, input').forEach((el) => {
        if (!el.closest(NOT_PAINTED)) add(el.getBoundingClientRect());
    });
    root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => add(el.getBoundingClientRect(), 2.2 * parseFloat(getComputedStyle(el).fontSize)));
    root.querySelectorAll('[data-page-break]').forEach((el) => forced.push(Y(el.getBoundingClientRect().top)));
    return { atomic, forced, height: Math.max(root.scrollHeight, root.offsetHeight) };
}

/**
 * Splits [0, total) into pages of at most `pageH`, never cutting an atomic
 * extent unless it is taller than most of a page. Each page starts at the
 * first content after the previous break, so no page begins with a gap.
 */
export function paginate(atomic: [number, number][], forced: number[], total: number, pageH: number): [number, number][] {
    const sorted = atomic.filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
    const regions: [number, number][] = [];
    for (const [a, b] of sorted) {
        const last = regions[regions.length - 1];
        if (last && a < last[1] - 0.5) last[1] = Math.max(last[1], b);
        else regions.push([a, b]);
    }
    const breaks = [...forced].sort((a, b) => a - b);
    const pages: [number, number][] = [];
    let start = 0;
    while (start < total - 0.5 && pages.length < 2000) {
        let end = Math.min(total, start + pageH);
        const f = breaks.find((b) => b > start + 1 && b <= end);
        if (f !== undefined) end = f;
        else if (end < total) {
            const inside = regions.find(([a, b]) => a < end - 0.5 && b > end + 0.5);
            if (inside && inside[0] > start + pageH * 0.25) end = inside[0];
        }
        pages.push([start, end]);
        const next = regions.find(([, b]) => b > end + 0.5);
        start = next ? Math.max(end, next[0]) : total;
    }
    return pages.length ? pages : [[0, Math.max(total, 1)]];
}

export function measurePages(root: HTMLElement, setup: PageSetup): [number, number][] {
    const { atomic, forced, height } = layoutAtoms(root);
    return paginate(atomic, forced, height, contentHeightPx(setup));
}

/** Index of the page a document y-coordinate belongs to. */
export function pageIndexAt(pages: [number, number][], y: number): number {
    let i = 0;
    while (i + 1 < pages.length && pages[i + 1][0] <= y + 0.5) i++;
    return i;
}

/**
 * Display formulas and tables wider than the page are scaled down to fit
 * (to at most half size) instead of running off the paper.
 */
export function fitWideContent(root: HTMLElement) {
    root.querySelectorAll<HTMLElement>('.katex-display > .katex, .doc-table > table').forEach((el) => {
        el.style.fontSize = '';
    });
    const width = root.clientWidth;
    root.querySelectorAll<HTMLElement>('.katex-display').forEach((d) => {
        const k = d.querySelector<HTMLElement>(':scope > .katex');
        if (!k || d.scrollWidth <= d.clientWidth + 1) return;
        const ratio = Math.max(0.5, (d.clientWidth - 2) / d.scrollWidth);
        k.style.fontSize = `${parseFloat(getComputedStyle(k).fontSize) * ratio}px`;
    });
    root.querySelectorAll<HTMLElement>('.doc-table > table').forEach((t) => {
        if (t.offsetWidth <= width + 1) return;
        const ratio = Math.max(0.6, (width - 2) / t.offsetWidth);
        t.style.fontSize = `${parseFloat(getComputedStyle(t).fontSize) * ratio}px`;
    });
}
