/**
 * Analytics → Content: every test created and file uploaded to AI import — what it is,
 * who made it and when (IST), newest first.
 *
 * Egress: one page of ~30 small rows per request (SQL analytics_report_content). Question
 * JSON and file contents never leave the database; opening a test is a tap away.
 */
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { ArrowUpRight, ClipboardList, Database, Layers, Paperclip, Search, Sparkles } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { getUserAppUrl } from '@/utils/subdomain';
import type { Nav } from './AnalyticsPanel';
import { insightsApi, NotInstalledError, type ContentCursor, type ContentKind, type ContentRow, type Period } from './api';
import { compact, initials, istDateTime, istTime, num } from './format';
import { ErrorState } from './shared';
import { CARD, Chip, Empty, GroupedList, PILL_BTN, Segmented, Skeleton, StatTile, TileSkeletons } from './ui';

const IST = 'Asia/Kolkata';

export default function ContentTab({ period, kind, onKind, nav }: {
    period: Period;
    kind: ContentKind;
    onKind: (k: ContentKind) => void;
    nav: Nav;
}) {
    const [input, setInput] = useState('');
    const [q, setQ] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setQ(input.trim()), 300);
        return () => clearTimeout(t);
    }, [input]);

    const query = useInfiniteQuery({
        queryKey: ['analytics', 'content', period, kind, q],
        queryFn: ({ pageParam }) => insightsApi.content({ period, kind, q, before: pageParam }),
        initialPageParam: null as ContentCursor | null,
        getNextPageParam: (last) => last.next,
        placeholderData: keepPreviousData,
        // What people made doesn't change by the second; switching tabs shouldn't refetch it.
        staleTime: 5 * 60_000,
    });

    const totals = query.data?.pages[0]?.totals ?? null;
    // Only kinds this page can draw (Study Materials rows came back until its SQL was replaced).
    const rows = useMemo(() => query.data?.pages.flatMap((p) => p.rows).filter((r) => r.kind in KIND_STYLE) ?? [], [query.data]);
    const days = useMemo(() => groupByDay(rows), [rows]);
    const left = totals ? totals.matched - rows.length : 0;
    const toggle = (k: ContentKind) => onKind(kind === k ? 'all' : k);

    if (query.error instanceof NotInstalledError) return <SetupStep />;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {totals ? (
                    <>
                        <StatTile label="Tests created" value={num(totals.tests)}
                            sub={`by ${num(totals.test_creators)} ${totals.test_creators === 1 ? 'person' : 'people'}`}
                            selected={kind === 'test'} onClick={() => toggle('test')} actionLabel="Show only tests"
                            info="Tests people made or copied in this period. The example test every new account gets automatically isn't counted." />
                        <StatTile label="AI uploads" value={num(totals.ai_uploads)}
                            sub={`${compact(totals.ai_questions)} questions made`}
                            selected={kind === 'ai_upload'} onClick={() => toggle('ai_upload')} actionLabel="Show only AI uploads"
                            info="Papers, notes and photos uploaded to Generate with AI. TestoZa keeps the file name, not the file." />
                        <StatTile label="Creators" value={num(totals.people)}
                            sub={totals.team_items ? `${plural(totals.team_items, 'item')} by your team` : 'made or uploaded something'}
                            info="Different people behind everything in this period, your team included." />
                    </>
                ) : <TileSkeletons count={3} />}
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="-mx-1 max-w-full overflow-x-auto px-1">
                    <Segmented<ContentKind> value={kind} onChange={onKind} ariaLabel="Show" options={[
                        { value: 'all', label: 'All' },
                        { value: 'test', label: 'Tests' },
                        { value: 'ai_upload', label: 'AI uploads', title: 'Files uploaded to Generate with AI' },
                    ]} />
                </div>
                <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                        type="search"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Title, file, name or email"
                        aria-label="Search tests and uploads"
                        className="h-9 w-full rounded-xl border-transparent bg-slate-200/60 pl-9 pr-3 text-[14px] text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                </div>
            </div>

            {/* ── Feed, grouped by IST day ── */}
            {query.error && !query.data ? (
                <ErrorState error={query.error} onRetry={() => query.refetch()} />
            ) : !query.data ? (
                <div className={cn(CARD, 'space-y-3 p-4')}>{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : rows.length === 0 ? (
                <div className={CARD}>
                    <Empty icon={q ? Search : Layers} title={q ? 'Nothing matches your search' : EMPTY_TITLE[kind]}>
                        {q ? 'Try a shorter title, a file name, or the person’s email.' : 'Pick a longer period above to look further back.'}
                    </Empty>
                </div>
            ) : (
                <div className={cn('space-y-5', query.isPlaceholderData && 'opacity-60')}>
                    {days.map((d) => (
                        <section key={d.key} aria-label={d.label}>
                            <p className="mb-1.5 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400">{d.label}</p>
                            <GroupedList>
                                {d.rows.map((r) => (
                                    <Item key={`${r.kind}:${r.id}`} r={r} onPerson={() => r.user_id && nav.openPerson({ user: r.user_id })} />
                                ))}
                            </GroupedList>
                        </section>
                    ))}
                    {query.hasNextPage && (
                        <div className="flex justify-center">
                            <button type="button" className={PILL_BTN} onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                                {query.isFetchingNextPage ? 'Loading…' : left > 0 ? `Show more (${num(left)} left)` : 'Show more'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const EMPTY_TITLE: Record<ContentKind, string> = {
    all: 'Nothing created in this period',
    test: 'No tests created in this period',
    ai_upload: 'No AI uploads in this period',
};

// ── One row ───────────────────────────────────────────────────────────────────
const KIND_STYLE = {
    test: { icon: ClipboardList, tint: 'bg-sky-50 text-sky-600 ring-sky-600/15', label: 'Test' },
    ai_upload: { icon: Sparkles, tint: 'bg-violet-50 text-violet-600 ring-violet-600/15', label: 'AI upload' },
} as const;

function Item({ r, onPerson }: { r: ContentRow; onPerson: () => void }) {
    const style = KIND_STYLE[r.kind];
    const Icon = style.icon;
    const title = (r.kind === 'ai_upload' ? r.made_title || uploadLabel(r.title) : r.title) || 'Untitled';
    const href = r.kind === 'test' ? getUserAppUrl(`/test-intro/${r.id}`) : undefined;

    return (
        <li className="flex items-start gap-3 px-4 py-3">
            <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] ring-1 ring-inset', style.tint)} title={style.label}>
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                <span className="sr-only">{style.label}</span>
            </span>

            <div className="min-w-0 flex-1">
                {/* Long titles take two lines and push the chips below, instead of being cut to a few words on phones. */}
                <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                    <p className="line-clamp-2 min-w-0 max-w-full break-words text-[14px] font-semibold leading-snug text-slate-900" title={title}>{title}</p>
                    <Badges r={r} />
                </div>
                <Facts r={r} />
                <Creator r={r} onPerson={onPerson} />
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
                <time dateTime={r.at} title={istDateTime(r.at)} className="text-[12px] tabular-nums text-slate-500">{istTime(r.at)}</time>
                {href && (
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open the test"
                        aria-label={`Open ${title}`}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                    >
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                )}
            </div>
        </li>
    );
}

function Badges({ r }: { r: ContentRow }) {
    return (
        <>
            {r.kind === 'test' && r.live && <Chip tone="emerald" title="Conduct-exam link is on">Live</Chip>}
            {r.kind === 'test' && r.visibility && r.visibility !== 'public' && <Chip>{r.visibility === 'private' ? 'Private' : 'Unlisted'}</Chip>}
            {r.kind === 'test' && r.cloned && <Chip tone="sky" title="Copied from another test">Copy</Chip>}
            {r.kind === 'ai_upload' && r.mode && (
                <Chip tone="violet" title={r.mode === 'generate' ? 'New questions written from the upload' : 'Questions read from the uploaded paper'}>
                    {r.mode === 'generate' ? 'Generated' : 'Extracted'}
                </Chip>
            )}
            {r.is_team && <Chip tone="violet" title="Made by your team">Team</Chip>}
        </>
    );
}

function Facts({ r }: { r: ContentRow }) {
    const facts: React.ReactNode[] = [];
    if (r.kind === 'test') {
        if (r.questions !== undefined) facts.push(`${num(r.questions)} ${r.questions === 1 ? 'question' : 'questions'}`);
        if (r.minutes) facts.push(`${num(r.minutes)} min`);
        if (r.marks) facts.push(`${num(r.marks)} marks`);
        if (r.class_name) facts.push(r.class_name);
        facts.push(r.results
            ? <span className="font-medium text-slate-700">{num(r.results)} {r.results === 1 ? 'result' : 'results'}</span>
            : <span className="text-slate-400">No results yet</span>);
    } else {
        // Inline glyph + plain text, so the fact's own ellipsis cuts the file name, not the whole fact.
        facts.push(
            <span title={r.title}>
                <Paperclip className="mr-1 inline h-3 w-3 align-[-2px]" aria-hidden="true" />
                {uploadLabel(r.title)}
            </span>,
        );
        if (r.questions) facts.push(`${num(r.questions)} ${r.questions === 1 ? 'question' : 'questions'}`);
    }
    // Every fact carries a 16px "·" in front; the row is shifted 16px left and clipped, so the
    // dot of whichever fact starts a line (the first, or one that wrapped on a phone) is hidden.
    return (
        <div className="mt-0.5 overflow-hidden text-[12px] text-slate-500">
            <div className="-ml-4 flex flex-wrap items-center gap-y-0.5">
                {facts.map((f, i) => (
                    <span key={i} className="min-w-0 max-w-full truncate before:inline-block before:w-4 before:text-center before:text-slate-300 before:content-['·']">
                        {f}
                    </span>
                ))}
            </div>
        </div>
    );
}

function Creator({ r, onPerson }: { r: ContentRow; onPerson: () => void }) {
    const name = r.user_name || r.user_email?.split('@')[0] || (r.user_id ? 'Unnamed account' : 'Deleted account');
    const role = r.user_role && r.user_role !== 'Other' ? r.user_role : null;
    const inner = (
        <>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-[9px] font-bold text-white" aria-hidden="true">
                {initials(name)}
            </span>
            <span className="truncate font-medium text-slate-700">{name}</span>
            {role && <span className="shrink-0 text-slate-400">· {role}</span>}
            {r.user_email && <span className="hidden min-w-0 truncate text-slate-400 sm:inline">· {r.user_email}</span>}
        </>
    );
    if (!r.user_id) {
        return <span className="mt-1.5 inline-flex max-w-full items-center gap-1.5 text-[12px] opacity-70">{inner}</span>;
    }
    return (
        <button
            type="button"
            onClick={onPerson}
            title="See this person’s activity"
            className="-ml-1 mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full py-0.5 pl-1 pr-2 text-left text-[12px] transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
        >
            {inner}
        </button>
    );
}

// ── Formatting ────────────────────────────────────────────────────────────────
const plural = (n: number, word: string) => `${num(n)} ${n === 1 ? word : `${word}s`}`;

const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: IST }); // YYYY-MM-DD

function dayLabel(key: string): string {
    const now = Date.now();
    if (key === dayKey(new Date(now).toISOString())) return 'Today';
    if (key === dayKey(new Date(now - 86_400_000).toISOString())) return 'Yesterday'; // IST has no DST
    const [y, m, d] = key.split('-').map(Number);
    const sameYear = String(y) === dayKey(new Date(now).toISOString()).slice(0, 4);
    return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-IN', {
        timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }),
    });
}

