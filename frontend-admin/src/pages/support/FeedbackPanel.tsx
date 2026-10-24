/**
 * Admin → Support → Feedback: what creators say about TestoZa itself, from the app's
 * Feedback page (sidebar) and from the card that comes up after they stop a live exam.
 * Each send has up to three parts: Generate with AI, Conduct online exam, Other.
 *
 * Nobody waits for an answer here, so there is no reply box: tap a card to mark it read.
 * If it needs a conversation, the writer's email is one tap away.
 */
import { keepPreviousData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Mail, MessageSquareHeart } from 'lucide-react';
import React, { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { initials, istDateTime, num, relative } from '../analytics/format';
import { ErrorState, usePersisted } from '../analytics/shared';
import { CARD, Chip, Empty, PILL_BTN, Segmented, Skeleton } from '../analytics/ui';
import { roleLabel } from '../users/roles';
import { FEEDBACK_PART_LABEL, feedbackApi, type FeedbackView, type PlatformFeedback } from './api';

const VIEWS: readonly FeedbackView[] = ['unread', 'all'];
const PAGE = 30;

export default function FeedbackPanel({ focusId }: { focusId?: string | null }) {
    const [view, setView] = usePersisted<FeedbackView>('tz_admin_feedback_view', 'unread', VIEWS);
    const qc = useQueryClient();

    const list = useInfiniteQuery({
        queryKey: ['support', 'feedback', view],
        queryFn: ({ pageParam }) => feedbackApi.list({ view, limit: PAGE, offset: pageParam as number }),
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

    // A notification link (?section=feedback&id=…): show it even if it's already read.
    useEffect(() => {
        if (!focusId || !first || list.isPlaceholderData) return;
        const el = document.getElementById(`feedback-${focusId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        else if (view !== 'all') setView('all');
    }, [focusId, first, view, setView, list.isPlaceholderData]);

    const toggleRead = async (f: PlatformFeedback) => {
        try {
            await feedbackApi.setRead(f.id, !f.read_at);
            qc.invalidateQueries({ queryKey: ['support', 'feedback'] });
            qc.invalidateQueries({ queryKey: ['notifications'] });
        } catch {
            toast.error('Couldn’t update. Try again.');
        }
    };

    return (
        <div className="space-y-4">
            <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
                <Segmented<FeedbackView>
                    ariaLabel="Feedback"
                    value={view}
                    onChange={setView}
                    options={[
                        { value: 'unread', label: <CountLabel text="Unread" n={first?.counts.unread} accent /> },
                        { value: 'all', label: <CountLabel text="All" n={first?.counts.all} /> },
                    ]}
                />
            </div>

            {list.error && !list.data ? (
                <ErrorState error={list.error} onRetry={() => list.refetch()} />
            ) : !list.data ? (
                <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
            ) : rows.length === 0 ? (
                <div className={CARD}>
                    <Empty icon={view === 'unread' ? CheckCircle2 : MessageSquareHeart} title={view === 'unread' ? 'All read' : 'No feedback yet'}>
                        {view === 'unread'
                            ? 'Everything creators sent has been read.'
                            : 'It comes from the Feedback page in the app menu and after a creator stops an exam.'}
                    </Empty>
                </div>
            ) : (
                <>
                    <ul className={cn('space-y-3', list.isPlaceholderData && 'opacity-60')}>
                        {rows.map((f) => (
                            <FeedbackRow key={f.id} f={f} focused={f.id === focusId} onToggleRead={() => toggleRead(f)} />
                        ))}
                    </ul>
                    {list.hasNextPage && (
                        <div className="flex justify-center">
                            <button type="button" className={PILL_BTN} onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                                {list.isFetchingNextPage ? 'Loading…' : `Show more (${num((first?.total ?? 0) - rows.length)} left)`}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export function CountLabel({ text, n, accent }: { text: string; n?: number; accent?: boolean }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            {text}
            {n !== undefined && (
                <span className={cn('rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                    accent && n > 0 ? 'bg-sky-600 text-white' : 'bg-slate-900/[0.06] text-slate-500')}>
                    {n}
                </span>
            )}
        </span>
    );
}

function FeedbackRow({ f, focused, onToggleRead }: { f: PlatformFeedback; focused: boolean; onToggleRead: () => void }) {
    const name = f.account?.full_name || f.account?.email?.split('@')[0] || (f.user_id ? 'A creator' : 'Signed out');
    const unread = !f.read_at;
    const parts = FEEDBACK_PART_LABEL.filter((p) => (f[p.key] || '').trim());

    return (
        <li id={`feedback-${f.id}`} className={cn(CARD, 'overflow-hidden', focused && 'ring-2 ring-sky-500/40')}>
            <div className="flex items-start gap-3 px-4 pb-2 pt-3.5">
                {f.account?.avatar_url ? (
                    <img src={f.account.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-900/[0.06]" />
                ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-[12px] font-bold text-white">
                        {initials(name)}
                    </span>
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" aria-label="Unread" />}
                        <span className="truncate text-[14px] font-semibold text-slate-900">{name}</span>
                        {f.account?.designation && <Chip>{roleLabel(f.account.designation)}</Chip>}
                        {f.source === 'exam_ended'
                            ? <Chip tone="violet" title="Sent from the card after stopping an exam">After exam{f.exam_title ? `: ${f.exam_title}` : ''}</Chip>
                            : <Chip tone="sky" title="Sent from the Feedback page in the app menu">Feedback page</Chip>}
                    </div>
                    <p className="mt-0.5 text-[12px] text-slate-400" title={istDateTime(f.created_at)}>
                        {relative(f.created_at)}{f.account?.email ? ` · ${f.account.email}` : ''}
                    </p>
                </div>
            </div>

            <dl className="mx-4 mb-3 divide-y divide-slate-100 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-900/[0.04]">
                {parts.map((p) => (
                    <div key={p.key} className="px-3.5 py-2.5">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                            {p.key === 'other' ? 'Other' : `For: ${p.label}`}
                        </dt>
                        <dd className="mt-0.5 whitespace-pre-line text-[14px] leading-relaxed text-slate-800">{f[p.key]}</dd>
                    </div>
                ))}
            </dl>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-2">
                {f.account?.email && (
                    <a
                        href={`mailto:${f.account.email}?subject=${encodeURIComponent('Your feedback on TestoZa')}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                    >
                        <Mail className="h-3.5 w-3.5" /> Email
                    </a>
                )}
                <button
                    type="button"
                    onClick={onToggleRead}
                    className={cn('inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-colors',
                        unread ? 'bg-sky-600 text-white hover:bg-sky-700' : 'text-slate-500 hover:bg-slate-100')}
                >
                    {unread ? <><CheckCircle2 className="h-3.5 w-3.5" /> Mark read</> : 'Mark unread'}
                </button>
            </div>
        </li>
    );
}
