/**
 * Admin → Analytics (v2). Trustworthy traffic, growth and test metrics.
 * Design + metric definitions: documentation/2026-09-26-analytics-v2.md
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Database, History, RefreshCw } from 'lucide-react';
import React, { Suspense, lazy, useState } from 'react';
import { cn } from '@/lib/utils';
import { insightsApi, NotInstalledError, type Period, type Site } from './api';
import { MiniBars } from './charts';
import { countryName, num } from './format';
import GrowthTab from './GrowthTab';
import OverviewTab from './OverviewTab';
import PeopleTab, { PersonSheet, SessionSheet, type SessionMeta } from './PeopleTab';
import { ChannelIcon, PathLabel, usePersisted } from './shared';
import TestsTab from './TestsTab';
import TrafficTab from './TrafficTab';
import { CARD, CountryCode, IosSheet, PILL_BTN, Segmented } from './ui';

const LegacyAnalyticsPanel = lazy(() => import('../AdminAnalyticsPanel'));

const TABS = ['overview', 'traffic', 'growth', 'tests', 'people'] as const;
type Tab = (typeof TABS)[number];
const PERIODS: readonly Period[] = ['today', 'yesterday', '7d', '30d', '90d', '12m'];
const SITES: readonly Site[] = ['all', 'main', 'pdf', 'blog'];

export interface Nav {
    openSession: (visit: SessionMeta) => void;
    openPerson: (p: { visitor?: string | null; user?: string | null }) => void;
    goTo: (tab: Tab) => void;
}

export default function AnalyticsPanel() {
    const [tab, setTab] = usePersisted<Tab>('tz_admin_analytics_tab', 'overview', TABS);
    const [period, setPeriod] = usePersisted<Period>('tz_admin_analytics_period', '7d', PERIODS);
    const [site, setSite] = usePersisted<Site>('tz_admin_analytics_site', 'all', SITES);
    const [legacy, setLegacy] = useState(false);
    const [liveOpen, setLiveOpen] = useState(false);
    const [session, setSession] = useState<SessionMeta | null>(null);
    const [person, setPerson] = useState<{ visitor?: string | null; user?: string | null } | null>(null);
    const qc = useQueryClient();

    const realtime = useQuery({
        queryKey: ['analytics', 'realtime', site],
        queryFn: () => insightsApi.realtime(site),
        refetchInterval: 30_000,
        retry: (n, e) => !(e instanceof NotInstalledError) && n < 1,
    });
    const refreshing = qc.isFetching({ queryKey: ['analytics'] }) > 0;

    const nav: Nav = {
        openSession: (visit) => { setPerson(null); setSession(visit); },
        openPerson: (p) => { setSession(null); setPerson(p); },
        goTo: (t) => setTab(t),
    };

    if (legacy) {
        return (
            <div className="space-y-4">
                <button type="button" onClick={() => setLegacy(false)} className={PILL_BTN}>
                    <ArrowLeft className="h-4 w-4" /> Back to Analytics
                </button>
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-[13px] text-amber-900 ring-1 ring-amber-600/20">
                    Legacy dashboard, kept for history (March–September 2026). Its visitor and time numbers are not reliable —
                    one device fingerprint merged many people, and stay times were estimated. Use it for rough history only.
                </div>
                <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-slate-200/60" />}>
                    <LegacyAnalyticsPanel />
                </Suspense>
            </div>
        );
    }

    const notInstalled = realtime.error instanceof NotInstalledError;
    const showSite = tab === 'overview' || tab === 'traffic' || tab === 'people';

    return (
        <div className="space-y-5 pb-10">
            {/* ── Large title ── */}
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Insights</p>
                    <h1 className="mt-1.5 !text-[28px] font-bold leading-[1.1] tracking-[-0.025em] text-slate-900 sm:!text-[34px]">Analytics</h1>
                    <p className="mt-2 hidden text-[15px] text-slate-600 sm:block">
                        Real people, real engagement, and how TestoZa is growing. Bots and team traffic excluded · times in IST.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {!notInstalled && (
                        <button type="button" onClick={() => setLiveOpen(true)} className={PILL_BTN} title="Visitors active in the last 5 minutes">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 motion-safe:animate-ping" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                            <span className="tabular-nums">{realtime.data ? num(realtime.data.online) : '–'}</span>
                            <span className="font-medium text-slate-500">online</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => qc.invalidateQueries({ queryKey: ['analytics'] })}
                        className={cn(PILL_BTN, 'w-9 justify-center px-0')}
                        title="Refresh"
                        aria-label="Refresh"
                        disabled={refreshing}
                    >
                        <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                    </button>
                </div>
            </header>

            {notInstalled ? (
                <SetupCard onLegacy={() => setLegacy(true)} />
            ) : (
                <>
                    {/* ── Filters: one row above everything they scope ── */}
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
                        {showSite && (
                            <Segmented<Site>
                                ariaLabel="Site"
                                value={site}
                                onChange={setSite}
                                options={[
                                    { value: 'all', label: 'All sites' },
                                    { value: 'main', label: 'TestoZa', title: 'testoza.com and app.testoza.com' },
                                    { value: 'pdf', label: 'PDF tools', title: 'pdf.testoza.com' },
                                    { value: 'blog', label: 'Blog', title: 'blog.testoza.com' },
                                ]}
                            />
                        )}
                    </div>

                    {/* ── Sections ── */}
                    <div className="-mx-1 overflow-x-auto px-1 pb-1">
                        <Segmented<Tab>
                            ariaLabel="Analytics sections"
                            value={tab}
                            onChange={setTab}
                            className="w-full sm:w-auto"
                            options={[
                                { value: 'overview', label: 'Overview' },
                                { value: 'traffic', label: 'Traffic' },
                                { value: 'growth', label: 'Growth' },
                                { value: 'tests', label: 'Tests' },
                                { value: 'people', label: 'People' },
                            ]}
                        />
                    </div>

                    {tab === 'overview' && <OverviewTab period={period} site={site} nav={nav} onLegacy={() => setLegacy(true)} />}
                    {tab === 'traffic' && <TrafficTab period={period} site={site} />}
                    {tab === 'growth' && <GrowthTab period={period} />}
                    {tab === 'tests' && <TestsTab period={period} />}
                    {tab === 'people' && <PeopleTab period={period} site={site} nav={nav} />}
                </>
            )}

            <IosSheet open={liveOpen} onOpenChange={setLiveOpen} title="Right now" subtitle="Visitors active in the last 5 minutes · refreshes every 30 s">
                <LiveView site={site} />
            </IosSheet>
            <SessionSheet meta={session} onClose={() => setSession(null)} nav={nav} />
            <PersonSheet who={person} onClose={() => setPerson(null)} nav={nav} />
        </div>
    );
}

