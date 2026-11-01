import { useState } from 'react';
import { cn } from '@/lib/utils';
import { type MarkingScheme, markText, markValue } from './marking';

/* The Marking switch: "[+ 1] No negative marking" | "With negative marking [+ 4] [− 1]"
   (| "Custom" when questions differ). The boxes hold the marks every question gets;
   empty, they show the usual marks as a placeholder, and choosing that side uses them. */

const DEFAULT_PLAIN = 1;
const DEFAULT_RIGHT = 4;
const DEFAULT_WRONG = 1;

interface MarkBoxProps {
    sign: '+' | '−';
    /** What the paper has now ('' when this side isn't chosen or questions differ). */
    value: string;
    placeholder: number;
    label: string;
    /** A valid number was typed. */
    onType: (n: number) => void;
}

/** A small "+ [ 4 ]" box. Keeps what is being typed ("0.", "1/") until it reads as a number. */
function MarkBox({ sign, value, placeholder, label, onType }: MarkBoxProps) {
    const [draft, setDraft] = useState<string | null>(null);
    return (
        <span className="inline-flex h-8 items-center rounded-lg bg-slate-100 pl-2 ring-1 ring-inset ring-slate-900/10 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-500/60">
            <span aria-hidden="true" className={cn('text-[14px] font-bold', sign === '+' ? 'text-emerald-700' : 'text-rose-700')}>{sign}</span>
            <input
                type="text"
                inputMode="decimal"
                aria-label={label}
                value={draft ?? value}
                placeholder={String(placeholder)}
                onChange={e => {
                    const text = e.target.value.replace(/[^\d./]/g, '');
                    setDraft(text);
                    const n = markValue(text);
                    if (n > 0 && /\d$/.test(text)) onType(n);
                }}
                onBlur={() => setDraft(null)}
                className="h-full w-11 bg-transparent pl-0.5 pr-1.5 text-center text-[14px] font-semibold tabular-nums text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:outline-none"
            />
        </span>
    );
}

interface MarkingSwitchProps {
    scheme: MarkingScheme;
    /** The marks / penalty every question shares (null when they differ). */
    uniformMarks: number | null;
    uniformPenalty: number | null;
    /** Put these marks on every question: `marks` null keeps each question's own. */
    onSet: (marks: number | null, negative: number) => void;
}

export default function MarkingSwitch({ scheme, uniformMarks, uniformPenalty, onSet }: MarkingSwitchProps) {
    const shown = (n: number | null, on: boolean) => (on && n !== null ? markText(n) : '');
    const right = scheme === 'negative' && uniformMarks !== null ? uniformMarks : DEFAULT_RIGHT;
    const wrong = scheme === 'negative' && uniformPenalty !== null ? uniformPenalty : DEFAULT_WRONG;

    const choose = (next: MarkingScheme) => {
        if (next === scheme || next === 'custom') return;
        // No negative marking keeps each question's marks; the other side uses its boxes.
        if (next === 'none') onSet(null, 0);
        else onSet(right, wrong);
    };

    const option = (value: MarkingScheme, content: React.ReactNode, className?: string) => {
        const on = scheme === value;
        return (
            <div
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                onClick={() => choose(value)}
                onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
                        e.preventDefault();
                        choose(value);
                    }
                }}
                className={cn(
                    'flex min-h-10 cursor-pointer select-none items-center justify-center gap-2 rounded-[9px] px-3 py-1 text-[14px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60',
                    on ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.12),0_1px_1px_rgba(15,23,42,0.04)]' : 'text-slate-600 hover:text-slate-900',
                    className,
                )}
            >
                {content}
            </div>
        );
    };

    return (
        <div role="radiogroup" aria-label="Marking scheme" className="grid gap-1 rounded-xl bg-slate-200/60 p-1 sm:flex">
            {option('none', (
                <>
                    <MarkBox
                        sign="+"
                        value={shown(uniformMarks, scheme === 'none')}
                        placeholder={DEFAULT_PLAIN}
                        label="Marks for each right answer, no negative marking"
                        onType={n => onSet(n, 0)}
                    />
                    No negative marking
                </>
            ), 'sm:flex-1')}
            {option('negative', (
                <>
                    With negative marking
                    <span className="inline-flex items-center gap-1">
                        <MarkBox
                            sign="+"
                            value={shown(uniformMarks, scheme === 'negative')}
                            placeholder={DEFAULT_RIGHT}
                            label="Marks for each right answer"
                            onType={n => onSet(n, wrong)}
                        />
                        <MarkBox
                            sign="−"
                            value={shown(uniformPenalty, scheme === 'negative')}
                            placeholder={DEFAULT_WRONG}
                            label="Marks taken off for each wrong answer"
                            onType={n => onSet(right, n)}
                        />
                    </span>
                </>
            ), 'sm:flex-1')}
            {scheme === 'custom' && option('custom', <>Custom</>, 'sm:px-5')}
        </div>
    );
}
