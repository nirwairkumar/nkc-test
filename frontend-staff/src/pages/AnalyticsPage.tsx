/**
 * Analytics: the same aggregate reports admin sees (Overview + Growth), numbers only.
 * No people list, no sessions, nobody's identity. Charts are plain SVG/CSS (no chart
 * library, nothing that injects styles past the CSP).
 */
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { CARD, ErrorBox, PageTitle, Skeleton, cx } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { bucketLabel, change, num } from '@/lib/format';
import type { BreakdownRow, GrowthReport, Overview, SeriesPoint } from '@/lib/types';

const PERIODS = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
    { value: '12m', label: '12 months' },
] as const;
type Period = (typeof PERIODS)[number]['value'];

function Delta({ cur, prev }: { cur: number; prev: number }) {
    const d = change(cur, prev);
    if (d === null || !Number.isFinite(d)) return <span className="text-[12px] text-slate-400">new</span>;
    const up = d >= 0;
    return (
        <span className={cx('inline-flex items-center gap-0.5 text-[12px] font-semibold', up ? 'text-emerald-600' : 'text-rose-600')}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(d).toFixed(0)}%
        </span>
    );
}

function Tile({ label, cur, prev }: { label: string; cur: number; prev: number }) {
    return (
        <div className={cx(CARD, 'px-4 py-3.5')}>
            <p className="text-[12px] font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-[24px] font-bold tracking-[-0.02em] text-slate-900">{num(cur)}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-slate-400"><Delta cur={cur} prev={prev} /> vs before</p>
        </div>
    );
}

/** Bars per time bucket, drawn as divs so they scale with the container. */
function Bars({ series, field, bucket }: { series: SeriesPoint[]; field: keyof SeriesPoint; bucket: string }) {
    const values = series.map((p) => Number(p[field]) || 0);
    const max = Math.max(1, ...values);
    const step = Math.max(1, Math.ceil(series.length / 8));
    return (
        <div>
            <div className="flex h-40 items-end gap-[3px]" role="img" aria-label={`${String(field)} over time`}>
                {series.map((p, i) => (
                    <div key={p.t} className="group relative flex h-full flex-1 items-end">
                        <div className="w-full rounded-t-[4px] bg-indigo-500/80 group-hover:bg-indigo-600" style={{ height: `${(values[i] / max) * 100}%`, minHeight: values[i] ? 2 : 0 }} />
                        <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-1.5 py-0.5 text-[11px] text-white group-hover:block">
                            {bucketLabel(p.t, bucket)}: {num(values[i])}
                        </span>
                    </div>
                ))}
            </div>
            <div className="mt-1.5 flex gap-[3px] text-[10px] text-slate-400">
                {series.map((p, i) => (
                    <span key={p.t} className="flex-1 truncate text-center">{i % step === 0 ? bucketLabel(p.t, bucket) : ''}</span>
                ))}
            </div>
        </div>
    );
}

