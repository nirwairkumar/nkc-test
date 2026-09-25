/**
 * Writable font faces. A Face turns text into positioned glyph codes for one
 * font resource. Three kinds:
 *  - OrigFace:   a font already in the PDF (re-encoded through its own encoding)
 *  - StdFace:    one of the 14 standard PDF fonts (WinAnsi, nothing embedded)
 *  - CustomFace: an embedded TrueType (Noto) with full OpenType shaping, so
 *                Devanagari conjuncts, matras and marks come out correctly.
 */
import 'regenerator-runtime/runtime'; // @pdf-lib/fontkit's Indic shaper needs it
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, StandardFontEmbedder, StandardFonts } from 'pdf-lib';
import type { FontClass, FontInfo } from './fonts';

export interface ShapedGlyph {
    bytes: Uint8Array;
    /** Advance the viewer applies after this glyph, text units per 1pt size. */
    advance: number;
    /** Where the pen should move for the next glyph (includes kerning), per 1pt. */
    xAdvance: number;
    xOffset: number;
    yOffset: number;
    /** Syllable cluster this glyph belongs to (shaped scripts): its logical text. */
    cluster?: { text: string; start: boolean; end: boolean };
}

export interface Face {
    readonly key: string;
    readonly label: string;
    supports(ch: string): boolean;
    shape(text: string): ShapedGlyph[];
    /** A space glyph, if the font has one. */
    readonly space: ShapedGlyph | null;
    readonly bold: boolean;
    readonly italic: boolean;
    readonly ascent: number;
    readonly descent: number;
}

const COMPLEX = /[ऀ-෿؀-ۿ฀-๿꣠-ꣿ᳐-᳿]/;
export const isComplexScript = (s: string) => COMPLEX.test(s);
export const isDevanagari = (s: string) => /[ऀ-ॿ꣠-ꣿ᳐-᳿]/.test(s);

export class OrigFace implements Face {
    readonly key: string;
    readonly label: string;
    readonly space: ShapedGlyph | null;
    constructor(readonly info: FontInfo) {
        this.key = 'orig:' + (info.ref?.toString() ?? info.fontId);
        this.label = info.displayName;
        const sp = info.encodeChar(' ');
        this.space = sp ? { bytes: Uint8Array.from(sp.bytes), advance: sp.width, xAdvance: sp.width, xOffset: 0, yOffset: 0 } : null;
    }
    get bold() {
        return this.info.bold;
    }
    get italic() {
        return this.info.italic;
    }
    get ascent() {
        return this.info.ascent;
    }
    get descent() {
        return this.info.descent;
    }
    supports(ch: string): boolean {
        // Complex scripts need shaping, which the embedded subset cannot give us.
        if (isComplexScript(ch)) return false;
        return this.info.encodeChar(ch) !== null;
    }
    shape(text: string): ShapedGlyph[] {
        const out: ShapedGlyph[] = [];
        for (const ch of Array.from(text)) {
            const e = this.info.encodeChar(ch);
            if (!e) continue;
            out.push({ bytes: Uint8Array.from(e.bytes), advance: e.width, xAdvance: e.width, xOffset: 0, yOffset: 0 });
        }
        return out;
    }
}

interface StdEmbedder {
    font: { getWidthOfGlyph(n: string): number | undefined; getXAxisKerningForPair(a: string, b: string): number | undefined; Ascender?: number; Descender?: number };
    encoding: { canEncodeUnicodeCodePoint(cp: number): boolean; encodeUnicodeCodePoint(cp: number): { code: number; name: string } };
}

