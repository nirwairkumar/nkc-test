import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BarChart3, FileSpreadsheet, ListOrdered, Pause, Play, Target } from 'lucide-react';
import { CARD, LiveDot, WhatsAppIcon } from '@/components/dashboard/dashboardUi';
import {
    Float, MEDALS, SHOWCASE_CSS, countUp, delay, usePrefersReducedMotion, useSceneClock,
} from '@/components/dashboard/ClassroomShowcase';

/**
 * "What this page looks like after your class writes": a sample class's results filling in,
 * on a loop. Shown where an educator lands before any candidate has written their test, so
 * an empty page doesn't read as "nothing happens here".
 *
 * Same canvas approach as ClassroomShowcase: a fixed 600×364 scene scaled to the stage,
 * playing only on screen, paused on hover or with the button, still for reduced motion.
 */

const LOOP_MS = 9000;
const CANVAS_W = 600;
const CANVAS_H = 364;

const POINTS = [
    { icon: ListOrdered, text: 'Marks, rank and time for every candidate. No copies to check.' },
    { icon: Target, text: 'The questions most of the class got wrong, so you know what to teach again.' },
    { icon: BarChart3, text: 'Send the rank list to the class group, or download it in Excel.' },
];

const SUBMITS = [
    { name: 'Aarav', pct: 72, d: 0.4 },
    { name: 'Priya', pct: 88, d: 1.2 },
    { name: 'Rohan', pct: 64, d: 2.0 },
];

const ROWS = [
    { name: 'Sara Khan', marks: 96, time: '38 min' },
    { name: 'Diya Mehta', marks: 92, time: '41 min' },
    { name: 'Priya Sharma', marks: 88, time: '36 min' },
    { name: 'Arjun Singh', marks: 81, time: '44 min' },
];

