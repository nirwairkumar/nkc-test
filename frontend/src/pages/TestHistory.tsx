import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserAttempts, deleteAttempt } from '@/lib/attemptsApi';
import { fetchUserCombinedAttempts, deleteCombinedAttempt } from '@/lib/combinedSessionsApi';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Trash2, RefreshCw, Target, Layers } from 'lucide-react';
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import LatexRenderer from '@/components/ui/LatexRenderer';
import { Skeleton } from '@/components/ui/skeleton';
import { useYouTubeStyleRender } from '@/hooks/useYouTubeStyleRender';

// Framer Motion Variants for Staggered Rows
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1
        }
    }
};

const rowVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: "easeOut"
        }
    }
};

function HistoryRowSkeleton() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-5 w-[250px]" /></TableCell>
            <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
            <TableCell><Skeleton className="h-5 w-[60px]" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-[100px] inline-block" /></TableCell>
        </TableRow>
    );
}

function HistoryCardSkeleton() {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex justify-between">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-12" />
            </div>
            <Skeleton className="h-4 w-1/2" />
            <div className="pt-2 flex gap-2">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 w-8" />
            </div>
        </div>
    );
}

interface Attempt {
    id: string;
    test_id: string;
    score: number;
    total_max_marks?: number;
    created_at: string;
    answers?: any;
    test_title?: string;
    test_settings?: any;
}

interface CombinedAttempt {
    id: string;
    combined_session_id: string;
    paper1_data: any;
    paper2_data: any;
    total_score: number;
    created_at: string;
    session_title?: string;
    paper1_label?: string;
    paper2_label?: string;
}

// Global helper to handle potential string/JSON mismatch
const ensureParsed = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (e) { return []; }
    }
    return [];
};