export class StdFace implements Face {
    readonly key: string;
    readonly space: ShapedGlyph | null;
    readonly ascent: number;
    readonly descent: number;
    private readonly emb: StdEmbedder;
    constructor(
        readonly pdfFont: PDFFont,
        readonly name: string,
        readonly bold: boolean,
        readonly italic: boolean,
    ) {
        this.key = 'std:' + name;
        this.emb = (pdfFont as unknown as { embedder: StdEmbedder }).embedder;
        this.space = this.shape(' ')[0] ?? null;
        this.ascent = (this.emb.font.Ascender ?? 718) / 1000;
        this.descent = (this.emb.font.Descender ?? -207) / 1000;
    }
    get label() {
        return this.name.replace(/-(Roman|Bold|Italic|Oblique|BoldItalic|BoldOblique)$/, '');
    }
    supports(ch: string): boolean {
        const cp = ch.codePointAt(0)!;
        if (ch.length > 2 || !this.emb.encoding.canEncodeUnicodeCodePoint(cp)) return false;
        const { name } = this.emb.encoding.encodeUnicodeCodePoint(cp);
        return !!this.emb.font.getWidthOfGlyph(name) || cp === 32;
    }
    shape(text: string): ShapedGlyph[] {
        const out: ShapedGlyph[] = [];
        const cps = Array.from(text).filter((c) => this.supports(c));
        const enc = cps.map((c) => this.emb.encoding.encodeUnicodeCodePoint(c.codePointAt(0)!));
        enc.forEach((g, i) => {
            const w = (this.emb.font.getWidthOfGlyph(g.name) || 250) / 1000;
            const next = enc[i + 1];
            const kern = next ? (this.emb.font.getXAxisKerningForPair(g.name, next.name) || 0) / 1000 : 0;
            out.push({ bytes: Uint8Array.of(g.code), advance: w, xAdvance: w + kern, xOffset: 0, yOffset: 0 });
        });
        return out;
    }
}

interface FkGlyph {
    id: number;
    advanceWidth: number;
    codePoints: number[];
}
interface FkFont {
    unitsPerEm: number;
    ascent: number;
    descent: number;
    hasGlyphForCodePoint(cp: number): boolean;
    layout(text: string, features?: unknown): { glyphs: FkGlyph[]; positions: { xAdvance: number; xOffset: number; yOffset: number }[] };
}
interface CustomEmbedder {
    font: FkFont;
    fontFeatures: unknown;
    encodeText(text: string): { asBytes(): Uint8Array };
}

export class CustomFace implements Face {
    readonly key: string;
    readonly space: ShapedGlyph | null;
    readonly ascent: number;
    readonly descent: number;
    private readonly emb: CustomEmbedder;
    constructor(
        readonly pdfFont: PDFFont,
        readonly id: string,
        readonly label: string,
        readonly bold: boolean,
        readonly italic: boolean,
    ) {
        this.key = 'custom:' + id;
        this.emb = (pdfFont as unknown as { embedder: CustomEmbedder }).embedder;
        const upem = this.emb.font.unitsPerEm;
        this.ascent = this.emb.font.ascent / upem;
        this.descent = this.emb.font.descent / upem;
        this.space = this.supports(' ') ? (this.shape(' ')[0] ?? null) : null;
    }
    supports(ch: string): boolean {
        return this.emb.font.hasGlyphForCodePoint(ch.codePointAt(0)!);
    }
    shape(text: string): ShapedGlyph[] {
        if (!text) return [];
        const upem = this.emb.font.unitsPerEm;
        const { glyphs, positions } = this.emb.font.layout(text, this.emb.fontFeatures);
        const bytes = this.emb.encodeText(text).asBytes(); // also registers glyphs in the subset
        const out: ShapedGlyph[] = glyphs.map((g, i) => ({
            bytes: bytes.subarray(i * 2, i * 2 + 2),
            advance: g.advanceWidth / upem,
            xAdvance: positions[i].xAdvance / upem,
            xOffset: positions[i].xOffset / upem,
            yOffset: positions[i].yOffset / upem,
        }));
        if (isComplexScript(text)) assignClusters(text, glyphs, out);
        return out;
    }
}

/**
 * Groups shaped glyphs into syllable clusters using each glyph's source code
 * points: a cluster closes once its glyphs cover a contiguous stretch of the
 * input. Reordering (pre-base matras, reph) only happens inside a cluster.
 */
