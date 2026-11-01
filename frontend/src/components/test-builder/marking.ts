/**
 * The marking scheme as one visible, named choice.
 *
 * Every test TestoZa created used to be a JEE paper: `negativeMarks` defaulted to 1
 * on every path (builder, AI import, and the backend's own save), so an English
 * composition quiz deducted a mark per wrong answer and the teacher's own trial run
 * came back at minus eighteen. Nobody chose that — they didn't know there was a
 * choice to make. So the choice is now on screen, named, with the total it produces.
 *
 * The scheme is read from the questions, never stored: an AI import that brings +4/−1
 * on every question shows "With negative marking +4 −1"; questions that differ show
 * "Custom". Each question's own marks stay editable either way.
 */

export type MarkingScheme = 'none' | 'negative' | 'custom';

type Marked = { marks?: unknown; negativeMarks?: unknown };

/** A mark as typed: "4", "0.25", "1/3"; anything else is 0. */
export const markValue = (v: unknown): number => {
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

/** The one value every entry shares, or null when they differ (or there are none). */
const shared = (values: number[]): number | null =>
    values.length && values.every(v => v === values[0]) ? values[0] : null;

/** Which scheme the questions currently follow. */
export function detectScheme(questions: Marked[]): MarkingScheme {
    if (!questions.length) return 'none';
    const marks = shared(questions.map(q => markValue(q.marks)));
    const penalty = shared(questions.map(q => markValue(q.negativeMarks)));
    if (marks === null || penalty === null) return 'custom';
    return penalty === 0 ? 'none' : 'negative';
}

/** The totals a teacher needs to sanity-check a paper before they send it. */
export function markingSummary(questions: Marked[]) {
    const total = questions.reduce((sum, q) => sum + markValue(q.marks), 0);
    const penalties = questions.map(q => markValue(q.negativeMarks)).filter(n => n > 0);
    const uniform = penalties.length === questions.length && new Set(penalties).size === 1 ? penalties[0] : null;
    return {
        total: Math.round(total * 100) / 100,
        count: questions.length,
        /** How many questions carry a penalty — 0 means a wrong answer simply scores nothing. */
        penalised: penalties.length,
        /** The single penalty every question shares, when there is one. */
        uniformPenalty: uniform,
        /** The marks every question shares, when they all carry the same. */
        uniformMarks: shared(questions.map(q => markValue(q.marks))),
    };
}

/** "4", "0.25", "0.3333": how a mark is written into a question. */
export const markText = (n: number) => String(Math.round(n * 10000) / 10000);

/** Puts `marks` (null: keep the question's own) and `negative` on one question. */
export function applyMarks<T extends Marked>(q: T, marks: number | null, negative: number): T {
    return { ...q, ...(marks !== null ? { marks: markText(marks) } : {}), negativeMarks: markText(negative) };
}
