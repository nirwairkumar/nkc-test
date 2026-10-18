/**
 * Admin → Support: every message written on the Help page (app.testoza.com/help) or the
 * public /support page, with what we need to answer without asking back: the page they
 * came from, their screen, a screenshot, their account (tests made, joined when).
 *
 * Reply here and the writer gets it on their Help page, as a notification, and by email
 * once SMTP is set. WhatsApp and email buttons are there for a faster personal answer.
 */
import { keepPreviousData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronRight, ImageIcon, Inbox, Mail, MessageCircle, Phone, RotateCcw, Send } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { initials, istDate, istDateTime, num, relative } from '../analytics/format';
import { ErrorState, usePersisted } from '../analytics/shared';
import { CARD, Chip, Empty, GroupedList, IosSheet, KeyValue, PILL_BTN, Segmented, Skeleton } from '../analytics/ui';
import { mailto } from '../users/roles';
import { deviceSummary, supportApi, TOPIC_LABEL, whatsAppTo, type SupportMessage, type SupportView } from './api';

const VIEWS: readonly SupportView[] = ['open', 'replied', 'resolved', 'all'];
const PAGE = 30;
const SECTION = 'mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400';

const STATUS_CHIP: Record<string, { label: string; tone: 'amber' | 'sky' | 'emerald' }> = {
    pending: { label: 'Waiting', tone: 'amber' },
    replied: { label: 'Replied', tone: 'sky' },
    resolved: { label: 'Resolved', tone: 'emerald' },
};

const firstName = (m: SupportMessage) => (m.account?.full_name || m.name || '').trim().split(' ')[0] || 'there';

