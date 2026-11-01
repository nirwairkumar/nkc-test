/**
 * Whether a candidate's answer to a numerical question is correct. The builder saves
 * either a range ({ min, max }) or, with "Exact value(s)", a comma-separated list
 * ({ exactMatch: true, exactAnswers: "100, 150" }, min and max left at 0).
 * Mirrors score_question in backend/app/services/scoring.py.
 */
export function isNumericalCorrect(correctAnswer: unknown, answer: unknown): boolean {
    const num = parseFloat(String(answer ?? ''));
    if (isNaN(num) || !correctAnswer || typeof correctAnswer !== 'object' || Array.isArray(correctAnswer)) return false;
    const ca = correctAnswer as { min?: unknown; max?: unknown; exactMatch?: unknown; exactAnswers?: unknown };
    if (ca.exactMatch) {
        return String(ca.exactAnswers ?? '')
            .split(',')
            .map((v) => parseFloat(v))
            .some((v) => !isNaN(v) && v === num);
    }
    const min = parseFloat(String(ca.min));
    const max = parseFloat(String(ca.max));
    return !isNaN(min) && !isNaN(max) && num >= min && num <= max;
}
