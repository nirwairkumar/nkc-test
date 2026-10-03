/**
 * Admin → Users. Every account, in the analytics panel's iOS language:
 * who they are (educator / student / exam candidate / team), where each educator
 * is in the journey, and who needs a nudge — with a ready follow-up email.
 *
 * Exam candidates (logins created automatically when someone takes an exam
 * without an account) are kept apart: they are not sign-ups.
 */
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { BadgeCheck, ChevronRight, Mail, Search, UserRound, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { insightsApi, NotInstalledError, type PeopleReport, type PeopleRow, type PeopleSegment, type PeopleSort } from '../analytics/api';
import { initials, num, relative } from '../analytics/format';
import { ErrorState, usePersisted } from '../analytics/shared';
import { CARD, Chip, Empty, GroupedList, PILL_BTN, Segmented, Skeleton } from '../analytics/ui';
import { displayName, firstName, FOLLOW_UP, KIND_LABEL, KIND_TONE, mailto, STAGES } from './roles';
import UserSheet from './UserSheet';

const SEGMENTS: readonly PeopleSegment[] = ['members', 'educator', 'student', 'unset', 'candidate', 'team', 'follow_up'];
const SORTS: readonly PeopleSort[] = ['newest', 'active', 'tests', 'results'];
const PAGE = 40;

export default function UsersPanel() {
    const [segment, setSegment] = usePersisted<PeopleSegment>('tz_admin_users_segment', 'members', SEGMENTS);
    const [sort, setSort] = usePersisted<PeopleSort>('tz_admin_users_sort', 'newest', SORTS);
    const [input, setInput] = useState('');
    const [q, setQ] = useState('');
    const [open, setOpen] = useState<PeopleRow | null>(null);
    useEffect(() => {
        const t = setTimeout(() => setQ(input.trim()), 300);
        return () => clearTimeout(t);
    }, [input]);

    const list = useInfiniteQuery({
        queryKey: ['users', 'list', segment, q, sort],
        queryFn: ({ pageParam }) => insightsApi.people({ segment, q, sort, limit: PAGE, offset: pageParam as number }),
        initialPageParam: 0,
        getNextPageParam: (last, pages) => {
            const loaded = pages.reduce((a, pg) => a + pg.rows.length, 0);
            return loaded < last.total ? loaded : undefined;
        },
        placeholderData: keepPreviousData,
        staleTime: 30_000,
    });
    const nudge = useQuery({
        queryKey: ['users', 'nudge'],
        queryFn: () => insightsApi.people({ segment: 'follow_up', sort: 'newest', limit: 3 }),
        staleTime: 60_000,
    });

    const counts = list.data?.pages[0]?.counts ?? nudge.data?.counts;
    const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
    const total = list.data?.pages[0]?.total ?? 0;

    if (list.error instanceof NotInstalledError || nudge.error instanceof NotInstalledError) {
        return <Setup />;
    }

    return (
        <div className="space-y-5 pb-10">
            <header>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">People</p>
                <h1 className="mt-1.5 !text-[28px] font-bold leading-[1.1] tracking-[-0.025em] text-slate-900 sm:!text-[34px]">Users</h1>
                <p className="mt-2 hidden text-[15px] text-slate-600 sm:block">
                    Everyone with a TestoZa account, where each educator is in their journey, and who needs a nudge.
                </p>
            </header>

            <Overview report={list.data?.pages[0] ?? nudge.data} onPick={setSegment} />

            {(segment === 'members' || segment === 'educator') && nudge.data && nudge.data.rows.length > 0 && (
                <NeedsNudge report={nudge.data} onOpen={setOpen} onSeeAll={() => setSegment('follow_up')} />
            )}

            {/* ── Filters ── */}
            <div className="space-y-2.5">
                <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
                    <Segmented<PeopleSegment>
                        ariaLabel="Who"
                        value={segment}
                        onChange={setSegment}
                        options={[
                            { value: 'members', label: <SegLabel text="All users" n={counts?.members} /> },
                            { value: 'educator', label: <SegLabel text="Educators" n={counts?.educator} /> },
                            { value: 'student', label: <SegLabel text="Students" n={counts?.student} /> },
                            { value: 'unset', label: <SegLabel text="No role" n={counts?.unset} />, title: 'Accounts that skipped onboarding' },
                            { value: 'candidate', label: <SegLabel text="Exam candidates" n={counts?.candidate} />, title: 'Logins created automatically for exam takers without an account' },
                            { value: 'team', label: <SegLabel text="Team" n={counts?.team} /> },
                            { value: 'follow_up', label: <SegLabel text="Follow up" n={counts?.follow_up} accent /> },
                        ]}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="search"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={segment === 'candidate' ? 'Name a candidate typed…' : 'Name or email'}
                            aria-label="Search users"
                            className="h-9 w-full rounded-xl border-transparent bg-slate-200/60 pl-9 pr-3 text-[14px] text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                        />
                    </div>
                    {segment !== 'follow_up' && (
                        <Segmented<PeopleSort>
                            size="sm"
                            ariaLabel="Sort"
                            value={sort}
                            onChange={setSort}
                            options={[
                                { value: 'newest', label: 'Newest' },
                                { value: 'active', label: 'Last active' },
                                { value: 'tests', label: 'Most tests' },
                                { value: 'results', label: 'Most results' },
                            ]}
                        />
                    )}
                </div>
                {segment === 'candidate' && (
                    <p className="px-1 text-[12px] leading-relaxed text-slate-500">
                        Created automatically when someone takes an exam without an account — every result needs a login to
                        belong to. They are not sign-ups and aren’t counted as users anywhere.
                    </p>
                )}
                {segment === 'follow_up' && (
                    <p className="px-1 text-[12px] leading-relaxed text-slate-500">
                        Educators to contact, most promising first: made a test nobody has taken (2+ days), signed up without a
                        test (1+ day), or had results then went quiet (3+ weeks).
                    </p>
                )}
            </div>

            {/* ── List ── */}
            {list.error && !list.data ? (
                <ErrorState error={list.error} onRetry={() => list.refetch()} />
            ) : !list.data ? (
                <div className={cn(CARD, 'space-y-3 p-4')}>{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : rows.length === 0 ? (
                <div className={CARD}>
                    <Empty icon={segment === 'follow_up' ? BadgeCheck : Users} title={q ? 'Nobody matches your search' : segment === 'follow_up' ? 'Nobody needs a nudge right now' : 'No accounts here yet'} />
                </div>
            ) : (
                <>
                    <p className="px-1 text-[12px] font-medium text-slate-500">{num(total)} {total === 1 ? 'account' : 'accounts'}</p>
                    <GroupedList className={cn(list.isPlaceholderData && 'opacity-60')}>
                        {rows.map((r) => <Row key={r.id} r={r} showReason={segment === 'follow_up'} onOpen={() => setOpen(r)} />)}
                    </GroupedList>
                    {list.hasNextPage && (
                        <div className="flex justify-center">
                            <button type="button" className={PILL_BTN} onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                                {list.isFetchingNextPage ? 'Loading…' : `Show more (${num(total - rows.length)} left)`}
                            </button>
                        </div>
                    )}
                </>
            )}

            <UserSheet person={open} onClose={() => setOpen(null)} />
        </div>
    );
}

function SegLabel({ text, n, accent }: { text: string; n?: number; accent?: boolean }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            {text}
            {n !== undefined && (
                <span className={cn('rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                    accent && n > 0 ? 'bg-amber-500 text-white' : 'bg-slate-900/[0.06] text-slate-500')}>
                    {n}
                </span>
            )}
        </span>
    );
}

/** Educator journey at a glance: how many educators sit at each stage. */
function Overview({ report, onPick }: { report?: PeopleReport; onPick: (s: PeopleSegment) => void }) {
    if (!report) {
        return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>;
    }
    const c = report.counts;
    const stageTotal = STAGES.reduce((a, s) => a + c.stages[s.key], 0) || 1;
    const stageColor: Record<string, string> = {
        signed_up: '#cbd5e1', created_test: '#86b6ef', getting_results: '#2a78d6', went_quiet: '#f59e0b',
    };
    return (
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
            <section className={cn(CARD, 'p-4 sm:p-5')}>
                <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[15px] font-semibold text-slate-900">Educators</h3>
                    <span className="text-[26px] font-semibold tracking-[-0.02em] text-slate-900">{num(c.educator)}</span>
                </div>
                <div className="mt-3 flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100" role="img"
                    aria-label={STAGES.map((s) => `${s.short} ${c.stages[s.key]}`).join(', ')}>
                    {STAGES.filter((s) => c.stages[s.key] > 0).map((s) => (
                        <span key={s.key} className="h-full first:rounded-l-full last:rounded-r-full"
                            style={{ width: `${(c.stages[s.key] / stageTotal) * 100}%`, background: stageColor[s.key] }}
                            title={`${s.label}: ${c.stages[s.key]}`} />
                    ))}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                    {STAGES.map((s) => (
                        <div key={s.key}>
                            <dt className="flex items-center gap-1.5 text-[12px] text-slate-500">
                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: stageColor[s.key] }} aria-hidden="true" />
                                {s.short}
                            </dt>
                            <dd className="text-[17px] font-semibold tabular-nums text-slate-900">{num(c.stages[s.key])}</dd>
                        </div>
                    ))}
                </dl>
            </section>
            <div className="grid grid-cols-3 gap-3">
                <MiniTile label="Students" value={c.student} onClick={() => onPick('student')} />
                <MiniTile label="New this week" value={c.new_7d} hint="real accounts" />
                <MiniTile label="Exam candidates" value={c.candidate} hint="not users" onClick={() => onPick('candidate')} />
            </div>
        </div>
    );
}

function MiniTile({ label, value, hint, onClick }: { label: string; value: number; hint?: string; onClick?: () => void }) {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag type={onClick ? 'button' : undefined} onClick={onClick}
            className={cn(CARD, 'flex flex-col items-start p-3.5 text-left', onClick && 'transition-colors hover:bg-slate-50')}>
            <span className="min-h-[30px] text-[12px] font-medium leading-tight text-slate-500">{label}</span>
            <span className="mt-1 text-[24px] font-semibold leading-none tracking-[-0.02em] text-slate-900">{num(value)}</span>
            <span className="mt-1 min-h-[16px] text-[11px] text-slate-400">{hint}</span>
        </Tag>
    );
}

function NeedsNudge({ report, onOpen, onSeeAll }: { report: PeopleReport; onOpen: (r: PeopleRow) => void; onSeeAll: () => void }) {
    return (
        <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-amber-500/25 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-20px_rgba(217,119,6,0.55)]">
            <header className="flex items-center justify-between gap-3 border-b border-amber-100 bg-amber-50/70 px-4 py-2.5 sm:px-5">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-amber-900">
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">{report.counts.follow_up}</span>
                    Educators who need a nudge
                </span>
                <button type="button" onClick={onSeeAll} className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-amber-800 hover:text-amber-900">
                    See all <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </header>
            <ul className="divide-y divide-slate-100">
                {report.rows.map((r) => {
                    const f = r.follow_up ? FOLLOW_UP[r.follow_up] : null;
                    return (
                        <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                            <button type="button" onClick={() => onOpen(r)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                <Avatar row={r} />
                                <span className="min-w-0">
                                    <span className="block truncate text-[14px] font-semibold text-slate-900">{displayName(r)}</span>
                                    <span className="block truncate text-[12px] text-slate-500">{f?.title} · joined {relative(r.created_at)}</span>
                                </span>
                            </button>
                            {f && r.email && (
                                <a href={mailto(r.email, f.subject, f.body(firstName(r)))} title="Write a follow-up"
                                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-sky-50 px-3 text-[12px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-600/15 hover:bg-sky-100">
                                    <Mail className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Email</span>
                                </a>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

const AVATAR_TONE: Record<string, string> = {
    educator: 'from-sky-500 to-sky-700 text-white',
    student: 'from-emerald-500 to-emerald-700 text-white',
    team: 'from-violet-500 to-violet-700 text-white',
    unset: 'from-slate-300 to-slate-400 text-white',
};

export function Avatar({ row, size = 'md' }: { row: Pick<PeopleRow, 'kind' | 'avatar_url' | 'full_name' | 'candidate_name' | 'email'>; size?: 'md' | 'lg' }) {
    const box = size === 'lg' ? 'h-12 w-12 text-[15px]' : 'h-10 w-10 text-[13px]';
    if (row.avatar_url && row.kind !== 'candidate') {
        return <img src={row.avatar_url} alt="" className={cn(box, 'shrink-0 rounded-full object-cover ring-1 ring-slate-900/[0.06]')} />;
    }
    if (row.kind === 'candidate') {
        return (
            <span className={cn(box, 'flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400')}>
                <UserRound className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} aria-hidden="true" />
            </span>
        );
    }
    return (
        <span className={cn(box, 'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold', AVATAR_TONE[row.kind] || AVATAR_TONE.unset)}>
            {initials(displayName(row))}
        </span>
    );
}

function Row({ r, onOpen, showReason }: { r: PeopleRow; onOpen: () => void; showReason: boolean }) {
    const stage = r.stage ? STAGES.find((s) => s.key === r.stage) : null;
    const f = r.follow_up ? FOLLOW_UP[r.follow_up] : null;
    return (
        <li>
            <button type="button" onClick={onOpen}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none">
                <Avatar row={r} />
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-[14px] font-semibold text-slate-900">{displayName(r)}</span>
                        {r.is_verified_creator && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-600" aria-label="Verified creator" />}
                        <Chip tone={KIND_TONE[r.kind]}>{r.kind === 'educator' && r.designation ? r.designation : KIND_LABEL[r.kind]}</Chip>
                        {r.is_premium && <Chip tone="amber">Premium</Chip>}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-slate-500">
                        {r.kind === 'candidate' ? 'Took an exam without an account' : r.email}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-slate-600">
                        {showReason && f ? (
                            <span className="font-medium text-amber-800">{f.title}</span>
                        ) : r.kind === 'educator' ? (
                            <>
                                {stage && <StageDots stage={r.stage!} label={stage.short} />}
                                <span className="text-slate-400">·</span>
                                <span>{num(r.tests_created)} test{r.tests_created === 1 ? '' : 's'}</span>
                                <span className="text-slate-400">·</span>
                                <span>{num(r.results)} result{r.results === 1 ? '' : 's'}</span>
                            </>
                        ) : (
                            <span>{r.tests_taken ? `Took ${num(r.tests_taken)} test${r.tests_taken === 1 ? '' : 's'}` : 'No tests taken yet'}</span>
                        )}
                    </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[12px] text-slate-500" title="Last active">{relative(r.last_active_at)}</span>
                    <span className="text-[11px] text-slate-400">{r.kind === 'candidate' ? 'first exam' : 'joined'} {relative(r.created_at)}</span>
                    <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
                </span>
            </button>
        </li>
    );
}

function StageDots({ stage, label }: { stage: NonNullable<PeopleRow['stage']>; label: string }) {
    const reached = stage === 'signed_up' ? 1 : stage === 'created_test' ? 2 : 3;
    const quiet = stage === 'went_quiet';
    return (
        <span className="inline-flex items-center gap-1.5" title={label}>
            <span className="inline-flex gap-[3px]" aria-hidden="true">
                {[1, 2, 3].map((i) => (
                    <span key={i} className={cn('h-1.5 w-1.5 rounded-full',
                        i <= reached ? (quiet ? 'bg-amber-500' : 'bg-sky-600') : 'bg-slate-200')} />
                ))}
            </span>
            <span className={cn('font-medium', quiet ? 'text-amber-700' : 'text-slate-700')}>{label}</span>
        </span>
    );
}

function Setup() {
    return (
        <div className={cn(CARD, 'p-6')}>
            <p className="text-[17px] font-semibold text-slate-900">One database update needed</p>
            <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-slate-600">
                Run <span className="font-mono text-[12.5px]">supabase/migrations/20261003120000_analytics_people.sql</span> in the
                Supabase SQL editor, then reload this page.
            </p>
        </div>
    );
}
