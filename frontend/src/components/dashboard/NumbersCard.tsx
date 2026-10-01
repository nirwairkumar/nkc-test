import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { PeriodNumbers } from '@/lib/teacherDashboardApi';
import { CARD } from './dashboardUi';
import { pctText } from './format';

/** Last 30 days in four honest numbers, plus results per day for two weeks. */
export default function NumbersCard({ numbers }: { numbers: PeriodNumbers }) {
    const delta = numbers.results - numbers.resultsPrev;

    return (
        <section aria-labelledby="numbers-heading" className={`${CARD} p-4 sm:p-5`}>
            <div className="flex items-baseline justify-between gap-3">
                <h2 id="numbers-heading" className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900">Last 30 days</h2>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2.5">
                <Tile label="Results" value={numbers.results.toLocaleString()}>
                    {(numbers.results > 0 || numbers.resultsPrev > 0) && (
                        <span className={`mt-1 inline-flex items-center gap-0.5 text-[12px] font-medium ${delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                            {delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : delta < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}
                            {delta === 0 ? 'Same as' : `${delta > 0 ? '+' : ''}${delta} vs`} the 30 days before
                        </span>
                    )}
                </Tile>
                <Tile label="Students" value={numbers.students.toLocaleString()} hint="Grouped by roll number or name" />
                <Tile label="Tests taken" value={numbers.examsGiven.toLocaleString()} />
                <Tile label="Average score" value={pctText(numbers.avgPct)} />
            </dl>

            <DailyBars daily={numbers.daily} />
        </section>
    );
}

function Tile({ label, value, hint, children }: { label: string; value: string; hint?: string; children?: React.ReactNode }) {
    return (
        <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-900/[0.04]" title={hint}>
            <dt className="text-[12px] font-medium text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-[22px] font-bold leading-tight tracking-[-0.02em] text-slate-900">{value}</dd>
            {children && <dd>{children}</dd>}
        </div>
    );
}

const dayLabel = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

function DailyBars({ daily }: { daily: PeriodNumbers['daily'] }) {
    const [hover, setHover] = useState<number | null>(null);
    const max = Math.max(1, ...daily.map(d => d.count));
    const peak = daily.reduce((best, d, i) => (d.count > daily[best].count ? i : best), 0);
    const total = daily.reduce((s, d) => s + d.count, 0);

    return (
        <figure className="mt-4">
            <figcaption className="text-[13px] font-medium text-slate-600">Results per day · last 14 days</figcaption>
            <div className="relative mt-2" aria-hidden="true" onMouseLeave={() => setHover(null)}>
                <div className="flex h-24 items-end gap-[2px] border-b border-slate-200">
                    {daily.map((d, i) => {
                        const h = d.count > 0 ? Math.max(6, (d.count / max) * 100) : 0;
                        return (
                            <div
                                key={d.date.toISOString()}
                                onMouseEnter={() => setHover(i)}
                                className="relative flex h-full flex-1 cursor-default items-end justify-center"
                            >
                                {i === peak && d.count > 0 && hover === null && (
                                    <span className="absolute text-[11px] font-semibold text-slate-600 tabular-nums" style={{ bottom: `calc(${h}% + 2px)` }}>
                                        {d.count}
                                    </span>
                                )}
                                <div
                                    className={`w-full max-w-[24px] rounded-t-[4px] transition-colors ${hover === i ? 'bg-sky-600' : 'bg-sky-500'}`}
                                    style={{ height: `${h}%` }}
                                />
                            </div>
                        );
                    })}
                </div>
                {hover !== null && (
                    <div
                        className="pointer-events-none absolute -top-9 z-10 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg"
                        style={{
                            left: `${((hover + 0.5) / daily.length) * 100}%`,
                            // Keep the tooltip inside the card at both ends.
                            transform: `translateX(${hover < 3 ? '-15%' : hover > daily.length - 4 ? '-85%' : '-50%'})`,
                        }}
                    >
                        {dayLabel(daily[hover].date)} · {daily[hover].count} result{daily[hover].count === 1 ? '' : 's'}
                    </div>
                )}
                <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                    <span>{daily[0].date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                    <span>Today</span>
                </div>
            </div>
            {total === 0 && <p className="mt-1 text-[12px] text-slate-500">No results in the last 14 days.</p>}

            {/* Same data as a table for screen readers */}
            <table className="sr-only">
                <caption>Results per day, last 14 days</caption>
                <thead><tr><th>Day</th><th>Results</th></tr></thead>
                <tbody>
                    {daily.map(d => <tr key={d.date.toISOString()}><td>{dayLabel(d.date)}</td><td>{d.count}</td></tr>)}
                </tbody>
            </table>
        </figure>
    );
}
