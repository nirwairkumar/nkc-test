import { keepPreviousData, useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { insightsApi, type BreakdownRow, type Period, type Site } from './api';
import { Heatmap, SERIES, ShareBar } from './charts';
import { countryName, duration, languageName, num, pct } from './format';
import { CHANNEL_HELP, ChannelIcon, ErrorState, PathLabel } from './shared';
import { BarList, Card, CountryCode, Segmented, Skeleton } from './ui';

export default function TrafficTab({ period, site }: { period: Period; site: Site }) {
    const q = useQuery({
        queryKey: ['analytics', 'traffic', period, site],
        queryFn: () => insightsApi.traffic(period, site),
        placeholderData: keepPreviousData,
        staleTime: 60_000,
    });
    if (q.error && !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
    const d = q.data;

    return (
        <div className={cn('grid gap-4 lg:grid-cols-2', q.isPlaceholderData && 'opacity-60')}>
            <Sources d={d} />
            <Card title="How visits start" info="The kind of page a visit landed on.">
                {d ? <SessionList rows={d.landing} label={(r) => r.key} /> : <Skeleton className="h-48" />}
            </Card>
            <Pages d={d} showHost={site === 'all'} className="lg:col-span-2" />
            <Locations d={d} />
            <Technology d={d} />
            <Card title="New vs returning" subtitle="A returning visitor came before this period">
                {d ? (
                    <ShareBar parts={[
                        { key: 'new', label: 'New', value: d.visitor_types.find((r) => r.key === 'New')?.visitors ?? 0, color: SERIES[0] },
                        { key: 'ret', label: 'Returning', value: d.visitor_types.find((r) => r.key === 'Returning')?.visitors ?? 0, color: SERIES[1] },
                    ]} />
                ) : <Skeleton className="h-20" />}
            </Card>
            <Card title="Sites">
                {d ? <SessionList rows={d.hosts} label={(r) => r.key} /> : <Skeleton className="h-20" />}
            </Card>
            <Card title="When people visit" subtitle="Visits by weekday and hour, IST" className="lg:col-span-2">
                {d ? <Heatmap cells={d.heatmap} /> : <Skeleton className="h-44" />}
            </Card>
        </div>
    );
}

/** Session-level breakdown: visitors, engagement rate, engaged time per visit. */
function SessionList({ rows, label, empty }: { rows: BreakdownRow[]; label: (r: BreakdownRow) => React.ReactNode; empty?: string }) {
    return (
        <BarList
            initial={12}
            valueLabel="Visitors"
            extraLabels={['Engaged', 'Time']}
            empty={empty}
            rows={rows.map((r) => ({
                id: `${r.key}|${r.label || ''}`,
                label: label(r),
                title: String(r.key),
                value: r.visitors,
                display: num(r.visitors),
                extra: [pct(r.engagement_rate), duration(r.avg_engaged_ms)],
            }))}
        />
    );
}

function Sources({ d }: { d?: Awaited<ReturnType<typeof insightsApi.traffic>> }) {
    const [view, setView] = useState<'channels' | 'referrers' | 'campaigns'>('channels');
    const [utm, setUtm] = useState<'utm_sources' | 'utm_mediums' | 'utm_campaigns'>('utm_campaigns');
    return (
        <Card
            title="Sources"
            info={CHANNEL_HELP}
            action={
                <Segmented size="sm" value={view} onChange={setView} options={[
                    { value: 'channels', label: 'Channels' },
                    { value: 'referrers', label: 'Websites' },
                    { value: 'campaigns', label: 'Campaigns' },
                ]} />
            }
        >
            {!d ? <Skeleton className="h-56" /> : view === 'channels' ? (
                <SessionList rows={d.channels} label={(r) => <span className="flex items-center gap-2"><ChannelIcon channel={r.key} />{r.key}</span>} />
            ) : view === 'referrers' ? (
                <SessionList rows={d.referrers} label={(r) => r.key} empty="No referring websites in this period." />
            ) : (
                <div className="space-y-3">
                    <Segmented size="sm" value={utm} onChange={setUtm} options={[
                        { value: 'utm_campaigns', label: 'Campaign' },
                        { value: 'utm_sources', label: 'Source' },
                        { value: 'utm_mediums', label: 'Medium' },
                    ]} />
                    <SessionList rows={d[utm]} label={(r) => r.key}
                        empty="No tagged links yet. Add ?utm_source=…&utm_campaign=… to links you share in WhatsApp groups, ads and posters." />
                </div>
            )}
        </Card>
    );
}

function Pages({ d, showHost, className }: { d?: Awaited<ReturnType<typeof insightsApi.traffic>>; showHost: boolean; className?: string }) {
    const [view, setView] = useState<'pages' | 'entries' | 'exits'>('pages');
    return (
        <Card
            className={className}
            title="Pages"
            subtitle={view === 'pages' ? 'Visitors, views, active time on the page and how far people scrolled'
                : view === 'entries' ? 'The first page of each visit' : 'The last page before people left'}
            action={
                <Segmented size="sm" value={view} onChange={setView} options={[
                    { value: 'pages', label: 'All pages' },
                    { value: 'entries', label: 'Entry' },
                    { value: 'exits', label: 'Exit' },
                ]} />
            }
        >
            {!d ? <Skeleton className="h-72" /> : view === 'pages' ? (
                <BarList
                    initial={15}
                    valueLabel="Visitors"
                    extraLabels={['Views', 'Time', 'Scroll']}
                    rows={d.pages.map((p) => ({
                        id: `${p.host}${p.key}`,
                        label: <PathLabel path={p.key} host={p.host} showHost={showHost} />,
                        hint: p.label ? <span className="hidden md:inline">{p.label.split(' | ')[0]}</span> : undefined,
                        title: p.label || p.key,
                        value: p.visitors,
                        display: num(p.visitors),
                        extra: [num(p.pageviews), duration(p.avg_engaged_ms), p.avg_scroll_pct === null || p.avg_scroll_pct === undefined ? '—' : `${p.avg_scroll_pct}%`],
                    }))}
                />
            ) : (
                <SessionList rows={view === 'entries' ? d.entries : d.exits}
                    label={(r) => <PathLabel path={r.key} host={r.label} showHost={showHost} />} />
            )}
        </Card>
    );
}

function Locations({ d }: { d?: Awaited<ReturnType<typeof insightsApi.traffic>> }) {
    const [view, setView] = useState<'countries' | 'regions' | 'cities'>('countries');
    const noGeo = 'No state/city data yet — enable Cloudflare “Add visitor location headers”.';
    return (
        <Card title="Locations" subtitle="Resolved by Cloudflare — the IP address is never stored"
            action={<Segmented size="sm" value={view} onChange={setView} options={[
                { value: 'countries', label: 'Countries' },
                { value: 'regions', label: 'States' },
                { value: 'cities', label: 'Cities' },
            ]} />}>
            {!d ? <Skeleton className="h-56" /> : view === 'countries' ? (
                <SessionList rows={d.countries} label={(r) => <span className="flex items-center gap-2"><CountryCode code={r.key} />{countryName(r.key)}</span>} />
            ) : view === 'regions' ? (
                <SessionList rows={d.regions.filter((r) => r.key !== 'Unknown')} empty={noGeo}
                    label={(r) => <span className="flex items-center gap-2"><CountryCode code={r.label} />{r.key}</span>} />
            ) : (
                <SessionList rows={d.cities.filter((r) => r.key !== 'Unknown')} empty={noGeo}
                    label={(r) => <span className="flex min-w-0 items-baseline gap-1.5">{r.key}<span className="truncate text-[12px] text-slate-400">{r.label}</span></span>} />
            )}
        </Card>
    );
}

function Technology({ d }: { d?: Awaited<ReturnType<typeof insightsApi.traffic>> }) {
    const [view, setView] = useState<'browsers' | 'oses' | 'screens' | 'languages'>('browsers');
    return (
        <Card title="Technology"
            action={<Segmented size="sm" value={view} onChange={setView} options={[
                { value: 'browsers', label: 'Browser' },
                { value: 'oses', label: 'OS' },
                { value: 'screens', label: 'Screen' },
                { value: 'languages', label: 'Language' },
            ]} />}>
            {!d ? <Skeleton className="h-56" /> : (
                <div className="space-y-5">
                    <ShareBar parts={['mobile', 'desktop', 'tablet'].map((k, i) => ({
                        key: k, label: k[0].toUpperCase() + k.slice(1),
                        value: d.devices.find((x) => x.key === k)?.visitors ?? 0, color: SERIES[i],
                    }))} />
                    <SessionList rows={d[view]} label={(r) => (view === 'languages' ? `${languageName(r.key)} (${r.key})` : r.key)} />
                </div>
            )}
        </Card>
    );
}
