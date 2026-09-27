/**
 * Interactive parts of testoza.com/create-mock-test-online.
 *
 * Each widget's words come from src/guides/createMockTestOnline.ts, which also
 * builds the crawler fallback from the same data, so the two can't drift apart.
 * Motion is decorative: every widget has a readable resting state, timers only
 * run while the widget is on screen, and prefers-reduced-motion stops them.
 */
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react';
import { PALETTE_STATUSES, SOURCE_OPTIONS, TIME_GROUPS } from '@/guides/mock-test/createMockTestOnline';

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** True while the element is on screen (always true without IntersectionObserver). */
function useInView(ref: RefObject<Element>, rootMargin = '0px') {
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (!('IntersectionObserver' in window)) {
            setInView(true);
            return;
        }
        const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
        io.observe(el);
        return () => io.disconnect();
    }, [ref, rootMargin]);
    return inView;
}

const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties;

/* ── Hero: a phone photographs a page, reads it, and has a mock test ready ── */

const SCENE_MS = [3400, 3600, 4400];
const FOUND = 18;
/** Questions the "reading" screen lists as it finds them. */
const READ_QUESTIONS = [
    'A projectile is fired at 30° to the horizontal…',
    'Find the range when u = 20 m/s and g = 10 m/s²…',
    'Two vectors of equal size make an angle of 60°…',
];
/** Palette pattern for the "ready" screen: mostly unseen, as a fresh test is. */
const READY_CELLS = Array.from({ length: FOUND }, (_, i) => (i === 0 ? 'current' : 'not-visited'));

function TextbookPage({ scanning = false }: { scanning?: boolean }) {
    return (
        <div className="cmt-page">
            <p className="cmt-page-ch">Chapter 4</p>
            <p className="cmt-page-title">Motion in a Plane</p>
            <span className="cmt-page-line" style={cssVars({ '--w': '92%' })} />
            <span className="cmt-page-line" style={cssVars({ '--w': '78%' })} />
            {[0, 1, 2].map((q) => (
                <div className="cmt-page-q" key={q} style={cssVars({ '--q': q })}>
                    <b>{q + 1}.</b>
                    <span>
                        <span className="cmt-page-line" style={cssVars({ '--w': `${88 - q * 9}%` })} />
                        <span className="cmt-page-line" style={cssVars({ '--w': `${60 + q * 8}%` })} />
                    </span>
                    {scanning && <i className="cmt-page-hit" />}
                </div>
            ))}
            <svg className="cmt-page-fig" viewBox="0 0 120 50" aria-hidden="true">
                <path d="M6 44 Q 60 -12 114 44" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 3" />
                <path d="M4 45 H116" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="60" cy="16" r="3" fill="currentColor" />
            </svg>
            {scanning && <i className="cmt-scanline" />}
        </div>
    );
}

