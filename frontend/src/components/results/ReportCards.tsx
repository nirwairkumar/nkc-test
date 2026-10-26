import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import LatexRenderer from '@/components/ui/LatexRenderer';
import { STRONG_PCT, WEAK_PCT } from '@/lib/teacherDashboardApi';
import type { Report, ReportQuestion, ReportRow } from '@/lib/resultsReport';
import { durationText, marksText, needsHelp } from '@/lib/resultsReport';
import { Panel, TEXT_BTN } from '@/components/dashboard/dashboardUi';
import { pctText, plural } from '@/components/dashboard/format';
import { MEDALS } from '@/components/dashboard/ClassroomShowcase';

/* The cards of the results report (/analytics/full). One look with the dashboard: Panel headers, 13–15px text. */

const pctOf = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

/* ── How the class did ───────────────────────────────────────────────────── */

export function ClassSummaryCard({ report }: { report: Report }) {
    const { summary, rows, spread, passing, maxMarks, questions } = report;
    if (!summary) return null;
    const { avgPct, highest, lowest, count } = summary;
    const weak = rows.filter(needsHelp).length;
    const tallest = Math.max(1, ...spread.map(b => b.count));
    const hardest = [...questions].sort((a, b) => a.pctCorrect - b.pctCorrect)[0];

    const takeaways: React.ReactNode[] = [];
    if (highest && count > 1) takeaways.push(<><strong className="font-semibold text-slate-900">{highest.displayName}</strong> came first with {pctText(highest.pct)}.</>);
    if (weak > 0) takeaways.push(<>{plural(weak, 'candidate')} scored below {WEAK_PCT}%. They are marked in the rank list.</>);
    else if (count > 1) takeaways.push(<>Everyone scored {WEAK_PCT}% or more.</>);
    if (hardest && hardest.pctCorrect < 50 && count > 1) {
        takeaways.push(<>The hardest was <strong className="font-semibold text-slate-900">Q{hardest.number}</strong>: {pctText(hardest.pctCorrect)} got it right.</>);
    }

    const avgMarks = avgPct !== null && maxMarks > 0 ? (avgPct / 100) * maxMarks : null;

    return (
        <Panel id="summary-heading" title="How the class did" note={plural(count, 'candidate') + ' wrote it'}>
            <div className="p-5">
                <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <Stat label="Average" value={pctText(avgPct)} sub={avgMarks !== null ? `${marksText(Math.round(avgMarks * 10) / 10)} of ${marksText(maxMarks)} marks` : undefined} />
                    <Stat label="Highest" value={pctText(highest?.pct)} sub={highest?.displayName} />
                    <Stat label="Lowest" value={pctText(lowest?.pct)} sub={count > 1 ? lowest?.displayName : undefined} />
                    {passing ? (
                        <Stat label="Passed" value={`${passing.passed}/${count}`} sub={`Pass mark ${marksText(passing.marks)}`} />
                    ) : (
                        <Stat label="Needs help" value={String(weak)} sub={`Below ${WEAK_PCT}%`} tone={weak > 0 ? 'rose' : undefined} />
                    )}
                </dl>

                <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
                    <div>
                        <h3 className="text-[13px] font-semibold text-slate-900">How the marks spread</h3>
                        <div className="mt-3 flex h-[120px] items-end gap-2" role="img"
                            aria-label={spread.map(b => `${b.label}: ${b.count}`).join(', ')}>
                            {spread.map(b => (
                                <div key={b.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                                    <span className="text-[12px] font-semibold text-slate-700 tabular-nums">{b.count}</span>
                                    <span
                                        className={`w-full rounded-t-md ${b.from < WEAK_PCT ? 'bg-rose-400' : b.from < 60 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                        style={{ height: `${Math.max(b.count ? 6 : 2, (b.count / tallest) * 84)}px`, opacity: b.count ? 1 : 0.35 }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="mt-1.5 flex gap-2 border-t border-slate-100 pt-1.5">
                            {spread.map(b => <span key={b.label} className="min-w-0 flex-1 truncate text-center text-[11px] text-slate-500">{b.label}</span>)}
                        </div>
                    </div>
                    {takeaways.length > 0 && (
                        <ul className="space-y-2.5 rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-900/[0.04]">
                            {takeaways.map((t, i) => (
                                <li key={i} className="flex gap-2.5 text-[14px] leading-snug text-slate-700">
                                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                                    <span>{t}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </Panel>
    );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'rose' }) {
    return (
        <div className="min-w-0 rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-inset ring-slate-900/[0.04]">
            <dt className="text-[12px] font-medium text-slate-500">{label}</dt>
            <dd className={`mt-0.5 text-[24px] font-bold leading-tight tracking-[-0.02em] tabular-nums ${tone === 'rose' ? 'text-rose-700' : 'text-slate-900'}`}>{value}</dd>
            {sub && <dd className="truncate text-[12px] text-slate-500" title={sub}>{sub}</dd>}
        </div>
    );
}

/* ── Rank list ───────────────────────────────────────────────────────────── */

type RankFilter = 'all' | 'help' | 'passed' | 'failed';
const RANK_PAGE = 25;
const RANK_COLS = 'sm:grid-cols-[44px_minmax(0,1fr)_92px_60px_124px_96px_20px]';

export function RankListCard({ report, onOpen }: { report: Report; onOpen: (row: ReportRow) => void }) {
    const { rows, passing, maxMarks } = report;
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<RankFilter>('all');
    const [showAll, setShowAll] = useState(false);

    const helpCount = rows.filter(needsHelp).length;
    const filters: { key: RankFilter; label: string; count: number }[] = [
        { key: 'all', label: 'Everyone', count: rows.length },
        ...(passing ? [
            { key: 'passed' as const, label: 'Passed', count: passing.passed },
            { key: 'failed' as const, label: 'Not passed', count: rows.length - passing.passed },
        ] : []),
        { key: 'help', label: `Below ${WEAK_PCT}%`, count: helpCount },
    ];

    const q = query.trim().toLowerCase();
    const shown = rows.filter(r => {
        if (filter === 'help' && !needsHelp(r)) return false;
        if (filter === 'passed' && !(passing && r.score >= passing.marks)) return false;
        if (filter === 'failed' && !(passing && r.score < passing.marks)) return false;
        return !q || `${r.displayName} ${r.details}`.toLowerCase().includes(q);
    });
    const visible = showAll ? shown : shown.slice(0, RANK_PAGE);

    return (
        <Panel
            id="ranks-heading"
            title="Rank list"
            count={rows.length}
            note="Tap a candidate to see their answer sheet"
        >
            <div className="flex flex-col gap-2.5 border-b border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Show">
                    {filters.map(f => (
                        <button
                            key={f.key}
                            type="button"
                            role="tab"
                            aria-selected={filter === f.key}
                            onClick={() => { setFilter(f.key); setShowAll(false); }}
                            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors cursor-pointer ${filter === f.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'}`}
                        >
                            {f.label} <span className={`tabular-nums ${filter === f.key ? 'text-white/70' : 'text-slate-500'}`}>{f.count}</span>
                        </button>
                    ))}
                </div>
                {rows.length > 8 && (
                    <label className="relative block sm:w-56">
                        <span className="sr-only">Search candidates</span>
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search name or roll no"
                            className="h-9 w-full rounded-full bg-slate-100 pl-9 pr-8 text-[13px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 cursor-pointer">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </label>
                )}
            </div>

            {/* Column names (wide screens) */}
            <div className={`hidden gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:grid ${RANK_COLS}`}>
                <span>Rank</span>
                <span>Candidate</span>
                <span className="text-right">Marks</span>
                <span className="text-right">%</span>
                <span className="text-center">Right · Wrong · Left</span>
                <span className="text-right">Time</span>
                <span />
            </div>

            {visible.length === 0 ? (
                <p className="px-5 py-8 text-center text-[14px] text-slate-500">Nobody here.</p>
            ) : (
                <ol className="divide-y divide-slate-100">
                    {visible.map(r => {
                        const help = needsHelp(r);
                        return (
                            <li key={r.id}>
                                <button
                                    type="button"
                                    onClick={() => onOpen(r)}
                                    className={`grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50 cursor-pointer ${RANK_COLS}`}
                                >
                                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold tabular-nums ${MEDALS[r.rank - 1] || 'bg-slate-100 text-slate-600'}`}>
                                        {r.rank}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-[14px] font-semibold text-slate-900" title={r.displayName}>{r.displayName}</span>
                                        {r.details && <span className="block truncate text-[12px] text-slate-500" title={r.details}>{r.details}</span>}
                                        {/* Phones: the counts and time under the name */}
                                        <span className="mt-0.5 block text-[12px] text-slate-500 sm:hidden">
                                            <span className="text-emerald-700">{r.correct} right</span> · <span className="text-rose-700">{r.wrong} wrong</span> · {r.unattempted} left · {durationText(r.seconds)}
                                        </span>
                                    </span>
                                    <span className="text-right">
                                        <span className="block text-[14px] font-semibold text-slate-900 tabular-nums">
                                            {marksText(r.score)}<span className="font-normal text-slate-400">/{marksText(maxMarks)}</span>
                                        </span>
                                        <span className={`block text-[12px] font-semibold tabular-nums sm:hidden ${help ? 'text-rose-700' : 'text-slate-600'}`}>{pctText(r.pct)}</span>
                                    </span>
                                    <span className={`hidden text-right text-[14px] font-semibold tabular-nums sm:block ${help ? 'text-rose-700' : 'text-slate-700'}`}>{pctText(r.pct)}</span>
                                    <span className="hidden justify-center gap-2 text-[13px] tabular-nums sm:flex">
                                        <span className="text-emerald-700">{r.correct}</span>
                                        <span className="text-slate-300">·</span>
                                        <span className="text-rose-700">{r.wrong}</span>
                                        <span className="text-slate-300">·</span>
                                        <span className="text-slate-500">{r.unattempted}</span>
                                    </span>
                                    <span className="hidden text-right text-[13px] text-slate-600 tabular-nums sm:block">{durationText(r.seconds)}</span>
                                    <ChevronRight className="hidden h-4 w-4 text-slate-300 sm:block" />
                                </button>
                            </li>
                        );
                    })}
                </ol>
            )}

            {shown.length > RANK_PAGE && (
                <div className="border-t border-slate-100 px-3 py-2">
                    <button type="button" onClick={() => setShowAll(v => !v)} className={TEXT_BTN}>
                        {showAll ? 'Show fewer' : `Show all ${shown.length}`}
                    </button>
                </div>
            )}
        </Panel>
    );
}

/* ── Teach these again ───────────────────────────────────────────────────── */

export function TeachAgainCard({ report, onShow }: { report: Report; onShow: (n: number) => void }) {
    const hard = [...report.questions].filter(q => q.pctCorrect < 50).sort((a, b) => a.pctCorrect - b.pctCorrect).slice(0, 5);
    return (
        <Panel id="teach-heading" title="Teach these again" note="Fewer than half got these right">
            {hard.length === 0 ? (
                <p className="px-5 py-4 text-[14px] leading-snug text-slate-600">
                    No question stumped the class. Every one was answered right by at least half.
                </p>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {hard.map(q => (
                        <li key={q.number}>
                            <button type="button" onClick={() => onShow(q.number)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50 cursor-pointer">
                                <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[12px] font-bold text-rose-700 ring-1 ring-inset ring-rose-600/10">Q{q.number}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2">
                                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                            <span className="block h-full rounded-full bg-rose-400" style={{ width: `${Math.max(2, q.pctCorrect)}%` }} />
                                        </span>
                                        <span className="w-[62px] shrink-0 text-right text-[13px] font-semibold text-slate-900 tabular-nums">{pctText(q.pctCorrect)} right</span>
                                    </span>
                                    {q.trap && (
                                        <span className="mt-1 block truncate text-[12px] text-slate-500">
                                            Most picked {q.trap.key} ({pctOf(q.trap.picked, report.rows.length)}%)
                                        </span>
                                    )}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

/* ── By section ──────────────────────────────────────────────────────────── */

export function SectionsCard({ report }: { report: Report }) {
    if (report.sections.length < 2) return null;
    return (
        <Panel id="sections-heading" title="By section" note="Share of answers that were right">
            <ul className="space-y-3 px-5 py-4">
                {report.sections.map(s => (
                    <li key={s.name}>
                        <div className="flex items-baseline justify-between gap-3 text-[13px]">
                            <span className="min-w-0 truncate font-semibold text-slate-900" title={s.name}>{s.name}</span>
                            <span className="shrink-0 font-semibold text-slate-900 tabular-nums">{pctText(s.pctCorrect)}</span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className={`h-full rounded-full ${s.pctCorrect < WEAK_PCT ? 'bg-rose-400' : s.pctCorrect < STRONG_PCT ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.max(2, s.pctCorrect)}%` }}
                            />
                        </div>
                        <p className="mt-1 text-[12px] text-slate-500">{plural(s.questions, 'question')}</p>
                    </li>
                ))}
            </ul>
        </Panel>
    );
}

/* ── Question by question ────────────────────────────────────────────────── */

export function QuestionsCard({ report, open, onToggle }: { report: Report; open: number | null; onToggle: (n: number) => void }) {
    const [order, setOrder] = useState<'paper' | 'hardest'>('paper');
    const [showAll, setShowAll] = useState(false);
    const total = report.rows.length;
    const list = useMemo(
        () => (order === 'paper' ? report.questions : [...report.questions].sort((a, b) => a.pctCorrect - b.pctCorrect)),
        [report.questions, order],
    );
    // Keep a question opened from "Teach these again" on screen.
    const visible = showAll || (open !== null && list.findIndex(q => q.number === open) >= 20) ? list : list.slice(0, 20);

    return (
        <Panel
            id="questions-heading"
            title="Question by question"
            count={report.questions.length}
            action={
                <div className="flex shrink-0 rounded-full bg-slate-100 p-0.5 text-[12px] font-semibold" role="tablist" aria-label="Order">
                    {(['paper', 'hardest'] as const).map(o => (
                        <button
                            key={o}
                            type="button"
                            role="tab"
                            aria-selected={order === o}
                            onClick={() => setOrder(o)}
                            className={`h-7 rounded-full px-3 transition-colors cursor-pointer ${order === o ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            {o === 'paper' ? 'Paper order' : 'Hardest first'}
                        </button>
                    ))}
                </div>
            }
        >
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-100 px-5 py-2.5 text-[12px] text-slate-600">
                <Legend color="bg-emerald-500" label="Right" />
                <Legend color="bg-sky-400" label="Partly right" />
                <Legend color="bg-rose-400" label="Wrong" />
                <Legend color="bg-slate-300" label="Left blank" />
            </div>
            <ul className="divide-y divide-slate-100">
                {visible.map(q => <QuestionRow key={q.number} q={q} total={total} open={open === q.number} onToggle={() => onToggle(q.number)} />)}
            </ul>
            {list.length > 20 && (
                <div className="border-t border-slate-100 px-3 py-2">
                    <button type="button" onClick={() => setShowAll(v => !v)} className={TEXT_BTN}>
                        {showAll ? 'Show fewer' : `Show all ${list.length}`}
                    </button>
                </div>
            )}
        </Panel>
    );
}

function Legend({ color, label }: { color: string; label: string }) {
    return <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>;
}

function QuestionRow({ q, total, open, onToggle }: { q: ReportQuestion; total: number; open: boolean; onToggle: () => void }) {
    const seg = (n: number) => `${total > 0 ? (n / total) * 100 : 0}%`;
    return (
        <li id={`report-q-${q.number}`} className="scroll-mt-24">
            <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50 cursor-pointer">
                <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[12px] font-bold text-slate-700">Q{q.number}</span>
                <span className="min-w-0 flex-1">
                    {q.section && <span className="block truncate text-[11px] font-medium text-slate-500">{q.section}</span>}
                    <span className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100" role="img"
                        aria-label={`${q.correct} right, ${q.partial} partly right, ${q.wrong} wrong, ${q.skipped} left blank`}>
                        <span className="h-full bg-emerald-500" style={{ width: seg(q.correct) }} />
                        <span className="h-full bg-sky-400" style={{ width: seg(q.partial) }} />
                        <span className="h-full bg-rose-400" style={{ width: seg(q.wrong) }} />
                        <span className="h-full bg-slate-300" style={{ width: seg(q.skipped) }} />
                    </span>
                </span>
                <span className={`w-[72px] shrink-0 text-right text-[13px] font-semibold tabular-nums ${q.pctCorrect < 50 ? 'text-rose-700' : 'text-slate-900'}`}>
                    {pctText(q.pctCorrect)} right
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="space-y-4 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                    <div className="text-[14px] leading-relaxed text-slate-800 [&_img]:max-h-56 [&_img]:rounded-lg">
                        <LatexRenderer>{q.text || '(No question text)'}</LatexRenderer>
                        {q.image && <img src={q.image} alt="" loading="lazy" className="mt-2 max-h-56 rounded-lg ring-1 ring-slate-900/[0.06]" />}
                    </div>

                    {q.options.length > 0 ? (
                        <ul className="space-y-2">
                            {q.options.map(o => {
                                const p = pctOf(o.picked, total);
                                return (
                                    <li key={o.key} className={`rounded-xl bg-white px-3 py-2.5 ring-1 ring-inset ${o.isCorrect ? 'ring-emerald-500/40' : 'ring-slate-900/[0.06]'}`}>
                                        <div className="flex items-start gap-2.5">
                                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${o.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                {o.isCorrect ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : o.key}
                                            </span>
                                            <div className="min-w-0 flex-1 text-[13.5px] text-slate-800 [&_img]:max-h-32">
                                                <LatexRenderer>{o.text || o.key}</LatexRenderer>
                                            </div>
                                            <span className="shrink-0 text-[13px] font-semibold text-slate-900 tabular-nums">{p}%</span>
                                        </div>
                                        <div className="ml-[34px] mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                            <div className={`h-full rounded-full ${o.isCorrect ? 'bg-emerald-500' : 'bg-slate-400'}`} style={{ width: `${p}%` }} />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-[13.5px] text-slate-700">Answer: <strong className="font-semibold text-slate-900">{q.answerText}</strong></p>
                    )}

                    <p className="text-[12.5px] text-slate-600">
                        <span className="text-emerald-700">{q.correct} right</span>
                        {q.partial > 0 && <> · <span className="text-sky-700">{q.partial} partly right</span></>}
                        {' · '}<span className="text-rose-700">{q.wrong} wrong</span>
                        {' · '}{q.skipped} left blank
                    </p>
                </div>
            )}
        </li>
    );
}
