/**
 * Charts for the analytics panel. Colours come from the validated dataviz
 * palette (categorical slots 1–3, one blue sequential ramp); text never wears a
 * series colour; one y-axis per chart; every chart has a hover read-out.
 */
import React, { useMemo, useState } from 'react';
import {
    Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { bucketLabel } from './format';

export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a'] as const; // slots 1–3 (validated, light)
export const CONTEXT_GRAY = '#b9b7b0';
const GRID = '#eceef1';
const AXIS = '#dfe3e8';
const TICK = { fontSize: 11, fill: '#898781' };
// Blue sequential ramp 100 → 700; the funnel uses the ordinal subset from 250.
const RAMP = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b'];
const ORDINAL = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'];

function rampColor(v: number, max: number): string {
    if (v <= 0 || max <= 0) return '#f1f3f6';
    const i = Math.min(RAMP.length - 1, Math.floor((v / max) * (RAMP.length - 1)));
    return RAMP[i];
}
const inkOn = (hex: string) => (['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#f1f3f6'].includes(hex) ? '#0b0b0b' : '#ffffff');

function TooltipShell({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="min-w-[150px] rounded-xl bg-white/95 px-3 py-2 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.3)] ring-1 ring-slate-900/[0.08] backdrop-blur">
            <p className="text-[11px] font-medium text-slate-500">{title}</p>
            <div className="mt-1 space-y-0.5">{children}</div>
        </div>
    );
}

function TooltipRow({ color, value, label, faded }: { color: string; value: React.ReactNode; label: string; faded?: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <span className="h-[2px] w-3 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
            <span className={cn('text-[13px] font-semibold tabular-nums', faded ? 'text-slate-500' : 'text-slate-900')}>{value}</span>
            <span className="text-[12px] text-slate-500">{label}</span>
        </div>
    );
}

export function LegendKey({ color, label, value }: { color: string; label: string; value?: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-600">
            <span className="h-[2px] w-3.5 rounded-full" style={{ background: color }} aria-hidden="true" />
            {label}
            {value !== undefined && <span className="font-semibold text-slate-900">{value}</span>}
        </span>
    );
}

// ── Trend: this period vs the previous one ─────────────────────────────────────
export function TrendChart({
    points, previous, bucket, format, axisFormat, metricLabel, height = 260,
}: {
    points: { t: string; v: number }[];
    previous?: { t: string; v: number }[];
    bucket: string;
    format: (v: number) => string;
    axisFormat?: (v: number) => string;
    metricLabel: string;
    height?: number;
}) {
    const data = useMemo(
        () => points.map((p, i) => ({
            label: bucketLabel(p.t, bucket),
            long: bucketLabel(p.t, bucket, true),
            cur: p.v,
            prev: previous?.[i]?.v,
            prevLong: previous?.[i] ? bucketLabel(previous[i].t, bucket, true) : undefined,
        })),
        [points, previous, bucket],
    );
    const gradientId = useMemo(() => `trend-${Math.random().toString(36).slice(2)}`, []);

    return (
        <div>
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.16} />
                                <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke={GRID} />
                        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: AXIS }} tick={TICK} minTickGap={28} interval="preserveStartEnd" />
                        <YAxis tickLine={false} axisLine={false} width={44} tick={TICK} allowDecimals={false}
                            tickFormatter={(v) => (axisFormat || format)(Number(v))} />
                        <Tooltip
                            cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
                            content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const row = payload[0].payload as (typeof data)[number];
                                return (
                                    <TooltipShell title={row.long}>
                                        <TooltipRow color={SERIES[0]} value={format(row.cur)} label={metricLabel} />
                                        {row.prev !== undefined && (
                                            <TooltipRow color={CONTEXT_GRAY} value={format(row.prev)} label={row.prevLong || 'previous'} faded />
                                        )}
                                    </TooltipShell>
                                );
                            }}
                        />
                        {previous && (
                            <Area type="monotone" dataKey="prev" stroke={CONTEXT_GRAY} strokeWidth={1.5} fill="none" dot={false}
                                activeDot={false} isAnimationActive={false} connectNulls />
                        )}
                        <Area type="monotone" dataKey="cur" stroke={SERIES[0]} strokeWidth={2} fill={`url(#${gradientId})`} dot={false}
                            activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff', fill: SERIES[0] }} isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            {previous && (
                <div className="mt-2 flex flex-wrap gap-4 pl-11">
                    <LegendKey color={SERIES[0]} label="This period" />
                    <LegendKey color={CONTEXT_GRAY} label="Previous period" />
                </div>
            )}
        </div>
    );
}

