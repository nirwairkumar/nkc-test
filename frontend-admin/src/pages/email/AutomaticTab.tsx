/**
 * Admin → Email → Automatic: the emails TestoZa sends by itself (backend services/auto_email.py).
 *
 *   Welcome · Test created · Test is live · Submissions · Exam ended
 *
 * For each: on/off, how many went today / 7 days / 30 days / ever, clicks, failures, a preview
 * and "send me a test". Below, the latest automatic emails, so "did Asha get it?" has an answer.
 * Counts need supabase/migrations/20261102120000_email_automatic.sql; emails go out without it.
 */
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    CheckCircle2, FilePlus2, Flag, Inbox, MinusCircle, Monitor, Radio, Search, Send, ShieldCheck, Smartphone, Sparkles, XCircle,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { istDateTime, num, relative } from '../analytics/format';
import { CARD, Chip, Empty, InfoTip, Segmented, Skeleton } from '../analytics/ui';
import { emailApi, errorText, type AutoEmail, type AutoKind, type AutoLogRow, type AutoOverview } from './api';
import { AUTO_ORDER } from './model';
import { INPUT, SOFT_BTN, WideSheet } from './parts';

const ICON: Record<AutoKind, { icon: React.ElementType; bg: string }> = {
    welcome: { icon: Sparkles, bg: 'bg-violet-500' },
    test_created: { icon: FilePlus2, bg: 'bg-sky-500' },
    test_live: { icon: Radio, bg: 'bg-emerald-500' },
    results: { icon: Inbox, bg: 'bg-indigo-500' },
    test_ended: { icon: Flag, bg: 'bg-amber-500' },
};

export default function AutomaticTab() {
    const qc = useQueryClient();
    const q = useQuery({ queryKey: ['email', 'auto'], queryFn: emailApi.auto, staleTime: 30_000, refetchInterval: 60_000 });
    const [preview, setPreview] = useState<AutoEmail | null>(null);

    const toggle = useMutation({
        mutationFn: ({ key, enabled }: { key: AutoKind; enabled: boolean }) => emailApi.setAuto(key, enabled),
        onMutate: async ({ key, enabled }) => {
            await qc.cancelQueries({ queryKey: ['email', 'auto'] });
            const before = qc.getQueryData<AutoOverview>(['email', 'auto']);
            if (before) {
                qc.setQueryData<AutoOverview>(['email', 'auto'], {
                    ...before, kinds: before.kinds.map((k) => (k.key === key ? { ...k, enabled } : k)),
                });
            }
            return { before };
        },
        onError: (e, _v, ctx) => {
            if (ctx?.before) qc.setQueryData(['email', 'auto'], ctx.before);
            toast.error(errorText(e));
        },
        onSuccess: (r) => {
            const label = q.data?.kinds.find((k) => k.key === r.key)?.label ?? 'Email';
            toast.success(r.enabled ? `${label} emails are on` : `${label} emails are off. Nobody gets them until you turn them back on.`);
        },
        onSettled: () => qc.invalidateQueries({ queryKey: ['email', 'auto'] }),
    });

    const d = q.data;
    const kinds = useMemo(
        () => (d?.kinds ?? []).slice().sort((a, b) => AUTO_ORDER.indexOf(a.key) - AUTO_ORDER.indexOf(b.key)),
        [d?.kinds],
    );
    const sum = (f: keyof Pick<AutoEmail, 'today' | 'week' | 'month' | 'failed' | 'clicked' | 'total'>) =>
        kinds.reduce((a, k) => a + (k[f] ?? 0), 0);

    if (q.error && !d) {
        return <div className={cn(CARD, 'p-5 text-[14px] text-slate-600')}>{errorText(q.error, 'Couldn’t load the automatic emails. Refresh the page in a moment.')}</div>;
    }

    return (
        <div className="space-y-6">
            {d && !d.installed && (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-inset ring-amber-600/20">
                    <p className="text-[14px] font-semibold text-amber-900">One database update to see the numbers</p>
                    <p className="mt-0.5 text-[13px] text-amber-800">
                        Run <span className="font-mono text-[12px]">{d.migration}</span> in the Supabase SQL editor. Until then the
                        emails still go out, but nothing is counted and the switches can’t be saved.
                    </p>
                </div>
            )}

            <Transport t={d?.transport} loading={q.isLoading} />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {!d ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[92px]" />) : (
                    <>
                        <Tile label="Sent today" value={num(sum('today'))} sub="India time" />
                        <Tile label="Last 7 days" value={num(sum('week'))} />
                        <Tile label="Last 30 days" value={num(sum('month'))}
                            sub={sum('failed') ? `${num(sum('failed'))} failed` : 'None failed'} warn={sum('failed') > 0} />
                        <Tile label="Clicked (30 days)" value={num(sum('clicked'))}
                            info="People who opened TestoZa from a link in an automatic email in the last 30 days (links carry utm_medium=auto)." />
                    </>
                )}
            </div>

            <section>
                <div className="mb-3 px-1">
                    <h2 className="!text-[20px] font-bold tracking-[-0.02em] text-slate-900">Automatic emails</h2>
                    <p className="mt-0.5 text-[13px] text-slate-500">
                        Sent by TestoZa the moment something happens. They’re about the reader’s own account and exams, so the weekly
                        limit for broadcasts doesn’t apply. Exam candidates and bounced addresses never get them.
                    </p>
                </div>
                <ul className={cn(CARD, 'divide-y divide-slate-100 overflow-hidden')}>
                    {!d ? Array.from({ length: 5 }, (_, i) => (
                        <li key={i} className="flex gap-3 px-4 py-4"><Skeleton className="h-9 w-9 rounded-xl" /><Skeleton className="h-14 flex-1" /></li>
                    )) : kinds.map((k) => (
                        <KindRow key={k.key} k={k} canSwitch={d.installed} busy={toggle.isPending && toggle.variables?.key === k.key}
                            onToggle={(enabled) => toggle.mutate({ key: k.key, enabled })} onPreview={() => setPreview(k)} />
                    ))}
                </ul>
            </section>

            <RecentLog kinds={kinds} installed={d?.installed ?? true} />

            <PreviewSheet k={preview} onClose={() => setPreview(null)} />
        </div>
    );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function Transport({ t, loading }: { t?: AutoOverview['transport']; loading: boolean }) {
    if (loading || !t) return <Skeleton className="h-[84px]" />;
    return (
        <div className={cn(CARD, 'flex items-start gap-3 px-4 py-3.5')}>
            <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white',
                t.configured ? 'bg-emerald-500' : 'bg-amber-500')}>
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 text-[13px] leading-snug text-slate-500">
                <p className="text-[15px] font-semibold text-slate-900">
                    {t.configured ? `Sending through ${t.service}` : 'Email isn’t connected'}
                </p>
                {t.configured && t.from_email && <p className="mt-0.5 truncate">From TestoZa &lt;{t.from_email}&gt; · replies go to support@testoza.com</p>}
                {!t.configured && <p className="mt-0.5">The owner sets SMTP_* on the server. Until then nothing is sent.</p>}
                <p className="mt-0.5">
                    {t.fallback.configured
                        ? `Backup: ${t.fallback.service}${t.fallback.from_email ? ` (${t.fallback.from_email})` : ''}, used only if ${t.service || 'the main service'} can’t send at all.`
                        : 'No backup service (FALLBACK_SMTP_* on the server).'}
                </p>
                <p className={cn('mt-0.5', !t.bounce_reports && 'text-amber-700')}>
                    {t.bounce_reports
                        ? 'Bounces and spam reports from Amazon SES reach the never-email list.'
                        : 'Bounce and spam reports aren’t connected yet (SES_SNS_TOPIC_ARN on the server).'}
                </p>
            </div>
        </div>
    );
}

