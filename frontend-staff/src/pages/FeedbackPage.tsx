/** Platform feedback (sidebar Feedback page) and after-exam emoji ratings. Read-only. */
import { useInfiniteQuery } from '@tanstack/react-query';
import { MessageSquareHeart } from 'lucide-react';
import { Button, CARD, Chip, Empty, ErrorBox, PageTitle, Skeleton, cx } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { dateTime } from '@/lib/format';
import type { FeedbackRow } from '@/lib/types';

export const RATING_FACE: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '🤩' };
export const SOURCE_LABEL: Record<string, string> = { sidebar: 'Feedback page', exam_ended: 'After an exam' };
const PAGE = 30;

const PARTS: { key: 'conduct' | 'ai' | 'other'; label: string }[] = [
    { key: 'conduct', label: 'Online exam' },
    { key: 'ai', label: 'Generate with AI' },
    { key: 'other', label: 'Other' },
];

export default function FeedbackPage() {
    const q = useInfiniteQuery({
        queryKey: ['feedback'],
        queryFn: ({ pageParam }) => api<{ rows: FeedbackRow[]; total: number }>('/staff/feedback', { params: { limit: PAGE, offset: pageParam as number } }),
        initialPageParam: 0,
        getNextPageParam: (last, all) => (all.length * PAGE < last.total ? all.length * PAGE : undefined),
    });
    const rows = q.data?.pages.flatMap((p) => p.rows) ?? [];
    const rated = rows.filter((r) => r.rating);
    const avg = rated.length ? rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length : null;

    return (
        <>
            <PageTitle
                title="Feedback"
                subtitle={avg ? <>Average after-exam rating {RATING_FACE[Math.round(avg)]} {avg.toFixed(1)} of 5, from {rated.length} ratings shown</> : 'What educators tell us.'}
            />
            {q.isLoading ? (
                <Skeleton className="h-64 w-full" />
            ) : q.isError ? (
                <ErrorBox message={errorMessage(q.error)} onRetry={() => q.refetch()} />
            ) : !rows.length ? (
                <div className={CARD}><Empty icon={MessageSquareHeart} title="No feedback yet" /></div>
            ) : (
                <div className="space-y-3">
                    {rows.map((r) => (
                        <article key={r.id} className={cx(CARD, 'p-4')}>
                            <header className="flex flex-wrap items-center gap-2">
                                {r.rating ? <span className="text-[22px] leading-none" aria-label={`Rating ${r.rating} of 5`}>{RATING_FACE[r.rating]}</span> : null}
                                <span className="text-[14px] font-semibold text-slate-900">{r.name || 'An educator'}</span>
                                {r.designation && <span className="text-[13px] text-slate-500">{r.designation}</span>}
                                <Chip>{SOURCE_LABEL[r.source ?? ''] ?? r.source}</Chip>
                                {!r.read_at && <Chip tone="indigo">new</Chip>}
                                <span className="ml-auto text-[12px] text-slate-400">{dateTime(r.created_at)}</span>
                            </header>
                            {r.exam_title && <p className="mt-1 text-[12px] text-slate-500">Exam: {r.exam_title}</p>}
                            <div className="mt-2 space-y-2">
                                {PARTS.filter((p) => r[p.key]).map((p) => (
                                    <div key={p.key}>
                                        <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">{p.label}</p>
                                        <p className="prose-text text-[14px] leading-relaxed text-slate-700">{r[p.key]}</p>
                                    </div>
                                ))}
                                {!PARTS.some((p) => r[p.key]) && <p className="text-[13px] italic text-slate-400">Rating only, no note.</p>}
                            </div>
                        </article>
                    ))}
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
