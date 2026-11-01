/**
 * math-exam: a student's phone running a six-question maths test on TestoZa's exam
 * screen (examScreen.tsx), forked from the Hindi guide's exam demo. The reader answers,
 * moves between questions, makes the text bigger (the screen's own faint − / +, or the
 * stepper beside it) to see the maths grow with it, types a numerical answer on the
 * product's keypad, then checks the marks (+4 / −1, marked as TestoZa marks them).
 *
 * Size: the phone is 376 px wide and as tall as --mt-fit-h; the side panel sits beside
 * it from 760 px, under it on narrow screens. The timer runs only while on screen.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import { EXAM, PAPER, type MathQuestion } from '@/guides/mathData';
import { isNumericalCorrect } from '@/utils/numericalAnswer';
import { DemoFrame, Phone, useInView, useWidth } from './replica';
import ExamScreen, { type Answer } from './examScreen';

const START = PAPER.minutes * 60;
const NUMERICAL = EXAM.findIndex((q) => q.type === 'numerical');

const isRight = (q: MathQuestion, a: Answer | undefined) =>
    a === undefined || a === '' ? false : q.type === 'numerical' ? isNumericalCorrect({ exactMatch: true, exactAnswers: String(q.answer) }, a) : a === q.answer;

export default function ExamDemo() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const width = useWidth(bodyRef);
    const wide = width >= 760;
    const visible = useInView(bodyRef, 0.3);

    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<Partial<Record<number, Answer>>>({});
    const [font, setFont] = useState(18);
    const [fontChanged, setFontChanged] = useState(false);
    const [seconds, setSeconds] = useState(START);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        if (!visible || checked) return;
        const id = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
        return () => window.clearInterval(id);
    }, [visible, checked]);

    const changeFont = (delta: -2 | 2) => {
        setFont((f) => Math.min(32, Math.max(12, f + delta)));
        setFontChanged(true);
    };
    const restart = () => {
        setIndex(0);
        setAnswers({});
        setFont(18);
        setFontChanged(false);
        setSeconds(START);
        setChecked(false);
    };

    const isAnswered = (i: number) => answers[i] !== undefined && answers[i] !== '';
    const answered = EXAM.filter((_, i) => isAnswered(i)).length;
    const right = EXAM.filter((q, i) => isRight(q, answers[i])).length;
    const wrong = answered - right;
    const score = right * PAPER.right - wrong * PAPER.wrong;
    const max = EXAM.length * PAPER.right;

    const tip = checked ? (
        <span key="t4">
            {right} right, {wrong} wrong: {score} of {max} marks, with −{PAPER.wrong} for each wrong answer.
        </span>
    ) : answered === 0 ? (
        <span key="t0">Tap an option, then Save &amp; Next.</span>
    ) : !fontChanged ? (
        <span key="t1">Make the text bigger: the faint − + at the top right of the question{wide ? '' : ', or the buttons above'}. The maths grows too.</span>
    ) : index === NUMERICAL && !isAnswered(NUMERICAL) ? (
        <span key="t2">No options here: type the number on the keypad, as in a computer-based exam.</span>
    ) : (
        <span key="t3">Answer all six, then {wide ? 'check your marks' : 'tap Submit Test'}.</span>
    );

    const sizeStepper = (
        <div className="mt-stepper-row">
            <span className="mt-stepper-label">Text size</span>
            <span className="mt-stepper-value">{font} px</span>
            <div className="mt-stepper">
                <button type="button" onClick={() => changeFont(-2)} disabled={font <= 12} aria-label="Smaller text">
                    <Minus />
                </button>
                <i aria-hidden="true" />
                <button type="button" onClick={() => changeFont(2)} disabled={font >= 32} aria-label="Bigger text">
                    <Plus />
                </button>
            </div>
        </div>
    );

    const screen = (
        <ExamScreen
            q={EXAM[index]}
            index={index}
            answer={answers[index] ?? null}
            seconds={seconds}
            fontSize={font}
            live={!checked}
            nudgeFont={answered > 0 && !fontChanged}
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
        <DemoFrame id="exam-screen" title="A maths test on a student’s phone" tip={tip} onRestart={restart} wide="md" caption={`TestoZa’s exam screen at its real size, with six questions written for this page. Marking: +${PAPER.right} for a right answer, −${PAPER.wrong} for a wrong one.`}>
            <div ref={bodyRef} className={`mt-exam${wide ? ' is-wide' : ''}`}>
                {wide ? (
                    <>
                        <div className="mt-exam-phone">
                            <Phone label="A student’s phone">{screen}</Phone>
                        </div>
                        <aside className="mt-exam-side" aria-label="Demo controls">
                            <p className="mt-mini-label">On the phone</p>
                            {sizeStepper}
                            <p className="mt-mini-label">Questions</p>
                            <div className="mt-exam-chips" role="group" aria-label="Go to question">
                                {EXAM.map((q, i) => {
                                    const state = checked ? (isAnswered(i) ? (isRight(q, answers[i]) ? 'right' : 'wrong') : 'skip') : isAnswered(i) ? 'done' : 'todo';
                                    return (
                                        <button key={i} type="button" data-state={state} aria-current={i === index ? 'true' : undefined} onClick={() => setIndex(i)} aria-label={`Question ${i + 1}: ${q.topic}`} title={q.topic}>
                                            {checked && state === 'right' ? <Check aria-hidden="true" /> : checked && state === 'wrong' ? <X aria-hidden="true" /> : i + 1}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="mt-exam-topic">
                                Question {index + 1}: <b>{EXAM[index].topic}</b>
                            </p>
                            {checked ? (
                                <div className="mt-exam-score" aria-live="polite">
                                    <p>
                                        <b>
                                            {score} / {max}
                                        </b>
                                        <span>
                                            {right} right · {wrong} wrong · {EXAM.length - answered} skipped
                                        </span>
                                    </p>
                                    <button type="button" className="mt-action" onClick={restart}>
                                        Try again
                                    </button>
                                </div>
                            ) : (
                                <button type="button" className="mt-action" onClick={() => setChecked(true)} disabled={answered === 0}>
                                    Check my marks ({answered}/{EXAM.length})
                                </button>
                            )}
                        </aside>
                    </>
                ) : (
                    <>
                        {/* On a phone the reader's own screen is the phone: no bezel, one row of controls. */}
                        <div className="mt-exam-row">
                            <span className="mt-exam-row-label">
                                {checked ? (
                                    <b>
                                        {score} / {max}
                                    </b>
                                ) : (
                                    <>Text size {font} px</>
                                )}
                            </span>
                            <div className="mt-stepper" role="group" aria-label={`Text size, ${font} px`}>
                                <button type="button" onClick={() => changeFont(-2)} disabled={font <= 12} aria-label="Smaller text">
                                    <Minus />
                                </button>
                                <i aria-hidden="true" />
                                <button type="button" onClick={() => changeFont(2)} disabled={font >= 32} aria-label="Bigger text">
                                    <Plus />
                                </button>
                            </div>
                        </div>
                        <div className="mt-exam-card mt-screen" role="group" aria-label="A student’s phone">
                            {screen}
                        </div>
                    </>
                )}
            </div>
        </DemoFrame>
    );
}
