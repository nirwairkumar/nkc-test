/**
 * Hero for /neet-online-test-software: an iPhone in Safari running TestoZa's
 * NTA-style exam screen (ExamScreen, phone layout) through the last minutes of a
 * 180-question NEET mock. The student answers a Botany question they had marked
 * for review, answers the diagram question after it, opens the palette, finds the
 * last unanswered Zoology question, answers it, submits (the real "Submit Test?"
 * summary with its section breakdown) and lands on the results page.
 *
 * The numbers agree end to end: 168 answered and 12 unanswered at submission;
 * 153 right and 15 wrong, so 4 × 153 − 15 = 597 / 720 on the results page.
 * Plays only while on screen; reduced motion shows a still exam screen.
 */
import { useEffect, useRef, useState } from 'react';
import { Lock, RotateCw } from 'lucide-react';
import { MINI_MOCK, type OptionKey } from '@/guides/neetMiniMock';
import ExamScreen, { type Control, type PillState } from './ExamScreen';
import { useInert } from './examUtils';
import ResultsScreen, { type ResultSection } from './ResultsScreen';

const SECTIONS = [
    { name: 'Physics', count: 45 },
    { name: 'Chemistry', count: 45 },
    { name: 'Botany', count: 45 },
    { name: 'Zoology', count: 45 },
];

const RESULT: ResultSection[] = [
    { name: 'Physics', totalQ: 45, correct: 34, wrong: 6, skipped: 5 },
    { name: 'Chemistry', totalQ: 45, correct: 38, wrong: 4, skipped: 3 },
    { name: 'Botany', totalQ: 45, correct: 41, wrong: 2, skipped: 2 },
    { name: 'Zoology', totalQ: 45, correct: 40, wrong: 3, skipped: 2 },
];

/** Question numbers (1-based) that are not plainly answered when the clip starts. */
const START_STATES: Record<number, PillState> = {
    7: 'na', 19: 'rev', 28: 'na', 33: 'na', 44: 'rev', 12: 'revans', 38: 'revans',
    52: 'na', 71: 'rev', 88: 'na', 60: 'revans', 79: 'revans',
    96: 'rev', 97: 'na', 109: 'na', 128: 'rev', 101: 'revans', 117: 'revans',
    151: 'na', 163: 'na', 177: 'na', 144: 'revans', 170: 'revans',
};

interface Step {
    /** Question on screen (1-based). */
    q: 96 | 97 | 151;
    pick?: OptionKey;
    press?: Control;
    sheet?: 'botany' | 'zoology';
    dialog?: boolean;
    results?: boolean;
    ms: number;
    /** Caption shown under the phone. */
    scene: 0 | 1 | 2 | 3;
}

const SCRIPT: Step[] = [
    { q: 96, ms: 1500, scene: 0 },
    { q: 96, press: 'opt-A', ms: 260, scene: 0 },
    { q: 96, pick: 'A', ms: 750, scene: 0 },
    { q: 96, pick: 'A', press: 'save', ms: 280, scene: 0 },
    { q: 97, ms: 1900, scene: 0 },
    { q: 97, press: 'opt-C', ms: 260, scene: 0 },
    { q: 97, pick: 'C', ms: 750, scene: 0 },
    { q: 97, pick: 'C', press: 'fab', ms: 280, scene: 1 },
    { q: 97, pick: 'C', sheet: 'botany', ms: 1500, scene: 1 },
    { q: 97, pick: 'C', sheet: 'zoology', ms: 1300, scene: 1 },
    { q: 97, pick: 'C', sheet: 'zoology', press: 'pal-150', ms: 320, scene: 1 },
    { q: 151, ms: 1500, scene: 1 },
    { q: 151, press: 'opt-D', ms: 260, scene: 1 },
    { q: 151, pick: 'D', ms: 850, scene: 2 },
    { q: 151, pick: 'D', press: 'submit', ms: 280, scene: 2 },
    { q: 151, pick: 'D', dialog: true, ms: 2900, scene: 2 },
    { q: 151, pick: 'D', dialog: true, press: 'confirm', ms: 300, scene: 2 },
    { q: 151, results: true, ms: 4800, scene: 3 },
];

const STILL_STEP = 6;
const START_SECONDS = 8 * 60 + 40;

const CAPTIONS = [
    ['Answering on the NTA-style screen', 'Botany questions with +4 | −1 marking and Save & Next'],
    ['The question palette', 'Answered, not answered and marked for review, by subject'],
    ['Submitting', 'A summary by section before the paper goes in'],
    ['The result, as soon as it’s submitted', '597 out of 720, with each subject’s marks'],
] as const;

