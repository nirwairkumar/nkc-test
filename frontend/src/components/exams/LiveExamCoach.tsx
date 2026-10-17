/**
 * The two tips a teacher sees right after an exam goes live, on its card in "Live exams":
 *
 *   1. Settings  — "Set up the exam room": switch on anti-cheating before anyone joins.
 *   2. Copy/Share — "Send it to your candidates": the link is the whole hand-off.
 *
 * Saving a test used to end in a toast; nothing told the teacher what came next, and the
 * old amber "Set exam environment" hint vanished after three seconds. These stay until the
 * teacher acts or closes them with ×. Step 2 appears when they leave Settings or close step 1.
 */
import React from 'react';
import { X } from 'lucide-react';

interface Props {
    step: 1 | 2;
    icon: React.ReactNode;
    title: string;
    body: string;
    /** Above the anchor with the arrow pointing down, or below it pointing up. */
    placement: 'above' | 'below';
    /** Which edge of the anchor the card lines up with. */
    align: 'start' | 'end';
    /** Distance of the arrow's centre from the aligned edge, in px. */
    arrowAt: number;
    action?: { label: string; onClick: () => void };
    onDismiss: () => void;
}

export default function LiveExamCoach({ step, icon, title, body, placement, align, arrowAt, action, onDismiss }: Props) {
    const above = placement === 'above';
    return (
        <div
            role="dialog"
            aria-label={title}
            className={[
                'absolute z-30 w-[min(320px,calc(100vw-48px))]',
                above ? 'bottom-full mb-3' : 'top-full mt-3',
                align === 'start' ? 'left-0' : 'right-0',
                'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300',
                above ? 'motion-safe:slide-in-from-bottom-1' : 'motion-safe:slide-in-from-top-1',
            ].join(' ')}
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
                        {action && (
                            <button
                                type="button"
                                onClick={action.onClick}
                                className="mt-3 inline-flex h-8 items-center rounded-full bg-white px-3.5 text-[13px] font-semibold text-slate-900 transition-[background-color,transform] duration-150 hover:bg-sky-50 motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer"
                            >
                                {action.label}
                            </button>
                        )}
                    </div>
                </div>

                {/* Arrow */}
                <span
                    aria-hidden
                    style={{ [align === 'start' ? 'left' : 'right']: arrowAt - 7 }}
                    className={[
                        'absolute h-3.5 w-3.5 rotate-45 bg-slate-900',
                        above ? '-bottom-[7px] rounded-br-[3px]' : '-top-[7px] rounded-tl-[3px]',
                    ].join(' ')}
                />
            </div>
        </div>
    );
}
