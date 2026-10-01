import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { TestResultSummary } from '@/lib/teacherDashboardApi';
import { WEAK_PCT } from '@/lib/teacherDashboardApi';
import { CARD, SectionTitle, TEXT_BTN } from './dashboardUi';
import { pctText, plural, timeAgo } from './format';

interface RecentResultsCardProps {
    summaries: TestResultSummary[];
    now: Date;
    onOpen: (test: any) => void;
    onSeeAll: () => void;
}

/** Other tests that got results lately — one tap opens the full results. */
export default function RecentResultsCard({ summaries, now, onOpen, onSeeAll }: RecentResultsCardProps) {
    if (summaries.length === 0) return null;

    return (
        <section aria-labelledby="recent-results-heading">
            <SectionTitle
                id="recent-results-heading"
                title="Earlier results"
                action={<button type="button" onClick={onSeeAll} className={TEXT_BTN}>See all</button>}
            />
            <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                {summaries.map(s => (
                    <li key={s.test.id}>
                        <button
                            type="button"
                            onClick={() => onOpen(s.test)}
                            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 sm:px-5 cursor-pointer"
                        >
                            <AverageBadge pct={s.avgPct} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[15px] font-semibold text-slate-900" title={s.test.title}>{s.test.title}</p>
                                <p className="mt-0.5 text-[13px] text-slate-600">
                                    {plural(s.count, 'student')}
                                    {s.weak.length > 0 && <> · <span className="text-rose-700">{s.weak.length} below {WEAK_PCT}%</span></>}
                                    {' · '}{timeAgo(s.lastAt, now)}
                                </p>
                            </div>
                            <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}

/** Class average in a small rounded square; the number carries the meaning, not the color. */
function AverageBadge({ pct }: { pct: number | null }) {
    return (
        <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[12px] bg-slate-100 ring-1 ring-inset ring-slate-900/[0.04]">
            <span className="text-[14px] font-bold leading-none text-slate-900">{pctText(pct)}</span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">avg</span>
        </span>
    );
}