function statesAt(step: number): PillState[] {
    const states: PillState[] = Array.from({ length: 180 }, (_, i) => START_STATES[i + 1] ?? 'ans');
    // Answering keeps a review mark, so 96 becomes "answered and marked".
    if (step >= 2) states[95] = 'revans';
    if (step >= 6) states[96] = 'ans';
    if (step >= 13) states[150] = 'ans';
    return states;
}

function StatusBar() {
    return (
        <div className="ng-statusbar">
            <span>9:41</span>
            <span className="ng-statusbar-icons" aria-hidden="true">
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
                    <rect x="2" y="2" width="17" height="9" rx="2" fill="#000" />
                    <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="#000" fillOpacity="0.45" />
                </svg>
            </span>
        </div>
    );
}

export default function NeetHero() {
    const rootRef = useRef<HTMLDivElement>(null);
    const screenRef = useRef<HTMLDivElement>(null);
    const deviceRef = useRef<HTMLDivElement>(null);
    const sheetBodyRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.8);
    const [step, setStep] = useState(0);
    const [running, setRunning] = useState(false);
    const [seconds, setSeconds] = useState(START_SECONDS);
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

    // The phone's web view is drawn at 393 × 852 points and scaled to the screen.
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

    useEffect(() => {
        if (!running || frame.results) return;
        const id = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
        return () => window.clearInterval(id);
    }, [running, frame.results]);

    // The palette sheet scrolls to the section the student is looking for.
    useEffect(() => {
        const body = sheetBodyRef.current;
        if (!body) return;
        if (!frame.sheet) {
            if (!frame.press?.startsWith('pal')) body.scrollTo({ top: 0 });
            return;
        }
        const heads = body.querySelectorAll('h4');
        const head = heads[frame.sheet === 'botany' ? 2 : 3] as HTMLElement | undefined;
        if (head) body.scrollTo({ top: head.offsetTop - body.offsetTop - 12, behavior: 'smooth' });
    }, [frame.sheet, frame.press]);

    const question = MINI_MOCK[frame.q === 96 ? 3 : frame.q === 97 ? 4 : 5];
    const sheetOpen = !!frame.sheet || frame.press === 'pal-150';

    return (
        <div
            className="ng-stage"
            ref={rootRef}
            role="img"
            aria-label="Animation: a student on a phone finishes a 180-question NEET mock on TestoZa's NTA-style exam screen, answers a Botany question and a diagram question, opens the question palette, answers the last unanswered Zoology question, submits, and sees a score of 597 out of 720 with marks for each subject."
        >
            <div className="ng-iphone" aria-hidden="true" ref={deviceRef}>
                <i className="ng-iphone-key ng-iphone-key--action" />
                <i className="ng-iphone-key ng-iphone-key--up" />
                <i className="ng-iphone-key ng-iphone-key--down" />
                <i className="ng-iphone-key ng-iphone-key--power" />
                <div className="ng-iphone-screen" ref={screenRef}>
                    <div className="ng-canvas" style={{ transform: `scale(${scale})` }}>
                        <div className="ng-island" />
                        <StatusBar />
                        <div className="ng-viewport">
                            {frame.results ? (
                                <ResultsScreen title="NEET Full Mock 07" sections={RESULT} phone />
                            ) : (
                                <ExamScreen
                                    layout="phone"
                                    title="NEET Full Mock 07 · Physics, Chemistry, Biology"
                                    sections={SECTIONS}
                                    current={frame.q - 1}
                                    question={question}
                                    selected={frame.pick}
                                    states={statesAt(step)}
                                    seconds={seconds}
                                    sheetOpen={sheetOpen}
                                    dialog={frame.dialog ? 'submit' : null}
                                    pressed={frame.press ?? null}
                                    sheetBodyRef={sheetBodyRef}
                                />
                            )}
                        </div>
                        <div className="ng-safari">
                            <div className="ng-safari-bar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m15 18-6-6 6-6" />
                                </svg>
                                <span>
                                    <Lock style={{ width: 12, height: 12 }} /> testoza.com
                                </span>
                                <RotateCw />
                            </div>
                            <div className="ng-safari-home" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="ng-stage-caption" aria-hidden="true">
                <p key={frame.scene} className="is-swap">
                    <b>{CAPTIONS[frame.scene][0]}</b>
                    {CAPTIONS[frame.scene][1]}
                </p>
                <div className="ng-dots">
                    {CAPTIONS.map((_, i) => (
                        <i key={i} className={i === frame.scene ? 'is-on' : undefined} />
                    ))}
                </div>
            </div>
        </div>
    );
}
