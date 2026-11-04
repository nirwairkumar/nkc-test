/**
 * Email history: past sends and how people responded. View only. Composing and sending
 * stay in the admin panel (phase 2: drafts that the owner approves).
 */
import { useInfiniteQuery } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { Button, CARD, Chip, Empty, ErrorBox, PageTitle, Skeleton, cx } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { dateOnly, num } from '@/lib/format';
import type { CampaignRow } from '@/lib/types';

const PAGE = 30;
const STATUS = {
    sending: { label: 'Sending', tone: 'sky' as const },
    paused: { label: 'Paused', tone: 'amber' as const },
    done: { label: 'Finished', tone: 'slate' as const },
};

function Stat({ label, value, of, tone }: { label: string; value: number; of?: number; tone?: string }) {
    return (
        <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
            <p className={cx('text-[16px] font-bold text-slate-900', tone)}>
                {num(value)}
                {of ? <span className="ml-1 text-[12px] font-medium text-slate-400">{Math.round((value / of) * 100)}%</span> : null}
            </p>
        </div>
    );
}

export default function EmailPage() {
    const q = useInfiniteQuery({
        queryKey: ['email', 'campaigns'],
        queryFn: ({ pageParam }) => api<{ rows: CampaignRow[]; total: number }>('/staff/email/campaigns', { params: { limit: PAGE, offset: pageParam as number } }),
        initialPageParam: 0,
        getNextPageParam: (last, all) => (all.length * PAGE < last.total ? all.length * PAGE : undefined),
    });
    const rows = q.data?.pages.flatMap((p) => p.rows) ?? [];

    return (
        <>
            <PageTitle title="Email history" subtitle="“Came back” = opened TestoZa or made a test within 7 days of the email." />
            {q.isLoading ? (
                <Skeleton className="h-64 w-full" />
            ) : q.isError ? (
                <ErrorBox message={errorMessage(q.error)} onRetry={() => q.refetch()} />
            ) : !rows.length ? (
                <div className={CARD}><Empty icon={Mail} title="No emails sent yet" /></div>
            ) : (
                <div className="space-y-3">
                    {rows.map((c) => {
                        const st = STATUS[c.status] ?? STATUS.done;
                        return (
                            <article key={c.id} className={cx(CARD, 'p-4')}>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3 className="text-[15px] font-semibold text-slate-900">{c.subject}</h3>
                                        <p className="mt-0.5 text-[13px] text-slate-500">
                                            {c.audience_label} · from {c.from_name} · {dateOnly(c.created_at)}
                                        </p>
                                    </div>
                                    <Chip tone={st.tone}>{st.label}</Chip>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
                                    <Stat label="Sent" value={c.sent} />
                                    <Stat label="Came back" value={c.came_back} of={c.sent} tone="text-emerald-700" />
                                    <Stat label="Made a test" value={c.made_test ?? 0} of={c.sent} />
                                    <Stat label="Unsubscribed" value={c.unsubscribed} of={c.sent} />
                                    <Stat label="Failed" value={c.failed} />
                                </div>
                            </article>
                        );
                    })}
                    {q.hasNextPage && (
                        <Button variant="secondary" className="w-full" busy={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
                            Show older
                        </Button>
                    )}
                </div>
            )}
        </>
    );
}
