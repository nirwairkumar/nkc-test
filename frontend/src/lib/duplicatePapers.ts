/**
 * Notes on a one-attempt test's results when papers may belong to the same student.
 * (frontend-admin/src/lib/duplicatePapers.ts is a copy: change both.)
 *
 * - Same account, or the same phone and name (same Guest ID): certainly the same student.
 * - Different phones, same details: two students with one name, or one student on two phones.
 *   Papers written at the same time are two students (no note). One written after the other
 *   gets a neutral note and the examiner, who knows the class, decides. Never "submitted
 *   twice": a wrong label next to an innocent student's result is worse than a missed one.
 */

export interface PaperLike {
    id: string;
    user_id?: string | null;
    created_at?: string;
    metadata?: { startedAt?: string; startFormData?: Record<string, unknown> | null } | null;
}

const squash = (s: unknown) => String(s ?? '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}_]+/gu, '');

/** Everything typed on the candidate inputs, so "Riya S, roll 12" ≠ "Riya S, roll 13". */
function detailsKey(p: PaperLike): { key: string; fields: number } {
    const form = p.metadata?.startFormData;
    if (!form || typeof form !== 'object') return { key: '', fields: 0 };
    const parts = Object.entries(form)
        .map(([k, v]) => [squash(k), squash(v)] as const)
        .filter(([, v]) => v)
        .sort(([a], [b]) => a.localeCompare(b));
    return { key: parts.map(([k, v]) => `${k}=${v}`).join('|'), fields: parts.length };
}

function span(p: PaperLike): [number, number] {
    const end = Date.parse(p.created_at || '') || 0;
    const start = Date.parse(p.metadata?.startedAt || '');
    return [Number.isFinite(start) && start <= end ? start : end, end];
}

const overlap = (a: PaperLike, b: PaperLike) => {
    const [as, ae] = span(a);
    const [bs, be] = span(b);
    return as < be && bs < ae;
};

/** paper id → note. Empty unless the test allows one attempt. */
export function duplicateNotes(papers: PaperLike[], oneAttempt: boolean): Map<string, string> {
    const notes = new Map<string, string[]>();
    const add = (id: string, text: string) => notes.set(id, [...(notes.get(id) || []), text]);
    if (oneAttempt) {
        const byUser = new Map<string, PaperLike[]>();
        for (const p of papers) {
            if (p.user_id) byUser.set(p.user_id, [...(byUser.get(p.user_id) || []), p]);
        }
        for (const own of byUser.values()) {
            if (own.length < 2) continue;
            [...own].sort((a, b) => span(a)[1] - span(b)[1])
                .forEach((p, i) => add(p.id, `Paper ${i + 1} of ${own.length} from this student`));
        }

        const byDetails = new Map<string, PaperLike[]>();
        for (const p of papers) {
            const { key } = detailsKey(p);
            if (key) byDetails.set(key, [...(byDetails.get(key) || []), p]);
        }
        for (const same of byDetails.values()) {
            for (const p of same) {
                const later = same.some(o => o.user_id !== p.user_id && !overlap(o, p));
                if (!later) continue;
                add(p.id, detailsKey(p).fields > 1 ? 'Same name and details as another paper' : 'Another paper has this name');
            }
        }
    }
    return new Map([...notes].map(([id, list]) => [id, list.join(' · ')]));
}
