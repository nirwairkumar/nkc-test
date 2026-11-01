/**
 * The practice document used by the guide's demos: a landscape A4 certificate,
 * laid out the way a PDF stores it — positioned lines of text in points, each in
 * one embedded font. Each font is a subset, holding only the letters the original
 * text uses, so typing a letter the subset lacks is flagged exactly as Panna does
 * ("Not in this PDF's font: R → Times").
 */

export const PAGE_W = 842;
export const PAGE_H = 595;
export const PAPER = '#fffdf6';

export type FontKey = 'regular' | 'bold' | 'italic';

/** The certificate's embedded fonts (Georgia family) and the standard font used for missing letters. */
export const DOC_FONTS: Record<FontKey, { label: string; css: string; weight: number; italic: boolean; fallback: string }> = {
    regular: { label: 'Georgia', css: 'Georgia, "Noto Serif", "Times New Roman", serif', weight: 400, italic: false, fallback: 'Times' },
    bold: { label: 'Georgia Bold', css: 'Georgia, "Noto Serif", "Times New Roman", serif', weight: 700, italic: false, fallback: 'Times Bold' },
    italic: { label: 'Georgia Italic', css: 'Georgia, "Noto Serif", "Times New Roman", serif', weight: 400, italic: true, fallback: 'Times Italic' },
};
export const FALLBACK_CSS = '"Times New Roman", Times, "Liberation Serif", serif';

/** Font families offered in the format bar (src/pdf/editor/fonts.ts). */
export const FAMILIES = [
    { id: 'helvetica', label: 'Helvetica (Arial)', css: 'Helvetica, Arial, "Liberation Sans", sans-serif' },
    { id: 'times', label: 'Times New Roman', css: '"Times New Roman", Times, "Liberation Serif", serif' },
    { id: 'courier', label: 'Courier', css: '"Courier New", Courier, "Liberation Mono", monospace' },
    { id: 'noto-sans', label: 'Noto Sans', css: '"Noto Sans", sans-serif', sample: '₹ Ω ā' },
    { id: 'noto-serif', label: 'Noto Serif', css: '"Noto Serif", serif', sample: '₹ Ω ā' },
    { id: 'noto-devanagari', label: 'Noto Sans Devanagari', css: '"Noto Sans Devanagari", "Nirmala UI", Mangal, "Kohinoor Devanagari", sans-serif', sample: 'हिन्दी' },
] as const;

export type RGB = [number, number, number];

export interface Block {
    id: string;
    text: string;
    font: FontKey;
    /** Size in points. */
    size: number;
    /** Anchor: the centre for centred text, the left edge otherwise. */
    x: number;
    /** Top of the first line, in points from the top of the page. */
    top: number;
    lineHeight: number;
    align: 'center' | 'left';
    /** Wrapping width in points (paragraphs only). */
    width?: number;
    color: RGB;
    /** Letter spacing in em. */
    tracking?: number;
    paragraph?: boolean;
}

const ink = (hex: string): RGB => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];

export const BLOCKS: Block[] = [
    { id: 'school', text: 'GREENFIELD PUBLIC SCHOOL, PUNE', font: 'bold', size: 12, x: 421, top: 56, lineHeight: 15, align: 'center', color: ink('#14532d'), tracking: 0.16 },
    { id: 'title', text: 'Certificate of Merit', font: 'regular', size: 36, x: 421, top: 78, lineHeight: 44, align: 'center', color: ink('#0f3d2e') },
    { id: 'presented', text: 'This certificate is proudly presented to', font: 'italic', size: 13, x: 421, top: 132, lineHeight: 17, align: 'center', color: ink('#475569') },
    { id: 'name', text: 'Ananya Sharma', font: 'italic', size: 30, x: 421, top: 154, lineHeight: 38, align: 'center', color: ink('#0f172a') },
    {
        id: 'body',
        text: 'for securing First Position in the Inter-School Science Olympiad held on 14 March 2026 at Pune, with a score of 96 out of 100.',
        font: 'regular',
        size: 14,
        x: 421,
        top: 208,
        lineHeight: 22,
        width: 500,
        align: 'center',
        color: ink('#1e293b'),
        paragraph: true,
    },
    { id: 'signName', text: 'R. Iyer', font: 'bold', size: 12, x: 210, top: 470, lineHeight: 15, align: 'center', color: ink('#0f172a') },
    { id: 'signRole', text: 'Principal', font: 'regular', size: 11, x: 210, top: 487, lineHeight: 14, align: 'center', color: ink('#475569') },
    { id: 'date', text: '14 March 2026', font: 'regular', size: 12, x: 632, top: 470, lineHeight: 15, align: 'center', color: ink('#0f172a') },
    { id: 'dateRole', text: 'Date of issue', font: 'regular', size: 11, x: 632, top: 487, lineHeight: 14, align: 'center', color: ink('#475569') },
    { id: 'certNo', text: 'Certificate No. GPS/SCI/2026/0157', font: 'regular', size: 9, x: 60, top: 540, lineHeight: 12, align: 'left', color: ink('#64748b') },
];

export const blockById = (id: string) => BLOCKS.find((b) => b.id === id)!;

/** The letters each embedded font actually contains (a subset, as in most PDFs). */
export const SUBSETS: Record<FontKey, Set<string>> = (() => {
    const out = { regular: new Set<string>(), bold: new Set<string>(), italic: new Set<string>() };
    for (const b of BLOCKS) for (const ch of b.text) out[b.font].add(ch);
    return out;
})();

/** Letters of `text` that the block's own font can't draw (spaces never count). */
export function missingLetters(text: string, font: FontKey): string[] {
    const seen = new Set<string>();
    for (const ch of text) if (ch.trim() && !SUBSETS[font].has(ch)) seen.add(ch);
    return [...seen];
}

export const rgbCss = (c: RGB) => `rgb(${Math.round(c[0] * 255)} ${Math.round(c[1] * 255)} ${Math.round(c[2] * 255)})`;
export const rgbHex = (c: RGB) => '#' + c.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
export const hexRgb = (h: string): RGB => ink(h);
