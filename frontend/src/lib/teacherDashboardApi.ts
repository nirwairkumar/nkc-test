import { supabase } from '@/integrations/supabase/client';

export function isSampleUser(email?: string | null): boolean {
    if (!email) return false;
    const lower = email.toLowerCase().trim();
    return (
        lower === 'student@testoza.com' ||
        lower === 'teacher@testoza.com' ||
        lower === 'institution@testoza.com' ||
        (lower.endsWith('@testoza.com') && lower !== 'support@testoza.com')
    );
}

export interface TeacherDashboardAnalytics {
    totalSubmissions: number;
    submissionsToday: number;
    avgScorePct: number;
    weeklySubmissions: { day: string; count: number }[];
    scoreDistribution: { topTierPct: number; avgTierPct: number; needsSupportPct: number };
    recentResponses: {
        id: string;
        studentName: string;
        studentAvatar: string;
        testTitle: string;
        score: string;
        percentage: number;
        submittedAt: string;
        status: string;
    }[];
    liveActivities: {
        id: string;
        user: string;
        action: string;
        detail: string;
        time: string;
        type: string;
        color: string;
    }[];
}

export const SAMPLE_TEACHER_ANALYTICS: TeacherDashboardAnalytics = {
    totalSubmissions: 384,
    submissionsToday: 24,
    avgScorePct: 78,
    weeklySubmissions: [
        { day: 'Mon', count: 24 },
        { day: 'Tue', count: 42 },
        { day: 'Wed', count: 35 },
        { day: 'Thu', count: 68 },
        { day: 'Fri', count: 54 },
        { day: 'Sat', count: 89 },
        { day: 'Sun', count: 72 },
    ],
    scoreDistribution: {
        topTierPct: 42,
        avgTierPct: 45,
        needsSupportPct: 13,
    },
    recentResponses: [
        {
            id: 'res-1',
            studentName: 'Aarav Patel',
            studentAvatar: '',
            testTitle: 'Physics Weekly Mock Test #4',
            score: '45/50',
            percentage: 90,
            submittedAt: '12 mins ago',
            status: 'Passed',
        },
        {
            id: 'res-2',
            studentName: 'Priya Sharma',
            studentAvatar: '',
            testTitle: 'Chemistry Chapter 4 Practice',
            score: '38/50',
            percentage: 76,
            submittedAt: '34 mins ago',
            status: 'Passed',
        },
        {
            id: 'res-3',
            studentName: 'Rohan Gupta',
            studentAvatar: '',
            testTitle: 'Mathematics Midterm Set B',
            score: '48/50',
            percentage: 96,
            submittedAt: '1 hour ago',
            status: 'Passed',
        },
        {
            id: 'res-4',
            studentName: 'Ananya Verma',
            studentAvatar: '',
            testTitle: 'NEET Physics Unit Test',
            score: '28/50',
            percentage: 56,
            submittedAt: '2 hours ago',
            status: 'Needs Review',
        },
    ],
    liveActivities: [
        {
            id: '1',
            user: 'Rahul Sharma',
            action: 'submitted Physics Weekly Mock #4',
            detail: 'Score: 42/50 (84%)',
            time: '2 mins ago',
            type: 'success',
            color: 'text-emerald-600 bg-emerald-50',
        },
        {
            id: '2',
            user: '12 Students',
            action: 'completed Chemistry Chapter 4 Mock',
            detail: 'Batch 2026',
            time: '15 mins ago',
            type: 'batch',
            color: 'text-blue-600 bg-blue-50',
        },
        {
            id: '3',
            user: 'System',
            action: 'Result published for Math Midterm',
            detail: 'Notifications sent to 45 candidates',
            time: '1 hour ago',
            type: 'system',
            color: 'text-purple-600 bg-purple-50',
        },
        {
            id: '4',
            user: 'St. Xavier Institute',
            action: 'cloned JEE Advanced Sample Paper',
            detail: 'Community Library',
            time: '3 hours ago',
            type: 'clone',
            color: 'text-indigo-600 bg-indigo-50',
        },
        {
            id: '5',
            user: 'System',
            action: 'Exam Scheduled: NEET Final Mock',
            detail: 'Starts tomorrow 9:00 AM',
            time: '5 hours ago',
            type: 'schedule',
            color: 'text-amber-600 bg-amber-50',
        },
    ],
};

