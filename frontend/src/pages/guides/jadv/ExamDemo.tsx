/**
 * jadv-exam: a candidate's phone running a six-question JEE Advanced-style paper on
 * TestoZa's exam screen (examScreen.tsx): one-correct (+3 / −1), one-or-more-correct with
 * JEE Advanced partial marks (+4, +1 per correct option, −2), a decimal numerical answer
 * and a non-negative integer (+4 / 0, typed on the product's keypad) and a List-I/List-II
 * matching question (+3 / −1). "Check my marks" scores the paper the way TestoZa's server
 * does: multiple-correct partial marks come from the product's own multiPartialScore,
 * numerical answers from isNumericalCorrect.
 *
 * Size: the phone is 376 px wide and as tall as --ja-fit-h; the side panel sits beside
 * it from 760 px, under it on narrow screens. The timer runs only while on screen.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import { EXAM, PAPER, type JadvQuestion, type NumericSetting, type OptionKey } from '@/guides/jadvData';
import { isNumericalCorrect } from '@/utils/numericalAnswer';
import { multiPartialScore } from '@/utils/multiCorrect';
import { DemoFrame, Phone, useInView, useWidth } from './replica';
import ExamScreen, { type Answer } from './examScreen';

const START = PAPER.minutes * 60;
const MULTI = EXAM.findIndex((q) => q.type === 'multiple');
const NUMERICAL = EXAM.findIndex((q) => q.type === 'numerical');
const MATCHING = EXAM.length - 1;

type Outcome = 'right' | 'partial' | 'wrong' | 'skip';

const blank = (a: Answer | undefined) => a === undefined || a === '' || (Array.isArray(a) && a.length === 0);

/** One question, marked as backend/app/services/scoring.py marks it. */
function markQuestion(q: JadvQuestion, a: Answer | undefined): { outcome: Outcome; marks: number } {
    if (blank(a)) return { outcome: 'skip', marks: 0 };
    if (q.type === 'numerical') return isNumericalCorrect(q.answer as NumericSetting, a) ? { outcome: 'right', marks: q.marks } : { outcome: 'wrong', marks: -q.negative };
    if (q.type === 'multiple') {
        const key = q.answer as OptionKey[];
        const picked = a as OptionKey[];
        if (picked.some((p) => !key.includes(p))) return { outcome: 'wrong', marks: -q.negative };
        if (picked.length === key.length) return { outcome: 'right', marks: q.marks };
        return { outcome: 'partial', marks: multiPartialScore(q, picked.length, key.length, q.marks) };
    }
    return a === q.answer ? { outcome: 'right', marks: q.marks } : { outcome: 'wrong', marks: -q.negative };
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export default function ExamDemo() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const width = useWidth(bodyRef);
    const wide = width >= 760;
    const visible = useInView(bodyRef, 0.3);

    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<Partial<Record<number, Answer>>>({});
    const [font, setFont] = useState(18);
    const [seconds, setSeconds] = useState(START);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        if (!visible || checked) return;
        const id = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
        return () => window.clearInterval(id);
    }, [visible, checked]);

    const changeFont = (delta: -2 | 2) => setFont((f) => Math.min(32, Math.max(12, f + delta)));
    const restart = () => {
        setIndex(0);
        setAnswers({});
        setFont(18);
        setSeconds(START);
        setChecked(false);
    };

    const results = EXAM.map((q, i) => markQuestion(q, answers[i]));
    const answered = results.filter((r) => r.outcome !== 'skip').length;
    const count = (o: Outcome) => results.filter((r) => r.outcome === o).length;
    const score = results.reduce((s, r) => s + r.marks, 0);
    const max = EXAM.reduce((s, q) => s + q.marks, 0);
    const q = EXAM[index];
    const mine = results[index];

    const tip = checked ? (
        <span key="t4">
            {score} of {max}: {count('right')} right, {count('partial')} partly right, {count('wrong')} wrong. Tap a question to see what it earned.
        </span>
    ) : answered === 0 ? (
        <span key="t0">Answer Question 1, then Save &amp; Next. The marks chip shows what each question is worth.</span>
    ) : index === MULTI && blank(answers[MULTI]) ? (
        <span key="t1">One or more options are correct: tick as many as you’re sure of. Each correct one is worth +1 on its own.</span>
    ) : index === NUMERICAL && blank(answers[NUMERICAL]) ? (
        <span key="t2">No options: type the number on the keypad, to two decimal places.</span>
    ) : index === MATCHING && blank(answers[MATCHING]) ? (
        <span key="t5">List-I and List-II are a table in the question; the four codings are the options.</span>
    ) : (
        <span key="t3">Answer what you like, skip what you don’t, then {wide ? 'check your marks' : 'tap Submit Test'}.</span>
    );

    const stepper = (
        <div className="ja-stepper" role="group" aria-label={`Text size, ${font} px`}>
            <button type="button" onClick={() => changeFont(-2)} disabled={font <= 12} aria-label="Smaller text">
                <Minus />
            </button>
            <i aria-hidden="true" />
            <button type="button" onClick={() => changeFont(2)} disabled={font >= 32} aria-label="Bigger text">
                <Plus />
            </button>
        </div>
    );

    const screen = (
        <ExamScreen
            q={q}
            index={index}
            answer={answers[index] ?? null}
            seconds={seconds}
            fontSize={font}
            live={!checked}
            onFont={changeFont}
            onAnswer={(v) => setAnswers((a) => ({ ...a, [index]: v }))}
            onClear={() =>
                setAnswers((a) => {
                    const next = { ...a };
                    delete next[index];
                    return next;
                })
            }
            onBack={() => setIndex((i) => Math.max(0, i - 1))}
            onNext={() => setIndex((i) => Math.min(EXAM.length - 1, i + 1))}
            onSubmit={() => setChecked(true)}
        />
    );

    return (
        <DemoFrame id="exam-screen" title="A JEE Advanced-style paper on a candidate’s phone" tip={tip} onRestart={restart} wide="md" caption="TestoZa’s exam screen at its real size, with six questions written for this page and marked the way TestoZa marks them, JEE Advanced partial marks included.">
            <div ref={bodyRef} className={`ja-exam${wide ? ' is-wide' : ''}`}>
                {wide ? (
                    <>
                        <div className="ja-exam-phone">
                            <Phone label="A candidate’s phone">{screen}</Phone>
                        </div>
                        <aside className="ja-exam-side" aria-label="Demo controls">
                            <p className="ja-mini-label">Questions</p>
                            <div className="ja-exam-chips" role="group" aria-label="Go to question">
                                {EXAM.map((x, i) => {
                                    const r = results[i];
                                    const state = checked ? r.outcome : r.outcome === 'skip' ? 'todo' : 'done';
                                    return (
                                        <button key={i} type="button" data-state={state} aria-current={i === index ? 'true' : undefined} onClick={() => setIndex(i)} aria-label={`Question ${i + 1}: ${x.section}`} title={x.topic}>
                                            {checked && state === 'right' ? <Check aria-hidden="true" /> : checked && state === 'wrong' ? <X aria-hidden="true" /> : i + 1}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="ja-exam-about" key={index}>
                                <p className="ja-exam-section">{q.section}</p>
                                <p className="ja-exam-topic">
                                    {q.subject} · <b>{q.topic}</b>
                                </p>
                                {checked && (
                                    <p className="ja-exam-earned" data-outcome={mine.outcome}>
                                        <b>{signed(mine.marks)}</b> {mine.outcome === 'skip' ? 'Not answered.' : `Answer: ${q.answerPlain}.`}
                                    </p>
                                )}
                            </div>
                            <div className="ja-stepper-row">
                                <span className="ja-stepper-label">Text size</span>
                                <span className="ja-stepper-value">{font} px</span>
                                {stepper}
                            </div>
                            {checked ? (
                                <div className="ja-exam-score" aria-live="polite">
                                    <p>
                                        <b>
                                            {score} / {max}
                                        </b>
                                        <span>
                                            {count('right')} right · {count('partial')} partial · {count('wrong')} wrong · {count('skip')} skipped
                                        </span>
                                    </p>
                                    <button type="button" className="ja-action" onClick={restart}>
                                        Try again
                                    </button>
                                </div>
                            ) : (
                                <button type="button" className="ja-action" onClick={() => setChecked(true)} disabled={answered === 0}>
                                    Check my marks ({answered}/{EXAM.length})
                                </button>
                            )}
                        </aside>
                    </>
                ) : (
                    <>
                        {/* On a phone the reader's own screen is the phone: no bezel, one row of controls. */}
                        <div className="ja-exam-row">
                            <span className="ja-exam-row-label">
                                {checked ? (
                                    <>
                                        <b>
                                            {score} / {max}
                                        </b>{' '}
                                        · Q{index + 1}: {signed(mine.marks)}
                                    </>
                                ) : (
                                    <>
                                        Q{index + 1} · {q.section.replace(/^Section \d · /, '')}
                                    </>
                                )}
                            </span>
                            {stepper}
                        </div>
                        <div className="ja-exam-card ja-screen" role="group" aria-label="A candidate’s phone">
                            {screen}
                        </div>
                    </>
                )}
            </div>
        </DemoFrame>
    );
}
