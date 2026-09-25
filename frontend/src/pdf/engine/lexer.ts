/**
 * PDF content-stream tokenizer.
 *
 * Every operation keeps the byte range it came from, so the writer can splice
 * the stream: untouched operations are copied byte-for-byte and only the
 * operations we actually change are re-serialised. That is what keeps edits
 * safe on files produced by unusual generators — we never round-trip content
 * we do not understand.
 */

export type Operand =
    | { t: 'num'; v: number }
    | { t: 'name'; v: string }
    | { t: 'str'; v: Uint8Array; hex: boolean }
    | { t: 'arr'; v: Operand[] }
    | { t: 'dict'; v: Map<string, Operand> }
    | { t: 'bool'; v: boolean }
    | { t: 'null' };

export interface Op {
    op: string;
    args: Operand[];
    /** Byte offset where this operation (its first operand) starts. */
    start: number;
    /** Byte offset just past the operator keyword (or past EI for inline images). */
    end: number;
}

const WS = new Uint8Array(256);
[0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20].forEach((c) => (WS[c] = 1));
const DELIM = new Uint8Array(256);
[0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b, 0x7d, 0x2f, 0x25].forEach((c) => (DELIM[c] = 1));

const isRegular = (c: number) => !WS[c] && !DELIM[c];

function hexVal(c: number): number {
    if (c >= 0x30 && c <= 0x39) return c - 0x30;
    if (c >= 0x41 && c <= 0x46) return c - 0x37;
    if (c >= 0x61 && c <= 0x66) return c - 0x57;
    return -1;
}

const latin1 = (bytes: Uint8Array, s: number, e: number) => {
    let out = '';
    for (let i = s; i < e; i++) out += String.fromCharCode(bytes[i]);
    return out;
};

type Token =
    | { k: 'operand'; v: Operand; start: number }
    | { k: 'kw'; v: string; start: number; end: number }
    | { k: 'arrOpen' | 'arrClose' | 'dictOpen' | 'dictClose'; start: number }
    | { k: 'eof' };

export class Lexer {
    pos = 0;
    constructor(readonly bytes: Uint8Array) {}

    private skipWs() {
        const b = this.bytes;
        while (this.pos < b.length) {
            const c = b[this.pos];
            if (WS[c]) {
                this.pos++;
            } else if (c === 0x25) {
                // comment to end of line
                while (this.pos < b.length && b[this.pos] !== 0x0a && b[this.pos] !== 0x0d) this.pos++;
            } else break;
        }
    }

    next(): Token {
        this.skipWs();
        const b = this.bytes;
        if (this.pos >= b.length) return { k: 'eof' };
        const start = this.pos;
        const c = b[this.pos];

        if (c === 0x28) return { k: 'operand', v: this.literalString(), start };
        if (c === 0x3c) {
            if (b[this.pos + 1] === 0x3c) {
                this.pos += 2;
                return { k: 'dictOpen', start };
            }
            return { k: 'operand', v: this.hexString(), start };
        }
        if (c === 0x3e) {
            this.pos += b[this.pos + 1] === 0x3e ? 2 : 1;
            return { k: 'dictClose', start };
        }
        if (c === 0x5b) {
            this.pos++;
            return { k: 'arrOpen', start };
        }
        if (c === 0x5d) {
            this.pos++;
            return { k: 'arrClose', start };
        }
        if (c === 0x7b || c === 0x7d || c === 0x29) {
            // Stray PostScript braces / unbalanced paren: skip as a no-op keyword.
            this.pos++;
            return { k: 'kw', v: String.fromCharCode(c), start, end: this.pos };
        }
        if (c === 0x2f) return { k: 'operand', v: this.name(), start };

        // number or keyword
        let e = this.pos;
        while (e < b.length && isRegular(b[e])) e++;
        const word = latin1(b, this.pos, e);
        this.pos = e;
        if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) return { k: 'operand', v: { t: 'num', v: parseFloat(word) }, start };
        // malformed numbers like "--5" or "0.5.3" — treat as numbers leniently when possible
        if (/^[+-]*[\d.]+$/.test(word)) {
            const n = parseFloat(word.replace(/^[+-]+/, (m) => (m.includes('-') ? '-' : '')));
            return { k: 'operand', v: { t: 'num', v: Number.isFinite(n) ? n : 0 }, start };
        }
        if (word === 'true' || word === 'false') return { k: 'operand', v: { t: 'bool', v: word === 'true' }, start };
        if (word === 'null') return { k: 'operand', v: { t: 'null' }, start };
        return { k: 'kw', v: word, start, end: e };
    }

    private name(): Operand {
        const b = this.bytes;
        this.pos++; // '/'
        let out = '';
        while (this.pos < b.length && isRegular(b[this.pos])) {
            const c = b[this.pos];
            if (c === 0x23 && this.pos + 2 < b.length) {
                const h = hexVal(b[this.pos + 1]);
                const l = hexVal(b[this.pos + 2]);
                if (h >= 0 && l >= 0) {
                    out += String.fromCharCode(h * 16 + l);
                    this.pos += 3;
                    continue;
                }
            }
            out += String.fromCharCode(c);
            this.pos++;
        }
        return { t: 'name', v: out };
    }

    private hexString(): Operand {
        const b = this.bytes;
        this.pos++; // '<'
        const out: number[] = [];
        let hi = -1;
        while (this.pos < b.length && b[this.pos] !== 0x3e) {
            const v = hexVal(b[this.pos++]);
            if (v < 0) continue;
            if (hi < 0) hi = v;
            else {
                out.push(hi * 16 + v);
                hi = -1;
            }
        }
        if (hi >= 0) out.push(hi * 16);
        this.pos++; // '>'
        return { t: 'str', v: Uint8Array.from(out), hex: true };
    }

    private literalString(): Operand {
        const b = this.bytes;
        this.pos++; // '('
        const out: number[] = [];
        let depth = 1;
        while (this.pos < b.length) {
            let c = b[this.pos++];
            if (c === 0x28) depth++;
            else if (c === 0x29) {
                if (--depth === 0) break;
            } else if (c === 0x5c) {
                c = b[this.pos++];
                switch (c) {
                    case 0x6e: out.push(0x0a); continue; // n
                    case 0x72: out.push(0x0d); continue; // r
                    case 0x74: out.push(0x09); continue; // t
                    case 0x62: out.push(0x08); continue; // b
                    case 0x66: out.push(0x0c); continue; // f
                    case 0x0d:
                        if (b[this.pos] === 0x0a) this.pos++;
                        continue;
                    case 0x0a:
                        continue;
                    default:
                        if (c >= 0x30 && c <= 0x37) {
                            let v = c - 0x30;
                            for (let k = 0; k < 2 && b[this.pos] >= 0x30 && b[this.pos] <= 0x37; k++) {
                                v = v * 8 + (b[this.pos++] - 0x30);
                            }
                            out.push(v & 0xff);
                            continue;
                        }
                        out.push(c); // \( \) \\ and unknown escapes
                        continue;
                }
            }
            out.push(c);
        }
        return { t: 'str', v: Uint8Array.from(out), hex: false };
    }

    /** Reads a full object (used for array/dict nesting). */
    readObject(first: Token): Operand | null {
        if (first.k === 'operand') return first.v;
        if (first.k === 'arrOpen') {
            const items: Operand[] = [];
            for (;;) {
                const t = this.next();
                if (t.k === 'eof' || t.k === 'arrClose') break;
                if (t.k === 'kw') continue; // tolerate junk inside arrays
                const o = this.readObject(t);
                if (o) items.push(o);
            }
            return { t: 'arr', v: items };
        }
        if (first.k === 'dictOpen') {
            const m = new Map<string, Operand>();
            for (;;) {
                const t = this.next();
                if (t.k === 'eof' || t.k === 'dictClose') break;
                if (t.k === 'operand' && t.v.t === 'name') {
                    const vt = this.next();
                    if (vt.k === 'dictClose' || vt.k === 'eof') break;
                    const val = vt.k === 'kw' ? ({ t: 'name', v: vt.v } as Operand) : this.readObject(vt);
                    if (val) m.set(t.v.v, val);
                }
            }
            return { t: 'dict', v: m };
        }
        return null;
    }
}

