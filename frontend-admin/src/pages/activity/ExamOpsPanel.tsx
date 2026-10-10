/**
 * Admin → Live Activity. Two halves, in the order a founder needs them:
 *   1. Right now — what is open, and whether anyone is actually sitting it.
 *   2. Conducted — how many real exams ran in a period, for whom, by which
 *      educators, and which of those educators are coming back.
 *
 * Metric definitions live next to the data in app/routers/analytics/exam_ops.py.
 * Same visual language as Admin → Analytics (sky accent, white cards, IST).
 */
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, FileWarning, Info, KeyRound, RefreshCw, Rocket,
    ServerCrash,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import TestResultsPanel from '@/components/TestResultsPanel';
import { cn } from '@/lib/utils';
import { bucketLabel, change, istDate, istDateTime, num, pct, PERIOD_LABEL, PREVIOUS_LABEL, relative } from '../analytics/format';
import { Columns } from '../analytics/charts';
import { ErrorState, usePersisted } from '../analytics/shared';
import {
    BarList, CARD, Card, Chip, Empty, IosSheet, PILL_BTN, Segmented, SectionTitle, Skeleton, StatTile, TileSkeletons,
} from '../analytics/ui';
import { examOpsApi, NotDeployedError, type Audience, type ExamOps, type LiveExam, type Period, type Sitting } from './api';
import LiveNow from './LiveNow';
import { proctoringRules } from './proctoring';
import SittingSheet from './SittingSheet';

const PERIODS: readonly Period[] = ['today', 'yesterday', '7d', '30d', '90d', '12m'];
const AUDIENCES: readonly Audience[] = ['customers', 'everyone', 'team'];
type Metric = 'exams' | 'candidates' | 'submissions';

const METRIC_LABEL: Record<Metric, string> = {
    exams: 'Exams conducted',
    candidates: 'Candidates',
    submissions: 'Papers submitted',
};

