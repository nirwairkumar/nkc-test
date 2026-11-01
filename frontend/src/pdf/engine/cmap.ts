/**
 * CMap parsing for ToUnicode maps and embedded (non-predefined) encoding CMaps.
 * Codes are keyed as `byteLength:value` because the same numeric value can be a
 * different code at a different width (e.g. <20> vs <0020>).
 */
import { Lexer, type Operand } from './lexer';

export interface CodespaceRange {
    len: number;
    lo: number[];
    hi: number[];
}

export class CMap {
    codespace: CodespaceRange[] = [];
    /** code key -> unicode string */
    uni = new Map<string, string>();
    /** code key -> cid (encoding CMaps) */
    cid = new Map<string, number>();
    cidRanges: { len: number; lo: number; hi: number; cid: number }[] = [];
    identity = false;

    static key(len: number, code: number) {
        return len + ':' + code;
    }

    /**
     * Splits a byte string into codes using the codespace ranges. Falls back to
     * `defaultLen`-byte codes when a byte sequence matches no range.
     */
    split(bytes: Uint8Array, defaultLen: number): { code: number; len: number; start: number }[] {
        const out: { code: number; len: number; start: number }[] = [];
        const ranges = this.codespace;
        let i = 0;
        while (i < bytes.length) {
            let matched = 0;
            if (ranges.length) {
                for (let len = 1; len <= 4 && !matched; len++) {
                    if (i + len > bytes.length) break;
                    for (const r of ranges) {
                        if (r.len !== len) continue;
                        let ok = true;
                        for (let k = 0; k < len; k++) {
                            const c = bytes[i + k];
                            if (c < r.lo[k] || c > r.hi[k]) {
                                ok = false;
                                break;
                            }
                        }
                        if (ok) {
                            matched = len;
                            break;
                        }
                    }
                }
            }
            const len = matched || Math.min(defaultLen, bytes.length - i);
            let code = 0;
            for (let k = 0; k < len; k++) code = code * 256 + bytes[i + k];
            out.push({ code, len, start: i });
            i += len;
        }
        return out;
    }

    lookupCid(code: number, len: number): number | undefined {
        if (this.identity) return code;
        const direct = this.cid.get(CMap.key(len, code));
        if (direct !== undefined) return direct;
        for (const r of this.cidRanges) {
            if (r.len === len && code >= r.lo && code <= r.hi) return r.cid + (code - r.lo);
        }
        return undefined;
    }
}

const bytesToNum = (b: Uint8Array) => {
    let v = 0;
    for (let i = 0; i < b.length; i++) v = v * 256 + b[i];
    return v;
};

/** UTF-16BE bytes -> JS string (handles surrogate pairs naturally). */
export function utf16be(b: Uint8Array): string {
    let s = '';
    for (let i = 0; i + 1 < b.length; i += 2) s += String.fromCharCode((b[i] << 8) | b[i + 1]);
    if (b.length % 2 === 1) s += String.fromCharCode(b[b.length - 1]);
    return s;
}

/** Adds `delta` to the last UTF-16 code unit of a bfrange destination. */
function incrementUtf16(b: Uint8Array, delta: number): string {
    const copy = Uint8Array.from(b);
    let carry = delta;
    for (let i = copy.length - 1; i >= 0 && carry; i--) {
        const v = copy[i] + carry;
        copy[i] = v & 0xff;
        carry = v >> 8;
    }
    return utf16be(copy);
}

export function parseCMap(bytes: Uint8Array): CMap {
    const cmap = new CMap();
    const lx = new Lexer(bytes);
    const stack: Operand[] = [];

    const readN = (n: number) => stack.splice(Math.max(0, stack.length - n), n);

    for (;;) {
        const t = lx.next();
        if (t.k === 'eof') break;
        if (t.k !== 'kw') {
            if (t.k === 'arrClose' || t.k === 'dictClose') continue;
            const o = lx.readObject(t);
            if (o) stack.push(o);
            if (stack.length > 4096) stack.splice(0, 2048);
            continue;
        }
        switch (t.v) {
            case 'usecmap': {
                const [n] = readN(1);
                if (n && n.t === 'name' && /^Identity-[HV]$/.test(n.v)) {
                    cmap.identity = true;
                    cmap.codespace.push({ len: 2, lo: [0, 0], hi: [255, 255] });
                }
                break;
            }
            case 'begincodespacerange':
            case 'beginbfchar':
            case 'beginbfrange':
            case 'begincidchar':
            case 'begincidrange':
            case 'beginnotdefrange':
                stack.length = 0;
                break;
            case 'endcodespacerange': {
                for (let i = 0; i + 1 < stack.length; i += 2) {
                    const lo = stack[i], hi = stack[i + 1];
                    if (lo.t === 'str' && hi.t === 'str') {
                        cmap.codespace.push({ len: lo.v.length, lo: [...lo.v], hi: [...hi.v] });
                    }
                }
                stack.length = 0;
                break;
            }
            case 'endbfchar': {
                for (let i = 0; i + 1 < stack.length; i += 2) {
                    const src = stack[i], dst = stack[i + 1];
                    if (src.t !== 'str') continue;
                    const k = CMap.key(src.v.length, bytesToNum(src.v));
                    if (dst.t === 'str') cmap.uni.set(k, utf16be(dst.v));
                    else if (dst.t === 'name') cmap.uni.set(k, dst.v);
                }
                stack.length = 0;
                break;
            }
            case 'endbfrange': {
                for (let i = 0; i + 2 < stack.length; i += 3) {
                    const lo = stack[i], hi = stack[i + 1], dst = stack[i + 2];
                    if (lo.t !== 'str' || hi.t !== 'str') continue;
                    const len = lo.v.length;
                    const a = bytesToNum(lo.v), z = bytesToNum(hi.v);
                    if (z < a || z - a > 65535) continue;
                    if (dst.t === 'str') {
                        for (let c = a; c <= z; c++) cmap.uni.set(CMap.key(len, c), incrementUtf16(dst.v, c - a));
                    } else if (dst.t === 'arr') {
                        dst.v.forEach((d, j) => {
                            if (d.t === 'str' && a + j <= z) cmap.uni.set(CMap.key(len, a + j), utf16be(d.v));
                        });
                    }
                }
                stack.length = 0;
                break;
            }
            case 'endcidchar': {
                for (let i = 0; i + 1 < stack.length; i += 2) {
                    const src = stack[i], dst = stack[i + 1];
                    if (src.t === 'str' && dst.t === 'num') cmap.cid.set(CMap.key(src.v.length, bytesToNum(src.v)), dst.v);
                }
                stack.length = 0;
                break;
            }
            case 'endcidrange': {
                for (let i = 0; i + 2 < stack.length; i += 3) {
                    const lo = stack[i], hi = stack[i + 1], dst = stack[i + 2];
                    if (lo.t === 'str' && hi.t === 'str' && dst.t === 'num') {
                        cmap.cidRanges.push({ len: lo.v.length, lo: bytesToNum(lo.v), hi: bytesToNum(hi.v), cid: dst.v });
                    }
                }
                stack.length = 0;
                break;
            }
            default:
                // def, begincmap, CMapName, etc. — irrelevant, keep stack bounded
                if (t.v === 'def' || t.v === 'begincmap' || t.v === 'endcmap') stack.length = 0;
        }
    }
    return cmap;
}

/** A predefined Identity-H / Identity-V CMap. */
export function identityCMap(): CMap {
    const c = new CMap();
    c.identity = true;
    c.codespace.push({ len: 2, lo: [0, 0], hi: [255, 255] });
    return c;
}
