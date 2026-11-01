/**
 * jadv-marking: JEE Advanced's partial marks, tried by hand. The left card is the test
 * builder's multiple-correct question (test-builder/QuestionCard.tsx, its classes): the
 * answer-key tick buttons, the Marks / Wrong fields and the "Partial marks" switch
 * (Proportional or JEE Advanced). The right card is the candidate's side: the exam
 * screen's square option keys (TestPage.tsx), the marks TestoZa gives with the chosen
 * setting (from the product's own multiPartialScore), and JEE Advanced's rule with the line
 * that applies lit up.
 *
 * Size: from 760 px the two cards sit side by side; narrower, the cases, the candidate's
 * card and the builder card stack in that order and the demo scrolls inside its frame.
 */
import { useRef, useState } from 'react';
import { Check, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MARKING_PRESETS, OPTION_KEYS, RULE, ruleFor, type OptionKey } from '@/guides/jadvData';
import { multiPartialScore, type PartialMarking } from '@/utils/multiCorrect';
import { CARD, DemoFrame, useWidth } from './replica';

const MARKS = 4;
const WRONG = 2;
const START = MARKING_PRESETS[0];

/** A question's marks, as scoring.py gives them. */
function marksFor(key: OptionKey[], picked: OptionKey[], mode: PartialMarking): number {
    if (picked.length === 0 || key.length === 0) return 0;
    if (picked.some((p) => !key.includes(p))) return -WRONG;
    if (picked.length === key.length) return MARKS;
    return multiPartialScore({ partialMarking: mode }, picked.length, key.length, MARKS);
}

const show = (n: number) => {
    const r = Math.round(n * 100) / 100;
    return r > 0 ? `+${r}` : r < 0 ? `−${-r}` : '0';
};

const sorted = (keys: OptionKey[]) => [...keys].sort() as OptionKey[];

