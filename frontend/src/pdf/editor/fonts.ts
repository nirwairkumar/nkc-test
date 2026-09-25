/**
 * Font families offered for new text, with CSS stacks that are metric-
 * compatible with what the PDF export draws (Arial ≈ Helvetica, Times New
 * Roman ≈ Times, and the very same Noto files for the Unicode families).
 */
import type { FontInfo } from '../engine/fonts';

export interface FamilyOption {
    id: string;
    label: string;
    css: string;
    /** Script sample shown in the menu. */
    sample?: string;
}

export const FAMILIES: FamilyOption[] = [
    { id: 'helvetica', label: 'Helvetica (Arial)', css: 'Helvetica, Arial, "Liberation Sans", sans-serif' },
    { id: 'times', label: 'Times New Roman', css: '"Times New Roman", Times, "Liberation Serif", serif' },
    { id: 'courier', label: 'Courier', css: '"Courier New", Courier, "Liberation Mono", monospace' },
    { id: 'noto-sans', label: 'Noto Sans', css: '"Panna Noto Sans", "Noto Sans", sans-serif', sample: '₹ Ω ā' },
    { id: 'noto-serif', label: 'Noto Serif', css: '"Panna Noto Serif", "Noto Serif", serif', sample: '₹ Ω ā' },
    { id: 'noto-devanagari', label: 'Noto Sans Devanagari', css: '"Panna Noto Devanagari", "Noto Sans Devanagari", Mangal, sans-serif', sample: 'हिन्दी' },
];

export function familyCss(id: string, docFonts: FontInfo[] = []): string {
    if (id.startsWith('doc:')) {
        const f = docFonts.find((d) => d.ref?.toString() === id.slice(4));
        return f?.cssFamily ?? FAMILIES[0].css;
    }
    return FAMILIES.find((f) => f.id === id)?.css ?? FAMILIES[0].css;
}

let injected = false;
/** Registers the Noto files as web fonts (downloaded lazily, only when used). */
export function ensureEditorFonts() {
    if (injected || typeof document === 'undefined') return;
    injected = true;
    const faces: [string, string, number, string][] = [
        ['Panna Noto Sans', 'NotoSans-Regular.ttf', 400, 'normal'],
        ['Panna Noto Sans', 'NotoSans-Bold.ttf', 700, 'normal'],
        ['Panna Noto Sans', 'NotoSans-Italic.ttf', 400, 'italic'],
        ['Panna Noto Sans', 'NotoSans-BoldItalic.ttf', 700, 'italic'],
        ['Panna Noto Serif', 'NotoSerif-Regular.ttf', 400, 'normal'],
        ['Panna Noto Serif', 'NotoSerif-Bold.ttf', 700, 'normal'],
        ['Panna Noto Serif', 'NotoSerif-Italic.ttf', 400, 'italic'],
        ['Panna Noto Serif', 'NotoSerif-BoldItalic.ttf', 700, 'italic'],
        ['Panna Noto Devanagari', 'NotoSansDevanagari-Regular.ttf', 400, 'normal'],
        ['Panna Noto Devanagari', 'NotoSansDevanagari-Bold.ttf', 700, 'normal'],
    ];
    const el = document.createElement('style');
    el.dataset.panna = 'fonts';
    el.textContent = faces
        .map(([fam, file, w, st]) => `@font-face{font-family:"${fam}";src:url("/pdf-fonts/${file}") format("truetype");font-weight:${w};font-style:${st};font-display:swap}`)
        .join('\n');
    document.head.appendChild(el);
}

const metricsCache = new Map<string, { ascent: number; descent: number }>();

/** Forget cached metrics (after a web font finishes loading). */
export const resetFontMetrics = () => metricsCache.clear();

/**
 * CSS font ascent/descent (per 1px of font size) as the browser lays it out,
 * so an overlay's baseline can be placed exactly where the PDF puts it.
 */
export function cssFontMetrics(cssFamily: string, bold: boolean, italic: boolean): { ascent: number; descent: number } {
    const key = `${cssFamily}|${bold}|${italic}`;
    const hit = metricsCache.get(key);
    if (hit) return hit;
    let m = { ascent: 0.9, descent: 0.22 };
    try {
        const ctx = document.createElement('canvas').getContext('2d')!;
        ctx.font = `${italic ? 'italic ' : ''}${bold ? '700 ' : '400 '}100px ${cssFamily}`;
        const t = ctx.measureText('Hg');
        if (t.fontBoundingBoxAscent) m = { ascent: t.fontBoundingBoxAscent / 100, descent: t.fontBoundingBoxDescent / 100 };
    } catch {
        /* keep defaults */
    }
    metricsCache.set(key, m);
    return m;
}

/** Offset from the top of a CSS line box to its baseline. */
export function baselineOffset(cssFamily: string, bold: boolean, italic: boolean, sizePx: number, lineHeightPx: number): number {
    const { ascent, descent } = cssFontMetrics(cssFamily, bold, italic);
    return (lineHeightPx - (ascent + descent) * sizePx) / 2 + ascent * sizePx;
}
