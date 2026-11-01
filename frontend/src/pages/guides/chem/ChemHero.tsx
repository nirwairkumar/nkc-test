/**
 * Hero for /chemistry-question-paper-maker: a phone photo of a handwritten chemistry
 * question ("The ppt of CaF₂ (Ksp = 1.7 × 10⁻¹⁰) …", the "Tables & chemistry" sample photo
 * TestoZa's Fill from a photo sheet ships with) is read, and the question appears typeset
 * on the student's exam screen; the table of concentrations becomes four options, the text
 * grows and the charges and powers of ten grow with it, and the student answers. The exam screen is
 * the product's (examScreen.tsx); the photo card floats over the stage like the
 * cheating guide's exam room card.
 *
 * Size: the phone is drawn at 393 × 852 points, scaled to the stage, and the stage never
 * makes the first screen scroll (see .cq-stage). Plays only while visible; reduced
 * motion shows the answered question.
 */
import { useEffect, useRef, useState } from 'react';
import { Lock, RotateCw, ScanText } from 'lucide-react';
import { EXAM } from '@/guides/chemData';
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
    answer?: 'C';
}

const SCRIPT: Frame[] = [
    { scene: 0, ms: 2600, text: false, options: 0, font: 18 },
    { scene: 1, ms: 2200, text: true, options: 0, font: 18 },
    { scene: 2, ms: 600, text: true, options: 1, font: 18 },
    { scene: 2, ms: 600, text: true, options: 2, font: 18 },
    { scene: 2, ms: 600, text: true, options: 3, font: 18 },
    { scene: 2, ms: 1600, text: true, options: 4, font: 18 },
    { scene: 3, ms: 2600, text: true, options: 4, font: 22 },
    { scene: 4, ms: 2800, text: true, options: 4, font: 22, answer: 'C' },
];

/** Reduced motion: the answered question. */
const STILL = SCRIPT.length - 1;

const CAPTIONS = [
    ['A question from a notebook', 'A phone photo of handwriting'],
    ['Typed as chemistry', 'CaF₂, Ksp and 10⁻¹⁰, typeset'],
    ['The table becomes options', 'Read from the same photo'],
    ['Bigger text, still sharp', 'Charges and powers grow with it'],
    ['Answered on any phone', 'Marked the moment it’s submitted'],
] as const;

/** The question area while the photo is being read. */
function Reading() {
    return (
        <span className="cq-hero-reading" aria-hidden="true">
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
        <div className="cq-stage-wrap" ref={rootRef}>
            <div
                className="cq-stage"
                role="img"
                aria-label="Animation: a phone photo of a handwritten chemistry question, “The ppt of CaF₂ (Ksp = 1.7 × 10⁻¹⁰) is obtained when following are mixed”, is read by TestoZa and appears typeset on a student’s exam screen. The table of concentrations becomes four options, the text is made bigger and the charges and powers of ten grow with it, and the student picks option C, [Ca²⁺] = 10⁻² M and [F⁻] = 10⁻³ M."
            >
                <div className="cq-iphone" aria-hidden="true" ref={deviceRef}>
                    <i className="cq-iphone-key cq-iphone-key--action" />
                    <i className="cq-iphone-key cq-iphone-key--up" />
                    <i className="cq-iphone-key cq-iphone-key--down" />
                    <i className="cq-iphone-key cq-iphone-key--power" />
                    <div className="cq-iphone-screen" ref={screenRef}>
                        <div className="cq-canvas cq-screen" style={{ transform: `scale(${scale})` }}>
                            <div className="cq-island" />
                            <div className="cq-statusbar">
                                <span>9:41</span>
                                <StatusIcons />
                            </div>
                            <div className="cq-viewport cq-viewport--app">
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
                            <div className="cq-safari">
                                <div className="cq-safari-bar">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m15 18-6-6 6-6" />
                                    </svg>
                                    <span>
                                        <Lock style={{ width: 12, height: 12 }} /> app.testoza.com
                                    </span>
                                    <RotateCw />
                                </div>
                                <div className="cq-safari-home" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {frame.scene <= 1 && (
                <div className={`cq-hero-photo${frame.scene === 0 ? ' is-reading' : ' is-read'}`} aria-hidden="true" key="photo">
                    <p>
                        Fill from a photo
                        <span>
                            <ScanText />
                            {frame.scene === 0 ? 'Reading…' : 'Typed'}
                        </span>
                    </p>
                    <div className="cq-hero-photo-img">
                        <img src="/sample-questions-showcase/chemistry-table-question.png" alt="" width={452} height={265} />
                        <i className="cq-hero-scan" />
                    </div>
                </div>
            )}
            <div className="cq-stage-caption" aria-hidden="true">
                <p key={frame.scene} className="is-swap">
                    <b>{CAPTIONS[frame.scene][0]}</b>
                    {CAPTIONS[frame.scene][1]}
                </p>
                <div className="cq-dots">
                    {CAPTIONS.map((_, i) => (
                        <i key={i} className={i === frame.scene ? 'is-on' : undefined} />
                    ))}
                </div>
            </div>
        </div>
    );
}
