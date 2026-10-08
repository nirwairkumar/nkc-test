/**
 * jadv-papers: a full JEE Advanced mock as one combined test, on a candidate's phone.
 * Three screens, each the product's own with its phone layout resolved (no sm:/md:):
 *   1. Before Paper 1: CombinedIntroPage.tsx (gradient header with total time, questions
 *      and marks; Paper I → break → Paper II cards; instructions; the confirmation box
 *      and "Begin — Start Paper 1").
 *   2. Between the papers: CombinedBreakScreen.tsx ("Take a Breath.", a live countdown,
 *      starting below the see-through banner so nothing shows through it on a phone-height screen;
 *      Add 5 Minutes, Skip Break, a rotating tip, "Start Paper 2 Now"), with the
 *      "Paper 1 Submitted Successfully" banner it opens with.
 *   3. After Paper 2: ResultsPage.tsx's combined view (total out of 360, the combined
 *      percentage, Overview / Paper 1 / Paper 2, each paper's box, combined statistics).
 * Numbers are a made-up candidate's. The side panel (beside the phone from 760 px, a step
 * bar above it on narrow screens) says what each screen is for.
 */
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, BookOpen, Brain, CheckCircle, Clock, Coffee, Droplets, Flame, History, Home, Layers, Plus, Trophy, Wind, Zap } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SESSION } from '@/guides/jadvData';
import { DemoFrame, Phone, useInView, useWidth } from './replica';

type Step = 0 | 1 | 2;

const STEPS = [
    { label: 'Before Paper 1', short: 'Before', title: 'One link, both papers', body: 'Candidates open one link and see the whole session first: both papers, the break between them and the total marks. They sign in, tick the box and start Paper 1 on the usual exam screen.' },
    { label: 'Between the papers', short: 'Break', title: 'The break counts down', body: 'Submitting Paper 1 opens the break. Candidates can take the full break, add five minutes or skip it; Paper 2 opens with one tap. Nobody sees a score yet: results stay locked until both papers are done.' },
    { label: 'After Paper 2', short: 'Result', title: 'One score out of 360', body: 'The result adds the two papers into one total, shows each paper’s marks and percentage, and counts correct, partly correct, wrong and skipped questions across both.' },
] as const;

/** CombinedBreakScreen's tips. */
const TIPS = [
    { icon: Droplets, text: 'Hydrate! Drink a glass of water.', color: 'text-blue-400' },
    { icon: Wind, text: 'Take 5 deep breaths — it calms nerves.', color: 'text-teal-400' },
    { icon: Flame, text: "You're halfway there. Keep going!", color: 'text-orange-400' },
    { icon: Brain, text: 'Quick review your rough work if allowed.', color: 'text-violet-400' },
    { icon: Zap, text: 'Stand up and stretch for 2 minutes.', color: 'text-yellow-400' },
];

const { paper1: P1, paper2: P2 } = SESSION;
const TOTAL_MIN = P1.minutes + P2.minutes + SESSION.breakMinutes;
const COMBINED = P1.score + P2.score;
const MAX = P1.marks + P2.marks;
const PCT = (COMBINED / MAX) * 100;
const PCT_COLOR = PCT >= 75 ? 'text-emerald-400' : PCT >= 50 ? 'text-amber-400' : 'text-red-400';
const skipped = (p: typeof P1) => p.questions - p.correct - p.partial - p.wrong;

function PaperCard({ roman, label, p, tone }: { roman: string; label: string; p: typeof P1; tone: 'violet' | 'blue' }) {
    const violet = tone === 'violet';
    return (
        <div className={cn('flex-1 rounded-2xl border p-5 shadow-sm bg-gradient-to-br', violet ? 'border-violet-200 from-violet-50 to-indigo-50' : 'border-blue-200 from-blue-50 to-indigo-50')}>
            <div className="flex items-center gap-3 mb-4">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black shadow-md flex-shrink-0', violet ? 'bg-violet-600' : 'bg-blue-600')}>{roman}</div>
                <div>
                    <span className={cn('text-[10px] font-black uppercase tracking-wider', violet ? 'text-violet-600' : 'text-blue-600')}>{label}</span>
                    <p className="text-base font-bold text-slate-800 leading-tight line-clamp-1">{p.title}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-3 bg-white/60 rounded-xl shadow-sm border border-white/40">
                    <div className="font-black text-slate-800 text-lg">{p.questions}</div>
                    <div className="text-slate-500 text-[10px] uppercase font-bold">Questions</div>
                </div>
                <div className="text-center p-3 bg-white/60 rounded-xl shadow-sm border border-white/40">
                    <div className="font-black text-slate-800 text-lg">{p.minutes}m</div>
                    <div className="text-slate-500 text-[10px] uppercase font-bold">Duration</div>
                </div>
                <div className="text-center p-3 bg-white/60 rounded-xl col-span-2 shadow-sm border border-white/40">
                    <div className="font-black text-emerald-600 text-lg">{p.marks}</div>
                    <div className="text-slate-500 text-[10px] uppercase font-bold">Max Marks</div>
                </div>
            </div>
        </div>
    );
}

