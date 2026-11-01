/**
 * Admin → Manage Tests. Every test on TestoZa in the Users panel's language: what is
 * live right now, what is being taken, what nobody has used, what candidates reported —
 * found by filter, search (title, #ID, creator, class) or creator, and managed from one
 * sheet per test.
 *
 * One lean report per page (see ./api.ts): no questions or results are downloaded to
 * draw this list.
 */
import { keepPreviousData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, BarChart3, ChevronRight, ExternalLink, FileText, Plus, RefreshCw, Search, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TestResultsPanel from '@/components/TestResultsPanel';
import TestSettingsPanel from '@/components/TestSettingsPanel';
import { cn } from '@/lib/utils';
import { getUserAppUrl } from '@/utils/subdomain';
import { NotInstalledError } from '../analytics/api';
import { num, relative } from '../analytics/format';
import { ErrorState, usePersisted } from '../analytics/shared';
import { CARD, Empty, GroupedList, PILL_BTN, Segmented, Skeleton } from '../analytics/ui';
import { testsApi, type TestRow, type TestSort, type TestsReport, type TestView } from './api';
import { CreatorAvatar, factsLine, pctText, StateChips, StateIcon } from './display';
import TestSheet, { type PanelRequest } from './TestSheet';

const VIEWS: readonly TestView[] = ['all', 'live', 'exams', 'public', 'link', 'private', 'unused', 'reported', 'examples', 'team'];
const SORTS: readonly TestSort[] = ['newest', 'activity', 'results', 'title'];
const PAGE = 40;

export default function TestsPanel() {
    const [, setSearchParams] = useSearchParams();
    const qc = useQueryClient();
    const [view, setView] = usePersisted<TestView>('tz_admin_tests_view', 'all', VIEWS);
    const [sort, setSort] = usePersisted<TestSort>('tz_admin_tests_sort', 'newest', SORTS);
    const [input, setInput] = useState('');
    const [q, setQ] = useState('');
    const [creator, setCreator] = useState<{ id: string; name?: string } | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);
    const [openRow, setOpenRow] = useState<TestRow | null>(null);
    // Results and Settings open over the page; closing them brings the test's sheet back.
    const [panel, setPanel] = useState<PanelRequest | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setQ(input.trim()), 300);
        return () => clearTimeout(t);
    }, [input]);

    const list = useInfiniteQuery({
        queryKey: ['tests', 'list', view, q, sort, creator?.id ?? null],
        queryFn: ({ pageParam }) => testsApi.list({ view, q, sort, creator: creator?.id, limit: PAGE, offset: pageParam as number }),
        initialPageParam: 0,
        getNextPageParam: (last, pages) => {
            const loaded = pages.reduce((a, pg) => a + pg.rows.length, 0);
            return loaded < last.total ? loaded : undefined;
        },
        placeholderData: keepPreviousData,
        staleTime: 30_000,
        // Live exams move; keep "writing now" honest while the page is open.
        refetchInterval: view === 'live' ? 30_000 : false,
    });

    const first = list.data?.pages[0];
    const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
    const total = first?.total ?? 0;

    const open = (r: TestRow) => { setOpenRow(r); setOpenId(r.id); };
    const refresh = () => qc.invalidateQueries({ queryKey: ['tests'] });
    const closePanel = () => {
        const back = panel?.test.id ?? null;
        setPanel(null);
        if (back) setOpenId(back);
    };

    if (list.error instanceof NotInstalledError) return <Setup />;

    return (
        <div className="space-y-5 pb-10">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Content</p>
                    <h1 className="mt-1.5 !text-[28px] font-bold leading-[1.1] tracking-[-0.025em] text-slate-900 sm:!text-[34px]">Tests</h1>
                    <p className="mt-2 hidden text-[15px] text-slate-600 sm:block">
                        Every test on TestoZa — what is live, what is being taken, and what nobody has used yet.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" className={PILL_BTN} onClick={refresh} aria-label="Refresh" title="Refresh">
                        <RefreshCw className={cn('h-4 w-4', list.isFetching && 'motion-safe:animate-spin')} />
                    </button>
                    <button type="button" onClick={() => setSearchParams({ tab: 'builder' })}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-sky-600 px-4 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-colors hover:bg-sky-700 motion-safe:active:scale-[0.97]">
                        <Plus className="h-4 w-4" /> New test
                    </button>
                </div>
            </header>

            <Overview report={first} onPick={setView} />

            {/* ── Filters ── */}
            <div className="space-y-2.5">
                <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
                    <Segmented<TestView>
                        ariaLabel="Which tests"
                        value={view}
                        onChange={setView}
                        options={[
                            { value: 'all', label: <SegLabel text="All tests" n={first?.counts.all} /> },
                            { value: 'live', label: <SegLabel text="Live now" n={first?.counts.live} live />, title: 'Exam links open now or scheduled to open' },
                            { value: 'exams', label: <SegLabel text="Exams" n={first?.counts.exams} />, title: 'Ever run as an exam (live, scheduled or ended)' },
                            { value: 'public', label: <SegLabel text="Public" n={first?.counts.public} /> },
                            { value: 'link', label: <SegLabel text="Link only" n={first?.counts.link} />, title: 'Unlisted practice links (not live exams)' },
                            { value: 'private', label: <SegLabel text="Private" n={first?.counts.private} /> },
                            { value: 'unused', label: <SegLabel text="Never taken" n={first?.counts.unused} />, title: 'No result from anyone but the creator' },
                            { value: 'reported', label: <SegLabel text="Reported" n={first?.counts.reported} accent />, title: 'Candidates reported a question and it is still open' },
                            { value: 'examples', label: <SegLabel text="Examples" n={first?.counts.examples} />, title: 'The example test every new account gets' },
                            { value: 'team', label: <SegLabel text="Team" n={first?.counts.team} />, title: 'Made by TestoZa admins' },
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
                            placeholder="Title, #ID, creator or class"
                            aria-label="Search tests"
                            className="h-9 w-full rounded-xl border-transparent bg-slate-200/60 pl-9 pr-3 text-[14px] text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                        />
                    </div>
                    <Segmented<TestSort>
                        size="sm"
                        ariaLabel="Sort"
                        value={sort}
                        onChange={setSort}
                        options={[
                            { value: 'newest', label: 'Newest' },
                            { value: 'activity', label: 'Last result', title: 'Most recently taken first' },
                            { value: 'results', label: 'Most results' },
                            { value: 'title', label: 'A–Z' },
                        ]}
                    />
                </div>
                {creator && (
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-[12px] text-slate-500">Made by</span>
                        <button type="button" onClick={() => setCreator(null)}
                            className="inline-flex h-7 items-center gap-1.5 rounded-full bg-sky-50 pl-3 pr-2 text-[12px] font-semibold text-sky-800 ring-1 ring-inset ring-sky-600/20 hover:bg-sky-100"
                            aria-label={`Stop showing only tests by ${creator.name || 'this creator'}`}>
                            {first?.creator?.name || creator.name || 'One creator'}
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* ── List ── */}
            {list.error && !list.data ? (
                <ErrorState error={list.error} onRetry={() => list.refetch()} />
            ) : !list.data ? (
                <div className={cn(CARD, 'space-y-3 p-4')}>{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : rows.length === 0 ? (
                <div className={CARD}>
                    <Empty icon={FileText} title={q ? 'No test matches your search' : EMPTY_TITLE[view]}>
                        {q ? 'Search looks at the title, the #ID, the creator’s name and email, and the class.' : null}
                    </Empty>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between px-1">
                        <p className="text-[12px] font-medium text-slate-500">{num(total)} {total === 1 ? 'test' : 'tests'}</p>
                        <p className="hidden text-[12px] text-slate-400 md:block">Results · average · last taken</p>
                    </div>
                    <GroupedList className={cn(list.isPlaceholderData && 'opacity-60')}>
                        {rows.map((r) => (
                            <Row key={r.id} r={r} onOpen={() => open(r)}
                                onResults={() => setPanel({ kind: 'results', test: { id: r.id, title: r.title } })} />
                        ))}
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

            <TestSheet
                testId={openId}
                preview={openRow?.id === openId ? openRow : null}
                onClose={() => setOpenId(null)}
                onShowCreator={(c) => { setCreator(c); setView('all'); setOpenId(null); }}
                onPanel={(p) => { setOpenId(null); setPanel(p); }}
            />

            {panel?.kind === 'results' && (
                <TestResultsPanel test={panel.test} onClose={closePanel} />
            )}
            {panel?.kind === 'settings' && (
                <TestSettingsPanel
                    test={panel.test}
                    onClose={closePanel}
                    onUpdate={() => { refresh(); }}
                    onViewResults={() => setPanel({ kind: 'results', test: panel.test })}
                    overridePremium={true}
                />
            )}
        </div>
    );
}

const EMPTY_TITLE: Record<TestView, string> = {
    all: 'No tests yet',
    live: 'No exam is live right now',
    exams: 'No test has been run as an exam',
    public: 'No public tests',
    link: 'No link-only practice tests',
    private: 'No private tests',
    unused: 'Every test has been taken at least once',
    reported: 'No open question reports',
    examples: 'No example tests',
    team: 'The team hasn’t made any tests',
};

function SegLabel({ text, n, accent, live }: { text: string; n?: number; accent?: boolean; live?: boolean }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            {live && n !== undefined && n > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" aria-hidden="true" />}
            {text}
            {n !== undefined && (
                <span className={cn('rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                    accent && n > 0 ? 'bg-rose-500 text-white' : 'bg-slate-900/[0.06] text-slate-500')}>
                    {n}
                </span>
            )}
        </span>
    );
}

/** Platform at a glance. Every tile that names a group opens it. */
function Overview({ report, onPick }: { report?: TestsReport; onPick: (v: TestView) => void }) {
    if (!report) {
        return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[104px]" />)}</div>;
    }
    const s = report.summary;
    const takenShare = s.tests > 0 ? Math.round((s.taken / s.tests) * 100) : 0;
    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Tests" value={s.tests} hint={`+${num(s.new_7d)} this week · ${num(s.creators)} creators`} onClick={() => onPick('all')} />
            <Tile
                label="Live now"
                value={s.live}
                tone={s.live > 0 ? 'emerald' : undefined}
                hint={s.writing_now > 0 ? `${num(s.writing_now)} writing now` : s.scheduled > 0 ? `${num(s.scheduled)} scheduled` : 'exam links open'}
                onClick={() => onPick('live')}
            />
            <Tile label="Results this week" value={s.results_7d} hint={`${num(s.results)} all time`} />
            <Tile
                label="Never taken"
                value={s.unused}
                hint={`${takenShare}% of tests have results`}
                onClick={() => onPick('unused')}
                bar={takenShare}
            />
        </div>
    );
}

function Tile({ label, value, hint, onClick, tone, bar }: {
    label: string; value: number; hint?: string; onClick?: () => void; tone?: 'emerald'; bar?: number;
}) {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag type={onClick ? 'button' : undefined} onClick={onClick}
            className={cn(CARD, 'flex flex-col items-start p-3.5 text-left sm:p-4', onClick && 'transition-colors hover:bg-slate-50')}>
            <span className="text-[12px] font-medium text-slate-500">{label}</span>
            <span className={cn('mt-1 text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums',
                tone === 'emerald' ? 'text-emerald-600' : 'text-slate-900')}>{num(value)}</span>
            {bar !== undefined && (
                <span className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <span className="block h-full rounded-full bg-sky-600" style={{ width: `${bar}%` }} />
                </span>
            )}
            <span className="mt-1.5 text-[11px] leading-tight text-slate-500">{hint}</span>
        </Tag>
    );
}

function Row({ r, onOpen, onResults }: { r: TestRow; onOpen: () => void; onResults: () => void }) {
    return (
        <li className="group flex items-stretch">
            <button type="button" onClick={onOpen}
                className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none">
                <StateIcon t={r} />
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        <span className="line-clamp-2 min-w-0 break-words text-[14px] font-semibold leading-snug text-slate-900" title={r.title}>{r.title}</span>
                        <StateChips t={r} />
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-slate-500">
                        {factsLine(r)}{r.class_name ? ` · ${r.class_name}` : ''}
                    </span>
                    <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] text-slate-600">
                        <CreatorAvatar name={r.creator.name} url={r.creator.avatar_url} />
                        <span className="truncate">{r.creator.name || 'Unknown creator'}</span>
                        {r.creator.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-label="Verified creator" />}
                        <span className="text-slate-300">·</span>
                        <span className="shrink-0 text-slate-500">{relative(r.created_at)}</span>
                    </span>
                </span>
                {/* Results at a glance; the number stays on phones. */}
                <span className="flex shrink-0 flex-col items-end gap-0.5 pl-2 text-right">
                    <span className={cn('text-[17px] font-semibold leading-tight tabular-nums', r.results ? 'text-slate-900' : 'text-slate-300')}>{num(r.results)}</span>
                    <span className="text-[11px] text-slate-400">{r.results === 1 ? 'result' : 'results'}</span>
                    <span className="hidden text-[11px] text-slate-500 md:block">
                        {r.results ? `avg ${pctText(r.avg_pct)} · ${relative(r.last_result_at)}` : r.previews ? `${num(r.previews)} preview${r.previews === 1 ? '' : 's'}` : ''}
                    </span>
                </span>
                <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-slate-300 md:hidden" aria-hidden="true" />
            </button>
            {/* One-click Results and Open, as on the old cards (desktop). */}
            <span className="hidden shrink-0 items-center gap-1 pr-3 md:flex">
                <IconButton label="Results" onClick={onResults}><BarChart3 className="h-4 w-4" /></IconButton>
                <a href={getUserAppUrl(`/test-intro/${r.id}`)} target="_blank" rel="noopener noreferrer" title="Open the test" aria-label="Open the test"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                    <ExternalLink className="h-4 w-4" />
                </a>
            </span>
        </li>
    );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" onClick={onClick} title={label} aria-label={label}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50">
            {children}
        </button>
    );
}

function Setup() {
    return (
        <div className={cn(CARD, 'p-6')}>
            <p className="text-[17px] font-semibold text-slate-900">One database update needed</p>
            <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-slate-600">
                Run <span className="font-mono text-[12.5px]">supabase/migrations/20261016120000_admin_manage_tests.sql</span> in the
                Supabase SQL editor, then reload this page.
            </p>
        </div>
    );
}