export function PhoneHero() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref);
    const [reduced] = useState(prefersReducedMotion);
    const [scene, setScene] = useState(reduced ? 2 : 0);
    const [found, setFound] = useState(reduced ? FOUND : 0);

    useEffect(() => {
        if (reduced || !inView) return;
        const t = window.setTimeout(() => setScene((s) => (s + 1) % 3), SCENE_MS[scene]);
        return () => window.clearTimeout(t);
    }, [scene, inView, reduced]);

    // "18 questions found" counts up while the page is being read.
    useEffect(() => {
        if (scene !== 1) {
            setFound(scene === 2 ? FOUND : 0);
            return;
        }
        let n = 0;
        setFound(0);
        const id = window.setInterval(() => {
            n += 1;
            setFound(n);
            if (n >= FOUND) window.clearInterval(id);
        }, 150);
        return () => window.clearInterval(id);
    }, [scene]);

    return (
        <div className="cmt-hero-visual" ref={ref} aria-hidden="true">
            <span className="cmt-chip cmt-chip--1"><i data-c="blue" />3 photos</span>
            <span className="cmt-chip cmt-chip--2"><i data-c="green" />English + <span lang="hi">हिंदी</span></span>
            <span className="cmt-chip cmt-chip--3"><i data-c="orange" />+4 / −1</span>
            <span className="cmt-chip cmt-chip--4"><i data-c="purple" />NTA-style palette</span>

            <div className="cmt-phone">
                <div className="cmt-phone-screen" data-scene={scene}>
                    <span className="cmt-island" />
                    <div className="cmt-status">
                        <span>9:41</span>
                        <span className="cmt-status-icons"><i /><i /><i /></span>
                    </div>

                    {/* 1 · Camera */}
                    <div className="cmt-scene cmt-scene--camera" data-on={scene === 0}>
                        <div className="cmt-cam-view">
                            <TextbookPage />
                            <span className="cmt-focus" />
                        </div>
                        <div className="cmt-cam-modes">
                            <span>VIDEO</span>
                            <span className="is-on">PHOTO</span>
                            <span>PORTRAIT</span>
                        </div>
                        <div className="cmt-cam-bar">
                            <span className="cmt-cam-thumb" />
                            <span className="cmt-shutter" />
                            <span className="cmt-cam-flip" />
                        </div>
                        <span className="cmt-flash" />
                    </div>

                    {/* 2 · Reading */}
                    <div className="cmt-scene cmt-scene--read" data-on={scene === 1}>
                        <div className="cmt-app-bar">
                            <span className="cmt-app-back">‹ Back</span>
                            <b>Create test</b>
                            <span />
                        </div>
                        <div className="cmt-read-card">
                            <TextbookPage scanning />
                            <div className="cmt-read-meta">
                                <span className="cmt-spin" /> Reading 3 pages…
                            </div>
                            <p className="cmt-read-count">
                                <b>{found}</b> questions found
                            </p>
                            <div className="cmt-read-pills">
                                <span>Extract</span>
                                <span>High accuracy</span>
                            </div>
                            <ul className="cmt-read-list">
                                {READ_QUESTIONS.map((text, i) => (
                                    <li key={i} style={cssVars({ '--q': i })}>
                                        <b>Q{i + 1}</b>
                                        <span>{text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* 3 · Ready */}
                    <div className="cmt-scene cmt-scene--ready" data-on={scene === 2}>
                        <div className="cmt-app-bar">
                            <span />
                            <b>My tests</b>
                            <span />
                        </div>
                        <div className="cmt-ready-card">
                            <span className="cmt-ready-badge">✓ Mock test ready</span>
                            <p className="cmt-ready-title">Motion in a Plane · Mock 1</p>
                            <div className="cmt-ready-stats">
                                <div><b>18</b><span>Questions</span></div>
                                <div><b>36:00</b><span>Minutes</span></div>
                                <div><b>+4/−1</b><span>Marking</span></div>
                            </div>
                            <div className="cmt-ready-grid">
                                {READY_CELLS.map((s, i) => (
                                    <span key={i} data-s={s} style={cssVars({ '--i': i })}>{i + 1}</span>
                                ))}
                            </div>
                            <span className="cmt-ready-btn">Start test</span>
                        </div>
                        <div className="cmt-toast">Saved to My Tests</div>
                    </div>

                    <span className="cmt-home-bar" />
                </div>
            </div>
        </div>
    );
}

/* ── Three ways to build a test: an iOS segmented control ────────────────── */

const SHORT_TAB: Record<string, string> = { paper: 'Paper', chapter: 'Chapter', type: 'Type it' };

export function SourcePicker() {
    const [index, setIndex] = useState(0);
    const tabs = useRef<(HTMLButtonElement | null)[]>([]);
    const option = SOURCE_OPTIONS[index];

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = (index + step + SOURCE_OPTIONS.length) % SOURCE_OPTIONS.length;
        setIndex(next);
        tabs.current[next]?.focus();
    };

    return (
        <div className="cmt-widget cmt-picker" data-reveal>
            <p className="cmt-widget-kicker">What are you starting from?</p>
            <div
                className="cmt-seg"
                role="tablist"
                aria-label="What are you starting from?"
                onKeyDown={onKeyDown}
                style={cssVars({ '--i': index, '--n': SOURCE_OPTIONS.length })}
            >
                <span className="cmt-seg-thumb" aria-hidden="true" />
                {SOURCE_OPTIONS.map((o, i) => (
                    <button
                        key={o.id}
                        ref={(el) => (tabs.current[i] = el)}
                        type="button"
                        role="tab"
                        id={`cmt-tab-${o.id}`}
                        aria-controls="cmt-picker-panel"
                        aria-selected={i === index}
                        tabIndex={i === index ? 0 : -1}
                        onClick={() => setIndex(i)}
                    >
                        <span className="cmt-seg-long">{o.tab}</span>
                        <span className="cmt-seg-short" aria-hidden="true">{SHORT_TAB[o.id]}</span>
                    </button>
                ))}
            </div>

            <div className="cmt-picker-panel" id="cmt-picker-panel" role="tabpanel" aria-labelledby={`cmt-tab-${option.id}`}>
                <div className="cmt-flow" key={option.id} aria-hidden="true">
                    <span className="cmt-flow-node">{option.input}</span>
                    <span className="cmt-flow-line"><i /></span>
                    <span className="cmt-flow-node is-mode">{option.mode}</span>
                    <span className="cmt-flow-line"><i /></span>
                    <span className="cmt-flow-node is-out">{option.output}</span>
                </div>
                <dl className="cmt-rows" key={`${option.id}-rows`}>
                    <div><dt>Choose</dt><dd>{option.mode}</dd></div>
                    <div><dt>Best for</dt><dd>{option.bestFor}</dd></div>
                    <div><dt>You get</dt><dd>{option.youGet}</dd></div>
                </dl>
            </div>
        </div>
    );
}

/* ── The exam screen: an NTA-style palette you can actually click ─────────── */

type Status = (typeof PALETTE_STATUSES)[number]['id'];
type DemoQuestion = { subject: string; text: string; options?: string[] };

/** Questions cycle through the 20 palette numbers. Index 7 is the numerical one. */
const BANK: DemoQuestion[] = [
    { subject: 'Physics', text: 'A ball is thrown straight up at 20 m/s. Taking g = 10 m/s², how high does it rise?', options: ['10 m', '20 m', '30 m', '40 m'] },
    { subject: 'Chemistry', text: 'Which of these atoms has the largest atomic radius?', options: ['Na', 'Mg', 'Al', 'Si'] },
    { subject: 'Maths', text: 'If log₂ x = 5, what is the value of x? (Numerical answer)' },
    { subject: 'Biology', text: 'Where in the cell does the Krebs cycle take place?', options: ['Cytoplasm', 'Mitochondrial matrix', 'Ribosome', 'Nucleus'] },
    { subject: 'Polity', text: 'How many Fundamental Duties does Article 51A of the Constitution list today?', options: ['10', '11', '12', '9'] },
    { subject: 'Reasoning', text: 'What comes next: 2, 6, 12, 20, 30, ?', options: ['40', '42', '44', '36'] },
    { subject: 'Physics', text: 'Resistors of 6 Ω and 3 Ω are joined in parallel. What is the equivalent resistance?', options: ['9 Ω', '4.5 Ω', '2 Ω', '18 Ω'] },
    { subject: 'Physics', text: 'A car covers 150 km in 2.5 hours. What is its average speed in km/h? (Numerical answer)' },
];
const TOTAL = 20;
const FIRST = 6; // the demo opens on question 7
const LETTERS = ['A', 'B', 'C', 'D'];

const startStatuses = (): Status[] =>
    Array.from({ length: TOTAL }, (_, i) => {
        const seeded: Status[] = ['answered', 'answered', 'not-answered', 'answered', 'marked', 'answered-marked'];
        return seeded[i] ?? (i === FIRST ? 'not-answered' : 'not-visited');
    });
const startAnswers = (): Record<number, string> => ({ 0: 'B', 1: 'A', 3: 'B', 5: 'B' });

const clock = (s: number) =>
    [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');

export function PaletteDemo() {
    const ref = useRef<HTMLElement>(null);
    const inView = useInView(ref);
    const [statuses, setStatuses] = useState<Status[]>(startStatuses);
    const [answers, setAnswers] = useState<Record<number, string>>(startAnswers);
    const [current, setCurrent] = useState(FIRST);
    const [secondsLeft, setSecondsLeft] = useState(59 * 60 + 48);

    // The clock only runs while you can see it, like a real one that you can't pause.
    useEffect(() => {
        if (!inView) return;
        const id = window.setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 59 * 60 + 59)), 1000);
        return () => window.clearInterval(id);
    }, [inView]);

    const q = BANK[current % BANK.length];
    const answer = answers[current] ?? '';
    const counts = PALETTE_STATUSES.map((s) => statuses.filter((x) => x === s.id).length);

    const setStatus = (i: number, s: Status) => setStatuses((prev) => prev.map((x, k) => (k === i ? s : x)));
    const goTo = (i: number) => {
        setCurrent(i);
        setStatuses((prev) => prev.map((x, k) => (k === i && x === 'not-visited' ? 'not-answered' : x)));
    };
    const next = () => goTo((current + 1) % TOTAL);
    const save = () => {
        setStatus(current, answer ? 'answered' : 'not-answered');
        next();
    };
    const markForReview = () => {
        setStatus(current, answer ? 'answered-marked' : 'marked');
        next();
    };
    const clear = () => {
        setAnswers((prev) => {
            const copy = { ...prev };
            delete copy[current];
            return copy;
        });
        setStatus(current, 'not-answered');
    };
    const setAnswer = (value: string) => setAnswers((prev) => ({ ...prev, [current]: value }));
    const press = (key: string) => {
        if (key === '⌫') return setAnswer(answer.slice(0, -1));
        if (key === '.' && answer.includes('.')) return;
        if (key === '−') return setAnswer(answer.startsWith('-') ? answer.slice(1) : `-${answer}`);
        if (answer.replace('-', '').length >= 8) return;
        setAnswer(answer + key);
    };
    const reset = () => {
        setStatuses(startStatuses());
        setAnswers(startAnswers());
        setCurrent(FIRST);
    };

    return (
        <figure className="cmt-widget cmt-exam-wrap" data-reveal ref={ref}>
            <div className="cmt-exam" role="group" aria-label="Practice exam screen demo">
                <div className="cmt-exam-top">
                    <span className="cmt-exam-name">Mock test 1 · PCM</span>
                    <span className="cmt-exam-timer" aria-hidden="true">
                        Time left <b>{clock(secondsLeft)}</b>
                    </span>
                </div>
                <div className="cmt-exam-body">
                    <div className="cmt-exam-q">
                        <div className="cmt-exam-qhead">
                            <b>Question {current + 1}</b>
                            <span className="cmt-exam-subject">{q.subject}</span>
                            <span className="cmt-exam-marks">+4 / −1</span>
                        </div>
                        <p className="cmt-exam-text" key={current}>{q.text}</p>
                        {q.options ? (
                            <div className="cmt-exam-options" role="radiogroup" aria-label={`Options for question ${current + 1}`}>
                                {q.options.map((opt, i) => {
                                    const letter = LETTERS[i];
                                    const on = answer === letter;
                                    return (
                                        <button
                                            key={letter}
                                            type="button"
                                            role="radio"
                                            aria-checked={on}
                                            className={on ? 'is-on' : undefined}
                                            onClick={() => setAnswer(letter)}
                                        >
                                            <span className="cmt-exam-radio">{letter}</span>
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="cmt-keypad">
                                <output className="cmt-keypad-out" aria-label="Your answer">{answer || ' '}</output>
                                <div className="cmt-keypad-keys">
                                    {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '−'].map((k) => (
                                        <button key={k} type="button" onClick={() => press(k)} aria-label={k === '−' ? 'Minus sign' : k}>
                                            {k}
                                        </button>
                                    ))}
                                    <button type="button" className="is-wide" onClick={() => press('⌫')}>Backspace</button>
                                </div>
                            </div>
                        )}
                        <div className="cmt-exam-actions">
                            <button type="button" className="is-review" onClick={markForReview}>Mark for review &amp; next</button>
                            <button type="button" className="is-clear" onClick={clear}>Clear</button>
                            <button type="button" className="is-save" onClick={save}>Save &amp; next</button>
                        </div>
                    </div>

                    <div className="cmt-exam-palette">
                        <ul className="cmt-legend">
                            {PALETTE_STATUSES.map((s, i) => (
                                <li key={s.id}>
                                    <span className="cmt-cell" data-s={s.id}>{counts[i]}</span>
                                    {s.label}
                                </li>
                            ))}
                        </ul>
                        <div className="cmt-grid" role="group" aria-label="Question palette">
                            {statuses.map((s, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className={`cmt-cell${i === current ? ' is-current' : ''}`}
                                    data-s={s}
                                    onClick={() => goTo(i)}
                                    aria-label={`Question ${i + 1}, ${PALETTE_STATUSES.find((x) => x.id === s)?.label.toLowerCase()}`}
                                    aria-current={i === current ? 'true' : undefined}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <figcaption className="cmt-widget-note">
                A working demo of the exam screen. Nothing is saved or graded.{' '}
                <button type="button" className="cmt-linkish" onClick={reset}>Reset</button>
            </figcaption>
        </figure>
    );
}

/* ── After the test: the four-group time matrix ─────────────────────────── */

const GROUP_COUNTS: Record<string, number> = { 'fast-correct': 10, 'slow-correct': 7, 'fast-wrong': 4, 'time-traps': 4 };
const GROUP_TOTAL = Object.values(GROUP_COUNTS).reduce((a, b) => a + b, 0);

/** Stable pseudo-random dot positions, so the matrix looks the same on every visit. */
function dotsFor(seed: number, n: number) {
    let x = seed * 9301 + 49297;
    const rand = () => {
        x = (x * 9301 + 49297) % 233280;
        return x / 233280;
    };
    return Array.from({ length: n }, (_, i) => ({ left: 8 + rand() * 84, top: 12 + rand() * 76, i }));
}

export function TimeMatrix() {
    const [selected, setSelected] = useState<string>('time-traps');
    const group = TIME_GROUPS.find((g) => g.id === selected) ?? TIME_GROUPS[3];

    return (
        <div className="cmt-widget cmt-matrix-wrap" data-reveal>
            <div className="cmt-matrix-axes" aria-hidden="true">
                <span>Fast</span>
                <span className="cmt-matrix-axis">Time taken</span>
                <span>Slow</span>
            </div>
            <div className="cmt-matrix">
                <span className="cmt-matrix-y cmt-matrix-y--top" aria-hidden="true">Correct</span>
                <span className="cmt-matrix-y cmt-matrix-y--bottom" aria-hidden="true">Wrong or skipped</span>
                {TIME_GROUPS.map((g, gi) => (
                    <button
                        key={g.id}
                        type="button"
                        className={`cmt-quad${g.id === selected ? ' is-on' : ''}`}
                        data-g={g.id}
                        aria-pressed={g.id === selected}
                        onClick={() => setSelected(g.id)}
                    >
                        <span className="cmt-quad-title">{g.title}</span>
                        <span className="cmt-quad-count">{GROUP_COUNTS[g.id]}</span>
                        <span className="cmt-quad-dots" aria-hidden="true">
                            {dotsFor(gi + 3, GROUP_COUNTS[g.id]).map((d) => (
                                <i key={d.i} style={cssVars({ left: `${d.left}%`, top: `${d.top}%`, '--i': d.i + gi * 3 })} />
                            ))}
                        </span>
                    </button>
                ))}
            </div>
            <div className="cmt-matrix-panel" data-g={group.id} aria-live="polite">
                <p className="cmt-matrix-head">
                    <b>{group.title}</b>
                    <span className="cmt-matrix-tag">{group.tag}</span>
                    <span className="cmt-matrix-of">{GROUP_COUNTS[group.id]} of {GROUP_TOTAL} questions</span>
                </p>
                <p key={group.id} className="cmt-matrix-advice">{group.advice}</p>
            </div>
        </div>
    );
}
