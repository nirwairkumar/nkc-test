/**
 * The feedback pop-up after a creator stops a live exam (askForFeedback in
 * lib/platformFeedback.ts). Mounted once in Layout. It asks "Did it fulfil your
 * requirements?" with five faces (ExamEndFeedback); the Feedback page keeps the
 * three-part card (FeedbackCard).
 *
 * There is no close (×). The only way out is minimise ( _ ), a tap outside or Esc, and all
 * three do the same thing: the card shrinks and flies into the menu's Feedback item, the way
 * iOS sends an app back to its icon. If the menu is shut (phones), it flies into the menu
 * button instead. Anything typed stays as the draft, waiting on the Feedback page.
 * After Submit it says thank you and fades away.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Share2 } from 'lucide-react';
import ExamEndFeedback from './ExamEndFeedback';
import { useAuth } from '@/contexts/AuthContext';
import { useMyReferrals } from '@/lib/referralsApi';
import InviteSheet from '@/components/referrals/InviteSheet';
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
    const { user, profile } = useAuth();
    const { data: referralData } = useMyReferrals(!!user);
    const [ask, setAsk] = useState<AskFeedbackDetail | null>(null);
    const [canMinimise, setCanMinimise] = useState(false);
    const [shareSheetOpen, setShareSheetOpen] = useState(false);
    const shareSheetOpenRef = useRef(false);
    shareSheetOpenRef.current = shareSheetOpen;

    const referralName = profile?.full_name || user?.user_metadata?.full_name || '';
    const referralCode = referralData?.code || '';

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

    // Enable minimise only after 10 seconds to encourage users to give feedback
    useEffect(() => {
        if (!ask) {
            setCanMinimise(false);
            return;
        }
        setCanMinimise(false);
        const timer = window.setTimeout(() => {
            setCanMinimise(true);
        }, 10000);
        return () => window.clearTimeout(timer);
    }, [ask]);

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
        if (!canMinimise) return;
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
    }, [canMinimise, finish]);

    const fadeAway = useCallback(() => {
        // Let "Thank you" be read, then go (checks if share sheet is currently open)
        const checkAndDismiss = () => {
            if (shareSheetOpenRef.current) {
                window.setTimeout(checkAndDismiss, 1000);
                return;
            }
            const card = cardRef.current;
            if (!card || leaving.current) return;
            leaving.current = true;
            overlayRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' });
            card.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.96)' }],
                { duration: 240, easing: 'ease-in', fill: 'forwards' })
                .finished.then(() => finish(false), () => finish(false));
        };
        window.setTimeout(checkAndDismiss, 2000);
    }, [finish]);

    return (
        <>
            <Dialog.Root open={!!ask} onOpenChange={(open) => { if (!open && canMinimise) minimise(); }}>
                <Dialog.Portal>
                    <Dialog.Overlay ref={overlayRef} className="fixed inset-0 z-[70] bg-slate-900/25 backdrop-blur-[2px]" />
                    <Dialog.Content
                        aria-describedby="feedback-dock-desc"
                        onEscapeKeyDown={(e) => { e.preventDefault(); if (canMinimise) minimise(); }}
                        onInteractOutside={(e) => e.preventDefault()}
                        onOpenAutoFocus={(e) => {
                            // Focus the card itself: no ring on a face before they've chosen.
                            e.preventDefault();
                            cardRef.current?.focus();
                        }}
                        onCloseAutoFocus={(e) => e.preventDefault()}
                        // A tap on the dimmed space around the card minimises it only after 10s.
                        onPointerDown={(e) => { if (e.target === e.currentTarget && canMinimise) minimise(); }}
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
                                        {ask?.examTitle ? <>“{ask.examTitle}” has ended.</> : 'Your exam has ended.'}
                                    </Dialog.Description>
                                </div>
                                {canMinimise && (
                                    <button
                                        type="button"
                                        onClick={minimise}
                                        aria-label="Minimise to Feedback"
                                        title="Minimise — it stays in Feedback"
                                        className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-200/80 text-slate-600 transition-[background-color,transform] hover:bg-slate-300/80 motion-safe:active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 dark:bg-slate-800 dark:text-slate-300 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-75 duration-300"
                                    >
                                        <MinimiseGlyph />
                                    </button>
                                )}
                            </div>
                            {ask && (
                                <ExamEndFeedback
                                    origin={{ source: 'exam_ended', examId: ask.examId, examTitle: ask.examTitle }}
                                    onSent={fadeAway}
                                />
                            )}

                            {/* Strip: Share with friends or community */}
                            <div className="mt-3.5 flex items-center justify-between gap-3 rounded-[20px] bg-gradient-to-r from-violet-500/[0.08] via-purple-500/[0.08] to-indigo-500/[0.08] p-3 ring-1 ring-violet-500/20 dark:from-violet-500/20 dark:to-indigo-500/20 dark:ring-violet-500/30">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
                                        <Share2 className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                                            Share with your friends or in your community
                                        </p>
                                        <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate">
                                            Invite fellow teachers to TestoZa
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShareSheetOpen(true)}
                                    className="shrink-0 cursor-pointer rounded-full bg-violet-600 px-3.5 py-1.5 text-[12.5px] font-bold text-white shadow-sm transition-[background-color,transform] hover:bg-violet-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                                >
                                    Share
                                </button>
                            </div>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            <InviteSheet
                open={shareSheetOpen}
                onOpenChange={setShareSheetOpen}
                code={referralCode}
                name={referralName}
            />
        </>
    );
}
