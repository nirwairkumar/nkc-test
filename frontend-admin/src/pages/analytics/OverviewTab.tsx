import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronRight, History, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Nav } from './AnalyticsPanel';
import { insightsApi, type Overview, type Period, type SeriesPoint, type Site } from './api';
import { SERIES, ShareBar, TrendChart } from './charts';
import {
    change, compact, countryName, derive, duration, istDate, num, pct, PERIOD_LABEL, PREVIOUS_LABEL, relative,
} from './format';
import { CHANNEL_HELP, ChannelIcon, DEVICE_LABEL, ErrorState, PathLabel } from './shared';
import { BarList, Card, CountryCode, Segmented, StatTile, TileSkeletons, Skeleton, CARD } from './ui';

type Metric = 'visitors' | 'sessions' | 'pageviews' | 'engaged' | 'engagement' | 'signups' | 'submissions' | 'tests_created';

const METRICS: Record<Metric, { label: string; value: (p: SeriesPoint) => number; format: (v: number) => string; axis?: (v: number) => string }> = {
    visitors: { label: 'Visitors', value: (p) => p.visitors, format: num, axis: compact },
    sessions: { label: 'Visits', value: (p) => p.sessions, format: num, axis: compact },
    pageviews: { label: 'Page views', value: (p) => p.pageviews, format: num, axis: compact },
    engaged: { label: 'Engaged time per visit', value: (p) => p.avg_engaged_ms, format: duration },
    engagement: {
        label: 'Engagement rate',
        value: (p) => (p.sessions ? (p.engaged_sessions / p.sessions) * 100 : 0),
        format: (v) => `${Math.round(v)}%`,
    },
    signups: { label: 'Sign-ups', value: (p) => p.signups, format: num },
    submissions: { label: 'Tests taken', value: (p) => p.submissions, format: num },
    tests_created: { label: 'Tests created', value: (p) => p.tests_created, format: num },
};

