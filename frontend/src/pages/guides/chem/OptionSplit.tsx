/**
 * chem-options: one question as TestoZa's teacher analysis shows it
 * (pages/FullTestAnalysisPage.tsx, the expanded question row: Q# badge, difficulty,
 * accuracy, Option Breakdown cards with bars, Avg Time and Discrim), for a made-up class
 * of 40. The option cards are buttons here; the panel beside them says what each choice
 * tells the teacher and what to reteach.
 *
 * Size: from 760 px the analysis row and the panel sit side by side; narrower, they
 * stack.
 */
import { useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OPTION_SPLIT, type OptionKey } from '@/guides/chemData';
import { CARD, DemoFrame, useWidth } from './replica';
import { MathText, Tex } from './tex';

const pct = (n: number) => Math.round((n / OPTION_SPLIT.students) * 100);
const ACCURACY = pct(OPTION_SPLIT.options.find((o) => o.key === OPTION_SPLIT.answer)!.count);

export default function OptionSplit() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const width = useWidth(bodyRef);
    const wide = width >= 760;
    const [picked, setPicked] = useState<OptionKey>('A');
    const o = OPTION_SPLIT.options.find((x) => x.key === picked)!;
    const correct = picked === OPTION_SPLIT.answer;

    const row = (
        <div className={cn(CARD, 'cq-screen overflow-hidden cq-os-card')}>
            <div className="flex items-center gap-3 px-3 py-3 select-none">
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 rotate-90" />
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded shrink-0 min-w-[52px] text-center">Q#7</span>
                {/* FullTestAnalysisPage: below 40% accuracy a question is labelled Hard. */}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 bg-rose-50 text-rose-700 border-rose-200">Hard</span>
                <p className="flex-1 text-xs text-slate-700 font-medium truncate min-w-0">{OPTION_SPLIT.plain}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-rose-50 text-rose-700">{ACCURACY}%</span>
            </div>
            <div className={cn(wide ? 'px-10' : 'px-4', 'pb-4 pt-2 bg-slate-50/60 border-t border-slate-100 space-y-3')}>
                <p className="text-xs text-slate-700 font-medium leading-relaxed cq-os-q">
                    <MathText text={OPTION_SPLIT.text} plain={OPTION_SPLIT.plain} />
                </p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Topic: {OPTION_SPLIT.topic}</p>
                <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">Option Breakdown:</span>
                        <span className="text-slate-700 font-bold">Accuracy: {ACCURACY}%</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Options">
                        {OPTION_SPLIT.options.map((opt) => (
                            <button
                                key={opt.key}
                                type="button"
                                role="radio"
                                aria-checked={picked === opt.key}
                                onClick={() => setPicked(opt.key)}
                                className={cn('bg-white rounded-lg border p-2 text-center transition-shadow', picked === opt.key ? 'border-indigo-400 ring-2 ring-indigo-400/30' : 'border-slate-200 hover:border-slate-300')}
                            >
                                <div className="text-[10px] text-slate-400 font-semibold mb-1">{opt.key}</div>
                                <div className="cq-os-opt">
                                    <Tex tex={opt.tex.slice(1, -1)} plain={opt.plain} />
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                                    <div className={cn('h-1.5 rounded-full', opt.key === OPTION_SPLIT.answer ? 'bg-emerald-500' : 'bg-indigo-400')} style={{ width: `${pct(opt.count)}%` }} />
                                </div>
                                <strong className="text-xs text-slate-800">{pct(opt.count)}%</strong>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-4 pt-1 text-[10px] text-slate-400 font-medium">
                    <span>
                        Avg Time: <strong className="text-slate-600">81s</strong>
                    </span>
                    <span>
                        Discrim: <strong className="text-slate-600">0.38</strong>
                    </span>
                </div>
            </div>
        </div>
    );

    const panel = (
        <div className="cq-os-panel" aria-live="polite">
            <p className="cq-mini-label">
                Option {o.key} · {o.count} of {OPTION_SPLIT.students} students
            </p>
            <div className={`cq-os-verdict${correct ? ' is-right' : ''}`} key={o.key}>
                <b>{correct ? 'The right answer' : 'What it tells you'}</b>
                <p>{o.means}</p>
                {o.reteach && (
                    <>
                        <b>What to do</b>
                        <p>{o.reteach}</p>
                    </>
                )}
            </div>
            <p className="cq-os-note">Discrimination 0.38: students who scored well overall chose B more often than those who didn’t, so the question is doing its job. The problem is the lesson, not the question.</p>
        </div>
    );

    return (
        <DemoFrame
            title="What the wrong options tell you"
            tip={correct ? <span key="r">Only {ACCURACY}% chose it. Now look at A: almost half the class.</span> : <span key={picked}>Tap each option card to read it.</span>}
            onRestart={() => setPicked('A')}
            wide="md"
            caption="One question from TestoZa’s teacher analysis, with a made-up class of 40."
        >
            <div ref={bodyRef} className={`cq-os${wide ? ' is-wide' : ''}`}>
                {row}
                {panel}
            </div>
        </DemoFrame>
    );
}
