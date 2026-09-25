/**
 * Minimal crypto for the PDF Standard Security Handler: MD5, RC4, AES (CBC,
 * with and without padding) and SHA-2 via WebCrypto. WebCrypto alone is not
 * enough: it has no MD5/RC4 and its AES-CBC always enforces PKCS#7 padding,
 * which the R6 key derivation (unpadded AES) cannot use.
 */

// ---------------------------------------------------------------- MD5
const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

export function md5(data: Uint8Array): Uint8Array {
    const len = data.length;
    const padLen = ((len + 8) >>> 6) * 64 + 64;
    const buf = new Uint8Array(padLen);
    buf.set(data);
    buf[len] = 0x80;
    const bits = len * 8;
    const dv = new DataView(buf.buffer);
    dv.setUint32(padLen - 8, bits >>> 0, true);
    dv.setUint32(padLen - 4, Math.floor(bits / 2 ** 32), true);

    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    const M = new Uint32Array(16);
    for (let off = 0; off < padLen; off += 64) {
        for (let i = 0; i < 16; i++) M[i] = dv.getUint32(off + i * 4, true);
        let A = a0, B = b0, C = c0, D = d0;
        for (let i = 0; i < 64; i++) {
            let F: number, g: number;
            if (i < 16) {
                F = (B & C) | (~B & D);
                g = i;
            } else if (i < 32) {
                F = (D & B) | (~D & C);
                g = (5 * i + 1) % 16;
            } else if (i < 48) {
                F = B ^ C ^ D;
                g = (3 * i + 5) % 16;
            } else {
                F = C ^ (B | ~D);
                g = (7 * i) % 16;
            }
            F = (F + A + K[i] + M[g]) >>> 0;
            A = D;
            D = C;
            C = B;
            B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
        }
        a0 = (a0 + A) >>> 0;
        b0 = (b0 + B) >>> 0;
        c0 = (c0 + C) >>> 0;
        d0 = (d0 + D) >>> 0;
    }
    const out = new Uint8Array(16);
    const odv = new DataView(out.buffer);
    [a0, b0, c0, d0].forEach((v, i) => odv.setUint32(i * 4, v, true));
    return out;
}

// ---------------------------------------------------------------- RC4
export function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
    const s = new Uint8Array(256);
    for (let i = 0; i < 256; i++) s[i] = i;
    for (let i = 0, j = 0; i < 256; i++) {
        j = (j + s[i] + key[i % key.length]) & 0xff;
        [s[i], s[j]] = [s[j], s[i]];
    }
    const out = new Uint8Array(data.length);
    for (let k = 0, i = 0, j = 0; k < data.length; k++) {
        i = (i + 1) & 0xff;
        j = (j + s[i]) & 0xff;
        [s[i], s[j]] = [s[j], s[i]];
        out[k] = data[k] ^ s[(s[i] + s[j]) & 0xff];
    }
    return out;
}

// ---------------------------------------------------------------- AES
const SBOX = new Uint8Array(256);
const INV = new Uint8Array(256);
(() => {
    let p = 1, q = 1;
    do {
        p = p ^ ((p << 1) & 0xff) ^ (p & 0x80 ? 0x1b : 0);
        q ^= q << 1;
        q ^= q << 2;
        q ^= q << 4;
        q &= 0xff;
        if (q & 0x80) q ^= 0x09;
        const x = q ^ ((q << 1) | (q >> 7)) ^ ((q << 2) | (q >> 6)) ^ ((q << 3) | (q >> 5)) ^ ((q << 4) | (q >> 4));
        SBOX[p] = (x ^ 0x63) & 0xff;
    } while (p !== 1);
    SBOX[0] = 0x63;
    for (let i = 0; i < 256; i++) INV[SBOX[i]] = i;
})();

const xt = (a: number) => ((a << 1) ^ (a & 0x80 ? 0x1b : 0)) & 0xff;
const mul = (a: number, b: number) => {
    let r = 0;
    while (b) {
        if (b & 1) r ^= a;
        a = xt(a);
        b >>= 1;
    }
    return r;
};

function expandKey(key: Uint8Array): Uint8Array[] {
    const nk = key.length / 4;
    const nr = nk + 6;
    const w = new Uint8Array(16 * (nr + 1));
    w.set(key);
    let rcon = 1;
    for (let i = nk; i < 4 * (nr + 1); i++) {
        let t = w.slice((i - 1) * 4, i * 4);
        if (i % nk === 0) {
            t = Uint8Array.of(SBOX[t[1]] ^ rcon, SBOX[t[2]], SBOX[t[3]], SBOX[t[0]]);
            rcon = xt(rcon);
        } else if (nk > 6 && i % nk === 4) {
            t = t.map((b) => SBOX[b]);
        }
        for (let k = 0; k < 4; k++) w[i * 4 + k] = w[(i - nk) * 4 + k] ^ t[k];
    }
    return Array.from({ length: nr + 1 }, (_, r) => w.slice(r * 16, r * 16 + 16));
}

