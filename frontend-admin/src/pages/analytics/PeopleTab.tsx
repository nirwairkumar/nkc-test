import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Bot, ChevronRight, Download, Search, UserRound, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Nav } from './AnalyticsPanel';
import { insightsApi, type Period, type PersonSession, type SessionRow, type Site, type Traffic } from './api';
import {
    cap, duration, initials, istDate, istDateTime, istTime, num, place, relative,
} from './format';
import { ChannelIcon, DeviceIcon, ErrorState, PathLabel } from './shared';
import { CARD, Chip, Empty, GroupedList, IosSheet, KeyValue, PILL_BTN, Segmented, Skeleton } from './ui';

export type SessionMeta = SessionRow | PersonSession;

export default function PeopleTab({ period, site, nav }: { period: Period; site: Site; nav: Nav }) {
    const [traffic, setTraffic] = useState<Traffic>('humans');
    const [input, setInput] = useState('');
    const [q, setQ] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setQ(input.trim()), 300);
        return () => clearTimeout(t);
    }, [input]);

    const query = useInfiniteQuery({
        queryKey: ['analytics', 'sessions', period, site, traffic, q],
        queryFn: ({ pageParam }) => insightsApi.sessions({ period, site, traffic, q, before: pageParam as string | null }),
        initialPageParam: null as string | null,
        getNextPageParam: (last) => last.next_before,
        placeholderData: keepPreviousData,
        staleTime: 30_000,
    });
    const rows = query.data?.pages.flatMap((p) => p.rows) ?? [];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <Segmented<Traffic> size="sm" value={traffic} onChange={setTraffic} ariaLabel="Traffic type" options={[
                    { value: 'humans', label: 'People' },
                    { value: 'internal', label: 'Team', title: 'Admins and devices opted out with ?tz_internal=1' },
                    { value: 'bots', label: 'Bots', title: 'Automated browsers that ran the site' },
                    { value: 'all', label: 'All' },
                ]} />
                <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                        type="search"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Name, email, city, page, source…"
                        aria-label="Search visits"
                        className="h-9 w-full rounded-xl border-transparent bg-slate-200/60 pl-9 pr-3 text-[14px] text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                </div>
            </div>

            {query.error && !query.data ? (
                <ErrorState error={query.error} onRetry={() => query.refetch()} />
            ) : !query.data ? (
                <div className={cn(CARD, 'space-y-3 p-4')}>{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : rows.length === 0 ? (
                <div className={CARD}>
                    <Empty icon={traffic === 'bots' ? Bot : Users} title={q ? 'No visits match your search' : 'No visits in this period'}>
                        {traffic === 'bots' ? 'Most crawlers never run JavaScript, so only automated browsers show up here.' : undefined}
                    </Empty>
                </div>
            ) : (
                <>
                    <GroupedList className={cn(query.isPlaceholderData && 'opacity-60')}>
                        {rows.map((r) => <VisitRow key={r.id} r={r} onClick={() => nav.openSession(r)} />)}
                    </GroupedList>
                    {query.hasNextPage && (
                        <div className="flex justify-center">
                            <button type="button" className={PILL_BTN} onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                                {query.isFetchingNextPage ? 'Loading…' : 'Show more visits'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function Avatar({ name, device, user }: { name?: string | null; device?: string | null; user: boolean }) {
    if (user) {
        return (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-[13px] font-bold text-white">
                {initials(name)}
            </span>
        );
    }
    return (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <DeviceIcon device={device} className="h-[18px] w-[18px]" />
        </span>
    );
}

function visitorName(r: { user_name?: string | null; user_id?: string | null; city?: string | null; region?: string | null; country_code?: string | null }) {
    if (r.user_name) return r.user_name;
    if (r.user_id) return 'Signed-in user';
    const where = place(r);
    return where === 'Unknown' ? 'Visitor' : `Visitor from ${where}`;
}

function VisitRow({ r, onClick }: { r: SessionRow; onClick: () => void }) {
    const source = r.referrer_host || r.utm_source;
    return (
        <li>
            <button type="button" onClick={onClick} className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none">
                <Avatar name={r.user_name} device={r.device_type} user={!!(r.user_name || r.user_id)} />
                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-semibold text-slate-900">{visitorName(r)}</span>
                        {r.is_new_visitor && <Chip tone="emerald">New</Chip>}
                        {!r.is_new_visitor && r.visitor_sessions > 1 && <Chip title="Visits by this browser">{r.visitor_sessions} visits</Chip>}
                        {r.is_internal && <Chip tone="violet">Team</Chip>}
                        {r.is_bot && <Chip tone="amber" title={r.bot_reason || undefined}>Bot</Chip>}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-slate-500">
                        <span className="inline-flex items-center gap-1"><ChannelIcon channel={r.channel} className="h-3 w-3" />{source ? `${r.channel} · ${source}` : r.channel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1"><DeviceIcon device={r.device_type} className="h-3 w-3" />{[r.browser, r.os].filter(Boolean).join(' · ') || cap(r.device_type)}</span>
                        {(r.user_name || r.user_id) && (r.city || r.country_code) && <><span aria-hidden="true">·</span><span>{place(r)}</span></>}
                    </span>
                    <span className="mt-1 flex min-w-0 items-center gap-2 text-[12px] text-slate-600">
                        <PathLabel path={r.entry_path} host={r.host} showHost />
                        <span className="shrink-0 text-slate-400">
                            {r.pageviews > 1 ? `+${r.pageviews - 1} more page${r.pageviews > 2 ? 's' : ''}` : ''}
                        </span>
                    </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[12px] text-slate-500" title={istDateTime(r.started_at)}>{relative(r.started_at)}</span>
                    <span className={cn('text-[13px] font-semibold tabular-nums', r.engaged_ms > 0 ? 'text-slate-900' : 'text-slate-400')}>{duration(r.engaged_ms)}</span>
                    <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
                </span>
            </button>
        </li>
    );
}

// ── One visit ────────────────────────────────────────────────────────────────
export function SessionSheet({ meta, onClose, nav }: { meta: SessionMeta | null; onClose: () => void; nav: Nav }) {
    const [kept, setKept] = useState<SessionMeta | null>(meta);
    useEffect(() => { if (meta) setKept(meta); }, [meta]);
    const m = meta || kept;
    const { data, error } = useQuery({
        queryKey: ['analytics', 'session', m?.id],
        queryFn: () => insightsApi.session(m!.id),
        enabled: !!meta,
        staleTime: 30_000,
    });
    const row = m as SessionRow | null;
    const events = data?.events ?? [];
    const maxMs = Math.max(1, ...(data?.pages ?? []).map((p) => p.engaged_ms));

    return (
        <IosSheet
            open={!!meta}
            onOpenChange={(o) => !o && onClose()}
            title={row ? visitorName(row) : 'Visit'}
            subtitle={m ? `${istDateTime(m.started_at)} · ${place(m)}` : undefined}
        >
            {m && (
                <div className="space-y-4">
                    <GroupedList>
                        <KeyValue label="Came from">
                            <span className="inline-flex items-center gap-1.5"><ChannelIcon channel={m.channel} />{m.channel}{m.referrer_host ? ` · ${m.referrer_host}` : ''}</span>
                        </KeyValue>
                        {'utm_campaign' in m && (m.utm_campaign || m.utm_source) && (
                            <KeyValue label="Campaign">{[m.utm_source, m.utm_medium, m.utm_campaign].filter(Boolean).join(' / ')}</KeyValue>
                        )}
                        <KeyValue label="Landed on"><PathLabel path={m.entry_path} host={m.host} showHost /></KeyValue>
                        <KeyValue label="Active time">{duration(m.engaged_ms)} over {num(m.pageviews)} page{m.pageviews === 1 ? '' : 's'}</KeyValue>
                        <KeyValue label="Device">
                            <span className="inline-flex items-center gap-1.5"><DeviceIcon device={m.device_type} />{[cap(m.device_type), m.browser, m.os].filter(Boolean).join(' · ')}{'screen' in m && m.screen ? ` · ${m.screen}` : ''}</span>
                        </KeyValue>
                        <KeyValue label="Location">{place(m)}</KeyValue>
                        {'language' in m && m.language && <KeyValue label="Language">{m.language}</KeyValue>}
                    </GroupedList>

                    <div>
                        <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400">Journey</p>
                        {error ? <ErrorState error={error} /> : !data ? <Skeleton className="h-40" /> : (
                            <ol className={cn(CARD, 'relative px-4 py-3')}>
                                {data.pages.map((p, i) => {
                                    const ev = events.filter((e) => e.pageview_id === p.id);
                                    return (
                                        <li key={p.id} className="relative flex gap-3 pb-4 last:pb-1">
                                            {i < data.pages.length - 1 && <span className="absolute left-[11px] top-6 h-[calc(100%-18px)] w-px bg-slate-200" aria-hidden="true" />}
                                            <span className="relative z-10 mt-0.5 flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full bg-sky-50 text-[11px] font-bold text-sky-700 ring-1 ring-sky-600/20">
                                                {i + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <PathLabel path={p.path} host={p.host} showHost />
                                                    <span className="shrink-0 text-[11px] text-slate-400">{istTime(p.ts)}</span>
                                                </div>
                                                {p.title && <p className="truncate text-[12px] text-slate-500">{p.title}</p>}
                                                <div className="mt-1.5 flex items-center gap-2">
                                                    <span className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                                                        <span className="block h-full rounded-full bg-[#2a78d6]" style={{ width: `${(p.engaged_ms / maxMs) * 100}%` }} />
                                                    </span>
                                                    <span className="text-[12px] font-semibold tabular-nums text-slate-700">{duration(p.engaged_ms)}</span>
                                                    {p.scroll_pct !== null && <span className="text-[11px] text-slate-400">· scrolled {p.scroll_pct}%</span>}
                                                </div>
                                                {ev.map((e) => (
                                                    <p key={e.id} className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 text-[12px] font-medium text-emerald-800">
                                                        <Download className="h-3 w-3" aria-hidden="true" />
                                                        {eventLabel(e.name, e.props)}
                                                    </p>
                                                ))}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </div>

                    <button type="button" onClick={() => nav.openPerson({ visitor: row?.visitor_id, user: m && 'user_id' in m ? (m as SessionRow).user_id : null })}
                        className={cn(CARD, 'flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50')} hidden={!row?.visitor_id}>
                        <UserRound className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        <span className="flex-1 text-[14px] font-medium text-slate-800">All visits by this person</span>
                        <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </button>
                </div>
            )}
        </IosSheet>
    );
}

function eventLabel(name: string, props: Record<string, unknown>): string {
    if (name === 'pdf_export') {
        const pages = props?.pages ? ` (${props.pages} pages)` : '';
        return `Downloaded a PDF — ${String(props?.tool || 'PDF tool')}${pages}`;
    }
    return name.replace(/_/g, ' ');
}

// ── One person ───────────────────────────────────────────────────────────────
export function PersonSheet({ who, onClose, nav }: { who: { visitor?: string | null; user?: string | null } | null; onClose: () => void; nav: Nav }) {
    const [kept, setKept] = useState(who);
    useEffect(() => { if (who) setKept(who); }, [who]);
    const w = who || kept;
    const { data, error } = useQuery({
        queryKey: ['analytics', 'person', w?.visitor, w?.user],
        queryFn: () => insightsApi.person(w!),
        enabled: !!who,
        staleTime: 30_000,
    });
    const u = data?.user;
    const lastDevice = data?.devices[0];
    const title = u ? (u.full_name || u.email || 'Signed-in user') : lastDevice ? visitorName(lastDevice) : 'Visitor';

    return (
        <IosSheet open={!!who} onOpenChange={(o) => !o && onClose()} title={title}
            subtitle={u ? [u.email, u.designation].filter(Boolean).join(' · ') : 'Anonymous — no account linked to this browser'}>
            {error ? <ErrorState error={error} /> : !data ? <Skeleton className="h-64" /> : (
                <div className="space-y-4">
                    {u && (
                        <section className={cn(CARD, 'p-4')}>
                            <div className="flex items-center gap-3">
                                <Avatar name={u.full_name} user />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[15px] font-semibold text-slate-900">{u.full_name || 'No name'}</p>
                                    <p className="text-[12px] text-slate-500">Joined {istDate(u.created_at)}</p>
                                </div>
                                {u.is_team && <Chip tone="violet">Team</Chip>}
                                {u.is_premium && <Chip tone="amber">Premium</Chip>}
                            </div>
                            <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <Stat label="Tests created" value={u.tests_created} />
                                <Stat label="Taken by students" value={u.submissions_received} />
                                <Stat label="Tests taken" value={u.tests_taken} />
                                <Stat label="AI generations" value={u.ai_generations} />
                            </dl>
                        </section>
                    )}

                    <GroupedList>
                        {data.first_touch && (
                            <>
                                <KeyValue label="First seen">{istDateTime(data.first_touch.first_seen_at)}</KeyValue>
                                <KeyValue label="First came from">
                                    <span className="inline-flex items-center gap-1.5">
                                        <ChannelIcon channel={data.first_touch.channel || 'Direct'} />
                                        {data.first_touch.channel}{data.first_touch.referrer_host ? ` · ${data.first_touch.referrer_host}` : ''}
                                    </span>
                                </KeyValue>
                                <KeyValue label="First page">
                                    {data.first_touch.landing_path ? <PathLabel path={data.first_touch.landing_path} host={data.first_touch.host} showHost /> : '—'}
                                </KeyValue>
                            </>
                        )}
                        <KeyValue label="Visits">{num(data.totals.sessions)} · {num(data.totals.pageviews)} pages · {duration(data.totals.engaged_ms)} active</KeyValue>
                        <KeyValue label="Last seen">{relative(data.totals.last_seen_at)}</KeyValue>
                        {!data.first_touch && <KeyValue label="Tracking">No visits recorded since analytics v2 started</KeyValue>}
                    </GroupedList>

                    {data.devices.length > 0 && (
                        <div>
                            <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400">Devices</p>
                            <GroupedList>
                                {data.devices.map((dv) => (
                                    <li key={dv.id} className="flex items-center gap-3 px-4 py-2.5">
                                        <DeviceIcon device={dv.device_type} className="h-4 w-4 text-slate-400" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[13px] font-medium text-slate-800">{[dv.browser, dv.os].filter(Boolean).join(' · ') || cap(dv.device_type)}</span>
                                            <span className="block text-[12px] text-slate-500">{place(dv)} · {num(dv.sessions_count)} visits</span>
                                        </span>
                                        <span className="text-[12px] text-slate-500">{relative(dv.last_seen_at)}</span>
                                    </li>
                                ))}
                            </GroupedList>
                        </div>
                    )}

                    {u && u.recent_tests.length > 0 && (
                        <div>
                            <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400">Their tests</p>
                            <GroupedList>
                                {u.recent_tests.map((t) => (
                                    <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                        <span className="min-w-0">
                                            <span className="block truncate text-[13px] font-medium text-slate-800">{t.title}</span>
                                            <span className="block text-[12px] text-slate-500">{istDate(t.created_at)}{t.is_public ? '' : ' · private'}</span>
                                        </span>
                                        <span className="shrink-0 text-right">
                                            <span className="block text-[14px] font-semibold tabular-nums text-slate-900">{num(t.submissions)}</span>
                                            <span className="block text-[11px] text-slate-400">taken</span>
                                        </span>
                                    </li>
                                ))}
                            </GroupedList>
                        </div>
                    )}

                    {data.sessions.length > 0 && (
                        <div>
                            <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400">Visits</p>
                            <GroupedList>
                                {data.sessions.map((s) => (
                                    <li key={s.id}>
                                        <button type="button" onClick={() => nav.openSession({ ...s, visitor_id: w?.visitor || '', user_id: u?.id || null } as any)}
                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50">
                                            <ChannelIcon channel={s.channel} className="h-4 w-4 text-slate-400" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[13px] font-medium text-slate-800"><PathLabel path={s.entry_path} host={s.host} showHost /></span>
                                                <span className="block text-[12px] text-slate-500">
                                                    {istDateTime(s.started_at)} · {s.channel}{s.referrer_host ? ` · ${s.referrer_host}` : ''} · {num(s.pageviews)} pages
                                                </span>
                                            </span>
                                            <span className="text-[13px] font-semibold tabular-nums text-slate-900">{duration(s.engaged_ms)}</span>
                                        </button>
                                    </li>
                                ))}
                            </GroupedList>
                        </div>
                    )}
                </div>
            )}
        </IosSheet>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl bg-slate-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">{label}</dt>
            <dd className="text-[18px] font-semibold tabular-nums text-slate-900">{num(value)}</dd>
        </div>
    );
}

