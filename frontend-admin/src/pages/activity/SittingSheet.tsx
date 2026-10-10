/**
 * One sitting, candidate by candidate: what they typed at the gate, what they
 * scored, how much of the paper they touched and how long they stayed.
 * This is the view that tells a blank paper from a real attempt.
 */
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, FileWarning, Users } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
import { istDate, istTime, num, pct } from '../analytics/format';
import { ErrorState } from '../analytics/shared';
import { Chip, Empty, IosSheet, PILL_BTN, Skeleton } from '../analytics/ui';
import { examOpsApi, type Sitting } from './api';

export default function SittingSheet({
    sitting, onClose, onOpenResults,
}: {
    sitting: Sitting | null;
    onClose: () => void;
    onOpenResults: (test: { id: string; title: string }) => void;
}) {
    const q = useQuery({
        queryKey: ['exam-ops', 'sitting', sitting?.test_id, sitting?.day],
        queryFn: () => examOpsApi.sitting(sitting!.test_id, sitting!.day),
        enabled: !!sitting,
        staleTime: 30_000,
    });

    const rows = q.data?.rows ?? [];
    const scored = rows.filter((r) => r.score_pct !== null);
    const median = scored.length
        ? [...scored].sort((a, b) => (a.score_pct! - b.score_pct!))[Math.floor(scored.length / 2)].score_pct
        : null;
    const minutes = rows.map((r) => r.minutes_taken).filter((m): m is number => typeof m === 'number');

    return (
        <IosSheet
            open={!!sitting}
            onOpenChange={(open) => !open && onClose()}
            title={sitting?.title || 'Sitting'}
            subtitle={sitting ? `${istDate(`${sitting.day}T00:00:00+05:30`)} · ${sitting.candidates} candidate${sitting.candidates === 1 ? '' : 's'} · ${sitting.educator?.name || 'unknown educator'}` : undefined}
        >
            {!sitting ? null : q.error ? (
                <ErrorState error={q.error} onRetry={() => q.refetch()} />
            ) : !q.data ? (
                <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Fact label="Papers in" value={num(rows.length)} />
                        <Fact label="Median score" value={median === null ? '—' : pct(median)} />
                        <Fact label="Blank papers" value={num(rows.filter((r) => r.is_blank).length)} tone={rows.some((r) => r.is_blank) ? 'amber' : undefined} />
                        <Fact
                            label="Time taken"
                            value={minutes.length ? `${Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length)} min` : '—'}
                            sub={sitting.duration ? `of ${sitting.duration} allowed` : undefined}
                        />
                    </div>

                    {sitting.window_minutes !== null && (
                        <p className="px-1 text-[12.5px] text-slate-500">
                            Papers arrived between <b className="font-semibold text-slate-700">{sitting.first_at ? istTime(sitting.first_at) : '—'}</b> and{' '}
                            <b className="font-semibold text-slate-700">{sitting.last_at ? istTime(sitting.last_at) : '—'}</b> IST
                            {sitting.window_minutes > 0 ? ` — a ${sitting.window_minutes}-minute window.` : ' — all at once.'}
                            {sitting.window_minutes > 240 && ' That is wider than one supervised sitting; this may be homework rather than an exam.'}
                        </p>
                    )}

                    {rows.length === 0 ? (
                        <Empty icon={Users} title="No papers found">
                            The submissions for this day are no longer in the database.
                        </Empty>
                    ) : (
                        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/[0.06]">
                            {rows.map((r) => (
                                <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-center gap-1.5">
                                            <span className="truncate text-[13.5px] font-medium text-slate-900">{r.name}</span>
                                            {r.roll && <span className="font-mono text-[11.5px] text-slate-400">{r.roll}</span>}
                                            {r.is_blank && <Chip tone="amber"><FileWarning className="h-3 w-3" /> Blank</Chip>}
                                            {r.violations > 0 && <Chip tone="rose"><AlertTriangle className="h-3 w-3" /> {r.violations}</Chip>}
                                            {!r.is_candidate_login && r.email && <Chip tone="sky" title={r.email}>Account</Chip>}
                                        </span>
                                        <span className="mt-0.5 block text-[12px] text-slate-500">
                                            {r.attempted !== null && r.total_questions
                                                ? `${r.attempted} of ${r.total_questions} answered`
                                                : r.attempted !== null ? `${r.attempted} answered` : 'Answers not recorded'}
                                            {typeof r.minutes_taken === 'number' ? ` · ${r.minutes_taken} min` : ''}
                                            {` · submitted ${istTime(r.submitted_at)}`}
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-right">
                                        <span className={cn('block text-[15px] font-semibold tabular-nums',
                                            r.score_pct === null ? 'text-slate-400'
                                                : r.score_pct >= 60 ? 'text-emerald-700'
                                                    : r.score_pct >= 33 ? 'text-slate-900' : 'text-rose-600')}>
                                            {r.score_pct === null ? '—' : pct(r.score_pct)}
                                        </span>
                                        <span className="block text-[11px] tabular-nums text-slate-400">
                                            {r.score === null ? '' : `${r.score}${r.max_marks ? ` / ${r.max_marks}` : ''}`}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!sitting.deleted && (
                        <button
                            type="button"
                            onClick={() => { onOpenResults({ id: sitting.test_id, title: sitting.title }); onClose(); }}
                            className={cn(PILL_BTN, 'w-full justify-center')}
                        >
                            Open the full result sheet for this test
                        </button>
                    )}

                    <p className="px-1 text-[12px] leading-relaxed text-slate-400">
                        Names come from the sign-in form the educator set up, so they are only as accurate as what candidates typed.
                        The full result sheet covers every day this test ran; this list is just {istDate(`${sitting.day}T00:00:00+05:30`)}.
                    </p>
                </div>
            )}
        </IosSheet>
    );
}

function Fact({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'amber' }) {
    return (
        <div className={cn('rounded-xl px-3 py-2.5 ring-1 ring-inset', tone === 'amber' ? 'bg-amber-50 ring-amber-600/20' : 'bg-white ring-slate-900/[0.06]')}>
            <p className="text-[11.5px] font-medium text-slate-500">{label}</p>
            <p className="mt-0.5 text-[19px] font-semibold leading-none tabular-nums text-slate-900">{value}</p>
            {sub && <p className="mt-1 text-[11px] text-slate-400">{sub}</p>}
        </div>
    );
}
