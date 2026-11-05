/**
 * Email → Automatic: the emails TestoZa sends by itself (welcome, test created, live,
 * submissions, exam ended). Read only on the team site: counts, on/off state and a preview.
 * Switching them on or off stays with the owner (admin → Email → Automatic).
 * The latest-sends list (masked addresses) needs "Write and send emails".
 */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { CheckCircle2, FilePlus2, Flag, Inbox, MinusCircle, Radio, Search, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Button, CARD, Chip, Empty, ErrorBox, Skeleton, cx } from '@/components/ui';
import { dateTime, num, relative } from '@/lib/format';
import { emailApi, errorText, type AutoEmail, type AutoKind, type AutoLogRow, type AutoOverview } from './api';
import { DeviceSwitch, InboxRow, InfoTip, INPUT, MailFrame, Segmented, Sheet, useDevice } from './kit';
import { AUTO_ORDER } from './model';

const ICON: Record<AutoKind, { icon: React.ElementType; bg: string }> = {
    welcome: { icon: Sparkles, bg: 'bg-violet-500' },
    test_created: { icon: FilePlus2, bg: 'bg-sky-500' },
    test_live: { icon: Radio, bg: 'bg-emerald-500' },
    results: { icon: Inbox, bg: 'bg-indigo-500' },
    test_ended: { icon: Flag, bg: 'bg-amber-500' },
};

export default function AutomaticTab({ canSend }: { canSend: boolean }) {
    const q = useQuery({ queryKey: ['email', 'auto'], queryFn: emailApi.auto, staleTime: 30_000, refetchInterval: 60_000 });
    const [preview, setPreview] = useState<AutoEmail | null>(null);

    const d = q.data;
    const kinds = useMemo(
        () => (d?.kinds ?? []).slice().sort((a, b) => AUTO_ORDER.indexOf(a.key) - AUTO_ORDER.indexOf(b.key)),
        [d?.kinds],
    );
    const sum = (f: 'today' | 'week' | 'month' | 'failed' | 'clicked') => kinds.reduce((a, k) => a + (k[f] ?? 0), 0);

    if (q.error && !d) return <ErrorBox message={errorText(q.error, 'Couldn’t load the automatic emails.')} onRetry={() => q.refetch()} />;

    return (
        <div className="space-y-6">
            <Transport t={d?.transport} />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {!d ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[92px]" />) : (
                    <>
                        <Tile label="Sent today" value={num(sum('today'))} sub="India time" />
                        <Tile label="Last 7 days" value={num(sum('week'))} />
                        <Tile label="Last 30 days" value={num(sum('month'))}
                            sub={sum('failed') ? `${num(sum('failed'))} failed` : 'None failed'} warn={sum('failed') > 0} />
                        <Tile label="Clicked (30 days)" value={num(sum('clicked'))}
                            info="People who opened TestoZa from a link in an automatic email in the last 30 days." />
                    </>
                )}
            </div>

            <section>
                <div className="mb-3 px-1">
                    <h2 className="text-[20px] font-bold tracking-[-0.02em] text-slate-900">Automatic emails</h2>
                    <p className="mt-0.5 text-[13px] text-slate-500">
                        Sent by TestoZa the moment something happens. They’re about the reader’s own account and exams, so the weekly
                        limit for broadcasts doesn’t apply. Only the owner switches them on or off.
                    </p>
                </div>
                <ul className={cx(CARD, 'divide-y divide-slate-100 overflow-hidden')}>
                    {!d ? Array.from({ length: 5 }, (_, i) => (
                        <li key={i} className="flex gap-3 px-4 py-4"><Skeleton className="h-9 w-9 rounded-xl" /><Skeleton className="h-14 flex-1" /></li>
                    )) : kinds.map((k) => <KindRow key={k.key} k={k} onPreview={() => setPreview(k)} />)}
                </ul>
            </section>

            {canSend && <RecentLog kinds={kinds} installed={d?.installed ?? true} />}

            <PreviewSheet k={preview} onClose={() => setPreview(null)} />
        </div>
    );
}