/** Parses a content stream into operations with byte ranges. */
export function parseContent(bytes: Uint8Array): Op[] {
    const lx = new Lexer(bytes);
    const ops: Op[] = [];
    let args: Operand[] = [];
    let argStart = -1;

    for (;;) {
        const t = lx.next();
        if (t.k === 'eof') break;
        if (t.k === 'kw') {
            const start = argStart >= 0 ? argStart : t.start;
            if (t.v === 'BI') {
                const end = readInlineImage(lx, bytes);
                ops.push({ op: 'BI', args: [], start, end });
            } else {
                ops.push({ op: t.v, args, start, end: t.end });
            }
            args = [];
            argStart = -1;
            continue;
        }
        if (t.k === 'arrClose' || t.k === 'dictClose') continue;
        if (argStart < 0) argStart = t.start;
        const o = lx.readObject(t);
        if (o) args.push(o);
    }
    return ops;
}

/** Skips an inline image (BI ... ID <data> EI); returns offset past EI. */
function readInlineImage(lx: Lexer, b: Uint8Array): number {
    // Parse key/value pairs up to ID.
    for (;;) {
        const t = lx.next();
        if (t.k === 'eof') return b.length;
        if (t.k === 'kw' && t.v === 'ID') break;
    }
    let p = lx.pos + 1; // single whitespace after ID
    while (p < b.length - 1) {
        if (
            b[p] === 0x45 && b[p + 1] === 0x49 && // "EI"
            (p === 0 || WS[b[p - 1]]) &&
            (p + 2 >= b.length || WS[b[p + 2]] || DELIM[b[p + 2]])
        ) {
            // Confirm the following bytes look like content operators, not binary data.
            let q = p + 2;
            let ok = true;
            for (let k = 0; k < 24 && q < b.length; k++, q++) {
                const c = b[q];
                if (c > 0x7e || (c < 0x20 && !WS[c])) {
                    ok = false;
                    break;
                }
            }
            if (ok) {
                lx.pos = p + 2;
                return p + 2;
            }
        }
        p++;
    }
    lx.pos = b.length;
    return b.length;
}

// ---------------------------------------------------------------------------
// Serialisation helpers (used by the writer for the operations we rewrite)

const fmt = (n: number) => {
    if (!Number.isFinite(n)) return '0';
    const r = Math.round(n * 10000) / 10000;
    return Object.is(r, -0) ? '0' : String(r);
};
export const num = fmt;

export function hex(bytes: Uint8Array): string {
    let s = '<';
    for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
    return s + '>';
}

export const encodeLatin1 = (s: string) => {
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
    return out;
};

export function concatBytes(parts: Uint8Array[]): Uint8Array {
    let len = 0;
    for (const p of parts) len += p.length;
    const out = new Uint8Array(len);
    let o = 0;
    for (const p of parts) {
        out.set(p, o);
        o += p.length;
    }
    return out;
}
