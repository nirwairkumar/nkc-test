/**
 * Marks per question and negative marks, as typed in "AI Settings & Constraints".
 *
 * Both are optional. Blank means "read it from the paper" — and if the paper doesn't
 * say, the backend uses +1 and no negative (ai_preview_importer/marking.py). A typed
 * value overrides the paper for every question.
 */

export interface MarkField {
    value: number | null;
    error: string | null;
}

const MAX_MARK = 100;

/** Read one field. Accepts "2", "2.5", "0.25"; blank is fine (= let the AI decide). */
export function readMark(input: string, allowZero: boolean): MarkField {
    const text = input.trim();
    if (!text) return { value: null, error: null };
    if (!/^\d{0,3}(\.\d{1,2})?$/.test(text) || text === '.') {
        return { value: null, error: 'Use a number like 2 or 2.5' };
    }
    const value = Number(text);
    if (!allowZero && value === 0) return { value: null, error: 'Must be more than 0' };
    if (value > MAX_MARK) return { value: null, error: `At most ${MAX_MARK}` };
    return { value, error: null };
}

/** Keep the field to what readMark accepts as the teacher types. */
export const cleanMarkInput = (raw: string) => raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 6);

/** "&marks_per_question=2.5&negative_marks=0.5", with blank fields left out. */
export function markingQuery(marks: number | null, negative: number | null): string {
    let q = '';
    if (marks !== null) q += `&marks_per_question=${encodeURIComponent(String(marks))}`;
    if (negative !== null) q += `&negative_marks=${encodeURIComponent(String(negative))}`;
    return q;
}
