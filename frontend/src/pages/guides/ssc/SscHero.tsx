/**
 * Hero for /ssc-mock-test-platform: a candidate's phone on TestoZa's exam screen
 * (examScreen.tsx, phone layout) running an SSC CGL Tier 1 mock with timed sections, the
 * 2026 pattern. Reasoning's own clock runs out, the section closes, General Awareness opens,
 * the closed tab can't be reopened, and a wrong answer costs −0.5. The caption shows the
 * four sections, the open one lit. TestPage's toasts appear at the bottom of the screen,
 * under the caption here, so the hero leaves them to the timed-paper demo.
 *
 * Size: the phone is drawn at 393 × 852 points, scaled to the stage, and the stage never
 * makes the first screen scroll (see .sg-stage). Plays only while visible; reduced motion
 * shows the first frame.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Lock, RotateCw } from 'lucide-react';
import { DEMO_MARKS, DEMO_SECTIONS, DEMO_TITLE, type OptionKey } from '@/guides/sscData';
import { StatusIcons, useInert } from './replica';
import ExamScreen, { type Control, type PillState } from './examScreen';

/** The real paper: four sections of 25 questions. */
const SECTIONS = DEMO_SECTIONS.map((s) => ({ name: s.name, count: 25 }));
const SHORT = ['Reasoning', 'Awareness', 'Quant', 'English'];

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
    { ms: 2600, open: 0, q: 6, seconds: 9 * 60 + 12, title: 'Reasoning has its own 15 minutes', note: 'SSC CGL and CHSL 2026 time every section' },
    { ms: 2200, open: 0, q: 6, seconds: 9 * 60 + 4, selected: 'B', pressed: 'opt-B', pan: 150, title: 'Answered: +2', note: 'Every right answer is worth 2 marks' },
    { ms: 2300, open: 0, q: 7, seconds: 3, title: 'Three seconds left in Reasoning', note: 'Whatever is unanswered stays unanswered' },
    { ms: 3000, open: 1, q: 25, seconds: 15 * 60, title: 'Reasoning closes, Awareness opens', note: 'Time left over isn’t carried forward' },
    { ms: 2600, open: 1, q: 25, seconds: 14 * 60 + 57, pressed: 'tab-0', title: 'No going back', note: 'A closed section stays closed' },
    { ms: 2800, open: 1, q: 25, seconds: 14 * 60 + 31, selected: 'A', pressed: 'opt-A', pan: 150, title: 'A wrong answer: −0.5', note: 'Negative marking, as in the real paper' },
];

/** Reduced motion: the first frame. */
const STILL = 0;

/** Palette states (the palette sheet stays closed in the hero, so only the question on screen matters). */
const statesFor = (f: Frame): PillState[] => Array.from({ length: 100 }, (_, i) => (i === f.q ? (f.selected ? 'ans' : 'na') : i < f.q ? 'ans' : 'nv'));

export default function SscHero() {
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
    const sec = DEMO_SECTIONS[Math.floor(f.q / 25)];
    const question = sec.questions[f.q % 25 % sec.questions.length];

    return (
        <div className="sg-stage-wrap" ref={rootRef}>
            <div
                className="sg-stage"
                role="img"
                aria-label="Animation: a candidate’s phone on an SSC CGL Tier 1 mock with timed sections. Reasoning has its own 15-minute clock; the candidate answers a question for +2, the clock reaches its last seconds, Reasoning closes and General Awareness opens with a fresh 15 minutes. Tapping the Reasoning tab again shows “General Intelligence and Reasoning is closed. Its time is over.” A wrong answer costs −0.5."
            >
                <div className="sg-iphone sg-hero-pan" aria-hidden="true" ref={deviceRef} style={{ transform: `translateY(${-(f.pan ?? 0)}px)` }}>
                    <i className="sg-iphone-key sg-iphone-key--action" />
                    <i className="sg-iphone-key sg-iphone-key--up" />
                    <i className="sg-iphone-key sg-iphone-key--down" />
                    <i className="sg-iphone-key sg-iphone-key--power" />
                    <div className="sg-iphone-screen" ref={screenRef}>
                        <div className="sg-canvas sg-screen" style={{ transform: `scale(${scale})` }}>
                            <div className="sg-island" />
                            <div className="sg-statusbar is-plain">
                                <span>9:41</span>
                                <StatusIcons />
                            </div>
                            <div className="sg-viewport sg-viewport--app">
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
                                        criticalSeconds={180}
                                        marks={DEMO_MARKS}
                                        pressed={f.pressed ?? null}
                                    />
                                </div>
                            </div>
                            <div className="sg-safari">
                                <div className="sg-safari-bar">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m15 18-6-6 6-6" />
                                    </svg>
                                    <span>
                                        <Lock style={{ width: 12, height: 12 }} /> app.testoza.com
                                    </span>
                                    <RotateCw />
                                </div>
                                <div className="sg-safari-home" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="sg-stage-caption sg-hero-caption" aria-hidden="true">
                <div className="sg-hero-strip">
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
                <div className="sg-dots">
                    {SCRIPT.map((_, i) => (
                        <i key={i} className={i === step ? 'is-on' : undefined} />
                    ))}
                </div>
            </div>
        </div>
    );
}
