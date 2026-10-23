/**
 * Analytics → Video: the TestoZa walkthrough film (frontend LaunchVideo) — how often it is
 * played at each place it sits, how many watch to the end, and what share of the people who
 * opened that page pressed play. Recent plays open the visit they happened in.
 *
 * One small request per period (SQL analytics_report_video); bots and team traffic excluded.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronRight, Database, House, LayoutDashboard, Megaphone, MonitorPlay, PlayCircle } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
import type { Nav } from './AnalyticsPanel';
import { insightsApi, NotInstalledError, type Period, type VideoPlace, type VideoPlay } from './api';
import { istDate, istDateTime, istTime, num, pct, place, ratio } from './format';
import { DeviceIcon, ErrorState } from './shared';
import { CARD, Card, Chip, Empty, GroupedList, InfoTip, Skeleton, StatTile, TileSkeletons } from './ui';

interface PlaceMeta { label: string; where: string; icon: React.ElementType; tint: string; info?: string }

/** Keys are LaunchVideo's `where` prop. */
const PLACES: Record<string, PlaceMeta> = {
    homepage: {
        label: 'Homepage',
        where: '“How it works” section',
        icon: House,
        tint: 'bg-sky-50 text-sky-600 ring-sky-600/15',
    },
    ads_landing: {
        label: 'Ads page',
        where: 'Under the hero · /quiz-creator',
        icon: Megaphone,
        tint: 'bg-amber-50 text-amber-600 ring-amber-600/20',
    },
    dashboard: {
        label: 'Educator dashboard',
        where: 'First-exam checklist',
        icon: LayoutDashboard,
        tint: 'bg-violet-50 text-violet-600 ring-violet-600/15',
        info: 'Only new educators see it, inside the first-exam checklist, which hides once they have run an exam. Page visitors counts everyone who opened the dashboard, so the real play rate here is higher.',
    },
};

const placeMeta = (key: string): PlaceMeta =>
    PLACES[key] ?? { label: key, where: 'Unknown place', icon: MonitorPlay, tint: 'bg-slate-100 text-slate-500 ring-slate-900/10' };

const pathsLabel = (paths: string[] | null) =>
    (paths ?? []).map((p) => `testoza.com${p === '/' ? '' : p}`).join(' · ');

