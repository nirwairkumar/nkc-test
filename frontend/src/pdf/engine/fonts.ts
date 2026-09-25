/**
 * Font model: turns shown-string bytes into glyphs (code, unicode, advance) and,
 * in reverse, encodes new text into the SAME embedded font whenever the font
 * actually contains the needed glyphs. That reverse path is what lets an edit
 * keep the document's own typeface instead of swapping in Helvetica.
 */
import { PDFArray, PDFContext, PDFDict, PDFName, PDFNumber, PDFRef, PDFStream } from 'pdf-lib';
import { Font as StdFontMetrics, type IFontNames } from '@pdf-lib/standard-fonts';
import { CMap, identityCMap, parseCMap } from './cmap';
import {
    MacExpertEncoding,
    MacRomanEncoding,
    StandardEncoding,
    SymbolSetEncoding,
    WinAnsiEncoding,
    ZapfDingbatsEncoding,
    dingbatsGlyphList,
    glyphList,
} from './encodings.generated';
import { N, arrayNumbers, getArray, getDict, getName, getNumber, getStream, resolve, streamBytes } from './pdfobj';

export interface DecodedGlyph {
    code: number;
    /** Byte length of the code within the shown string. */
    len: number;
    /** Byte offset of the code within the shown string. */
    start: number;
    unicode: string;
    /** Horizontal advance in text space for a 1-unit font size (W / 1000). */
    width: number;
    /** Single-byte code 32: word spacing (Tw) applies. */
    wordSpace: boolean;
}

export interface EncodedPiece {
    bytes: number[];
    width: number;
}

type Enc = (string | 0)[];
const ENCODINGS: Record<string, Enc> = {
    StandardEncoding,
    MacRomanEncoding,
    WinAnsiEncoding,
    MacExpertEncoding,
};

const STD14 = new Set([
    'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic',
    'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique',
    'Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique',
    'Symbol', 'ZapfDingbats',
]);

/** Maps common PostScript/Windows names onto the standard 14 (PDF 32000 Annex D aliases). */
export function standardFontFor(baseFont: string): string | null {
    if (STD14.has(baseFont)) return baseFont;
    const n = baseFont.toLowerCase().replace(/[^a-z]/g, '');
    const bold = /bold|black|heavy|semibold|demi/.test(n);
    const italic = /italic|oblique/.test(n);
    if (n.startsWith('symbol')) return 'Symbol';
    if (n.startsWith('zapfdingbats')) return 'ZapfDingbats';
    let fam: 'Times' | 'Helvetica' | 'Courier' | null = null;
    if (/^(couriernew|courier)/.test(n)) fam = 'Courier';
    else if (/^(timesnewroman|times)/.test(n)) fam = 'Times';
    else if (/^(arial(?!narrow)|helvetica)/.test(n)) fam = 'Helvetica';
    if (!fam) return null;
    if (fam === 'Times') return bold && italic ? 'Times-BoldItalic' : bold ? 'Times-Bold' : italic ? 'Times-Italic' : 'Times-Roman';
    const suffix = bold && italic ? '-BoldOblique' : bold ? '-Bold' : italic ? '-Oblique' : '';
    return fam + suffix;
}

const stdMetricsCache = new Map<string, StdFontMetrics>();
function stdMetrics(name: string): StdFontMetrics | null {
    try {
        let m = stdMetricsCache.get(name);
        if (!m) {
            m = StdFontMetrics.load(name as IFontNames);
            stdMetricsCache.set(name, m);
        }
        return m;
    } catch {
        return null;
    }
}