export default function SupportPanel() {
    const [view, setView] = usePersisted<SupportView>('tz_admin_support_view', 'open', VIEWS);
    const [params, setParams] = useSearchParams();
    const deepId = params.get('id');
    const [openId, setOpenId] = useState<string | null>(deepId);

    const list = useInfiniteQuery({
        queryKey: ['support', 'list', view],
        queryFn: ({ pageParam }) => supportApi.list({ view, limit: PAGE, offset: pageParam as number }),
        initialPageParam: 0,
        getNextPageParam: (last, pages) => {
            const loaded = pages.reduce((a, pg) => a + pg.rows.length, 0);
            return loaded < last.total ? loaded : undefined;
        },
        placeholderData: keepPreviousData,
        staleTime: 15_000,
        refetchInterval: 60_000,
    });

    const rows = useMemo(() => list.data?.pages.flatMap((p) => p.rows) ?? [], [list.data]);
    const first = list.data?.pages[0];
    const open = rows.find((r) => r.id === openId) ?? null;

    // A notification link (?tab=support&id=…) opens that message; look in "All" if it isn't in this view.
    useEffect(() => {
        if (!deepId || !first || list.isPlaceholderData) return;
        if (!rows.some((r) => r.id === deepId) && view !== 'all') setView('all');
    }, [deepId, first, rows, view, setView, list.isPlaceholderData]);

    const close = () => {
        setOpenId(null);
        if (deepId) {
            params.delete('id');
            setParams(params, { replace: true });
        }
    };

    return (
        <div className="space-y-5 pb-10">
            <header>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Inbox</p>
                <h1 className="mt-1.5 !text-[28px] font-bold leading-[1.1] tracking-[-0.025em] text-slate-900 sm:!text-[34px]">Support</h1>
                <p className="mt-2 hidden text-[15px] text-slate-600 sm:block">
                    Messages from the Help page. Answer fast: a reply within hours is what keeps a new teacher.
                </p>
            </header>

            {first && !first.emails_on && (
                <div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900 ring-1 ring-inset ring-amber-600/20">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        Emails are off until <span className="font-mono text-[12px]">SMTP_PASSWORD</span> is set. Replies still reach signed-in
                        users on their Help page and as a notification; for anyone else use the Email or WhatsApp buttons.
                    </span>
                </div>
            )}

            <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
                <Segmented<SupportView>
                    ariaLabel="Messages"
                    value={view}
                    onChange={setView}
                    options={[
                        { value: 'open', label: <ViewLabel text="Waiting" n={first?.counts.open} accent /> },
                        { value: 'replied', label: <ViewLabel text="Replied" n={first?.counts.replied} /> },
                        { value: 'resolved', label: <ViewLabel text="Resolved" n={first?.counts.resolved} /> },
                        { value: 'all', label: <ViewLabel text="All" n={first?.counts.all} /> },
                    ]}
                />
            </div>

            {list.error && !list.data ? (
                <ErrorState error={list.error} onRetry={() => list.refetch()} />
            ) : !list.data ? (
                <div className={cn(CARD, 'space-y-3 p-4')}>{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : rows.length === 0 ? (
                <div className={CARD}>
                    <Empty icon={view === 'open' ? CheckCircle2 : Inbox} title={view === 'open' ? 'Nobody is waiting' : 'No messages here'}>
                        {view === 'open' && 'Every message has an answer.'}
                    </Empty>
                </div>
            ) : (
                <>
                    <GroupedList className={cn(list.isPlaceholderData && 'opacity-60')}>
                        {rows.map((m) => <Row key={m.id} m={m} onOpen={() => setOpenId(m.id)} />)}
                    </GroupedList>
                    {list.hasNextPage && (
                        <div className="flex justify-center">
                            <button type="button" className={PILL_BTN} onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                                {list.isFetchingNextPage ? 'Loading…' : `Show more (${num((first?.total ?? 0) - rows.length)} left)`}
                            </button>
                        </div>
                    )}
                </>
            )}

            <MessageSheet message={open} onClose={close} />
        </div>
    );
}

function ViewLabel({ text, n, accent }: { text: string; n?: number; accent?: boolean }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            {text}
            {n !== undefined && (
                <span className={cn('rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                    accent && n > 0 ? 'bg-amber-500 text-white' : 'bg-slate-900/[0.06] text-slate-500')}>
                    {n}
                </span>
            )}
        </span>
    );
}

function Avatar({ m }: { m: SupportMessage }) {
    if (m.account?.avatar_url) {
        return <img src={m.account.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-900/[0.06]" />;
    }
    return (
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[13px] font-bold text-white',
            m.user_id ? 'from-sky-500 to-sky-700' : 'from-slate-300 to-slate-400')}>
            {initials(m.account?.full_name || m.name)}
        </span>
    );
}

function Row({ m, onOpen }: { m: SupportMessage; onOpen: () => void }) {
    const s = STATUS_CHIP[m.status || 'pending'] || STATUS_CHIP.pending;
    return (
        <li>
            <button type="button" onClick={onOpen}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none">
                <Avatar m={m} />
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-[14px] font-semibold text-slate-900">{m.account?.full_name || m.name}</span>
                        <Chip tone={s.tone}>{s.label}</Chip>
                        {m.topic && <Chip>{TOPIC_LABEL[m.topic] || m.topic}</Chip>}
                        {!m.user_id && <Chip title="Sent from the public /support page">Not signed in</Chip>}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[13px] leading-relaxed text-slate-600">{m.message}</span>
                    <span className="mt-1 flex items-center gap-2 text-[12px] text-slate-400">
                        <span className="truncate">{m.email}</span>
                        {m.screenshot_url && <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-label="Has a screenshot" />}
                        {m.phone && <Phone className="h-3.5 w-3.5 shrink-0" aria-label="Left a phone number" />}
                    </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[12px] text-slate-500">{relative(m.created_at)}</span>
                    <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
                </span>
            </button>
        </li>
    );
}

function MessageSheet({ message, onClose }: { message: SupportMessage | null; onClose: () => void }) {
    // Keep the last message on screen while the sheet animates closed.
    const [kept, setKept] = useState<SupportMessage | null>(message);
    useEffect(() => { if (message) setKept(message); }, [message]);
    const m = message || kept;
    const qc = useQueryClient();
    const [reply, setReply] = useState('');
    const [resolve, setResolve] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => { setReply(''); setResolve(true); }, [m?.id]);

    if (!m) return <IosSheet open={false} onOpenChange={() => onClose()} title="">{null}</IosSheet>;

    const status = m.status || 'pending';
    const s = STATUS_CHIP[status] || STATUS_CHIP.pending;
    const refresh = () => qc.invalidateQueries({ queryKey: ['support'] });
    const greeting = `Hi ${firstName(m)}, this is the TestoZa team about your message:\n"${m.message.slice(0, 120)}${m.message.length > 120 ? '…' : ''}"\n\n`;
    const wa = m.phone ? whatsAppTo(m.phone, greeting) : null;

    const send = async () => {
        if (!reply.trim()) return;
        setBusy(true);
        try {
            const res = await supportApi.reply(m.id, reply.trim(), resolve);
            const where = [res.notified && 'on their Help page', res.emailed && 'by email'].filter(Boolean).join(' and ');
            toast.success(where ? `Reply sent ${where}` : 'Reply saved. They aren\'t signed in and email is off, so also email or WhatsApp them.');
            setReply('');
            refresh();
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Couldn’t send the reply. Try again.');
        } finally {
            setBusy(false);
        }
    };

    const toggleResolved = async () => {
        setBusy(true);
        try {
            await supportApi.setStatus(m.id, status === 'resolved' ? 'pending' : 'resolved');
            toast.success(status === 'resolved' ? 'Reopened' : 'Marked resolved');
            refresh();
        } catch {
            toast.error('Couldn’t update. Try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <IosSheet
            open={!!message}
            onOpenChange={(o) => { if (!o) onClose(); }}
            title={m.account?.full_name || m.name}
            subtitle={<>{istDateTime(m.created_at)} · {m.email}</>}
            headerExtra={
                <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip tone={s.tone}>{s.label}</Chip>
                    {m.topic && <Chip>{TOPIC_LABEL[m.topic] || m.topic}</Chip>}
                </div>
            }
        >
            <div className="space-y-5">
                {/* What they wrote */}
                <section>
                    <p className={SECTION}>Message</p>
                    <div className={cn(CARD, 'whitespace-pre-line px-4 py-3.5 text-[14px] leading-relaxed text-slate-800')}>{m.message}</div>
                    {m.screenshot_url && (
                        <a href={m.screenshot_url} target="_blank" rel="noopener noreferrer" className="mt-2 block overflow-hidden rounded-2xl ring-1 ring-slate-900/[0.08]">
                            <img src={m.screenshot_url} alt="Screenshot they attached" className="max-h-[320px] w-full bg-white object-contain" />
                        </a>
                    )}
                    {m.context?.screenshot === 'upload failed' && (
                        <p className="mt-2 px-1 text-[12px] text-amber-700">They attached a screenshot but it failed to upload.</p>
                    )}
                </section>

                {/* Answer */}
                <section>
                    <p className={SECTION}>Answer</p>
                    <div className="flex flex-wrap gap-2">
                        {wa && (
                            <a href={wa} target="_blank" rel="noopener noreferrer"
                                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 text-[13px] font-semibold text-white hover:brightness-95">
                                <MessageCircle className="h-4 w-4" /> WhatsApp {m.phone}
                            </a>
                        )}
                        <a href={mailto(m.email, 'Re: your message to TestoZa', `Hi ${firstName(m)},\n\n`)} className={PILL_BTN}>
                            <Mail className="h-4 w-4 text-sky-600" /> Email
                        </a>
                        <button type="button" onClick={toggleResolved} disabled={busy} className={PILL_BTN}>
                            {status === 'resolved'
                                ? <><RotateCcw className="h-4 w-4 text-slate-500" /> Reopen</>
                                : <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Mark resolved</>}
                        </button>
                    </div>

                    {m.reply && (
                        <div className="mt-3 rounded-2xl bg-sky-50/70 px-4 py-3 ring-1 ring-inset ring-sky-600/10">
                            <p className="text-[12px] font-semibold text-sky-800">Our reply · {istDateTime(m.replied_at || m.created_at)}</p>
                            <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-slate-800">{m.reply}</p>
                        </div>
                    )}

                    <div className={cn(CARD, 'mt-3 p-3')}>
                        <textarea
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            rows={4}
                            placeholder={m.reply ? 'Write a follow-up…' : `Hi ${firstName(m)}, …`}
                            className="w-full resize-y rounded-xl bg-slate-100 px-3 py-2.5 text-[14px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                        />
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
                                <input type="checkbox" checked={resolve} onChange={(e) => setResolve(e.target.checked)} className="h-4 w-4 accent-sky-600" />
                                Mark resolved
                            </label>
                            <button type="button" onClick={send} disabled={busy || !reply.trim()}
                                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-sky-600 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50">
                                <Send className="h-4 w-4" /> Send reply
                            </button>
                        </div>
                        <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
                            {m.user_id
                                ? 'They see it on their Help page and get a notification, plus an email when SMTP is on.'
                                : 'Not signed in: they only get it by email (when SMTP is on). Email or WhatsApp them to be sure.'}
                        </p>
                    </div>
                </section>

                {/* Who and where */}
                <section>
                    <p className={SECTION}>Who and where</p>
                    <GroupedList>
                        <KeyValue label="Email">{m.email}</KeyValue>
                        {m.phone && <KeyValue label="Phone">{m.phone}</KeyValue>}
                        {m.account ? (
                            <>
                                {m.account.designation && <KeyValue label="Role">{m.account.designation}</KeyValue>}
                                <KeyValue label="Tests made">{num(m.account.tests)}</KeyValue>
                                {m.account.joined_at && <KeyValue label="Joined">{istDate(m.account.joined_at)}</KeyValue>}
                            </>
                        ) : (
                            <KeyValue label="Account">Not signed in</KeyValue>
                        )}
                        {m.context?.from && <KeyValue label="Came from">{m.context.from}</KeyValue>}
                        {m.user_agent && <KeyValue label="Device">{deviceSummary(m.user_agent)}</KeyValue>}
                        {m.context?.viewport && <KeyValue label="Screen">{m.context.viewport.replace('x', ' × ')}</KeyValue>}
                        {m.context?.language && <KeyValue label="Language">{m.context.language}</KeyValue>}
                    </GroupedList>
                </section>
            </div>
        </IosSheet>
    );
}
