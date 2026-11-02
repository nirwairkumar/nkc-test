import { inputFields } from '@/lib/candidateInputs';
import { rememberAttemptReceipt } from '@/lib/testsApi';

/**
 * Who a result belongs to, for the result hub's top bar.
 *
 * - The candidate's first input (Name, Roll No… whatever the creator put first).
 * - The Guest ID: candidates who take an exam without a login get a hidden account
 *   candidate_<12 hex>@guest.testoza.com. Those 12 characters reopen every result taken
 *   that way at /join/result → "Use your Guest ID" (backend routers/join.py).
 * - When it was really submitted (the hub used to print today's date).
 */

/** The 12 characters of candidate_<id>@guest.testoza.com for a guest's user id. */
export function guestIdOf(userId: string | null | undefined): string | null {
    const hex = String(userId || '').replace(/-/g, '').toLowerCase();
    return /^[0-9a-f]{32}$/.test(hex) ? hex.slice(0, 12) : null;
}

/** The candidate's answer to the first candidate input, in the creator's order. */
export function firstCandidateInput(stateData: any): { label: string; value: string } | null {
    const form = stateData?.metadata?.startFormData || stateData?.attempt?.metadata?.startFormData;
    if (!form || typeof form !== 'object') return null;
    const entries = Object.entries(form as Record<string, unknown>)
        .map(([label, value]) => [label, String(value ?? '').trim()] as const)
        .filter(([, value]) => value);
    if (entries.length === 0) return null;
    const order = inputFields(stateData?.test?.settings).map(f => f.label.trim().toLowerCase());
    const first = order
        .map(label => entries.find(([l]) => l.trim().toLowerCase() === label))
        .find(Boolean) || entries[0];
    return { label: first![0], value: first![1] };
}

/** The guest's user id, if this result was taken without a login. */
export function resultGuestId(stateData: any, loggedIn: boolean): string | null {
    if (stateData?.candidateId) return guestIdOf(stateData.candidateId);
    if (loggedIn) return null;
    const testId = stateData?.test?.id;
    if (!testId) return null;
    try {
        return guestIdOf(sessionStorage.getItem(`anon_user_id_${testId}`));
    } catch {
        return null;
    }
}

/** When the attempt was submitted: the saved time, never "now". */
export function submittedAtOf(stateData: any): Date | null {
    const raw = stateData?.submittedAt
        || stateData?.metadata?.submittedAt
        || stateData?.attempt?.metadata?.submittedAt
        || stateData?.attempt?.created_at
        || stateData?.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
}

/** "2 Nov 2026, 3:52 am": one format on phone and desktop. */
export function formatSubmitted(d: Date): string {
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Router state that opens a saved attempt in the result hub (/results). */
export function resultStateFor(attempt: any, test: any, extra: Record<string, any> = {}) {
    const meta = attempt?.metadata || {};
    const times = meta.question_times || meta.time_spent_per_question || {};
    // Proof of submission for the answer key, for a candidate without a login on this device.
    rememberAttemptReceipt(test?.id, attempt?.id);
    return {
        test,
        answers: attempt?.answers || {},
        score: attempt?.score,
        metadata: meta,
        questionTimes: times,
        timeSpentPerQuestion: times,
        timeSpent: 0,
        attemptId: attempt?.id,
        submittedAt: meta.submittedAt || attempt?.created_at,
        ...extra,
    };
}