/** Glyph name -> unicode string via AGL and the uniXXXX / uXXXXX conventions. */
export function glyphNameToUnicode(name: string, dingbats = false): string {
    if (!name) return '';
    const table = dingbats ? dingbatsGlyphList() : glyphList();
    const direct = table.get(name);
    if (direct !== undefined) return String.fromCodePoint(direct);
    const base = name.split('.')[0];
    if (base !== name) return glyphNameToUnicode(base, dingbats);
    if (base.includes('_')) return base.split('_').map((p) => glyphNameToUnicode(p, dingbats)).join('');
    let m = /^uni((?:[0-9A-Fa-f]{4})+)$/.exec(base);
    if (m) {
        let s = '';
        for (let i = 0; i < m[1].length; i += 4) s += String.fromCharCode(parseInt(m[1].slice(i, i + 4), 16));
        return s;
    }
    m = /^u([0-9A-Fa-f]{4,6})$/.exec(base);
    if (m) {
        const cp = parseInt(m[1], 16);
        if (cp <= 0x10ffff) return String.fromCodePoint(cp);
    }
    return '';
}

export type FontClass = 'serif' | 'sans' | 'mono' | 'script' | 'symbol';

export class FontInfo {
    readonly subtype: string;
    readonly baseFont: string;
    readonly isSubset: boolean;
    readonly isEmbedded: boolean;
    readonly isComposite: boolean;
    readonly isType3: boolean;
    readonly isVertical: boolean;
    /** Composite font with a predefined CMap we cannot decode: positions are approximate, not editable. */
    readonly unsupported: boolean;
    readonly bold: boolean;
    readonly italic: boolean;
    readonly fontClass: FontClass;
    /** Ascent/descent per 1-unit font size (text space). */
    readonly ascent: number;
    readonly descent: number;
    readonly std14: string | null;

    /**
     * Codes seen in page content — their glyphs are certainly present in the
     * font program. Shared (by font identity) across the preview copy and the
     * export document so both make identical font decisions.
     */
    readonly usedCodes: Set<number>;
    /** Stable identity across documents: raw BaseFont (with subset tag) + subtype. */
    readonly fontId: string;

    private readonly widthScale: number;
    private readonly simpleWidths: Map<number, number> = new Map();
    private readonly missingWidth: number;
    private readonly cidWidths: Map<number, number> = new Map();
    private readonly defaultCidWidth: number;
    private readonly encoding: Enc | null;
    private readonly toUnicode: CMap | null;
    private readonly cmap: CMap | null;
    private readonly symbolicTrueType: boolean;
    private reverse: Map<string, { code: number; len: number; width: number }> | null = null;