function assignClusters(text: string, glyphs: FkGlyph[], out: ShapedGlyph[]) {
    const cps = Array.from(text).map((c) => c.codePointAt(0)!);
    const used = new Array(cps.length).fill(false);
    const idxOf = (cp: number) => {
        const i = cps.findIndex((c, k) => c === cp && !used[k]);
        if (i >= 0) used[i] = true;
        return i;
    };
    let groupStart = 0;
    let covered = new Set<number>();
    let next = 0; // first input index not yet assigned to a closed cluster
    for (let gi = 0; gi < glyphs.length; gi++) {
        for (const cp of glyphs[gi].codePoints ?? []) {
            const i = idxOf(cp);
            if (i >= 0) covered.add(i);
        }
        const max = covered.size ? Math.max(...covered) : next - 1;
        let contiguous = covered.size > 0;
        for (let k = next; k <= max && contiguous; k++) if (!covered.has(k)) contiguous = false;
        const last = gi === glyphs.length - 1;
        if ((contiguous && Math.min(...covered) === next) || last) {
            const end = last ? cps.length - 1 : max;
            const clusterText = String.fromCodePoint(...cps.slice(next, end + 1));
            for (let k = groupStart; k <= gi; k++) out[k].cluster = { text: clusterText, start: k === groupStart, end: k === gi };
            next = end + 1;
            groupStart = gi + 1;
            covered = new Set();
        }
    }
}

// ---------------------------------------------------------------------------

export const CUSTOM_FONTS: Record<string, { file: string; label: string; bold: boolean; italic: boolean }> = {
    'noto-sans': { file: 'NotoSans-Regular.ttf', label: 'Noto Sans', bold: false, italic: false },
    'noto-sans-b': { file: 'NotoSans-Bold.ttf', label: 'Noto Sans', bold: true, italic: false },
    'noto-sans-i': { file: 'NotoSans-Italic.ttf', label: 'Noto Sans', bold: false, italic: true },
    'noto-sans-bi': { file: 'NotoSans-BoldItalic.ttf', label: 'Noto Sans', bold: true, italic: true },
    'noto-serif': { file: 'NotoSerif-Regular.ttf', label: 'Noto Serif', bold: false, italic: false },
    'noto-serif-b': { file: 'NotoSerif-Bold.ttf', label: 'Noto Serif', bold: true, italic: false },
    'noto-serif-i': { file: 'NotoSerif-Italic.ttf', label: 'Noto Serif', bold: false, italic: true },
    'noto-serif-bi': { file: 'NotoSerif-BoldItalic.ttf', label: 'Noto Serif', bold: true, italic: true },
    'noto-devanagari': { file: 'NotoSansDevanagari-Regular.ttf', label: 'Noto Sans Devanagari', bold: false, italic: false },
    'noto-devanagari-b': { file: 'NotoSansDevanagari-Bold.ttf', label: 'Noto Sans Devanagari', bold: true, italic: false },
};

export type FontLoader = (file: string) => Promise<Uint8Array>;

/** Id of a Noto face in CUSTOM_FONTS for a family + style. */
export function notoId(family: string, bold: boolean, italic: boolean): string {
    if (family === 'noto-devanagari') return bold ? 'noto-devanagari-b' : 'noto-devanagari';
    return family + (bold && italic ? '-bi' : bold ? '-b' : italic ? '-i' : '');
}

export function stdName(family: 'helvetica' | 'times' | 'courier', bold: boolean, italic: boolean): StandardFonts {
    if (family === 'times') {
        return bold && italic ? StandardFonts.TimesRomanBoldItalic : bold ? StandardFonts.TimesRomanBold : italic ? StandardFonts.TimesRomanItalic : StandardFonts.TimesRoman;
    }
    const base = family === 'courier' ? 'Courier' : 'Helvetica';
    const sfx = bold && italic ? '-BoldOblique' : bold ? '-Bold' : italic ? '-Oblique' : '';
    return (base + sfx) as StandardFonts;
}

/** Custom font bytes are shared across documents in a session. */
const fontBytesCache = new Map<string, Promise<Uint8Array>>();

/** Non-Latin-1 characters that WinAnsi (standard fonts) can still show. */
const WIN_ANSI_EXTRA = new Set(Array.from('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'));

