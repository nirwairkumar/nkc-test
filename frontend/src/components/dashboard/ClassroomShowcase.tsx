import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    BookOpen, Check, ClipboardCheck, Eye, FileSpreadsheet, Pause, PenLine, Play, Printer, Send, ShieldCheck, Smartphone, Trophy,
} from 'lucide-react';
import { CARD, LiveDot, WhatsAppIcon } from './dashboardUi';

/**
 * "How an online exam runs in a real class": four steps on the left, an animated scene of
 * the product on the right. For educators who have made a test but never sent one; most of
 * them have simply never seen a class do it.
 *
 * Scenes are drawn on a fixed 600×360 canvas and scaled to the stage, so they look the same
 * on a phone and a wide screen. They play only while on screen, pause on hover or with the
 * button, and stand still (final frame, no autoplay) for people who turn off motion.
 */

const SCENE_MS = 7000;
const CANVAS_W = 600;
const CANVAS_H = 360;

const STEPS = [
    { title: 'Send one link', body: 'Post the exam link in your class WhatsApp group, or read out a 6-digit code in class.' },
    { title: 'They write on their own phones', body: 'Any phone or computer. No app, no sign-up. Full screen, with an alert when someone switches tabs.' },
    { title: 'Marks and ranks as they submit', body: 'Every answer is checked for you. Send the rank list to the group in one tap, or download Excel.' },
    { title: 'No bundle of copies to check', body: 'A paper test means printing, collecting and hours of checking. Online, the checking is done when they submit.' },
];

/** Scene keyframes; also used by ResultsPreview. */
export const SHOWCASE_CSS = `
.cs-a{animation:cs-pop .55s cubic-bezier(.2,.8,.2,1) both;animation-delay:var(--d,0s)}
.cs-left{animation-name:cs-left}
.cs-grow{transform-origin:left center;animation-name:cs-grow;animation-duration:1.5s;animation-timing-function:cubic-bezier(.3,.7,.2,1)}
.cs-select{animation:cs-select .35s ease-out both;animation-delay:var(--d,0s)}
.cs-dot{animation:cs-dot .3s ease-out both;animation-delay:var(--d,0s)}
.cs-ring{animation:cs-ring 1.6s cubic-bezier(.3,.7,.2,1) both;animation-delay:var(--d,0s)}
.cs-pulse{animation:cs-pop .55s cubic-bezier(.2,.8,.2,1) both,cs-pulse 1.6s ease-in-out infinite;animation-delay:var(--d,0s),calc(var(--d,0s) + .6s)}
.cs-progress{transform-origin:left center;animation:cs-grow linear both}
.cs-paused,.cs-paused *{animation-play-state:paused!important}
@keyframes cs-pop{from{opacity:0;transform:translateY(12px) scale(.96)}}
@keyframes cs-left{from{opacity:0;transform:translateX(-16px)}}
@keyframes cs-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes cs-select{from{background-color:#fff;border-color:#e2e8f0}}
@keyframes cs-dot{from{transform:scale(0)}}
@keyframes cs-ring{from{stroke-dashoffset:var(--c)}}
@keyframes cs-pulse{0%,100%{box-shadow:0 0 0 0 rgba(37,211,102,.45)}50%{box-shadow:0 0 0 9px rgba(37,211,102,0)}}
@media (prefers-reduced-motion:reduce){.cs-a,.cs-select,.cs-dot,.cs-ring,.cs-pulse,.cs-grow{animation:none!important}}
`;

export const delay = (s: number) => ({ '--d': `${s}s` }) as React.CSSProperties;

export function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
        if (!mq) return;
        const on = () => setReduced(mq.matches);
        mq.addEventListener?.('change', on);
        return () => mq.removeEventListener?.('change', on);
    }, []);
    return reduced;
}

