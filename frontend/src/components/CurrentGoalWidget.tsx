import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, CheckCircle2, ChevronRight } from 'lucide-react';
import { CreatorBadgeIcon } from '@/components/CreatorBadgeIcon';
import { CreatorRewardsStats } from '@/lib/rewardsApi';

interface CurrentGoalWidgetProps {
    stats: CreatorRewardsStats | null;
    loading?: boolean;
}

// Level titles are stored in caps ("VERIFIED CREATOR"); shouting reads as noise in a sentence.
const toTitleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

export const CurrentGoalWidget: React.FC<CurrentGoalWidgetProps> = ({ stats, loading = false }) => {
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="flex w-full items-center gap-4 rounded-2xl bg-[#0b1120] p-4 ring-1 ring-white/10 animate-pulse sm:px-5">
                <div className="h-12 w-12 shrink-0 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 rounded bg-white/10" />
                    <div className="h-4 w-48 rounded bg-white/10" />
                    <div className="h-2 w-full rounded-full bg-white/10" />
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const currentLvl = stats.currentLevel;
    const nextLvl = stats.nextLevel;
    const isMaxLevel = !!currentLvl && currentLvl.level === 6;
    const pct = Math.min(100, Math.max(0, stats.progressPercentage));
    const needed = stats.qualityTestsNeededForNext;

    return (
        <button
            type="button"
            onClick={() => navigate('/rewards')}
            className="group relative w-full overflow-hidden rounded-2xl bg-[#0b1120] text-left text-white ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_32px_-20px_rgba(2,6,23,0.9)] transition-shadow duration-300 hover:ring-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer"
        >
            {/* Light sources — same recipe as the landing hero */}
            <span aria-hidden="true" className="pointer-events-none absolute -left-20 -top-28 h-60 w-60 rounded-full bg-sky-500/20 blur-3xl" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-6 h-60 w-60 rounded-full bg-amber-400/15 blur-3xl transition-opacity duration-500 group-hover:bg-amber-400/25" />

            <div className="relative flex items-center gap-3.5 p-4 sm:gap-5 sm:px-5">
                {/* The badge being worked towards — the goal is the hero, not the current rank */}
                <div className="relative shrink-0">
                    <span aria-hidden="true" className="absolute inset-0 rounded-full bg-amber-400/25 blur-md" />
                    {isMaxLevel || !nextLvl ? (
                        currentLvl ? (
                            <CreatorBadgeIcon level={currentLvl.level} size={52} className="relative h-12 w-12 sm:h-14 sm:w-14" />
                        ) : (
                            <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-400/40">
                                <Award className="h-6 w-6 text-amber-300" />
                            </span>
                        )
                    ) : (
                        <CreatorBadgeIcon level={nextLvl.level} size={52} className="relative h-12 w-12 sm:h-14 sm:w-14" />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">
                        Creator rewards · {currentLvl ? `Level ${currentLvl.level}` : 'Starter'}
                    </p>

                    {isMaxLevel ? (
                        <>
                            <p className="mt-1 truncate text-[15px] font-semibold leading-tight sm:text-base">
                                {toTitleCase(currentLvl!.title)} — highest level reached
                            </p>
                            <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-slate-300">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                <span className="truncate">You've conducted {stats.quality_tests_count} quality exams.</span>
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="mt-1 truncate text-[15px] font-semibold leading-tight sm:text-base">
                                Next badge: <span className="text-amber-200">{toTitleCase(nextLvl.title)}</span>
                            </p>

                            <div className="mt-2.5 flex items-center gap-3">
                                <div
                                    className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10"
                                    role="progressbar"
                                    aria-valuenow={pct}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label={`Progress to ${toTitleCase(nextLvl.title)}`}
                                >
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-[width] duration-700 ease-out"
                                        style={{ width: pct === 0 ? 0 : `${Math.max(4, pct)}%` }}
                                    />
                                </div>
                                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-amber-200">
                                    {stats.quality_tests_count}/{nextLvl.requiredQualityTests}
                                </span>
                            </div>

                            <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-slate-300">
                                Conduct {needed} more exam{needed === 1 ? '' : 's'} with 20+ students each to unlock it.
                            </p>
                        </>
                    )}
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-slate-300" />
            </div>
        </button>
    );
};
