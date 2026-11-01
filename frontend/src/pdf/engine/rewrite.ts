/**
 * Removes glyphs from a content stream for real (not a white box on top):
 * each text-showing operator that drew a removed glyph is rebuilt as a TJ
 * where the glyph's bytes are replaced by an equal positioning offset, so
 * everything after it on the line stays exactly where it was. Every other
 * operator is copied byte-for-byte.
 */
import type { GlyphRec } from './interpreter';
import { concatBytes, encodeLatin1, hex, num, type Op, type Operand } from './lexer';

export function rebuildShowOp(op: Op, glyphs: GlyphRec[], remove: Set<string>): string {
    let items: Operand[] = [];
    if (op.op === 'TJ') {
        if (op.args[0]?.t === 'arr') items = op.args[0].v;
    } else {
        const s = op.args[op.args.length - 1];
        if (s && s.t === 'str') items = [s];
    }

    const parts: (string | number)[] = [];
    const pushNum = (n: number) => {
        const last = parts[parts.length - 1];
        if (typeof last === 'number') parts[parts.length - 1] = last + n;
        else parts.push(n);
    };

    items.forEach((item, k) => {
        if (item.t === 'num') {
            pushNum(item.v);
            return;
        }
        if (item.t !== 'str') return;
        const gl = glyphs.filter((g) => g.arrIndex === (op.op === 'TJ' ? k : 0)).sort((a, b) => a.start - b.start);
        if (!gl.some((g) => remove.has(g.key))) {
            parts.push(hex(item.v));
            return;
        }
        let cur: number[] = [];
        const flush = () => {
            if (cur.length) parts.push(hex(Uint8Array.from(cur)));
            cur = [];
        };
        let covered = 0;
        for (const g of gl) {
            covered = Math.max(covered, g.start + g.len);
            if (remove.has(g.key)) {
                flush();
                const k2 = g.fontSize * g.hScale;
                if (k2 !== 0) pushNum((-g.txAdvance * 1000) / k2);
            } else {
                for (const b of item.v.subarray(g.start, g.start + g.len)) cur.push(b);
            }
        }
        // Bytes after the last decoded glyph (malformed tail): keep them.
        for (let i = covered; i < item.v.length; i++) cur.push(item.v[i]);
        flush();
    });

    const arr = '[' + parts.map((p) => (typeof p === 'number' ? num(p) : p)).join(' ') + '] TJ';
    if (op.op === "'") return 'T* ' + arr;
    if (op.op === '"') {
        const aw = op.args[0]?.t === 'num' ? op.args[0].v : 0;
        const ac = op.args[1]?.t === 'num' ? op.args[1].v : 0;
        return `${num(aw)} Tw ${num(ac)} Tc T* ${arr}`;
    }
    return arr;
}

/**
 * Rewrites content bytes: operators in `replace` get the given text, text
 * operators with removed glyphs are rebuilt, everything else is copied.
 */
export function rewriteContent(bytes: Uint8Array, ops: Op[], glyphsByOp: Map<number, GlyphRec[]>, remove: Set<string>, replace: Map<number, string>): Uint8Array {
    const parts: Uint8Array[] = [];
    let pos = 0;
    for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        let text: string | null = replace.get(i) ?? null;
        if (text === null) {
            const gl = glyphsByOp.get(i);
            if (gl && gl.some((g) => remove.has(g.key)) && (op.op === 'Tj' || op.op === 'TJ' || op.op === "'" || op.op === '"')) {
                text = rebuildShowOp(op, gl, remove);
            }
        }
        if (text === null) continue;
        parts.push(bytes.subarray(pos, op.start));
        // Surrounding whitespace keeps the new tokens from fusing with neighbours ("BT" + "T*").
        parts.push(encodeLatin1(' ' + text + '\n'));
        pos = op.end;
    }
    parts.push(bytes.subarray(pos));
    return concatBytes(parts);
}
