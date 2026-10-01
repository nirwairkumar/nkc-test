import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { StudentRow } from '@/lib/teacherDashboardApi';
import { WEAK_PCT } from '@/lib/teacherDashboardApi';
import { CARD } from './dashboardUi';
import { pctText, plural } from './format';

interface StudentsCardProps {
    needsHelp: StudentRow[];
    top: StudentRow[];
    total: number;
}

/** Who to call this week, across every test of the last 60 days. */
export default function StudentsCard({ needsHelp, top, total }: StudentsCardProps) {
    const [tab, setTab] = useState<'help' | 'top'>(needsHelp.length > 0 ? 'help' : 'top');
    const rows = tab === 'help' ? needsHelp : top;

    return (
        <section aria-labelledby="students-heading" className={`${CARD} overflow-hidden`}>
            <div className="px-4 pt-4 sm:px-5">
                <div className="flex items-baseline justify-between gap-3">
                    <h2 id="students-heading" className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900">Students to watch</h2>
                    <span className="text-[12px] text-slate-500">{plural(total, 'student')} · 60 days</span>
                </div>
                <div role="tablist" aria-label="Student groups" className="mt-3 grid grid-cols-2 rounded-[10px] bg-slate-200/60 p-0.5">
                    {([['help', `Needs help (${needsHelp.length})`], ['top', 'Doing well']] as const).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={tab === key}
                            onClick={() => setTab(key)}
                            className={`h-8 rounded-[8px] text-[13px] font-semibold transition-all cursor-pointer ${tab === key ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.12)]' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {rows.length === 0 ? (
                <p className="px-4 py-5 text-[13px] text-slate-600 sm:px-5">
                    {tab === 'help' ? `No student is averaging below ${WEAK_PCT}%.` : `No student is averaging ${WEAK_PCT}% or more yet.`}
                </p>
            ) : (
                <ul className="mt-2 divide-y divide-slate-100">
                    {rows.map(s => (
                        <li key={s.key} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-600">
                                {initials(s.displayName)}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[14px] font-medium text-slate-900" title={s.displayName}>{s.displayName}</p>
                                <p className="text-[12px] text-slate-500">
                                    {s.roll && !s.displayName.includes(s.roll) ? `${s.roll} · ` : ''}{plural(s.tests, 'test')}
                                </p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-[15px] font-semibold text-slate-900 tabular-nums">{pctText(s.avgPct)}</p>
                                <Trend trend={s.trend} />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <p className="border-t border-slate-100 px-4 py-2.5 text-[12px] leading-snug text-slate-500 sm:px-5">
                Average score per student. Students are matched by the roll number or name they typed.
            </p>
        </section>
    );
}

function Trend({ trend }: { trend: StudentRow['trend'] }) {
    if (!trend) return null;
    if (trend === 'up') return <p className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-700"><ArrowUpRight className="h-3 w-3" />Improving</p>;
    if (trend === 'down') return <p className="inline-flex items-center gap-0.5 text-[11px] font-medium text-rose-700"><ArrowDownRight className="h-3 w-3" />Dropping</p>;
    return <p className="inline-flex items-center gap-0.5 text-[11px] text-slate-500"><Minus className="h-3 w-3" />Steady</p>;
}

function initials(name: string) {
    const parts = name.replace(/[^\p{L}\p{N} ]/gu, '').trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
