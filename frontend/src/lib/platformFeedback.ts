/**
 * Feedback about TestoZa itself: the sidebar's Feedback page (pages/FeedbackPage.tsx) and
 * the card that comes up after a creator stops a live exam (components/feedback/FeedbackDock.tsx).
 *
 * Both show the same card and share one draft, so words written in the pop-up are still
 * there when the creator opens Feedback from the menu. Backend: POST /support/platform-feedback,
 * read in admin → Support → Feedback.
 */
import { useSyncExternalStore } from 'react';
import apiClient from '@/lib/apiClient';

export type FeedbackPart = 'ai' | 'conduct' | 'other';
export type FeedbackDraft = Record<FeedbackPart, string>;

/** In the order the card shows them. The keys stay as stored (`conduct` = Online exam). */
export const FEEDBACK_PARTS: { key: FeedbackPart; name: string; placeholder: string }[] = [
    { key: 'conduct', name: 'Online exam', placeholder: 'How did the exam go?' },
    { key: 'ai', name: 'Generate with AI', placeholder: 'What worked, what didn’t' },
    { key: 'other', name: 'Other', placeholder: 'Anything else' },
];

/** The pop-up after stopping an exam asks again only after this long once feedback is sent. */
const ASK_AGAIN_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

const DRAFT_KEY = 'tz_feedback_draft';
const SENT_AT_KEY = 'tz_feedback_sent_at';
const EMPTY: FeedbackDraft = { ai: '', conduct: '', other: '' };

// ── Shared draft ──────────────────────────────────────────────────────────────

let draft: FeedbackDraft = (() => {
    try {
        const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
        return saved && typeof saved === 'object' ? { ...EMPTY, ...saved } : EMPTY;
    } catch {
        return EMPTY;
    }
})();
const listeners = new Set<() => void>();

function setDraft(next: FeedbackDraft) {
    draft = next;
    try {
        if (hasText(next)) localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
        else localStorage.removeItem(DRAFT_KEY);
    } catch { /* private mode: the draft lives for this tab only */ }
    listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
};

export const hasText = (d: FeedbackDraft) => FEEDBACK_PARTS.some((p) => d[p.key].trim() !== '');

/** The shared draft and its setters. */
export function useFeedbackDraft() {
    const value = useSyncExternalStore(subscribe, () => draft);
    return {
        draft: value,
        setPart: (key: FeedbackPart, text: string) => setDraft({ ...draft, [key]: text }),
        clear: () => setDraft(EMPTY),
    };
}

// ── Sending ───────────────────────────────────────────────────────────────────

export interface FeedbackOrigin {
    source: 'sidebar' | 'exam_ended';
    examId?: string;
    examTitle?: string;
}

export async function sendPlatformFeedback(d: FeedbackDraft, origin: FeedbackOrigin) {
    await apiClient.post('/support/platform-feedback', {
        ai: d.ai.trim() || null,
        conduct: d.conduct.trim() || null,
        other: d.other.trim() || null,
        source: origin.source,
        exam_id: origin.examId ?? null,
        exam_title: origin.examTitle ?? null,
        context: {
            from: window.location.pathname,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
        },
    });
    try { localStorage.setItem(SENT_AT_KEY, String(Date.now())); } catch { /* ignore */ }
}

// ── The pop-up after stopping an exam ─────────────────────────────────────────

/** Fired to open the pop-up; FeedbackDock (mounted in Layout) listens. */
export const ASK_FEEDBACK_EVENT = 'tz:ask-feedback';
/** Fired when the minimised pop-up reaches the menu, so the Feedback item can take it in. */
export const FEEDBACK_LANDED_EVENT = 'tz:feedback-landed';

export interface AskFeedbackDetail {
    examId?: string;
    examTitle?: string;
}

/** Call after a creator stops a live exam. Quiet for a week after they last sent feedback. */
export function askForFeedback(detail: AskFeedbackDetail = {}) {
    try {
        const sentAt = Number(localStorage.getItem(SENT_AT_KEY) || 0);
        if (sentAt && Date.now() - sentAt < ASK_AGAIN_AFTER_MS) return;
    } catch { /* ask anyway */ }
    // Let the "Exam stopped" toast and the list update land first.
    window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent<AskFeedbackDetail>(ASK_FEEDBACK_EVENT, { detail }));
    }, 650);
}
