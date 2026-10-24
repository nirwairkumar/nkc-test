/**
 * The feedback card: one text area in three parts (Generate with AI, Conduct online exam,
 * Other), two lines each, split by hairlines like an iOS grouped list, and a Submit button.
 * Each part's label sits at the start of its first line ("For: Generate with AI  ___"),
 * the text runs on after it (text-indent) and wraps to the full width below.
 *
 * Shared by the Feedback page and the pop-up after stopping an exam (FeedbackDock); the
 * draft is shared too (lib/platformFeedback.ts).
 */
import React, { useLayoutEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    FEEDBACK_PARTS, hasText, sendPlatformFeedback, useFeedbackDraft,
    type FeedbackOrigin, type FeedbackPart,
} from '@/lib/platformFeedback';

const GROUP =
    'rounded-[20px] bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)] ' +
    'transition-shadow duration-200 focus-within:ring-sky-500/30 focus-within:shadow-[0_0_0_4px_rgba(14,165,233,0.08),0_8px_24px_-16px_rgba(15,23,42,0.14)] ' +
    'dark:bg-slate-900 dark:ring-white/10';

function PartField({ part, value, onChange, autoFocus }: {
    part: (typeof FEEDBACK_PARTS)[number];
    value: string;
    onChange: (text: string) => void;
    autoFocus?: boolean;
}) {
    const labelRef = useRef<HTMLLabelElement>(null);
    const [indent, setIndent] = useState(0);

    // The first line starts after the label; re-measure when the web font arrives.
    useLayoutEffect(() => {
        const el = labelRef.current;
        if (!el) return;
        const measure = () => setIndent(Math.ceil(el.getBoundingClientRect().width));
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const id = `feedback-${part.key}`;
    return (
        <div className="relative px-4 py-3">
            <label
                ref={labelRef}
                htmlFor={id}
                className="pointer-events-none absolute left-4 top-3 select-none whitespace-nowrap pr-2 text-[15px] leading-6 tracking-[-0.01em]"
            >
                {part.forLabel && <span className="text-slate-400 dark:text-slate-500">For: </span>}
                <span className="font-semibold text-slate-500 dark:text-slate-400">{part.name}</span>
            </label>
            <textarea
                id={id}
                rows={2}
                value={value}
                maxLength={2000}
                autoFocus={autoFocus}
                onChange={(e) => onChange(e.target.value)}
                placeholder={part.placeholder}
                style={{ textIndent: indent }}
                className="block h-12 w-full resize-none bg-transparent text-[15px] leading-6 tracking-[-0.01em] text-slate-900 placeholder:text-slate-300 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-600"
            />
        </div>
    );
}

export default function FeedbackCard({ origin, autoFocus, onSent, footer }: {
    origin: FeedbackOrigin;
    autoFocus?: boolean;
    /** After a successful send (the thank-you shows first). */
    onSent?: () => void;
    /** Shown left of Submit. */
    footer?: React.ReactNode;
}) {
    const { draft, setPart, clear } = useFeedbackDraft();
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const ready = hasText(draft);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ready || sending) return;
        setSending(true);
        try {
            await sendPlatformFeedback(draft, origin);
            clear();
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
            <div className={`${GROUP} flex flex-col items-center px-6 py-9 text-center`} role="status">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/15 motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-300">
                    <CheckCircle2 className="h-6 w-6" />
                </span>
                <p className="mt-3 text-[17px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">Thank you</p>
                <p className="mt-1 max-w-xs text-[14px] leading-relaxed text-slate-500">The TestoZa team reads every word.</p>
                <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="mt-4 inline-flex h-9 cursor-pointer items-center rounded-full bg-slate-100 px-4 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-200"
                >
                    Write more
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={submit} noValidate>
            <div className={GROUP}>
                {FEEDBACK_PARTS.map((part, i) => (
                    <React.Fragment key={part.key}>
                        {i > 0 && <div className="ml-4 h-px bg-slate-200/80 dark:bg-white/10" aria-hidden="true" />}
                        <PartField
                            part={part}
                            value={draft[part.key]}
                            onChange={(text) => setPart(part.key as FeedbackPart, text)}
                            autoFocus={autoFocus && i === 0}
                        />
                    </React.Fragment>
                ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
                <div className="min-w-0 text-[12px] leading-snug text-slate-400">{footer}</div>
                <button
                    type="submit"
                    disabled={!ready || sending}
                    className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-sky-600 px-6 text-[15px] font-semibold text-white shadow-sm transition-[background-color,transform,opacity] hover:bg-sky-700 motion-safe:active:scale-[0.97] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-sky-600"
                >
                    {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit
                </button>
            </div>
        </form>
    );
}
