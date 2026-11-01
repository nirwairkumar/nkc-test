import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Check, Wand2, X } from 'lucide-react';
import LatexRenderer from '@/components/ui/LatexRenderer';
import { findLatexIssues, getKeptVersion, isKept, keepAsWritten, subscribeKept } from '@/lib/latexFixes';
import { cn } from '@/lib/utils';

interface LatexFixHintsProps {
    text: string;
    onApply: (next: string) => void;
    /** Check only after the text has rested this long (the builder, while typing). */
    delay?: number;
    className?: string;
}

/**
 * Under a question or option: maths that won't display, what it should be (rendered),
 * and an ×. Tapping the corrected formula puts it in the text; × keeps it as written.
 */
export default function LatexFixHints({ text, onApply, delay = 0, className }: LatexFixHintsProps) {
    const [settled, setSettled] = useState(text);
    useEffect(() => {
        if (!delay) return;
        const id = window.setTimeout(() => setSettled(text), delay);
        return () => window.clearTimeout(id);
    }, [text, delay]);
    // A fix offered for older text would wipe out what was typed since, so none while typing.
    const ready = !delay || settled === text;
    const issues = useMemo(() => (ready ? findLatexIssues(text) : []), [ready, text]);
    useSyncExternalStore(subscribeKept, getKeptVersion);
    const shown = issues.filter(issue => !isKept(issue.key));
    if (!shown.length) return null;

    return (
        <ul className={cn('space-y-1.5', className)} aria-label="Maths fixes">
            {shown.map(issue => (
                <li
                    key={issue.key}
                    className="flex items-start gap-2 rounded-xl bg-amber-50 py-1.5 pl-2.5 pr-1 text-left text-[12.5px] leading-snug ring-1 ring-inset ring-amber-500/25 animate-in fade-in slide-in-from-top-1 duration-200 dark:bg-amber-400/10 dark:ring-amber-300/20"
                >
                    <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                        <p className="text-amber-900 dark:text-amber-100">
                            <b className="font-semibold">{issue.title}</b>
                            <span className="text-amber-800/80 dark:text-amber-200/70"> · {issue.reason}</span>
                        </p>
                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                            <code
                                title={issue.original}
                                className="min-w-0 max-w-full truncate rounded-md bg-white/70 px-1.5 py-px font-mono text-[12px] text-red-600 line-through decoration-red-400/60 dark:bg-black/20 dark:text-red-400 sm:max-w-[20rem]"
                            >
                                {issue.original}
                            </code>
                            <span aria-hidden="true" className="text-amber-700/60 dark:text-amber-300/60">→</span>
                            <button
                                type="button"
                                // Keeps the caret in the box when the fix is taken while typing.
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => onApply(issue.next)}
                                title={`Replace with ${issue.replacement}`}
                                aria-label="Replace with the corrected maths"
                                className="inline-flex min-h-7 min-w-0 max-w-full items-center gap-1.5 rounded-lg bg-white px-2 py-0.5 text-slate-900 shadow-sm ring-1 ring-emerald-600/30 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-emerald-500/10"
                            >
                                <span className="min-w-0 overflow-x-auto text-[14px]">
                                    <LatexRenderer>{issue.replacement}</LatexRenderer>
                                </span>
                                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={3} aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => keepAsWritten(issue.key)}
                        title="Keep as written"
                        aria-label="Keep as written"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-amber-700/70 transition-colors hover:bg-amber-100 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 dark:text-amber-300/70 dark:hover:bg-amber-400/15"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </li>
            ))}
        </ul>
    );
}