function Transport({ t }: { t?: AutoOverview['transport'] }) {
    if (!t) return <Skeleton className="h-[72px]" />;
    return (
        <div className={cx(CARD, 'flex items-start gap-3 px-4 py-3.5')}>
            <span className={cx('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white', t.configured ? 'bg-emerald-500' : 'bg-amber-500')}>
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 text-[13px] leading-snug text-slate-500">
                <p className="text-[15px] font-semibold text-slate-900">{t.configured ? `Sending through ${t.service}` : 'Email isn’t connected'}</p>
                {t.configured && t.from_email && <p className="mt-0.5 truncate">From TestoZa &lt;{t.from_email}&gt; · replies go to support@testoza.com</p>}
                <p className="mt-0.5">
                    {t.bounce_reports ? 'Bounces and spam reports reach the never-email list by themselves.' : 'Bounce reports aren’t connected yet (owner’s job).'}
                </p>
            </div>
        </div>
    );
}

function Tile({ label, value, sub, info, warn }: { label: string; value: string; sub?: string; info?: string; warn?: boolean }) {
    return (
        <div className={cx(CARD, 'flex min-w-0 flex-col px-4 py-3.5')}>
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500">{label}{info && <InfoTip text={info} />}</span>
            <span className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 tabular-nums">{value}</span>
            <span className={cx('mt-0.5 min-h-[18px] text-[12px]', warn ? 'font-medium text-rose-600' : 'text-slate-500')}>{sub}</span>
        </div>
    );
}

function KindRow({ k, onPreview }: { k: AutoEmail; onPreview: () => void }) {
    const { icon: Icon, bg } = ICON[k.key] ?? ICON.welcome;
    const stats: [string, number][] = [['Today', k.today], ['7 days', k.week], ['30 days', k.month], ['All time', k.total]];
    return (
        <li className={cx('px-4 py-4', !k.enabled && 'opacity-70')}>
            <div className="flex items-start gap-3">
                <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white', bg)}>
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-1.5 text-[15px] font-semibold text-slate-900">
                                {k.label}
                                <Chip tone={k.enabled ? 'emerald' : 'slate'}>{k.enabled ? 'On' : 'Off'}</Chip>
                                {k.failed > 0 && <Chip tone="rose" title="Failed in the last 30 days">{num(k.failed)} failed</Chip>}
                            </p>
                            <p className="text-[13px] text-slate-600">{k.when}</p>
                            <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{k.detail}</p>
                        </div>
                        <Button variant="secondary" size="sm" className="shrink-0" onClick={onPreview}>Preview</Button>
                    </div>
                    <dl className="mt-3 grid max-w-md grid-cols-4 gap-2 rounded-xl bg-slate-50 px-3 py-2">
                        {stats.map(([label, n]) => (
                            <div key={label} className="min-w-0">
                                <dt className="truncate text-[11px] font-medium text-slate-500">{label}</dt>
                                <dd className="text-[17px] font-semibold leading-tight text-slate-900 tabular-nums">{num(n)}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="mt-2 text-[12px] text-slate-500">
                        {k.last_at ? `Last sent ${relative(k.last_at)}` : 'Not sent yet'}
                        {k.clicked > 0 ? ` · ${num(k.clicked)} clicked in 30 days` : ''}
                        {k.skipped > 0 ? ` · ${num(k.skipped)} skipped` : ''}
                    </p>
                </div>
            </div>
        </li>
    );
}

function PreviewSheet({ k, onClose }: { k: AutoEmail | null; onClose: () => void }) {
    const [device, setDevice] = useDevice();
    const q = useQuery({ queryKey: ['email', 'auto', 'preview', k?.key], queryFn: () => emailApi.autoPreview(k!.key), enabled: !!k, staleTime: 300_000 });
    return (
        <Sheet open={!!k} onClose={onClose} width="narrow" title={k?.label ?? ''} subtitle={k ? `${k.when} · shown with sample details` : undefined}>
            <div className="space-y-3">
                <div className="flex justify-end"><DeviceSwitch value={device} onChange={setDevice} /></div>
                <InboxRow from="TestoZa" subject={q.data?.subject ?? '…'} preheader={q.data?.preheader ?? ''} />
                <div className={cx('mx-auto overflow-hidden rounded-[20px] bg-white ring-1 ring-slate-900/[0.06] transition-[max-width] duration-300',
                    device === 'phone' ? 'max-w-[390px]' : 'max-w-full')}>
                    {q.data?.html ? <MailFrame html={q.data.html} maxHeight={2400} /> : <Skeleton className="h-[520px] rounded-none" />}
                </div>
            </div>
        </Sheet>
    );
}

type StatusFilter = 'all' | AutoLogRow['status'];
const PAGE = 50;

function RecentLog({ kinds, installed }: { kinds: AutoEmail[]; installed: boolean }) {
    const [status, setStatus] = useState<StatusFilter>('all');
    const [kind, setKind] = useState<AutoKind | ''>('');
    const [search, setSearch] = useState('');
    const [q, setQ] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setQ(search.trim()), 350);
        return () => clearTimeout(t);
    }, [search]);

    const log = useInfiniteQuery({
        queryKey: ['email', 'auto', 'log', status, kind, q],
        queryFn: ({ pageParam }) => emailApi.autoLog({
            status: status === 'all' ? null : status, kind: kind || null, q, limit: PAGE, offset: pageParam as number,
        }),
        initialPageParam: 0,
        getNextPageParam: (last, pages) => (pages.length * PAGE < last.total ? pages.length * PAGE : undefined),
        enabled: installed,
    });
    const rows = log.data?.pages.flatMap((p) => p.rows) ?? [];
    const total = log.data?.pages[0]?.total ?? 0;
    const label = (k: AutoKind) => kinds.find((x) => x.key === k)?.label ?? k;

    return (
        <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
                <div>
                    <h2 className="text-[20px] font-bold tracking-[-0.02em] text-slate-900">Latest</h2>
                    <p className="mt-0.5 text-[13px] text-slate-500">Every automatic email, newest first. Type someone’s full address to check they got theirs.</p>
                </div>
                <Segmented<StatusFilter> size="sm" ariaLabel="Status" value={status} onChange={setStatus} options={[
                    { value: 'all', label: 'All' }, { value: 'sent', label: 'Sent' }, { value: 'failed', label: 'Failed' }, { value: 'skipped', label: 'Skipped' },
                ]} />
            </div>
            <div className="mb-2 flex flex-wrap gap-2">
                <label className="relative min-w-[200px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search an email address"
                        aria-label="Search an email address" className={cx(INPUT, 'h-9 pl-9')} />
                </label>
                <select value={kind} onChange={(e) => setKind(e.target.value as AutoKind | '')} aria-label="Which email"
                    className="h-9 rounded-xl bg-white px-3 text-[13px] font-medium text-slate-800 ring-1 ring-inset ring-slate-900/[0.1] focus:outline-none focus:ring-2 focus:ring-indigo-500/60">
                    <option value="">Every email</option>
                    {AUTO_ORDER.map((k) => <option key={k} value={k}>{label(k)}</option>)}
                </select>
            </div>

            <div className={cx(CARD, 'overflow-hidden')}>
                {!installed ? (
                    <Empty icon={Inbox} title="Nothing recorded yet">The list starts once the owner runs the database update.</Empty>
                ) : log.isLoading ? (
                    <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
                ) : rows.length === 0 ? (
                    <Empty icon={Inbox} title={q || status !== 'all' || kind ? 'No matches' : 'No automatic emails yet'} />
                ) : (
                    <ul className="divide-y divide-slate-100">{rows.map((r) => <LogRow key={r.id} r={r} label={label(r.kind)} />)}</ul>
                )}
            </div>
            {log.hasNextPage && (
                <div className="mt-3 flex justify-center">
                    <Button variant="secondary" busy={log.isFetchingNextPage} onClick={() => log.fetchNextPage()}>
                        {log.isFetchingNextPage ? 'Loading…' : `Show more (${num(total - rows.length)} left)`}
                    </Button>
                </div>
            )}
        </section>
    );
}