function LiveView({ site }: { site: Site }) {
    const { data } = useQuery({ queryKey: ['analytics', 'realtime', site], queryFn: () => insightsApi.realtime(site), refetchInterval: 30_000 });
    if (!data) return <div className="h-40 animate-pulse rounded-2xl bg-slate-200/60" />;
    return (
        <div className="space-y-4">
            <div className={cn(CARD, 'p-4')}>
                <p className="text-[13px] font-medium text-slate-500">Online now</p>
                <p className="mt-1 text-[48px] font-semibold leading-none tracking-[-0.03em] text-slate-900">{num(data.online)}</p>
                <p className="mt-4 text-[12px] text-slate-500">Page views per minute, last 30 minutes</p>
                <div className="mt-1.5"><MiniBars values={data.minutes} /></div>
            </div>
            <LiveList title="On these pages" empty="Nobody is browsing right now."
                rows={data.pages.map((p) => ({ key: p.host + p.path, left: <PathLabel path={p.path} host={p.host} showHost />, sub: p.title, n: p.visitors }))} />
            <LiveList title="Came from" empty="—"
                rows={data.channels.map((c) => ({ key: c.key, left: <span className="flex items-center gap-2"><ChannelIcon channel={c.key} />{c.key}</span>, n: c.visitors }))} />
            <LiveList title="Where" empty="—"
                rows={data.countries.map((c) => ({ key: c.key, left: <span className="flex items-center gap-2"><CountryCode code={c.key} />{countryName(c.key)}</span>, n: c.visitors }))} />
        </div>
    );
}

function LiveList({ title, rows, empty }: { title: string; empty: string; rows: { key: string; left: React.ReactNode; sub?: string | null; n: number }[] }) {
    return (
        <div>
            <p className="mb-1.5 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400">{title}</p>
            <ul className={cn(CARD, 'divide-y divide-slate-100')}>
                {rows.length === 0 && <li className="px-4 py-3 text-[13px] text-slate-500">{empty}</li>}
                {rows.map((r) => (
                    <li key={r.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <span className="min-w-0 text-[13px] text-slate-800">
                            {r.left}
                            {r.sub && <span className="block truncate text-[12px] text-slate-400">{r.sub}</span>}
                        </span>
                        <span className="text-[13px] font-semibold tabular-nums text-slate-900">{r.n}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function SetupCard({ onLegacy }: { onLegacy: () => void }) {
    const steps = [
        { t: 'Run the database migration', d: 'Supabase → SQL editor → paste supabase/migrations/20260926120000_analytics_v2.sql and run it.' },
        { t: 'Turn on city-level location', d: 'Cloudflare → testoza.com → Rules → Transform Rules → Managed Transforms → “Add visitor location headers”.' },
        { t: 'Deploy', d: 'Backend first, then testoza.com, pdf.testoza.com and this admin app. Data starts flowing with the first visit.' },
        { t: 'Exclude your own devices', d: 'Sign in as admin on them, or open testoza.com/?tz_internal=1 once on each.' },
    ];
    return (
        <div className="space-y-4">
            <section className={cn(CARD, 'p-5 sm:p-6')}>
                <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-sky-500/15 to-sky-500/5 text-sky-700 ring-1 ring-inset ring-sky-500/20">
                    <Database className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mt-3 !text-[20px] font-bold tracking-[-0.02em] text-slate-900">Finish setting up Analytics</h2>
                <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-slate-600">
                    The new analytics tables aren’t in the database yet. Four steps, about ten minutes — details in
                    <span className="font-mono text-[12.5px]"> documentation/2026-09-26-analytics-v2.md</span>.
                </p>
                <ol className="mt-5 space-y-3">
                    {steps.map((s, i) => (
                        <li key={s.t} className="flex gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-[12px] font-bold text-white">{i + 1}</span>
                            <span>
                                <span className="block text-[14px] font-semibold text-slate-900">{s.t}</span>
                                <span className="block text-[13px] text-slate-500">{s.d}</span>
                            </span>
                        </li>
                    ))}
                </ol>
            </section>
            <button type="button" onClick={onLegacy} className={cn(CARD, 'flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50')}>
                <History className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <span className="flex-1 text-[14px] font-medium text-slate-800">Open the legacy dashboard meanwhile</span>
                <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </button>
        </div>
    );
}

