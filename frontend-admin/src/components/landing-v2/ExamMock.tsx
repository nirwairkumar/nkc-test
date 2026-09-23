/**
 * Landing V2 — hero product visual.
 *
 * A stylised rendering of the exam interface, built in DOM/CSS rather than an
 * image, because:
 *   • it gives a stable LCP element with zero bytes to download (audit P3)
 *   • it cannot become a stale screenshot as the product changes
 *   • it stays crisp at every DPI
 *
 * Deliberately an *illustration*, not a pixel-accurate screenshot — it should
 * read as "this is what an exam looks like" without implying UI that does not
 * exist. Everything shown maps to a real feature.
 *
 * Fixed aspect-ratio wrapper = no layout shift.
 */

import { Clock, Flag, ShieldCheck } from 'lucide-react';

const PALETTE: Array<'done' | 'flagged' | 'current' | 'todo'> = [
    'done', 'done', 'done', 'flagged', 'done', 'current',
    'todo', 'todo', 'flagged', 'todo', 'todo', 'todo',
];

const SWATCH: Record<string, string> = {
    done: 'bg-emerald-500 text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset]',
    flagged: 'bg-amber-400 text-amber-950 shadow-[0_1px_0_rgba(255,255,255,0.35)_inset]',
    current: 'bg-sky-500 text-white ring-2 ring-sky-300/70 ring-offset-2 ring-offset-slate-900',
    todo: 'bg-white/[0.06] text-slate-500 ring-1 ring-inset ring-white/[0.06]',
};

export default function ExamMock() {
    return (
        <div
            className="relative mx-auto w-full max-w-[540px] overflow-hidden rounded-2xl ring-1 ring-white/[0.08] shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_40px_80px_-24px_rgba(0,0,0,0.85)]"
            style={{ aspectRatio: '4 / 3', background: 'linear-gradient(160deg,#0f172a 0%,#0b1324 60%,#070d1a 100%)' }}
            role="img"
            aria-label="Illustration of the TestoZa exam interface: a numerical question with four options, a countdown timer, a proctoring indicator, and a question palette showing answered, flagged and unanswered questions."
        >
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] bg-black/25 px-4 py-2.5">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                <div className="ml-3 flex flex-1 items-center gap-1.5 truncate rounded-md bg-white/[0.05] px-2.5 py-1 ring-1 ring-inset ring-white/[0.04]">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="truncate font-mono text-[10px] text-slate-400">
                        testoza.com/test/physics-unit-3
                    </span>
                </div>
            </div>

            {/* Exam status bar */}
            <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
                <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold tracking-tight text-white">
                        Physics — Unit Test 3
                    </p>
                    <p className="mt-0.5 text-[9px] text-slate-500">Section A · Question 6 of 12</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/12 px-1.5 py-1 text-[9px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
                        <ShieldCheck className="h-2.5 w-2.5" aria-hidden="true" />
                        Proctored
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/12 px-2 py-1 font-mono text-[11px] font-bold tabular-nums text-sky-300 ring-1 ring-inset ring-sky-400/20">
                        <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                        28:14
                    </span>
                </div>
            </div>

            <div className="flex h-[calc(100%-6rem)]">
                {/* Question pane */}
                <div className="flex-1 overflow-hidden p-4">
                    <div className="mb-2.5 flex items-center gap-1.5">
                        <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-indigo-300 ring-1 ring-inset ring-indigo-400/20">
                            Numerical
                        </span>
                        <span className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[8px] font-semibold text-slate-400">
                            +4 / −1
                        </span>
                        <span className="ml-auto inline-flex items-center gap-0.5 text-[8px] text-amber-400/70">
                            <Flag className="h-2 w-2" aria-hidden="true" />
                            Flagged
                        </span>
                    </div>

                    <p className="text-[11.5px] font-medium leading-[1.65] text-slate-200">
                        A body of mass 2 kg moves with velocity{' '}
                        <span className="rounded bg-sky-500/10 px-1 font-mono text-sky-300">v = 3t² − 2t</span>.
                        Find the net force at <span className="rounded bg-sky-500/10 px-1 font-mono text-sky-300">t = 2 s</span>.
                    </p>

                    <div className="mt-3 space-y-1.5">
                        {[
                            { k: 'A', t: '12 N', sel: false },
                            { k: 'B', t: '20 N', sel: true },
                            { k: 'C', t: '16 N', sel: false },
                            { k: 'D', t: '24 N', sel: false },
                        ].map((o) => (
                            <div
                                key={o.k}
                                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[10.5px] transition ${
                                    o.sel
                                        ? 'bg-sky-500/12 text-white ring-1 ring-inset ring-sky-400/40'
                                        : 'bg-white/[0.025] text-slate-400 ring-1 ring-inset ring-white/[0.05]'
                                }`}
                            >
                                <span
                                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[8.5px] font-bold ${
                                        o.sel
                                            ? 'bg-gradient-to-b from-sky-300 to-sky-500 text-slate-900'
                                            : 'bg-white/[0.07] text-slate-400'
                                    }`}
                                >
                                    {o.k}
                                </span>
                                <span className="font-mono">{o.t}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Question palette */}
                <div className="w-[110px] shrink-0 border-l border-white/[0.06] bg-black/20 p-3">
                    <p className="mb-2.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Palette
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                        {PALETTE.map((s, i) => (
                            <span
                                key={i}
                                className={`flex h-[23px] items-center justify-center rounded-md text-[9px] font-bold ${SWATCH[s]}`}
                            >
                                {i + 1}
                            </span>
                        ))}
                    </div>
                    <dl className="mt-3.5 space-y-1.5 text-[8px] text-slate-500">
                        {[
                            ['bg-emerald-500', 'Answered'],
                            ['bg-amber-400', 'Flagged'],
                            ['bg-white/10', 'Not seen'],
                        ].map(([c, l]) => (
                            <div key={l} className="flex items-center gap-1.5">
                                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-sm ${c}`} />
                                <span>{l}</span>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </div>
    );
}
