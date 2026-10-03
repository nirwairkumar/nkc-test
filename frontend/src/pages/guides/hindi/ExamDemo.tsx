/**
 * hindi-exam-screen: a student's phone running six questions of the example paper on
 * TestoZa's exam screen (examScreen.tsx). The reader answers, moves between questions,
 * changes the text size (the screen's own faint − / +, or the stepper beside it) and
 * switches the paper between Hindi and bilingual, then checks the marks (+2 / −0.5).
 *
 * Size: the phone is 376 px wide and as tall as --ht-fit-h; the side panel sits beside
 * it from 760 px, under it on narrow screens. The timer runs only while on screen.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import { PAPER, QUESTIONS, type OptionKey } from '@/guides/hindiData';
import { DemoFrame, Phone, useInView, useWidth } from './replica';
import ExamScreen, { type PaperLanguage } from './examScreen';

const START = PAPER.minutes * 60;

export default function ExamDemo() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const width = useWidth(bodyRef);
    const wide = width >= 760;
    const visible = useInView(bodyRef, 0.3);

    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<Partial<Record<number, OptionKey>>>({});
    const [lang, setLang] = useState<PaperLanguage>('hi');
    const [font, setFont] = useState(18);
    const [fontChanged, setFontChanged] = useState(false);
    const [langChanged, setLangChanged] = useState(false);
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
    const changeLang = (l: PaperLanguage) => {
        setLang(l);
        setLangChanged(true);
    };
    const restart = () => {
        setIndex(0);
        setAnswers({});
        setLang('hi');
        setFont(18);
        setFontChanged(false);
        setLangChanged(false);
        setSeconds(START);
        setChecked(false);
    };

    const answered = Object.keys(answers).length;
    const right = QUESTIONS.filter((q, i) => answers[i] === q.answer).length;
    const wrong = QUESTIONS.filter((q, i) => answers[i] && answers[i] !== q.answer).length;
    const score = right * PAPER.right - wrong * PAPER.wrong;
    const max = QUESTIONS.length * PAPER.right;

    const tip = checked ? (
        <span key="t4">
            {right} right, {wrong} wrong: {score} of {max} marks, with −{PAPER.wrong} for each wrong answer.
        </span>
    ) : answered === 0 ? (
        <span key="t0">Tap an option, then Save &amp; Next.</span>
    ) : !fontChanged ? (
        <span key="t1">Make the text bigger: the faint − + at the top right of the question{wide ? '' : ', or the buttons above'}.</span>
    ) : !langChanged ? (
        <span key="t2">Now switch the paper to Hindi + English and see the length.</span>
    ) : (
        <span key="t3">Answer all six, then {wide ? 'check your marks' : 'tap Submit Test'}.</span>
    );

    const langSeg = (
        <div className="ht-seg ht-seg--full" style={{ ['--n' as string]: 2, ['--i' as string]: lang === 'hi' ? 0 : 1 }} role="group" aria-label="Paper language">
            <button type="button" aria-pressed={lang === 'hi'} onClick={() => changeLang('hi')}>
                Hindi
            </button>
            <button type="button" aria-pressed={lang === 'bi'} onClick={() => changeLang('bi')} className={fontChanged && !langChanged ? 'ht-nudge-text' : undefined}>
                Hindi + English
            </button>
        </div>
    );

    const sizeStepper = (
        <div className="ht-stepper-row">
            <span className="ht-stepper-label">Text size</span>
            <span className="ht-stepper-value">{font} px</span>
            <div className="ht-stepper">
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
            q={QUESTIONS[index]}
            index={index}
            lang={lang}
            selected={answers[index] ?? null}
            seconds={seconds}
            fontSize={font}
            live={!checked}
            nudgeFont={answered > 0 && !fontChanged}
            onFont={changeFont}
            onSelect={(k) => setAnswers((a) => ({ ...a, [index]: k }))}
            onClear={() =>
                setAnswers((a) => {
                    const next = { ...a };
                    delete next[index];
                    return next;
                })
            }
            onBack={() => setIndex((i) => Math.max(0, i - 1))}
            onNext={() => setIndex((i) => Math.min(QUESTIONS.length - 1, i + 1))}
            onSubmit={() => setChecked(true)}
        />
    );

    return (
        <DemoFrame id="exam-screen" title="The test on a student’s phone" tip={tip} onRestart={restart} wide="md" caption="TestoZa’s exam screen at its real size, with six questions from a Hindi-medium general science test. Marking: +2 for a right answer, −0.5 for a wrong one.">
            <div ref={bodyRef} className={`ht-exam${wide ? ' is-wide' : ''}`}>
                {wide ? (
                    <>
                        <div className="ht-exam-phone">
                            <Phone label="A student’s phone">{screen}</Phone>
                        </div>
                        <aside className="ht-exam-side" aria-label="Demo controls">
                            <p className="ht-mini-label">Paper</p>
                            {langSeg}
                            {sizeStepper}
                            <p className="ht-mini-label">Questions</p>
                            <div className="ht-exam-chips" role="group" aria-label="Go to question">
                                {QUESTIONS.map((q, i) => {
                                    const a = answers[i];
                                    const state = checked ? (a ? (a === q.answer ? 'right' : 'wrong') : 'skip') : a ? 'done' : 'todo';
                                    return (
                                        <button key={i} type="button" data-state={state} aria-current={i === index ? 'true' : undefined} onClick={() => setIndex(i)} aria-label={`Question ${i + 1}`}>
                                            {checked && state === 'right' ? <Check aria-hidden="true" /> : checked && state === 'wrong' ? <X aria-hidden="true" /> : i + 1}
                                        </button>
                                    );
                                })}
                            </div>
                            {checked ? (
                                <div className="ht-exam-score" aria-live="polite">
                                    <p>
                                        <b>
                                            {score} / {max}
                                        </b>
                                        <span>
                                            {right} right · {wrong} wrong · {QUESTIONS.length - right - wrong} skipped
                                        </span>
                                    </p>
                                    <button type="button" className="ht-action" onClick={restart}>
                                        Try again
                                    </button>
                                </div>
                            ) : (
                                <button type="button" className="ht-action" onClick={() => setChecked(true)} disabled={answered === 0}>
                                    Check my marks ({answered}/{QUESTIONS.length})
                                </button>
                            )}
                        </aside>
                    </>
                ) : (
                    <>
                        {/* On a phone the reader's own screen is the phone: no bezel, one row of controls. */}
                        <div className="ht-exam-row">
                            {langSeg}
                            <div className="ht-stepper" role="group" aria-label={`Text size, ${font} px`}>
                                <button type="button" onClick={() => changeFont(-2)} disabled={font <= 12} aria-label="Smaller text">
                                    <Minus />
                                </button>
                                <i aria-hidden="true" />
                                <button type="button" onClick={() => changeFont(2)} disabled={font >= 32} aria-label="Bigger text">
                                    <Plus />
                                </button>
                            </div>
                        </div>
                        <div className="ht-exam-card ht-screen" role="group" aria-label="A student’s phone">
                            {screen}
                        </div>
                    </>
                )}
            </div>
        </DemoFrame>
    );
}