function IntroScreen({ onBegin }: { onBegin: () => void }) {
    const [confirmed, setConfirmed] = useState(false);
    return (
        <div className="mx-auto w-full pt-12 pb-24 px-4 space-y-6 bg-background">
            <div className="relative rounded-3xl overflow-hidden shadow-lg shadow-indigo-900/5">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_70%)]" />
                <div className="relative p-6 text-white">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 bg-white/20 text-white border-0 text-[10px] font-black tracking-widest uppercase">
                            <Layers className="w-3 h-3 mr-1" /> Combined Session
                        </span>
                    </div>
                    <p className="text-2xl font-black leading-tight mb-2">{SESSION.title}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-5 text-xs">
                        <span className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full font-semibold">
                            <Clock className="w-4 h-4" /> {TOTAL_MIN}m total
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full font-semibold">
                            <BookOpen className="w-4 h-4" /> {P1.questions + P2.questions} Questions
                        </span>
                        <span className="flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full font-semibold">
                            <Trophy className="w-4 h-4" /> {MAX} Marks
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-stretch gap-4">
                <PaperCard roman="I" label={SESSION.paper1Label} p={P1} tone="violet" />
                <div className="flex flex-col items-center justify-center gap-2 px-1 py-1 min-w-[64px]">
                    <ArrowRight className="w-5 h-5 text-slate-300 rotate-90" />
                    <div className="flex flex-row items-center justify-center bg-amber-50 border border-amber-200 rounded-xl px-5 py-2.5 text-center gap-2 w-[80%] shadow-sm">
                        <Coffee className="w-5 h-5 text-amber-500" />
                        <span className="text-base font-black text-amber-600">{SESSION.breakMinutes}</span>
                        <span className="text-xs text-amber-500 uppercase font-bold">min break</span>
                    </div>
                </div>
                <PaperCard roman="II" label={SESSION.paper2Label} p={P2} tone="blue" />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="font-black text-slate-800 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Important Instructions
                </p>
                <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <span className="pt-0.5">
                            <strong>Paper I</strong> runs first ({P1.minutes} minutes). Submit when done.
                        </span>
                    </li>
                    <li className="flex items-start gap-3">
                        <Coffee className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <span className="pt-0.5">
                            A <strong>{SESSION.breakMinutes}-minute break</strong> follows. Relax, hydrate, stretch.
                        </span>
                    </li>
                    <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <span className="pt-0.5">
                            <strong>Paper II</strong> starts after the break ({P2.minutes} minutes).
                        </span>
                    </li>
                    <li className="flex items-start gap-3">
                        <Trophy className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                        <span className="pt-0.5">
                            <strong>Results are shown only after both papers</strong> are completed.
                        </span>
                    </li>
                </ul>
            </div>

            <div className="space-y-4">
                <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-2xl bg-white cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                    <input type="checkbox" className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                    <span className="text-sm text-slate-700 leading-relaxed font-medium">I understand that results will only be shown after both papers are completed. I am ready to begin.</span>
                </label>
                <button
                    type="button"
                    disabled={!confirmed}
                    onClick={onBegin}
                    className={cn(
                        buttonVariants({ size: 'lg' }),
                        'w-full h-14 text-lg font-black bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 shadow-xl shadow-indigo-200/50 transition-all disabled:opacity-50 disabled:pointer-events-none',
                    )}
                >
                    <Layers className="w-5 h-5 mr-2" />
                    Begin — Start {SESSION.paper1Label}
                    <ArrowRight className="w-5 h-5 ml-2" />
                </button>
            </div>
        </div>
    );
}