export default function TestHistory() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [combinedAttempts, setCombinedAttempts] = useState<CombinedAttempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);
    const [testDetails, setTestDetails] = useState<Record<string, any>>({});
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchAttemptIfNeeded = async (attempt: Attempt) => {
        if (attempt.answers) return attempt;

        try {
            const { fetchAttemptById } = await import('@/lib/attemptsApi');
            const { data: fullAttempt } = await fetchAttemptById(attempt.id);
            if (fullAttempt) {
                const updatedAttempt = {
                    ...attempt,
                    answers: typeof fullAttempt.answers === 'string' ? JSON.parse(fullAttempt.answers) : fullAttempt.answers
                };
                setAttempts(prev => prev.map(a => a.id === attempt.id ? updatedAttempt : a));
                return updatedAttempt;
            }
        } catch (error) {
            console.error("Failed to fetch attempt detail", error);
            throw error;
        }
        return attempt;
    };

    const fetchFullTestIfNeeded = async (testId: string) => {
        let test = testDetails[testId];
        if (!test?.questions) {
            try {
                const { fetchTestById } = await import('@/lib/testsApi');
                const { data: t } = await fetchTestById(testId);
                if (t) {
                    test = {
                        ...test,
                        ...t,
                        questions: ensureParsed(t.questions),
                        sections: ensureParsed(t.sections),
                        merged_sections: ensureParsed(t.merged_sections)
                    };
                    setTestDetails(prev => ({ ...prev, [testId]: test }));
                }
            } catch (error) {
                console.error(`Failed to fetch test ${testId}`, error);
                throw error;
            }
        }
        return test;
    };

    useEffect(() => {
        if (user?.id) {
            loadHistory();
        }
    }, [user?.id]);

    async function loadHistory() {
        if (!user) return;
        setLoading(true);
        try {
            // Load both regular attempts and combined attempts in parallel
            const [attemptsResult, combinedResult] = await Promise.all([
                fetchUserAttempts(user.id),
                fetchUserCombinedAttempts(user.id),
            ]);

            // Handle combined attempts
            if (!combinedResult.error && combinedResult.data) {
                setCombinedAttempts(combinedResult.data);
            }

            const { data, error } = attemptsResult;
            if (error) throw error;

            // Simple map, answers field is excluded from backend anyway
            const attemptsWithTitles = data?.filter((attempt: any) => {
                const settings = attempt.test_settings || {};
                // Default to true. Only hide if explicitly set to false.
                return settings.show_results_immediate !== false;
            }).map((attempt: any) => ({
                ...attempt,
                test_title: attempt.test_title || 'Unknown Test',
            })) || [];

            setAttempts(attemptsWithTitles);
        } catch (err: any) {
            console.error('Failed to load history', err);
            const message = err.response?.data?.detail || err.message || 'Unknown error occurred';
            toast.error(`Failed to load history: ${message}`);
        } finally {
            setLoading(false);
        }
    }

    // Lazy Loading Logic
    const allLazyItems = React.useMemo(() => [
        ...combinedAttempts.map(a => ({ id: `desktop-combined-${a.id}` })),
        ...attempts.map(a => ({ id: `desktop-regular-${a.id}` })),
        ...combinedAttempts.map(a => ({ id: `mobile-combined-${a.id}` })),
        ...attempts.map(a => ({ id: `mobile-regular-${a.id}` }))
    ], [combinedAttempts, attempts]);

    const {
        registerSkeleton,
        isItemRendered,
        renderedCount,
        totalCount,
        isComplete
    } = useYouTubeStyleRender(allLazyItems, loading, {
        rootMargin: '100px',
        threshold: 0.1
    });

    const handleToggleExpand = async (id: string, testId: string, e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;

        if (expandedAttempt === id) {
            setExpandedAttempt(null);
            return;
        }

        setActionLoading(`expand-${id}`);
        try {
            // First fetch the specific attempt answers if missing
            const attempt = attempts.find(a => a.id === id);
            if (attempt) {
                await fetchAttemptIfNeeded(attempt);
            }
            // Then fetch full test metadata
            await fetchFullTestIfNeeded(testId);
            setExpandedAttempt(id);
        } catch (error) {
            toast.error("Failed to load details.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (attemptId: string) => {
        if (!confirm('Are you sure you want to delete this test record? This action cannot be undone.')) return;

        try {
            const { error } = await deleteAttempt(attemptId);
            if (error) throw error;

            toast.success('Test record deleted successfully');
            setAttempts(prev => prev.filter(a => a.id !== attemptId));
            if (expandedAttempt === attemptId) setExpandedAttempt(null);
        } catch (error: any) {
            console.error('Error deleting test:', error);
            toast.error('Failed to delete test record');
        }
    };

    const handleDeleteCombined = async (attemptId: string) => {
        if (!confirm('Delete this combined session record?')) return;
        try {
            await deleteCombinedAttempt(attemptId);
            toast.success('Combined session record deleted');
            setCombinedAttempts(prev => prev.filter(a => a.id !== attemptId));
        } catch {
            toast.error('Failed to delete combined record');
        }
    };

    const handleViewCombinedResult = async (attempt: CombinedAttempt) => {
        const { fetchTestById } = await import('@/lib/testsApi');
        const p1TestId = attempt.paper1_data?.test_id;
        const p2TestId = attempt.paper2_data?.test_id;

        const [p1TestRes, p2TestRes] = await Promise.all([
            p1TestId ? fetchTestById(p1TestId) : Promise.resolve({ data: null }),
            p2TestId ? fetchTestById(p2TestId) : Promise.resolve({ data: null }),
        ]);

        navigate('/results', {
            state: {
                isCombined: true,
                combinedSessionId: attempt.combined_session_id,
                sessionTitle: attempt.session_title || 'Combined Test',
                paper1Label: attempt.paper1_label || 'Paper I',
                paper2Label: attempt.paper2_label || 'Paper II',
                p1: {
                    test: p1TestRes.data || attempt.paper1_data?.test,
                    answers: attempt.paper1_data?.answers,
                    score: attempt.paper1_data?.score ?? 0,
                    totalMarks: attempt.paper1_data?.total_marks ?? 0,
                },
                p2: {
                    test: p2TestRes.data || attempt.paper2_data?.test,
                    answers: attempt.paper2_data?.answers,
                    score: attempt.paper2_data?.score ?? 0,
                    totalMarks: attempt.paper2_data?.total_marks ?? 0,
                },
            }
        });
    };

    return (
        <div className="container mx-auto max-w-5xl py-3 px-3 sm:py-5 sm:px-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-[12px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-1">Performance</p>
                    <p className="text-[20px] font-semibold text-slate-800 tracking-tight leading-tight">Test History</p>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => loadHistory()} disabled={loading}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* --- Desktop Table View --- */}
            <Card className="hidden md:block overflow-hidden border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                <TableHead className="w-[45%] font-bold text-foreground">Test Name</TableHead>
                                <TableHead className="font-bold text-foreground">Date Taken</TableHead>
                                <TableHead className="font-bold text-foreground">Score</TableHead>
                                <TableHead className="text-right font-bold text-foreground">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody
                            className="relative"
                            // Using framer-motion directly on component
                            {...({ as: motion.tbody, variants: containerVariants, initial: "hidden", animate: "visible" } as any)}
                        >
                            <AnimatePresence mode="popLayout">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <HistoryRowSkeleton key={`skeleton-${i}`} />
                                    ))
                                ) : (combinedAttempts.length === 0 && attempts.length === 0) ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic bg-slate-50/20">
                                            No test history found. Start your journey today!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {/* Combined Attempts */}
                                        {combinedAttempts.map((attempt) => {
                                            const lazyId = `desktop-combined-${attempt.id}`;
                                            if (!isItemRendered(lazyId)) {
                                                return (
                                                    <TableRow key={lazyId} ref={(el) => registerSkeleton(lazyId, el)}>
                                                        <TableCell colSpan={4} className="p-4">
                                                            <div className="h-12 w-full bg-slate-100/50 animate-pulse rounded" />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            }
                                            return (
                                                <TableRow
                                                    key={`combined-${attempt.id}`}
                                                    className="bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 group transition-colors"
                                                    {...({ as: motion.tr, variants: rowVariants, layout: true } as any)}
                                                >
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 text-[10px] font-black px-1.5 py-0">
                                                                COMBINED
                                                            </Badge>
                                                            <span className="group-hover:text-violet-600 transition-colors font-bold">{attempt.session_title || 'Combined Test'}</span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-tight flex items-center gap-1">
                                                            <Layers className="w-3 h-3" />
                                                            {attempt.paper1_label || 'P1'}: {attempt.paper1_data?.test_title || '—'} &nbsp;•&nbsp; {attempt.paper2_label || 'P2'}: {attempt.paper2_data?.test_title || '—'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center text-slate-500 text-sm">
                                                            <Calendar className="mr-2 h-4 w-4 opacity-70" />
                                                            {format(new Date(attempt.created_at), 'MMM d, yyyy • p')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-0.5">
                                                            <Badge className="w-fit bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-xs font-bold">
                                                                {(attempt.total_score ?? 0).toFixed(1)} Total
                                                            </Badge>
                                                            <div className="flex gap-2 text-[9px] opacity-70 font-bold uppercase mt-0.5">
                                                                <span className="text-violet-600">{attempt.paper1_label || 'P1'}: {attempt.paper1_data?.score ?? 0}</span>
                                                                <span className="text-blue-600">{attempt.paper2_label || 'P2'}: {attempt.paper2_data?.score ?? 0}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button variant="ghost" size="sm" onClick={() => handleViewCombinedResult(attempt)} className="h-8 hover:bg-violet-100/50 hover:text-violet-700">
                                                                <Target className="h-4 w-4 mr-1.5" /> Result
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => handleDeleteCombined(attempt.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}

                                        {/* Regular Attempts */}
                                        {attempts.map((attempt) => {
                                            const lazyId = `desktop-regular-${attempt.id}`;
                                            if (!isItemRendered(lazyId)) {
                                                return (
                                                    <TableRow key={lazyId} ref={(el) => registerSkeleton(lazyId, el)}>
                                                        <TableCell colSpan={4} className="p-4">
                                                            <div className="h-12 w-full bg-slate-100/50 animate-pulse rounded" />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            }
                                            return (
                                                <React.Fragment key={attempt.id}>
                                                    <TableRow
                                                        className={`cursor-pointer group transition-colors ${expandedAttempt === attempt.id ? 'bg-slate-50 dark:bg-slate-900 border-b-0' : 'hover:bg-slate-50/80 dark:hover:bg-slate-900/80'}`}
                                                        onClick={(e) => handleToggleExpand(attempt.id, attempt.test_id, e)}
                                                        {...({ as: motion.tr, variants: rowVariants, layout: true } as any)}
                                                    >
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`transition-colors font-bold ${expandedAttempt === attempt.id ? 'text-primary' : 'group-hover:text-primary'}`}>
                                                                    {attempt.test_title}
                                                                </span>
                                                                {actionLoading === `expand-${attempt.id}` && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center text-slate-500 text-sm">
                                                                <Calendar className="mr-2 h-4 w-4 opacity-70" />
                                                                {format(new Date(attempt.created_at), 'MMM d, yyyy • p')}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-0.5">
                                                                <Badge variant={attempt.score >= 80 ? 'default' : 'secondary'} className="font-bold w-fit">
                                                                    {attempt.score.toFixed(1)}
                                                                    {attempt.total_max_marks ? ` / ${attempt.total_max_marks}` : ' Marks'}
                                                                </Badge>
                                                                {attempt.total_max_marks ? (
                                                                    <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                                                                        {((attempt.score / attempt.total_max_marks) * 100).toFixed(0)}% scored
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 hover:bg-primary/10 hover:text-primary transition-colors"
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        setActionLoading(`view-${attempt.id}`);
                                                                        try {
                                                                            const [test, fullAttempt] = await Promise.all([
                                                                                fetchFullTestIfNeeded(attempt.test_id),
                                                                                fetchAttemptIfNeeded(attempt)
                                                                            ]);

                                                                            navigate('/results', {
                                                                                state: {
                                                                                    test: test,
                                                                                    answers: fullAttempt.answers,
                                                                                    timeSpent: 0,
                                                                                    score: attempt.score
                                                                                }
                                                                            });
                                                                        } catch (error) {
                                                                            toast.error("Failed to load result details.");
                                                                        } finally {
                                                                            setActionLoading(null);
                                                                        }
                                                                    }}
                                                                    disabled={actionLoading === `view-${attempt.id}`}
                                                                >
                                                                    {actionLoading === `view-${attempt.id}` ? (
                                                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                                    ) : (
                                                                        <Target className="h-4 w-4 mr-1" />
                                                                    )}
                                                                    Result
                                                                </Button>

                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-slate-400 hover:text-red-500"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDelete(attempt.id);
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>

                                                    <AnimatePresence>
                                                        {expandedAttempt === attempt.id && (
                                                            <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                                                <TableCell colSpan={4} className="p-0 border-b overflow-hidden">
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: "auto", opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                                                    >
                                                                        <div className="p-6 space-y-6">
                                                                            <div className="flex items-center justify-between">
                                                                                <h4 className="text-lg font-bold flex items-center gap-2">
                                                                                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                                                                                    Detailed Performance Analysis
                                                                                </h4>
                                                                                <Badge variant="outline" className="font-mono text-[10px]">ATTEMPT ID: {attempt.id.slice(0, 8)}</Badge>
                                                                            </div>

                                                                            {testDetails[attempt.test_id] ? (
                                                                                <div className="grid gap-6">
                                                                                    {testDetails[attempt.test_id]?.questions?.map((q: any, idx: number) => {
                                                                                        const getAnswer = (answers: any, qId: number) => {
                                                                                            if (!answers) return null;
                                                                                            if (Array.isArray(answers)) {
                                                                                                return answers.find((a: any) => a.questionId === qId)?.selectedAnswer;
                                                                                            }
                                                                                            return answers[qId];
                                                                                        };

                                                                                        const userAnswer = getAnswer(attempt.answers, q.id);

                                                                                        // Calculate correctness
                                                                                        let isCorrect = false;
                                                                                        if (q.type === 'numerical') {
                                                                                            const numAns = parseFloat(userAnswer);
                                                                                            const range = q.correctAnswer;
                                                                                            if (!isNaN(numAns) && range && typeof range === 'object' && numAns >= range.min && numAns <= range.max) {
                                                                                                isCorrect = true;
                                                                                            }
                                                                                        } else if (q.type === 'multiple') {
                                                                                            const correctArr = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort() : [];
                                                                                            const userArr = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
                                                                                            if (correctArr.length > 0 && correctArr.length === userArr.length &&
                                                                                                correctArr.every((val, index) => val === userArr[index])) {
                                                                                                isCorrect = true;
                                                                                            }
                                                                                        } else {
                                                                                            if (userAnswer === q.correctAnswer) {
                                                                                                isCorrect = true;
                                                                                            }
                                                                                        }

                                                                                        const renderRichAnswer = (ansKey: any, isUser: boolean) => {
                                                                                            if (ansKey === null || ansKey === undefined) return isUser ? <span className="text-muted-foreground italic">Not answered</span> : null;

                                                                                            const renderSingleKey = (key: string) => {
                                                                                                const optText = q.options ? (Array.isArray(q.options) ? q.options[parseInt(key)] : q.options[key]) : null;
                                                                                                const optImg = q.optionImages ? q.optionImages[key] : null;

                                                                                                return (
                                                                                                    <div key={key} className="flex items-start gap-2 mt-1">
                                                                                                        <span className="font-semibold whitespace-nowrap min-w-[1.5rem]">{key})</span>
                                                                                                        <div className="flex flex-col gap-1">
                                                                                                            {optText && <span><LatexRenderer>{optText}</LatexRenderer></span>}
                                                                                                            {optImg && (
                                                                                                                <img
                                                                                                                    src={optImg.trim()}
                                                                                                                    alt="Option"
                                                                                                                    className="max-h-[80px] w-auto h-auto object-contain border rounded bg-white shadow-sm"
                                                                                                                />
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                );
                                                                                            };

                                                                                            if (q.type === 'numerical') {
                                                                                                if (typeof ansKey === 'object') {
                                                                                                    return <span className="font-mono">{ansKey.min} - {ansKey.max}</span>;
                                                                                                }
                                                                                                return <span className="font-mono">{ansKey}</span>;
                                                                                            }

                                                                                            if (Array.isArray(ansKey)) {
                                                                                                return (
                                                                                                    <div className="flex flex-col gap-2">
                                                                                                        {ansKey.map((k: string) => renderSingleKey(k))}
                                                                                                    </div>
                                                                                                );
                                                                                            }

                                                                                            return renderSingleKey(String(ansKey));
                                                                                        };

                                                                                        return (
                                                                                            <div key={q.id} className={`p-5 rounded-xl border transition-all hover:shadow-md ${isCorrect ? 'border-green-200 bg-green-50/20 dark:bg-green-900/10' : 'border-red-200 bg-red-50/20 dark:bg-red-900/10'}`}>
                                                                                                <div className="mb-4">
                                                                                                    <div className="flex items-center gap-2 mb-2">
                                                                                                        <span className="bg-slate-200 dark:bg-slate-800 text-[10px] font-black px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400">Q{idx + 1}</span>
                                                                                                        <Badge variant={isCorrect ? 'default' : 'destructive'} className="text-[9px] h-4 py-0 font-black">
                                                                                                            {isCorrect ? 'CORRECT' : 'INCORRECT'}
                                                                                                        </Badge>
                                                                                                    </div>
                                                                                                    <div className="font-bold text-slate-800 dark:text-slate-200 leading-relaxed text-sm">
                                                                                                        <LatexRenderer>{q.question}</LatexRenderer>
                                                                                                    </div>
                                                                                                    {q.image && (
                                                                                                        <div className="mt-3">
                                                                                                            <img src={q.image} alt="Question" className="max-h-[200px] rounded-lg border shadow-sm" />
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>

                                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                                    <div className={`p-4 rounded-lg border ${isCorrect ? 'bg-green-100/30 border-green-200' : 'bg-red-100/30 border-red-200'}`}>
                                                                                                        <span className={`block text-[10px] font-black uppercase mb-3 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                                                                                            Your Submission
                                                                                                        </span>
                                                                                                        <div className="text-sm">
                                                                                                            {renderRichAnswer(userAnswer, true)}
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {!isCorrect && (
                                                                                                        <div className="p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50">
                                                                                                            <span className="block text-[10px] font-black uppercase mb-3 text-blue-700 dark:text-blue-400">
                                                                                                                Correct Solution
                                                                                                            </span>
                                                                                                            <div className="text-sm">
                                                                                                                {renderRichAnswer(q.correctAnswer, false)}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        )
                                                                                    })}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="p-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                                                                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 opacity-20" />
                                                                                    <p className="text-sm italic">Synchronizing detailed test results...</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </motion.div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </AnimatePresence>
                                                </React.Fragment>
                                            );
                                        })}
                                    </>
                                )}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* --- Mobile Card View --- */}
            <div className="block md:hidden space-y-4">
                {loading ? (
                    <div className="space-y-3">
                        {Array(3).fill(0).map((_, i) => (
                            <HistoryCardSkeleton key={`mob-skeleton-${i}`} />
                        ))}
                    </div>
                ) : (combinedAttempts.length === 0 && attempts.length === 0) ? (
                    <div className="bg-slate-50/50 rounded-xl p-12 text-center text-muted-foreground border-2 border-dashed">
                        No test history found.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Combined Attempts Mobile */}
                        {combinedAttempts.map((attempt) => {
                            const lazyId = `mobile-combined-${attempt.id}`;
                            if (!isItemRendered(lazyId)) {
                                return (
                                    <div key={lazyId} ref={(el) => registerSkeleton(lazyId, el)}>
                                        <HistoryCardSkeleton />
                                    </div>
                                );
                            }
                            return (
                                <motion.div
                                    key={`combined-mob-${attempt.id}`}
                                    variants={rowVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="relative bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                                >
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-600 to-indigo-600" />
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                                <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 text-[9px] font-black px-1.5 py-0">
                                                    COMBINED
                                                </Badge>
                                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{attempt.session_title || 'Combined Test'}</h3>
                                            </div>
                                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(attempt.created_at), 'MMM d, yyyy • p')}
                                            </div>
                                        </div>
                                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-bold">
                                            {(attempt.total_score ?? 0).toFixed(1)}
                                        </Badge>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 mb-3 space-y-1">
                                        <div className="flex justify-between text-[10px] font-medium">
                                            <span className="text-slate-500">{attempt.paper1_label || 'Paper I'}:</span>
                                            <span className="text-violet-600 font-bold">{attempt.paper1_data?.score ?? 0}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-medium">
                                            <span className="text-slate-500">{attempt.paper2_label || 'Paper II'}:</span>
                                            <span className="text-blue-600 font-bold">{attempt.paper2_data?.score ?? 0}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            className="flex-1 h-8 text-xs bg-slate-900 hover:bg-violet-600"
                                            onClick={() => handleViewCombinedResult(attempt)}
                                        >
                                            View Result
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                                            onClick={() => handleDeleteCombined(attempt.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            );
                        })}

                        {/* Regular Attempts Mobile */}
                        {attempts.map((attempt) => {
                            const lazyId = `mobile-regular-${attempt.id}`;
                            if (!isItemRendered(lazyId)) {
                                return (
                                    <div key={lazyId} ref={(el) => registerSkeleton(lazyId, el)}>
                                        <HistoryCardSkeleton />
                                    </div>
                                );
                            }
                            return (
                                <motion.div
                                    key={`mob-${attempt.id}`}
                                    variants={rowVariants}
                                    initial="hidden"
                                    animate="visible"
                                    layout
                                    className={`relative bg-white dark:bg-slate-900 rounded-xl border transition-all duration-200 overflow-hidden ${expandedAttempt === attempt.id ? 'border-primary ring-1 ring-primary/20' : 'border-slate-200 dark:border-slate-800 shadow-sm'}`}
                                >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${expandedAttempt === attempt.id ? 'bg-primary' : 'bg-slate-300'}`} />
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1 min-w-0 pr-2">
                                                <h3
                                                    className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate cursor-pointer hover:text-primary"
                                                    onClick={(e) => handleToggleExpand(attempt.id, attempt.test_id, e)}
                                                >
                                                    {attempt.test_title}
                                                </h3>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(attempt.created_at), 'MMM d, yyyy • p')}
                                                </div>
                                            </div>
                                            <Badge variant={attempt.score >= 80 ? 'default' : 'secondary'} className="font-bold text-xs shrink-0">
                                                {attempt.score.toFixed(1)}
                                                {attempt.total_max_marks ? ` / ${attempt.total_max_marks}` : ''}
                                            </Badge>
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            <Button
                                                className="flex-1 h-8 text-xs bg-slate-900 hover:bg-primary"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    setActionLoading(`view-${attempt.id}`);
                                                    try {
                                                        const [test, fullAttempt] = await Promise.all([
                                                            fetchFullTestIfNeeded(attempt.test_id),
                                                            fetchAttemptIfNeeded(attempt)
                                                        ]);
                                                        navigate('/results', {
                                                            state: {
                                                                test: test,
                                                                answers: fullAttempt.answers,
                                                                timeSpent: 0,
                                                                score: attempt.score
                                                            }
                                                        });
                                                    } catch (error) {
                                                        toast.error("Failed to load result details.");
                                                    } finally {
                                                        setActionLoading(null);
                                                    }
                                                }}
                                                disabled={actionLoading === `view-${attempt.id}`}
                                            >
                                                {actionLoading === `view-${attempt.id}` ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                                ) : (
                                                    <Target className="h-3.5 w-3.5 mr-1.5" />
                                                )}
                                                Full Result
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="h-8 text-xs px-2.5"
                                                onClick={(e) => handleToggleExpand(attempt.id, attempt.test_id, e)}
                                            >
                                                {expandedAttempt === attempt.id ? 'Hide Details' : 'Details'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-red-500"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(attempt.id);
                                                }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                    {/* Mobile Expanded View */}
                                    <AnimatePresence>
                                        {expandedAttempt === attempt.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="border-t border-slate-100 bg-slate-50/50"
                                            >
                                                <div className="p-4 space-y-4">
                                                    {testDetails[attempt.test_id] ? (
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Performance Analysis</h4>
                                                                <Badge variant="outline" className="font-mono text-[9px]">#{attempt.id.slice(0, 8)}</Badge>
                                                            </div>
                                                            <div className="space-y-3">
                                                                {testDetails[attempt.test_id]?.questions?.map((q: any, idx: number) => {
                                                                    const getAnswer = (answers: any, qId: number) => {
                                                                        if (!answers) return null;
                                                                        if (Array.isArray(answers)) {
                                                                            return answers.find((a: any) => a.questionId === qId)?.selectedAnswer;
                                                                        }
                                                                        return answers[qId];
                                                                    };
                                                                    const userAnswer = getAnswer(attempt.answers, q.id);
                                                                    let isCorrect = false;
                                                                    if (q.type === 'numerical') {
                                                                        const numAns = parseFloat(userAnswer);
                                                                        const range = q.correctAnswer;
                                                                        if (!isNaN(numAns) && range && typeof range === 'object' && numAns >= range.min && numAns <= range.max) isCorrect = true;
                                                                    } else if (q.type === 'multiple') {
                                                                        const correctArr = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort() : [];
                                                                        const userArr = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
                                                                        if (correctArr.length > 0 && correctArr.length === userArr.length && correctArr.every((val, index) => val === userArr[index])) isCorrect = true;
                                                                    } else {
                                                                        if (userAnswer === q.correctAnswer) isCorrect = true;
                                                                    }
                                                                    return (
                                                                        <div key={q.id} className={`p-3 rounded-lg border text-xs ${isCorrect ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}`}>
                                                                            <div className="flex items-center gap-1.5 mb-2">
                                                                                <span className="font-bold text-slate-400">Q{idx + 1}</span>
                                                                                <Badge className={`text-[8px] h-3.5 py-0 px-1 font-black ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                                                                                    {isCorrect ? 'CORRECT' : 'WRONG'}
                                                                                </Badge>
                                                                            </div>
                                                                            <div className="font-semibold text-slate-800 mb-2 line-clamp-2">
                                                                                <LatexRenderer>{q.question}</LatexRenderer>
                                                                            </div>
                                                                            <div className={`p-2 rounded border ${isCorrect ? 'bg-green-100/50 border-green-200' : 'bg-red-100/50 border-red-200'}`}>
                                                                                <span className="text-[9px] font-black uppercase opacity-50 block mb-1">Your Answer</span>
                                                                                <span className="font-medium">{userAnswer || 'No answer'}</span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="py-8 text-center text-slate-400 text-xs animate-pulse">
                                                            Loading analytics...
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Lazy Load Stats */}
            {!loading && !isComplete && (allLazyItems.length > 5) && (
                <div className="py-4 text-center">
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                        Scroll to load more • {renderedCount} of {totalCount}
                    </p>
                </div>
            )}
        </div>
    );
}