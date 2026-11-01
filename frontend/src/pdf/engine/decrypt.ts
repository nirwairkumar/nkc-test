/**
 * PDF Standard Security Handler (PDF 32000-1 §7.6.3, ISO 32000-2 for R6).
 *
 * pdf-lib cannot read encrypted files; it loads them with `ignoreEncryption`
 * leaving strings and streams encrypted, and object streams unparsed. This
 * module derives the file key (empty user password, the user password, or the
 * owner password) and decrypts the loaded document in place.
 */
import {
    PDFArray,
    PDFDict,
    PDFDocument,
    PDFHexString,
    PDFInvalidObject,
    PDFName,
    PDFObject,
    PDFObjectParser,
    PDFObjectStreamParser,
    PDFRawStream,
    PDFRef,
    PDFStream,
    PDFString,
} from 'pdf-lib';
import { aesCbcDecrypt, aesCbcDecryptFast, aesCbcEncryptNoPad, concat, md5, rc4, sha } from './crypto';
import { N, getBool, getDict, getName, getNumber, resolve, stringBytes } from './pdfobj';

export class PasswordError extends Error {
    constructor(readonly wrongPassword: boolean) {
        super(wrongPassword ? 'Incorrect password' : 'Password required');
        this.name = 'PasswordError';
    }
}

