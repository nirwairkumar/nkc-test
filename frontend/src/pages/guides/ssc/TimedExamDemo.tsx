/**
 * ssc-exam: a twelve-question SSC CGL Tier 1 paper with timed sections on TestoZa's exam
 * screen (examScreen.tsx). The open section comes from the same code TestPage uses
 * (utils/sectionTiming.ts): sections open in order, each closes when its time is up, a
 * closed or later section can't be reached, Save & Next stops at the section's last
 * question, and the toasts say what TestPage says. Each section has 45 seconds here, so the
 * reader sees one close; the real paper gives 15 minutes. Submit shows ResultsPage's cards.
 *
 * Size: from 900 px the desktop layout fills a browser window as tall as --sg-fit-h with a
 * timeline beside it; narrower, the phone layout fills a card under a one-line timeline.
 * The clock runs only after Start, and only while the demo is on screen.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, FastForward, Lock, Play } from 'lucide-react';
import { DEMO_MARKS, DEMO_SECTION_SECONDS, DEMO_SECTIONS, DEMO_TITLE, type OptionKey } from '@/guides/sscData';
import { openSection, sectionRanges } from '@/utils/sectionTiming';
import { BrowserWindow, DemoFrame, Toasts, useInView, useToasts, useWidth } from './replica';
import ExamScreen, { type Control, type PillState } from './examScreen';
import ResultScreen, { type SectionResult } from './resultScreen';
import { formatExamTime } from './examUtils';

const MINUTES = DEMO_SECTIONS.map(() => DEMO_SECTION_SECONDS / 60);
const TOTAL = DEMO_SECTIONS.length * DEMO_SECTION_SECONDS;
const QUESTIONS = DEMO_SECTIONS.flatMap((s) => s.questions);
const SECTIONS = DEMO_SECTIONS.map((s) => ({ name: s.name, count: s.questions.length }));
const RANGES = sectionRanges(DEMO_SECTIONS);
/** Seconds the sections after each one need. */
const AFTER = MINUTES.map((_, i) => MINUTES.slice(i + 1).reduce((a, b) => a + b, 0) * 60);
const sectionOf = (index: number) => RANGES.findIndex((r) => index >= r.start && index <= r.end);
const name = (i: number) => DEMO_SECTIONS[i]?.name ?? '';
/** TestPage: a fifth of the section, at most five minutes. */
const CRITICAL = Math.min(300, Math.round(DEMO_SECTION_SECONDS * 0.2));