export default function ExamOpsPanel() {
    const [period, setPeriod] = usePersisted<Period>('tz_admin_activity_period', '7d', PERIODS);
    const [audience, setAudience] = usePersisted<Audience>('tz_admin_activity_audience', 'customers', AUDIENCES);
    const [metric, setMetric] = useState<Metric>('exams');
    const [focus, setFocus] = useState<string | null>(null);
    const [sitting, setSitting] = useState<Sitting | null>(null);
    const [rulesFor, setRulesFor] = useState<LiveExam | null>(null);
    const [resultsFor, setResultsFor] = useState<{ id: string; title: string } | null>(null);
    const qc = useQueryClient();

    const q = useQuery({
        queryKey: ['exam-ops', 'report', period, audience],
        queryFn: () => examOpsApi.report(period, audience),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
        refetchInterval: period === 'today' ? 60_000 : 300_000,
        retry: (n, e) => !(e instanceof NotDeployedError) && n < 1,
    });
    const refreshing = qc.isFetching({ queryKey: ['exam-ops'] }) > 0;
    const d = q.data;

    if (q.error instanceof NotDeployedError) return <NotDeployed />;

    return (
        <div className="space-y-5 pb-10">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Operations</p>
                    <h1 className="mt-1.5 !text-[28px] font-bold leading-[1.1] tracking-[-0.025em] text-slate-900 sm:!text-[34px]">Live activity</h1>
                    <p className="mt-2 hidden text-[15px] text-slate-600 sm:block">
                        What is running right now, and how many real exams your customers conducted. Days and times in IST.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={cn(PILL_BTN, 'cursor-default')} title="Exam links open right now">
                        <span className="relative flex h-2 w-2">
                            {!!d?.now.live_links && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 motion-safe:animate-ping" />}
                            <span className={cn('relative inline-flex h-2 w-2 rounded-full', d?.now.live_links ? 'bg-emerald-500' : 'bg-slate-300')} />
                        </span>
                        <span className="tabular-nums">{d ? num(d.now.live_links) : '–'}</span>
                        <span className="font-medium text-slate-500">live</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => qc.invalidateQueries({ queryKey: ['exam-ops'] })}
                        className={cn(PILL_BTN, 'w-9 justify-center px-0')}
                        title="Refresh"
                        aria-label="Refresh"
                        disabled={refreshing}
                    >
                        <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                    </button>
                </div>
            </header>

            {q.error && !d && <ErrorState error={q.error} onRetry={() => q.refetch()} />}

            {/* ── 1. Right now ─────────────────────────────────────────────── */}
            <section>
                <SectionTitle
                    title="Right now"
                    subtitle={d
                        ? [
                            `${num(d.now.live_links)} exam link${d.now.live_links === 1 ? '' : 's'} open`,
                            `${num(d.now.submissions_15m)} paper${d.now.submissions_15m === 1 ? '' : 's'} in the last 15 min`,
                            d.now.participants_active ? `${num(d.now.participants_active)} in a join-code exam` : null,
                            d.now.example_links ? `${num(d.now.example_links)} example test${d.now.example_links === 1 ? '' : 's'} not counted` : null,
                        ].filter(Boolean).join(' · ')
                        : 'Checking…'}
                />
                {!d ? <Skeleton className="h-28" /> : (
                    <LiveNow
                        live={d.live}
                        codeSittings={d.code_sittings}
                        onInspect={setRulesFor}
                        onResults={(exam) => setResultsFor({ id: exam.id, title: exam.title })}
                    />
                )}
            </section>

            {/* ── 2. Conducted exams ───────────────────────────────────────── */}
            <section className="space-y-4">
                <SectionTitle title="Exams conducted" subtitle={`Counted as one exam per test per day · ${PERIOD_LABEL[period]}`} />

                <div className="flex flex-wrap items-center gap-2">
                    <Segmented<Period>
                        ariaLabel="Period"
                        value={period}
                        onChange={setPeriod}
                        options={[
                            { value: 'today', label: 'Today' },
                            { value: 'yesterday', label: 'Yesterday' },
                            { value: '7d', label: '7D', title: 'Last 7 days' },
                            { value: '30d', label: '30D', title: 'Last 30 days' },
                            { value: '90d', label: '90D', title: 'Last 90 days' },
                            { value: '12m', label: '12M', title: 'Last 12 months' },
                        ]}
                    />
                    <Segmented<Audience>
                        ariaLabel="Whose exams"
                        value={audience}
                        onChange={setAudience}
                        options={[
                            { value: 'customers', label: 'Customers', title: 'Everyone except accounts listed in admins' },
                            { value: 'everyone', label: 'Everyone' },
                            { value: 'team', label: 'Team', title: 'Only our own accounts' },
                        ]}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    {d ? <Tiles d={d} period={period} metric={metric} setMetric={setMetric} /> : <TileSkeletons count={6} />}
                </div>

                <Card
                    title={METRIC_LABEL[metric]}
                    subtitle={`Per ${d?.range.bucket ?? 'day'}, ${PERIOD_LABEL[period]}`}
                    action={d && d.totals.exams > 0 ? <span className="text-[12px] text-slate-400">Tap a tile above to switch the measure</span> : undefined}
                >
                    {!d ? <Skeleton className="h-44" /> : d.totals.exams === 0 ? (
                        <Empty icon={CalendarClock} title="Nothing to chart yet">
                            No exam was conducted {PERIOD_LABEL[period]}. Widen the period, or switch the audience to Everyone
                            to include our own runs.
                        </Empty>
                    ) : (
                        <Columns
                            data={d.series.map((p) => ({
                                label: bucketLabel(p.t, d.range.bucket),
                                long: bucketLabel(p.t, d.range.bucket, true),
                                value: p[metric],
                            }))}
                            format={num}
                            height={170}
                        />
                    )}
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card
                        title="When exams run"
                        subtitle="Papers submitted by hour of day, IST"
                        info="Peak hours are when an outage hurts most — and when support needs to be awake. Avoid deploying inside the peak."
                    >
                        {!d ? <Skeleton className="h-36" /> : <Clock hours={d.hours} weekdays={d.weekdays} />}
                    </Card>

                    <Card
                        title="Who conducted them"
                        subtitle="Educators who ran at least one exam in this period"
                        action={focus ? (
                            <button type="button" onClick={() => setFocus(null)} className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-200">
                                Clear filter
                            </button>
                        ) : undefined}
                    >
                        {!d ? <Skeleton className="h-36" /> : (
                            <BarList
                                valueLabel="Exams"
                                extraLabels={['Candidates']}
                                initial={6}
                                empty="Nobody conducted an exam in this period."
                                rows={d.educators.map((e) => ({
                                    id: e.id,
                                    value: e.exams,
                                    display: num(e.exams),
                                    extra: [num(e.candidates)],
                                    title: e.email || e.name,
                                    onClick: () => setFocus(focus === e.id ? null : e.id),
                                    label: (
                                        <span className="flex min-w-0 items-center gap-1.5">
                                            <span className={cn('truncate', focus === e.id && 'font-semibold text-sky-800')}>{e.name}</span>
                                            {e.is_self ? <Chip tone="sky">You</Chip> : e.is_team ? <Chip tone="sky">Team</Chip> : null}
                                            {e.is_first_time && <Chip tone="emerald" title="First exam they have ever conducted">New</Chip>}
                                            {!e.is_first_time && e.exams > 1 && <Chip tone="violet" title={`${e.exams} exams on ${e.days} day(s)`}>Repeat</Chip>}
                                        </span>
                                    ),
                                    hint: e.designation || undefined,
                                }))}
                            />
                        )}
                    </Card>
                </div>

                <SittingsTable d={d} focus={focus} onOpen={setSitting} onClearFocus={() => setFocus(null)} />

                {d && <Footnotes d={d} period={period} />}
            </section>

            <SittingSheet sitting={sitting} onClose={() => setSitting(null)} onOpenResults={setResultsFor} />
            <RulesSheet exam={rulesFor} onClose={() => setRulesFor(null)} />
            {resultsFor && <TestResultsPanel test={resultsFor} onClose={() => setResultsFor(null)} />}
        </div>
    );
}

