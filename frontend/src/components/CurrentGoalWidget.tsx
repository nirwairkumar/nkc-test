import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Sparkles, CheckCircle2, Shield, Target } from 'lucide-react';
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
        <div 
            onClick={() => navigate('/rewards')}
            className="group relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/50 p-4 sm:p-5 shadow-lg shadow-amber-950/20 text-white cursor-pointer transition-all duration-300 hover:border-amber-500/50"
        >
            {/* Background ambient glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3 group-hover:bg-amber-500/20 transition-all duration-500" />

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                {/* Left Side: Current Level Badge & Goal Info */}
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                    {/* Current Badge Icon */}
                    <div className="relative shrink-0 flex flex-col items-center justify-center">
                        {currentLvl ? (
                            <CreatorBadgeIcon level={currentLvl.level} size={64} className="w-14 h-14 sm:w-16 sm:h-16" />
                        ) : (
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center shadow-inner">
                                <Award className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
                            </div>
                        )}
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            {currentLvl ? `Lvl ${currentLvl.level}` : 'Starter'}
                        </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                Current Goal
                            </span>
                            <span className="text-xs text-slate-400">
                                {currentLvl ? `Rank: ${currentLvl.title}` : 'Starter Creator'}
                            </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight truncate">
                            {isMaxLevel ? (
                                <span className="text-amber-300">Legend Creator — Maximum Level Achieved!</span>
                            ) : (
                                <span>Target: <strong className="text-amber-300">{nextLvl.title}</strong> (Level {nextLvl.level})</span>
                            )}
                        </h3>

                        {/* Progress Bar Container pointing directly toward Target Badge */}
                        {!isMaxLevel ? (
                            <div className="space-y-1 pt-0.5">
                                <div className="flex items-center justify-between text-xs font-semibold">
                                    <span className="text-slate-300">
                                        {stats.quality_tests_count} / {nextLvl.requiredQualityTests} Quality Tests
                                    </span>
                                    <span className="text-amber-400 font-mono font-bold">{stats.progressPercentage}%</span>
                                </div>
                                
                                <div className="relative w-full bg-slate-800/90 rounded-full h-2.5 overflow-hidden border border-slate-700/80">
                                    <div 
                                        className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 h-full rounded-full transition-all duration-500 shadow-sm" 
                                        style={{ width: `${Math.max(5, stats.progressPercentage)}%` }}
                                    />
                                </div>

                                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                    <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                                    <span>
                                        Need <strong>{stats.qualityTestsNeededForNext}</strong> more quality test{stats.qualityTestsNeededForNext > 1 ? 's' : ''} (min 20 submissions each)
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

                {/* Right Side: Actual Target Badge Being Chased */}
                {!isMaxLevel && nextLvl && (
                    <div className="shrink-0 flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 group-hover:border-amber-400/60 group-hover:bg-amber-500/15 transition-all duration-300">
                        <div className="relative">
                            <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-md animate-pulse pointer-events-none" />
                            <CreatorBadgeIcon level={nextLvl.level} size={84} className="w-18 h-18 sm:w-22 sm:h-22 drop-shadow-md relative z-10" />
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-extrabold text-amber-300 tracking-wider uppercase mt-1">
                            <Target className="w-3 h-3 text-amber-400" />
                            <span>Chasing Level {nextLvl.level}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