function BreakScreen({ running, onStart }: { running: boolean; onStart: () => void }) {
    const total = SESSION.breakMinutes * 60;
    const [secondsLeft, setSecondsLeft] = useState(total);
    const [tip, setTip] = useState(0);
    const [banner, setBanner] = useState(true);

    useEffect(() => {
        if (!running) return;
        const id = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
        const t = window.setInterval(() => setTip((i) => (i + 1) % TIPS.length), 8000);
        return () => {
            window.clearInterval(id);
            window.clearInterval(t);
        };
    }, [running]);
    useEffect(() => {
        const id = window.setTimeout(() => setBanner(false), 7000);
        return () => window.clearTimeout(id);
    }, []);

    // CombinedBreakScreen: elapsed over the planned break, so added minutes hold the bar back.
    const progress = Math.max(0, Math.min(100, ((total - secondsLeft) / total) * 100));
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const Tip = TIPS[tip].icon;
    const outline = cn(buttonVariants({ variant: 'outline' }), 'flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white py-6 rounded-2xl gap-2 group');

    return (
        <div className="relative min-h-full w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center pt-28 pb-12 px-4 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-700/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-700/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />


            <div className="relative z-10 w-full max-w-lg text-center space-y-8">
                <div className="space-y-2">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Coffee className="w-12 h-12 text-amber-400 animate-bounce" />
                    </div>
                    <p className="text-4xl font-black text-white leading-tight">Take a Breath.</p>
                    <p className="text-indigo-300 text-lg font-medium">{SESSION.paper2Label} begins when you&apos;re ready.</p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 space-y-4">
                    <p className="text-white/60 text-xs font-black uppercase tracking-widest">Break Time Remaining</p>
                    <div className="flex items-center justify-center gap-2">
                        <div className="flex flex-col items-center bg-white/10 rounded-2xl px-6 py-4 min-w-[80px]">
                            <span className="text-5xl font-black text-white tabular-nums">{String(mins).padStart(2, '0')}</span>
                            <span className="text-xs text-white/50 uppercase font-bold mt-1">min</span>
                        </div>
                        <span className="text-4xl font-black text-white/40 mb-1">:</span>
                        <div className="flex flex-col items-center bg-white/10 rounded-2xl px-6 py-4 min-w-[80px]">
                            <span className="text-5xl font-black text-white tabular-nums">{String(secs).padStart(2, '0')}</span>
                            <span className="text-xs text-white/50 uppercase font-bold mt-1">sec</span>
                        </div>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex flex-col gap-3 pt-2">
                        <button
                            type="button"
                            className={outline}
                            onClick={() => setSecondsLeft((s) => s + 300)}
                        >
                            <Plus className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                            Add 5 Minutes
                        </button>
                        <button type="button" className={outline} onClick={onStart}>
                            <Zap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                            Skip Break
                        </button>
                    </div>
                    <p className="text-white/40 text-[10px] font-medium italic">Feeling refreshed? You can skip the break or add more time if needed.</p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <Tip className={`w-5 h-5 ${TIPS[tip].color}`} />
                    </div>
                    <p className="text-white/80 text-sm font-medium text-left">{TIPS[tip].text}</p>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-3 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <p className="text-amber-300/90 text-sm font-medium text-left">
                        <strong>Combined results</strong> will be shown after {SESSION.paper2Label} is complete.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onStart}
                    className={cn(buttonVariants({ size: 'lg' }), 'w-full h-14 text-lg font-black bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white border-0 shadow-2xl shadow-indigo-500/30 transition-all')}
                >
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Start {SESSION.paper2Label} Now
                </button>
                <p className="text-white/30 text-xs">Results are locked until both papers are complete</p>
            </div>

            {/* The product's banner is position: fixed over the page; last here, so it paints on top. */}
            {banner && (
                <div className="absolute top-6 left-0 right-0 flex justify-center z-[100] px-4 ja-pf-banner" style={{ zIndex: 100 }}>
                    <div className="w-full max-w-lg bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 rounded-xl overflow-hidden shadow-2xl shadow-emerald-500/20 mx-4">
                        <div className="px-6 py-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/40">
                                <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-emerald-100 font-bold text-sm tracking-tight">{SESSION.paper1Label} Submitted Successfully</p>
                                <p className="text-emerald-300/50 text-[10px] font-black uppercase tracking-widest mt-0.5">Session Progress Saved</p>
                            </div>
                        </div>
                        <div className="h-1 bg-emerald-500 ja-pf-drain" />
                    </div>
                </div>
            )}
        </div>
    );
}

