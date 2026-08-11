import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Sparkles, CheckCircle2, Shield } from 'lucide-react';
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
            <div className="w-full bg-slate-900/90 dark:bg-slate-900/95 border border-slate-800 rounded-2xl p-3 sm:px-4 sm:py-3 animate-pulse flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800 rounded-full shrink-0" />
                    <div className="space-y-1">
                        <div className="h-3 w-32 bg-slate-800 rounded" />
                        <div className="h-2 w-48 bg-slate-800/60 rounded" />
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
            className="group relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/50 p-2.5 sm:px-5 sm:py-3.5 shadow-md shadow-amber-950/20 text-white cursor-pointer transition-all duration-300 hover:border-amber-500/50"
        >
            {/* Background ambient glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none -translate-y-1/2 translate-x-1/3 group-hover:bg-amber-500/20 transition-all duration-500" />

            <div className="relative z-10 flex flex-row items-center justify-between gap-2.5 sm:gap-5">
                {/* Left Side: Current Level Badge & Goal Info */}
                <div className="flex items-center gap-2.5 sm:gap-4 flex-1 min-w-0">
                    {/* Current Badge Icon */}
                    <div className="relative shrink-0 flex flex-col items-center justify-center">
                        {currentLvl ? (
                            <CreatorBadgeIcon level={currentLvl.level} size={48} className="w-10 h-10 sm:w-14 sm:h-14" />
                        ) : (
                            <div className="w-9 h-9 sm:w-13 sm:h-13 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center shadow-inner">
                                <Award className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400" />
                            </div>
                        )}
                        <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            {currentLvl ? `Lvl ${currentLvl.level}` : 'Starter'}
                        </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                Goal
                            </span>
                            <span className="text-[10px] sm:text-xs text-slate-400 truncate">
                                {currentLvl ? `Rank: ${currentLvl.title}` : 'Starter Creator'}
                            </span>
                        </div>

                        <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-tight truncate">
                            {isMaxLevel ? (
                                <span className="text-amber-300">Legend Creator — Max Level!</span>
                            ) : (
                                <span>Target: <strong className="text-amber-300">{nextLvl.title}</strong> <span className="hidden sm:inline">(Level {nextLvl.level})</span></span>
                            )}
                        </h3>

                        {/* Progress Bar Container */}
                        {!isMaxLevel ? (
                            <div className="space-y-0.5 pt-0.5">
                                <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold">
                                    <span className="text-slate-300 truncate">
                                        {stats.quality_tests_count} / {nextLvl.requiredQualityTests} Quality Tests
                                    </span>
                                    <span className="text-amber-400 font-mono font-bold ml-1.5 shrink-0">{stats.progressPercentage}%</span>
                                </div>
                                
                                <div className="relative w-full bg-slate-800/90 rounded-full h-1.5 sm:h-2 overflow-hidden border border-slate-700/80">
                                    <div 
                                        className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 h-full rounded-full transition-all duration-500 shadow-sm" 
                                        style={{ width: `${Math.max(5, stats.progressPercentage)}%` }}
                                    />
                                </div>

                                <p className="text-[9px] sm:text-[10px] text-slate-400 flex items-center gap-1 truncate">
                                    <Shield className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                    <span className="truncate">
                                        Need <strong>{stats.qualityTestsNeededForNext}</strong> more test{stats.qualityTestsNeededForNext > 1 ? 's' : ''} (min 20 subs each)
                                    </span>
                                </p>
                            </div>
                        ) : (
                            <p className="text-[10px] sm:text-[11px] text-slate-300 flex items-center gap-1 truncate">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="truncate">Mastered {stats.quality_tests_count} quality tests!</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Side: Direct Target Badge Icon */}
                {!isMaxLevel && nextLvl && (
                    <div className="shrink-0 flex items-center justify-center pl-1 sm:pl-2">
                        <div className="relative">
                            <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-md animate-pulse pointer-events-none" />
                            <CreatorBadgeIcon level={nextLvl.level} size={52} className="w-12 h-12 sm:w-16 sm:h-16 drop-shadow-md relative z-10" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
