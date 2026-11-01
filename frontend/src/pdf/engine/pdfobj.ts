/** Small helpers over pdf-lib's object model (lookups that tolerate bad files). */
import {
    PDFArray,
    PDFBool,
    PDFContext,
    PDFDict,
    PDFHexString,
    PDFName,
    PDFNumber,
    PDFObject,
    PDFRawStream,
    PDFRef,
    PDFStream,
    PDFString,
    decodePDFRawStream,
} from 'pdf-lib';

export const N = (s: string) => PDFName.of(s);

export function resolve(ctx: PDFContext, o: PDFObject | undefined): PDFObject | undefined {
    let cur = o;
    for (let i = 0; i < 8 && cur instanceof PDFRef; i++) cur = ctx.lookup(cur);
    return cur instanceof PDFRef ? undefined : cur;
}

export function getDict(ctx: PDFContext, d: PDFDict | undefined, key: string): PDFDict | undefined {
    const v = d && resolve(ctx, d.get(N(key)));
    if (v instanceof PDFDict) return v;
    if (v instanceof PDFStream) return v.dict;
    return undefined;
}

export function getStream(ctx: PDFContext, d: PDFDict | undefined, key: string): PDFStream | undefined {
    const v = d && resolve(ctx, d.get(N(key)));
    return v instanceof PDFStream ? v : undefined;
}

export function getArray(ctx: PDFContext, d: PDFDict | undefined, key: string): PDFArray | undefined {
    const v = d && resolve(ctx, d.get(N(key)));
    return v instanceof PDFArray ? v : undefined;
}

export function getNumber(ctx: PDFContext, d: PDFDict | undefined, key: string): number | undefined {
    const v = d && resolve(ctx, d.get(N(key)));
    return v instanceof PDFNumber ? v.asNumber() : undefined;
}

export function getName(ctx: PDFContext, d: PDFDict | undefined, key: string): string | undefined {
    const v = d && resolve(ctx, d.get(N(key)));
    return v instanceof PDFName ? v.decodeText() : undefined;
}

export function getBool(ctx: PDFContext, d: PDFDict | undefined, key: string): boolean | undefined {
    const v = d && resolve(ctx, d.get(N(key)));
    return v instanceof PDFBool ? v.asBoolean() : undefined;
}

export function arrayNumbers(ctx: PDFContext, a: PDFArray | undefined): number[] {
    if (!a) return [];
    const out: number[] = [];
    for (let i = 0; i < a.size(); i++) {
        const v = resolve(ctx, a.get(i));
        out.push(v instanceof PDFNumber ? v.asNumber() : 0);
    }
    return out;
}

export function stringBytes(o: PDFObject | undefined): Uint8Array | undefined {
    if (o instanceof PDFHexString) return o.asBytes();
    if (o instanceof PDFString) return o.asBytes();
    return undefined;
}

/** Decoded (unfiltered) bytes of any pdf-lib stream flavour. */
export function streamBytes(s: PDFStream): Uint8Array {
    const anyS = s as unknown as { getUnencodedContents?: () => Uint8Array };
    if (!(s instanceof PDFRawStream) && typeof anyS.getUnencodedContents === 'function') {
        return anyS.getUnencodedContents();
    }
    if (s instanceof PDFRawStream) {
        const filter = s.dict.get(N('Filter'));
        if (!filter) return s.contents;
        return decodePDFRawStream(s).decode();
    }
    return s.getContents();
}

/** Concatenated, decoded page/form content (array of streams joined by newlines). */
export function contentBytes(ctx: PDFContext, contents: PDFObject | undefined): { bytes: Uint8Array; refs: PDFRef[] } {
    const parts: Uint8Array[] = [];
    const refs: PDFRef[] = [];
    const push = (o: PDFObject | undefined) => {
        if (o instanceof PDFRef) refs.push(o);
        const r = resolve(ctx, o);
        if (r instanceof PDFStream) {
            try {
                parts.push(streamBytes(r));
            } catch {
                /* undecodable stream (unsupported filter): skip */
            }
        }
    };
    const c = contents instanceof PDFRef ? ctx.lookup(contents) : contents;
    if (c instanceof PDFArray) {
        for (let i = 0; i < c.size(); i++) push(c.get(i));
    } else {
        push(contents);
    }
    let len = 0;
    for (const p of parts) len += p.length + 1;
    const out = new Uint8Array(len);
    let o = 0;
    for (const p of parts) {
        out.set(p, o);
        o += p.length;
        out[o++] = 0x0a;
    }
    return { bytes: out, refs };
}