const PAD = Uint8Array.from([
    0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
    0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

const padPassword = (pw: Uint8Array) => {
    const out = new Uint8Array(32);
    out.set(pw.subarray(0, 32));
    out.set(PAD.subarray(0, 32 - Math.min(32, pw.length)), Math.min(32, pw.length));
    return out;
};

type Method = 'rc4' | 'aes' | 'identity';

export interface Decryptor {
    key: Uint8Array;
    revision: number;
    stmMethod: Method;
    strMethod: Method;
    encryptMetadata: boolean;
    /** Opened without the owner password and the author disallowed modification. */
    restricted: boolean;
}

function cryptMethod(doc: PDFDocument, enc: PDFDict, filterName: string | undefined, v: number): Method {
    if (v < 4) return 'rc4';
    if (!filterName || filterName === 'Identity') return 'identity';
    const cf = getDict(doc.context, enc, 'CF');
    const f = cf && getDict(doc.context, cf, filterName);
    const cfm = getName(doc.context, f, 'CFM');
    if (cfm === 'AESV2' || cfm === 'AESV3') return 'aes';
    if (cfm === 'None') return 'identity';
    return 'rc4';
}

async function hash2B(password: Uint8Array, salt: Uint8Array, userKey: Uint8Array): Promise<Uint8Array> {
    let k = await sha(256, concat(password, salt, userKey));
    for (let i = 0; ; i++) {
        const k1 = concat(password, k, userKey);
        const rep = new Uint8Array(k1.length * 64);
        for (let j = 0; j < 64; j++) rep.set(k1, j * k1.length);
        const e = aesCbcEncryptNoPad(k.subarray(0, 16), k.subarray(16, 32), rep);
        let sum = 0;
        for (let j = 0; j < 16; j++) sum += e[j];
        const mod = sum % 3;
        k = await sha(mod === 0 ? 256 : mod === 1 ? 384 : 512, e);
        if (i >= 63 && e[e.length - 1] <= i - 32) break;
    }
    return k.subarray(0, 32);
}

const eq = (a: Uint8Array, b: Uint8Array, n = Math.min(a.length, b.length)) => {
    for (let i = 0; i < n; i++) if (a[i] !== b[i]) return false;
    return true;
};

/** Derives the file key; throws PasswordError when the password is needed/wrong. */
export async function makeDecryptor(doc: PDFDocument, password = ''): Promise<Decryptor | null> {
    const ctx = doc.context;
    const encObj = resolve(ctx, ctx.trailerInfo.Encrypt as PDFObject | undefined);
    if (!(encObj instanceof PDFDict)) return null;
    const filter = getName(ctx, encObj, 'Filter');
    if (filter && filter !== 'Standard') throw new Error(`Unsupported security handler: ${filter}`);

    const v = getNumber(ctx, encObj, 'V') ?? 0;
    const r = getNumber(ctx, encObj, 'R') ?? 2;
    const O = stringBytes(encObj.get(N('O'))) ?? new Uint8Array();
    const U = stringBytes(encObj.get(N('U'))) ?? new Uint8Array();
    const P = getNumber(ctx, encObj, 'P') ?? 0;
    const encryptMetadata = getBool(ctx, encObj, 'EncryptMetadata') ?? true;
    const idArr = resolve(ctx, ctx.trailerInfo.ID as PDFObject | undefined);
    const id0 = idArr instanceof PDFArray ? (stringBytes(resolve(ctx, idArr.get(0))) ?? new Uint8Array()) : new Uint8Array();
    const pw = new TextEncoder().encode(password);

    const stmMethod = cryptMethod(doc, encObj, getName(ctx, encObj, 'StmF'), v);
    const strMethod = cryptMethod(doc, encObj, getName(ctx, encObj, 'StrF'), v);
    // Editing allowed only when bit 4 (modify) of P is set.
    const modifyAllowed = (P & 0x8) !== 0;

    if (r >= 5) {
        const pwTrunc = pw.subarray(0, 127);
        const hashFn = async (p: Uint8Array, salt: Uint8Array, uk: Uint8Array) =>
            r === 5 ? (await sha(256, concat(p, salt, uk))).subarray(0, 32) : hash2B(p, salt, uk);
        const uHash = U.subarray(0, 32), uVal = U.subarray(32, 40), uKeySalt = U.subarray(40, 48);
        const oHash = O.subarray(0, 32), oVal = O.subarray(32, 40), oKeySalt = O.subarray(40, 48);
        const UE = stringBytes(encObj.get(N('UE'))) ?? new Uint8Array(32);
        const OE = stringBytes(encObj.get(N('OE'))) ?? new Uint8Array(32);
        const u48 = U.subarray(0, 48);
        let key: Uint8Array | null = null;
        let asOwner = false;
        if (eq(await hashFn(pwTrunc, oVal, u48), oHash, 32)) {
            key = aesCbcDecrypt(await hashFn(pwTrunc, oKeySalt, u48), OE, { iv: new Uint8Array(16), padding: false });
            asOwner = true;
        } else if (eq(await hashFn(pwTrunc, uVal, new Uint8Array()), uHash, 32)) {
            key = aesCbcDecrypt(await hashFn(pwTrunc, uKeySalt, new Uint8Array()), UE, { iv: new Uint8Array(16), padding: false });
        }
        if (!key) throw new PasswordError(password.length > 0);
        return { key, revision: r, stmMethod, strMethod, encryptMetadata, restricted: !asOwner && !modifyAllowed };
    }

    const lengthBits = v === 1 ? 40 : (getNumber(ctx, encObj, 'Length') ?? 40);
    const n = r === 2 ? 5 : Math.max(5, Math.min(16, lengthBits / 8));

    const computeKey = (userPwPadded: Uint8Array) => {
        const p = new Uint8Array(4);
        new DataView(p.buffer).setInt32(0, P, true);
        let h = md5(concat(userPwPadded, O.subarray(0, 32), p, id0, r >= 4 && !encryptMetadata ? Uint8Array.of(255, 255, 255, 255) : new Uint8Array()));
        if (r >= 3) for (let i = 0; i < 50; i++) h = md5(h.subarray(0, n));
        return h.subarray(0, n);
    };
    const checkUser = (key: Uint8Array) => {
        if (r === 2) return eq(rc4(key, PAD), U, 32);
        let x = rc4(key, md5(concat(PAD, id0)));
        for (let i = 1; i <= 19; i++) x = rc4(key.map((b) => b ^ i), x);
        return eq(x, U, 16);
    };

    // 1) as user password
    let key = computeKey(padPassword(pw));
    if (checkUser(key)) return { key, revision: r, stmMethod, strMethod, encryptMetadata, restricted: !modifyAllowed };

    // 2) as owner password: recover the user password from O
    let ok = md5(padPassword(pw));
    if (r >= 3) for (let i = 0; i < 50; i++) ok = md5(ok);
    const okey = ok.subarray(0, n);
    let userPw: Uint8Array;
    if (r === 2) userPw = rc4(okey, O.subarray(0, 32));
    else {
        userPw = O.subarray(0, 32);
        for (let i = 19; i >= 0; i--) userPw = rc4(okey.map((b) => b ^ i), userPw);
    }
    key = computeKey(userPw);
    if (checkUser(key)) return { key, revision: r, stmMethod, strMethod, encryptMetadata, restricted: false };

    throw new PasswordError(password.length > 0);
}

function objectKey(d: Decryptor, ref: PDFRef, aes: boolean): Uint8Array {
    if (d.revision >= 5) return d.key;
    const n = d.key.length;
    const b = new Uint8Array(n + 5 + (aes ? 4 : 0));
    b.set(d.key);
    const num = ref.objectNumber, gen = ref.generationNumber;
    b[n] = num & 0xff;
    b[n + 1] = (num >> 8) & 0xff;
    b[n + 2] = (num >> 16) & 0xff;
    b[n + 3] = gen & 0xff;
    b[n + 4] = (gen >> 8) & 0xff;
    if (aes) b.set([0x73, 0x41, 0x6c, 0x54], n + 5); // "sAlT"
    return md5(b).subarray(0, Math.min(n + 5, 16));
}

function decryptBytes(d: Decryptor, ref: PDFRef, data: Uint8Array, method: Method): Uint8Array {
    if (method === 'identity' || !data.length) return data;
    const key = objectKey(d, ref, method === 'aes');
    if (method === 'aes') return data.length < 16 ? new Uint8Array() : aesCbcDecrypt(key, data, { padding: true });
    return rc4(key, data);
}

/** Streams can be large: AES goes through native WebCrypto. */
async function decryptStream(d: Decryptor, ref: PDFRef, data: Uint8Array): Promise<Uint8Array> {
    if (d.stmMethod !== 'aes') return decryptBytes(d, ref, data, d.stmMethod);
    return aesCbcDecryptFast(objectKey(d, ref, true), data);
}

const toHex = (b: Uint8Array) => {
    let s = '';
    for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0');
    return s;
};

function decryptStrings(d: Decryptor, ref: PDFRef, obj: PDFObject): PDFObject {
    if (obj instanceof PDFString || obj instanceof PDFHexString) {
        return PDFHexString.of(toHex(decryptBytes(d, ref, obj.asBytes(), d.strMethod)));
    }
    if (obj instanceof PDFDict) {
        for (const [k, v] of obj.entries()) {
            const nv = decryptStrings(d, ref, v);
            if (nv !== v) obj.set(k, nv);
        }
    } else if (obj instanceof PDFArray) {
        for (let i = 0; i < obj.size(); i++) {
            const v = obj.get(i);
            const nv = decryptStrings(d, ref, v);
            if (nv !== v) obj.set(i, nv);
        }
    }
    return obj;
}

function isCryptFiltered(s: PDFStream): boolean {
    const f = s.dict.get(N('Filter'));
    const names = f instanceof PDFArray ? f.asArray() : [f];
    return names.some((n) => n instanceof PDFName && n.decodeText() === 'Crypt');
}

/**
 * Decrypts every string and stream in the document, parses object streams that
 * could not be read while encrypted, and removes the /Encrypt entry.
 */
export async function decryptDocument(doc: PDFDocument, d: Decryptor): Promise<void> {
    const ctx = doc.context;
    const encRef = ctx.trailerInfo.Encrypt;
    const encTag = encRef instanceof PDFRef ? encRef.tag : '';
    const objStms: { ref: PDFRef; stream: PDFRawStream; plain: boolean }[] = [];

    for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
        if (ref.tag === encTag) continue;
        if (obj instanceof PDFInvalidObject) {
            // Probably an encrypted object stream pdf-lib could not parse.
            try {
                const parsed = PDFObjectParser.forBytes((obj as unknown as { data: Uint8Array }).data, ctx).parseObject();
                if (parsed instanceof PDFRawStream && getName(ctx, parsed.dict, 'Type') === 'ObjStm') objStms.push({ ref, stream: parsed, plain: false });
            } catch {
                /* leave it */
            }
            continue;
        }
        if (obj instanceof PDFRawStream) {
            const type = getName(ctx, obj.dict, 'Type');
            if (type === 'XRef') continue;
            decryptStrings(d, ref, obj.dict);
            if ((type === 'Metadata' && !d.encryptMetadata) || isCryptFiltered(obj)) continue;
            const plain = await decryptStream(d, ref, obj.contents);
            if (type === 'ObjStm') {
                objStms.push({ ref, stream: PDFRawStream.of(obj.dict, plain), plain: true });
                continue;
            }
            ctx.assign(ref, PDFRawStream.of(obj.dict, plain));
        } else {
            decryptStrings(d, ref, obj);
        }
    }

    // Object streams: decrypt (if still encrypted) and parse their plaintext objects.
    for (const { ref, stream, plain } of objStms) {
        const s = plain ? stream : PDFRawStream.of(stream.dict, await decryptStream(d, ref, stream.contents));
        try {
            await PDFObjectStreamParser.forStream(s).parseIntoContext();
            ctx.delete(ref);
        } catch {
            /* corrupt object stream: skip */
        }
    }

    ctx.trailerInfo.Encrypt = undefined;
}
