/**
 * Hero for /cbt-exam-software: a tablet running an NTA-style CBT in TestoZa's
 * Standard Mode. A short scripted exam plays while it is on screen: the student
 * answers and saves, marks questions for review, skips one, types a numerical
 * answer on the keypad, runs out of time and submits.
 *
 * Labels, colours and layout follow the real exam screen (src/pages/TestPage.tsx
 * and the landing page's LiveTestShowcase): palette states Not Visited / Not
 * Answered / Answered / Review / Ans & Review, buttons Back / Clear / Review /
 * Ans & Review / Save & Next, +4 | −1 marks, ⚠ warnings badge, virtual keypad.
 * Questions and numbers are examples. With reduced motion it shows a still exam.
 */
import { useEffect, useRef, useState } from 'react';

type PillState = 'nv' | 'na' | 'ans' | 'rev' | 'revans';
type Btn = 'save' | 'ansrev' | 'review' | 'clear' | 'pal21' | null;

interface Question {
    n: number;
    kind: 'Single Choice' | 'Numerical';
    text: string;
    options?: string[];
}

const QUESTIONS: Record<number, Question> = {
    15: {
        n: 15,
        kind: 'Single Choice',
        text: 'A car speeds up from 10 m/s to 30 m/s in 5 s. Its average acceleration is',
        options: ['2 m/s²', '4 m/s²', '6 m/s²', '8 m/s²'],
    },
    16: { n: 16, kind: 'Single Choice', text: 'The SI unit of impulse is', options: ['N', 'N·s', 'N/s', 'J'] },
    17: {
        n: 17,
        kind: 'Single Choice',
        text: 'Two resistors of 3 Ω and 6 Ω are joined in parallel. The equivalent resistance is',
        options: ['1 Ω', '2 Ω', '4.5 Ω', '9 Ω'],
    },
    18: {
        n: 18,
        kind: 'Single Choice',
        text: 'Which quantity stays constant for a body in uniform circular motion?',
        options: ['Velocity', 'Acceleration', 'Speed', 'Momentum'],
    },
    21: {
        n: 21,
        kind: 'Numerical',
        text: 'A ball is dropped from a height of 20 m. Taking g = 10 m/s², the time (in s) it takes to reach the ground is',
    },
};

/** Physics 1–14 before the script starts (a realistic mix). */
const START: PillState[] = ['ans', 'ans', 'na', 'ans', 'ans', 'revans', 'ans', 'ans', 'na', 'ans', 'rev', 'ans', 'ans', 'ans'];

interface Frame {
    q: number;
    pick?: number;
    typed?: string;
    press?: Btn;
    /** Status changes applied when this frame starts (1-based question → state). */
    set?: Record<number, PillState>;
    phase?: 'exam' | 'timeup' | 'done';
    ms: number;
}

const SCRIPT: Frame[] = [
    { q: 15, ms: 1100 },
    { q: 15, pick: 1, ms: 900 },
    { q: 15, pick: 1, press: 'save', ms: 650 },
    { q: 16, set: { 15: 'ans' }, ms: 900 },
    { q: 16, pick: 1, ms: 800 },
    { q: 16, pick: 1, press: 'ansrev', ms: 650 },
    { q: 17, set: { 16: 'revans' }, ms: 1000 },
    { q: 17, press: 'review', ms: 650 },
    { q: 18, set: { 17: 'rev' }, ms: 1000 },
    { q: 18, press: 'save', ms: 650 },
    { q: 19, set: { 18: 'na' }, ms: 700 },
    { q: 19, press: 'pal21', ms: 650 },
    { q: 21, set: { 19: 'na' }, ms: 900 },
    { q: 21, typed: '2', ms: 900 },
    { q: 21, typed: '2', press: 'save', ms: 650 },
    { q: 22, set: { 21: 'ans' }, ms: 1300 },
    { q: 22, phase: 'timeup', ms: 2300 },
    { q: 22, phase: 'done', ms: 3400 },
];

const TOTAL_Q = 75;
/** Size the exam UI is drawn at before scaling (px). */
const UI_W = 720;
const START_SECONDS = 2 * 3600 + 14 * 60 + 36;