function LogRow({ r, label }: { r: AutoLogRow; label: string }) {
    const S = {
        sent: { icon: CheckCircle2, color: 'text-emerald-600', text: 'Sent' },
        failed: { icon: XCircle, color: 'text-rose-600', text: 'Failed' },
        skipped: { icon: MinusCircle, color: 'text-slate-400', text: 'Skipped' },
    }[r.status];
    return (
        <li className="flex items-start gap-3 px-4 py-2.5">
            <S.icon className={cx('mt-0.5 h-[18px] w-[18px] shrink-0', S.color)} aria-label={S.text} />
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[14px] font-medium text-slate-900">{r.email}</span>
                    <time dateTime={r.created_at} title={dateTime(r.created_at)} className="shrink-0 text-[12px] text-slate-400">{relative(r.created_at)}</time>
                </div>
                <p className="flex min-w-0 items-center gap-1.5 text-[12px] text-slate-500">
                    <span className="shrink-0 font-semibold text-slate-600">{label}{r.milestone ? ` · ${r.milestone}` : ''}</span>
                    <span className="truncate">{r.subject}</span>
                </p>
                {r.error && <p className={cx('mt-0.5 text-[12px]', r.status === 'failed' ? 'text-rose-600' : 'text-slate-500')}>{r.error}</p>}
            </div>
        </li>
    );
}