/** Milliseconds since the scene started, in 100 ms steps, frozen while paused. */
export function useSceneClock(running: boolean, sceneKey: string) {
    const [t, setT] = useState(0);
    const elapsed = useRef(0);
    useEffect(() => {
        elapsed.current = 0;
        setT(0);
    }, [sceneKey]);
    useEffect(() => {
        if (!running) return;
        let raf = 0;
        let last = performance.now();
        const loop = (now: number) => {
            elapsed.current += now - last;
            last = now;
            const step = Math.floor(elapsed.current / 100) * 100;
            setT(prev => (prev === step ? prev : step));
            if (elapsed.current < SCENE_MS) raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [running, sceneKey]);
    return t;
}

/** A number that counts up from `fromMs` for `forMs`, easing out. */
export const countUp = (t: number, to: number, fromMs: number, forMs: number) => {
    const p = Math.min(1, Math.max(0, (t - fromMs) / forMs));
    return Math.round(to * (1 - (1 - p) ** 3));
};

export default function ClassroomShowcase() {
    const reduced = usePrefersReducedMotion();
    const [active, setActive] = useState(0);
    const [cycle, setCycle] = useState(0);
    const [playing, setPlaying] = useState(true);
    const [hovered, setHovered] = useState(false);
    const [onScreen, setOnScreen] = useState(false);
    const [scale, setScale] = useState(1);
    const sectionRef = useRef<HTMLElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);

    const running = playing && onScreen && !hovered && !reduced;
    const sceneKey = `${active}-${cycle}`;
    const clock = useSceneClock(running, sceneKey);
    const t = reduced ? SCENE_MS : clock;

    const go = useCallback((i: number) => {
        setActive(i);
        setCycle(c => c + 1);
    }, []);
    const next = () => go((active + 1) % STEPS.length);

    // Play only while at least a third of the card is on screen.
    useEffect(() => {
        const el = sectionRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') {
            setOnScreen(true);
            return;
        }
        const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.35 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    // Fit the 600×360 canvas to the stage width (a little larger on wide screens).
    useLayoutEffect(() => {
        const el = stageRef.current;
        if (!el) return;
        const fit = () => setScale(Math.min(1.12, (el.clientWidth - 24) / CANVAS_W));
        fit();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const Scene = [SendScene, WriteScene, ResultsScene, PaperScene][active];

    return (
        <section ref={sectionRef} aria-labelledby="showcase-heading" className={`${CARD} overflow-hidden`}>
            <style>{SHOWCASE_CSS}</style>
            <div className="grid gap-x-2 lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
                <div className="px-5 pt-5 lg:col-start-1 lg:row-start-1 lg:pl-6 lg:pt-6">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-sky-700">New to online exams?</p>
                    <h2 id="showcase-heading" className="mt-1.5 text-[20px] font-bold leading-snug tracking-[-0.02em] text-slate-900">
                        How an online exam runs in a real class
                    </h2>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">What your candidates see and what you see, from the link to the marks.</p>
                </div>

                <div className="p-3 sm:p-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pl-2">
                    <div
                        ref={stageRef}
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}
                        className="relative overflow-hidden rounded-xl bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.07)_1px,transparent_0)] bg-[length:18px_18px] ring-1 ring-inset ring-slate-900/[0.05]"
                        style={{ height: CANVAS_H * scale + 24 }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-sky-50/90 via-white/60 to-emerald-50/80" />
                        <div
                            aria-hidden="true"
                            className={`absolute left-1/2 top-3 ${running || reduced ? '' : 'cs-paused'}`}
                            style={{ width: CANVAS_W, height: CANVAS_H, transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'top center' }}
                        >
                            <Scene key={sceneKey} t={t} />
                        </div>
                        {!reduced && (
                            <button
                                type="button"
                                onClick={() => setPlaying(p => !p)}
                                aria-label={playing ? 'Pause the animation' : 'Play the animation'}
                                className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm ring-1 ring-slate-900/[0.08] backdrop-blur transition-colors hover:text-slate-900 cursor-pointer"
                            >
                                {playing ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}
                            </button>
                        )}
                    </div>
                </div>

                <ol className="space-y-1 px-3 pb-4 lg:col-start-1 lg:row-start-2 lg:px-4 lg:pb-5 lg:pt-3">
                    {STEPS.map((s, i) => {
                        const on = i === active;
                        return (
                            <li key={s.title}>
                                <button
                                    type="button"
                                    onClick={() => go(i)}
                                    aria-current={on ? 'step' : undefined}
                                    className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer ${on ? 'bg-slate-50 ring-1 ring-inset ring-slate-900/[0.05]' : 'hover:bg-slate-50/70'}`}
                                >
                                    <span className="flex items-center gap-2.5">
                                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${on ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            {i + 1}
                                        </span>
                                        <span className={`text-[14px] font-semibold ${on ? 'text-slate-900' : 'text-slate-600'}`}>{s.title}</span>
                                    </span>
                                    {on && (
                                        <>
                                            <span className="mt-1 block pl-[34px] text-[13px] leading-snug text-slate-600">{s.body}</span>
                                            {!reduced && (
                                                <span className="ml-[34px] mt-2.5 block h-[3px] overflow-hidden rounded-full bg-slate-200">
                                                    <span
                                                        key={sceneKey}
                                                        className="cs-progress block h-full rounded-full bg-primary"
                                                        style={{ animationDuration: `${SCENE_MS}ms`, animationPlayState: running ? 'running' : 'paused' }}
                                                        onAnimationEnd={next}
                                                    />
                                                </span>
                                            )}
                                        </>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
}

/* ── Shared scene parts ──────────────────────────────────────────────────── */

export function Phone({ left, top, width, height, tilt = 0, d = 0, children }: {
    left: number; top: number; width: number; height: number; tilt?: number; d?: number; children: React.ReactNode;
}) {
    return (
        <div className="absolute" style={{ left, top, width, height, transform: tilt ? `rotate(${tilt}deg)` : undefined }}>
            <div className="cs-a h-full rounded-[28px] bg-slate-900 p-[6px] shadow-[0_24px_50px_-24px_rgba(15,23,42,0.7)]" style={delay(d)}>
                <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[22px] bg-white">{children}</div>
            </div>
        </div>
    );
}

export function Float({ left, top, width, d, children, className = '' }: {
    left: number; top: number; width?: number; d: number; children: React.ReactNode; className?: string;
}) {
    return (
        <div
            className={`cs-a absolute rounded-2xl bg-white p-3 shadow-[0_16px_36px_-18px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/[0.06] ${className}`}
            style={{ left, top, width, ...delay(d) }}
        >
            {children}
        </div>
    );
}

/* ── 1. Send one link ────────────────────────────────────────────────────── */

function SendScene(_props: { t: number }) {
    const replies = [
        { who: 'Aarav', color: 'text-orange-600', text: 'Started ✅', d: 1.4 },
        { who: 'Priya', color: 'text-pink-600', text: 'Writing now 👍', d: 2.1 },
        { who: 'Rohan', color: 'text-violet-600', text: 'Submitted! 🙌', d: 2.8 },
    ];
    return (
        <>
            <Phone left={202} top={4} width={196} height={350}>
                <div className="flex items-center gap-2 bg-[#0b6b5d] px-3 pb-2 pt-3 text-white">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">10B</span>
                    <span>
                        <span className="block text-[11px] font-semibold leading-tight">Class 10 – B</span>
                        <span className="block text-[9px] leading-tight text-white/70">42 members</span>
                    </span>
                </div>
                <div className="flex flex-1 flex-col gap-1.5 bg-[#efeae2] p-2">
                    <div className="cs-a ml-auto w-[152px] rounded-lg rounded-tr-sm bg-[#d9fdd3] p-1.5 shadow-sm" style={delay(0.3)}>
                        <div className="flex items-center gap-1.5 rounded-md bg-white/70 p-1.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-600 text-[10px] font-bold text-white">T</span>
                            <span className="min-w-0">
                                <span className="block truncate text-[8.5px] font-bold text-slate-900">Physics Ch 3 — Laws of Motion</span>
                                <span className="block text-[7.5px] text-slate-500">45 min · 25 questions</span>
                            </span>
                        </div>
                        <p className="mt-1 break-all text-[8.5px] text-[#027eb5] underline">testoza.com/test/physics-ch-3</p>
                        <p className="mt-0.5 text-[8.5px] leading-snug text-slate-800">Open the link, enter your name and roll no, then tap Start.</p>
                        <p className="text-right text-[7px] text-slate-500">7:58 ✓✓</p>
                    </div>
                    {replies.map(r => (
                        <div key={r.who} className="cs-a w-fit max-w-[130px] rounded-lg rounded-tl-sm bg-white px-2 py-1 shadow-sm" style={delay(r.d)}>
                            <p className={`text-[8px] font-semibold ${r.color}`}>{r.who}</p>
                            <p className="text-[9.5px] text-slate-800">{r.text}</p>
                        </div>
                    ))}
                </div>
            </Phone>

            <Float left={14} top={74} width={168} d={3.6}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Or read out a code</p>
                <p className="mt-1.5 text-[26px] font-bold leading-none tracking-[0.06em] text-slate-900 tabular-nums">482 913</p>
                <p className="mt-1.5 text-[11px] text-slate-600">They type it at <span className="font-semibold text-slate-800">testoza.com/join</span></p>
            </Float>

            <Float left={420} top={96} width={166} d={4.2}>
                {['No app to install', 'No sign-up', 'Any phone or computer'].map((x, i) => (
                    <p key={x} className="cs-a flex items-center gap-2 py-1 text-[11.5px] font-medium text-slate-800" style={delay(4.4 + i * 0.3)}>
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-2.5 w-2.5" strokeWidth={3.5} /></span>
                        {x}
                    </p>
                ))}
            </Float>
        </>
    );
}

/* ── 2. They write on their phones ───────────────────────────────────────── */

const PAPERS = [
    { subject: 'Maths', q: 12, text: 'If 3x − 7 = 11, what is the value of x?', options: ['4', '6', '7', '18'], pick: 1 },
    { subject: 'Physics', q: 7, text: 'A 2 kg block is pulled by a 10 N force on a smooth floor. Its acceleration is', options: ['2 m/s²', '5 m/s²', '10 m/s²', '20 m/s²'], pick: 1 },
    { subject: 'Chemistry', q: 18, text: 'Which gas turns lime water milky?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], pick: 2 },
];

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function ExamScreen({ paper, t, pickAt, secondsLeft }: { paper: typeof PAPERS[number]; t: number; pickAt: number; secondsLeft: number }) {
    const left = Math.max(0, secondsLeft - Math.floor(t / 1000));
    return (
        <>
            <div className="flex items-center justify-between border-b border-slate-100 px-2.5 pb-1.5 pt-3">
                <span className="text-[9px] font-bold text-slate-900">{paper.subject} test</span>
                <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-white tabular-nums">{mmss(left)}</span>
            </div>
            <div className="flex gap-[3px] px-2.5 pt-2">
                {Array.from({ length: 10 }, (_, i) => (
                    <span key={i} className={`h-1.5 flex-1 rounded-full ${i < 6 ? 'bg-emerald-400' : i === 6 ? 'bg-sky-500' : 'bg-slate-200'}`} />
                ))}
            </div>
            <div className="flex flex-1 flex-col px-2.5 pt-2">
                <p className="text-[8px] font-medium text-slate-500">Question {paper.q} of 25</p>
                <p className="mt-1 text-[9.5px] font-medium leading-snug text-slate-900">{paper.text}</p>
                <div className="mt-2 space-y-1.5">
                    {paper.options.map((o, i) => {
                        const picked = i === paper.pick;
                        return (
                            <div
                                key={o}
                                className={`flex items-center gap-1.5 rounded-md border px-1.5 py-1.5 ${picked ? 'cs-select border-sky-500 bg-sky-50' : 'border-slate-200 bg-white'}`}
                                style={picked ? delay(pickAt) : undefined}
                            >
                                <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white">
                                    {picked && <span className="cs-dot h-1.5 w-1.5 rounded-full bg-sky-500" style={delay(pickAt)} />}
                                </span>
                                <span className="text-[9px] text-slate-800">{o}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="mb-2.5 mt-auto flex gap-1.5">
                    <span className="flex-1 rounded-md bg-slate-100 py-1 text-center text-[8.5px] font-semibold text-slate-600">Previous</span>
                    <span className="flex-1 rounded-md bg-primary py-1 text-center text-[8.5px] font-semibold text-white">Save &amp; next</span>
                </div>
            </div>
        </>
    );
}

function WriteScene({ t }: { t: number }) {
    return (
        <>
            <Phone left={40} top={36} width={164} height={300} tilt={-5} d={0.1}>
                <ExamScreen paper={PAPERS[0]} t={t} pickAt={1.6} secondsLeft={31 * 60 + 52} />
            </Phone>
            <Phone left={396} top={36} width={164} height={300} tilt={5} d={0.3}>
                <ExamScreen paper={PAPERS[2]} t={t} pickAt={2.6} secondsLeft={33 * 60 + 9} />
            </Phone>
            <Phone left={214} top={4} width={172} height={330} d={0}>
                <ExamScreen paper={PAPERS[1]} t={t} pickAt={2.1} secondsLeft={32 * 60 + 14} />
            </Phone>

            <Float left={8} top={4} d={0.8} className="flex items-center gap-2 !rounded-full !px-3 !py-2">
                <LiveDot />
                <span className="text-[12px] font-semibold text-slate-900 tabular-nums">{countUp(t, 38, 900, 1800)}</span>
                <span className="text-[11px] text-slate-600">writing now</span>
            </Float>
            <Float left={170} top={312} d={3.2} className="flex items-center gap-2 !rounded-full !px-3 !py-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="text-[11.5px] font-medium text-slate-800">Full screen · tab-switch alerts · no copy-paste</span>
            </Float>
        </>
    );
}

/* ── 3. Marks and ranks as they submit ───────────────────────────────────── */

const RANKS = [
    { name: 'Sara Khan', pct: 96 },
    { name: 'Diya Mehta', pct: 92 },
    { name: 'Kavya Nair', pct: 88 },
    { name: 'Arjun Singh', pct: 81 },
    { name: 'Ishaan Reddy', pct: 77 },
];
export const MEDALS = ['bg-amber-100 text-amber-800', 'bg-slate-200 text-slate-700', 'bg-orange-100 text-orange-800'];

function ResultsScene({ t }: { t: number }) {
    const r = 30;
    const c = 2 * Math.PI * r;
    return (
        <>
            <div className="cs-a absolute rounded-2xl bg-white shadow-[0_24px_50px_-26px_rgba(15,23,42,0.55)] ring-1 ring-slate-900/[0.06]" style={{ left: 18, top: 10, width: 398, height: 340, ...delay(0) }}>
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                    <span>
                        <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Results</span>
                        <span className="block text-[12.5px] font-semibold text-slate-900">Physics Ch 3 — Laws of Motion</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-700"><LiveDot /> live</span>
                </div>
                <div className="grid grid-cols-3 gap-2 px-4 pt-3">
                    {[
                        ['Submitted', String(countUp(t, 42, 300, 2200))],
                        ['Average', `${countUp(t, 64, 600, 1800)}%`],
                        ['Highest', `${countUp(t, 96, 600, 1800)}%`],
                    ].map(([label, value]) => (
                        <div key={label} className="rounded-lg bg-slate-50 px-2.5 py-2 ring-1 ring-inset ring-slate-900/[0.04]">
                            <p className="text-[9px] font-medium text-slate-500">{label}</p>
                            <p className="text-[17px] font-bold leading-tight text-slate-900 tabular-nums">{value}</p>
                        </div>
                    ))}
                </div>
                <ol className="space-y-1.5 px-4 pt-3">
                    {RANKS.map((row, i) => (
                        <li key={row.name} className="cs-a cs-left flex items-center gap-2" style={delay(0.9 + i * 0.35)}>
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${MEDALS[i] || 'bg-slate-100 text-slate-600'}`}>{i + 1}</span>
                            <span className="w-[86px] truncate text-[10.5px] text-slate-800">{row.name}</span>
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <span className="cs-a cs-grow block h-full rounded-full bg-emerald-500" style={{ width: `${row.pct}%`, ...delay(1 + i * 0.35) }} />
                            </span>
                            <span className="w-8 text-right text-[10.5px] font-semibold text-slate-900 tabular-nums">{row.pct}%</span>
                        </li>
                    ))}
                </ol>
                <div className="absolute inset-x-4 bottom-3 flex gap-2">
                    <span className="cs-pulse inline-flex h-7 items-center gap-1.5 rounded-full bg-[#25D366] px-3 text-[10.5px] font-semibold text-white" style={delay(3.2)}>
                        <WhatsAppIcon className="h-3.5 w-3.5" /> Send rank list
                    </span>
                    <span className="cs-a inline-flex h-7 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-[10.5px] font-semibold text-slate-700" style={delay(3.5)}>
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Download Excel
                    </span>
                </div>
            </div>

            <Phone left={434} top={30} width={150} height={300} d={1.8}>
                <div className="flex flex-1 flex-col items-center px-3 pt-5 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Your result</p>
                    <div className="relative mt-3 h-[76px] w-[76px]">
                        <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
                            <circle cx="38" cy="38" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
                            <circle
                                cx="38" cy="38" r={r} fill="none" stroke="#0ea5e9" strokeWidth="7" strokeLinecap="round"
                                strokeDasharray={c} strokeDashoffset={c * 0.28}
                                className="cs-ring" style={{ '--c': c, ...delay(2.3) } as React.CSSProperties}
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[16px] font-bold text-slate-900">72%</span>
                    </div>
                    <p className="mt-2 text-[13px] font-bold text-slate-900">72 / 100</p>
                    <p className="mt-0.5 text-[10px] text-slate-600">Rank 9 of 42</p>
                    <div className="mt-3 w-full space-y-1 text-left text-[9.5px]">
                        {[['Correct', '18', 'text-emerald-700'], ['Wrong', '4', 'text-rose-600'], ['Skipped', '3', 'text-slate-500']].map(([k, v, tone]) => (
                            <p key={k} className="flex justify-between rounded-md bg-slate-50 px-2 py-1">
                                <span className="text-slate-600">{k}</span><span className={`font-semibold ${tone}`}>{v}</span>
                            </p>
                        ))}
                    </div>
                </div>
            </Phone>
        </>
    );
}

/* ── 4. Paper test vs online ─────────────────────────────────────────────── */

const PAPER_STEPS = [
    { icon: Printer, text: 'Print 42 copies' },
    { icon: Eye, text: 'Invigilate' },
    { icon: ClipboardCheck, text: 'Collect' },
    { icon: PenLine, text: 'Check 42 copies' },
    { icon: BookOpen, text: 'Enter marks' },
    { icon: Trophy, text: 'Make rank list' },
];
const ONLINE_STEPS = [
    { icon: Send, text: 'Send the link' },
    { icon: Smartphone, text: 'They write' },
    { icon: Trophy, text: 'Marks and ranks are ready' },
];

function Chip({ icon: Icon, text, d, tone }: { icon: React.ComponentType<{ className?: string }>; text: string; d: number; tone: 'paper' | 'online' }) {
    return (
        <span
            className={`cs-a inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10.5px] font-medium ring-1 ${tone === 'paper' ? 'bg-white text-slate-700 ring-slate-200' : 'bg-white text-emerald-800 ring-emerald-200'}`}
            style={delay(d)}
        >
            <Icon className={`h-3.5 w-3.5 ${tone === 'paper' ? 'text-slate-500' : 'text-emerald-600'}`} />
            {text}
        </span>
    );
}

function PaperScene({ t }: { t: number }) {
    const minutes = countUp(t, 150, 2300, 1500);
    return (
        <>
            <div className="cs-a absolute rounded-2xl bg-white p-4 shadow-[0_16px_36px_-20px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/[0.06]" style={{ left: 18, top: 12, width: 564, height: 162, ...delay(0) }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Paper test · class of 42</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {PAPER_STEPS.map((s, i) => <Chip key={s.text} {...s} tone="paper" d={0.3 + i * 0.28} />)}
                </div>
                <div className="mt-4 flex items-center gap-3">
                    <span className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <span className="cs-a cs-grow block h-full w-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500" style={delay(2.3)} />
                    </span>
                    <span className="w-[130px] text-right text-[12px] font-semibold text-rose-700 tabular-nums">
                        ≈ {Math.floor(minutes / 60)} hr {String(minutes % 60).padStart(2, '0')} min
                    </span>
                </div>
                <p className="mt-1.5 text-[9.5px] text-slate-500">Your time after the exam, at about 3 minutes to check one copy</p>
            </div>

            <div className="cs-a absolute rounded-2xl bg-white p-4 shadow-[0_16px_36px_-20px_rgba(5,150,105,0.5)] ring-1 ring-emerald-600/20" style={{ left: 18, top: 188, width: 564, height: 162, ...delay(3) }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Online with TestoZa</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {ONLINE_STEPS.map((s, i) => <Chip key={s.text} {...s} tone="online" d={3.3 + i * 0.3} />)}
                </div>
                <div className="mt-4 flex items-center gap-3">
                    <span className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <span className="cs-a cs-grow block h-full w-[3%] rounded-full bg-emerald-500" style={delay(4.4)} />
                    </span>
                    <span className="cs-a w-[130px] text-right text-[12px] font-semibold text-emerald-700" style={delay(4.6)}>0 min checking</span>
                </div>
                <p className="cs-a mt-1.5 text-[9.5px] text-slate-500" style={delay(4.8)}>Each copy is checked the moment it is submitted</p>
            </div>
        </>
    );
}
