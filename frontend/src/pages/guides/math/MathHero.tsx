/**
 * Hero for /math-test-maker: a phone photo of a handwritten question ("Find d/dx
 * (tan² x)", the sample photo TestoZa's Fill from a photo sheet ships with) is read, and
 * the question appears typeset on the student's exam screen; four options arrive, the
 * text grows and the maths grows with it, and the student answers. The exam screen is
 * the product's (examScreen.tsx); the photo card floats over the stage like the
 * cheating guide's exam room card.
 *
 * Size: the phone is drawn at 393 × 852 points, scaled to the stage, and the stage never
 * makes the first screen scroll (see .mt-stage). Plays only while visible; reduced
 * motion shows the answered question.
 */
import { useEffect, useRef, useState } from 'react';
import { Lock, RotateCw, ScanText } from 'lucide-react';
import { EXAM } from '@/guides/mathData';
import { StatusIcons, useInert } from './replica';
import ExamScreen from './examScreen';

const SECONDS = 11 * 60 + 32;
const Q = EXAM[0];

interface Frame {
    scene: 0 | 1 | 2 | 3 | 4;
    ms: number;
    text: boolean;
    options: number;
    font: number;
    answer?: 'B';
}

const SCRIPT: Frame[] = [
    { scene: 0, ms: 2600, text: false, options: 0, font: 18 },
    { scene: 1, ms: 2200, text: true, options: 0, font: 18 },
    { scene: 2, ms: 600, text: true, options: 1, font: 18 },
    { scene: 2, ms: 600, text: true, options: 2, font: 18 },
    { scene: 2, ms: 600, text: true, options: 3, font: 18 },
    { scene: 2, ms: 1600, text: true, options: 4, font: 18 },
    { scene: 3, ms: 2600, text: true, options: 4, font: 24 },
    { scene: 4, ms: 2800, text: true, options: 4, font: 24, answer: 'B' },
];

/** Reduced motion: the answered question. */
const STILL = SCRIPT.length - 1;

const CAPTIONS = [
    ['A question from a notebook', 'A phone photo of handwriting'],
    ['Typed as maths', 'The fraction and the power, typeset'],
    ['Four options added', 'Tapped in on the Sy Pad'],
    ['Bigger text, still sharp', 'The maths grows with the text size'],
    ['Answered on any phone', 'Marked the moment it’s submitted'],
] as const;

/** The question area while the photo is being read. */
function Reading() {
    return (
        <span className="mt-hero-reading" aria-hidden="true">
            <i style={{ width: '86%' }} />
            <i style={{ width: '58%' }} />
        </span>
    );
}

export default function MathHero() {
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
        <div className="mt-stage-wrap" ref={rootRef}>
            <div
                className="mt-stage"
                role="img"
                aria-label="Animation: a phone photo of a handwritten maths question, “Find d/dx (tan² x)”, is read by TestoZa and appears typeset on a student’s exam screen. Four options are added, the text is made bigger and the fraction grows with it, and the student picks option B, 2 tan x sec² x."
            >
                <div className="mt-iphone" aria-hidden="true" ref={deviceRef}>
                    <i className="mt-iphone-key mt-iphone-key--action" />
                    <i className="mt-iphone-key mt-iphone-key--up" />
                    <i className="mt-iphone-key mt-iphone-key--down" />
                    <i className="mt-iphone-key mt-iphone-key--power" />
                    <div className="mt-iphone-screen" ref={screenRef}>
                        <div className="mt-canvas mt-screen" style={{ transform: `scale(${scale})` }}>
                            <div className="mt-island" />
                            <div className="mt-statusbar">
                                <span>9:41</span>
                                <StatusIcons />
                            </div>
                            <div className="mt-viewport mt-viewport--app">
                                <div className="relative">
                                    <ExamScreen
                                        q={Q}
                                        index={0}
                                        answer={frame.answer ?? null}
                                        seconds={SECONDS}
                                        fontSize={frame.font}
                                        textOverride={frame.text ? undefined : <Reading />}
                                        visibleOptions={frame.options}
                                    />
                                </div>
                            </div>
                            <div className="mt-safari">
                                <div className="mt-safari-bar">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m15 18-6-6 6-6" />
                                    </svg>
                                    <span>
                                        <Lock style={{ width: 12, height: 12 }} /> app.testoza.com
                                    </span>
                                    <RotateCw />
                                </div>
                                <div className="mt-safari-home" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {frame.scene <= 1 && (
                <div className={`mt-hero-photo${frame.scene === 0 ? ' is-reading' : ' is-read'}`} aria-hidden="true" key="photo">
                    <p>
                        Fill from a photo
                        <span>
                            <ScanText />
                            {frame.scene === 0 ? 'Reading…' : 'Typed'}
                        </span>
                    </p>
                    <div className="mt-hero-photo-img">
                        <img src="/sample-questions-showcase/handwritten-question.png" alt="" width={520} height={78} />
                        <i className="mt-hero-scan" />
                    </div>
                </div>
            )}
            <div className="mt-stage-caption" aria-hidden="true">
                <p key={frame.scene} className="is-swap">
                    <b>{CAPTIONS[frame.scene][0]}</b>
                    {CAPTIONS[frame.scene][1]}
                </p>
                <div className="mt-dots">
                    {CAPTIONS.map((_, i) => (
                        <i key={i} className={i === frame.scene ? 'is-on' : undefined} />
                    ))}
                </div>
            </div>
        </div>
    );
}