export default function VideoTab({ period, nav }: { period: Period; nav: Nav }) {
    const q = useQuery({
        queryKey: ['analytics', 'video', period],
        queryFn: () => insightsApi.video(period),
        placeholderData: keepPreviousData,
        staleTime: 60_000,
    });

    if (q.error instanceof NotInstalledError) return <SetupStep />;
    if (q.error && !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
    const d = q.data;
    const t = d?.totals;
    const top = Math.max(1, ...(d?.places ?? []).map((p) => p.plays));

    return (
        <div className={cn('space-y-4', q.isPlaceholderData && 'opacity-60')}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {t ? (
                    <>
                        <StatTile label="Plays" value={num(t.plays)}
                            sub={`by ${num(t.viewers)} ${t.viewers === 1 ? 'person' : 'people'}`}
                            info="Times someone pressed play. One per page load — pausing and resuming isn’t a new play." />
                        <StatTile label="Watched to the end" value={num(t.finished)}
                            sub={`${pct(ratio(t.finished_viewers, t.viewers))} of people who pressed play`}
                            info="Plays that reached the last frame of the 1:42 film." />
                        <StatTile label="Play rate" value={pct(ratio(t.viewers, t.page_visitors), 1)}
                            sub={`${num(t.viewers)} of ${num(t.page_visitors)} page visitors`}
                            info="People who pressed play ÷ people who opened a page that has the video (homepage, Ads page, teacher dashboard)." />
                        <StatTile label="Page visitors" value={num(t.page_visitors)}
                            sub="opened a page with the video"
                            info="Different people who opened the homepage, the Ads page or the teacher dashboard in this period. Not everyone scrolls down to the player." />
                    </>
                ) : <TileSkeletons count={4} />}
            </div>

            <Card title="By place" subtitle="Where people press play, and whether they finish">
                {!d ? <Skeleton className="h-48" /> : (
                    <ul className="-mx-1 divide-y divide-slate-100">
                        {d.places.map((p) => <PlaceRow key={p.key} p={p} top={top} />)}
                    </ul>
                )}
            </Card>

            <section aria-label="Recent plays">
                <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400">Recent plays</p>
                    {t?.first_play_at && (
                        <p className="text-[12px] text-slate-400">Tracking since {istDate(t.first_play_at)}</p>
                    )}
                </div>
                {!d ? (
                    <div className={cn(CARD, 'space-y-3 p-4')}>{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
                ) : d.recent.length === 0 ? (
                    <div className={CARD}>
                        <Empty icon={PlayCircle} title="No plays in this period">Pick a longer period above to look further back.</Empty>
                    </div>
                ) : (
                    <GroupedList>
                        {d.recent.map((r) => <PlayRow key={r.id} r={r} onOpen={() => nav.openSession(r.session)} />)}
                    </GroupedList>
                )}
            </section>
        </div>
    );
}

function PlaceRow({ p, top }: { p: VideoPlace; top: number }) {
    const m = placeMeta(p.key);
    const Icon = m.icon;
    const rate = ratio(p.viewers, p.page_visitors);
    const finishRate = ratio(p.finished_viewers, p.viewers);
    return (
        <li className="flex items-start gap-3 px-1 py-3.5">
            <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] ring-1 ring-inset', m.tint)}>
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[14px] font-semibold text-slate-900">
                            {m.label}
                            {m.info && <InfoTip text={m.info} />}
                        </p>
                        <p className="truncate text-[12px] text-slate-500" title={pathsLabel(p.paths)}>{m.where}</p>
                    </div>
                    <div className="shrink-0 text-right">
                        <p className="text-[20px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-slate-900">{num(p.plays)}</p>
                        <p className="mt-1 text-[11px] font-medium text-slate-400">{p.plays === 1 ? 'play' : 'plays'}</p>
                    </div>
                </div>

                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <div className="h-full rounded-full bg-sky-500/80" style={{ width: `${p.plays ? Math.max(3, (p.plays / top) * 100) : 0}%` }} />
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-500">
                    <span>
                        <span className="font-semibold tabular-nums text-slate-800">{num(p.viewers)}</span> of {num(p.page_visitors)} visitors pressed play
                        {rate !== null && <span className="tabular-nums"> ({pct(rate, 1)})</span>}
                    </span>
                    <span>
                        <span className="font-semibold tabular-nums text-slate-800">{num(p.finished)}</span> watched to the end
                        {finishRate !== null && <span className="tabular-nums"> ({pct(finishRate)})</span>}
                    </span>
                    {p.plays > 0 && (
                        <span title="Phones, slow and data-saver connections get the 480p file">
                            <span className="tabular-nums">{pct(ratio(p.sd_plays, p.plays))}</span> on phone quality
                        </span>
                    )}
                </div>
            </div>
        </li>
    );
}

function PlayRow({ r, onOpen }: { r: VideoPlay; onOpen: () => void }) {
    const m = placeMeta(r.place);
    const s = r.session;
    const who = r.user_name || (s.user_id ? 'Signed-in user' : 'Visitor');
    return (
        <li>
            <button
                type="button"
                onClick={onOpen}
                title="Open this visit"
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
            >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <DeviceIcon device={s.device_type} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                        <span className="truncate text-[14px] font-semibold text-slate-900">{who}</span>
                        <Chip tone={r.place === 'ads_landing' ? 'amber' : r.place === 'dashboard' ? 'violet' : 'sky'}>{m.label}</Chip>
                        {r.finished && (
                            <Chip tone="emerald" title="Watched to the last frame">
                                <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Finished
                            </Chip>
                        )}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-slate-500">
                        {[place(s), s.channel, r.path && r.path !== '/' ? r.path : null].filter(Boolean).join(' · ')}
                    </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                    <time dateTime={r.ts} title={istDateTime(r.ts)} className="text-[12px] tabular-nums text-slate-500">
                        {isToday(r.ts) ? istTime(r.ts) : istDateTime(r.ts)}
                    </time>
                    <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
                </span>
            </button>
        </li>
    );
}

const isToday = (iso: string) => {
    const day = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return day(new Date(iso)) === day(new Date());
};

function SetupStep() {
    return (
        <section className={cn(CARD, 'p-5 sm:p-6')}>
            <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-sky-500/15 to-sky-500/5 text-sky-700 ring-1 ring-inset ring-sky-500/20">
                <Database className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-3 !text-[20px] font-bold tracking-[-0.02em] text-slate-900">One step to turn this on</h2>
            <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-slate-600">
                Supabase → SQL editor → paste
                <span className="font-mono text-[12.5px]"> supabase/migrations/20261015120000_analytics_video.sql </span>
                and run it. Then refresh this page. Plays are already being recorded, so the history shows up straight away.
            </p>
        </section>
    );
}