export default function TimedExamDemo() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const width = useWidth(bodyRef);
    const wide = width >= 900;
    const visible = useInView(bodyRef, 0.3);
    const { items: toasts, push, clear } = useToasts(3600);

    const [started, setStarted] = useState(false);
    const [left, setLeft] = useState(TOTAL);
    const [floor, setFloor] = useState(0);
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState<Partial<Record<number, OptionKey>>>({});
    const [marked, setMarked] = useState<Set<number>>(new Set());
    const [visited, setVisited] = useState<Set<number>>(new Set([0]));
    const [hidden, setHidden] = useState(false);
    const [sheet, setSheet] = useState(false);
    const [dialog, setDialog] = useState<'submit' | 'timeup' | null>(null);
    const [done, setDone] = useState(false);

    const open = openSection(MINUTES, left, floor);
    const range = RANGES[open.index];
    const announced = useRef(0);

    // The paper's one clock, as in TestPage. It stops at zero and the time's-up dialog opens.
    useEffect(() => {
        if (!started || done || !visible || left <= 0) return;
        const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
        return () => window.clearInterval(id);
    }, [started, done, visible, left]);
    useEffect(() => {
        if (started && left === 0 && !done) setDialog('timeup');
    }, [started, left, done]);

    // A section closing: move on, never back, and say so (TestPage's toast).
    useEffect(() => {
        if (open.index > floor) setFloor(open.index);
        if (current < range.start || current > range.end) setCurrent(range.start);
        if (open.index > announced.current) {
            push(`${name(announced.current)} is closed. ${name(open.index)} has started: ${DEMO_SECTION_SECONDS} sec.`, 'info');
            announced.current = open.index;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open.index]);

    useEffect(() => {
        setVisited((v) => (v.has(current) ? v : new Set(v).add(current)));
    }, [current]);

    const restart = () => {
        setStarted(false);
        setLeft(TOTAL);
        setFloor(0);
        setCurrent(0);
        setAnswers({});
        setMarked(new Set());
        setVisited(new Set([0]));
        setHidden(false);
        setSheet(false);
        setDialog(null);
        setDone(false);
        announced.current = 0;
        clear();
    };

    const canReach = (i: number) => i >= range.start && i <= range.end;
    const jump = (i: number) => {
        if (!canReach(i)) {
            const target = sectionOf(i);
            push(target < open.index ? `${name(target)} is closed. Its time is over.` : `${name(target)} opens when ${name(open.index)}’s time is over.`, 'info');
            return false;
        }
        setCurrent(i);
        return true;
    };
    const next = () => {
        if (current === QUESTIONS.length - 1) return push('This is the last question. Please click Submit Test at the top right.', 'info');
        if (current >= range.end) return push(`This is the last question of ${name(open.index)}. ${name(open.index + 1)} opens when this section’s time is over.`, 'info');
        setCurrent((c) => c + 1);
    };

    const onControl = (c: Control) => {
        if (!started || done) return;
        if (c.startsWith('opt-')) {
            const key = c.slice(4) as OptionKey;
            setAnswers((a) => ({ ...a, [current]: key }));
        } else if (c.startsWith('tab-')) {
            jump(RANGES[Number(c.slice(4))].start);
        } else if (c.startsWith('pal-')) {
            if (jump(Number(c.slice(4)))) setSheet(false);
        } else if (c === 'save') next();
        else if (c === 'back') {
            if (current > range.start) setCurrent((x) => x - 1);
        } else if (c === 'clear') {
            setAnswers((a) => {
                const n = { ...a };
                delete n[current];
                return n;
            });
        } else if (c === 'review' || c === 'flag') {
            if (c === 'flag' && answers[current]) {
                setMarked((m) => new Set(m).add(current));
                next();
            } else {
                setMarked((m) => {
                    const n = new Set(m);
                    if (n.has(current)) n.delete(current);
                    else n.add(current);
                    return n;
                });
            }
        } else if (c === 'ansrev') {
            setMarked((m) => new Set(m).add(current));
            next();
        } else if (c === 'eye') setHidden((h) => !h);
        else if (c === 'fab') setSheet(true);
        else if (c === 'close-sheet') setSheet(false);
        else if (c === 'submit') setDialog('submit');
        else if (c === 'cancel') setDialog((d) => (d === 'timeup' ? d : null));
        else if (c === 'confirm') {
            setDialog(null);
            setDone(true);
            clear();
        }
    };

    // Skip to the open section's last three seconds, so nobody has to wait to see it close.
    const skip = () => {
        if (!started || done) return;
        setLeft((s) => Math.min(s, AFTER[open.index] + 3));
    };

    const states: PillState[] = QUESTIONS.map((_, i) => {
        const a = !!answers[i];
        const m = marked.has(i);
        return a && m ? 'revans' : m ? 'rev' : a ? 'ans' : visited.has(i) ? 'na' : 'nv';
    });

    const results: SectionResult[] = useMemo(
        () =>
            DEMO_SECTIONS.map((s, si) => {
                let correct = 0;
                let wrong = 0;
                s.questions.forEach((q, k) => {
                    const a = answers[RANGES[si].start + k];
                    if (!a) return;
                    if (a === q.answer) correct++;
                    else wrong++;
                });
                return {
                    name: s.name,
                    totalQ: s.questions.length,
                    correct,
                    wrong,
                    skipped: s.questions.length - correct - wrong,
                    score: correct * DEMO_MARKS.plus - wrong * DEMO_MARKS.minus,
                    maxScore: s.questions.length * DEMO_MARKS.plus,
                };
            }),
        [answers],
    );
    const total = results.reduce((s, r) => s + r.score, 0);

    const tip = done ? (
        <span key="t3">Your result, marked +2 and −0.5. Restart to try it with a different plan for each section.</span>
    ) : !started ? (
        <span key="t0">Four sections, each with its own clock. Press Start, then try to open another section.</span>
    ) : open.index === 0 && Object.keys(answers).length === 0 ? (
        <span key="t1">Answer a question, then tap a later section’s tab: it won’t open early.</span>
    ) : open.index === 0 ? (
        <span key="t2">Skip to the last seconds of Reasoning to watch it close.</span>
    ) : (
        <span key="t4">Earlier sections are closed now. Finish the paper or submit it.</span>
    );

    const screen = done ? (
        <ResultScreen title={DEMO_TITLE} sections={results} wide={wide} />
    ) : (
        <ExamScreen
            layout={wide ? 'desktop' : 'phone'}
            title={DEMO_TITLE}
            sections={SECTIONS}
            current={current}
            question={QUESTIONS[current]}
            selected={answers[current]}
            states={states}
            seconds={open.secondsLeft}
            openSection={open.index}
            criticalSeconds={CRITICAL}
            marks={DEMO_MARKS}
            timeHidden={hidden}
            sheetOpen={sheet}
            dialog={dialog}
            live={started}
            paletteWidth={240}
            overlay={<Toasts items={toasts} />}
            onControl={onControl}
        />
    );

    const startCard = !started && !done && (
        <div className="sg-tx-start" role="group" aria-label="Start the paper">
            <div className="sg-tx-start-card">
                <p className="sg-tx-start-title">{DEMO_TITLE}</p>
                <p className="sg-tx-start-sub">
                    12 questions in 4 timed sections, +{DEMO_MARKS.plus} / −{DEMO_MARKS.minus}. Each section has {DEMO_SECTION_SECONDS} seconds here; the real paper gives 15 minutes.
                </p>
                <button type="button" className="sg-action" onClick={() => setStarted(true)}>
                    <Play aria-hidden="true" /> Start the paper
                </button>
            </div>
        </div>
    );

    const timeline = (
        <ol className="sg-tx-line" aria-label="Sections">
            {DEMO_SECTIONS.map((s, i) => {
                const state = done || i < open.index ? 'closed' : i === open.index ? 'open' : 'next';
                const secs = state === 'open' ? open.secondsLeft : state === 'next' ? DEMO_SECTION_SECONDS : 0;
                return (
                    <li key={s.name} data-state={state}>
                        <span className="sg-tx-icon" aria-hidden="true">
                            {state === 'closed' ? <Check /> : state === 'next' ? <Lock /> : <i />}
                        </span>
                        <span className="sg-tx-name">
                            <b>{wide ? s.name : s.short}</b>
                            {wide && <small>{state === 'closed' ? 'Closed' : state === 'open' ? (started && !done ? 'Open now' : 'Opens first') : 'Not open yet'}</small>}
                        </span>
                        <span className="sg-tx-time">{state !== 'closed' ? formatExamTime(secs) : done ? `${results[i].score} / ${results[i].maxScore}` : `${s.questions.length - results[i].skipped} / ${s.questions.length}`}</span>
                        {state === 'open' && <i className="sg-tx-bar" style={{ transform: `scaleX(${secs / DEMO_SECTION_SECONDS})` }} />}
                    </li>
                );
            })}
        </ol>
    );

    const skipButton = (
        <button type="button" className="sg-tx-skip" onClick={skip} disabled={!started || done || open.secondsLeft <= 3}>
            <FastForward aria-hidden="true" /> {wide ? 'Skip to its last seconds' : 'Skip'}
        </button>
    );

    return (
        <DemoFrame
            id="timed-paper"
            title="An SSC CGL Tier 1 paper with timed sections"
            tip={tip}
            onRestart={restart}
            wide="lg"
            caption="TestoZa’s exam screen at its real size, running the same timed-sections code as a real paper. Questions written for this page, in Hindi and English except the English section."
        >
            <div ref={bodyRef} className={`sg-tx${wide ? ' is-wide' : ''}`}>
                {wide ? (
                    <>
                        <BrowserWindow url="app.testoza.com/live/ssc-cgl-mock-07" className="sg-tx-window">
                            <div className="sg-tx-screen">
                                {screen}
                                {startCard}
                            </div>
                        </BrowserWindow>
                        <aside className="sg-tx-side" aria-label="The sections’ clocks">
                            <p className="sg-mini-label">Sections</p>
                            {timeline}
                            {skipButton}
                            {done ? (
                                <p className="sg-tx-score" aria-live="polite">
                                    <b>
                                        {total} / {QUESTIONS.length * DEMO_MARKS.plus}
                                    </b>
                                    <span>Unused seconds in a section were lost, as in the exam.</span>
                                </p>
                            ) : (
                                <p className="sg-tx-note">Finished a section early? You wait: the next one opens only when this one’s time is up.</p>
                            )}
                        </aside>
                    </>
                ) : (
                    <>
                        <div className="sg-tx-row">
                            {timeline}
                            {skipButton}
                        </div>
                        <div className="sg-exam-card sg-screen sg-tx-card" role="group" aria-label="A candidate’s phone">
                            {screen}
                            {startCard}
                        </div>
                    </>
                )}
            </div>
        </DemoFrame>
    );
}
