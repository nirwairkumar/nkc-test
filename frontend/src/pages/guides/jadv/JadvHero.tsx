/**
 * Hero for /jee-advanced-mock-test-software: a candidate's phone on TestoZa's exam screen
 * (examScreen.tsx) with a one-or-more-correct question (+4 | -2). The candidate ticks the
 * options one at a time and the caption under the phone shows the marks JEE Advanced (and
 * TestoZa's "JEE Advanced" partial marks) give at each step: +1, +2, +4 for all three
 * correct options, then −2 when a wrong one is added.
 *
 * Size: the phone is drawn at 393 × 852 points, scaled to the stage, and the stage never
 * makes the first screen scroll (see .ja-stage). Plays only while visible; reduced motion
 * shows the fully correct answer.
 */
import { useEffect, useRef, useState } from 'react';
import { Lock, RotateCw } from 'lucide-react';
import { EXAM, type OptionKey } from '@/guides/jadvData';
import { StatusIcons, useInert } from './replica';
import ExamScreen from './examScreen';

const SECONDS = 41 * 60 + 9;
const Q = EXAM[1];

interface Frame {
    ms: number;
    picked: OptionKey[];
    marks: string;
    tone: 'zero' | 'plus' | 'minus';
    title: string;
    note: string;
}

const SCRIPT: Frame[] = [
    { ms: 2600, picked: [], marks: '0', tone: 'zero', title: 'One or more options correct', note: 'Section 2 of a JEE Advanced paper' },
    { ms: 2100, picked: ['A'], marks: '+1', tone: 'plus', title: 'One correct option: +1', note: 'Partial marks, as JEE Advanced gives them' },
    { ms: 2100, picked: ['A', 'B'], marks: '+2', tone: 'plus', title: 'Two of three: +2', note: 'One mark for each correct option' },
    { ms: 2600, picked: ['A', 'B', 'D'], marks: '+4', tone: 'plus', title: 'All three: full marks', note: 'Every correct option, nothing else' },
    { ms: 3000, picked: ['A', 'B', 'C', 'D'], marks: '−2', tone: 'minus', title: 'One wrong option: −2', note: 'However many right ones were picked' },
];

/** Reduced motion: the fully correct answer. */
const STILL = 3;

export default function JadvHero() {
    const rootRef = useRef<HTMLDivElement>(null);
    const screenRef = useRef<HTMLDivElement>(null);
    const deviceRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.65);
    const [step, setStep] = useState(0);
    const [running, setRunning] = useState(false);
    useInert(deviceRef, true);

    // Play only while visible; reduced motion gets a still frame.
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

    const frame = SCRIPT[step];

    return (
        <div className="ja-stage-wrap" ref={rootRef}>
            <div
                className="ja-stage"
                role="img"
                aria-label="Animation: a candidate’s phone shows a JEE Advanced-style question with one or more correct options, worth +4 with −2 for a wrong option: “Let f(x) = x³ − 3x. Which of the following statements is (are) TRUE?” Choosing option A alone earns +1, A and B earn +2, A, B and D, all three correct options, earn the full +4, and adding the wrong option C makes it −2."
            >
                <div className="ja-iphone" aria-hidden="true" ref={deviceRef}>
                    <i className="ja-iphone-key ja-iphone-key--action" />
                    <i className="ja-iphone-key ja-iphone-key--up" />
                    <i className="ja-iphone-key ja-iphone-key--down" />
                    <i className="ja-iphone-key ja-iphone-key--power" />
                    <div className="ja-iphone-screen" ref={screenRef}>
                        <div className="ja-canvas ja-screen" style={{ transform: `scale(${scale})` }}>
                            <div className="ja-island" />
                            <div className="ja-statusbar">
                                <span>9:41</span>
                                <StatusIcons />
                            </div>
                            <div className="ja-viewport ja-viewport--app">
                                <div className="relative">
                                    <ExamScreen q={Q} index={1} answer={frame.picked} seconds={SECONDS} fontSize={18} />
                                </div>
                            </div>
                            <div className="ja-safari">
                                <div className="ja-safari-bar">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m15 18-6-6 6-6" />
                                    </svg>
                                    <span>
                                        <Lock style={{ width: 12, height: 12 }} /> app.testoza.com
                                    </span>
                                    <RotateCw />
                                </div>
                                <div className="ja-safari-home" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="ja-stage-caption ja-hero-caption" aria-hidden="true">
                <div key={step} className="ja-hero-marks is-swap">
                    <b data-tone={frame.tone}>{frame.marks}</b>
                    <p>
                        <strong>{frame.title}</strong>
                        {frame.note}
                    </p>
                </div>
                <div className="ja-dots">
                    {SCRIPT.map((_, i) => (
                        <i key={i} className={i === step ? 'is-on' : undefined} />
                    ))}
                </div>
            </div>
        </div>
    );
}
