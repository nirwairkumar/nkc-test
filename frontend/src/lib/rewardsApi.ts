import apiClient from '@/lib/apiClient';
import { supabase } from '@/integrations/supabase/client';

export interface CreatorLevelConfig {
    level: number;
    title: string;
    requiredQualityTests: number;
    requiredSubmissionsPerTest: number;
    badgeName: string;
    subtitle: string;
    description: string;
    themeColor: string; // Tailwind color class or hex
}

export const CREATOR_LEVELS: CreatorLevelConfig[] = [
    {
        level: 1,
        title: 'VERIFIED CREATOR',
        requiredQualityTests: 5,
        requiredSubmissionsPerTest: 20,
        badgeName: 'Verified Medal',
        subtitle: 'Level 1 Badge',
        description: '5 tests conducted (20+ submissions each)',
        themeColor: 'from-amber-600 to-amber-700'
    },
    {
        level: 2,
        title: 'TRUSTED CREATOR',
        requiredQualityTests: 20,
        requiredSubmissionsPerTest: 20,
        badgeName: 'Trusted Medal',
        subtitle: 'Level 2 Badge',
        description: '20 tests conducted (20+ submissions each)',
        themeColor: 'from-bronze-500 to-amber-800'
    },
    {
        level: 3,
        title: 'EXPERT CREATOR',
        requiredQualityTests: 50,
        requiredSubmissionsPerTest: 20,
        badgeName: 'Expert Medal',
        subtitle: 'Level 3 Badge',
        description: '50 tests conducted (20+ submissions each)',
        themeColor: 'from-slate-400 to-slate-600'
    },
    {
        level: 4,
        title: 'ELITE CREATOR',
        requiredQualityTests: 100,
        requiredSubmissionsPerTest: 20,
        badgeName: 'Elite Medal',
        subtitle: 'Level 4 Badge',
        description: '100 tests conducted (20+ submissions each)',
        themeColor: 'from-yellow-500 to-amber-600'
    },
    {
        level: 5,
        title: 'MASTER CREATOR',
        requiredQualityTests: 250,
        requiredSubmissionsPerTest: 20,
        badgeName: 'Master Medal',
        subtitle: 'Level 5 Badge',
        description: '250 tests conducted (20+ submissions each)',
        themeColor: 'from-blue-600 to-indigo-800'
    },
    {
        level: 6,
        title: 'LEGEND CREATOR',
        requiredQualityTests: 500,
        requiredSubmissionsPerTest: 20,
        badgeName: 'Legend Medal',
        subtitle: 'Level 6 Badge',
        description: '500 tests conducted (20+ submissions each)',
        themeColor: 'from-amber-400 via-yellow-500 to-zinc-900'
    }
];

export interface QualityTestDetail {
    id: string;
    title: string;
    custom_id?: string;
    created_at?: string;
    submissions_count: number;
    is_quality: boolean;
    needed_submissions: number;
}

export interface CreatorRewardsStats {
    creator_id: string;
    total_tests: number;
    quality_tests_count: number;
    total_submissions: number;
    test_details: QualityTestDetail[];
    currentLevel: CreatorLevelConfig | null; // null if < 5 quality tests (Starter)
    nextLevel: CreatorLevelConfig;
    progressPercentage: number;
    qualityTestsInCurrentLevel: number;
    qualityTestsNeededForNext: number;
}

export async function fetchCreatorRewards(creatorId: string): Promise<{ data: CreatorRewardsStats | null; error: any }> {
    try {
        let statsPayload: any = null;

        // Try backend API first
        try {
            const response = await apiClient.get(`creators/${creatorId}/rewards`);
            if (response.data) {
                statsPayload = response.data;
            }
        } catch (apiErr) {
            console.warn('[rewardsApi] Backend API failed, falling back to direct Supabase client queries:', apiErr);
        }

        // Fallback to Supabase JS queries if backend endpoint failed
        if (!statsPayload) {
            const { data: tests, error: testsErr } = await (supabase as any)
                .from('tests')
                .select('id, title, created_at, custom_id, settings, created_by, user_id')
                .or(`created_by.eq.${creatorId},user_id.eq.${creatorId}`);

            if (testsErr) throw testsErr;

            const filteredTests = (tests || []).filter((t: any) => 
                !t.settings?.is_example_template && !t.settings?.is_user_example
            );

            const testIds = filteredTests.map((t: any) => t.id).filter(Boolean);
            const testSubmissionMap: Record<string, number> = {};
            filteredTests.forEach((t: any) => { if (t.id) testSubmissionMap[t.id] = 0; });

            if (testIds.length > 0) {
                const { data: attempts } = await (supabase as any)
                    .from('user_tests')
                    .select('test_id')
                    .in('test_id', testIds)
                    .limit(10000);

                (attempts || []).forEach((a: any) => {
                    if (a.test_id && testSubmissionMap[a.test_id] !== undefined) {
                        testSubmissionMap[a.test_id] += 1;
                    }
                });
            }

            let qCount = 0;
            let totalSubs = 0;
            const details: QualityTestDetail[] = filteredTests.map((t: any) => {
                const count = testSubmissionMap[t.id] || 0;
                totalSubs += count;
                const isQ = count >= 20;
                if (isQ) qCount++;
                return {
                    id: t.id,
                    title: t.title || 'Untitled Test',
                    custom_id: t.custom_id || '',
                    created_at: t.created_at || '',
                    submissions_count: count,
                    is_quality: isQ,
                    needed_submissions: Math.max(0, 20 - count)
                };
            });

            details.sort((a, b) => (b.is_quality ? 1 : 0) - (a.is_quality ? 1 : 0) || b.submissions_count - a.submissions_count);

            statsPayload = {
                creator_id: creatorId,
                total_tests: filteredTests.length,
                quality_tests_count: qCount,
                total_submissions: totalSubs,
                test_details: details
            };
        }

        const qCount = statsPayload.quality_tests_count || 0;

        // Calculate Level & Next Level
        let currentLevel: CreatorLevelConfig | null = null;
        let nextLevel: CreatorLevelConfig = CREATOR_LEVELS[0];
        let prevThreshold = 0;

        for (let i = 0; i < CREATOR_LEVELS.length; i++) {
            if (qCount >= CREATOR_LEVELS[i].requiredQualityTests) {
                currentLevel = CREATOR_LEVELS[i];
                prevThreshold = CREATOR_LEVELS[i].requiredQualityTests;
                nextLevel = CREATOR_LEVELS[i + 1] || CREATOR_LEVELS[i];
            } else {
                nextLevel = CREATOR_LEVELS[i];
                break;
            }
        }

        let progressPercentage = 0;
        let qualityTestsInCurrentLevel = 0;
        let qualityTestsNeededForNext = nextLevel.requiredQualityTests;

        if (currentLevel && currentLevel.level === 6) {
            progressPercentage = 100;
            qualityTestsInCurrentLevel = qCount;
            qualityTestsNeededForNext = 500;
        } else {
            const range = nextLevel.requiredQualityTests - prevThreshold;
            const done = qCount - prevThreshold;
            progressPercentage = Math.min(100, Math.max(0, Math.round((done / (range || 1)) * 100)));
            qualityTestsInCurrentLevel = done;
            qualityTestsNeededForNext = nextLevel.requiredQualityTests - qCount;
        }

        return {
            data: {
                ...statsPayload,
                currentLevel,
                nextLevel,
                progressPercentage,
                qualityTestsInCurrentLevel,
                qualityTestsNeededForNext
            },
            error: null
        };
    } catch (err: any) {
        console.error('Error fetching creator rewards:', err);
        return { data: null, error: err };
    }
}
