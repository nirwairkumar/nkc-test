/**
 * The feedback pop-up after a creator stops a live exam (askForFeedback in
 * lib/platformFeedback.ts). Mounted once in Layout.
 *
 * There is no close (×). The only way out is minimise ( _ ), a tap outside or Esc, and all
 * three do the same thing: the card shrinks and flies into the menu's Feedback item, the way
 * iOS sends an app back to its icon. If the menu is shut (phones), it flies into the menu
 * button instead. Anything typed stays as the draft, waiting on the Feedback page.
 * After Submit it says thank you and fades away.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import FeedbackCard from './FeedbackCard';
import {
    ASK_FEEDBACK_EVENT, FEEDBACK_LANDED_EVENT, type AskFeedbackDetail,
} from '@/lib/platformFeedback';

/** iOS's sheet curve: quick to start, long soft landing. */
const IOS_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

const reducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Where the minimised card goes: the first [data-feedback-target] actually on screen.
 * The navbar's menu button only shows on phones; the sidebar item is off-screen there
 * while the menu is shut, and on the rail it is just the icon.
 */
function landingRect(): DOMRect | null {
    const vw = window.innerWidth, vh = window.innerHeight;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-feedback-target]'))) {
        const r = (el.querySelector('svg') ?? el).getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.right > 0 && r.left < vw && r.bottom > 0 && r.top < vh) return r;
    }
    return null;
}

function MinimiseGlyph() {
    // An underscore, sitting low like a window's minimise button.
    return <span className="block h-[2.5px] w-3 translate-y-[3px] rounded-full bg-current" aria-hidden="true" />;
}

export default function FeedbackDock() {
    const [ask, setAsk] = useState<AskFeedbackDetail | null>(null);
    const leaving = useRef(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onAsk = (e: Event) => {
            leaving.current = false;
            setAsk((e as CustomEvent<AskFeedbackDetail>).detail || {});
        };
        window.addEventListener(ASK_FEEDBACK_EVENT, onAsk);
        return () => window.removeEventListener(ASK_FEEDBACK_EVENT, onAsk);
    }, []);

    // Rise in from just below, like a sheet.
    useLayoutEffect(() => {
        if (!ask) return;
        const card = cardRef.current, overlay = overlayRef.current;
        if (!card) return;
        if (reducedMotion()) {
            card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
        } else {
            card.animate(
                [{ opacity: 0, transform: 'translateY(28px) scale(0.94)' }, { opacity: 1, transform: 'none' }],
                { duration: 480, easing: IOS_EASE },
            );
        }
        overlay?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
    }, [ask]);

    const finish = useCallback((landed: boolean) => {
        setAsk(null);
        leaving.current = false;
        if (landed) window.dispatchEvent(new CustomEvent(FEEDBACK_LANDED_EVENT));
    }, []);

    const minimise = useCallback(() => {
        const card = cardRef.current;
        if (!card || leaving.current) return;
        leaving.current = true;
        overlayRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 360, easing: 'ease-out', fill: 'forwards' });

        if (reducedMotion()) {
            card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).finished
                .then(() => finish(true), () => finish(true));
            return;
        }

        const from = card.getBoundingClientRect();
        // Nothing to aim at: tuck it into the bottom-left corner.
        const to = landingRect() ?? new DOMRect(16, window.innerHeight - 40, 24, 24);
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        const scale = Math.max(Math.min(to.width, to.height) / from.width, 0.02);
        const duration = 540;

        card.style.transformOrigin = 'center';
        const move = card.animate(
            [
                { transform: 'translate(0, 0) scale(1)', borderRadius: '28px' },
                { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, borderRadius: '50%' },
            ],
            { duration, easing: IOS_EASE, fill: 'forwards' },
        );
        // Solid while it travels, gone as it reaches the icon.
        card.animate([{ opacity: 1 }, { opacity: 1, offset: 0.55 }, { opacity: 0 }], { duration, fill: 'forwards' });
        move.finished.then(() => finish(true), () => finish(true));
    }, [finish]);

    const fadeAway = useCallback(() => {
        // Let "Thank you" be read, then go.
        window.setTimeout(() => {
            const card = cardRef.current;
            if (!card || leaving.current) return;
            leaving.current = true;
            overlayRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' });
            card.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.96)' }],
                { duration: 240, easing: 'ease-in', fill: 'forwards' })
                .finished.then(() => finish(false), () => finish(false));
        }, 1500);
    }, [finish]);

    return (
        <Dialog.Root open={!!ask} onOpenChange={(open) => { if (!open) minimise(); }}>
            <Dialog.Portal>
                <Dialog.Overlay ref={overlayRef} className="fixed inset-0 z-[70] bg-slate-900/25 backdrop-blur-[2px]" />
                <Dialog.Content
                    aria-describedby="feedback-dock-desc"
                    onEscapeKeyDown={(e) => { e.preventDefault(); minimise(); }}
                    onInteractOutside={(e) => e.preventDefault()}
                    onOpenAutoFocus={(e) => {
                        // Phones: don't throw the keyboard up before they've read the card.
                        e.preventDefault();
                        if (window.matchMedia?.('(pointer: fine)').matches) {
                            cardRef.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
                        } else {
                            cardRef.current?.focus();
                        }
                    }}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                    // A tap on the dimmed space around the card minimises it.
                    onPointerDown={(e) => { if (e.target === e.currentTarget) minimise(); }}
                    className="fixed inset-0 z-[71] flex items-end justify-center p-3 pb-[max(12px,env(safe-area-inset-bottom))] outline-none sm:items-center sm:p-6"
                >
                    <div
                        ref={cardRef}
                        tabIndex={-1}
                        className="w-full max-w-[440px] rounded-[28px] bg-slate-50/95 p-4 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45),0_0_0_1px_rgba(15,23,42,0.06)] outline-none backdrop-blur-xl will-change-transform dark:bg-slate-950/95 sm:p-5"
                    >
                        <div className="mb-3.5 flex items-start justify-between gap-3 px-1">
                            <div className="min-w-0 pt-0.5">
                                <Dialog.Title className="text-[17px] font-semibold leading-tight tracking-[-0.015em] text-slate-900 dark:text-slate-100">
                                    Feedback
                                </Dialog.Title>
                                <Dialog.Description id="feedback-dock-desc" className="mt-1 text-[13px] leading-snug text-slate-500">
                                    {ask?.examTitle
                                        ? <>“{ask.examTitle}” has ended. How did TestoZa do?</>
                                        : 'Your exam has ended. How did TestoZa do?'}
                                </Dialog.Description>
                            </div>
                            <button
                                type="button"
                                onClick={minimise}
                                aria-label="Minimise to Feedback"
                                title="Minimise — it stays in Feedback"
                                className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-200/80 text-slate-600 transition-[background-color,transform] hover:bg-slate-300/80 motion-safe:active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 dark:bg-slate-800 dark:text-slate-300"
                            >
                                <MinimiseGlyph />
                            </button>
                        </div>
                        {ask && (
                            <FeedbackCard
                                origin={{ source: 'exam_ended', examId: ask.examId, examTitle: ask.examTitle }}
                                onSent={fadeAway}
                            />
                        )}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