    constructor(
        private readonly ctx: PDFContext,
        readonly dict: PDFDict,
        readonly ref: PDFRef | null,
        usage?: Map<string, Set<number>>,
    ) {
        const subtype = getName(ctx, dict, 'Subtype') ?? 'Type1';
        this.subtype = subtype;
        const rawBase = getName(ctx, dict, 'BaseFont') ?? getName(ctx, dict, 'Name') ?? 'Unknown';
        this.fontId = rawBase + '|' + subtype;
        let used = usage?.get(this.fontId);
        if (!used) {
            used = new Set<number>();
            usage?.set(this.fontId, used);
        }
        this.usedCodes = used;
        this.isSubset = /^[A-Z]{6}\+/.test(rawBase);
        this.baseFont = rawBase.replace(/^[A-Z]{6}\+/, '');
        this.isComposite = subtype === 'Type0';
        this.isType3 = subtype === 'Type3';

        const descendant = this.isComposite
            ? (() => {
                  const arr = getArray(ctx, dict, 'DescendantFonts');
                  const d = arr && resolve(ctx, arr.get(0));
                  return d instanceof PDFDict ? d : undefined;
              })()
            : undefined;
        const descriptor = getDict(ctx, descendant ?? dict, 'FontDescriptor');
        this.isEmbedded = !!descriptor && ['FontFile', 'FontFile2', 'FontFile3'].some((k) => descriptor.get(N(k)) !== undefined);
        this.isEmbedded ||= this.isType3;

        const flags = getNumber(ctx, descriptor, 'Flags') ?? 0;
        const weight = getNumber(ctx, descriptor, 'FontWeight') ?? 0;
        const italicAngle = getNumber(ctx, descriptor, 'ItalicAngle') ?? 0;
        const lname = this.baseFont.toLowerCase();
        this.bold = weight >= 600 || /bold|black|heavy|semibold|demi/.test(lname) || !!(flags & 0x40000);
        this.italic = !!(flags & 0x40) || italicAngle !== 0 || /italic|oblique/.test(lname);
        const symbolic = !!(flags & 4) && !(flags & 32);
        this.fontClass =
            flags & 1 || /mono|courier|consol|typewriter|lucidaconsole/.test(lname)
                ? 'mono'
                : /symbol|dingbat|wingding|webding|marlett/.test(lname)
                  ? 'symbol'
                  : /script|brush|hand|vibes|dancing|zapfchancery|signature/.test(lname) || flags & 8
                    ? 'script'
                    : /sans|arial|helvetica|calibri|verdana|tahoma|segoe|gothic|futura|roboto|open ?sans|lato|inter|nirmala|mangal|trebuchet|candara|corbel|aptos/.test(lname)
                      ? 'sans'
                      : flags & 2 || /times|serif|roman|georgia|garamond|cambria|book|minion|palatino|kokila|aparajita|cmr|lmroman|nimbusrom/.test(lname)
                        ? 'serif'
                        : 'sans';

        this.std14 = !this.isEmbedded && !this.isComposite ? standardFontFor(this.baseFont) : null;

        // Vertical metrics
        let ascent = getNumber(ctx, descriptor, 'Ascent');
        let descent = getNumber(ctx, descriptor, 'Descent');
        const fontMatrix = this.isType3 ? arrayNumbers(ctx, getArray(ctx, dict, 'FontMatrix')) : [];
        this.widthScale = this.isType3 && fontMatrix.length === 6 ? fontMatrix[0] : 0.001;
        if (!ascent || ascent <= 0) ascent = this.fontClass === 'serif' ? 890 : 905;
        if (descent === undefined || descent >= 0) descent = -212;
        if (this.isType3) {
            const bbox = arrayNumbers(ctx, getArray(ctx, dict, 'FontBBox'));
            const sy = fontMatrix.length === 6 ? fontMatrix[3] : 0.001;
            this.ascent = bbox.length === 4 && bbox[3] ? Math.abs(bbox[3] * sy) : 0.8;
            this.descent = bbox.length === 4 && bbox[1] ? -Math.abs(bbox[1] * sy) : -0.2;
        } else {
            // Clamp absurd values some generators write.
            this.ascent = Math.min(Math.max(ascent, 500), 1300) / 1000;
            this.descent = Math.max(Math.min(descent, -50), -500) / 1000;
        }
        this.missingWidth = (getNumber(ctx, descriptor, 'MissingWidth') ?? 0) * this.widthScale;

        // ToUnicode
        const tu = getStream(ctx, dict, 'ToUnicode');
        let toUnicode: CMap | null = null;
        if (tu) {
            try {
                toUnicode = parseCMap(streamBytes(tu));
            } catch {
                toUnicode = null;
            }
        }
        this.toUnicode = toUnicode;

        if (this.isComposite) {
            this.encoding = null;
            this.symbolicTrueType = false;
            const encObj = resolve(ctx, dict.get(N('Encoding')));
            let cmap: CMap | null = null;
            let vertical = false;
            let unsupported = false;
            if (encObj instanceof PDFName) {
                const n = encObj.decodeText();
                vertical = n.endsWith('-V');
                if (n === 'Identity-H' || n === 'Identity-V') cmap = identityCMap();
                else unsupported = true;
            } else if (encObj instanceof PDFStream) {
                try {
                    cmap = parseCMap(streamBytes(encObj));
                    vertical = getNumber(ctx, encObj.dict, 'WMode') === 1;
                    if (!cmap.codespace.length) cmap.codespace.push({ len: 2, lo: [0, 0], hi: [255, 255] });
                } catch {
                    unsupported = true;
                }
            } else {
                cmap = identityCMap();
            }
            this.cmap = cmap ?? identityCMap();
            this.isVertical = vertical;
            this.unsupported = unsupported;
            this.defaultCidWidth = (getNumber(ctx, descendant, 'DW') ?? 1000) * 0.001;
            const w = getArray(ctx, descendant, 'W');
            if (w) this.parseCidWidths(w);
        } else {
            this.cmap = null;
            this.isVertical = false;
            this.unsupported = false;
            this.defaultCidWidth = 1;
            this.symbolicTrueType = subtype === 'TrueType' && symbolic;
            this.encoding = this.buildSimpleEncoding(symbolic);
            const first = getNumber(ctx, dict, 'FirstChar') ?? 0;
            const widths = getArray(ctx, dict, 'Widths');
            if (widths) {
                arrayNumbers(ctx, widths).forEach((wv, i) => this.simpleWidths.set(first + i, wv * this.widthScale));
            } else if (this.std14) {
                const m = stdMetrics(this.std14);
                if (m && this.encoding) {
                    this.encoding.forEach((gname, code) => {
                        if (gname) {
                            try {
                                this.simpleWidths.set(code, Number(m.getWidthOfGlyph(gname) ?? 0) * 0.001);
                            } catch {
                                /* glyph not in AFM */
                            }
                        }
                    });
                }
            }
        }
    }

