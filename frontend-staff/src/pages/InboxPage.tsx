/** Team inbox: new help messages and feedback, newest first. */
import { Bell, LifeBuoy, MessageSquareHeart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInbox } from '@/components/Shell';
import { CARD, Chip, Empty, ErrorBox, PageTitle, Skeleton, cx } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { relative } from '@/lib/format';
import type { InboxEvent } from '@/lib/types';
import { RATING_FACE, SOURCE_LABEL } from './FeedbackPage';
import { STATUS } from './SupportPage';

export default function InboxPage() {
    const q = useInbox();
    const navigate = useNavigate();

    const open = (e: InboxEvent) => {
        if (e.kind === 'support' && q.data?.can_open.support) navigate(`/support/${e.id}`);
        if (e.kind === 'feedback' && q.data?.can_open.feedback) navigate('/feedback');
    };

    return (
        <>
            <PageTitle title="Inbox" subtitle="Updates every minute. Help messages and feedback as they arrive." />
            {q.isLoading ? (
                <Skeleton className="h-64 w-full" />
            ) : q.isError ? (
                <ErrorBox message={errorMessage(q.error)} onRetry={() => q.refetch()} />
            ) : !q.data?.events.length ? (
                <div className={CARD}><Empty icon={Bell} title="All quiet">New help messages and feedback will show up here.</Empty></div>
            ) : (
                <>
                    <div className="mb-3 flex flex-wrap gap-2">
                        <Chip tone={q.data.counts.support_waiting ? 'amber' : 'slate'}>{q.data.counts.support_waiting} help messages waiting</Chip>
                        <Chip tone={q.data.counts.feedback_unread ? 'indigo' : 'slate'}>{q.data.counts.feedback_unread} unread feedback</Chip>
                    </div>
                    <ul className={cx(CARD, 'divide-y divide-slate-100 overflow-hidden')}>
                        {q.data.events.map((e) => {
                            const clickable = e.kind === 'support' ? q.data.can_open.support : q.data.can_open.feedback;
                            const status = e.kind === 'support' ? STATUS[(e.status as keyof typeof STATUS) ?? 'pending'] ?? STATUS.pending : null;
                            return (
                                <li key={`${e.kind}-${e.id}`}>
                                    <button
                                        type="button"
                                        disabled={!clickable}
                                        onClick={() => open(e)}
                                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors enabled:hover:bg-slate-50 disabled:cursor-default"
                                    >
                                        <span className={cx(
                                            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                                            e.kind === 'support' ? 'bg-sky-50 text-sky-600' : 'bg-indigo-50 text-indigo-600',
                                        )}>
                                            {e.kind === 'support' ? <LifeBuoy className="h-4 w-4" /> : <MessageSquareHeart className="h-4 w-4" />}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-1.5">
                                                <span className="text-[14px] font-semibold text-slate-900">{e.title}</span>
                                                {status && <Chip tone={status.tone}>{status.label}</Chip>}
                                                {e.kind === 'feedback' && e.rating ? <span className="text-[16px]" aria-label={`Rating ${e.rating} of 5`}>{RATING_FACE[e.rating]}</span> : null}
                                                {e.kind === 'feedback' && e.source && <Chip>{SOURCE_LABEL[e.source] ?? e.source}</Chip>}
                                                {e.unread && <Chip tone="indigo">new</Chip>}
                                            </span>
                                            {e.topic && <span className="mt-0.5 block text-[12px] font-medium text-slate-500">{e.topic}</span>}
                                            {e.text && <span className="mt-0.5 block truncate text-[13px] text-slate-600">{e.text}</span>}
                                        </span>
                                        <span className="shrink-0 text-[12px] text-slate-400">{relative(e.at)}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </>
    );
}