function Tile({ label, value, sub, info, warn }: { label: string; value: string; sub?: string; info?: string; warn?: boolean }) {
    return (
        <div className={cn(CARD, 'flex min-w-0 flex-col px-4 py-3.5')}>
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500">{label}{info && <InfoTip text={info} />}</span>
            <span className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 tabular-nums">{value}</span>
            <span className={cn('mt-0.5 min-h-[18px] text-[12px]', warn ? 'font-medium text-rose-600' : 'text-slate-500')}>{sub}</span>
        </div>
    );
}

function IosSwitch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
    return (
        <SwitchPrimitive.Root checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label}
            className={cn('relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full p-[2px] transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50',
                checked ? 'bg-emerald-500' : 'bg-slate-200')}>
            <SwitchPrimitive.Thumb className={cn('block h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.25)] transition-transform duration-200',
                checked ? 'translate-x-5' : 'translate-x-0')} />
        </SwitchPrimitive.Root>
    );
}

function KindRow({ k, canSwitch, busy, onToggle, onPreview }: {
    k: AutoEmail; canSwitch: boolean; busy: boolean; onToggle: (v: boolean) => void; onPreview: () => void;
}) {
    const { icon: Icon, bg } = ICON[k.key];
    const stats: [string, number][] = [['Today', k.today], ['7 days', k.week], ['30 days', k.month], ['All time', k.total]];
    return (
        <li className={cn('px-4 py-4 transition-opacity', !k.enabled && 'opacity-60')}>
            <div className="flex items-start gap-3">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white', bg)}>
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-1.5 text-[15px] font-semibold text-slate-900">
                                {k.label}
                                {!k.enabled && <Chip>Off</Chip>}
                                {k.failed > 0 && <Chip tone="rose" title="Failed in the last 30 days">{num(k.failed)} failed</Chip>}
                            </p>
                            <p className="text-[13px] text-slate-600">{k.when}</p>
                            <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{k.detail}</p>
                        </div>
                        <IosSwitch checked={k.enabled} onChange={onToggle} disabled={!canSwitch || busy}
                            label={`${k.label} emails ${k.enabled ? 'on' : 'off'}`} />
                    </div>

                    <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                        <div className="min-w-0 sm:w-full sm:max-w-md">
                            <dl className="grid grid-cols-4 gap-2 rounded-xl bg-slate-50 px-3 py-2">
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
                        <button type="button" onClick={onPreview}
                            className="inline-flex h-8 shrink-0 items-center gap-1.5 self-end rounded-full bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-900/[0.08] hover:bg-slate-50 sm:mb-6">
                            Preview and test
                        </button>
                    </div>
                </div>
            </div>
        </li>
    );
}