function SummaryBox({ label, p, color }: { label: string; p: typeof P1; color: 'violet' | 'blue' }) {
    const c = {
        violet: { border: 'border-violet-200', bg: 'bg-violet-50', num: 'text-violet-700', badge: 'bg-violet-100 text-violet-700' },
        blue: { border: 'border-blue-200', bg: 'bg-blue-50', num: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
    }[color];
    return (
        <div className={`rounded-2xl border p-5 ${c.border} ${c.bg}`}>
            <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-black uppercase tracking-wider ${c.num}`}>{label}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{((p.score / p.marks) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-end gap-2 mb-2">
                <span className={`text-3xl font-black ${c.num}`}>{p.score.toFixed(2)}</span>
                <span className="text-slate-400 text-sm mb-1 font-medium">/ {p.marks}</span>
            </div>
            <p className="text-xs text-slate-500 font-medium line-clamp-1">{p.title}</p>
            <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center p-1.5 bg-white/60 rounded-lg">
                    <div className="text-sm font-black text-emerald-600">{p.correct}</div>
                    <div className="text-[9px] text-slate-400 uppercase font-bold">Correct</div>
                </div>
                <div className="text-center p-1.5 bg-white/60 rounded-lg">
                    <div className="text-sm font-black text-red-500">{p.wrong}</div>
                    <div className="text-[9px] text-slate-400 uppercase font-bold">Wrong</div>
                </div>
                <div className="text-center p-1.5 bg-white/60 rounded-lg">
                    <div className="text-sm font-black text-slate-500">{skipped(p)}</div>
                    <div className="text-[9px] text-slate-400 uppercase font-bold">Skipped</div>
                </div>
            </div>
        </div>
    );
}

function ResultScreen() {
    const [tab, setTab] = useState<'overview' | 'paper1' | 'paper2'>('overview');
    const stats = [
        { label: 'Total Correct', value: P1.correct + P2.correct, color: 'text-emerald-600' },
        { label: 'Total Wrong', value: P1.wrong + P2.wrong, color: 'text-red-500' },
        { label: 'Total Partial', value: P1.partial + P2.partial, color: 'text-amber-500' },
        { label: 'Total Skipped', value: skipped(P1) + skipped(P2), color: 'text-slate-400' },
    ];
    return (
        <div className="mx-auto w-full py-6 px-4 space-y-6 bg-background">
            <div className="relative rounded-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_70%)]" />
                <div className="relative p-8 text-white">
                    <div className="flex items-center gap-2 mb-3">
                        <Layers className="w-5 h-5 text-white/70" />
                        <span className="text-white/70 text-sm font-medium">Combined Session Results</span>
                    </div>
                    <p className="text-3xl font-black mb-1">{SESSION.title}</p>
                    <div className="flex flex-wrap items-end gap-4 mt-5">
                        <div>
                            <div className="text-white/60 text-xs font-black uppercase tracking-wider mb-1">Total Marks Obtained</div>
                            <div className={`text-6xl font-black ${PCT_COLOR}`}>{COMBINED.toFixed(2)}</div>
                            <div className="text-white/60 text-sm font-medium">out of {MAX}</div>
                        </div>
                        <div className="pb-2">
                            <div className="text-white/60 text-xs font-black uppercase tracking-wider mb-1">Combined Percentage</div>
                            <div className={`text-4xl font-black ${PCT_COLOR}`}>{PCT.toFixed(3)}%</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                {(
                    [
                        ['overview', 'Overview'],
                        ['paper1', SESSION.paper1Label],
                        ['paper2', SESSION.paper2Label],
                    ] as const
                ).map(([k, label]) => (
                    <button key={k} type="button" className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${tab === k ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setTab(k)}>
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'overview' ? (
                <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-4">
                        <SummaryBox label={SESSION.paper1Label} p={P1} color="violet" />
                        <SummaryBox label={SESSION.paper2Label} p={P2} color="blue" />
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <p className="font-black text-slate-800 mb-4">Combined Statistics</p>
                        <div className="grid grid-cols-2 gap-3">
                            {stats.map(({ label, value, color }) => (
                                <div key={label} className="text-center p-3 bg-slate-50 rounded-xl">
                                    <div className={`text-2xl font-black ${color}`}>{value}</div>
                                    <div className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <span className={cn(buttonVariants({ variant: 'outline' }), 'flex-1')}>
                            <History className="w-4 h-4 mr-2" /> View History
                        </span>
                        <span className={cn(buttonVariants(), 'flex-1 bg-indigo-600 hover:bg-indigo-700 text-white')}>
                            <Home className="w-4 h-4 mr-2" /> Dashboard
                        </span>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <SummaryBox label={tab === 'paper1' ? SESSION.paper1Label : SESSION.paper2Label} p={tab === 'paper1' ? P1 : P2} color={tab === 'paper1' ? 'violet' : 'blue'} />
                    <p className="ja-pf-note">Here the product shows that paper’s full result page: every question, its marks and the time spent on it.</p>
                </div>
            )}
        </div>
    );
}

export default function PapersFlow() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const width = useWidth(bodyRef);
    const wide = width >= 760;
    const visible = useInView(bodyRef, 0.3);
    const [step, setStep] = useState<Step>(0);
    const [run, setRun] = useState(0);

    const go = (s: Step) => {
        setStep(s);
        scrollRef.current?.scrollTo({ top: 0 });
    };
    const restart = () => {
        setRun((r) => r + 1);
        go(0);
    };

    const screen = (
        <div ref={scrollRef} className="ja-pf-scroll ja-screen" key={`${run}-${step}`}>
            {step === 0 ? <IntroScreen onBegin={() => go(1)} /> : step === 1 ? <BreakScreen running={visible} onStart={() => go(2)} /> : <ResultScreen />}
        </div>
    );

    const tip =
        step === 0 ? (
            <span key="s0">Scroll the phone, tick the box and press Begin (Paper 1 itself is the exam screen further down).</span>
        ) : step === 1 ? (
            <span key="s1">Paper 1 is submitted. Add five minutes, or start Paper 2.</span>
        ) : (
            <span key="s2">Both papers done: one total out of {MAX}. Try the Paper 1 and Paper 2 tabs.</span>
        );

    const steps = (
        <div className="ja-pf-steps" role="tablist" aria-label="Screens">
            {STEPS.map((s, i) => (
                <button key={s.label} type="button" role="tab" aria-selected={step === i} onClick={() => go(i as Step)}>
                    <small>{i + 1}</small>
                    {wide ? s.label : s.short}
                </button>
            ))}
        </div>
    );

    return (
        <DemoFrame id="papers-demo" title="Paper 1, a break, Paper 2: one mock" tip={tip} onRestart={restart} wide="md" caption="TestoZa’s combined test screens at a phone’s real size: the start page, the break and the combined result. The candidate and the marks are made up.">
            <div ref={bodyRef} className={`ja-pf${wide ? ' is-wide' : ''}`}>
                {wide ? (
                    <>
                        <div className="ja-exam-phone">
                            <Phone label="A candidate’s phone">{screen}</Phone>
                        </div>
                        <aside className="ja-exam-side ja-pf-side" aria-label="What this screen does">
                            {steps}
                            <div className="ja-pf-explain" key={step}>
                                <b>{STEPS[step].title}</b>
                                <p>{STEPS[step].body}</p>
                            </div>
                            {step < 2 ? (
                                <button type="button" className="ja-action" onClick={() => go((step + 1) as Step)}>
                                    {step === 0 ? 'Skip to the break' : 'Skip to the result'}
                                </button>
                            ) : (
                                <button type="button" className="ja-action" onClick={restart}>
                                    Start again
                                </button>
                            )}
                        </aside>
                    </>
                ) : (
                    <>
                        {steps}
                        <div className="ja-exam-card ja-pf-card" role="group" aria-label="A candidate’s phone">
                            {screen}
                        </div>
                    </>
                )}
            </div>
        </DemoFrame>
    );
}
