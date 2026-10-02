import React from 'react';
import { BarChart3, ClipboardCopy, ListOrdered, Microscope, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { ScoredAttempt, TestResultSummary } from '@/lib/teacherDashboardApi';
import { STRONG_PCT, WEAK_PCT, rankListText } from '@/lib/teacherDashboardApi';
import { CARD, PILL_BTN, PRIMARY_BTN, WhatsAppIcon } from './dashboardUi';
import { copyText, dayAndTime, pctText, plural } from './format';

interface LatestResultCardProps {
    summary: TestResultSummary;
    now: Date;
    onOpenResults: (test: any) => void;
    onOpenAnalysis: (test: any) => void;
}

const BANDS = [
    { key: 'strong', label: `${STRONG_PCT}% and above`, short: 'Strong', color: '#10b981' },
    { key: 'average', label: `${WEAK_PCT}–${STRONG_PCT - 1}%`, short: 'Average', color: '#f59e0b' },
    { key: 'weak', label: `Below ${WEAK_PCT}%`, short: 'Needs help', color: '#f43f5e' },
] as const;

/** The report a teacher reads the morning after an exam, and the rank list they post to the batch group. */
export default function LatestResultCard({ summary, now, onOpenResults, onOpenAnalysis }: LatestResultCardProps) {
    const { test, count, avgPct, highest, lowest, bands, ranked, weak } = summary;
    const banded = bands.strong + bands.average + bands.weak;
    const top = ranked.slice(0, 3);
    const rankText = rankListText(summary);

    const copyRankList = async () => {
        const ok = await copyText(rankText);
        if (ok) toast.success('Rank list copied — paste it in your batch group');
        else toast.error('Could not copy the rank list');
    };

    return (
        <section aria-labelledby="latest-result-heading" className={`${CARD} overflow-hidden`}>
            <div className="px-4 pt-4 sm:px-5 sm:pt-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Latest results</p>
                <div className="mt-1 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 id="latest-result-heading" className="truncate text-xl font-semibold tracking-[-0.015em] text-slate-900" title={test.title}>
                            {test.title}
                        </h2>
                        <p className="mt-0.5 text-[13px] text-slate-600">
                            {plural(count, 'candidate')} submitted · last one {dayAndTime(summary.lastAt, now)}
                        </p>
                    </div>
                </div>

                {/* Headline numbers */}
                <dl className="mt-4 grid grid-cols-3 gap-2.5">
                    <Stat label="Average" value={pctText(avgPct)} />
                    <Stat label="Highest" value={pctText(highest?.pct)} sub={highest?.displayName} />
                    <Stat label="Lowest" value={pctText(lowest?.pct)} sub={count > 1 ? lowest?.displayName : undefined} />
                </dl>

                {/* Score bands: one stacked bar + a labelled legend */}
                {banded > 0 && (
                    <div className="mt-4">
                        <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img"
                            aria-label={BANDS.map(b => `${b.short}: ${bands[b.key]}`).join(', ')}>
                            {BANDS.map(b => bands[b.key] > 0 && (
                                <div
                                    key={b.key}
                                    className="h-full first:rounded-l-full last:rounded-r-full"
                                    style={{ width: `${(bands[b.key] / banded) * 100}%`, backgroundColor: b.color }}
                                    title={`${b.short} (${b.label}): ${plural(bands[b.key], 'candidate')}`}
                                />
                            ))}
                        </div>
                        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                            {BANDS.map(b => (
                                <li key={b.key} className="flex items-center gap-1.5 text-[13px] text-slate-600">
                                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                                    <span className="font-semibold text-slate-900 tabular-nums">{bands[b.key]}</span>
                                    {b.short} <span className="text-slate-400">({b.label})</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Top 3 and who needs help */}
            <div className="mt-4 grid border-t border-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-slate-100">
                <div className="px-4 py-3.5 sm:px-5">
                    <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
                        <ListOrdered className="h-4 w-4 text-sky-600" /> Top of the class
                    </h3>
                    <ol className="mt-2 space-y-1.5">
                        {top.map((a, i) => <RankRow key={a.id} rank={i + 1} attempt={a} />)}
                    </ol>
                </div>
                <div className="border-t border-slate-100 px-4 py-3.5 sm:border-t-0 sm:px-5">
                    <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
                        <TriangleAlert className="h-4 w-4 text-rose-500" /> Needs help <span className="font-normal text-slate-500">(below {WEAK_PCT}%)</span>
                    </h3>
                    {weak.length === 0 ? (
                        <p className="mt-2 text-[13px] text-slate-600">Nobody. Every candidate scored {WEAK_PCT}% or more.</p>
                    ) : (
                        <ul className="mt-2 space-y-1.5">
                            {weak.slice(0, 4).map(a => (
                                <li key={a.id} className="flex items-center justify-between gap-3 text-[14px]">
                                    <span className="min-w-0 truncate text-slate-800">{a.displayName}</span>
                                    <span className="shrink-0 font-semibold text-slate-900 tabular-nums">{pctText(a.pct)}</span>
                                </li>
                            ))}
                            {weak.length > 4 && <li className="text-[13px] text-slate-500">and {weak.length - 4} more</li>}
                        </ul>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
                <button type="button" onClick={() => onOpenResults(test)} className={`${PRIMARY_BTN} h-9 px-3.5 text-[13px]`}>
                    <BarChart3 className="h-4 w-4" /> All results
                </button>
                <button type="button" onClick={copyRankList} className={PILL_BTN}>
                    <ClipboardCopy className="h-4 w-4 text-sky-600" /> Copy rank list
                </button>
                <a
                    href={`https://wa.me/?text=${encodeURIComponent(rankText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366]/10 px-3.5 text-[13px] font-semibold text-[#128C7E] transition-colors hover:bg-[#25D366]/20"
                >
                    <WhatsAppIcon /> Send rank list
                </a>
                <button type="button" onClick={() => onOpenAnalysis(test)} className={`${PILL_BTN} sm:ml-auto`}>
                    <Microscope className="h-4 w-4 text-sky-600" /> Question analysis
                </button>
            </div>
        </section>
    );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-900/[0.04]">
            <dt className="text-[12px] font-medium text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-[22px] font-bold leading-tight tracking-[-0.02em] text-slate-900">{value}</dd>
            {sub && <dd className="truncate text-[12px] text-slate-500" title={sub}>{sub}</dd>}
        </div>
    );
}

function RankRow({ rank, attempt }: { rank: number; attempt: ScoredAttempt }) {
    const medal = ['bg-amber-100 text-amber-800', 'bg-slate-200 text-slate-700', 'bg-orange-100 text-orange-800'][rank - 1];
    return (
        <li className="flex items-center gap-2.5 text-[14px]">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${medal}`}>{rank}</span>
            <span className="min-w-0 flex-1 truncate text-slate-800" title={attempt.displayName}>{attempt.displayName}</span>
            <span className="shrink-0 font-semibold text-slate-900 tabular-nums">{pctText(attempt.pct)}</span>
        </li>
    );
}