    private parseCidWidths(w: PDFArray) {
        const items = [];
        for (let i = 0; i < w.size(); i++) items.push(resolve(this.ctx, w.get(i)));
        let i = 0;
        while (i < items.length) {
            const a = items[i];
            const b = items[i + 1];
            if (!(a instanceof PDFNumber)) {
                i++;
                continue;
            }
            const first = a.asNumber();
            if (b instanceof PDFArray) {
                const ws = arrayNumbers(this.ctx, b);
                ws.forEach((wv, k) => this.cidWidths.set(first + k, wv * 0.001));
                i += 2;
            } else if (b instanceof PDFNumber && items[i + 2] instanceof PDFNumber) {
                const last = b.asNumber();
                const wv = (items[i + 2] as PDFNumber).asNumber() * 0.001;
                if (last - first < 70000) for (let c = first; c <= last; c++) this.cidWidths.set(c, wv);
                i += 3;
            } else {
                i++;
            }
        }
    }

    private buildSimpleEncoding(symbolic: boolean): Enc {
        const ctx = this.ctx;
        const encObj = resolve(ctx, this.dict.get(N('Encoding')));
        let base: Enc | null = null;
        let diffs: PDFArray | undefined;
        if (encObj instanceof PDFName) {
            base = ENCODINGS[encObj.decodeText()] ?? null;
        } else if (encObj instanceof PDFDict) {
            const b = getName(ctx, encObj, 'BaseEncoding');
            if (b) base = ENCODINGS[b] ?? null;
            diffs = getArray(ctx, encObj, 'Differences');
        }
        if (!base) {
            const std = this.std14;
            if (std === 'Symbol' || /^symbol/i.test(this.baseFont)) base = SymbolSetEncoding;
            else if (std === 'ZapfDingbats' || /dingbats/i.test(this.baseFont)) base = ZapfDingbatsEncoding;
            else if (this.subtype === 'TrueType' && !symbolic) base = WinAnsiEncoding;
            else if (this.subtype === 'TrueType') base = [];
            else base = StandardEncoding;
        }
        const enc: Enc = base.slice();
        if (diffs) {
            let code = 0;
            for (let i = 0; i < diffs.size(); i++) {
                const v = resolve(ctx, diffs.get(i));
                if (v instanceof PDFNumber) code = v.asNumber();
                else if (v instanceof PDFName) enc[code++] = v.decodeText();
            }
        }
        return enc;
    }

