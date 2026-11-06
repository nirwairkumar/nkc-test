/**
 * "Which test did I just make?"
 *
 * A teacher who has just saved a paper lands on a grid of cards that all look the
 * same, and the one thing they need next — run it — is a tile they have never
 * pressed before. So the builder leaves a one-shot marker here and /my-tests
 * picks it up once: it highlights that card and draws the eye to its "Conduct
 * exam" tile, then clears itself so the page never nags on later visits.
 *
 * Deliberately localStorage and not router state: the hint should survive a reload
 * or a detour through the sidebar without surviving the day.
 */

const KEY = 'testoza_new_test';

/** Long enough to survive a reload or a detour; short enough to never resurface. */
const FRESH_FOR_MS = 10 * 60 * 1000;

/** Called once, by the builder, after a brand-new test is saved. */
export function markTestAsNew(id: string): void {
    if (!id) return;
    try {
        localStorage.setItem(KEY, JSON.stringify({ id, at: Date.now() }));
    } catch {
        /* private mode: the highlight is a nicety, never a requirement */
    }
}

/**
 * The id of the test just created, or null. Reads once and clears, so the
 * highlight fires on the next view of /my-tests and no view after that.
 */
export function takeNewTestId(): string | null {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        localStorage.removeItem(KEY);
        const { id, at } = JSON.parse(raw) as { id?: string; at?: number };
        if (!id || typeof at !== 'number') return null;
        return Date.now() - at <= FRESH_FOR_MS ? id : null;
    } catch {
        return null;
    }
}