export default function ResultsPreview({
    eyebrow = 'What this page shows',
    title = 'Every candidate’s marks, the moment they submit',
    className = '',
}: { eyebrow?: string; title?: string; className?: string }) {
    const reduced = usePrefersReducedMotion();
    const [cycle, setCycle] = useState(0);
    const [playing, setPlaying] = useState(true);
    const [hovered, setHovered] = useState(false);
    const [onScreen, setOnScreen] = useState(false);
    const [scale, setScale] = useState(1);
    const sectionRef = useRef<HTMLElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);

    const running = playing && onScreen && !hovered && !reduced;
    const sceneKey = String(cycle);
    const clock = useSceneClock(running, sceneKey);
    const t = reduced ? 7000 : clock;

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

    useLayoutEffect(() => {
        const el = stageRef.current;
        if (!el) return;
        const fit = () => setScale(Math.min(1, (el.clientWidth - 24) / CANVAS_W));
        fit();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        <section ref={sectionRef} aria-labelledby="results-preview-heading" className={`${CARD} overflow-hidden ${className}`}>
            <style>{SHOWCASE_CSS}</style>
            <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="px-5 pb-2 pt-5 lg:pb-5 lg:pl-6 lg:pt-6">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-sky-700">{eyebrow}</p>
                    <h2 id="results-preview-heading" className="mt-1.5 text-[20px] font-bold leading-snug tracking-[-0.02em] text-slate-900">
                        {title}
                    </h2>
                    <ul className="mt-4 space-y-3">
                        {POINTS.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex gap-2.5 text-[14px] leading-snug text-slate-600">
                                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                                {text}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="p-3 sm:p-4 lg:pl-2">
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
                            <ReportScene key={sceneKey} t={t} />
                        </div>
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-900/[0.06]">
                            Sample class
                        </span>
                        {!reduced && (
                            <>
                                <span
                                    key={sceneKey}
                                    className="cs-progress absolute bottom-0 left-0 h-[3px] w-full bg-primary/70"
                                    style={{ animationDuration: `${LOOP_MS}ms`, animationPlayState: running ? 'running' : 'paused' }}
                                    onAnimationEnd={() => setCycle(c => c + 1)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setPlaying(p => !p)}
                                    aria-label={playing ? 'Pause the animation' : 'Play the animation'}
                                    className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm ring-1 ring-slate-900/[0.08] backdrop-blur transition-colors hover:text-slate-900 cursor-pointer"
                                >
                                    {playing ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

/** The report filling in: submissions arrive, ranks settle, the hard questions surface. */
function ReportScene({ t }: { t: number }) {
    return (
        <>
            {/* Submissions arriving from phones */}
            {SUBMITS.map((s, i) => (
                <Float key={s.name} left={6} top={70 + i * 62} width={150} d={s.d} className="!p-2.5">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Submitted
                    </p>
                    <p className="mt-0.5 flex items-baseline justify-between text-[12px] font-semibold text-slate-900">
                        {s.name} <span className="tabular-nums text-slate-600">{s.pct}%</span>
                    </p>
                </Float>
            ))}

            {/* The report */}
            <div
                className="cs-a absolute rounded-2xl bg-white shadow-[0_24px_50px_-26px_rgba(15,23,42,0.55)] ring-1 ring-slate-900/[0.06]"
                style={{ left: 172, top: 4, width: 420, height: 354, ...delay(0) }}
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                    <span>
                        <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Results report</span>
                        <span className="block text-[12.5px] font-semibold text-slate-900">Physics Ch 3 — Laws of Motion</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-700"><LiveDot /> live</span>
                </div>

                <div className="grid grid-cols-3 gap-2 px-4 pt-3">
                    {[
                        ['Wrote it', String(countUp(t, 42, 300, 2600))],
                        ['Average', `${countUp(t, 64, 700, 2000)}%`],
                        ['Highest', `${countUp(t, 96, 700, 2000)}%`],
                    ].map(([label, value]) => (
                        <div key={label} className="rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-inset ring-slate-900/[0.04]">
                            <p className="text-[9px] font-medium text-slate-500">{label}</p>
                            <p className="text-[16px] font-bold leading-tight text-slate-900 tabular-nums">{value}</p>
                        </div>
                    ))}
                </div>

                <ol className="space-y-1 px-4 pt-2.5">
                    {ROWS.map((row, i) => (
                        <li key={row.name} className="cs-a cs-left flex items-center gap-2 rounded-md px-1 py-[3px]" style={delay(1 + i * 0.35)}>
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${MEDALS[i] || 'bg-slate-100 text-slate-600'}`}>{i + 1}</span>
                            <span className="min-w-0 flex-1 truncate text-[10.5px] text-slate-800">{row.name}</span>
                            <span className="w-12 text-right text-[10.5px] font-semibold text-slate-900 tabular-nums">{row.marks}/100</span>
                            <span className="w-12 text-right text-[9.5px] text-slate-500">{row.time}</span>
                        </li>
                    ))}
                </ol>

                <div className="cs-a mx-4 mt-2.5 rounded-lg bg-rose-50/70 px-3 py-2 ring-1 ring-inset ring-rose-600/10" style={delay(3)}>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-rose-700">Teach these again</p>
                    <div className="mt-1 flex gap-3">
                        {[['Q7', 31], ['Q12', 38]].map(([q, p], i) => (
                            <span key={q} className="cs-a flex flex-1 items-center gap-1.5 text-[10px] text-slate-700" style={delay(3.3 + i * 0.25)}>
                                <span className="font-bold text-slate-900">{q}</span>
                                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
                                    <span className="cs-a cs-grow block h-full rounded-full bg-rose-400" style={{ width: `${p}%`, ...delay(3.4 + i * 0.25) }} />
                                </span>
                                <span className="tabular-nums">{p}% right</span>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="absolute inset-x-4 bottom-3 flex gap-2">
                    <span className="cs-pulse inline-flex h-7 items-center gap-1.5 rounded-full bg-[#25D366] px-3 text-[10.5px] font-semibold text-white" style={delay(4.4)}>
                        <WhatsAppIcon className="h-3.5 w-3.5" /> Send rank list
                    </span>
                    <span className="cs-a inline-flex h-7 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-[10.5px] font-semibold text-slate-700" style={delay(4.7)}>
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Excel
                    </span>
                </div>
            </div>
        </>
    );
}