// ── Preview + "send me a test" ───────────────────────────────────────────────

function PreviewSheet({ k, onClose }: { k: AutoEmail | null; onClose: () => void }) {
    const { user } = useAuth();
    const [to, setTo] = useState('');
    const [device, setDevice] = useState<'phone' | 'desktop'>('phone');
    useEffect(() => setTo((v) => v || user?.email || ''), [user?.email]);
    const q = useQuery({ queryKey: ['email', 'auto', 'preview', k?.key], queryFn: () => emailApi.autoPreview(k!.key), enabled: !!k, staleTime: 300_000 });
    const send = useMutation({
        mutationFn: () => emailApi.autoTest(k!.key, to.trim()),
        onSuccess: (r) => toast.success(`Test sent to ${r.to} through ${r.service}${r.fallback ? ' (the backup)' : ''}. Open it on your phone and tap every link.`),
        onError: (e) => toast.error(errorText(e)),
    });

    const frame = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState(640);
    const html = useMemo(() => (q.data?.html ?? '').replace('<head>', '<head><base target="_blank">'), [q.data?.html]);
    const fit = () => {
        const doc = frame.current?.contentDocument;
        if (doc?.body) setHeight(Math.min(Math.max(doc.body.scrollHeight + 8, 360), 2400));
    };
    useEffect(fit, [html, device]);

    return (
        <WideSheet open={!!k} onOpenChange={(o) => !o && onClose()} width="narrow" title={k?.label ?? ''}
            subtitle={k ? `${k.when} · shown with sample details` : undefined}
            footer={
                <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (to.includes('@')) send.mutate(); }}>
                    <input type="email" value={to} onChange={(e) => setTo(e.target.value)} className={INPUT}
                        placeholder="you@example.com" aria-label="Send a test to" />
                    <button type="submit" className={cn(SOFT_BTN, 'shrink-0')} disabled={send.isPending || !to.includes('@')}>
                        <Send className="h-4 w-4" aria-hidden="true" /> {send.isPending ? 'Sending…' : 'Send test'}
                    </button>
                </form>
            }>
            <div className="space-y-3">
                <div className="flex justify-end">
                    <Segmented<'phone' | 'desktop'> size="sm" ariaLabel="Preview size" value={device} onChange={setDevice} options={[
                        { value: 'phone', label: <span className="inline-flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" />Phone</span> },
                        { value: 'desktop', label: <span className="inline-flex items-center gap-1"><Monitor className="h-3.5 w-3.5" />Desktop</span> },
                    ]} />
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-900/[0.06]">
                    <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[15px] font-semibold text-slate-900">TestoZa</span>
                        <span className="shrink-0 text-[12px] text-slate-400">10:30 am</span>
                    </div>
                    <p className="truncate text-[14px] font-medium text-slate-800">{q.data?.subject ?? '…'}</p>
                    <p className="truncate text-[13px] text-slate-500">{q.data?.preheader ?? ''}</p>
                </div>
                {(k?.key === 'results' || k?.key === 'test_ended') && (
                    <p className="px-1 text-[12px] leading-snug text-slate-500">
                        Submissions and Exam ended share one subject and thread per test, so the inbox shows one conversation per exam.
                    </p>
                )}
                <div className={cn('mx-auto overflow-hidden rounded-[20px] bg-slate-100 ring-1 ring-slate-900/[0.06] transition-[max-width] duration-300',
                    device === 'phone' ? 'max-w-[390px]' : 'max-w-full')}>
                    {html ? (
                        <iframe ref={frame} title="Email preview" srcDoc={html} onLoad={fit}
                            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                            className="block w-full border-0 bg-slate-100" style={{ height }} />
                    ) : (
                        <Skeleton className="h-[520px] rounded-none" />
                    )}
                </div>
            </div>
        </WideSheet>
    );
}

