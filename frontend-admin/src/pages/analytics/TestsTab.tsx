import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FileText, Search } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { insightsApi, type Period, type TestRow } from './api';
import { change, derive, num, pct, PREVIOUS_LABEL, ratio } from './format';
import { ErrorState } from './shared';
import { BarList, CARD, Card, Chip, Empty, Segmented, Skeleton, StatTile, TileSkeletons } from './ui';

type Sort = 'submissions' | 'starts' | 'viewers' | 'completion';

const TOOL_LABEL: Record<string, string> = {
    'edit-pdf': 'Edit PDF',
    'edit-hindi-pdf': 'Edit Hindi PDF',
    'latex-to-pdf': 'LaTeX to PDF',
    'chatgpt-to-pdf': 'ChatGPT to PDF',
};
const MODE_LABEL: Record<string, string> = { extract: 'From a file (extract)', generate: 'From a topic (generate)' };

export default function TestsTab({ period }: { period: Period }) {
    const q = useQuery({
        queryKey: ['analytics', 'tests', period],
        queryFn: () => insightsApi.tests(period),
        placeholderData: keepPreviousData,
        staleTime: 60_000,
    });
    const [sort, setSort] = useState<Sort>('submissions');
    const [filter, setFilter] = useState('');
    const [showAll, setShowAll] = useState(false);

    const rows = useMemo(() => {
        const list = (q.data?.tests ?? []).filter((t) => {
            const f = filter.trim().toLowerCase();
            return !f || t.title?.toLowerCase().includes(f) || t.creator_name?.toLowerCase().includes(f);
        });
        const key = (t: TestRow) => (sort === 'completion' ? (t.starts ? t.submissions / t.starts : -1) : t[sort]);
        return [...list].sort((a, b) => key(b) - key(a));
    }, [q.data, sort, filter]);

    if (q.error && !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
    const d = q.data;
    const s = d?.summary, p = d?.previous;
    const vs = `vs ${PREVIOUS_LABEL[period]}`;

    return (
        <div className={cn('space-y-4', q.isPlaceholderData && 'opacity-60')}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {s && p && d ? (
                    <>
                        <StatTile label="Tests created" value={num(s.tests_created)} delta={change(s.tests_created, p.tests_created)} deltaTitle={vs}
                            sub={`by ${num(d.created.creators)} educators · ${num(d.created.team)} by team`} />
                        <StatTile label="Test starts" value={num(s.test_starts)} delta={change(s.test_starts, p.test_starts)} deltaTitle={vs}
                            info="Registered starts plus guest (not signed-in) starts." />
                        <StatTile label="Tests taken" value={num(s.submissions)} delta={change(s.submissions, p.submissions)} deltaTitle={vs}
                            sub={`${pct(ratio(s.guest_submissions, s.submissions))} by guests`} />
                        <StatTile label="Completion" value={pct(derive(s).completionRate)}
                            info="Tests taken ÷ test starts in the period. Low completion points at tests that are too long, confusing or broken."
                            sub={`${num(s.ai_generations)} AI generations`} />
                    </>
                ) : <TileSkeletons count={4} />}
            </div>

            <section className={cn(CARD, 'min-w-0')}>
                <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
                    <div>
                        <h3 className="text-[15px] font-semibold text-slate-900">Test funnel</h3>
                        <p className="text-[13px] text-slate-500">Link views → starts → taken, for tests with activity in this period</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                            <input
                                type="search"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                placeholder="Search tests or creators"
                                aria-label="Search tests or creators"
                                className="h-8 w-52 rounded-lg border-transparent bg-slate-200/60 pl-8 pr-3 text-[13px] text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                            />
                        </div>
                        <Segmented size="sm" value={sort} onChange={setSort} ariaLabel="Sort by" options={[
                            { value: 'submissions', label: 'Taken' },
                            { value: 'starts', label: 'Starts' },
                            { value: 'viewers', label: 'Views' },
                            { value: 'completion', label: 'Completion' },
                        ]} />
                    </div>
                </header>
                <div className="px-2 pb-3 pt-2 sm:px-3">
                    {!d ? <Skeleton className="m-2 h-64" /> : rows.length === 0 ? (
                        <Empty icon={FileText} title="No test activity">Nobody viewed, started or took a test in this period.</Empty>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-[13px]">
                                <thead>
                                    <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                                        <th className="px-3 py-2 text-left">Test</th>
                                        <th className="px-2 py-2 text-right" title="Unique visitors on the test link">Viewers</th>
                                        <th className="px-2 py-2 text-right">Starts</th>
                                        <th className="px-2 py-2 text-right">Taken</th>
                                        <th className="px-2 py-2 text-right" title="Taken ÷ starts">Completion</th>
                                        <th className="px-3 py-2 text-right" title="Registered takers">Avg score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(showAll || filter ? rows : rows.slice(0, 15)).map((t) => {
                                        const completion = ratio(t.submissions, t.starts);
                                        return (
                                            <tr key={t.id} className="hover:bg-slate-50/80">
                                                <td className="max-w-[320px] px-3 py-2.5">
                                                    <span className="flex items-center gap-2">
                                                        <span className="truncate font-medium text-slate-900" title={t.title}>{t.title || 'Untitled test'}</span>
                                                        {t.is_team && <Chip tone="violet" title="Created by your team">Team</Chip>}
                                                        {!t.is_public && <Chip>Private</Chip>}
                                                    </span>
                                                    <span className="block truncate text-[12px] text-slate-500">
                                                        {t.creator_name || 'Unknown creator'}{t.guest_submissions ? ` · ${num(t.guest_submissions)} by guests` : ''}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{num(t.viewers)}</td>
                                                <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{num(t.starts)}</td>
                                                <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-slate-900">{num(t.submissions)}</td>
                                                <td className={cn('px-2 py-2.5 text-right tabular-nums',
                                                    completion !== null && completion < 40 ? 'font-semibold text-rose-600' : 'text-slate-700')}>
                                                    {completion === null ? '—' : pct(Math.min(completion, 100))}
                                                </td>
                                                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                                                    {t.avg_score_pct === null ? '—' : `${Math.round(Number(t.avg_score_pct))}%`}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {!filter && rows.length > 15 && (
                                <button type="button" onClick={() => setShowAll((v) => !v)}
                                    className="mt-1 w-full rounded-lg py-2 text-[13px] font-semibold text-sky-700 transition-colors hover:bg-sky-50">
                                    {showAll ? 'Show fewer' : `Show all ${rows.length} tests`}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card title="AI test generation" subtitle="Excluding your team">
                    {d ? (
                        <BarList valueLabel="Uses" extraLabels={['People']}
                            empty="No AI generations in this period."
                            rows={d.ai.map((r) => ({
                                id: r.key, label: MODE_LABEL[r.key] || r.key, value: r.count, display: num(r.count),
                                hint: `${num(r.questions)} questions`, extra: [num(r.users)],
                            }))} />
                    ) : <Skeleton className="h-32" />}
                </Card>
                <Card title="PDF tools downloads" subtitle="pdf.testoza.com — no account needed">
                    {d ? (
                        <BarList valueLabel="Files" extraLabels={['People']}
                            empty="No PDF downloads yet in this period."
                            rows={d.pdf.map((r) => ({
                                id: r.key, label: TOOL_LABEL[r.key] || r.key, value: r.count, display: num(r.count), extra: [num(r.visitors)],
                            }))} />
                    ) : <Skeleton className="h-32" />}
                </Card>
                <Card title="Tracked actions" subtitle="Custom events from the website">
                    {d ? (
                        <BarList valueLabel="Count" extraLabels={['People']}
                            empty="No custom events yet."
                            rows={d.events.map((r) => ({ id: r.key, label: <span className="font-mono text-[12.5px]">{r.key}</span>, value: r.count, display: num(r.count), extra: [num(r.visitors)] }))} />
                    ) : <Skeleton className="h-32" />}
                </Card>
            </div>
        </div>
    );
}
