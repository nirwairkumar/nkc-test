/**
 * Support: help messages from educators. List on the left, the conversation on the right
 * (one at a time on phones). Messages are shown as plain text: never as HTML, never
 * with clickable links, so a message can't run code or trick you into a phishing page.
 *
 * The writer's other conversations sit around the open one, folded to a line each:
 * earlier ones above, a newer one below. One the writer deleted from their Help page is
 * read-only history: no reply, no reopen.
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, ChevronDown, ImageIcon, LifeBuoy, Loader2, RotateCcw, Send } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/components/Toast';
import { Button, CARD, Chip, Empty, ErrorBox, PageTitle, Skeleton, cx } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { dateOnly, dateTime, relative } from '@/lib/format';
import type { SupportHistoryItem, SupportList, SupportMessage, SupportTurn, SupportView } from '@/lib/types';

export const STATUS = {
    pending: { label: 'Waiting', tone: 'amber' as const },
    replied: { label: 'Replied', tone: 'sky' as const },
    resolved: { label: 'Resolved', tone: 'emerald' as const },
};

const VIEWS: { value: SupportView; label: string }[] = [
    { value: 'open', label: 'Waiting' },
    { value: 'replied', label: 'Replied' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'all', label: 'All' },
];
const PAGE = 30;

function statusOf(s: string | null | undefined) {
    return STATUS[(s as keyof typeof STATUS) ?? 'pending'] ?? STATUS.pending;
}

function ConversationList({ activeId, view, setView }: { activeId?: string; view: SupportView; setView: (v: SupportView) => void }) {
    const q = useInfiniteQuery({
        queryKey: ['support', 'list', view],
        queryFn: ({ pageParam }) => api<SupportList>('/staff/support/messages', { params: { view, limit: PAGE, offset: pageParam as number } }),
        initialPageParam: 0,
        getNextPageParam: (last, all) => (all.length * PAGE < last.total ? all.length * PAGE : undefined),
        refetchInterval: 60_000,
    });
    const counts = q.data?.pages[0]?.counts;
    const rows = q.data?.pages.flatMap((p) => p.rows) ?? [];

    return (
        <div className="space-y-3">
            <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-200/60 p-1" role="tablist" aria-label="Filter">
                {VIEWS.map((v) => (
                    <button
                        key={v.value}
                        type="button"
                        role="tab"
                        aria-selected={view === v.value}
                        onClick={() => setView(v.value)}
                        className={cx(
                            'flex-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition-colors',
                            view === v.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
                        )}
                    >
                        {v.label}{counts ? ` ${counts[v.value]}` : ''}
                    </button>
                ))}
            </div>

            {q.isLoading ? (
                <Skeleton className="h-64 w-full" />
            ) : q.isError ? (
                <ErrorBox message={errorMessage(q.error)} onRetry={() => q.refetch()} />
            ) : !rows.length ? (
                <div className={CARD}>
                    <Empty icon={LifeBuoy} title={view === 'open' ? 'Nothing waiting' : 'No conversations here'}>
                        {view === 'open' ? 'Every help message has an answer. Nice.' : 'Try another filter.'}
                    </Empty>
                </div>
            ) : (
                <ul className={cx(CARD, 'divide-y divide-slate-100 overflow-hidden')}>
                    {rows.map((r) => {
                        const st = statusOf(r.status);
                        if (r.user_deleted_at) {
                            // Deleted by the writer: history, folded to one muted line.
                            return (
                                <li key={r.id}>
                                    <Link
                                        to={`/support/${r.id}`}
                                        className={cx('block px-4 py-2.5 opacity-70 transition-[background-color,opacity] hover:bg-slate-50 hover:opacity-100', activeId === r.id && 'bg-indigo-50/60 opacity-100')}
                                    >
                                        <span className="flex items-center gap-2">
                                            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-700">{r.name || 'Someone'}</span>
                                            <Chip tone="rose">Deleted by user</Chip>
                                            <span className="shrink-0 text-[12px] text-slate-400">{relative(r.last_activity_at || r.created_at)}</span>
                                        </span>
                                        <span className="mt-0.5 block truncate text-[12px] text-slate-500">{r.message}</span>
                                    </Link>
                                </li>
                            );
                        }
                        return (
                            <li key={r.id}>
                                <Link
                                    to={`/support/${r.id}`}
                                    className={cx('block px-4 py-3 transition-colors hover:bg-slate-50', activeId === r.id && 'bg-indigo-50/60')}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-slate-900">{r.name || 'Someone'}</span>
                                        <span className="shrink-0 text-[12px] text-slate-400">{relative(r.last_activity_at || r.created_at)}</span>
                                    </span>
                                    <span className="mt-0.5 flex items-center gap-1.5">
                                        <Chip tone={st.tone}>{st.label}</Chip>
                                        {r.topic && <span className="truncate text-[12px] font-medium text-slate-500">{r.topic}</span>}
                                    </span>
                                    <span className="mt-1 block truncate text-[13px] text-slate-600">{r.message}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
            {q.hasNextPage && (
                <Button variant="secondary" size="sm" className="w-full" busy={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
                    Show more
                </Button>
            )}
        </div>
    );
}

function Bubble({ who, at, mine, children }: { who: string; at: string; mine: boolean; children: React.ReactNode }) {
    return (
        <div className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
            <div className={cx('max-w-[88%] rounded-2xl px-4 py-2.5', mine ? 'bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-900/[0.08]')}>
                <p className={cx('mb-1 text-[11px] font-semibold', mine ? 'text-slate-300' : 'text-slate-500')}>
                    {who} · {dateTime(at)}
                </p>
                <div className="prose-text text-[14px] leading-relaxed">{children}</div>
            </div>
        </div>
    );
}

function Screenshot({ url }: { url?: string | null }) {
    if (!url) return null;
    return (
        <div className="flex justify-start">
            <a href={url} target="_blank" rel="noopener noreferrer" className="block max-w-[88%] overflow-hidden rounded-2xl ring-1 ring-slate-900/[0.08]">
                <img src={url} alt="Screenshot they attached" className="max-h-72 w-auto bg-white" referrerPolicy="no-referrer" />
                <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 text-[12px] text-slate-500"><ImageIcon className="h-3.5 w-3.5" /> Open full size</span>
            </a>
        </div>
    );
}

function Turns({ name, thread }: { name: string; thread: SupportTurn[] }) {
    return (
        <>
            {thread.map((t) => (
                <Bubble key={t.id} who={t.author === 'team' ? 'Team TestoZa' : name} at={t.created_at} mine={t.author === 'team'}>
                    {t.body}
                </Bubble>
            ))}
        </>
    );
}

const SECTION = 'mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400';

/** Another conversation from the same writer, folded to one line until clicked. */
function HistoryItem({ h, name }: { h: SupportHistoryItem; name: string }) {
    const [open, setOpen] = useState(false);
    const st = statusOf(h.status);
    return (
        <li>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
            >
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[12px] font-medium text-slate-500">{dateOnly(h.created_at)}</span>
                        <Chip tone={st.tone}>{st.label}</Chip>
                        {h.user_deleted_at && <Chip tone="rose">Deleted by user</Chip>}
                        {h.topic && <span className="text-[12px] font-medium text-slate-500">{h.topic}</span>}
                    </span>
                    {!open && <span className="mt-0.5 block truncate text-[13px] text-slate-600">{h.message}</span>}
                </span>
                <ChevronDown className={cx('mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden="true" />
            </button>
            {open && (
                <div className="space-y-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
                    <Bubble who={name} at={h.created_at} mine={false}>{h.message}</Bubble>
                    <Screenshot url={h.screenshot_url} />
                    <Turns name={name} thread={h.thread} />
                    {!h.user_deleted_at && (
                        <div className="flex justify-center pt-1">
                            <Link to={`/support/${h.id}`} className="text-[13px] font-semibold text-indigo-700 hover:text-indigo-800">
                                Open this conversation
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </li>
    );
}

function HistoryList({ title, items, name }: { title: string; items: SupportHistoryItem[]; name: string }) {
    if (!items.length) return null;
    return (
        <section>
            <p className={SECTION}>{title}</p>
            <ul className={cx(CARD, 'divide-y divide-slate-100 overflow-hidden')}>
                {items.map((h) => <HistoryItem key={h.id} h={h} name={name} />)}
            </ul>
        </section>
    );
}

function Conversation({ id }: { id: string }) {
    const qc = useQueryClient();
    const toast = useToast();
    const navigate = useNavigate();
    const [reply, setReply] = useState('');
    useEffect(() => setReply(''), [id]);

    const q = useQuery({
        queryKey: ['support', 'one', id],
        queryFn: () => api<SupportMessage>(`/staff/support/messages/${encodeURIComponent(id)}`),
    });

    const refresh = () => {
        void qc.invalidateQueries({ queryKey: ['support'] });
        void qc.invalidateQueries({ queryKey: ['inbox'] });
    };

    const send = useMutation({
        mutationFn: (resolve: boolean) =>
            api<{ emailed: boolean; notified: boolean }>(`/staff/support/messages/${encodeURIComponent(id)}/reply`, {
                method: 'POST', body: { reply, resolve },
            }),
        onSuccess: (res) => {
            setReply('');
            refresh();
            toast(res.emailed ? 'Sent to their Help page and email.' : 'Sent to their Help page.');
        },
        onError: (err) => toast(errorMessage(err), 'error'),
    });

    const setStatus = useMutation({
        mutationFn: (status: 'pending' | 'resolved') =>
            api(`/staff/support/messages/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } }),
        onSuccess: (_r, status) => {
            refresh();
            toast(status === 'resolved' ? 'Marked resolved.' : 'Moved back to waiting.');
        },
        onError: (err) => toast(errorMessage(err), 'error'),
    });

    if (q.isLoading) return <Skeleton className="h-96 w-full" />;
    if (q.isError || !q.data) return <ErrorBox message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
    const m = q.data;
    const st = statusOf(m.status);
    const deleted = !!m.user_deleted_at;
    const name = m.name || 'They';
    const history = m.history ?? [];
    const earlier = history.filter((h) => h.created_at < m.created_at);
    const later = history.filter((h) => h.created_at >= m.created_at);

    return (
        <div className="space-y-4">
            <button type="button" onClick={() => navigate('/support')} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-slate-600 xl:hidden">
                <ArrowLeft className="h-4 w-4" /> All conversations
            </button>

            <section className={cx(CARD, 'p-4')}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-[18px] font-bold tracking-[-0.01em] text-slate-900">{m.name || 'Someone'}</h2>
                        <p className="mt-0.5 text-[13px] text-slate-500">
                            {[m.email, m.phone].filter(Boolean).join(' · ') || 'No contact details'}
                            {m.contact_masked && <span className="ml-1 text-[12px] text-slate-400">(hidden for privacy)</span>}
                        </p>
                    </div>
                    <span className="flex flex-wrap gap-1.5">
                        <Chip tone={st.tone}>{st.label}</Chip>
                        {deleted && <Chip tone="rose">Deleted by user</Chip>}
                    </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-3">
                    {m.topic && <div><dt className="text-slate-500">Topic</dt><dd className="font-medium text-slate-900">{m.topic}</dd></div>}
                    <div><dt className="text-slate-500">Sent</dt><dd className="font-medium text-slate-900">{dateTime(m.created_at)}</dd></div>
                    {m.account ? (
                        <>
                            <div><dt className="text-slate-500">Account</dt><dd className="font-medium text-slate-900">{m.account.designation || 'No role set'}</dd></div>
                            <div><dt className="text-slate-500">Tests made</dt><dd className="font-medium text-slate-900">{m.account.tests}</dd></div>
                            {m.account.joined_at && <div><dt className="text-slate-500">Joined</dt><dd className="font-medium text-slate-900">{dateOnly(m.account.joined_at)}</dd></div>}
                        </>
                    ) : (
                        <div><dt className="text-slate-500">Account</dt><dd className="font-medium text-slate-900">Not signed in</dd></div>
                    )}
                    {m.context?.from && <div className="col-span-2 sm:col-span-3"><dt className="text-slate-500">Was on page</dt><dd className="truncate font-mono text-[12px] text-slate-700">{m.context.from}</dd></div>}
                </dl>
            </section>

            <HistoryList title={`Earlier conversations · ${earlier.length}`} items={earlier} name={name} />

            <section className="space-y-3">
                {history.length > 0 && <p className={cx(SECTION, '!mb-0')}>This conversation</p>}
                <Bubble who={name} at={m.created_at} mine={false}>{m.message}</Bubble>
                <Screenshot url={m.screenshot_url} />
                <Turns name={name} thread={m.thread} />
            </section>

            {deleted ? (
                <p className="rounded-2xl bg-slate-100 px-4 py-3 text-[13px] leading-relaxed text-slate-600">
                    They deleted this conversation from their Help page on {dateTime(m.user_deleted_at!)}. It’s kept here as
                    history: you can read it, but not reply to it or reopen it.
                </p>
            ) : m.can_reply ? (
                <section className={cx(CARD, 'p-4')}>
                    <label htmlFor="reply" className="text-[13px] font-semibold text-slate-700">Your reply</label>
                    <textarea
                        id="reply"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        maxLength={5000}
                        rows={5}
                        // Writing-assistant extensions upload what's typed; replies can quote people's details.
                        data-gramm="false"
                        data-gramm_editor="false"
                        data-enable-grammarly="false"
                        placeholder="Hi! Here’s how to…"
                        className="mt-1.5 w-full resize-y rounded-xl bg-white px-3.5 py-3 text-[15px] leading-relaxed text-slate-900 ring-1 ring-slate-900/[0.12] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                    />
                    <p className="mt-1 text-[12px] text-slate-500">
                        Goes to their Help page{m.emails_on ? ' and their email' : ''}, signed “TestoZa”. Never ask for passwords or payment details.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Button onClick={() => send.mutate(false)} busy={send.isPending && send.variables === false} disabled={!reply.trim() || send.isPending}>
                            <Send className="h-4 w-4" /> Send
                        </Button>
                        <Button variant="secondary" onClick={() => send.mutate(true)} busy={send.isPending && send.variables === true} disabled={!reply.trim() || send.isPending}>
                            Send and resolve
                        </Button>
                        <span className="flex-1" />
                        {m.status === 'resolved' ? (
                            <Button variant="ghost" onClick={() => setStatus.mutate('pending')} disabled={setStatus.isPending}>
                                {setStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Reopen
                            </Button>
                        ) : (
                            <Button variant="ghost" onClick={() => setStatus.mutate('resolved')} disabled={setStatus.isPending}>
                                {setStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Mark resolved
                            </Button>
                        )}
                    </div>
                </section>
            ) : (
                <p className="rounded-2xl bg-slate-100 px-4 py-3 text-[13px] text-slate-600">You can read conversations but not reply. Ask your admin if you need to.</p>
            )}

            <HistoryList title={later.length === 1 ? 'Newer conversation' : `Newer conversations · ${later.length}`} items={later} name={name} />
        </div>
    );
}

export default function SupportPage() {
    const { id } = useParams();
    const [view, setView] = useState<SupportView>('open');

    return (
        <>
            {/* Side by side only when there's room (sidebar + list + conversation). */}
            <div className={cx(id && 'hidden xl:block')}>
                <PageTitle title="Support" subtitle="Help messages from educators and visitors." />
            </div>
            <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
                <div className={cx(id && 'hidden xl:block')}>
                    <ConversationList activeId={id} view={view} setView={setView} />
                </div>
                <div className={cx(!id && 'hidden xl:block')}>
                    {id ? (
                        <Conversation id={id} />
                    ) : (
                        <div className={CARD}>
                            <Empty icon={LifeBuoy} title="Pick a conversation">Choose a message on the left to read and answer it.</Empty>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
