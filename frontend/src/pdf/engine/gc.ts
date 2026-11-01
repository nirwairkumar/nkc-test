/**
 * Mark-and-sweep over the object graph. pdf-lib writes every object in its
 * context, including content streams we replaced — which would leave "erased"
 * text recoverable from the file. Sweeping unreachable objects makes erasure
 * real and keeps the output small.
 */
import { PDFArray, PDFDict, PDFDocument, PDFObject, PDFRef, PDFStream } from 'pdf-lib';

export function collectGarbage(doc: PDFDocument): number {
    const ctx = doc.context;
    const seen = new Set<string>();
    const stack: PDFObject[] = [];
    const t = ctx.trailerInfo;
    for (const o of [t.Root, t.Info, t.ID]) if (o) stack.push(o);

    while (stack.length) {
        const o = stack.pop()!;
        if (o instanceof PDFRef) {
            if (seen.has(o.tag)) continue;
            seen.add(o.tag);
            const target = ctx.lookup(o);
            if (target) stack.push(target);
        } else if (o instanceof PDFDict) {
            for (const [, v] of o.entries()) stack.push(v);
        } else if (o instanceof PDFArray) {
            for (let i = 0; i < o.size(); i++) stack.push(o.get(i));
        } else if (o instanceof PDFStream) {
            stack.push(o.dict);
        }
    }

    let removed = 0;
    for (const [ref] of ctx.enumerateIndirectObjects()) {
        if (!seen.has(ref.tag)) {
            ctx.delete(ref);
            removed++;
        }
    }
    return removed;
}