export default function MarkingLab() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const width = useWidth(bodyRef);
    const wide = width >= 760;
    const [key, setKey] = useState<OptionKey[]>(START.key);
    const [picked, setPicked] = useState<OptionKey[]>(START.picked);
    const [mode, setMode] = useState<PartialMarking>('per_option');

    const toggle = (list: OptionKey[], k: OptionKey) => sorted(list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);
    const restart = () => {
        setKey(START.key);
        setPicked(START.picked);
        setMode('per_option');
    };

    const line = ruleFor(key, picked);
    const jee = marksFor(key, picked, 'per_option');
    const prop = marksFor(key, picked, 'proportional');
    const ours = mode === 'per_option' ? jee : prop;
    const preset = MARKING_PRESETS.find((p) => p.key.join() === key.join() && p.picked.join() === picked.join());
    const noKey = key.length === 0;

    const tip = noKey ? (
        <span key="nokey">Tick at least one correct answer in the builder card.</span>
    ) : mode === 'proportional' && jee !== prop ? (
        <span key="diff">Proportional gives {show(prop)}; JEE Advanced gives {show(jee)}. Switch back to JEE Advanced for a real mock.</span>
    ) : line === 'wrong' ? (
        <span key="wrong">One wrong option and the whole question is −2, however many right ones were picked.</span>
    ) : line === 'full' ? (
        <span key="full">Every correct option and nothing else: full marks. Now drop one.</span>
    ) : (
        <span key={line}>
            {picked.length} correct option{picked.length === 1 ? '' : 's'} chosen: {show(jee)}. Try the other chips, or change the answer key.
        </span>
    );

    const presets = (
        <div className="ja-ml-presets" role="group" aria-label="Try a case">
            {MARKING_PRESETS.map((p) => (
                <button
                    key={p.id}
                    type="button"
                    aria-pressed={preset?.id === p.id}
                    onClick={() => {
                        setKey(p.key);
                        setPicked(p.picked);
                    }}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );

    const builder = (
        <div className={cn(CARD, 'ja-screen ja-ml-card p-4')}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-slate-500">Question 2 · Multiple correct</p>
                <div className="flex items-center gap-1.5">
                    <span className="flex h-9 items-center gap-1.5 rounded-full bg-slate-100 pl-3 pr-1 text-[12.5px] font-medium text-slate-600">
                        Marks
                        <span className="flex h-7 items-center rounded-full bg-white px-1.5 shadow-sm ring-1 ring-slate-900/[0.06]">
                            <span className="text-[13px] font-bold text-emerald-600">+</span>
                            <span className="w-6 text-center text-[14px] font-bold tabular-nums text-slate-900">{MARKS}</span>
                        </span>
                    </span>
                    <span className="flex h-9 items-center gap-1.5 rounded-full bg-slate-100 pl-3 pr-1 text-[12.5px] font-medium text-slate-600">
                        Wrong
                        <span className="flex h-7 items-center rounded-full bg-white px-1.5 shadow-sm ring-1 ring-slate-900/[0.06]">
                            <span className="text-[13px] font-bold text-red-600">−</span>
                            <span className="w-6 text-center text-[14px] font-bold tabular-nums text-red-600">{WRONG}</span>
                        </span>
                    </span>
                </div>
            </div>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-[13px] font-semibold text-slate-500">Answer key</p>
                <p className="text-[13px] text-slate-400">Tick every correct answer</p>
            </div>
            <div className="ja-ml-keys" role="group" aria-label="Correct answers">
                {OPTION_KEYS.map((k) => {
                    const on = key.includes(k);
                    return (
                        <button
                            key={k}
                            type="button"
                            onClick={() => setKey((list) => toggle(list, k))}
                            aria-pressed={on}
                            aria-label={on ? `Option ${k} is correct` : `Mark option ${k} as correct`}
                            className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[15px] font-bold transition-all motion-safe:active:scale-95',
                                on ? 'bg-emerald-500 text-white shadow-[0_4px_10px_-4px_rgba(16,185,129,0.8)]' : 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-900/[0.06] hover:bg-slate-200',
                            )}
                        >
                            {on ? <Check className="h-4 w-4" strokeWidth={3} /> : k}
                        </button>
                    );
                })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-900/[0.06]">
                <p className="text-[13px] font-semibold text-slate-500">Partial marks</p>
                <div role="radiogroup" aria-label="Partial marks" className="flex w-fit rounded-full bg-slate-200/70 p-0.5 text-[13px] font-semibold">
                    {([['proportional', 'Proportional'], ['per_option', 'JEE Advanced']] as const).map(([m, text]) => (
                        <button
                            key={m}
                            type="button"
                            role="radio"
                            aria-checked={mode === m}
                            onClick={() => setMode(m)}
                            className={cn('h-8 rounded-full px-3.5 transition-all', mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
                        >
                            {text}
                        </button>
                    ))}
                </div>
                <p className="w-full text-[12px] leading-snug text-slate-500">
                    {mode === 'per_option'
                        ? '+1 for each correct option picked. Full marks only for all of them; any wrong option gets the Wrong mark.'
                        : 'Marks × correct options picked ÷ all correct options. Any wrong option gets the Wrong mark.'}
                </p>
            </div>
            {wide && presets}
        </div>
    );

    const candidate = (
        <div className="ja-ml-side">
            <p className="ja-mini-label">The candidate chooses</p>
            <div className="ja-ml-picks ja-screen" role="group" aria-label="Options the candidate chooses">
                {OPTION_KEYS.map((k) => {
                    const on = picked.includes(k);
                    return (
                        <button
                            key={k}
                            type="button"
                            aria-pressed={on}
                            aria-label={`Option ${k}`}
                            onClick={() => setPicked((list) => toggle(list, k))}
                            className={cn(
                                'h-10 w-10 flex items-center justify-center font-bold text-sm border shrink-0 transition-colors rounded-md',
                                on ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-400 hover:text-blue-600',
                            )}
                        >
                            {on ? <CheckCircle className="w-4 h-4" /> : k}
                        </button>
                    );
                })}
            </div>
            <div className="ja-ml-result" data-tone={noKey ? undefined : ours > 0 ? 'plus' : ours < 0 ? 'minus' : 'zero'} aria-live="polite">
                <b key={`${ours}-${mode}`}>{noKey ? '–' : show(ours)}</b>
                <span>
                    {noKey ? 'No answer key yet' : mode === 'per_option' ? 'TestoZa, JEE Advanced setting: the same as the real paper' : jee === prop ? 'TestoZa, Proportional: the same as JEE Advanced here' : `TestoZa, Proportional. JEE Advanced: ${show(jee)}`}
                </span>
            </div>
            <ol className="ja-ml-rule" aria-label="JEE Advanced’s rule for one-or-more-correct questions">
                {RULE.map((r) => (
                    <li key={r.id} aria-current={!noKey && r.id === line ? 'true' : undefined}>
                        <b>{r.marks}</b>
                        <span>{r.when}</span>
                    </li>
                ))}
            </ol>
        </div>
    );

    return (
        <DemoFrame
            id="marking-lab"
            title="JEE Advanced partial marks, tried by hand"
            tip={tip}
            onRestart={restart}
            wide="md"
            caption="The builder card is TestoZa’s own; the marks come from the same function its server uses. The rule is JEE Advanced’s, as recent papers print it."
        >
            <div ref={bodyRef} className={`ja-ml${wide ? ' is-wide' : ''}`}>
                {wide ? (
                    <>
                        {builder}
                        {candidate}
                    </>
                ) : (
                    // Narrow: the cases and the marks first, so a tap and its result share the screen.
                    <>
                        {presets}
                        {candidate}
                        {builder}
                    </>
                )}
            </div>
        </DemoFrame>
    );
}
