/**
 * Hero for /moodle-alternative: an iPhone in Safari at testoza.com/join. A candidate
 * types the six-digit code from the board, checks in with a roll number and a PIN,
 * waits in the lobby while the batch joins, sees the exam start, and later gets the
 * result the teacher released. No account at any point, which is the contrast with a
 * Moodle quiz.
 *
 * Every screen is the JoinScreens replica of src/pages/join/JoinPage.tsx, with the
 * same stage transition (fade and rise in, fade and lift out, 0.28 s). The numbers
 * agree with each other: 27 → 28 of 32 joined; 26 right, 3 wrong, 1 skipped out of
 * 30 one-mark questions; Physics 9, Chemistry 9, Biology 8 out of 10 each; the
 * class averages 19.4 and the top score is 28, as in the exam room. Plays only while on screen;
 * reduced motion shows a still lobby.
 */
import { useEffect, useRef, useState } from 'react';
import { Lock, RotateCw } from 'lucide-react';
import { CodeStage, DoneStage, IdentityStage, JoinPageFrame, LobbyStage, ResultView, type ExamInfo, type ResultData } from './JoinScreens';
import { useInert } from './useInert';

type Stage = 'code' | 'identity' | 'lobby' | 'done' | 'result';

interface Step {
    stage: Stage;
    ms: number;
    /** Caption under the phone. */
    scene: 0 | 1 | 2 | 3;
    code?: string;
    roll?: string;
    pin?: string;
    focus?: 'roll' | 'pin' | null;
    busy?: boolean;
    pressed?: boolean;
    live?: boolean;
    joined?: number;
    /** Page scroll inside the phone, in points. */
    scroll?: number;
    /** The stage fading out before the next one. */
    leaving?: boolean;
}

const INFO: ExamInfo = {
    institute: 'Sunrise Academy',
    sitting: 'Science Test 14',
    batch: '10-B',
    title: 'Class 10 Science: Term 1 Practice Paper',
    minutes: 45,
    questions: 30,
    proctoring: true,
};

const NAME = 'Riya Sharma';
const ROLL = '10B-17';
const CODE = '482913';

const RESULT: ResultData = {
    exam: 'Science Test 14',
    title: INFO.title,
    score: 26,
    max: 30,
    rank: 3,
    of: 30,
    correct: 26,
    wrong: 3,
    skipped: 1,
    average: 19.4,
    highest: 28,
    sections: [
        { name: 'Physics', score: 9, max: 10 },
        { name: 'Chemistry', score: 9, max: 10 },
        { name: 'Biology', score: 8, max: 10 },
    ],
    strong: ['Electricity', 'Acids and bases'],
    weak: ['Lenses'],
};

const typed = (word: string, ms: number, base: Omit<Step, 'ms'>, key: 'code' | 'roll' | 'pin'): Step[] =>
    Array.from({ length: word.length }, (_, i) => ({ ...base, [key]: word.slice(0, i + 1), ms }));

const IDENTITY: Omit<Step, 'ms'> = { stage: 'identity', scene: 1 };

const SCRIPT: Step[] = [
    { stage: 'code', scene: 0, code: '', ms: 1400 },
    ...typed(CODE.slice(0, 3), 210, { stage: 'code', scene: 0 }, 'code'),
    ...typed(CODE, 210, { stage: 'code', scene: 0 }, 'code').slice(3, 5),
    { stage: 'code', scene: 0, code: CODE, busy: true, ms: 950 },
    { stage: 'code', scene: 0, code: CODE, busy: true, leaving: true, ms: 280 },

    { ...IDENTITY, focus: null, ms: 900 },
    { ...IDENTITY, focus: 'roll', ms: 650 },
    ...typed(ROLL, 150, { ...IDENTITY, focus: 'roll' }, 'roll'),
    { ...IDENTITY, roll: ROLL, focus: 'roll', ms: 350 },
    { ...IDENTITY, roll: ROLL, focus: 'pin', scroll: 190, ms: 700 },
    ...typed('7391', 230, { ...IDENTITY, roll: ROLL, focus: 'pin', scroll: 190 }, 'pin'),
    { ...IDENTITY, roll: ROLL, pin: '7391', scroll: 190, pressed: true, ms: 260 },
    { ...IDENTITY, roll: ROLL, pin: '7391', scroll: 190, busy: true, ms: 850 },
    { ...IDENTITY, roll: ROLL, pin: '7391', scroll: 190, busy: true, leaving: true, ms: 280 },

    { stage: 'lobby', scene: 2, joined: 24, ms: 1300 },
    { stage: 'lobby', scene: 2, joined: 25, ms: 800 },
    { stage: 'lobby', scene: 2, joined: 26, ms: 700 },
    { stage: 'lobby', scene: 2, joined: 27, ms: 1500 },
    { stage: 'lobby', scene: 2, joined: 28, live: true, ms: 1900 },
    { stage: 'lobby', scene: 2, joined: 28, live: true, pressed: true, ms: 280 },
    { stage: 'lobby', scene: 2, joined: 28, live: true, leaving: true, ms: 280 },

    { stage: 'done', scene: 3, ms: 2400 },
    { stage: 'done', scene: 3, leaving: true, ms: 280 },
    { stage: 'result', scene: 3, ms: 2800 },
    { stage: 'result', scene: 3, scroll: 330, ms: 3200 },
];

/** Reduced motion: the lobby, a moment before the start. */
const STILL_STEP = SCRIPT.findIndex((s) => s.stage === 'lobby' && s.joined === 27);

