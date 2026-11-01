/**
 * The two tips a teacher sees right after an exam goes live, on its card in "Live exams":
 *
 *   1. Settings  — "Set up the exam room": switch on anti-cheating before anyone joins.
 *   2. Copy/Share — "Send it to your candidates": the link is the whole hand-off.
 *
 * Saving a test used to end in a toast; nothing told the teacher what came next, and the
 * old amber "Set exam environment" hint vanished after three seconds. These stay until the
 * teacher acts or closes them with ×. Step 2 appears when they leave Settings or close step 1.
 *
 * Render it inside a `relative` wrapper around the one button it points at. The arrow is
 * drawn from that button's own box, so it lands on the button's centre at any width.
 */
import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    step: 1 | 2;
    icon: React.ReactNode;
    title: string;
    body: string;
    /**
     * 'beside': to the right of the button, arrow pointing left at it, so the rows above stay
     *           in view. Phones have no room beside it and get 'below' instead.
     * 'below':  under the button, arrow pointing up at it.
     */
    placement: 'beside' | 'below';
    /** Horizontal position and width of the card when it sits below; defaults to the button's left edge. */
    cardClassName?: string;
    /** Phones, 'beside' only: px to pull the card left so it lines up with the start of the row. */
    phoneShift?: number;
    onDismiss: () => void;
}

export default function LiveExamCoach({ step, icon, title, body, placement, cardClassName, phoneShift = 0, onDismiss }: Props) {
    const beside = placement === 'beside';
    return (
        <div
            role="dialog"
            aria-label={title}
            className={cn(
                'pointer-events-none absolute inset-0 z-30',
                'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 motion-safe:slide-in-from-top-1',
                beside && 'sm:motion-safe:slide-in-from-top-0 sm:motion-safe:slide-in-from-left-1',
            )}
        >
            <div
                style={beside ? { left: -phoneShift } : undefined}
                className={cn(
                    'pointer-events-auto absolute top-full mt-3 w-[min(320px,calc(100vw-48px))]',
                    !beside && 'left-0',
                    beside && 'sm:!left-full sm:top-0 sm:ml-3 sm:mt-0',
                    cardClassName,
                )}
            >
                <div className="relative rounded-2xl bg-slate-900 p-4 pr-11 text-white shadow-[0_18px_40px_-12px_rgba(15,23,42,0.55)] ring-1 ring-white/10">
                    <button
                        type="button"
                        onClick={onDismiss}
                        aria-label="Close tip"
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="flex gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-400/15 text-sky-300">
                            {icon}
                        </span>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-300/90">Step {step} of 2</p>
                            <p className="mt-0.5 text-[15px] font-semibold leading-snug tracking-[-0.01em]">{title}</p>
                            <p className="mt-1 text-[13px] leading-relaxed text-slate-300">{body}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Arrow: centred on the button, its middle on the card's edge (12px gap − half of 14px). */}
            <span
                aria-hidden
                className={cn(
                    'absolute left-1/2 top-full -ml-[7px] mt-[5px] h-3.5 w-3.5 rotate-45 rounded-tl-[3px] bg-slate-900',
                    beside && 'sm:left-full sm:top-1/2 sm:ml-[5px] sm:-mt-[7px] sm:rounded-tl-none sm:rounded-bl-[3px]',
                )}
            />
        </div>
    );
}
