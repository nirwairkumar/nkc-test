/**
 * Marks for a one-or-more-correct question where the candidate picked some of the
 * correct options and no wrong one. The builder's "Partial marks" setting decides:
 *   - 'proportional' (default): marks × picked ÷ correct options
 *   - 'per_option' (JEE Advanced): +1 for each correct option picked
 * Full marks still need every correct option; any wrong option still costs the
 * negative mark. Mirrors multi_partial_score in backend/app/services/scoring.py.
 */
export type PartialMarking = 'proportional' | 'per_option';

export function multiPartialScore(question: { partialMarking?: unknown }, picked: number, correct: number, marks: number): number {
    if (picked <= 0 || correct <= 0) return 0;
    if (question.partialMarking === 'per_option') return Math.min(picked, marks);
    return (picked / correct) * marks;
}
