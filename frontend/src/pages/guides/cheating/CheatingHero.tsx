/**
 * Hero for /prevent-cheating-in-online-exams: twenty minutes into a weekly test, a
 * candidate leaves the exam to ask the class group about question 14, comes back to
 * TestoZa's warning ("Warning 1/2: Tab Switching / Navigation is not allowed!"), and the
 * examiner's exam room shows "1 warning" next to the name. The exam screen and the dialog
 * are the product's (examScreen.tsx); the chat app is a generic messenger, not any
 * brand's.
 *
 * Size: the phone is drawn at 393 × 852 points, scaled to the stage, and the stage never
 * makes the first screen scroll (see .pc-stage). Plays only while visible; reduced
 * motion shows the warning with the exam room card.
 */
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronLeft, Lock, RotateCw } from 'lucide-react';
import { EXAM } from '@/guides/cheatingData';
import { Avatar, CARD, Flag, StatusIcons, useInert } from './replica';
import ExamScreen, { ViolationDialog } from './examScreen';

const SECONDS = 19 * 60 + 48;

interface Frame {
    scene: 0 | 1 | 2 | 3;
    ms: number;
    screen: 'exam' | 'chat';
    messages?: number;
    dialog?: boolean;
    room?: boolean;
    picked?: 'B' | null;
    warnings: number;
}

const SCRIPT: Frame[] = [
    { scene: 0, ms: 2200, screen: 'exam', warnings: 0 },
    { scene: 1, ms: 700, screen: 'chat', messages: 1, warnings: 0 },
    { scene: 1, ms: 1100, screen: 'chat', messages: 2, warnings: 0 },
    { scene: 1, ms: 1700, screen: 'chat', messages: 3, warnings: 0 },
    { scene: 2, ms: 2600, screen: 'exam', dialog: true, warnings: 1 },
    { scene: 3, ms: 2600, screen: 'exam', dialog: true, room: true, warnings: 1 },
    { scene: 3, ms: 2200, screen: 'exam', room: true, picked: 'B', warnings: 1 },
];

/** Reduced motion: the warning with the exam room card. */
const STILL = 5;

const CAPTIONS = [
    ['Question 14, twenty minutes in', 'Rules on: app-switch detection, 2 warnings'],
    ['A quick look at the class group', 'The exam page is hidden while the chat is open'],
    ['Back in the exam: a warning', 'One more and the paper submits itself'],
    ['And the examiner sees it', 'In the exam room, seconds later'],
] as const;

const MESSAGES = [
    { from: 'Priya', mine: false, text: 'anyone done the physiology test yet?' },
    { from: 'Rohan', mine: true, text: 'Q14: which part of the brain controls balance??' },
    { from: 'Kabir', mine: false, text: 'cerebellum. B' },
];

/** A generic group chat on the phone (no brand). */
function Chat({ count }: { count: number }) {
    return (
        <div className="pc-chat">
            <div className="pc-chat-head">
                <ChevronLeft aria-hidden="true" />
                <span className="pc-chat-avatar">NB</span>
                <div>
                    <b>NEET 2027 · B</b>
                    <span>38 members</span>
                </div>
            </div>
            <div className="pc-chat-body">
                <p className="pc-chat-day">Today</p>
                {MESSAGES.slice(0, count).map((m, i) => (
                    <div key={i} className={`pc-chat-msg pc-rise${m.mine ? ' is-mine' : ''}`}>
                        {!m.mine && <small>{m.from}</small>}
                        {m.text}
                        <time>10:2{i}</time>
                    </div>
                ))}
            </div>
            <div className="pc-chat-input">
                <span>Message</span>
            </div>
        </div>
    );
}

export default function CheatingHero() {
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
        <div className="pc-stage-wrap" ref={rootRef}>
            <div
                className="pc-stage"
                role="img"
                aria-label="Animation: twenty minutes into an online test, a candidate leaves TestoZa’s exam screen to ask the class group chat about question 14. Back in the exam, a dialog says “Warning 1/2: Tab Switching / Navigation is not allowed!”, and the examiner’s exam room shows “1 warning” next to the candidate’s name."
            >
                <div className="pc-iphone" aria-hidden="true" ref={deviceRef}>
                    <i className="pc-iphone-key pc-iphone-key--action" />
                    <i className="pc-iphone-key pc-iphone-key--up" />
                    <i className="pc-iphone-key pc-iphone-key--down" />
                    <i className="pc-iphone-key pc-iphone-key--power" />
                    <div className="pc-iphone-screen" ref={screenRef}>
                        <div className="pc-canvas pc-screen" style={{ transform: `scale(${scale})` }}>
                            <div className="pc-island" />
                            <div className={`pc-statusbar${frame.screen === 'chat' ? ' is-plain' : ''}`}>
                                <span>10:21</span>
                                <StatusIcons />
                            </div>
                            {frame.screen === 'chat' ? (
                                <div className="pc-viewport pc-viewport--chat pc-stage-in" key="chat">
                                    <Chat count={frame.messages ?? 0} />
                                </div>
                            ) : (
                                <>
                                    <div className={`pc-viewport pc-viewport--app${frame.scene === 2 ? ' pc-stage-in' : ''}`} key={`exam-${frame.scene === 0 ? 'a' : 'b'}`}>
                                        {/* One child, so the viewport's sizing rules don't stretch the dialog. */}
                                        <div className="relative">
                                            <ExamScreen index={0} number={14} selected={frame.picked ?? null} seconds={SECONDS} warnings={frame.warnings} limit={2} />
                                            {frame.dialog && <ViolationDialog title="⚠️ Warning" message="Warning 1/2: Tab Switching / Navigation is not allowed!" />}
                                        </div>
                                    </div>
                                    <div className="pc-safari">
                                        <div className="pc-safari-bar">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="m15 18-6-6 6-6" />
                                            </svg>
                                            <span>
                                                <Lock style={{ width: 12, height: 12 }} /> app.testoza.com
                                            </span>
                                            <RotateCw />
                                        </div>
                                        <div className="pc-safari-home" />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {frame.room && (
                <div className="pc-hero-room" aria-hidden="true" key="room">
                    <p>
                        Exam room · {EXAM.sitting}
                        <span>Need a look</span>
                    </p>
                    <div className={`${CARD} pc-screen flex items-center gap-3 px-3.5 py-3`}>
                        <Avatar name="Rohan Verma" />
                        <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                                <span className="truncate text-[14px] font-semibold text-slate-900">Rohan Verma</span>
                                <span className="shrink-0 text-[12px] text-slate-500">B-03</span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                                <span className="text-emerald-700">Writing</span>
                                <span className="text-slate-500">13 answered</span>
                                <Flag icon={AlertTriangle} tone="amber">
                                    1 warning
                                </Flag>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="pc-stage-caption" aria-hidden="true">
                <p key={frame.scene} className="is-swap">
                    <b>{CAPTIONS[frame.scene][0]}</b>
                    {CAPTIONS[frame.scene][1]}
                </p>
                <div className="pc-dots">
                    {CAPTIONS.map((_, i) => (
                        <i key={i} className={i === frame.scene ? 'is-on' : undefined} />
                    ))}
                </div>
            </div>
        </div>
    );
}
