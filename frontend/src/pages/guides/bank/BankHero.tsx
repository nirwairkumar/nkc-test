/**
 * Hero for /bank-exam-mock-test-platform: a candidate's phone on TestoZa's exam screen
 * (examScreen.tsx, phone layout) running an IBPS PO Prelims mock with timed sections. English
 * Language's own clock runs out, the section closes, Quantitative Aptitude opens with a fresh
 * 20 minutes, the closed tab can't be reopened, and a wrong answer costs −0.25. The caption
 * shows the three sections, the open one lit. TestPage's toasts appear at the bottom of the
 * screen, under the caption here, so the hero leaves them to the timed-paper demo.
 *
 * Size: the phone is drawn at 393 × 852 points, scaled to the stage, and the stage never
 * makes the first screen scroll (see .bk-stage). Plays only while visible; reduced motion
 * shows the first frame.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Lock, RotateCw } from 'lucide-react';
import { DEMO_MARKS, DEMO_SECTIONS, DEMO_TITLE, type OptionKey } from '@/guides/bankData';
import { StatusIcons, useInert } from './replica';
import ExamScreen, { type Control, type PillState } from './examScreen';

/** The real paper: 30, 35 and 35 questions. */
const COUNTS = [30, 35, 35];
const SECTIONS = DEMO_SECTIONS.map((s, i) => ({ name: s.name, count: COUNTS[i] }));
const SHORT = ['English', 'Quant', 'Reasoning'];
const TOTAL_Q = COUNTS.reduce((a, b) => a + b, 0);
/** First question index of each section in the full paper. */
const STARTS = COUNTS.map((_, i) => COUNTS.slice(0, i).reduce((a, b) => a + b, 0));
const sectionOfQ = (q: number) => STARTS.reduce((best, start, i) => (q >= start ? i : best), 0);

interface Frame {
    ms: number;
    open: number;
    /** Question index across the paper (0-based). */
    q: number;
    seconds: number;
    selected?: OptionKey;
    pressed?: Control;
    /** Pan the phone up (stage pixels) so the options show above the caption. */
    pan?: number;
    title: string;
    note: string;
}

const SCRIPT: Frame[] = [
    { ms: 2600, open: 0, q: 8, seconds: 11 * 60 + 40, title: 'English has its own 20 minutes', note: 'IBPS, SBI and RRB time every section' },
    { ms: 2200, open: 0, q: 8, seconds: 11 * 60 + 31, selected: 'B', pressed: 'opt-B', pan: 150, title: 'Answered: +1', note: 'Five options a question, not four' },
    { ms: 2300, open: 0, q: 9, seconds: 3, title: 'Three seconds left in English', note: 'Whatever is unanswered stays unanswered' },
    { ms: 3000, open: 1, q: 30, seconds: 20 * 60, title: 'English closes, Quant opens', note: 'Time left over isn’t carried forward' },
    { ms: 2600, open: 1, q: 30, seconds: 19 * 60 + 57, pressed: 'tab-0', title: 'No going back', note: 'A closed section stays closed' },
    { ms: 2800, open: 1, q: 30, seconds: 19 * 60 + 31, selected: 'C', pressed: 'opt-C', pan: 150, title: 'A wrong answer: −0.25', note: 'A quarter of the question’s marks' },
];

/** Reduced motion: the first frame. */
const STILL = 0;

/** Palette states (the palette sheet stays closed in the hero, so only the question on screen matters). */
const statesFor = (f: Frame): PillState[] => Array.from({ length: TOTAL_Q }, (_, i) => (i === f.q ? (f.selected ? 'ans' : 'na') : i < f.q ? 'ans' : 'nv'));

export default function BankHero() {
    const rootRef = useRef<HTMLDivElement>(null);
    const screenRef = useRef<HTMLDivElement>(null);
    const deviceRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.65);
    const [step, setStep] = useState(0);
    const [running, setRunning] = useState(false);
    useInert(deviceRef, true);

    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
            setStep(STILL);
            return;
        }
        const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.25 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    // The web view is drawn at 393 × 852 points and scaled to the screen.
    useEffect(() => {
        const el = screenRef.current;
        if (!el) return;
        const fit = () => setScale(el.clientWidth / 393);
        fit();
        if (!('ResizeObserver' in window)) return;
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!running) return;
        const id = window.setTimeout(() => setStep((s) => (s + 1) % SCRIPT.length), SCRIPT[step].ms);
        return () => window.clearTimeout(id);
    }, [running, step]);

    const f = SCRIPT[step];
    const si = sectionOfQ(f.q);
    const sec = DEMO_SECTIONS[si];
    const question = sec.questions[(f.q - STARTS[si]) % sec.questions.length];

    return (
        <div className="bk-stage-wrap" ref={rootRef}>
            <div
                className="bk-stage"
                role="img"
                aria-label="Animation: a candidate’s phone on an IBPS PO Prelims mock with timed sections. English Language has its own 20-minute clock; the candidate answers a question for +1, the clock reaches its last seconds, English closes and Quantitative Aptitude opens with a fresh 20 minutes. Tapping the English tab again shows “English Language is closed. Its time is over.” A wrong answer costs −0.25."
            >
                <div className="bk-iphone bk-hero-pan" aria-hidden="true" ref={deviceRef} style={{ transform: `translateY(${-(f.pan ?? 0)}px)` }}>
                    <i className="bk-iphone-key bk-iphone-key--action" />
                    <i className="bk-iphone-key bk-iphone-key--up" />
                    <i className="bk-iphone-key bk-iphone-key--down" />
                    <i className="bk-iphone-key bk-iphone-key--power" />
                    <div className="bk-iphone-screen" ref={screenRef}>
                        <div className="bk-canvas bk-screen" style={{ transform: `scale(${scale})` }}>
                            <div className="bk-island" />
                            <div className="bk-statusbar is-plain">
                                <span>9:41</span>
                                <StatusIcons />
                            </div>
                            <div className="bk-viewport bk-viewport--app">
                                <div className="relative">
                                    <ExamScreen
                                        layout="phone"
                                        title={DEMO_TITLE}
                                        sections={SECTIONS}
                                        current={f.q}
                                        question={question}
                                        selected={f.selected}
                                        states={statesFor(f)}
                                        seconds={f.seconds}
                                        openSection={f.open}
                                        criticalSeconds={240}
                                        marks={DEMO_MARKS}
                                        pressed={f.pressed ?? null}
                                    />
                                </div>
                            </div>
                            <div className="bk-safari">
                                <div className="bk-safari-bar">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m15 18-6-6 6-6" />
                                    </svg>
                                    <span>
                                        <Lock style={{ width: 12, height: 12 }} /> app.testoza.com
                                    </span>
                                    <RotateCw />
                                </div>
                                <div className="bk-safari-home" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bk-stage-caption bk-hero-caption" aria-hidden="true">
                <div className="bk-hero-strip">
                    {SHORT.map((name, i) => (
                        <span key={name} data-state={i < f.open ? 'closed' : i === f.open ? 'open' : 'next'}>
                            {i < f.open ? <Check /> : i > f.open ? <Lock /> : null}
                            {name}
                        </span>
                    ))}
                </div>
                <p key={step} className="is-swap">
                    <b>{f.title}</b>
                    {f.note}
                </p>
                <div className="bk-dots">
                    {SCRIPT.map((_, i) => (
                        <i key={i} className={i === step ? 'is-on' : undefined} />
                    ))}
                </div>
            </div>
        </div>
    );
}