export default function OverviewTab({ period, site, nav, onLegacy }: { period: Period; site: Site; nav: Nav; onLegacy: () => void }) {
    const [metric, setMetric] = useState<Metric>('visitors');
    const q = useQuery({
        queryKey: ['analytics', 'overview', period, site],
        queryFn: () => insightsApi.overview(period, site),
        placeholderData: keepPreviousData,
        staleTime: 60_000,
    });

    if (q.error && !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
    const d = q.data;

    return (
        <div className={cn('space-y-4 transition-opacity', q.isPlaceholderData && 'opacity-60')}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {d ? <Tiles d={d} period={period} metric={metric} setMetric={setMetric} /> : <TileSkeletons count={8} />}
            </div>

            <Card
                title={METRICS[metric].label}
                subtitle={`${PERIOD_LABEL[period][0].toUpperCase()}${PERIOD_LABEL[period].slice(1)}, compared with ${PREVIOUS_LABEL[period]}`}
            >
                {d ? (
                    <TrendChart
                        points={d.series.map((p) => ({ t: p.t, v: METRICS[metric].value(p) }))}
                        previous={d.prev_series?.map((p) => ({ t: p.t, v: METRICS[metric].value(p) }))}
                        bucket={d.range.bucket}
                        format={METRICS[metric].format}
                        axisFormat={METRICS[metric].axis}
                        metricLabel={METRICS[metric].label.toLowerCase()}
                    />
                ) : <Skeleton className="h-[260px]" />}
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Top pages" subtitle="Visitors · average active time on the page" action={<MoreLink onClick={() => nav.goTo('traffic')} />}>
                    {d ? (
                        <BarList
                            valueLabel="Visitors"
                            extraLabels={['Time']}
                            rows={d.pages.map((p) => ({
                                id: `${p.host}${p.key}`,
                                label: <PathLabel path={p.key} host={p.host} showHost={site === 'all'} />,
                                title: p.label || p.key,
                                value: p.visitors,
                                display: num(p.visitors),
                                extra: [duration(p.avg_engaged_ms)],
                            }))}
                        />
                    ) : <Skeleton className="h-56" />}
                </Card>
                <SourcesCard d={d} />
                <LocationsCard d={d} />
                <div className="space-y-4">
                    <Card title="Devices">
                        {d ? (
                            <ShareBar parts={['mobile', 'desktop', 'tablet'].map((k, i) => ({
                                key: k,
                                label: DEVICE_LABEL[k],
                                value: d.devices.find((x) => x.key === k)?.visitors ?? 0,
                                color: SERIES[i],
                            }))} />
                        ) : <Skeleton className="h-20" />}
                    </Card>
                    <Card title="How visits start" info="The kind of page a visit landed on. Test links are shared tests (/test, /live) — the product spreading itself.">
                        {d ? (
                            <BarList valueLabel="Visitors" extraLabels={['Engaged']}
                                rows={d.landing.map((r) => ({
                                    id: r.key, label: r.key, value: r.visitors, display: num(r.visitors),
                                    extra: [pct(r.engagement_rate)],
                                }))} />
                        ) : <Skeleton className="h-32" />}
                    </Card>
                </div>
            </div>

            <DataQuality onLegacy={onLegacy} />
        </div>
    );
}

function Tiles({ d, period, metric, setMetric }: { d: Overview; period: Period; metric: Metric; setMetric: (m: Metric) => void }) {
    const s = d.summary, p = d.previous;
    const cur = derive(s), prev = derive(p);
    const vs = `vs ${PREVIOUS_LABEL[period]}`;
    const tile = (m: Metric) => ({ selected: metric === m, onClick: () => setMetric(m), deltaTitle: vs });
    return (
        <>
            <StatTile label="Visitors" value={compact(s.visitors)} delta={change(s.visitors, p.visitors)} {...tile('visitors')}
                sub={`${num(s.new_visitors)} new`} info="Unique browsers (random first-party ID, not a fingerprint). Bots and your team are excluded." />
            <StatTile label="Visits" value={compact(s.sessions)} delta={change(s.sessions, p.sessions)} {...tile('sessions')}
                sub={`${cur.viewsPerVisit.toFixed(1)} pages each`} info="A visit ends after 30 minutes without activity. All tabs and TestoZa sites share one visit." />
            <StatTile label="Page views" value={compact(s.pageviews)} delta={change(s.pageviews, p.pageviews)} {...tile('pageviews')} />
            <StatTile label="Engaged time" value={duration(cur.avgEngagedMs)} delta={change(cur.avgEngagedMs, prev.avgEngagedMs)} {...tile('engaged')}
                sub="per visit" info="Time the page was on screen and the person was active (stops after 10 idle minutes) — measured, not estimated." />
            <StatTile label="Engagement rate" value={pct(cur.engagementRate)} delta={cur.engagementRate !== null && prev.engagementRate !== null ? cur.engagementRate - prev.engagementRate : null}
                {...tile('engagement')} deltaUnit=" pts" sub={cur.bounceRate !== null ? `bounce ${pct(cur.bounceRate)}` : undefined}
                info="Visits with 10+ seconds of active time, 2+ pages or an action (GA4 definition). Change shown in percentage points." />
            <StatTile label="Sign-ups" value={num(s.signups)} delta={change(s.signups, p.signups)} {...tile('signups')}
                sub={s.new_visitors ? `${pct((s.signups / s.new_visitors) * 100, 1)} of new visitors` : undefined} />
            <StatTile label="Tests taken" value={num(s.submissions)} delta={change(s.submissions, p.submissions)} {...tile('submissions')}
                sub={`${num(s.guest_submissions)} by guests`} info="North Star. Submissions by students — excluding a creator taking their own test and your team." />
            <StatTile label="Tests created" value={num(s.tests_created)} delta={change(s.tests_created, p.tests_created)} {...tile('tests_created')}
                sub="by educators" />
        </>
    );
}

function SourcesCard({ d }: { d?: Overview }) {
    const [view, setView] = useState<'channels' | 'referrers'>('channels');
    const rows = view === 'channels' ? d?.channels : d?.referrers;
    return (
        <Card title="Where visitors come from" info={CHANNEL_HELP}
            action={<Segmented size="sm" value={view} onChange={setView} options={[{ value: 'channels', label: 'Channels' }, { value: 'referrers', label: 'Websites' }]} />}>
            {rows ? (
                <BarList valueLabel="Visitors" extraLabels={['Engaged']}
                    empty={view === 'referrers' ? 'No referring websites yet — most visits are direct.' : undefined}
                    rows={rows.map((r) => ({
                        id: r.key,
                        label: view === 'channels'
                            ? <span className="flex items-center gap-2"><ChannelIcon channel={r.key} />{r.key}</span>
                            : r.key,
                        value: r.visitors,
                        display: num(r.visitors),
                        extra: [pct(r.engagement_rate)],
                    }))} />
            ) : <Skeleton className="h-56" />}
        </Card>
    );
}

function LocationsCard({ d }: { d?: Overview }) {
    const [view, setView] = useState<'countries' | 'regions'>('countries');
    return (
        <Card title="Locations" subtitle="From Cloudflare — no IP address is stored"
            action={<Segmented size="sm" value={view} onChange={setView} options={[{ value: 'countries', label: 'Countries' }, { value: 'regions', label: 'States' }]} />}>
            {d ? (
                <BarList valueLabel="Visitors"
                    empty={view === 'regions' ? 'No state data yet — turn on “Add visitor location headers” in Cloudflare.' : undefined}
                    rows={(view === 'countries' ? d.countries : d.regions).map((r) => ({
                        id: `${r.key}${r.label || ''}`,
                        label: view === 'countries'
                            ? <span className="flex items-center gap-2"><CountryCode code={r.key} />{countryName(r.key)}</span>
                            : <span className="flex items-center gap-2"><CountryCode code={r.label} />{r.key}</span>,
                        value: r.visitors,
                        display: num(r.visitors),
                    }))} />
            ) : <Skeleton className="h-56" />}
        </Card>
    );
}

function MoreLink({ onClick }: { onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-sky-700 hover:text-sky-800">
            All <ChevronRight className="h-3.5 w-3.5" />
        </button>
    );
}

function DataQuality({ onLegacy }: { onLegacy: () => void }) {
    const { data } = useQuery({ queryKey: ['analytics', 'health'], queryFn: insightsApi.health, staleTime: 120_000 });
    if (!data) return null;
    return (
        <section className={cn(CARD, 'p-4 sm:p-5')}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                        <ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <div>
                        <h3 className="text-[15px] font-semibold text-slate-900">Data quality</h3>
                        <p className="text-[13px] text-slate-500">
                            {data.tracking_since ? `Tracking since ${istDate(data.tracking_since)} · last event ${relative(data.last_event_at)}` : 'Waiting for the first visit…'}
                        </p>
                    </div>
                </div>
                <button type="button" onClick={onLegacy} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-200">
                    <History className="h-3.5 w-3.5" /> Legacy data ({compact(data.legacy.page_views)} views)
                </button>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Quality label="Bot visits filtered" value={num(data.bot_sessions_7d)} hint="last 7 days" />
                <Quality label="Team visits filtered" value={num(data.internal_sessions_7d)} hint="admins + opted-out devices" />
                <Quality label="City known" value={pct(data.city_coverage_7d)}
                    hint={(data.city_coverage_7d ?? 0) < 50 ? 'enable Cloudflare location headers' : 'of real visits'} warn={(data.city_coverage_7d ?? 100) < 50} />
                <Quality label="Time measured" value={pct(data.engagement_coverage_7d)} hint="page views with active time" />
            </dl>
        </section>
    );
}

function Quality({ label, value, hint, warn }: { label: string; value: React.ReactNode; hint: string; warn?: boolean }) {
    return (
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <dt className="text-[12px] text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-[18px] font-semibold text-slate-900">{value}</dd>
            <dd className={cn('text-[11px]', warn ? 'font-medium text-amber-700' : 'text-slate-400')}>{hint}</dd>
        </div>
    );
}

