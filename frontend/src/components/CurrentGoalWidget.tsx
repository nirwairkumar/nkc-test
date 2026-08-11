import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, ChevronRight, Sparkles, CheckCircle2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreatorBadgeIcon } from '@/components/CreatorBadgeIcon';
import { CreatorRewardsStats } from '@/lib/rewardsApi';

interface CurrentGoalWidgetProps {
    stats: CreatorRewardsStats | null;
    loading?: boolean;
}

export const CurrentGoalWidget: React.FC<CurrentGoalWidgetProps> = ({ stats, loading = false }) => {
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="w-full bg-slate-900/90 dark:bg-slate-900/95 border border-slate-800 rounded-2xl p-4 animate-pulse flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-800 rounded-full" />
                    <div className="space-y-2">
                        <div className="h-4 w-40 bg-slate-800 rounded" />
                        <div className="h-3 w-64 bg-slate-800/60 rounded" />
                    </div>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const currentLvl = stats.currentLevel;
    const nextLvl = stats.nextLevel;
    const isMaxLevel = currentLvl && currentLvl.level === 6;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 p-4 sm:p-5 shadow-lg shadow-amber-950/20 text-white">
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                {/* Left side: Badge & Level Info */}
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="relative shrink-0 flex items-center justify-center">
                        {currentLvl ? (
                            <CreatorBadgeIcon level={currentLvl.level} size={68} className="w-16 h-16 sm:w-18 sm:h-18" />
                        ) : (
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center">
                                <Award className="w-7 h-7 text-amber-400" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                Current Goal
                            </span>
                            <span className="text-xs text-slate-400">
                                {currentLvl ? `Rank: ${currentLvl.title}` : 'Starter Creator'}
                            </span>
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight truncate">
                            {isMaxLevel ? (
                                <span className="text-amber-300">Legend Creator — Maximum Level Achieved!</span>
                            ) : (
                                <span>Target: <strong className="text-amber-300">{nextLvl.title}</strong> (Level {nextLvl.level})</span>
                            )}
                        </h3>

                        {/* Progress Bar & Subtext */}
                        {!isMaxLevel ? (
                            <div className="space-y-1 max-w-xl">
                                <div className="flex items-center justify-between text-xs font-semibold">
                                    <span className="text-slate-300">
                                        {stats.quality_tests_count} / {nextLvl.requiredQualityTests} Quality Tests Conducted
                                    </span>
                                    <span className="text-amber-400 font-mono">{stats.progressPercentage}%</span>
                                </div>
                                <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-700/60">
                                    <div 
                                        className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 h-full rounded-full transition-all duration-500 shadow-sm" 
                                        style={{ width: `${Math.max(5, stats.progressPercentage)}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-0.5">
                                    <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                                    <span>
                                        Need <strong>{stats.qualityTestsNeededForNext}</strong> more quality test{stats.qualityTestsNeededForNext > 1 ? 's' : ''} (min 20 submissions each) to unlock.
                                    </span>
                                </p>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-300 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>You have conducted {stats.quality_tests_count} quality tests with 20+ submissions each. Outstanding!</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Right CTA Button */}
                <div className="shrink-0 w-full md:w-auto flex justify-end pt-2 md:pt-0">
                    <Button
                        onClick={() => navigate('/rewards')}
                        className="w-full md:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                        <span>View All Rewards</span>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
