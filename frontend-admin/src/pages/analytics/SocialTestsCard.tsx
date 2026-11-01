/**
 * Analytics → Tests: "Test links on social media".
 * Which test links people opened from Instagram, Facebook and other apps, and whose tests they are.
 * The apps never tell us the post, story or DM a click came from, so test + educator is the
 * closest we can get; open that educator's profile in the app to see the post itself.
 * SQL: supabase/migrations/20261101130000_analytics_social_tests.sql
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Facebook, Globe2, Instagram, Linkedin, MessageCircle, Send, Share2, Twitter, Youtube } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Nav } from './AnalyticsPanel';
import { insightsApi, NotInstalledError, type Period, type SocialTestRow } from './api';
import { num, pct, ratio, relative } from './format';
import { ErrorState } from './shared';
import { CARD, Chip, Empty, InfoTip, Segmented, Skeleton } from './ui';

const PLATFORM: Record<string, { icon: React.ElementType; tone: string }> = {
    Instagram: { icon: Instagram, tone: 'bg-pink-50 text-pink-600' },
    Facebook: { icon: Facebook, tone: 'bg-blue-50 text-blue-600' },
    WhatsApp: { icon: MessageCircle, tone: 'bg-emerald-50 text-emerald-600' },
    Telegram: { icon: Send, tone: 'bg-sky-50 text-sky-600' },
    YouTube: { icon: Youtube, tone: 'bg-rose-50 text-rose-600' },
    X: { icon: Twitter, tone: 'bg-slate-100 text-slate-700' },
    LinkedIn: { icon: Linkedin, tone: 'bg-sky-50 text-sky-700' },
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const HELP =
    'Instagram and Facebook only tell us a visit came from their app, never which post, story or DM. ' +
    'So this shows the test link that was opened and whose test it is — open that educator’s profile to see the post. ' +
    '“In the app” = opened in the app’s own browser (story link, bio link, DM or post). ' +
    '“Re-shared” = the app tagged the link because someone shared it on. ' +
    'WhatsApp hides where clicks come from, so it only appears for links tagged ?utm_source=whatsapp. Meta ad clicks are not counted here.';

function PlatformIcon({ platform, className = 'h-8 w-8' }: { platform: string; className?: string }) {
    const p = PLATFORM[platform];
    const Icon = p?.icon || Globe2;
    return (
        <span className={cn('flex shrink-0 items-center justify-center rounded-[10px]', p?.tone || 'bg-slate-100 text-slate-500', className)} title={platform}>
            <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
    );
}

const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });

function dateSpan(r: SocialTestRow): string {
    const a = shortDate(r.first_seen), b = shortDate(r.last_seen);
    return a === b ? a : `${a} – ${b}`;
}

/** "Mostly Sundays" when one weekday brings at least 60% of a test's social visitors. */
function weekdayHint(weekdays: number[] | null | undefined): string | null {
    if (!weekdays?.length) return null;
    const total = weekdays.reduce((a, b) => a + b, 0);
    if (total < 5) return null;
    const top = Math.max(...weekdays);
    return top / total >= 0.6 ? `mostly ${DAYS[weekdays.indexOf(top)]}s` : null;
}

interface EducatorRow {
    key: string;
    creator_id: string | null;
    name: string;
    visitors: number;
    tests: number;
    platforms: string[];
    last_seen: string;
    weekdays: number[];
}