export async function fetchTeacherAnalytics(teacherUserId: string, userTests: any[]): Promise<TeacherDashboardAnalytics> {
    if (!teacherUserId || !userTests || userTests.length === 0) {
        return getEmptyAnalytics();
    }

    const testIds = userTests.map(t => t.id).filter(Boolean);
    if (testIds.length === 0) {
        return getEmptyAnalytics();
    }

    try {
        // Fetch user attempts for these tests
        const { data: attempts, error } = await (supabase as any)
            .from('user_tests')
            .select(`
                id,
                user_id,
                test_id,
                score,
                created_at,
                metadata,
                tests (
                    id,
                    title,
                    total_max_marks,
                    total_questions
                ),
                profiles:user_id (
                    full_name,
                    avatar_url,
                    email
                )
            `)
            .in('test_id', testIds)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching user attempts for dashboard:", error);
            return getEmptyAnalytics();
        }

        const safeAttempts = Array.isArray(attempts) ? attempts : [];
        const totalSubmissions = safeAttempts.length;

        // Submissions today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const submissionsToday = safeAttempts.filter(att => new Date(att.created_at) >= startOfToday).length;

        // Average Score Pct
        let totalPctSum = 0;
        let validPctCount = 0;
        let topCount = 0;
        let avgCount = 0;
        let needsSupportCount = 0;

        safeAttempts.forEach(att => {
            const maxMarks = Number(att.tests?.total_max_marks) || Number(att.metadata?.stats?.totalQuestions * 4) || 100;
            const score = Number(att.score) || 0;
            const pct = Math.max(0, Math.min(100, Math.round((score / maxMarks) * 100)));

            totalPctSum += pct;
            validPctCount++;

            if (pct >= 80) topCount++;
            else if (pct >= 50) avgCount++;
            else needsSupportCount++;
        });

        const avgScorePct = validPctCount > 0 ? Math.round(totalPctSum / validPctCount) : 0;

        const topTierPct = totalSubmissions > 0 ? Math.round((topCount / totalSubmissions) * 100) : 0;
        const avgTierPct = totalSubmissions > 0 ? Math.round((avgCount / totalSubmissions) * 100) : 0;
        const needsSupportPct = totalSubmissions > 0 ? Math.round((needsSupportCount / totalSubmissions) * 100) : 0;

        // Weekly submissions (Mon - Sun for current week)
        const weeklySubmissions = getWeeklyCounts(safeAttempts);

        // Recent Responses (top 5)
        const recentResponses = safeAttempts.slice(0, 5).map((att: any, idx: number) => {
            const maxMarks = Number(att.tests?.total_max_marks) || 100;
            const score = Number(att.score) || 0;
            const pct = Math.max(0, Math.min(100, Math.round((score / maxMarks) * 100)));
            const studentName = att.profiles?.full_name || att.metadata?.startFormData?.Name || `Student ${idx + 1}`;
            const studentAvatar = att.profiles?.avatar_url || '';
            const testTitle = att.tests?.title || 'Practice Test';
            const submittedAt = formatTimeAgo(att.created_at);

            return {
                id: att.id,
                studentName,
                studentAvatar,
                testTitle,
                score: `${score}/${maxMarks}`,
                percentage: pct,
                submittedAt,
                status: pct >= 50 ? 'Passed' : 'Needs Review',
            };
        });

        // Live Activities (converted from attempts)
        const liveActivities = safeAttempts.slice(0, 5).map((att: any) => {
            const studentName = att.profiles?.full_name || att.metadata?.startFormData?.Name || 'A student';
            const testTitle = att.tests?.title || 'Test';
            const maxMarks = Number(att.tests?.total_max_marks) || 100;
            const score = Number(att.score) || 0;
            const pct = Math.max(0, Math.min(100, Math.round((score / maxMarks) * 100)));

            return {
                id: att.id,
                user: studentName,
                action: `submitted ${testTitle}`,
                detail: `Score: ${score}/${maxMarks} (${pct}%)`,
                time: formatTimeAgo(att.created_at),
                type: 'success',
                color: 'text-emerald-600 bg-emerald-50',
            };
        });

        return {
            totalSubmissions,
            submissionsToday,
            avgScorePct,
            weeklySubmissions,
            scoreDistribution: { topTierPct, avgTierPct, needsSupportPct },
            recentResponses,
            liveActivities,
        };
    } catch (err) {
        console.error("Failed to load teacher analytics:", err);
        return getEmptyAnalytics();
    }
}

function getEmptyAnalytics(): TeacherDashboardAnalytics {
    return {
        totalSubmissions: 0,
        submissionsToday: 0,
        avgScorePct: 0,
        weeklySubmissions: [
            { day: 'Mon', count: 0 },
            { day: 'Tue', count: 0 },
            { day: 'Wed', count: 0 },
            { day: 'Thu', count: 0 },
            { day: 'Fri', count: 0 },
            { day: 'Sat', count: 0 },
            { day: 'Sun', count: 0 },
        ],
        scoreDistribution: { topTierPct: 0, avgTierPct: 0, needsSupportPct: 0 },
        recentResponses: [],
        liveActivities: [],
    };
}

function getWeeklyCounts(attempts: any[]): { day: string; count: number }[] {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = [0, 0, 0, 0, 0, 0, 0];

    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // Mon = 0, Sun = 6
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - currentDayOfWeek);

    attempts.forEach(att => {
        const date = new Date(att.created_at);
        if (date >= startOfWeek) {
            const dayIdx = (date.getDay() + 6) % 7;
            if (dayIdx >= 0 && dayIdx < 7) {
                counts[dayIdx]++;
            }
        }
    });

    return days.map((day, idx) => ({ day, count: counts[idx] }));
}

function formatTimeAgo(dateStr: string): string {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}