function encryptBlock(rk: Uint8Array[], input: Uint8Array): Uint8Array {
    const s = input.map((b, i) => b ^ rk[0][i]);
    const nr = rk.length - 1;
    for (let r = 1; r <= nr; r++) {
        // SubBytes + ShiftRows
        const t = new Uint8Array(16);
        for (let c = 0; c < 4; c++) for (let row = 0; row < 4; row++) t[c * 4 + row] = SBOX[s[((c + row) % 4) * 4 + row]];
        if (r !== nr) {
            for (let c = 0; c < 4; c++) {
                const a = t.slice(c * 4, c * 4 + 4);
                t[c * 4] = xt(a[0]) ^ (xt(a[1]) ^ a[1]) ^ a[2] ^ a[3];
                t[c * 4 + 1] = a[0] ^ xt(a[1]) ^ (xt(a[2]) ^ a[2]) ^ a[3];
                t[c * 4 + 2] = a[0] ^ a[1] ^ xt(a[2]) ^ (xt(a[3]) ^ a[3]);
                t[c * 4 + 3] = (xt(a[0]) ^ a[0]) ^ a[1] ^ a[2] ^ xt(a[3]);
            }
        }
        for (let i = 0; i < 16; i++) s[i] = t[i] ^ rk[r][i];
    }
    return s;
}

function decryptBlock(rk: Uint8Array[], input: Uint8Array): Uint8Array {
    const nr = rk.length - 1;
    const s = input.map((b, i) => b ^ rk[nr][i]);
    for (let r = nr - 1; r >= 0; r--) {
        // InvShiftRows + InvSubBytes
        const t = new Uint8Array(16);
        for (let c = 0; c < 4; c++) for (let row = 0; row < 4; row++) t[((c + row) % 4) * 4 + row] = INV[s[c * 4 + row]];
        for (let i = 0; i < 16; i++) t[i] ^= rk[r][i];
        if (r !== 0) {
            for (let c = 0; c < 4; c++) {
                const a = t.slice(c * 4, c * 4 + 4);
                t[c * 4] = mul(a[0], 14) ^ mul(a[1], 11) ^ mul(a[2], 13) ^ mul(a[3], 9);
                t[c * 4 + 1] = mul(a[0], 9) ^ mul(a[1], 14) ^ mul(a[2], 11) ^ mul(a[3], 13);
                t[c * 4 + 2] = mul(a[0], 13) ^ mul(a[1], 9) ^ mul(a[2], 14) ^ mul(a[3], 11);
                t[c * 4 + 3] = mul(a[0], 11) ^ mul(a[1], 13) ^ mul(a[2], 9) ^ mul(a[3], 14);
            }
        }
        s.set(t);
    }
    return s;
}

/** AES-CBC decrypt. `data` = IV (16 bytes) + ciphertext unless `iv` is given. */
export function aesCbcDecrypt(key: Uint8Array, data: Uint8Array, opts: { iv?: Uint8Array; padding: boolean }): Uint8Array {
    const rk = expandKey(key);
    let iv = opts.iv ?? data.subarray(0, 16);
    const body = opts.iv ? data : data.subarray(16);
    const n = Math.floor(body.length / 16) * 16;
    const out = new Uint8Array(n);
    for (let off = 0; off < n; off += 16) {
        const block = body.subarray(off, off + 16);
        const d = decryptBlock(rk, block);
        for (let i = 0; i < 16; i++) out[off + i] = d[i] ^ iv[i];
        iv = block;
    }
    if (!opts.padding || !n) return out;
    const pad = out[n - 1];
    return pad >= 1 && pad <= 16 ? out.subarray(0, n - pad) : out;
}

/** AES-CBC encrypt without padding (input length must be a multiple of 16). */
export function aesCbcEncryptNoPad(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
    const rk = expandKey(key);
    const out = new Uint8Array(data.length);
    let prev = iv;
    for (let off = 0; off < data.length; off += 16) {
        const x = data.subarray(off, off + 16).map((b, i) => b ^ prev[i]);
        prev = encryptBlock(rk, x);
        out.set(prev, off);
    }
    return out;
}

/**
 * AES-CBC decrypt (IV-prefixed data, PKCS#7 padding) using native WebCrypto;
 * falls back to the JS implementation when the padding is malformed, which
 * some PDF writers produce.
 */
export async function aesCbcDecryptFast(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
    if (data.length < 32 || data.length % 16 !== 0 || !globalThis.crypto?.subtle) return aesCbcDecrypt(key, data, { padding: true });
    try {
        const k = await crypto.subtle.importKey('raw', key as unknown as ArrayBuffer, 'AES-CBC', false, ['decrypt']);
        const out = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: data.subarray(0, 16) as unknown as ArrayBuffer }, k, data.subarray(16) as unknown as ArrayBuffer);
        return new Uint8Array(out);
    } catch {
        return aesCbcDecrypt(key, data, { padding: true });
    }
}

// ---------------------------------------------------------------- SHA-2
export async function sha(bits: 256 | 384 | 512, data: Uint8Array): Promise<Uint8Array> {
    const buf = await crypto.subtle.digest(`SHA-${bits}`, data as unknown as ArrayBuffer);
    return new Uint8Array(buf);
}

export function concat(...parts: Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
    let o = 0;
    for (const p of parts) {
        out.set(p, o);
        o += p.length;
    }
    return out;
}
