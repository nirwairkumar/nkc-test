/**
 * One help conversation, opened from admin → Support or from admin → Notifications.
 *
 * Reads like a chat: the writer on the left, us on the right, the reply box underneath.
 * Sending a reply puts it on the writer's Help page, sends them a notification and (once
 * SMTP is set) an email from TestoZa Support with Reply-To support@testoza.com. If they
 * write back, it lands here and in Notifications again.
 *
 * The writer's other conversations sit around it as one timeline, folded to a line each:
 * earlier ones above, a newer one below. One the writer deleted from their Help page is
 * read-only history: no reply, no reopen, no Email/WhatsApp. Delete here is permanent.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, Loader2, Mail, MessageCircle, RotateCcw, Send, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { istDate, istDateTime, num } from '../analytics/format';
import { CARD, Chip, GroupedList, IosSheet, KeyValue, PILL_BTN, Skeleton } from '../analytics/ui';
import { mailto, roleLabel } from '../users/roles';
import { deviceSummary, supportApi, TOPIC_LABEL, whatsAppTo, type SupportHistoryItem, type SupportMessage, type SupportTurn } from './api';

const SECTION = 'mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400';

export const STATUS_CHIP: Record<string, { label: string; tone: 'amber' | 'sky' | 'emerald' }> = {
    pending: { label: 'Waiting', tone: 'amber' },
    replied: { label: 'Replied', tone: 'sky' },
    resolved: { label: 'Resolved', tone: 'emerald' },
};

export const firstName = (m: Pick<SupportMessage, 'name' | 'account'>) =>
    (m.account?.full_name || m.name || '').trim().split(' ')[0] || 'there';

const errorText = (err: any, fallback: string) => err?.response?.data?.detail || fallback;

function Bubble({ ours, who, body, at, children }: { ours: boolean; who: string; body: string; at: string; children?: React.ReactNode }) {
    return (
        <div className={cn('flex', ours ? 'justify-end' : 'justify-start')}>
            <div className="max-w-[88%]">
                <p className={cn('mb-1 px-1 text-[11px] font-semibold text-slate-500', ours && 'text-right')}>{who}</p>
                <div className={cn('whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed',
                    ours ? 'rounded-br-md bg-sky-600 text-white' : 'rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-900/[0.06]')}>
                    {body}
                </div>
                {children}
                <p className={cn('mt-1 px-1 text-[11px] text-slate-400', ours && 'text-right')}>{istDateTime(at)}</p>
            </div>
        </div>
    );
}

function Screenshot({ url }: { url?: string | null }) {
    if (!url) return null;
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1.5 block overflow-hidden rounded-xl ring-1 ring-slate-900/[0.08]">
            <img src={url} alt="Screenshot they attached" className="max-h-[260px] w-full bg-white object-contain" />
        </a>
    );
}

function Thread({ writer, thread }: { writer: string; thread: SupportTurn[] }) {
    return (
        <>
            {thread.map((t) => (
                <Bubble key={t.id} ours={t.author === 'team'} who={t.author === 'team' ? 'TestoZa team' : writer} body={t.body} at={t.created_at} />
            ))}
        </>
    );
}

/** Another conversation from the same writer, folded to one line until clicked. */
function HistoryItem({ h, writer, onOpen }: { h: SupportHistoryItem; writer: string; onOpen: (id: string) => void }) {
    const [open, setOpen] = useState(false);
    const s = STATUS_CHIP[h.status || 'pending'] || STATUS_CHIP.pending;
    return (
        <li>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
                className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none">
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[12px] font-medium text-slate-500">{istDate(h.created_at)}</span>
                        <Chip tone={s.tone}>{s.label}</Chip>
                        {h.user_deleted_at && <Chip tone="rose">Deleted by user</Chip>}
                        {h.topic && <Chip>{TOPIC_LABEL[h.topic] || h.topic}</Chip>}
                    </span>
                    {!open && <span className="mt-0.5 block truncate text-[13px] text-slate-600">{h.message}</span>}
                </span>
                <ChevronDown className={cn('mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden="true" />
            </button>
            {open && (
                <div className="space-y-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
                    <Bubble ours={false} who={writer} body={h.message} at={h.created_at}><Screenshot url={h.screenshot_url} /></Bubble>
                    <Thread writer={writer} thread={h.thread} />
                    {!h.user_deleted_at && (
                        <div className="flex justify-center pt-1">
                            <button type="button" onClick={() => onOpen(h.id)} className={PILL_BTN}>Open this conversation</button>
                        </div>
                    )}
                </div>
            )}
        </li>
    );
}

/** `preview` (a list row) shows at once while the full conversation loads. */
export default function ConversationSheet({ messageId, preview, onClose }: {
    messageId: string | null;
    preview?: SupportMessage | null;
    onClose: () => void;
}) {
    const qc = useQueryClient();
    // "Open this conversation" on a history row switches the sheet to it.
    const [shownId, setShownId] = useState<string | null>(messageId);
    useEffect(() => { setShownId(messageId); }, [messageId]);

    const one = useQuery({
        queryKey: ['support', 'one', shownId],
        queryFn: () => supportApi.get(shownId!),
        enabled: !!shownId,
        placeholderData: preview && preview.id === shownId ? { ...preview, emails_on: true } : undefined,
        staleTime: 10_000,
    });

    // Keep the last conversation on screen while the sheet animates closed.
    const [kept, setKept] = useState<SupportMessage | null>(null);
    useEffect(() => { if (one.data) setKept(one.data); }, [one.data]);
    const m = one.data ?? (kept && (!shownId || kept.id === shownId) ? kept : null);

    const [reply, setReply] = useState('');
    const [resolve, setResolve] = useState(false);
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    useEffect(() => { setReply(''); setResolve(false); setConfirmDelete(false); }, [shownId]);

    const refresh = () => qc.invalidateQueries({ queryKey: ['support'] });

    const send = async () => {
        if (!m || !reply.trim()) return;
        setBusy(true);
        try {
            const res = await supportApi.reply(m.id, reply.trim(), resolve);
            const where = [res.notified && 'on their Help page', res.emailed && 'by email'].filter(Boolean).join(' and ');
            toast.success(where ? `Reply sent ${where}` : 'Reply saved. They aren’t signed in and email is off, so also email or WhatsApp them.');
            setReply('');
            refresh();
            qc.invalidateQueries({ queryKey: ['notifications'] });
        } catch (err: any) {
            toast.error(errorText(err, 'Couldn’t send the reply. Try again.'));
            refresh();
        } finally {
            setBusy(false);
        }
    };

    const toggleResolved = async () => {
        if (!m) return;
        const status = m.status || 'pending';
        setBusy(true);
        try {
            await supportApi.setStatus(m.id, status === 'resolved' ? 'pending' : 'resolved');
            toast.success(status === 'resolved' ? 'Reopened' : 'Marked resolved');
            refresh();
        } catch (err: any) {
            toast.error(errorText(err, 'Couldn’t update. Try again.'));
        } finally {
            setBusy(false);
        }
    };

    const removeForGood = async () => {
        if (!m) return;
        setBusy(true);
        try {
            await supportApi.remove(m.id);
            toast.success('Deleted for good');
            qc.removeQueries({ queryKey: ['support', 'one', m.id] });
            refresh();
            qc.invalidateQueries({ queryKey: ['notifications'] });
            onClose();
        } catch (err: any) {
            toast.error(errorText(err, 'Couldn’t delete it. Try again.'));
        } finally {
            setBusy(false);
        }
    };

    if (!m) {
        return (
            <IosSheet open={!!messageId} onOpenChange={(o) => { if (!o) onClose(); }} title="Loading…">
                {one.error ? (
                    <p className="px-1 text-[14px] text-slate-600">This message couldn’t be loaded. It may have been deleted.</p>
                ) : (
                    <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-32" /></div>
                )}
            </IosSheet>
        );
    }

    const status = m.status || 'pending';
    const s = STATUS_CHIP[status] || STATUS_CHIP.pending;
    const writer = m.account?.full_name || m.name;
    const deleted = !!m.user_deleted_at;
    const greeting = `Hi ${firstName(m)}, this is the TestoZa team about your message:\n"${m.message.slice(0, 120)}${m.message.length > 120 ? '…' : ''}"\n\n`;
    const wa = m.phone ? whatsAppTo(m.phone, greeting) : null;
    const emailsOn = (one.data as { emails_on?: boolean } | undefined)?.emails_on ?? true;
    const history = m.history ?? [];
    const earlier = history.filter((h) => h.created_at < m.created_at);
    const later = history.filter((h) => h.created_at >= m.created_at);

    return (
        <IosSheet
            open={!!messageId}
            onOpenChange={(o) => { if (!o) onClose(); }}
            title={writer}
            subtitle={<>{m.email}{m.account ? ` · ${num(m.account.tests)} test${m.account.tests === 1 ? '' : 's'}` : ' · not signed in'}</>}
            headerExtra={
                <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip tone={s.tone}>{s.label}</Chip>
                    {deleted && <Chip tone="rose">Deleted by user</Chip>}
                    {m.topic && <Chip>{TOPIC_LABEL[m.topic] || m.topic}</Chip>}
                </div>
            }
        >
            <div className="space-y-5">
                {earlier.length > 0 && (
                    <section>
                        <p className={SECTION}>Earlier conversations · {earlier.length}</p>
                        <GroupedList>
                            {earlier.map((h) => <HistoryItem key={h.id} h={h} writer={writer} onOpen={setShownId} />)}
                        </GroupedList>
                    </section>
                )}

                {/* Conversation */}
                <section className="space-y-3">
                    {history.length > 0 && <p className={cn(SECTION, '!mb-0')}>This conversation</p>}
                    <Bubble ours={false} who={writer} body={m.message} at={m.created_at}>
                        <Screenshot url={m.screenshot_url} />
                        {m.context?.screenshot === 'upload failed' && (
                            <p className="mt-1 px-1 text-[12px] text-amber-700">They attached a screenshot but it failed to upload.</p>
                        )}
                    </Bubble>
                    <Thread writer={writer} thread={m.thread} />
                </section>

                {deleted ? (
                    <p className="rounded-2xl bg-slate-100 px-4 py-3 text-[13px] leading-relaxed text-slate-600">
                        {firstName(m)} deleted this conversation from their Help page on {istDateTime(m.user_deleted_at!)}.
                        It’s kept here as history: you can read it, but not reply to it or reopen it.
                    </p>
                ) : (
                    <>
                        {/* Reply */}
                        <section className={cn(CARD, 'p-3')}>
                            <textarea
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
                                rows={4}
                                placeholder={m.thread.some((t) => t.author === 'team') ? 'Write a follow-up…' : `Hi ${firstName(m)}, …`}
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
                                    ? `They see it on their Help page with a notification${emailsOn ? ', and by email from support@testoza.com.' : '. Email goes out once SMTP is set.'}`
                                    : emailsOn
                                        ? 'Not signed in: they get it by email from support@testoza.com.'
                                        : 'Not signed in and email is off: use Email or WhatsApp below so they actually get it.'}
                                {m.user_id && ' Once it’s resolved they can’t reply in it; anything new comes as a new conversation.'}
                            </p>
                        </section>
                    </>
                )}

                <div className="flex flex-wrap gap-2">
                    {!deleted && wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer"
                            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 text-[13px] font-semibold text-white hover:brightness-95">
                            <MessageCircle className="h-4 w-4" /> WhatsApp {m.phone}
                        </a>
                    )}
                    {!deleted && (
                        <a href={mailto(m.email, 'Re: your message to TestoZa', `Hi ${firstName(m)},\n\n`)} className={PILL_BTN}>
                            <Mail className="h-4 w-4 text-sky-600" /> Email
                        </a>
                    )}
                    {!deleted && (
                        <button type="button" onClick={toggleResolved} disabled={busy} className={PILL_BTN}>
                            {status === 'resolved'
                                ? <><RotateCcw className="h-4 w-4 text-slate-500" /> Reopen</>
                                : <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Mark resolved</>}
                        </button>
                    )}
                    <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy || confirmDelete}
                        className={cn(PILL_BTN, 'text-rose-700 hover:bg-rose-50')}>
                        <Trash2 className="h-4 w-4" /> Delete for good
                    </button>
                </div>

                {confirmDelete && (
                    <section className="rounded-2xl bg-rose-50 p-4 ring-1 ring-inset ring-rose-600/20" role="alertdialog" aria-label="Delete for good?">
                        <p className="text-[14px] font-semibold text-rose-900">Delete this conversation for good?</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-rose-900/80">
                            The message, every reply and the screenshot are removed from the database
                            {deleted ? '.' : ', and it disappears from their Help page.'} This can’t be undone.
                        </p>
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                            <button type="button" onClick={() => setConfirmDelete(false)} disabled={busy} className={PILL_BTN}>Cancel</button>
                            <button type="button" onClick={removeForGood} disabled={busy}
                                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-rose-600 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60">
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete for good
                            </button>
                        </div>
                    </section>
                )}

                {later.length > 0 && (
                    <section>
                        <p className={SECTION}>{later.length === 1 ? 'Newer conversation' : `Newer conversations · ${later.length}`}</p>
                        <GroupedList>
                            {later.map((h) => <HistoryItem key={h.id} h={h} writer={writer} onOpen={setShownId} />)}
                        </GroupedList>
                    </section>
                )}

                {/* Who and where */}
                <section>
                    <p className={SECTION}>Who and where</p>
                    <GroupedList>
                        <KeyValue label="Email">{m.email}</KeyValue>
                        {m.phone && <KeyValue label="Phone">{m.phone}</KeyValue>}
                        {m.account ? (
                            <>
                                {m.account.designation && <KeyValue label="Role">{roleLabel(m.account.designation)}</KeyValue>}
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
