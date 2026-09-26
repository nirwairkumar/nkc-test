import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
import { insightsApi, type Period } from './api';
import { ActiveUsersChart, Columns, Funnel, RetentionGrid } from './charts';
import { bucketLabel, change, num, pct, PERIOD_LABEL, PREVIOUS_LABEL, ratio } from './format';
import { ChannelIcon, ErrorState } from './shared';
import { BarList, Card, Skeleton, StatTile, TileSkeletons } from './ui';

export default function GrowthTab({ period }: { period: Period }) {
    const q = useQuery({
        queryKey: ['analytics', 'growth', period],
        queryFn: () => insightsApi.growth(period),
        placeholderData: keepPreviousData,
        staleTime: 60_000,
    });
    if (q.error && !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
    const d = q.data;
    const g = d?.growth, p = d?.previous;
    const vs = `vs ${PREVIOUS_LABEL[period]}`;

    const weeks = d?.north_star ?? [];
    const thisWeek = weeks[weeks.length - 1]?.submissions ?? 0;
    const lastWeek = weeks[weeks.length - 2]?.submissions ?? 0;

    const last = d?.active[d.active.length - 1];
    const avgDau = d?.active.length ? d.active.reduce((a, r) => a + r.dau, 0) / d.active.length : 0;
    const stickiness = last && last.mau ? (avgDau / last.mau) * 100 : null;

    return (
        <div className={cn('space-y-4', q.isPlaceholderData && 'opacity-60')}>
            {/* North Star */}
            <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-sky-600/15 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-18px_rgba(2,132,199,0.45)]">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-sky-100 bg-gradient-to-b from-sky-50/80 to-white px-4 pb-4 pt-4 sm:px-5">
                    <div>
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">
                            <Star className="h-3.5 w-3.5" aria-hidden="true" /> North Star
                        </p>
                        <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.01em] text-slate-900">Tests taken per week</h3>
                        <p className="mt-0.5 max-w-lg text-[13px] text-slate-500">
                            It only grows when educators create tests <i>and</i> students take them. Excludes creators taking their own tests and your team.
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[40px] font-semibold leading-none tracking-[-0.03em] text-slate-900">{d ? num(thisWeek) : '–'}</p>
                        <p className="mt-1 text-[12px] text-slate-500">this week so far · last week <b className="text-slate-900">{d ? num(lastWeek) : '–'}</b></p>
                    </div>
                </div>
                <div className="px-4 pb-4 pt-5 sm:px-5">
                    {d ? (
                        <Columns
                            format={num}
                            data={weeks.map((w) => ({ label: bucketLabel(w.t, 'week'), long: bucketLabel(w.t, 'week', true), value: w.submissions }))}
                        />
                    ) : <Skeleton className="h-[200px]" />}
                </div>
            </section>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {g && p ? (
                    <>
                        <StatTile label="Sign-ups" value={num(g.signups)} delta={change(g.signups, p.signups)} deltaTitle={vs}
                            sub={`in ${PERIOD_LABEL[period]}`} />
                        <StatTile label="Visitor → sign-up" value={pct(ratio(g.signups, g.new_visitors), 1)}
                            info="Sign-ups divided by new visitors in the period." sub={`${num(g.new_visitors)} new visitors`} />
                        <StatTile label="Created a test" value={pct(ratio(g.created_test, g.signups))}
                            info="Of people who signed up in this period, the share who created at least one test (activation)."
                            sub={g.median_hours_to_first_test !== null ? `median ${formatHours(g.median_hours_to_first_test)} after sign-up` : `${num(g.created_test)} people`} />
                        <StatTile label="Got a submission" value={pct(ratio(g.got_submission, g.signups))}
                            info="Of people who signed up in this period, the share whose test was taken by someone else — the moment TestoZa proves its value."
                            sub={`${num(g.got_submission)} educators`} />
                    </>
                ) : <TileSkeletons count={4} />}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Activation funnel" subtitle={`People who signed up in ${PERIOD_LABEL[period]}`}>
                    {g ? (
                        <Funnel steps={[
                            { label: 'New visitors', value: g.new_visitors },
                            { label: 'Signed up', value: g.signups },
                            { label: 'Created a test', value: g.created_test },
                            { label: 'Test taken by a student', value: g.got_submission },
                        ]} />
                    ) : <Skeleton className="h-52" />}
                    {g && <p className="mt-4 text-[12px] text-slate-500">{num(g.took_test)} of the new sign-ups took someone else’s test (students).</p>}
                </Card>

                <Card title="Sign-ups by first source" info="Where each new account first arrived from. “Not tracked” = the account's first visit happened before tracking v2 started.">
                    {g ? (
                        <BarList valueLabel="Sign-ups" extraLabels={['Created test']}
                            rows={g.by_channel.map((r) => ({
                                id: r.key,
                                label: <span className="flex items-center gap-2"><ChannelIcon channel={r.key} />{r.key}</span>,
                                value: r.signups, display: num(r.signups), extra: [num(r.created_test)],
                            }))} />
                    ) : <Skeleton className="h-40" />}
                </Card>

                <Card title="Sign-ups by role">
                    {g ? (
                        <BarList valueLabel="Sign-ups" extraLabels={['Created', 'Got taken']}
                            rows={g.by_role.map((r) => ({
                                id: r.key, label: r.key, value: r.signups, display: num(r.signups),
                                extra: [num(r.created_test), num(r.got_submission)],
                            }))} />
                    ) : <Skeleton className="h-40" />}
                </Card>

                <Card title="Sign-ups by first page" info="The kind of page the new account's first visit landed on. Test link = arrived through a shared test.">
                    {g ? (
                        <BarList valueLabel="Sign-ups" rows={g.by_landing.map((r) => ({ id: r.key, label: r.key, value: r.signups, display: num(r.signups) }))} />
                    ) : <Skeleton className="h-40" />}
                </Card>
            </div>

            <Card
                title="Active users"
                subtitle="Registered people who visited or did something (created, took or started a test, used AI) — daily, trailing 7 days, trailing 30 days"
                action={stickiness !== null ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-700" title="Average daily active users ÷ monthly active users">
                        Stickiness {pct(stickiness)}
                    </span>
                ) : undefined}
            >
                {d ? <ActiveUsersChart data={d.active} /> : <Skeleton className="h-[240px]" />}
            </Card>

            <Card title="Retention" subtitle="Share of each weekly sign-up group still active in the weeks after (IST, Monday weeks)">
                {d ? (
                    d.retention.length ? <RetentionGrid rows={d.retention} /> : <p className="py-6 text-center text-[13px] text-slate-500">No sign-ups in the last 8 weeks.</p>
                ) : <Skeleton className="h-52" />}
            </Card>
        </div>
    );
}

function formatHours(h: number): string {
    if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
    if (h < 48) return `${Math.round(h)} h`;
    return `${Math.round(h / 24)} days`;
}