    /** Splits shown-string bytes into glyphs. */
    decode(bytes: Uint8Array): DecodedGlyph[] {
        const out: DecodedGlyph[] = [];
        if (this.isComposite) {
            const cmap = this.cmap!;
            for (const { code, len, start } of cmap.split(bytes, 2)) {
                const cid = cmap.lookupCid(code, len) ?? code;
                let w = this.cidWidths.get(cid);
                if (w === undefined) w = this.defaultCidWidth;
                const unicode = this.toUnicode?.uni.get(CMap.key(len, code)) ?? '';
                out.push({ code, len, start, unicode, width: w, wordSpace: len === 1 && code === 32 });
            }
            return out;
        }
        for (let i = 0; i < bytes.length; i++) {
            const code = bytes[i];
            out.push({
                code,
                len: 1,
                start: i,
                unicode: this.unicodeForSimple(code),
                width: this.widthForSimple(code),
                wordSpace: code === 32,
            });
        }
        return out;
    }

    private widthForSimple(code: number): number {
        const w = this.simpleWidths.get(code);
        if (w !== undefined) return w;
        if (this.std14) {
            const m = stdMetrics(this.std14);
            const g = this.encoding?.[code];
            if (m && g) {
                try {
                    return Number(m.getWidthOfGlyph(g) ?? 0) * 0.001;
                } catch {
                    /* ignore */
                }
            }
        }
        return this.missingWidth;
    }

    private unicodeForSimple(code: number): string {
        const tu = this.toUnicode?.uni.get(CMap.key(1, code));
        if (tu !== undefined) return tu;
        const gname = this.encoding?.[code];
        if (gname) {
            const u = glyphNameToUnicode(gname, this.std14 === 'ZapfDingbats');
            if (u) return u;
        }
        if (this.symbolicTrueType && code >= 32 && code < 127) return String.fromCharCode(code);
        if (!this.encoding?.length && code >= 32 && code < 127) return String.fromCharCode(code);
        return '';
    }

    /** True when we can decode and re-encode this font's text reliably. */
    get editable(): boolean {
        return !this.unsupported && !this.isVertical && !this.isType3;
    }

    private buildReverse() {
        const rev = new Map<string, { code: number; len: number; width: number }>();
        const consider = (u: string, code: number, len: number, width: number) => {
            if (!u || width <= 0) return;
            const prev = rev.get(u);
            const used = this.usedCodes.has(code);
            if (!prev || (used && !this.usedCodes.has(prev.code))) rev.set(u, { code, len, width });
        };
        if (this.isComposite) {
            if (this.toUnicode && this.cmap) {
                for (const [key, u] of this.toUnicode.uni) {
                    const [lenS, codeS] = key.split(':');
                    const len = +lenS, code = +codeS;
                    const cid = this.cmap.lookupCid(code, len) ?? code;
                    const explicit = this.cidWidths.get(cid);
                    // A subset CID without an explicit width is suspicious unless we saw it drawn.
                    if (explicit === undefined && !this.usedCodes.has(code) && this.isSubset) continue;
                    consider(u, code, len, explicit ?? this.defaultCidWidth);
                }
            }
        } else {
            const trustEncoding = !this.isEmbedded || !this.isSubset;
            for (let code = 0; code < 256; code++) {
                const fromTU = this.toUnicode?.uni.get(CMap.key(1, code));
                const u = fromTU ?? this.unicodeForSimple(code);
                if (!u) continue;
                const available =
                    this.usedCodes.has(code) ||
                    (fromTU !== undefined && this.isSubset) ||
                    (trustEncoding && (this.simpleWidths.has(code) || !!this.std14));
                if (!available) continue;
                consider(u, code, 1, this.widthForSimple(code));
            }
        }
        this.reverse = rev;
    }

