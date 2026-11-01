/**
 * chem-numerical: range or exact values for a numerical question. The left card is the
 * builder's "Correct answer" control (test-builder/QuestionCard.tsx, its classes): "A
 * range of values" with Lowest / Highest correct, or "Exact value(s)" separated by
 * commas. The right card marks six candidates' answers to "the pH of 0.002 M HCl, to two
 * decimal places" (2.699…, so 2.70) with the same rule the exam screen and the server use (utils/numericalAnswer.ts), at
 * +4 / −1, and the reader can try an answer of their own.
 *
 * Size: from 760 px the two cards sit side by side; narrower, they stack and the demo
 * scrolls inside its frame.
 */
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { NUMERIC } from '@/guides/chemData';
import { isNumericalCorrect } from '@/utils/numericalAnswer';
import { CARD, DemoFrame, useWidth } from './replica';
import { MathText } from './tex';

interface Setting {
    exactMatch: boolean;
    exactAnswers: string;
    min: number;
    max: number;
}

const START: Setting = { ...NUMERIC.presets[0].setting };

export default function NumericLab() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const width = useWidth(bodyRef);
    const wide = width >= 760;
    const [s, setS] = useState<Setting>(START);
    const [mine, setMine] = useState('');
    const [touched, setTouched] = useState(false);

    const patch = (p: Partial<Setting>) => {
        setS((prev) => ({ ...prev, ...p }));
        setTouched(true);
    };
    const restart = () => {
        setS(START);
        setMine('');
        setTouched(false);
    };

    const marks = NUMERIC.answers.map((a) => ({ ...a, ok: isNumericalCorrect(s, a.value) }));
    const right = marks.filter((m) => m.ok).length;
    const preset = NUMERIC.presets.find((p) => p.setting.exactMatch === s.exactMatch && p.setting.exactAnswers === s.exactAnswers && (s.exactMatch || (p.setting.min === s.min && p.setting.max === s.max)));
    const passesWrong = isNumericalCorrect(s, '2.71');
    const failsGood = !isNumericalCorrect(s, '2.699') || !isNumericalCorrect(s, '2.69');

    const tip = passesWrong ? (
        <span key="loose">Too loose: 2.71 is marked right, and the pH is 2.699…</span>
    ) : !failsGood ? (
        <span key="fair">Fair: rounded and truncated answers pass, wrong ones don’t.</span>
    ) : !touched ? (
        <span key="t0">Exact 2.70 fails Diya, whose 2.699 is more accurate. Try a range.</span>
    ) : (
        <span key="t1">{right} of 6 marked right. Is anyone being failed for being careful?</span>
    );

    const builder = (
        <div className={cn(CARD, 'cq-screen cq-nl-card p-4')}>
            <p className="mb-1 text-[13px] font-semibold text-slate-500">Question</p>
            <p className="mb-4 text-[16px] font-medium text-slate-800">
                <MathText text={NUMERIC.text} plain={NUMERIC.plain} />
            </p>
            <p className="mb-2 text-[13px] font-semibold text-slate-500">Correct answer</p>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-900/[0.06]">
                <div role="radiogroup" className="mx-auto mb-3 flex w-fit rounded-full bg-slate-200/70 p-0.5 text-[13px] font-semibold">
                    {([[false, 'A range of values'], [true, 'Exact value(s)']] as const).map(([exact, text]) => (
                        <button
                            key={String(exact)}
                            type="button"
                            role="radio"
                            aria-checked={s.exactMatch === exact}
                            onClick={() => patch(exact ? { exactMatch: true, exactAnswers: s.exactAnswers || '2.70' } : { exactMatch: false, min: s.min || 2.69, max: s.max || 2.7 })}
                            className={cn('h-8 rounded-full px-3.5 transition-all', s.exactMatch === exact ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
                        >
                            {text}
                        </button>
                    ))}
                </div>
                {s.exactMatch ? (
                    <div className="mx-auto max-w-sm text-center">
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="e.g. 100, 150, 200"
                            aria-label="Exact values"
                            value={s.exactAnswers}
                            onChange={(e) => patch({ exactAnswers: e.target.value })}
                            className="h-11 w-full rounded-xl bg-white px-3 text-center font-mono text-[16px] font-bold text-slate-900 ring-1 ring-slate-900/10 focus:outline-none focus:ring-2 focus:ring-sky-500/45"
                        />
                        <p className="mt-2 text-[13px] text-slate-500">Separate with commas. Any of these is marked correct.</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-end justify-center gap-3">
                        {(['min', 'max'] as const).map((end) => (
                            <label key={end} className="text-left">
                                <span className="mb-1 block pl-1 text-[13px] text-slate-500">{end === 'min' ? 'Lowest correct' : 'Highest correct'}</span>
                                <input
                                    type="number"
                                    step="any"
                                    value={s[end]}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        patch({ [end]: isNaN(v) ? 0 : v });
                                    }}
                                    className="h-11 w-32 rounded-xl bg-white px-3 text-center font-mono text-[16px] font-bold text-slate-900 ring-1 ring-slate-900/10 focus:outline-none focus:ring-2 focus:ring-sky-500/45"
                                />
                            </label>
                        ))}
                        <p className="w-full text-center text-[13px] text-slate-500">For one exact answer, put the same number in both boxes.</p>
                    </div>
                )}
            </div>
            <div className="cq-nl-presets" role="group" aria-label="Try a setting">
                {NUMERIC.presets.map((p) => (
                    <button key={p.id} type="button" aria-pressed={preset?.id === p.id} onClick={() => patch({ ...p.setting })}>
                        {p.label}
                    </button>
                ))}
            </div>
        </div>
    );

    const mineOk = mine.trim() !== '' && isNumericalCorrect(s, mine);
    const results = (
        <div className="cq-nl-results">
            <p className="cq-mini-label">What six candidates typed</p>
            <ul className="cq-nl-list">
                {marks.map((m) => (
                    <li key={m.name} data-ok={m.ok ? 'yes' : 'no'}>
                        <span className="cq-nl-name">{m.name}</span>
                        <code>{m.value}</code>
                        <span className="cq-nl-mark">{m.ok ? '+4' : '−1'}</span>
                    </li>
                ))}
                <li className="cq-nl-mine" data-ok={mine.trim() === '' ? undefined : mineOk ? 'yes' : 'no'}>
                    <span className="cq-nl-name">You</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Type an answer"
                        aria-label="Your answer"
                        value={mine}
                        onChange={(e) => /^-?\d*\.?\d*$/.test(e.target.value) && setMine(e.target.value)}
                    />
                    <span className="cq-nl-mark">{mine.trim() === '' ? '' : mineOk ? '+4' : '−1'}</span>
                </li>
            </ul>
            <p className="cq-nl-total" aria-live="polite">
                <b>{right} of 6</b> marked right with this setting
            </p>
        </div>
    );

    return (
        <DemoFrame title="Range or exact value?" tip={tip} onRestart={restart} wide="md" caption="The setting card is the test builder’s own. Answers are marked with the same rule TestoZa’s exam screen and server use, at +4 for right and −1 for wrong.">
            <div ref={bodyRef} className={`cq-nl${wide ? ' is-wide' : ''}`}>
                {builder}
                {results}
            </div>
        </DemoFrame>
    );
}