// ── Tiles ─────────────────────────────────────────────────────────────────────
function Tiles({ d, period, metric, setMetric }: { d: ExamOps; period: Period; metric: Metric; setMetric: (m: Metric) => void }) {
    const t = d.totals, p = d.previous;
    const vs = `vs ${PREVIOUS_LABEL[period]}`;
    const pick = (m: Metric) => ({ selected: metric === m, onClick: () => setMetric(m), deltaTitle: vs });
    return (
        <>
            <StatTile
                label="Exams conducted"
                value={num(t.exams)}
                delta={change(t.exams, p.exams)}
                sub={`${num(t.exams_with_a_class)} with a class of 3+`}
                info="One test that received at least one paper on one IST day counts as one exam. A test run on three days counts three times. The second line is how many had three or more candidates — the rest are mostly people trying the product."
                {...pick('exams')}
            />
            <StatTile
                label="Candidates"
                value={num(t.candidates)}
                delta={change(t.candidates, p.candidates)}
                info="Distinct people who submitted. Exam takers without an account get a hidden candidate login, counted here but never as a sign-up."
                {...pick('candidates')}
            />
            <StatTile
                label="Papers in"
                value={num(t.submissions)}
                delta={change(t.submissions, p.submissions)}
                info="Every submitted paper, including repeat attempts by the same candidate."
                {...pick('submissions')}
            />
            <StatTile
                label="Educators"
                value={num(t.educators)}
                delta={change(t.educators, p.educators)}
                deltaTitle={vs}
                sub={[
                    t.new_educators ? `${num(t.new_educators)} first-ever` : null,
                    t.repeat_educators ? `${num(t.repeat_educators)} came back` : null,
                ].filter(Boolean).join(' · ') || undefined}
                info="Accounts that conducted at least one exam. This is the number that turns into revenue — not sign-ups."
            />
            <StatTile
                label="Avg score"
                value={t.avg_score_pct === null ? '—' : pct(t.avg_score_pct)}
                sub={t.scored_submissions ? `${num(t.scored_submissions)} papers with answers` : 'nothing scored yet'}
                info="Mean of score ÷ total marks, over papers that had at least one answer. Blank papers are left out — averaging them in makes every exam look like a failure. Tests with no marks set fall back to one mark per question."
            />
            <StatTile
                label="Blank papers"
                value={t.blank_rate === null ? '—' : pct(t.blank_rate)}
                invert
                delta={t.blank_rate === null || p.blank_rate === null ? undefined : t.blank_rate - p.blank_rate}
                deltaUnit=" pts"
                deltaTitle={vs}
                sub={`${num(t.blank_submissions)} of ${num(t.submissions)} papers`}
                info="Submitted without answering a single question. A high share means people are opening exams to look around, or candidates cannot get started — tap a row below to see which exam they came from."
            />
        </>
    );
}

