/**
 * Who a candidate WITHOUT a login is, so every exam they take on the same phone lands
 * under one Guest ID (shown in the result hub; /join/result lists them all).
 *
 * Until 2026-11-02 the browser made a new random id for every test (sessionStorage
 * `anon_user_id_<testId>`), so each exam had its own Guest ID. Now the id is kept on the
 * device (localStorage) and reused, one per candidate name: a shared lab computer used by
 * Riya and then Aman gives them different ids, so their results never mix and the live
 * "writing" list (keyed by test + id) never merges two students. The save turns the id
 * into the hidden account candidate_<12 hex>@guest.testoza.com (backend attempts.py).
 *
 * The per-test sessionStorage key stays: everything during the exam reads it.
 */

const DEVICE_KEY = 'tz_guest_ids_v1';
const NAME_LABELS = new Set(['name', 'fullname', 'studentname', 'candidatename', 'yourname']);

const squash = (s: unknown) => String(s ?? '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}_]+/gu, '');

/** The candidate's name as typed in the candidate inputs ("Riya  Sharma" = "riya sharma"). */
function nameKey(form?: Record<string, unknown> | null): string {
    if (!form || typeof form !== 'object') return '';
    const entries = Object.entries(form).filter(([, v]) => squash(v));
    const named = entries.find(([label]) => NAME_LABELS.has(squash(label)));
    return squash((named || entries[0])?.[1]);
}

/** This device's guest id for this candidate name, made once and then reused. */
export function deviceGuestUserId(form?: Record<string, unknown> | null): string {
    const key = nameKey(form);
    try {
        const ids: Record<string, string> = JSON.parse(localStorage.getItem(DEVICE_KEY) || '{}') || {};
        if (typeof ids[key] === 'string' && ids[key]) return ids[key];
        const id = crypto.randomUUID();
        ids[key] = id;
        localStorage.setItem(DEVICE_KEY, JSON.stringify(ids));
        return id;
    } catch {
        // Private mode / storage blocked: a fresh id, as before.
        return crypto.randomUUID();
    }
}

/** This device's guest id for this name if it has one already; never makes one. */
export function knownGuestUserId(form?: Record<string, unknown> | null): string | null {
    try {
        const ids: Record<string, string> = JSON.parse(localStorage.getItem(DEVICE_KEY) || '{}') || {};
        const id = ids[nameKey(form)];
        return typeof id === 'string' && id ? id : null;
    } catch {
        return null;
    }
}

/** Start of a test: this test's guest id for this tab, from the device's id for this name. */
export function beginGuestAttempt(testId: string, form?: Record<string, unknown> | null): string {
    const id = deviceGuestUserId(form);
    try { sessionStorage.setItem(`anon_user_id_${testId}`, id); } catch { /* blocked */ }
    return id;
}

/** During / at the end of a test: the id it started with, else the device's id. */
export function currentGuestUserId(testId: string): string {
    try {
        const existing = sessionStorage.getItem(`anon_user_id_${testId}`);
        if (existing) return existing;
    } catch { /* blocked */ }
    let form: Record<string, unknown> | null = null;
    try { form = JSON.parse(sessionStorage.getItem(`start_form_${testId}`) || 'null'); } catch { /* none */ }
    return beginGuestAttempt(testId, form);
}