export default function SocialTestsCard({ period, nav }: { period: Period; nav: Nav }) {
    const q = useQuery({
        queryKey: ['analytics', 'social-tests', period],
        queryFn: () => insightsApi.socialTests(period),
        placeholderData: keepPreviousData,
        staleTime: 60_000,
        retry: (n, e) => !(e instanceof NotInstalledError) && n < 1,
    });
    const [view, setView] = useState<'tests' | 'educators'>('tests');
    const [platform, setPlatform] = useState('all');
    const [showAll, setShowAll] = useState(false);

    const d = q.data;
    const platforms = useMemo(() => (d?.platforms ?? []).filter((p) => p.test_visitors > 0), [d]);
    const active = platform === 'all' || platforms.some((p) => p.key === platform) ? platform : 'all';
    const rows = useMemo(() => (d?.tests ?? []).filter((r) => active === 'all' || r.platform === active), [d, active]);

    const educators = useMemo<EducatorRow[]>(() => {
        const map = new Map<string, EducatorRow>();
        const seen = new Set<string>(); // one test opened from two platforms is still one test
        for (const r of rows) {
            const key = r.creator_id || (r.deleted ? 'deleted' : 'unknown');
            const e = map.get(key) ?? {
                key, creator_id: r.creator_id,
                name: r.creator_name?.trim() || (r.deleted ? 'Deleted tests' : 'Unknown educator'),
                visitors: 0, tests: 0, platforms: [], last_seen: r.last_seen, weekdays: [0, 0, 0, 0, 0, 0, 0],
            };
            // A visitor can open two tests of the same educator; summing is close enough for ranking.
            e.visitors += r.visitors;
            const testKey = `${key}|${r.test_id || r.path}`;
            if (!seen.has(testKey)) { seen.add(testKey); e.tests += 1; }
            if (!e.platforms.includes(r.platform)) e.platforms.push(r.platform);
            if (r.last_seen > e.last_seen) e.last_seen = r.last_seen;
            (r.weekdays || []).forEach((v, i) => { e.weekdays[i] += v; });
            map.set(key, e);
        }
        return [...map.values()].sort((a, b) => b.visitors - a.visitors);
    }, [rows]);

    if (q.error instanceof NotInstalledError) {
        return (
            <section className={cn(CARD, 'p-4 sm:p-5')}>
                <h3 className="text-[15px] font-semibold text-slate-900">Test links on social media</h3>
                <p className="mt-1 text-[13px] text-slate-500">
                    Needs one SQL step: run <span className="font-mono text-[12px]">20261101130000_analytics_social_tests.sql</span> in Supabase.
                </p>
            </section>
        );
    }
    if (q.error && !d) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

    const list = view === 'tests' ? rows : educators;
    const visible = showAll ? list : list.slice(0, 10);
    const t = d?.totals;

    return (
        <section className={cn(CARD, 'min-w-0', q.isPlaceholderData && 'opacity-60')}>
            <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5">
                <div className="min-w-0">
                    <h3 className="flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
                        Test links on social media <InfoTip text={HELP} />
                    </h3>
                    <p className="mt-0.5 text-[13px] text-slate-500">Which tests people opened from Instagram, Facebook and other apps, and whose they are</p>
                </div>
                <Segmented size="sm" value={view} onChange={(v) => { setView(v); setShowAll(false); }} ariaLabel="Group by" options={[
                    { value: 'tests', label: 'Tests' },
                    { value: 'educators', label: 'Educators' },
                ]} />
            </header>

            <div className="px-4 pb-4 pt-3 sm:px-5">
                {!d ? <Skeleton className="h-64" /> : !d.tests.length ? (
                    <Empty icon={Share2} title="No test links opened from social apps">
                        Nobody opened a test link from Instagram, Facebook or another social app in this period.
                    </Empty>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            {platforms.length > 1 ? (
                                <Segmented size="sm" value={active} onChange={(v) => { setPlatform(v); setShowAll(false); }} ariaLabel="Platform" options={[
                                    { value: 'all', label: 'All' },
                                    ...platforms.map((p) => ({ value: p.key, label: <span className="tabular-nums">{p.key} {num(p.test_visitors)}</span> })),
                                ]} />
                            ) : <span />}
                            {t && (
                                <p className="text-[12px] text-slate-500">
                                    {num(t.visitors)} visitors · {num(t.tests)} tests · {num(t.educators)} educators
                                    {t.visitors ? ` · ${pct(ratio(t.in_app, t.visitors))} opened in the app` : ''}
                                </p>
                            )}
                        </div>

                        <ul className="mt-3 divide-y divide-slate-100">
                            {view === 'tests'
                                ? (visible as SocialTestRow[]).map((r) => <TestItem key={`${r.platform}|${r.test_id || r.path}`} r={r} nav={nav} />)
                                : (visible as EducatorRow[]).map((e) => <EducatorItem key={e.key} e={e} nav={nav} />)}
                        </ul>
                        {list.length > 10 && (
                            <button type="button" onClick={() => setShowAll((v) => !v)}
                                className="mt-1 w-full rounded-lg py-2 text-[13px] font-semibold text-sky-700 transition-colors hover:bg-sky-50">
                                {showAll ? 'Show fewer' : `Show all ${list.length}`}
                            </button>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}

function CreatorLink({ id, name, nav }: { id: string | null; name: string; nav: Nav }) {
    if (!id) return <span>{name}</span>;
    return (
        <button type="button" onClick={() => nav.openPerson({ user: id })}
            className="font-medium text-sky-700 hover:text-sky-800 hover:underline">
            {name}
        </button>
    );
}

function TestItem({ r, nav }: { r: SocialTestRow; nav: Nav }) {
    const share = ratio(r.visitors, Math.max(r.all_viewers, r.visitors));
    const hint = weekdayHint(r.weekdays);
    const facts = [
        dateSpan(r),
        hint,
        r.in_app ? `${num(r.in_app)} in the app` : null,
        r.reshared ? `${num(r.reshared)} re-shared` : null,
    ].filter(Boolean) as string[];
    return (
        <li className="flex items-center gap-3 py-2.5">
            <PlatformIcon platform={r.platform} />
            <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[13.5px] font-medium text-slate-900" title={r.title || r.path}>{r.title?.trim() || r.path}</span>
                    {r.deleted && <Chip title="This test has since been deleted">Deleted</Chip>}
                    {r.is_team && <Chip tone="violet" title="Created by your team">Team</Chip>}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-slate-500">
                    {r.creator_name?.trim()
                        ? <CreatorLink id={r.creator_id} name={r.creator_name.trim()} nav={nav} />
                        : <span>{r.deleted ? 'Creator unknown' : 'Unknown educator'}</span>}
                    {facts.map((f) => <span key={f}> · {f}</span>)}
                </p>
            </div>
            <div className="shrink-0 text-right">
                <p className="text-[15px] font-semibold tabular-nums text-slate-900">{num(r.visitors)}</p>
                <p className="text-[11px] text-slate-500" title={`${num(r.all_viewers)} people opened this test from anywhere in this period`}>
                    {share !== null && share < 99.5 ? `${pct(share)} of viewers` : 'all viewers'}
                </p>
            </div>
        </li>
    );
}

function EducatorItem({ e, nav }: { e: EducatorRow; nav: Nav }) {
    const hint = weekdayHint(e.weekdays);
    return (
        <li className="flex items-center gap-3 py-2.5">
            <span className="flex shrink-0 -space-x-2">
                {e.platforms.slice(0, 3).map((p) => <PlatformIcon key={p} platform={p} className="h-8 w-8 ring-2 ring-white" />)}
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px]">
                    <CreatorLink id={e.creator_id} name={e.name} nav={nav} />
                </p>
                <p className="mt-0.5 truncate text-[12px] text-slate-500">
                    {num(e.tests)} {e.tests === 1 ? 'test' : 'tests'} · {e.platforms.join(', ')} · last {relative(e.last_seen)}
                    {hint ? ` · ${hint}` : ''}
                </p>
            </div>
            <div className="shrink-0 text-right">
                <p className="text-[15px] font-semibold tabular-nums text-slate-900">{num(e.visitors)}</p>
                <p className="text-[11px] text-slate-500">visitors</p>
            </div>
        </li>
    );
}