// ── Columns (single series, e.g. tests taken per week) ─────────────────────────
export function Columns({
    data, format, height = 180, highlightLast = true,
}: {
    data: { label: string; long: string; value: number }[];
    format: (v: number) => string;
    height?: number;
    highlightLast?: boolean;
}) {
    const [hover, setHover] = useState<number | null>(null);
    const max = Math.max(1, ...data.map((d) => d.value));
    const peak = data.reduce((b, d, i) => (d.value > (data[b]?.value ?? -1) ? i : b), 0);
    return (
        <div>
            <div className="relative flex items-end gap-1.5" style={{ height }} onMouseLeave={() => setHover(null)}>
                {data.map((d, i) => {
                    const h = d.value > 0 ? Math.max(3, (d.value / max) * (height - 22)) : 0;
                    const isLast = highlightLast && i === data.length - 1;
                    const showLabel = i === peak || isLast || hover === i;
                    return (
                        <button
                            key={d.long}
                            type="button"
                            className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end focus-visible:outline-none"
                            onMouseEnter={() => setHover(i)}
                            onFocus={() => setHover(i)}
                            onBlur={() => setHover(null)}
                            aria-label={`${d.long}: ${format(d.value)}`}
                        >
                            {showLabel && (
                                <span className="mb-1 text-[11px] font-semibold tabular-nums text-slate-700">{format(d.value)}</span>
                            )}
                            <span
                                className={cn('w-full max-w-[24px] rounded-t-[4px] transition-opacity', hover !== null && hover !== i && 'opacity-60')}
                                style={{ height: h, background: isLast ? SERIES[0] : '#86b6ef' }}
                            />
                            {hover === i && (
                                <span className="pointer-events-none absolute bottom-full z-20 mb-1 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] text-white">
                                    {d.long}: <b>{format(d.value)}</b>
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            <div className="mt-1.5 flex gap-1.5 border-t border-slate-200 pt-1.5">
                {data.map((d, i) => (
                    <span key={d.long} className="min-w-0 flex-1 truncate text-center text-[10px] text-slate-400">
                        {i % Math.ceil(data.length / 6) === 0 || i === data.length - 1 ? d.label : ''}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ── Weekday × hour heat map (IST) ───────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hourName = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'am' : 'pm'}`;

export function Heatmap({ cells }: { cells: { dow: number; hour: number; sessions: number; visitors: number }[] }) {
    const [hover, setHover] = useState<{ dow: number; hour: number } | null>(null);
    const grid = useMemo(() => {
        const g: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
        cells.forEach((c) => { g[c.dow - 1][c.hour] = c.sessions; });
        return g;
    }, [cells]);
    const max = Math.max(1, ...cells.map((c) => c.sessions));
    const busiest = cells.reduce((b, c) => (c.sessions > (b?.sessions ?? 0) ? c : b), null as null | (typeof cells)[number]);
    const hovered = hover ? grid[hover.dow][hover.hour] : null;

    return (
        <div>
            <div className="overflow-x-auto">
                <div className="grid min-w-[520px] grid-cols-[34px_repeat(24,minmax(0,1fr))] gap-[2px]" onMouseLeave={() => setHover(null)}>
                    {grid.map((row, d) => (
                        <React.Fragment key={d}>
                            <span className="pr-1 text-right text-[10px] leading-[18px] text-slate-400">{DAYS[d]}</span>
                            {row.map((v, h) => {
                                const bg = rampColor(v, max);
                                return (
                                    <span
                                        key={h}
                                        role="img"
                                        aria-label={`${DAYS[d]} ${hourName(h)}: ${v} visits`}
                                        onMouseEnter={() => setHover({ dow: d, hour: h })}
                                        className={cn('h-[18px] rounded-[3px] transition-[outline]', hover?.dow === d && hover?.hour === h && 'outline outline-2 outline-slate-900/60')}
                                        style={{ background: bg }}
                                    />
                                );
                            })}
                        </React.Fragment>
                    ))}
                    <span />
                    {Array.from({ length: 24 }, (_, h) => (
                        <span key={h} className="text-center text-[9px] text-slate-400">{h % 3 === 0 ? (h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`) : ''}</span>
                    ))}
                </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-500">
                <span>
                    {hover
                        ? <><b className="text-slate-900">{hovered}</b> visits on {DAYS[hover.dow]} at {hourName(hover.hour)}</>
                        : busiest
                            ? <>Busiest: <b className="text-slate-900">{DAYS[busiest.dow - 1]} {hourName(busiest.hour)}</b> ({busiest.sessions} visits)</>
                            : 'No visits yet'}
                </span>
                <span className="flex items-center gap-1.5">
                    Fewer
                    {[0.05, 0.25, 0.5, 0.75, 1].map((f) => (
                        <span key={f} className="h-2.5 w-4 rounded-[2px]" style={{ background: rampColor(f * max, max) }} />
                    ))}
                    More
                </span>
            </div>
        </div>
    );
}

// ── Funnel ──────────────────────────────────────────────────────────────────────
export function Funnel({ steps }: { steps: { label: string; value: number; hint?: string }[] }) {
    const top = Math.max(1, steps[0]?.value ?? 1);
    return (
        <ol className="space-y-3">
            {steps.map((s, i) => {
                const prev = i > 0 ? steps[i - 1].value : null;
                const conv = prev ? (s.value / prev) * 100 : null;
                return (
                    <li key={s.label}>
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="text-[13px] font-medium text-slate-800">{s.label}</span>
                            <span className="flex items-baseline gap-2">
                                {conv !== null && (
                                    <span className="text-[12px] text-slate-500">{prev ? `${conv < 10 ? conv.toFixed(1) : Math.round(conv)}% of previous` : '—'}</span>
                                )}
                                <span className="text-[15px] font-semibold tabular-nums text-slate-900">{s.value.toLocaleString('en-IN')}</span>
                            </span>
                        </div>
                        <div className="mt-1.5 h-3 w-full rounded-full bg-slate-100">
                            <div
                                className="h-3 rounded-full"
                                style={{ width: `${s.value > 0 ? Math.max(1.5, (s.value / top) * 100) : 0}%`, background: ORDINAL[Math.min(i, ORDINAL.length - 1)] }}
                            />
                        </div>
                        {s.hint && <p className="mt-1 text-[11px] text-slate-400">{s.hint}</p>}
                    </li>
                );
            })}
        </ol>
    );
}

// ── Share bar (part-to-whole, ≤ 3–4 parts) ─────────────────────────────────────
export function ShareBar({ parts }: { parts: { key: string; label: string; value: number; color: string }[] }) {
    const total = parts.reduce((a, p) => a + p.value, 0);
    if (!total) return <p className="py-3 text-center text-[13px] text-slate-500">No visits yet.</p>;
    return (
        <div>
            <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img"
                aria-label={parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ')}>
                {parts.filter((p) => p.value > 0).map((p) => (
                    <span key={p.key} title={`${p.label}: ${p.value}`} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} className="h-full first:rounded-l-full last:rounded-r-full" />
                ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
                {parts.map((p) => (
                    <div key={p.key} className="min-w-0">
                        <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden="true" />
                            <span className="truncate">{p.label}</span>
                        </span>
                        <span className="mt-0.5 block text-[17px] font-semibold text-slate-900">{Math.round((p.value / total) * 100)}%</span>
                        <span className="block text-[11px] text-slate-400">{p.value.toLocaleString('en-IN')} visitors</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── DAU / WAU / MAU ─────────────────────────────────────────────────────────────
export function ActiveUsersChart({ data }: { data: { d: string; dau: number; wau: number; mau: number }[] }) {
    const rows = data.map((r) => ({ ...r, label: bucketLabel(`${r.d}T00:00`, 'day'), long: bucketLabel(`${r.d}T00:00`, 'day', true) }));
    const last = rows[rows.length - 1];
    const lines = [
        { key: 'dau', label: 'Daily', color: SERIES[0] },
        { key: 'wau', label: 'Weekly', color: SERIES[1] },
        { key: 'mau', label: 'Monthly', color: SERIES[2] },
    ] as const;
    return (
        <div>
            <div className="mb-2 flex flex-wrap gap-4">
                {lines.map((l) => <LegendKey key={l.key} color={l.color} label={l.label} value={last ? last[l.key] : 0} />)}
            </div>
            <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke={GRID} />
                        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: AXIS }} tick={TICK} minTickGap={28} interval="preserveStartEnd" />
                        <YAxis tickLine={false} axisLine={false} width={36} tick={TICK} allowDecimals={false} />
                        <Tooltip
                            cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
                            content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const r = payload[0].payload as (typeof rows)[number];
                                return (
                                    <TooltipShell title={r.long}>
                                        {lines.map((l) => <TooltipRow key={l.key} color={l.color} value={r[l.key]} label={`${l.label} active`} />)}
                                    </TooltipShell>
                                );
                            }}
                        />
                        {lines.map((l) => (
                            <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={2} dot={false}
                                activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }} isAnimationActive={false} />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ── Retention cohorts ───────────────────────────────────────────────────────────
export function RetentionGrid({ rows }: { rows: { cohort: string; size: number; weeks: number[] }[] }) {
    const width = Math.max(1, ...rows.map((r) => r.weeks.length));
    const cols = Array.from({ length: width }, (_, i) => i);
    const avg = cols.map((k) => {
        const eligible = rows.filter((r) => r.weeks.length > k && r.size > 0);
        const people = eligible.reduce((a, r) => a + r.size, 0);
        return people ? (eligible.reduce((a, r) => a + r.weeks[k], 0) / people) * 100 : null;
    });
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-separate border-spacing-[2px] text-[12px]">
                <thead>
                    <tr className="text-slate-400">
                        <th className="px-2 py-1 text-left font-medium">Signed up</th>
                        <th className="px-2 py-1 text-right font-medium">People</th>
                        {cols.map((k) => <th key={k} className="px-1 py-1 text-center font-medium">{k === 0 ? 'Week 0' : `W${k}`}</th>)}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="px-2 py-1.5 font-semibold text-slate-900">Average</td>
                        <td />
                        {avg.map((v, k) => (
                            <td key={k} className="px-1 py-1.5 text-center font-semibold tabular-nums text-slate-900">{v === null ? '' : `${Math.round(v)}%`}</td>
                        ))}
                    </tr>
                    {rows.slice().reverse().map((r) => (
                        <tr key={r.cohort}>
                            <td className="whitespace-nowrap px-2 py-1.5 text-slate-700">{bucketLabel(`${r.cohort}T00:00`, 'week', true).replace('Week of ', '')}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-slate-700">{r.size}</td>
                            {cols.map((k) => {
                                if (k >= r.weeks.length) return <td key={k} />;
                                const share = r.size ? (r.weeks[k] / r.size) * 100 : 0;
                                const bg = rampColor(share, 100);
                                return (
                                    <td key={k} title={`${r.weeks[k]} of ${r.size} active`}
                                        className="rounded-[4px] px-1 py-1.5 text-center tabular-nums"
                                        style={{ background: bg, color: inkOn(bg) }}>
                                        {Math.round(share)}%
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Sparkline (realtime minutes) ────────────────────────────────────────────────
export function MiniBars({ values, height = 36 }: { values: number[]; height?: number }) {
    const max = Math.max(1, ...values);
    return (
        <div className="flex items-end gap-[2px]" style={{ height }} aria-hidden="true">
            {values.map((v, i) => (
                <span key={i} className="min-w-0 flex-1 rounded-t-[2px]"
                    style={{ height: v ? Math.max(2, (v / max) * height) : 1, background: v ? SERIES[0] : '#e2e8f0' }} />
            ))}
        </div>
    );
}
