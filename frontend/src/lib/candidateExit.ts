/**
 * Candidates who open a test link or a join code stay in a closed loop:
 *   exam / result page --Back--> "Leave?" --Leave--> /join --Back--> off the site.
 * They never land on the homepage, the dashboard or a history page.
 *
 * Browsers can't delete history entries, so "leave" walks back to the first page
 * this tab opened on TestoZa and swaps it for /join. All that's behind it is
 * whatever the candidate came from (WhatsApp, a message, a new tab), so the next
 * Back leaves TestoZa. On a phone that closes the tab or returns to the app.
 */

/** sessionStorage: history.length when this tab first opened a candidate page. */
const ENTRY_KEY = 'tz_candidate_entry';

/** First pages of a test link or join code. */
const ENTRY_PATH = /^\/(test|test-intro|live|join|j|combined-intro)(\/|$)/;

/**
 * Where Back asks before leaving: the exam, the submitted screen and the result.
 * The test intro page isn't here, so Back from it still goes where the candidate
 * came from. Bare /join isn't either: Back from there leaves the site.
 */
const GUARDED_PATH = /^\/(live|join\/.+|results|test-submitted|combined-intro|combined-break)(\/|$)/;

/** Pages a candidate can pass through without stopping being one. */
const CANDIDATE_PATH = /^\/(test|test-intro|join|j|login|auth|auth-error|onboarding|update-password)(\/|$)/;

let leaving = false;

const readEntry = (): number => {
    try { return Number(sessionStorage.getItem(ENTRY_KEY)) || 0; } catch { return 0; }
};

/** Called once at startup: remember where this tab entered, if through a test link or join code. */
export function noteCandidateEntry() {
    try {
        if (!sessionStorage.getItem(ENTRY_KEY) && ENTRY_PATH.test(window.location.pathname)) {
            sessionStorage.setItem(ENTRY_KEY, String(window.history.length));
        }
    } catch { /* storage blocked: no guard */ }
}

export const isCandidateVisit = () => readEntry() > 0;

export const isGuardedPath = (path: string) => GUARDED_PATH.test(path);

/** A candidate who walks into the app proper (dashboard, builder, ...) is no longer one. */
export function forgetCandidateIfLeft(path: string) {
    if (isGuardedPath(path) || CANDIDATE_PATH.test(path)) return;
    try { sessionStorage.removeItem(ENTRY_KEY); } catch { /**/ }
}

export const isLeaving = () => leaving;

/**
 * Go to /join, leaving nothing of TestoZa behind it in this tab's history.
 * Assumes the tab is on the newest history entry, which holds while the guard
 * catches Back and for any in-app navigation.
 */
export function leaveToJoin() {
    if (leaving) return;
    leaving = true;
    const entry = readEntry();
    const steps = entry ? window.history.length - entry : 0;
    let done = false;
    const land = (e?: Event) => {
        e?.stopImmediatePropagation(); // nothing else should react to the jump
        if (done) return;
        done = true;
        window.location.replace('/join');
    };
    if (steps > 0) {
        // Hide the page so nothing flashes while the jump happens.
        document.documentElement.style.visibility = 'hidden';
        window.addEventListener('popstate', land, { once: true, capture: true });
        window.history.go(-steps);
        window.setTimeout(land, 1500); // the jump didn't happen: go from here
    } else {
        land();
    }
}
