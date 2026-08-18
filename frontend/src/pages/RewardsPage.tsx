import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Helmet } from 'react-helmet-async';
import {
    Award,
    Sparkles,
    Shield,
    CheckCircle2,
    Lock,
    BarChart3,
    FileText,
    Users,
    ChevronRight,
    ArrowLeft,
    Loader2,
    HelpCircle,
    Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import SplashLoader from '@/components/ui/SplashLoader';
import { CreatorBadgeIcon } from '@/components/CreatorBadgeIcon';
import { CREATOR_LEVELS, fetchCreatorRewards, CreatorRewardsStats, CreatorLevelConfig } from '@/lib/rewardsApi';

export default function RewardsPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState<CreatorRewardsStats | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const queryParams = new URLSearchParams(window.location.search);
    const impersonateUserId = queryParams.get("userId");
    const targetUserId = impersonateUserId || user?.id;

    useEffect(() => {
        if (!authLoading && !user) {
            return;
        }

        if (targetUserId) {
            loadRewardsData(targetUserId);
        }
    }, [targetUserId, authLoading, user]);

    const loadRewardsData = async (uid: string) => {
        setLoading(true);
        const { data } = await fetchCreatorRewards(uid);
        setStats(data);
        setLoading(false);
    };

    if (authLoading || loading) {
        return <SplashLoader text="Loading Creator Rewards & Badges..." />;
    }

    const currentLvl = stats?.currentLevel;
    const nextLvl = stats?.nextLevel;
    const qualityCount = stats?.quality_tests_count || 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 px-3 sm:px-6 lg:px-8">
            <Helmet>
                <title>Creator Rewards & Badges | TestoZa</title>
                <meta name="description" content="Earn creator badges and unlock rewards by conducting tests on TestoZa." />
            </Helmet>

            <div className="max-w-6xl mx-auto space-y-6">

                {/* Back & Title Bar */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/my-tests')}
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 gap-1.5 cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to My Tests</span>
                    </Button>
                    <Badge variant="outline" className="border-amber-500/30 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 gap-1 font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Creator Rewards Program
                    </Badge>
                </div>

                {/* Header Banner */}
                <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/60 p-6 sm:p-8 text-white shadow-xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-3 max-w-2xl">
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                                    {currentLvl ? currentLvl.title : 'Starter Creator'}
                                </span>
                                {currentLvl && (
                                    <span className="text-xs text-slate-400 font-mono">
                                        Level {currentLvl.level} Badge Unlocked
                                    </span>
                                )}
                            </div>

                            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                                Creator Badges & Rewards
                            </h1>
                            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                                Conduct quality tests with at least <strong className="text-amber-300">20 student submissions</strong> each to rank up your creator profile and earn prestigious platform badges!
                            </p>

                            {/* Current Goal Progress */}
                            {nextLvl && (
                                <div className="pt-2 space-y-2">
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="text-amber-200">
                                            Next Milestone: <strong className="text-white">{nextLvl.title} (Level {nextLvl.level})</strong>
                                        </span>
                                        <span className="text-amber-400 font-mono font-bold">{stats?.progressPercentage}%</span>
                                    </div>
                                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700/80">
                                        <div
                                            className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 h-full rounded-full transition-all duration-500 shadow-sm"
                                            style={{ width: `${Math.max(4, stats?.progressPercentage || 0)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        {qualityCount} of {nextLvl.requiredQualityTests} Conducted Tests completed ({stats?.qualityTestsNeededForNext} needed to reach Level {nextLvl.level})
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Rank Badge Display */}
                        <div className="shrink-0 flex flex-col items-center justify-center p-4 bg-slate-900/80 rounded-2xl border border-amber-500/30 shadow-inner">
                            {currentLvl ? (
                                <CreatorBadgeIcon level={currentLvl.level} size={140} className="w-28 h-28 sm:w-36 sm:h-36" />
                            ) : (
                                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-amber-500/10 border-2 border-dashed border-amber-500/40 flex flex-col items-center justify-center text-amber-400 p-2">
                                    <Award className="w-12 h-12 mb-1" />
                                    <span className="text-xs font-bold text-center">Unranked</span>
                                </div>
                            )}
                            <span className="text-xs font-bold text-amber-300 mt-2">
                                {currentLvl ? currentLvl.title : 'Starter Creator'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Key Metrics Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Award className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Conducted Tests</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{qualityCount}</p>
                            <p className="text-[10px] text-slate-400">20+ submissions each</p>
                        </div>
                    </Card>

                    <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Submissions</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{stats?.total_submissions || 0}</p>
                            <p className="text-[10px] text-slate-400">Across all tests</p>
                        </div>
                    </Card>

                    <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tests Created</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{stats?.total_tests || 0}</p>
                            <p className="text-[10px] text-slate-400">Total published/private</p>
                        </div>
                    </Card>

                    <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Current Rank</p>
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">
                                {currentLvl ? `Level ${currentLvl.level}` : 'Unranked'}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">{currentLvl?.title || 'Reach 5 Conducted Tests'}</p>
                        </div>
                    </Card>
                </div>

                {/* 6 Creator Badges Showcase Grid */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Creator Levels & Badges</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Unlock higher badges as you conduct more tests on the platform</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {CREATOR_LEVELS.map((lvl) => {
                            const isUnlocked = qualityCount >= lvl.requiredQualityTests;
                            const isCurrentGoal = !isUnlocked && nextLvl?.level === lvl.level;

                            return (
                                <Card
                                    key={lvl.level}
                                    className={`relative overflow-hidden p-6 transition-all duration-300 flex flex-col items-center text-center space-y-3 ${
                                        isUnlocked
                                            ? 'bg-white dark:bg-slate-900 border-2 border-amber-400/80 dark:border-amber-500/60 shadow-lg shadow-amber-500/5'
                                            : isCurrentGoal
                                            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-2 border-dashed border-amber-500 animate-in zoom-in-95'
                                            : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
                                    }`}
                                >
                                    {/* Top Status Tag */}
                                    <div className="w-full flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 uppercase">
                                            LEVEL {lvl.level}
                                        </span>

                                        {isUnlocked ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                UNLOCKED
                                            </span>
                                        ) : isCurrentGoal ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                                                <Sparkles className="w-3 h-3 text-amber-500" />
                                                CURRENT GOAL
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                <Lock className="w-3 h-3" />
                                                LOCKED
                                            </span>
                                        )}
                                    </div>

                                    {/* Badge Vector Icon */}
                                    <div className="py-2">
                                        <CreatorBadgeIcon level={lvl.level} size={150} locked={!isUnlocked} className="w-32 h-32" />
                                    </div>

                                    {/* Badge Details */}
                                    <div className="space-y-1 w-full">
                                        <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                                            {lvl.title}
                                        </h3>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                            {lvl.requiredQualityTests} tests conducted
                                        </p>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                            {lvl.requiredSubmissionsPerTest}+ submissions each
                                        </p>
                                    </div>

                                    {/* Progress indicator for current goal */}
                                    {isCurrentGoal && (
                                        <div className="w-full pt-2 space-y-1">
                                            <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                                <span>Progress</span>
                                                <span>{qualityCount} / {lvl.requiredQualityTests} Tests</span>
                                            </div>
                                            <Progress value={(qualityCount / lvl.requiredQualityTests) * 100} className="h-1.5 bg-amber-200 dark:bg-amber-950" />
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Explanation Note matching the uploaded reference image */}
                <div className="rounded-2xl border border-amber-300 dark:border-amber-800/60 bg-gradient-to-r from-amber-50/80 via-yellow-50/50 to-amber-50/80 dark:from-amber-950/40 dark:via-slate-900 dark:to-amber-950/40 p-4 sm:p-5 flex items-center justify-center gap-3 text-center shadow-sm">
                    <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5" />
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Earn higher badges by conducting more tests with at least 20 submissions per test.
                    </p>
                </div>

                {/* Quality Tests Breakdown List */}
                {stats?.test_details && stats.test_details.length > 0 && (
                    <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Your Tests & Submissions Audit</h3>
                                <p className="text-xs text-slate-500">Track student submission counts per test to see which tests count toward your badges</p>
                            </div>
                            <Badge variant="outline" className="text-xs font-semibold">
                                {stats.test_details.filter(t => t.is_quality).length} / {stats.test_details.length} Conducted Tests
                            </Badge>
                        </div>

                        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                            {stats.test_details.map((t) => (
                                <div
                                    key={t.id}
                                    className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-colors ${
                                        t.is_quality
                                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        {t.is_quality ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                        ) : (
                                            <BarChart3 className="w-4 h-4 text-slate-400 shrink-0" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{t.title}</p>
                                            <p className="text-[11px] text-slate-400 font-mono">{t.custom_id || t.id}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-right">
                                        <div>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                {t.submissions_count}
                                            </span>
                                            <span className="text-[11px] text-slate-500"> / 20 submissions</span>
                                        </div>

                                        {t.is_quality ? (
                                            <Badge className="bg-emerald-500 text-white font-bold text-[10px] hover:bg-emerald-600">
                                                Conducted Test Verified
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800">
                                                {t.needed_submissions} more needed
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

            </div>
        </div>
    );
}
