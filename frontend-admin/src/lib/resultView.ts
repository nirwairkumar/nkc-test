/**
 * What a candidate sees on the result page after submitting (test.settings.result_view).
 * The creator picks these in Settings → Results & Timing, under "Result visibility".
 * With every part off, the result page is just the marks row (plus section marks).
 *
 * Backend mirror: result_view_allows / candidate_may_see_key in
 * backend/app/routers/tests/utils.py, which keeps a hidden answer key off the wire.
 */
export interface ResultView {
    /** Each question with the candidate's answer, the correct answer and time spent. */
    solution_key?: boolean;
    /** Time & cognitive matrix and topic analysis. Without the solution key: compact tiles only. */
    time_matrix?: boolean;
    /** "Analysis with AI" chat and the rank predictor. */
    ai_analysis?: boolean;
    /** Stars + a note to the creator; lands in My Tests → Reports & feedback. */
    feedback?: boolean;
    /** Uploaded solutions. Only shown once the creator has uploaded some. */
    solutions?: boolean;
}

export type ResultViewPart = keyof ResultView;

/** The bits of TestSettings these rules read; tests from the API may carry neither. */
type SettingsLike = { result_view?: ResultView | null; attempt_limit?: number | string | null } | null | undefined;

export const RESULT_VIEW_DEFAULTS: Required<ResultView> = {
    solution_key: true,
    time_matrix: true,
    ai_analysis: false,
    feedback: false,
    solutions: true,
};

/** The creator's choice, or the default for tests saved before result_view existed. */
export function resultViewOn(settings: SettingsLike, part: ResultViewPart): boolean {
    const value = settings?.result_view?.[part];
    return typeof value === 'boolean' ? value : RESULT_VIEW_DEFAULTS[part];
}

export function resolveResultView(settings: SettingsLike): Required<ResultView> {
    return {
        solution_key: resultViewOn(settings, 'solution_key'),
        time_matrix: resultViewOn(settings, 'time_matrix'),
        ai_analysis: resultViewOn(settings, 'ai_analysis'),
        feedback: resultViewOn(settings, 'feedback'),
        solutions: resultViewOn(settings, 'solutions'),
    };
}

/** Retake only when the creator left Attempt Limit on Unlimited. */
export function allowsRetake(settings: SettingsLike): boolean {
    return Number(settings?.attempt_limit) !== 1;
}
