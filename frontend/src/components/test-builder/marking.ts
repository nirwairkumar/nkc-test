/**
 * The marking scheme as one visible, named choice.
 *
 * Every test TestoZa created used to be a JEE paper: `negativeMarks` defaulted to 1
 * on every path (builder, AI import, and the backend's own save), so an English
 * composition quiz deducted a mark per wrong answer and the teacher's own trial run
 * came back at minus eighteen. Nobody chose that — they didn't know there was a
 * choice to make. So the choice is now on screen, named, with the total it produces.
 */

export type MarkingScheme = 'none' | 'jee' | 'custom';

const num = (v: unknown): number => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = String(v ?? '').trim();
    if (!s) return 0;
    if (s.includes('/')) {
        const [a, b] = s.split('/');
        const d = parseFloat(b);
        return d ? parseFloat(a) / d : 0;
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
};

/** Which named scheme a list of questions currently matches. */
export function detectScheme(questions: { marks?: unknown; negativeMarks?: unknown }[]): MarkingScheme {
    if (!questions.length) return 'none';
    if (questions.every(q => num(q.negativeMarks) === 0)) return 'none';
    if (questions.every(q => num(q.marks) === 4 && num(q.negativeMarks) === 1)) return 'jee';
    return 'custom';
}

/** The totals a teacher needs to sanity-check a paper before they send it. */
export function markingSummary(questions: { marks?: unknown; negativeMarks?: unknown }[]) {
    const total = questions.reduce((sum, q) => sum + num(q.marks), 0);
    const penalties = questions.map(q => num(q.negativeMarks)).filter(n => n > 0);
    const uniform = penalties.length === questions.length && new Set(penalties).size === 1 ? penalties[0] : null;
    return {
        total: Math.round(total * 100) / 100,
        count: questions.length,
        /** How many questions carry a penalty — 0 means a wrong answer simply scores nothing. */
        penalised: penalties.length,
        /** The single penalty every question shares, when there is one. */
        uniformPenalty: uniform,
    };
}

/** The marks a named scheme puts on one question. 'custom' leaves the question alone. */
export function applyScheme<T extends { marks?: unknown; negativeMarks?: unknown }>(q: T, scheme: MarkingScheme): T {
    if (scheme === 'custom') return q;
    if (scheme === 'none') return { ...q, negativeMarks: '0' };
    return { ...q, marks: '4', negativeMarks: '1' };
}