function TopList({ title, rows, label }: { title: string; rows: BreakdownRow[]; label?: (r: BreakdownRow) => string }) {
    const max = Math.max(1, ...rows.map((r) => r.visitors));
    return (
        <section className={cx(CARD, 'p-4')}>
            <h3 className="mb-2 text-[14px] font-semibold text-slate-900">{title}</h3>
            {!rows.length ? <p className="text-[13px] text-slate-400">No data</p> : (
                <ul className="space-y-1.5">
                    {rows.slice(0, 8).map((r) => (
                        <li key={r.key} className="relative overflow-hidden rounded-lg px-2.5 py-1.5">
                            <div className="absolute inset-y-0 left-0 rounded-lg bg-indigo-50" style={{ width: `${(r.visitors / max) * 100}%` }} />
                            <div className="relative flex items-center justify-between gap-3 text-[13px]">
                                <span className="truncate text-slate-700">{label ? label(r) : r.label || r.key || '(none)'}</span>
                                <span className="shrink-0 font-semibold text-slate-900">{num(r.visitors)}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default function AnalyticsPage() {
    const [period, setPeriod] = useState<Period>('7d');
    const [metric, setMetric] = useState<'visitors' | 'signups' | 'submissions'>('visitors');

    const overview = useQuery({
        queryKey: ['analytics', 'overview', period],
        queryFn: () => api<Overview>('/staff/analytics/overview', { params: { period } }),
    });
    const growthPeriod = period === 'today' || period === '7d' ? '30d' : period;
    const growth = useQuery({
        queryKey: ['analytics', 'growth', growthPeriod],
        queryFn: () => api<GrowthReport>('/staff/analytics/growth', { params: { period: growthPeriod } }),
    });

    const o = overview.data;
    return (
        <>
            <PageTitle title="Analytics" subtitle="All of TestoZa’s sites, compared with the period before. India time." />

            <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-200/60 p-1" role="tablist" aria-label="Period">
                {PERIODS.map((p) => (
                    <button
                        key={p.value}
                        type="button"
                        role="tab"
                        aria-selected={period === p.value}
                        onClick={() => setPeriod(p.value)}
                        className={cx('flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold', period === p.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600')}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {overview.isError ? (
                <ErrorBox message={errorMessage(overview.error)} onRetry={() => overview.refetch()} />
            ) : !o ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
            ) : (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Tile label="Visitors" cur={o.summary.visitors} prev={o.previous.visitors} />
                        <Tile label="Sign-ups" cur={o.summary.signups} prev={o.previous.signups} />
                        <Tile label="Tests created" cur={o.summary.tests_created} prev={o.previous.tests_created} />
                        <Tile label="Tests submitted" cur={o.summary.submissions} prev={o.previous.submissions} />
                    </div>

                    <section className={cx(CARD, 'p-4')}>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-[14px] font-semibold text-slate-900">Over time</h3>
                            <div className="flex gap-1">
                                {(['visitors', 'signups', 'submissions'] as const).map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setMetric(m)}
                                        className={cx('rounded-full px-3 py-1 text-[12px] font-semibold', metric === m ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600')}
                                    >
                                        {m === 'visitors' ? 'Visitors' : m === 'signups' ? 'Sign-ups' : 'Submitted'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Bars series={o.series} field={metric} bucket={o.range.bucket} />
                    </section>

                    <div className="grid gap-3 md:grid-cols-2">
                        <TopList title="Where visitors came from" rows={o.channels} />
                        <TopList title="Top pages" rows={o.pages} />
                        <TopList title="Countries" rows={o.countries} />
                        <TopList title="Devices" rows={o.devices} />
                    </div>
                </div>
            )}

            <h2 className="mb-3 mt-8 text-[18px] font-bold tracking-[-0.01em] text-slate-900">
                Educator growth <span className="text-[13px] font-medium text-slate-500">({PERIODS.find((p) => p.value === growthPeriod)?.label})</span>
            </h2>
            {growth.isError ? (
                <ErrorBox message={errorMessage(growth.error)} onRetry={() => growth.refetch()} />
            ) : !growth.data ? (
                <Skeleton className="h-32 w-full" />
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Tile label="Signed up" cur={growth.data.growth.signups} prev={growth.data.previous.signups} />
                        <Tile label="…made a test" cur={growth.data.growth.created_test} prev={growth.data.previous.created_test} />
                        <Tile label="…got a submission" cur={growth.data.growth.got_submission} prev={growth.data.previous.got_submission} />
                        <Tile label="Took a test" cur={growth.data.growth.took_test} prev={growth.data.previous.took_test} />
                    </div>
                    {growth.data.growth.by_channel.length > 0 && (
                        <section className={cx(CARD, 'overflow-x-auto p-4')}>
                            <h3 className="mb-2 text-[14px] font-semibold text-slate-900">Sign-ups by where they came from</h3>
                            <table className="w-full text-[13px]">
                                <thead>
                                    <tr className="text-left text-slate-500">
                                        <th className="py-1.5 font-medium">Channel</th>
                                        <th className="py-1.5 text-right font-medium">Signed up</th>
                                        <th className="py-1.5 text-right font-medium">Made a test</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {growth.data.growth.by_channel.map((r) => (
                                        <tr key={r.key}>
                                            <td className="py-1.5 text-slate-700">{r.key || '(none)'}</td>
                                            <td className="py-1.5 text-right font-semibold text-slate-900">{num(r.signups)}</td>
                                            <td className="py-1.5 text-right text-slate-700">{num(r.created_test)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    )}
                </div>
            )}
        </>
    );
}