function groupByDay(rows: ContentRow[]): { key: string; label: string; rows: ContentRow[] }[] {
    const out: { key: string; label: string; rows: ContentRow[] }[] = [];
    for (const r of rows) {
        const key = dayKey(r.at);
        const last = out[out.length - 1];
        if (last && last.key === key) last.rows.push(r);
        else out.push({ key, label: dayLabel(key), rows: [r] });
    }
    return out;
}

const FILE_EXT = /\.(pdf|jpe?g|png|webp|heic|gif|docx?|pptx?|xlsx?|txt)(?=,|\s|$)/gi;

/** "paper.pdf", or "5 photos" when a phone sent several camera-named files at once. */
function uploadLabel(names?: string): string {
    if (!names) return 'Uploaded file';
    const exts = names.match(FILE_EXT) || [];
    if (exts.length <= 1) return names;
    const photos = exts.every((e) => /jpe?g|png|webp|heic|gif/i.test(e));
    return `${exts.length} ${photos ? 'photos' : 'files'}`;
}

function SetupStep() {
    return (
        <section className={cn(CARD, 'p-5 sm:p-6')}>
            <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-sky-500/15 to-sky-500/5 text-sky-700 ring-1 ring-inset ring-sky-500/20">
                <Database className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-3 !text-[20px] font-bold tracking-[-0.02em] text-slate-900">One step to turn this on</h2>
            <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-slate-600">
                Supabase → SQL editor → paste
                <span className="font-mono text-[12.5px]"> supabase/migrations/20261013150000_analytics_content.sql </span>
                and run it. Then refresh this page.
            </p>
        </section>
    );
}