    /** Invalidate the reverse map after new used codes were recorded. */
    resetReverse() {
        this.reverse = null;
    }

    /**
     * Encodes one grapheme with this font, or returns null when the font program
     * cannot show it (subset without that glyph, or an un-invertible encoding).
     */
    encodeChar(ch: string): EncodedPiece | null {
        if (!this.editable) return null;
        if (!this.reverse) this.buildReverse();
        const hit = this.reverse!.get(ch);
        if (!hit) return null;
        const bytes: number[] = [];
        for (let k = hit.len - 1; k >= 0; k--) bytes.push((hit.code >> (8 * k)) & 0xff);
        return { bytes, width: hit.width };
    }

    /** Human-friendly family label, e.g. "Times New Roman". */
    get displayName(): string {
        return this.baseFont
            .replace(/[-,](Bold|Italic|Oblique|Regular|BoldItalic|BoldOblique|Roman)+(MT)?$/i, '')
            .replace(/(PS)?MT$/, '')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/[_-]+/g, ' ')
            .trim();
    }

    /** CSS font stack that looks close to this font while the user is typing. */
    get cssFamily(): string {
        const n = this.baseFont.toLowerCase();
        const q = (s: string) => `'${s}'`;
        const stacks: [RegExp, string][] = [
            [/timesnewroman|times/, `${q('Times New Roman')}, Tinos, Times, serif`],
            [/arial|helvetica/, `Arial, Helvetica, Arimo, sans-serif`],
            [/calibri/, `Calibri, Carlito, ${q('Segoe UI')}, sans-serif`],
            [/cambria/, `Cambria, Caladea, Georgia, serif`],
            [/verdana/, `Verdana, sans-serif`],
            [/tahoma/, `Tahoma, Verdana, sans-serif`],
            [/georgia/, `Georgia, serif`],
            [/garamond/, `Garamond, ${q('EB Garamond')}, serif`],
            [/couriernew|courier/, `${q('Courier New')}, Courier, monospace`],
            [/segoe/, `${q('Segoe UI')}, sans-serif`],
            [/mangal|nirmala|devanagari|kokila|aparajita|utsaah|kruti|shusha/, `${q('Panna Noto Devanagari')}, Mangal, ${q('Nirmala UI')}, sans-serif`],
            [/cmr|lmroman|computermodern|nimbusrom/, `${q('Latin Modern Roman')}, ${q('CMU Serif')}, ${q('Times New Roman')}, serif`],
        ];
        for (const [re, stack] of stacks) if (re.test(n)) return stack;
        return this.fontClass === 'serif' ? `${q('Times New Roman')}, serif` : this.fontClass === 'mono' ? `${q('Courier New')}, monospace` : `Arial, sans-serif`;
    }
}

/** Per-document cache so every page shares one FontInfo per font object. */
export class FontCache {
    private byRef = new Map<string, FontInfo>();
    private direct = new Map<PDFDict, FontInfo>();
    constructor(
        private readonly ctx: PDFContext,
        /** Shared glyph-usage table (see FontInfo.usedCodes). */
        readonly usage: Map<string, Set<number>> = new Map(),
    ) {}

    get(obj: PDFRef | PDFDict): FontInfo | null {
        if (obj instanceof PDFRef) {
            const k = obj.toString();
            let f = this.byRef.get(k);
            if (!f) {
                const d = this.ctx.lookup(obj);
                if (!(d instanceof PDFDict)) return null;
                f = new FontInfo(this.ctx, d, obj, this.usage);
                this.byRef.set(k, f);
            }
            return f;
        }
        let f = this.direct.get(obj);
        if (!f) {
            f = new FontInfo(this.ctx, obj, null, this.usage);
            this.direct.set(obj, f);
        }
        return f;
    }

    all(): FontInfo[] {
        return [...this.byRef.values(), ...this.direct.values()];
    }
}
