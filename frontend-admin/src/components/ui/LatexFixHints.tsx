import { useCallback, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import LatexRenderer from '@/components/ui/LatexRenderer';
import { keepAsWritten, type LatexIssue } from '@/lib/latexFixes';
import { fixFlags, useLatexFixes } from '@/hooks/useLatexFixes';
import { cn } from '@/lib/utils';

/* Maths fixes, the way Grammarly does spelling: the part that won't display is underlined in
   red in the text itself, and under the text sits what it should be. Tap it to replace;
   × keeps the text as written. */

interface LatexFixListProps {
    issues: readonly LatexIssue[];
    onApply: (next: string) => void;
    /** The fix being pointed at, so its underline can light up (-1: none). */
    onPoint?: (index: number) => void;
    className?: string;
}

/** One suggestion per underlined part: the corrected version (tap to use it), then ×. */
export function LatexFixList({ issues, onApply, onPoint, className }: LatexFixListProps) {
    if (!issues.length) return null;
    return (
        <ul className={cn('flex flex-wrap items-center gap-x-3 gap-y-1.5', className)} aria-label="Suggested fixes">
            {issues.map((issue, i) => (
                <li
                    key={issue.key}
                    className="inline-flex max-w-full items-center gap-0.5 animate-in fade-in slide-in-from-top-1 duration-200"
                    onMouseEnter={() => onPoint?.(i)}
                    onMouseLeave={() => onPoint?.(-1)}
                >
                    <button
                        type="button"
                        data-fix-index={i}
                        // Keeps the caret in the box when the fix is taken while typing.
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => onApply(issue.next)}
                        onFocus={() => onPoint?.(i)}
                        onBlur={() => onPoint?.(-1)}
                        title="Replace with this"
                        aria-label={`Replace with the corrected text: ${issue.replacement}`}
                        className="inline-flex min-h-8 min-w-0 max-w-full items-center rounded-md bg-emerald-600 px-2.5 py-0.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400 [&_.latex-renderer-container]:!text-inherit"
                    >
                        {/* No scrolling here: KaTeX's tall struts gave the button a grey scrollbar on Windows. */}
                        <span className="min-w-0 overflow-hidden py-px">
                            <LatexRenderer>{issue.replacement}</LatexRenderer>
                        </span>
                    </button>
                    <button
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => keepAsWritten(issue.key)}
                        title="Dismiss"
                        aria-label="Dismiss, keep as written"
                        className="flex h-8 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                        <X className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                </li>
            ))}
        </ul>
    );
}

/** Lights up the underline of fix `index` inside `root`, and only that one. */
function usePointer(root: React.RefObject<HTMLElement | null>) {
    return useCallback((index: number) => {
        root.current?.querySelectorAll('.tex-flag.is-active').forEach(el => el.classList.remove('is-active'));
        if (index >= 0) root.current?.querySelectorAll(`.tex-flag-${index}`).forEach(el => el.classList.add('is-active'));
    }, [root]);
}

interface LatexWithFixesProps {
    text: string;
    onApply: (next: string) => void;
    /** Around the text (the question / option / passage styles). */
    textClassName?: string;
    listClassName?: string;
}

/** The text with what won't display underlined, and the fixes under it (AI review screen). */
export function LatexWithFixes({ text, onApply, textClassName, listClassName = 'mt-2' }: LatexWithFixesProps) {
    const issues = useLatexFixes(text);
    const root = useRef<HTMLDivElement>(null);
    const point = usePointer(root);
    const flags = useMemo(() => fixFlags(issues), [issues]);

    // Tapping an underline goes to its fix, like opening Grammarly's card.
    const onTextClick = (e: React.MouseEvent) => {
        const index = (e.target as HTMLElement).closest('.tex-flag')?.className.match(/\btex-flag-(\d+)\b/)?.[1];
        if (index) root.current?.querySelector<HTMLButtonElement>(`[data-fix-index="${index}"]`)?.focus();
    };

    return (
        <div ref={root}>
            <div className={textClassName} onClick={issues.length ? onTextClick : undefined}>
                <LatexRenderer flags={flags}>{text}</LatexRenderer>
            </div>
            <LatexFixList issues={issues} onApply={onApply} onPoint={point} className={listClassName} />
        </div>
    );
}

interface LatexFixHintsProps {
    text: string;
    onApply: (next: string) => void;
    /** Check only after the text has rested this long (the builder, while typing). */
    delay?: number;
    className?: string;
}

/** Just the fixes, for a typing box whose text isn't drawn here (the test builder). */
export default function LatexFixHints({ text, onApply, delay = 0, className }: LatexFixHintsProps) {
    const issues = useLatexFixes(text, delay);
    return <LatexFixList issues={issues} onApply={onApply} className={className} />;
}