const clock = (s: number) =>
    [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((v) => String(v).padStart(2, '0')).join(':');

function statesAt(step: number): PillState[] {
    const pills: PillState[] = Array.from({ length: 25 }, (_, i) => START[i] ?? 'nv');
    for (let i = 0; i <= step; i++) {
        const set = SCRIPT[i].set;
        if (set) for (const [q, st] of Object.entries(set)) pills[Number(q) - 1] = st;
    }
    return pills;
}

const FlagIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
);

export default function CbtTablet() {
    const rootRef = useRef<HTMLDivElement>(null);
    const screenRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.7);
    const [step, setStep] = useState(0);
    const [running, setRunning] = useState(false);
    const [seconds, setSeconds] = useState(START_SECONDS);

    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
            setStep(15); // a mid-exam still: Q22 on screen, palette filled in
            return;
        }
        const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.2 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    // The exam UI is drawn UI_W pixels wide (height set in CSS) and scaled to fit the screen.
    useEffect(() => {
        const el = screenRef.current;
        if (!el) return;
        const fit = () => setScale(el.clientWidth / UI_W);
        fit();
        if (!('ResizeObserver' in window)) return;
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Advance the script while visible; restart after the summary.
    useEffect(() => {
        if (!running) return;
        const id = window.setTimeout(() => {
            setStep((s) => {
                if (s + 1 >= SCRIPT.length) {
                    setSeconds(START_SECONDS);
                    return 0;
                }
                return s + 1;
            });
        }, SCRIPT[step].ms);
        return () => window.clearTimeout(id);
    }, [running, step]);

    const frame = SCRIPT[step];
    const phase = frame.phase ?? 'exam';

    // The exam clock ticks during the exam and reads zero once time is up.
    useEffect(() => {
        if (!running || phase !== 'exam') return;
        const id = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
        return () => window.clearInterval(id);
    }, [running, phase]);

    const pills = statesAt(step);
    const question = QUESTIONS[frame.q];
    const counts = {
        nv: TOTAL_Q - 25 + pills.filter((p) => p === 'nv').length,
        na: pills.filter((p) => p === 'na').length,
        ans: pills.filter((p) => p === 'ans').length,
        rev: pills.filter((p) => p === 'rev').length,
        revans: pills.filter((p) => p === 'revans').length,
    };
    const pressed = (b: Btn) => (frame.press === b ? ' is-pressed' : '');

    return (
        <div
            className="cbt-stage"
            ref={rootRef}
            role="img"
            aria-label="Animation: a student takes an NTA-style computer-based test on a tablet in TestoZa, saving answers, marking questions for review, typing a numerical answer on the keypad, and submitting when time is up."
        >
            <div className={`cbt-chip cbt-chip--a${phase === 'exam' ? ' is-on' : ''}`} aria-hidden="true">
                <i>▦</i> Standard Mode · NTA-style
            </div>
            <div className={`cbt-chip cbt-chip--b${phase === 'done' ? ' is-on' : ''}`} aria-hidden="true">
                <i>✓</i> Scored on the server
            </div>

            <div className="cbt-tablet" aria-hidden="true">
                <div className="cbt-cam" />
                <div className="cbt-screen" ref={screenRef}>
                    <div className="cbt-fit">
                        <div className="cbt-ui" style={{ transform: `scale(${scale})` }}>
                            <div className="cbt-inst">
                                <span className="cbt-inst-logo">T</span> Your institute name here
                            </div>
                            <div className="cbt-bar">
                                <span className="cbt-test-name">JEE Main pattern · Full mock 12</span>
                                <span className={`cbt-timer${phase !== 'exam' ? ' is-zero' : ''}`}>⏱ {phase === 'exam' ? clock(seconds) : '00:00:00'}</span>
                                <span className="cbt-viol">⚠ 0/3</span>
                                <span className="cbt-online" />
                                <span className="cbt-submit">Submit Test</span>
                            </div>
                            <div className="cbt-body">
                                <div className="cbt-main">
                                    <div className="cbt-tabs">
                                        <span className="is-on">Physics</span>
                                        <span>Chemistry</span>
                                        <span>Mathematics</span>
                                    </div>
                                    {question ? (
                                        <div className="cbt-q" key={question.n}>
                                            <div className="cbt-q-hdr">
                                                <span className="cbt-q-num">Question {question.n}</span>
                                                <span className="cbt-q-kind">{question.kind}</span>
                                                <span className="cbt-marks">
                                                    <b>+4</b> | <em>−1</em>
                                                </span>
                                            </div>
                                            <p className="cbt-q-text">{question.text}</p>
                                            {question.options ? (
                                                <div className="cbt-opts">
                                                    {question.options.map((o, i) => (
                                                        <div key={o} className={`cbt-opt${frame.pick === i ? ' is-picked' : ''}`}>
                                                            <span>{'ABCD'[i]}</span>
                                                            {o}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="cbt-num">
                                                    <div className="cbt-num-field">{frame.typed ?? ''}</div>
                                                    <div className="cbt-pad">
                                                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '−'].map((k) => (
                                                            <span key={k} className={frame.typed === k && !frame.press ? 'is-pressed' : undefined}>
                                                                {k}
                                                            </span>
                                                        ))}
                                                        <span className="cbt-pad-ac">AC</span>
                                                        <span className="cbt-pad-back">⌫</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="cbt-q cbt-q--blank" key="blank">
                                            <div className="cbt-q-hdr">
                                                <span className="cbt-q-num">Question {frame.q}</span>
                                                <span className="cbt-q-kind">Single Choice</span>
                                            </div>
                                            <div className="cbt-skel" />
                                            <div className="cbt-skel cbt-skel--short" />
                                        </div>
                                    )}
                                    <div className="cbt-foot">
                                        <span className="cbt-b">‹ Back</span>
                                        <span className="cbt-grow" />
                                        <span className={`cbt-b${pressed('clear')}`}>Clear</span>
                                        <span className={`cbt-b cbt-b--review${pressed('review')}`}>
                                            <FlagIcon /> Review
                                        </span>
                                        <span className={`cbt-b cbt-b--ansrev${pressed('ansrev')}`}>Ans &amp; Review</span>
                                        <span className={`cbt-b cbt-b--save${pressed('save')}`}>Save &amp; Next ›</span>
                                    </div>
                                </div>
                                <div className="cbt-pal">
                                    <div className="cbt-pal-title">Question Palette</div>
                                    <div className="cbt-legend">
                                        <span>
                                            <i className="nv">{counts.nv}</i>Not Visited
                                        </span>
                                        <span>
                                            <i className="na">{counts.na}</i>Not Answered
                                        </span>
                                        <span>
                                            <i className="ans">{counts.ans}</i>Answered
                                        </span>
                                        <span>
                                            <i className="rev">{counts.rev}</i>Review
                                        </span>
                                        <span>
                                            <i className="revans">{counts.revans}</i>Ans &amp; Review
                                        </span>
                                    </div>
                                    <div className="cbt-pal-sec">Physics</div>
                                    <div className="cbt-pills">
                                        {pills.map((st, i) => (
                                            <span
                                                key={i}
                                                className={`${st}${i + 1 === frame.q && phase === 'exam' ? ' cur' : ''}${frame.press === 'pal21' && i === 20 ? ' is-pressed' : ''}`}
                                            >
                                                {i + 1}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="cbt-pal-sec">Chemistry · 26–50</div>
                                    <div className="cbt-pal-sec">Mathematics · 51–75</div>
                                </div>
                            </div>

                            {phase === 'timeup' && (
                                <div className="cbt-sheet">
                                    <div className="cbt-dialog">
                                        <b>⏱ Time's Up!</b>
                                        <p>The time allocated for this test has expired. Please submit your answers to see your result.</p>
                                        <span className="cbt-b cbt-b--save is-pressed">Submit Test</span>
                                    </div>
                                </div>
                            )}
                            {phase === 'done' && (
                                <div className="cbt-sheet">
                                    <div className="cbt-dialog cbt-dialog--done">
                                        <b>Submitted</b>
                                        <p>Scored on the server with +4 / −1</p>
                                        <div className="cbt-score">
                                            <span>
                                                <em>Physics</em>64
                                            </span>
                                            <span>
                                                <em>Chemistry</em>56
                                            </span>
                                            <span>
                                                <em>Maths</em>68
                                            </span>
                                            <span className="cbt-score-total">
                                                <em>Total</em>188<small>/300</small>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
