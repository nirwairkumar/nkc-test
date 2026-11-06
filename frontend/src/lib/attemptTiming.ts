/**
 * Time taken and rule breaks of a submitted paper, as the results screens show them.
 * (frontend-admin/src/lib/attemptTiming.ts is a copy: change both.)
 */

/** The parts of a user_tests row these read. */
export interface PaperTimes {
    created_at?: string;
    violation_count?: number | null;
    metadata?: {
        startedAt?: string;
        submittedAt?: string;
        time_taken_seconds?: number;
        question_times?: Record<string, number>;
        time_spent_per_question?: Record<string, number>;
        auto_submit_reason?: string;
    } | null;
}

/** Seconds recorded on the questions themselves (TestPage question_times). */
function secondsOnQuestions(meta: PaperTimes['metadata']): number {
    const times = meta?.question_times || meta?.time_spent_per_question;
    if (!times || typeof times !== 'object') return 0;
    return Object.values(times).reduce<number>((sum, v) => sum + (Number(v) > 0 ? Number(v) : 0), 0);
}

/**
 * How long the candidate spent on the paper, in seconds, or null when unknown.
 *
 * Papers saved since 6 Nov 2026 carry `time_taken_seconds` (backend services/attempt_meta.py).
 * Older ones: submittedAt − startedAt, both read from the candidate's own device, so a phone
 * clock set wrong cancels out. (Server created_at minus a device start showed "—" for a phone
 * running fast.) Never less than the seconds recorded on questions: the old auto-submit saved
 * blank papers whose start equalled their submit after minutes of writing.
 */
export function secondsTaken(attempt: PaperTimes | null | undefined): number | null {
    const meta = attempt?.metadata || {};
    let seconds: number | null = null;
    if (Number.isFinite(meta.time_taken_seconds) && meta.time_taken_seconds >= 0) {
        seconds = meta.time_taken_seconds;
    } else {
        const start = Date.parse(meta.startedAt || '');
        const end = Date.parse(meta.submittedAt || attempt?.created_at || '');
        if (!isNaN(start) && !isNaN(end) && end >= start) seconds = Math.round((end - start) / 1000);
    }
    const onQuestions = secondsOnQuestions(meta);
    if (seconds === null) return onQuestions > 0 ? onQuestions : null;
    return Math.max(seconds, onQuestions);
}

/** "4m 12s", "38s", or "—". */
export function formatTaken(seconds: number | null): string {
    if (seconds === null) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

/**
 * Why the exam page submitted the paper itself, or how often the candidate was warned for
 * leaving the exam. Null for a paper with neither.
 */
export function ruleBreakNote(attempt: PaperTimes | null | undefined): string | null {
    const reason = attempt?.metadata?.auto_submit_reason;
    if (reason === 'left_exam_screen') return 'Auto-submitted: left the exam screen';
    if (reason === 'exited_full_screen') return 'Auto-submitted: left full screen';
    const n = Number(attempt?.violation_count) || 0;
    if (n > 0) return n === 1 ? 'Warned once for leaving the exam' : `Warned ${n} times for leaving the exam`;
    return null;
}
