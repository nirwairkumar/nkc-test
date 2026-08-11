import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Helmet } from 'react-helmet-async';
import {
    ClipboardList,
    BarChart2,
    Users,
    CheckCircle2,
    Radio,
    Search,
    ArrowRight,
    FileText,
    Sparkles,
    Clock,
    Filter,
    Calendar,
    Award,
    HelpCircle,
    Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import SplashLoader from '@/components/ui/SplashLoader';
import { fetchTestsByUserId, Test } from '@/lib/testsApi';
import { supabase } from '@/integrations/supabase/client';

interface ConductedTestCardItem {
    id: string;
    title: string;
    custom_id?: string;
    category?: string;
    created_at?: string;
    submissions_count: number;
    duration?: number;
    total_questions?: number;
    total_max_marks?: number;
    is_live: boolean;
    has_conduct_enabled: boolean;
    conduct_slug?: string;
}

export default function AllSubmissionsPage() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [tests, setTests] = useState<ConductedTestCardItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterTab, setFilterTab] = useState<'all' | 'submitted' | 'live'>('all');

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
            return;
        }

        if (user?.id) {
            loadConductedSubmissionsData();
        }
    }, [user, authLoading]);

    const loadConductedSubmissionsData = async () => {
        setLoading(true);
        try {
            // 1. Fetch user's tests
            const { data: userTests } = await fetchTestsByUserId(user!.id);
            const rawTests: Test[] = Array.isArray(userTests) ? userTests : [];

            const testIds = rawTests.map(t => t.id);

            // 2. Fetch submission counts for these tests from user_tests
            const submissionCountMap: Record<string, number> = {};
            testIds.forEach(id => { submissionCountMap[id] = 0; });

            if (testIds.length > 0) {
                const { data: attempts } = await (supabase as any)
                    .from('user_tests')
                    .select('test_id')
                    .in('test_id', testIds);

                if (attempts && Array.isArray(attempts)) {
                    attempts.forEach((a: any) => {
                        if (a.test_id && submissionCountMap[a.test_id] !== undefined) {
                            submissionCountMap[a.test_id] += 1;
                        }
                    });
                }
            }

            const now = new Date();

            const mapped: ConductedTestCardItem[] = rawTests.map(t => {
                const isEnded = !!t.settings?.schedule?.end_time && new Date(t.settings.schedule.end_time) < now;
                const isLive = !!t.settings?.conduct_exam?.enabled && !isEnded;
                const hasConduct = !!t.settings?.conduct_exam;

                return {
                    id: t.id,
                    title: t.title || "Untitled Assessment",
                    custom_id: t.custom_id,
                    category: t.custom_category || 'General Assessment',
                    created_at: t.created_at,
                    submissions_count: submissionCountMap[t.id] || 0,
                    duration: t.duration || 180,
                    total_questions: t.total_questions || (t.questions?.length || 0),
                    total_max_marks: t.total_max_marks || (t.questions?.length ? t.questions.length * 4 : 300),
                    is_live: isLive,
                    has_conduct_enabled: hasConduct,
                    conduct_slug: t.settings?.conduct_exam?.conduct_slug
                };
            });

            // Sort: Live tests first, then by submissions count, then by date
            mapped.sort((a, b) => {
                if (a.is_live && !b.is_live) return -1;
                if (!a.is_live && b.is_live) return 1;
                if (b.submissions_count !== a.submissions_count) {
                    return b.submissions_count - a.submissions_count;
                }
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            });

            setTests(mapped);
        } catch (err) {
            console.error("Failed to load conducted submissions data:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredTests = useMemo(() => {
        return tests.filter(t => {
            const query = searchQuery.trim().toLowerCase();
            const matchesQuery = !query ||
                t.title.toLowerCase().includes(query) ||
                (t.custom_id && t.custom_id.toLowerCase().includes(query)) ||
                (t.category && t.category.toLowerCase().includes(query));

            if (!matchesQuery) return false;

            if (filterTab === 'submitted') return t.submissions_count > 0;
            if (filterTab === 'live') return t.is_live;
            return true;
        });
    }, [tests, searchQuery, filterTab]);

    const totalSubmissionsSum = useMemo(() => {
        return tests.reduce((acc, curr) => acc + curr.submissions_count, 0);
    }, [tests]);

    const liveExamsCount = useMemo(() => {
        return tests.filter(t => t.is_live).length;
    }, [tests]);

    if (authLoading || loading) {
        return <SplashLoader text="Loading All Submissions & Conducted Tests..." />;
    }

    return (
        <div className="container mx-auto max-w-6xl py-3 px-3 sm:py-6 sm:px-4 space-y-4 sm:space-y-5">
            <Helmet>
                <title>All Submissions & Test Reports | TestoZa</title>
                <meta name="description" content="View all student submissions and inspect full test analytics for your conducted exams." />
            </Helmet>

            {/* iOS-Inspired Title Header with Mobile Offset */}
            <div className="pl-8 sm:pl-0 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3 sm:pb-4">
                <div>
                    <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                        All Student Submissions
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Select any test below to inspect complete student scorecards, rankings, and question-by-question analysis.
                    </p>
                </div>

                <Button
                    onClick={() => navigate('/my-tests')}
                    variant="outline"
                    size="sm"
                    className="self-start md:self-auto gap-1.5 text-xs text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-xl h-8 sm:h-9"
                >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Manage Tests</span>
                </Button>
            </div>

            {/* Quick Metrics Cards - 3 Column Grid on Mobile for Maximum Space Efficiency */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <Card className="p-2.5 sm:p-4 bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-2 sm:gap-3.5 rounded-xl sm:rounded-2xl shadow-2xs">
                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 sm:w-5.5 sm:h-5.5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">Total Submissions</p>
                        <p className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 font-mono leading-tight">
                            {totalSubmissionsSum}
                        </p>
                        <p className="text-[9px] text-slate-400 hidden sm:block">Across all tests</p>
                    </div>
                </Card>

                <Card className="p-2.5 sm:p-4 bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-2 sm:gap-3.5 rounded-xl sm:rounded-2xl shadow-2xs">
                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Radio className="w-4 h-4 sm:w-5.5 sm:h-5.5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">Live Exams</p>
                        <p className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono leading-tight">
                            {liveExamsCount}
                        </p>
                        <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium hidden sm:block">Active responses</p>
                    </div>
                </Card>

                <Card className="p-2.5 sm:p-4 bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-2 sm:gap-3.5 rounded-xl sm:rounded-2xl shadow-2xs">
                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <BarChart2 className="w-4 h-4 sm:w-5.5 sm:h-5.5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">Conducted Tests</p>
                        <p className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 font-mono leading-tight">
                            {tests.length}
                        </p>
                        <p className="text-[9px] text-slate-400 hidden sm:block">Total tests</p>
                    </div>
                </Card>
            </div>

            {/* Search & Filter Bar - Horizontally Scrollable Pills on Mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search test title or ID..."
                        className="pl-8 sm:pl-9 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 h-8.5 sm:h-9 text-xs sm:text-sm rounded-xl"
                    />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
                    <button
                        onClick={() => setFilterTab('all')}
                        className={`shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            filterTab === 'all'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        All Tests ({tests.length})
                    </button>
                    <button
                        onClick={() => setFilterTab('submitted')}
                        className={`shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            filterTab === 'submitted'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        With Submissions ({tests.filter(t => t.submissions_count > 0).length})
                    </button>
                    <button
                        onClick={() => setFilterTab('live')}
                        className={`shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            filterTab === 'live'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        Live Exams ({liveExamsCount})
                    </button>
                </div>
            </div>

            {/* Test Submissions Cards List */}
            {filteredTests.length === 0 ? (
                <Card className="p-6 sm:p-8 text-center bg-white dark:bg-slate-900 border-dashed border-2 border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl space-y-3">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
                        <Inbox className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">No Tests Found</h3>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                        {searchQuery ? `No test matches "${searchQuery}". Try clearing your search.` : 'You have not conducted any tests yet. Once students submit their answers, their response data will appear here for 1-click analysis.'}
                    </p>
                    <Button
                        onClick={() => navigate('/my-tests')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold text-xs sm:text-sm"
                    >
                        Go to My Tests
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {filteredTests.map((test) => {
                        return (
                            <Card
                                key={test.id}
                                className="group relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-5 shadow-2xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4"
                            >
                                <div className="space-y-1.5 flex-1 min-w-0">
                                    {/* Badges row */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {test.is_live ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 animate-pulse">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                                LIVE EXAM
                                            </span>
                                        ) : test.has_conduct_enabled ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                                                Conducted
                                            </span>
                                        ) : null}

                                        {test.category && test.category.toLowerCase() !== 'general assessment' && (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate max-w-[150px]">
                                                {test.category}
                                            </span>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-sm sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {test.title}
                                    </h3>

                                    {/* Test Info Metadata */}
                                    <div className="flex items-center gap-3 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                                            {test.duration} mins
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                                            {test.total_questions} Questions ({test.total_max_marks} Marks)
                                        </span>
                                        {test.created_at && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                                                Conducted: {new Date(test.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        )}
                                        {test.custom_id && (
                                            <span className="font-mono text-slate-400">
                                                ID: {test.custom_id}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side Action Block - Responsive Layout for Mobile */}
                                <div className="flex items-center justify-between gap-2.5 shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 w-full md:w-auto">
                                    {/* Submissions count pill */}
                                    <div className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-indigo-50/70 dark:bg-slate-800/80 border border-indigo-100 dark:border-slate-700 text-center flex flex-col items-center justify-center min-w-[80px] sm:min-w-[100px]">
                                        <p className="text-base sm:text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-mono leading-none">
                                            {test.submissions_count}
                                        </p>
                                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wider">
                                            Submissions
                                        </p>
                                    </div>

                                    {/* Primary Redirect Button */}
                                    <Button
                                        onClick={() => navigate(`/analytics/full?testId=${test.id}`)}
                                        className="flex-1 md:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-bold h-10 sm:h-11 text-xs sm:text-sm rounded-xl cursor-pointer shadow-xs active:scale-[0.98] transition-all"
                                    >
                                        <span>View Full Analysis</span>
                                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
