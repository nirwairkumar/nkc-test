/** Myers O(ND) diff over arrays of strings (code points). */

export type DiffOp = { op: 'equal' | 'insert' | 'delete'; a: number; b: number; len: number };

export function diff(a: string[], b: string[]): DiffOp[] {
    // Trim common prefix/suffix first — edits are usually small.
    let pre = 0;
    while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
    let suf = 0;
    while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;

    const A = a.slice(pre, a.length - suf);
    const B = b.slice(pre, b.length - suf);
    const mid = core(A, B).map((o) => ({ ...o, a: o.a + pre, b: o.b + pre }));

    const out: DiffOp[] = [];
    if (pre) out.push({ op: 'equal', a: 0, b: 0, len: pre });
    out.push(...mid);
    if (suf) out.push({ op: 'equal', a: a.length - suf, b: b.length - suf, len: suf });
    return merge(out);
}

function core(a: string[], b: string[]): DiffOp[] {
    const n = a.length, m = b.length;
    if (!n && !m) return [];
    if (!n) return [{ op: 'insert', a: 0, b: 0, len: m }];
    if (!m) return [{ op: 'delete', a: 0, b: 0, len: n }];
    // Guard against pathological sizes: fall back to replace-all.
    if (n * m > 4_000_000) return [{ op: 'delete', a: 0, b: 0, len: n }, { op: 'insert', a: n, b: 0, len: m }];

    const max = n + m;
    const off = max;
    const v = new Int32Array(2 * max + 2);
    const trace: Int32Array[] = [];
    let found = false;
    for (let d = 0; d <= max && !found; d++) {
        trace.push(v.slice());
        for (let k = -d; k <= d; k += 2) {
            let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
            let y = x - k;
            while (x < n && y < m && a[x] === b[y]) {
                x++;
                y++;
            }
            v[off + k] = x;
            if (x >= n && y >= m) {
                found = true;
                break;
            }
        }
    }
    // Backtrack
    const ops: DiffOp[] = [];
    let x = n, y = m;
    for (let d = trace.length - 1; d >= 0; d--) {
        const vv = trace[d];
        const k = x - y;
        const prevK = k === -d || (k !== d && vv[off + k - 1] < vv[off + k + 1]) ? k + 1 : k - 1;
        const prevX = vv[off + prevK];
        const prevY = prevX - prevK;
        while (x > prevX && y > prevY) {
            ops.push({ op: 'equal', a: x - 1, b: y - 1, len: 1 });
            x--;
            y--;
        }
        if (d > 0) {
            if (x === prevX) ops.push({ op: 'insert', a: x, b: y - 1, len: 1 });
            else ops.push({ op: 'delete', a: x - 1, b: y, len: 1 });
        }
        x = prevX;
        y = prevY;
    }
    return ops.reverse();
}

function merge(ops: DiffOp[]): DiffOp[] {
    const out: DiffOp[] = [];
    for (const o of ops) {
        const last = out[out.length - 1];
        if (last && last.op === o.op && last.a + (o.op === 'insert' ? 0 : last.len) === o.a && last.b + (o.op === 'delete' ? 0 : last.len) === o.b) {
            last.len += o.len;
        } else out.push({ ...o });
    }
    return out;
}
