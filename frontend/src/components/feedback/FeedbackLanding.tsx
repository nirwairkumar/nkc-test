/**
 * Wraps an icon the minimised feedback pop-up flies into (FeedbackDock): the menu's
 * Feedback item, and the navbar's menu button on phones. The icon gives a small bounce
 * when the card lands, and a sky dot shows while a draft is waiting on the Feedback page.
 */
import React, { useEffect, useRef } from 'react';
import { FEEDBACK_LANDED_EVENT, hasText, useFeedbackDraft } from '@/lib/platformFeedback';

export default function FeedbackLanding({ children, dot = true }: { children: React.ReactNode; dot?: boolean }) {
    const ref = useRef<HTMLSpanElement>(null);
    const { draft } = useFeedbackDraft();

    useEffect(() => {
        const onLanded = () => {
            const el = ref.current;
            if (!el || el.getBoundingClientRect().width === 0) return;
            el.animate(
                [
                    { transform: 'scale(1)' },
                    { transform: 'scale(1.32)', offset: 0.35 },
                    { transform: 'scale(0.92)', offset: 0.7 },
                    { transform: 'scale(1)' },
                ],
                { duration: 520, easing: 'ease-out' },
            );
        };
        window.addEventListener(FEEDBACK_LANDED_EVENT, onLanded);
        return () => window.removeEventListener(FEEDBACK_LANDED_EVENT, onLanded);
    }, []);

    return (
        <span ref={ref} data-feedback-target="" className="relative inline-flex shrink-0">
            {children}
            {dot && hasText(draft) && (
                <span
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-white dark:ring-slate-950"
                    aria-label="Unsent feedback"
                />
            )}
        </span>
    );
}
