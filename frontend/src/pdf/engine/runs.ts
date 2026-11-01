/**
 * Style runs: words or letters of a text styled apart from the rest of it.
 * A run only lists the fields it changes; everything else is the text's own style.
 * Offsets are UTF-16 units of the text, [start, end).
 */
import type { StyleRun } from './edits';

export type RunStyle = Omit<StyleRun, 'start' | 'end'>;

export const RUN_FIELDS = ['family', 'size', 'color', 'bold', 'italic'] as const;

export function styleOf(r: StyleRun): RunStyle {
    const s: RunStyle = {};
    for (const k of RUN_FIELDS) if (r[k] !== undefined) (s as Record<string, unknown>)[k] = r[k];
    return s;
}

const sameValue = (a: unknown, b: unknown): boolean => {
    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 0.05;
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 0.004);
    return a === b;
};

export const sameStyle = (a: RunStyle, b: RunStyle) => RUN_FIELDS.every((k) => sameValue(a[k], b[k]));

/** Stable key of a style (for grouping characters that look alike). */
export const styleKey = (s: RunStyle) => JSON.stringify(RUN_FIELDS.map((k) => s[k] ?? null));

/** The run covering UTF-16 offset `i`, if any. */
export function runAt(runs: StyleRun[] | undefined, i: number): StyleRun | null {
    if (!runs) return null;
    for (const r of runs) if (i >= r.start && i < r.end) return r;
    return null;
}

/** The text cut into pieces of one style each (null: the text's own style). */
export function segments(length: number, runs: StyleRun[] | undefined): { start: number; end: number; run: StyleRun | null }[] {
    const out: { start: number; end: number; run: StyleRun | null }[] = [];
    let pos = 0;
    for (const r of [...(runs ?? [])].sort((a, b) => a.start - b.start)) {
        const s = Math.max(r.start, pos), e = Math.min(r.end, length);
        if (e <= s) continue;
        if (s > pos) out.push({ start: pos, end: s, run: null });
        out.push({ start: s, end: e, run: r });
        pos = e;
    }
    if (pos < length) out.push({ start: pos, end: length, run: null });
    return out;
}

/**
 * Tidies runs for a text of `length`: clips them to it, drops fields equal to
 * `base` (the whole text's style) and runs left with nothing, merges equal neighbours.
 */
export function normalizeRuns(runs: StyleRun[] | undefined, length: number, base: RunStyle): StyleRun[] {
    const out: StyleRun[] = [];
    for (const seg of segments(length, runs)) {
        if (!seg.run) continue;
        const s = styleOf(seg.run);
        for (const k of RUN_FIELDS) if (s[k] !== undefined && sameValue(s[k], base[k])) delete s[k];
        if (!Object.keys(s).length) continue;
        const prev = out[out.length - 1];
        if (prev && prev.end === seg.start && sameStyle(styleOf(prev), s)) prev.end = seg.end;
        else out.push({ start: seg.start, end: seg.end, ...s });
    }
    return out;
}

/** Gives [start, end) the fields of `patch`, keeping every other style around it. */
export function patchRuns(runs: StyleRun[] | undefined, length: number, start: number, end: number, patch: RunStyle, base: RunStyle): StyleRun[] {
    const cuts = new Set([0, length, start, end]);
    for (const r of runs ?? []) cuts.add(r.start).add(r.end);
    const points = [...cuts].filter((p) => p >= 0 && p <= length).sort((a, b) => a - b);
    const pieces: StyleRun[] = [];
    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        if (b <= a) continue;
        const cur = runAt(runs, a);
        const s = cur ? styleOf(cur) : {};
        if (a >= start && b <= end) Object.assign(s, patch);
        pieces.push({ start: a, end: b, ...s });
    }
    return normalizeRuns(pieces, length, base);
}

/** Removes `fields` from every run (the whole text now sets them). */
export function clearRunFields(runs: StyleRun[] | undefined, fields: readonly (keyof RunStyle)[], length: number, base: RunStyle): StyleRun[] {
    const stripped = (runs ?? []).map((r) => {
        const c = { ...r };
        for (const k of fields) delete c[k];
        return c;
    });
    return normalizeRuns(stripped, length, base);
}

export const sameRuns = (a: StyleRun[] | undefined, b: StyleRun[] | undefined) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
