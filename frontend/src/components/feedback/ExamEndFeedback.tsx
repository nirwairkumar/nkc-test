/**
 * What the pop-up after stopping an exam (FeedbackDock) asks: "Did it fulfil your
 * requirements?" with five faces, sad → excited. Picking a face opens an optional note
 * and the Submit button. A face alone is a complete answer.
 *
 * The note is the shared draft's Online exam part (lib/platformFeedback.ts), so if the
 * creator minimises the card, what they typed is still waiting on the Feedback page.
 */
import React, { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    FEEDBACK_RATINGS, sendPlatformFeedback, useFeedbackDraft,
    type FeedbackOrigin, type FeedbackRating,
} from '@/lib/platformFeedback';

const GROUP =
    'rounded-[20px] bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)] ' +
    'transition-shadow duration-200 focus-within:ring-sky-500/30 focus-within:shadow-[0_0_0_4px_rgba(14,165,233,0.08),0_8px_24px_-16px_rgba(15,23,42,0.14)] ' +
    'dark:bg-slate-900 dark:ring-white/10';

/** Colour emoji everywhere, not the text glyph some fonts carry. */
const EMOJI_FONT = { fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' };

const reducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Opens smoothly from zero height once a face is picked; hidden (and unfocusable) before. */
function Reveal({ open, children }: { open: boolean; children: React.ReactNode }) {
    return (
        <div
            className={cn(
                'grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out motion-reduce:transition-none',
                open ? 'visible grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0',
            )}
        >
            <div className="min-h-0 overflow-hidden">{children}</div>
        </div>
    );
}

export default function ExamEndFeedback({ origin, onSent }: {
    origin: FeedbackOrigin;
    /** After a successful send (the thank-you shows first). */
    onSent?: () => void;
}) {
    const { draft, setPart } = useFeedbackDraft();
    const [rating, setRating] = useState<FeedbackRating | null>(null);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const faces = useRef<(HTMLButtonElement | null)[]>([]);
    const noteRef = useRef<HTMLTextAreaElement>(null);
    const chosen = FEEDBACK_RATINGS.find((r) => r.value === rating);

    const pick = (i: number, how: 'pointer' | 'keys') => {
        const first = rating === null;
        setRating(FEEDBACK_RATINGS[i].value);
        const face = faces.current[i]?.querySelector<HTMLElement>('[data-face]');
        if (face && !reducedMotion()) {
            face.animate(
                [
                    { transform: 'scale(1)' },
                    { transform: 'scale(1.3) rotate(-6deg)', offset: 0.4 },
                    { transform: 'scale(1.04) rotate(2deg)', offset: 0.75 },
                    { transform: 'scale(1.1)' },
                ],
                { duration: 460, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' },
            );
        }
        // Desktop mouse: the note is ready to type in. Phones: no surprise keyboard.
        if (first && how === 'pointer' && window.matchMedia?.('(pointer: fine)').matches) {
            window.setTimeout(() => noteRef.current?.focus({ preventScroll: true }), 320);
        }
    };

    // Arrow keys move through the faces, like any radio group.
    const onKeyDown = (e: React.KeyboardEvent) => {
        const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const at = rating === null ? (step > 0 ? -1 : FEEDBACK_RATINGS.length) : FEEDBACK_RATINGS.findIndex((r) => r.value === rating);
        const next = Math.min(Math.max(at + step, 0), FEEDBACK_RATINGS.length - 1);
        pick(next, 'keys');
        faces.current[next]?.focus();
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rating || sending) return;
        setSending(true);
        try {
            await sendPlatformFeedback({ conduct: draft.conduct }, origin, rating);
            setPart('conduct', '');
            setSent(true);
            onSent?.();
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Couldn’t send your feedback. Please try again.');
        } finally {
            setSending(false);
        }
    };

    if (sent) {
        return (
            <div className={`${GROUP} flex flex-col items-center px-6 py-8 text-center`} role="status">
                <span
                    style={EMOJI_FONT}
                    className="text-[44px] leading-none motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-300"
                    aria-hidden="true"
                >
                    {chosen?.face}
                </span>
                <p className="mt-3 text-[17px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">Thank you</p>
                <p className="mt-1 max-w-xs text-[14px] leading-relaxed text-slate-500">The TestoZa team reads every word.</p>
            </div>
        );
    }

    // The tab stop: the picked face, else the middle one.
    const tabStop = rating ?? 3;

    return (
        <form onSubmit={submit} noValidate>
            <div className={GROUP}>
                <div className="px-4 pb-3.5 pt-3.5">
                    <p id="exam-end-feedback-q" className="px-0.5 text-[15px] font-semibold leading-6 tracking-[-0.01em] text-slate-900 dark:text-slate-100">
                        Did it fulfil your requirements?
                    </p>
                    <div
                        role="radiogroup"
                        aria-labelledby="exam-end-feedback-q"
                        onKeyDown={onKeyDown}
                        className="mt-2.5 grid grid-cols-5 gap-1"
                    >
                        {FEEDBACK_RATINGS.map((r, i) => {
                            const on = rating === r.value;
                            const dim = rating !== null && !on;
                            return (
                                <button
                                    key={r.value}
                                    ref={(el) => { faces.current[i] = el; }}
                                    type="button"
                                    role="radio"
                                    aria-checked={on}
                                    aria-label={r.label}
                                    tabIndex={tabStop === r.value ? 0 : -1}
                                    onClick={(e) => pick(i, e.detail > 0 ? 'pointer' : 'keys')}
                                    className="group flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl pb-1.5 pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                                >
                                    <span
                                        data-face=""
                                        style={EMOJI_FONT}
                                        aria-hidden="true"
                                        className={cn(
                                            'flex h-12 w-12 select-none items-center justify-center rounded-full text-[30px] leading-none',
                                            'transition-[transform,opacity,filter,background-color,box-shadow] duration-200 ease-out',
                                            on
                                                ? 'scale-110 bg-sky-50 shadow-[0_0_0_1.5px_rgba(14,165,233,0.45)] dark:bg-sky-500/15'
                                                : 'motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:scale-110 motion-safe:group-active:scale-95',
                                            dim && 'opacity-40 grayscale-[70%] group-hover:opacity-90 group-hover:grayscale-0',
                                        )}
                                    >
                                        {r.face}
                                    </span>
                                    <span
                                        className={cn(
                                            'whitespace-nowrap text-[11.5px] leading-tight transition-colors',
                                            on ? 'font-semibold text-sky-700 dark:text-sky-400' : 'font-medium text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300',
                                        )}
                                    >
                                        {r.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <Reveal open={rating !== null}>
                    <div className="ml-4 h-px bg-slate-200/80 dark:bg-white/10" aria-hidden="true" />
                    <div className="px-4 py-3">
                        <label htmlFor="exam-end-feedback-note" className="sr-only">
                            {chosen?.ask ?? 'Tell us more'} (optional)
                        </label>
                        <textarea
                            id="exam-end-feedback-note"
                            ref={noteRef}
                            rows={3}
                            value={draft.conduct}
                            maxLength={2000}
                            onChange={(e) => setPart('conduct', e.target.value)}
                            placeholder={`${chosen?.ask ?? 'Tell us more'} (optional)`}
                            className="block h-[72px] w-full resize-none bg-transparent text-[15px] leading-6 tracking-[-0.01em] text-slate-900 placeholder:text-slate-300 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-600"
                        />
                    </div>
                </Reveal>
            </div>

            <Reveal open={rating !== null}>
                <div className="flex justify-end pt-3">
                    <button
                        type="submit"
                        disabled={sending}
                        className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-sky-600 px-6 text-[15px] font-semibold text-white shadow-sm transition-[background-color,transform,opacity] hover:bg-sky-700 motion-safe:active:scale-[0.97] disabled:cursor-default disabled:opacity-60"
                    >
                        {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Submit
                    </button>
                </div>
            </Reveal>
        </form>
    );
}