// ── The latest automatic emails ──────────────────────────────────────────────

type StatusFilter = 'all' | AutoLogRow['status'];
const PAGE = 50;

function RecentLog({ kinds, installed }: { kinds: AutoEmail[]; installed: boolean }) {
    const [status, setStatus] = useState<StatusFilter>('all');
    const [kind, setKind] = useState<AutoKind | ''>('');
    const [search, setSearch] = useState('');
    const [q, setQ] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setQ(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    const log = useInfiniteQuery({
        queryKey: ['email', 'auto', 'log', status, kind, q],
        queryFn: ({ pageParam }) => emailApi.autoLog({
            status: status === 'all' ? null : status, kind: kind || null, q, limit: PAGE, offset: pageParam,
        }),
        initialPageParam: 0,
        getNextPageParam: (last, pages) => (pages.length * PAGE < last.total ? pages.length * PAGE : undefined),
        enabled: installed,
        refetchInterval: 60_000,
    });
    const rows = log.data?.pages.flatMap((p) => p.rows) ?? [];
    const total = log.data?.pages[0]?.total ?? 0;
    const label = (k: AutoKind) => kinds.find((x) => x.key === k)?.label ?? k;

    return (
        <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
                <div>
                    <h2 className="!text-[20px] font-bold tracking-[-0.02em] text-slate-900">Latest</h2>
                    <p className="mt-0.5 text-[13px] text-slate-500">Every automatic email, newest first. Search an address to check someone got theirs.</p>
                </div>
                <Segmented<StatusFilter> size="sm" ariaLabel="Status" value={status} onChange={setStatus} options={[
                    { value: 'all', label: 'All' }, { value: 'sent', label: 'Sent' }, { value: 'failed', label: 'Failed' }, { value: 'skipped', label: 'Skipped' },
                ]} />
            </div>
            <div className="mb-2 flex flex-wrap gap-2">
                <label className="relative min-w-[200px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search an email address"
                        aria-label="Search an email address" className={cn(INPUT, 'h-9 bg-slate-100 pl-9 ring-0')} />
                </label>
                <select value={kind} onChange={(e) => setKind(e.target.value as AutoKind | '')} aria-label="Which email"
                    className="h-9 rounded-xl border-0 bg-white px-3 text-[13px] font-medium text-slate-800 ring-1 ring-inset ring-slate-900/[0.08] focus:ring-2 focus:ring-sky-500/50">
                    <option value="">Every email</option>
                    {AUTO_ORDER.map((k) => <option key={k} value={k}>{label(k)}</option>)}
                </select>
            </div>

            <div className={cn(CARD, 'overflow-hidden')}>
                {!installed ? (
                    <Empty icon={Inbox} title="Nothing recorded yet">The list starts once the database update is run.</Empty>
                ) : log.isLoading ? (
                    <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
                ) : rows.length === 0 ? (
                    <Empty icon={Inbox} title={q || status !== 'all' || kind ? 'No matches' : 'No automatic emails yet'}>
                        {q || status !== 'all' || kind ? 'Try another address or filter.' : 'They appear here as educators sign up, make tests and run exams.'}
                    </Empty>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {rows.map((r) => <LogRow key={r.id} r={r} label={label(r.kind)} />)}
                    </ul>
                )}
            </div>
            {log.hasNextPage && (
                <div className="mt-3 flex justify-center">
                    <button type="button" className={SOFT_BTN} onClick={() => log.fetchNextPage()} disabled={log.isFetchingNextPage}>
                        {log.isFetchingNextPage ? 'Loading…' : `Show more (${num(total - rows.length)} left)`}
                    </button>
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
            <S.icon className={cn('mt-0.5 h-[18px] w-[18px] shrink-0', S.color)} aria-label={S.text} />
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[14px] font-medium text-slate-900">{r.email}</span>
                    <time dateTime={r.created_at} title={istDateTime(r.created_at)} className="shrink-0 text-[12px] text-slate-400">{relative(r.created_at)}</time>
                </div>
                <p className="flex min-w-0 items-center gap-1.5 text-[12px] text-slate-500">
                    <span className="shrink-0 font-semibold text-slate-600">{label}{r.milestone ? ` · ${r.milestone}` : ''}</span>
                    <span className="truncate">{r.subject}</span>
                </p>
                {r.error && <p className={cn('mt-0.5 text-[12px]', r.status === 'failed' ? 'text-rose-600' : 'text-slate-500')}>{r.error}</p>}
                {r.provider && r.provider.includes('fallback') && <p className="mt-0.5 text-[12px] text-amber-700">Went through the backup service</p>}
            </div>
        </li>
    );
}