/**
 * Doc-bound face registry. Faces for standard fonts are created on demand
 * (synchronously); custom fonts must be `prepare()`d first because loading
 * and parsing them is asynchronous.
 */
export class FaceRegistry {
    private readonly std = new Map<string, StdFace>();
    private readonly custom = new Map<string, CustomFace>();
    private readonly orig = new Map<FontInfo, OrigFace>();

    constructor(
        readonly doc: PDFDocument,
        private readonly loader: FontLoader,
    ) {
        doc.registerFontkit(fontkit);
    }

    origFace(info: FontInfo): OrigFace {
        let f = this.orig.get(info);
        if (!f) {
            f = new OrigFace(info);
            this.orig.set(info, f);
        }
        return f;
    }

    stdFace(family: 'helvetica' | 'times' | 'courier', bold: boolean, italic: boolean): StdFace {
        const name = stdName(family, bold, italic);
        let f = this.std.get(name);
        if (!f) {
            f = new StdFace(embedStdSync(this.doc, name), name, bold, italic);
            this.std.set(name, f);
        }
        return f;
    }

    customFace(id: string): CustomFace | null {
        return this.custom.get(id) ?? null;
    }

    async prepare(ids: Iterable<string>): Promise<void> {
        for (const id of ids) {
            if (this.custom.has(id) || !CUSTOM_FONTS[id]) continue;
            const meta = CUSTOM_FONTS[id];
            let p = fontBytesCache.get(meta.file);
            if (!p) {
                p = this.loader(meta.file);
                fontBytesCache.set(meta.file, p);
                p.catch(() => fontBytesCache.delete(meta.file));
            }
            const bytes = await p;
            // PostScript-style names ("NotoSerif-Bold") let viewers — and this editor, when the
            // file is opened again — tell the weights and styles apart.
            const pdfFont = await this.doc.embedFont(bytes, { subset: true, customName: meta.file.replace(/\.ttf$/i, '') });
            this.custom.set(id, new CustomFace(pdfFont, id, meta.label, meta.bold, meta.italic));
        }
    }

    /** Best fallback face for a character given the style it should resemble. */
    fallbackFor(ch: string, cls: FontClass, bold: boolean, italic: boolean): Face | null {
        if (isDevanagari(ch)) {
            const f = this.customFace(notoId('noto-devanagari', bold, false));
            return f && f.supports(ch) ? f : null;
        }
        const stdFam = cls === 'mono' ? 'courier' : cls === 'serif' ? 'times' : 'helvetica';
        const s = this.stdFace(stdFam, bold, italic);
        if (s.supports(ch)) return s;
        const noto = this.customFace(notoId(cls === 'serif' ? 'noto-serif' : 'noto-sans', bold, italic));
        if (noto?.supports(ch)) return noto;
        const plain = this.customFace('noto-sans');
        return plain?.supports(ch) ? plain : null;
    }

    /** Custom fonts that may be needed to show `text` in a style. */
    static neededCustomFonts(text: string, cls: FontClass, bold: boolean, italic: boolean): string[] {
        const ids = new Set<string>();
        for (const ch of text) {
            if (isDevanagari(ch)) ids.add(notoId('noto-devanagari', bold, false));
            else if (ch.codePointAt(0)! > 0xff && !WIN_ANSI_EXTRA.has(ch)) {
                ids.add(notoId(cls === 'serif' ? 'noto-serif' : 'noto-sans', bold, italic));
                ids.add('noto-sans');
            }
        }
        return [...ids];
    }
}

/** PDFDocument.embedFont(StandardFonts.X) does no async work; this is its synchronous twin. */
function embedStdSync(doc: PDFDocument, name: StandardFonts): PDFFont {
    const internals = doc as unknown as { fonts: PDFFont[] };
    const embedder = StandardFontEmbedder.for(name as unknown as Parameters<typeof StandardFontEmbedder.for>[0]);
    const ref = doc.context.nextRef();
    const font = (PDFFont as unknown as { of(r: unknown, d: PDFDocument, e: unknown): PDFFont }).of(ref, doc, embedder);
    internals.fonts.push(font);
    return font;
}