const CAPTIONS = [
    ['Join with a code', 'testoza.com/join and six digits from the board'],
    ['Check in, no account', 'A roll number and the PIN from a printed slip'],
    ['Wait in the lobby', 'The exam starts when the teacher taps Start'],
    ['The result, when it’s released', 'Marks, rank, sections and the class average'],
] as const;

function StatusBar() {
    return (
        <div className="ma-statusbar">
            <span>9:41</span>
            <span className="ma-statusbar-icons" aria-hidden="true">
                <svg width="18" height="12" viewBox="0 0 18 12">
                    <rect x="0" y="8" width="3" height="4" rx="1" fill="#000" />
                    <rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="#000" />
                    <rect x="10" y="3" width="3" height="9" rx="1" fill="#000" />
                    <rect x="15" y="0" width="3" height="12" rx="1" fill="#000" />
                </svg>
                <svg width="16" height="12" viewBox="0 0 16 12">
                    <path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.1-1.2A10.2 10.2 0 0 0 8 .6C5.3.6 2.8 1.6.9 3.4L2 4.6a8.6 8.6 0 0 1 6-2.4Z" fill="#000" />
                    <path d="M8 5.6c1.4 0 2.6.5 3.6 1.4l1.1-1.2A6.9 6.9 0 0 0 8 4c-1.8 0-3.4.7-4.7 1.8l1.1 1.2c1-.9 2.2-1.4 3.6-1.4Z" fill="#000" />
                    <path d="M8 9c.6 0 1.1.2 1.5.6L8 11.2 6.5 9.6c.4-.4.9-.6 1.5-.6Z" fill="#000" />
                </svg>
                <svg width="27" height="13" viewBox="0 0 27 13">
                    <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="#000" strokeOpacity="0.4" fill="none" />
                    <rect x="2" y="2" width="15" height="9" rx="2" fill="#000" />
                    <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="#000" fillOpacity="0.45" />
                </svg>
            </span>
        </div>
    );
}

function Screen({ frame }: { frame: Step }) {
    switch (frame.stage) {
        case 'code':
            return <CodeStage code={frame.code ?? ''} busy={!!frame.busy} />;
        case 'identity':
            return <IdentityStage info={INFO} roll={frame.roll ?? ''} pin={frame.pin ?? ''} focus={frame.focus ?? null} busy={!!frame.busy} pressed={frame.pressed} />;
        case 'lobby':
            return (
                <LobbyStage
                    name={NAME}
                    title={INFO.title}
                    minutes={INFO.minutes}
                    live={!!frame.live}
                    joined={frame.joined ?? 0}
                    expected={32}
                    proctoring={INFO.proctoring}
                    pressed={frame.pressed}
                />
            );
        case 'done':
            return <DoneStage name={NAME} submittedAt="10:41 am" releaseAt="11:00 am" />;
        case 'result':
            return <ResultView result={RESULT} />;
    }
}

export default function MoodleHero() {
    const rootRef = useRef<HTMLDivElement>(null);
    const screenRef = useRef<HTMLDivElement>(null);
    const deviceRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.8);
    const [step, setStep] = useState(0);
    const [running, setRunning] = useState(false);
    useInert(deviceRef, true);

    // Play only while visible; reduced motion gets a still frame.
    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
            setStep(STILL_STEP);
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

    // The page scrolls as the candidate moves down the form, and back to the top on a new stage.
    useEffect(() => {
        const vp = viewportRef.current;
        if (!vp) return;
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        vp.scrollTo({ top: frame.scroll ?? 0, behavior: frame.scroll && !reduced ? 'smooth' : 'auto' });
    }, [frame.stage, frame.scroll]);

    return (
        <div
            className="ma-stage"
            ref={rootRef}
            role="img"
            aria-label="Animation: a candidate on a phone opens testoza.com/join, types the six-digit code 482 913, checks in with roll number 10B-17 and a four-digit PIN, waits in the lobby as 28 of 32 classmates join, sees the exam start, and later gets the released result: 26 out of 30, rank 3 of 30, with section marks and the class average. No account or password is used."
        >
            <div className="ma-iphone" aria-hidden="true" ref={deviceRef}>
                <i className="ma-iphone-key ma-iphone-key--action" />
                <i className="ma-iphone-key ma-iphone-key--up" />
                <i className="ma-iphone-key ma-iphone-key--down" />
                <i className="ma-iphone-key ma-iphone-key--power" />
                <div className="ma-iphone-screen" ref={screenRef}>
                    <div className="ma-canvas ma-screen" style={{ transform: `scale(${scale})` }}>
                        <div className="ma-island" />
                        <StatusBar />
                        <div className="ma-viewport" ref={viewportRef}>
                            <JoinPageFrame>
                                <div key={frame.stage} className={frame.leaving ? 'ma-stage-out' : 'ma-stage-in'}>
                                    <Screen frame={frame} />
                                </div>
                            </JoinPageFrame>
                        </div>
                        <div className="ma-safari">
                            <div className="ma-safari-bar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m15 18-6-6 6-6" />
                                </svg>
                                <span>
                                    <Lock style={{ width: 12, height: 12 }} /> testoza.com
                                </span>
                                <RotateCw />
                            </div>
                            <div className="ma-safari-home" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="ma-stage-caption" aria-hidden="true">
                <p key={frame.scene} className="is-swap">
                    <b>{CAPTIONS[frame.scene][0]}</b>
                    {CAPTIONS[frame.scene][1]}
                </p>
                <div className="ma-dots">
                    {CAPTIONS.map((_, i) => (
                        <i key={i} className={i === frame.scene ? 'is-on' : undefined} />
                    ))}
                </div>
            </div>
        </div>
    );
}