// ── When exams run ────────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function Clock({ hours, weekdays }: { hours: number[]; weekdays: number[] }) {
    const [hover, setHover] = useState<number | null>(null);
    const max = Math.max(1, ...hours);
    const total = hours.reduce((a, b) => a + b, 0);
    const peak = hours.indexOf(Math.max(...hours));
    const dayMax = Math.max(1, ...weekdays);
    const hourName = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`;

    if (!total) return <Empty icon={CalendarClock} title="No papers yet">Nothing was submitted in this period.</Empty>;

    return (
        <div>
            <div className="flex items-end gap-[3px]" style={{ height: 96 }} onMouseLeave={() => setHover(null)}>
                {hours.map((v, h) => (
                    <button
                        key={h}
                        type="button"
                        onMouseEnter={() => setHover(h)}
                        onFocus={() => setHover(h)}
                        onBlur={() => setHover(null)}
                        aria-label={`${hourName(h)}: ${v} papers`}
                        className="group flex h-full min-w-0 flex-1 flex-col justify-end focus-visible:outline-none"
                    >
                        <span
                            className={cn('w-full rounded-t-[3px] transition-opacity', hover !== null && hover !== h && 'opacity-55')}
                            style={{ height: v ? Math.max(3, (v / max) * 92) : 1, background: h === peak ? '#2a78d6' : v ? '#86b6ef' : '#e8ecf1' }}
                        />
                    </button>
                ))}
            </div>
            <div className="mt-1 flex gap-[3px] border-t border-slate-200 pt-1">
                {hours.map((_, h) => (
                    <span key={h} className="min-w-0 flex-1 text-center text-[9px] text-slate-400">
                        {h % 6 === 0 ? hourName(h) : ''}
                    </span>
                ))}
            </div>
            <p className="mt-2 text-[12.5px] text-slate-500">
                {hover !== null
                    ? <><b className="text-slate-900">{num(hours[hover])}</b> paper{hours[hover] === 1 ? '' : 's'} at {hourName(hover)}–{hourName((hover + 1) % 24)}</>
                    : <>Busiest hour: <b className="text-slate-900">{hourName(peak)}–{hourName((peak + 1) % 24)}</b> ({pct((hours[peak] / total) * 100)} of all papers)</>}
            </p>

            <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">By weekday</p>
                <ul className="space-y-1">
                    {weekdays.map((v, i) => (
                        <li key={i} className="flex items-center gap-2">
                            <span className="w-8 shrink-0 text-[12px] text-slate-500">{DAYS[i]}</span>
                            <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <span className="absolute inset-y-0 left-0 rounded-full bg-sky-500/70" style={{ width: `${(v / dayMax) * 100}%` }} />
                            </span>
                            <span className="w-8 shrink-0 text-right text-[12px] tabular-nums text-slate-600">{v || ''}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

// ── The sittings table ────────────────────────────────────────────────────────
function SittingsTable({
    d, focus, onOpen, onClearFocus,
}: {
    d: ExamOps | undefined;
    focus: string | null;
    onOpen: (s: Sitting) => void;
    onClearFocus: () => void;
}) {
    const [showAll, setShowAll] = useState(false);
    const rows = useMemo(
        () => (d?.sittings ?? []).filter((s) => !focus || s.educator?.id === focus),
        [d, focus],
    );
    const focused = focus ? d?.educators.find((e) => e.id === focus) : null;

    return (
        <section className={cn(CARD, 'min-w-0')}>
            <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
                <div>
                    <h3 className="text-[15px] font-semibold text-slate-900">Every exam, one row each</h3>
                    <p className="text-[13px] text-slate-500">Newest first · tap a row for the candidate list</p>
                </div>
                {focused && (
                    <button type="button" onClick={onClearFocus} className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[12px] font-semibold text-sky-800 ring-1 ring-inset ring-sky-600/20">
                        {focused.name} ✕
                    </button>
                )}
            </header>
            <div className="px-2 pb-3 pt-2 sm:px-3">
                {!d ? <Skeleton className="m-2 h-56" /> : rows.length === 0 ? (
                    <Empty icon={CalendarClock} title="No exam conducted">
                        {focus ? 'This educator ran nothing in this period.' : 'Nobody conducted an exam in this period. Widen the period, or switch the audience to Everyone.'}
                    </Empty>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-[13px]">
                            <thead>
                                <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                                    <th className="px-3 py-2 text-left">Exam</th>
                                    <th className="px-2 py-2 text-left">Educator</th>
                                    <th className="px-2 py-2 text-left">When</th>
                                    <th className="px-2 py-2 text-right">Candidates</th>
                                    <th className="px-2 py-2 text-right">Papers</th>
                                    <th className="px-2 py-2 text-right">Blank</th>
                                    <th className="px-3 py-2 text-right">Avg score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(showAll ? rows : rows.slice(0, 12)).map((s) => (
                                    <tr
                                        key={s.key}
                                        onClick={() => onOpen(s)}
                                        className="cursor-pointer hover:bg-slate-50/80"
                                    >
                                        <td className="max-w-[300px] px-3 py-2.5">
                                            <span className="flex items-center gap-1.5">
                                                <span className={cn('truncate font-medium', s.deleted ? 'italic text-slate-400' : 'text-slate-900')} title={s.title}>
                                                    {s.title}
                                                </span>
                                                {s.live && <Chip tone="emerald">Live</Chip>}
                                                {s.via === 'code' && <Chip tone="violet" title="Candidates joined with a code"><KeyRound className="h-3 w-3" /></Chip>}
                                                {s.blank_rate !== null && s.blank_rate >= 50 && (
                                                    <Chip tone="amber" title={`${s.blanks} of ${s.submissions} papers had no answers`}>Mostly blank</Chip>
                                                )}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[12px] text-slate-500">
                                                {s.custom_id ? `#${s.custom_id} · ` : ''}
                                                {s.total_questions ? `${s.total_questions} questions` : 'questions unknown'}
                                                {s.duration ? ` · ${s.duration} min` : ''}
                                            </span>
                                        </td>
                                        <td className="max-w-[180px] px-2 py-2.5">
                                            <span className="flex items-center gap-1.5">
                                                <span className="truncate text-slate-700">{s.educator?.name || 'Unknown'}</span>
                                                {s.educator?.is_self ? <Chip tone="sky">You</Chip> : s.educator?.is_team ? <Chip tone="sky">Team</Chip> : null}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[11.5px] text-slate-400">{s.educator?.email || ''}</span>
                                        </td>
                                        <td className="whitespace-nowrap px-2 py-2.5 text-slate-700">
                                            {istDate(`${s.day}T00:00:00+05:30`)}
                                            <span className="mt-0.5 block text-[11.5px] text-slate-400">
                                                {s.window_minutes === null ? '' : s.window_minutes > 0 ? `${s.window_minutes} min window` : 'single paper'}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-slate-900">{num(s.candidates)}</td>
                                        <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{num(s.submissions)}</td>
                                        <td className={cn('px-2 py-2.5 text-right tabular-nums',
                                            s.blank_rate !== null && s.blank_rate >= 50 ? 'font-semibold text-amber-700' : 'text-slate-500')}>
                                            {s.blanks === 0 ? <span className="text-slate-300">—</span> : `${s.blanks}`}
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                                            {s.avg_score_pct === null ? '—' : pct(s.avg_score_pct)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {rows.length > 12 && (
                            <button type="button" onClick={() => setShowAll((v) => !v)}
                                className="mt-1 w-full rounded-lg py-2 text-[13px] font-semibold text-sky-700 transition-colors hover:bg-sky-50">
                                {showAll ? 'Show fewer' : `Show all ${rows.length} exams`}
                            </button>
                        )}
                        {d.sittings_total > d.sittings.length && showAll && (
                            <p className="px-3 pb-1 text-center text-[12px] text-slate-400">
                                Showing the {d.sittings.length} most recent of {num(d.sittings_total)} — narrow the period to see the rest.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

// ── Exam rules sheet ──────────────────────────────────────────────────────────
function RulesSheet({ exam, onClose }: { exam: LiveExam | null; onClose: () => void }) {
    const rules = exam ? proctoringRules(exam.settings) : [];
    return (
        <IosSheet
            open={!!exam}
            onOpenChange={(open) => !open && onClose()}
            title={exam?.title || 'Exam rules'}
            subtitle={exam ? `${exam.duration ?? '—'} min · ${exam.total_questions ?? '—'} questions · ${exam.educator?.name || 'unknown educator'}` : undefined}
        >
            {!exam ? null : (
                <div className="space-y-4">
                    <ul className={cn(CARD, 'divide-y divide-slate-100 overflow-hidden')}>
                        <Row label="Made live" value={exam.made_live_at ? `${istDateTime(exam.made_live_at)} (${relative(exam.made_live_at)})` : 'Not recorded'} />
                        {exam.is_scheduled && <Row label="Window" value={`${exam.start_time ? istDateTime(exam.start_time) : '—'} → ${exam.end_time ? istDateTime(exam.end_time) : '—'}`} />}
                        <Row label="Papers today" value={num(exam.submissions_today)} />
                        <Row label="Last paper" value={exam.last_submission_at ? relative(exam.last_submission_at) : 'None yet'} />
                        {exam.slug && <Row label="Link" value={<span className="font-mono text-[12px]">/test/{exam.slug}</span>} />}
                    </ul>

                    <div>
                        <p className="mb-1.5 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                            Rules in force ({rules.length})
                        </p>
                        {rules.length === 0 ? (
                            <div className={cn(CARD, 'flex items-start gap-3 p-4')}>
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                <p className="text-[13px] text-slate-600">
                                    Nothing is locked down. Candidates can switch tabs, copy questions and leave the exam freely —
                                    fine for practice, risky for a graded exam.
                                </p>
                            </div>
                        ) : (
                            <ul className={cn(CARD, 'divide-y divide-slate-100 overflow-hidden')}>
                                {rules.map((r) => (
                                    <li key={r.label} className="flex items-start gap-3 px-4 py-2.5">
                                        <r.icon className={cn('mt-0.5 h-4 w-4 shrink-0', r.kind === 'proctoring' ? 'text-emerald-600' : 'text-slate-400')} />
                                        <span className="min-w-0">
                                            <span className="block text-[13.5px] font-medium text-slate-900">{r.label}</span>
                                            <span className="block text-[12px] text-slate-500">{r.detail}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </IosSheet>
    );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <li className="flex items-center justify-between gap-4 px-4 py-2.5">
            <span className="text-[13px] text-slate-500">{label}</span>
            <span className="min-w-0 truncate text-right text-[13px] font-medium text-slate-900">{value}</span>
        </li>
    );
}

// ── What the numbers mean, and what they cannot tell you ──────────────────────
function Footnotes({ d, period }: { d: ExamOps; period: Period }) {
    const notes: { icon: React.ElementType; tone: 'amber' | 'slate'; title: string; body: React.ReactNode }[] = [];

    if (d.team_configured === 0) {
        notes.push({
            icon: AlertTriangle,
            tone: 'amber',
            title: 'Your own exam runs are being counted as customers’',
            body: <>No account is marked as team, so every trial run you make inflates these numbers.
                Add your own emails to the <span className="font-mono text-[12.5px]">admins</span> table and the Customers filter will exclude them.</>,
        });
    }
    if (d.totals.blank_rate !== null && d.totals.blank_rate > 20) {
        notes.push({
            icon: FileWarning,
            tone: 'amber',
            title: `${pct(d.totals.blank_rate)} of papers came in blank`,
            body: <>{d.totals.exams_mostly_blank > 0 && <>{num(d.totals.exams_mostly_blank)} of {num(d.totals.exams)} exams were mostly blank. </>}
                Either people are opening exams to look around, or candidates are getting stuck at the start.
                Open the rows marked <b>Mostly blank</b> — if the blanks cluster in one exam, that exam has a problem.</>,
        });
    }
    if (d.guests.starts > 0) {
        notes.push({
            icon: Info,
            tone: d.guests.submissions === 0 ? 'amber' : 'slate',
            title: `${num(d.guests.starts)} opened a test without an account`,
            body: <>{d.guests.submissions === 0
                ? 'None of them finished. These are the oldest no-account attempts; they never reach a result, so they never reach an educator either.'
                : `${num(d.guests.submissions)} finished.`}</>,
        });
    }
    if (d.now.example_links > 0) {
        notes.push({
            icon: AlertTriangle,
            tone: 'amber',
            title: `${num(d.now.example_links)} example tests are live by accident`,
            body: <>Every new account is given a copy of the walkthrough test, and the template it is copied from has its exam
                link switched on — so each new sign-up quietly publishes a reachable exam. They are excluded from the count
                above; turn conduct mode off on the template to stop it at the source.</>,
        });
    }
    if (d.totals.flagged_submissions === 0 && d.totals.submissions > 0) {
        notes.push({
            icon: AlertTriangle,
            tone: 'slate',
            title: 'Proctoring violations are never saved on a paper',
            body: <>The exam page counts tab switches and fullscreen exits while a candidate writes, but the submitted paper
                stores <span className="font-mono text-[12.5px]">violation_count = 0</span> every time, so this column can
                never fire. Worth fixing before invigilation is sold as a feature.</>,
        });
    }
    notes.push({
        icon: Info,
        tone: 'slate',
        title: 'Starts and drop-off cannot be measured for link exams',
        body: <>A shared exam link records nothing when a candidate opens or abandons the paper — only when they submit.
            So “candidates” means “candidates who finished”. Join-code sittings do track presence, which is why
            {' '}<b>In exam</b> only appears on those.</>,
    });

    return (
        <div className="grid gap-3 lg:grid-cols-3">
            {notes.map((n) => (
                <div key={n.title} className={cn(CARD, 'flex items-start gap-3 p-4', n.tone === 'amber' && 'bg-amber-50 ring-amber-600/20')}>
                    <n.icon className={cn('mt-0.5 h-4 w-4 shrink-0', n.tone === 'amber' ? 'text-amber-700' : 'text-slate-400')} aria-hidden="true" />
                    <div className="min-w-0">
                        <p className={cn('text-[13.5px] font-semibold', n.tone === 'amber' ? 'text-amber-900' : 'text-slate-900')}>{n.title}</p>
                        <p className={cn('mt-0.5 text-[12.5px] leading-relaxed', n.tone === 'amber' ? 'text-amber-900/80' : 'text-slate-500')}>{n.body}</p>
                    </div>
                </div>
            ))}
            <div className={cn(CARD, 'flex items-start gap-3 p-4')}>
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-slate-900">Period compared with {PREVIOUS_LABEL[period]}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500">
                        {istDate(d.range.from)} → {istDate(d.range.to)}. Today’s numbers are compared with the same hours yesterday,
                        so a morning reading is never flattered by a full previous day.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Backend not deployed yet ──────────────────────────────────────────────────
function NotDeployed() {
    return (
        <div className="space-y-4 pb-10">
            <header>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Operations</p>
                <h1 className="mt-1.5 !text-[28px] font-bold leading-[1.1] tracking-[-0.025em] text-slate-900">Live activity</h1>
            </header>
            <section className={cn(CARD, 'p-5 sm:p-6')}>
                <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-sky-500/15 to-sky-500/5 text-sky-700 ring-1 ring-inset ring-sky-500/20">
                    <ServerCrash className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mt-3 !text-[20px] font-bold tracking-[-0.02em] text-slate-900">Deploy the backend to switch this on</h2>
                <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-slate-600">
                    This page reads <span className="font-mono text-[12.5px]">/api/analytics/v2/exam-ops</span>, which is in the
                    code but not yet on the live backend. No database migration is needed — deploy the backend and reload.
                </p>
                <p className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-sky-700">
                    <Rocket className="h-4 w-4" /> Backend first, then this admin app
                    <ChevronRight className="h-4 w-4" />
                </p>
            </section>
        </div>
    );
}
