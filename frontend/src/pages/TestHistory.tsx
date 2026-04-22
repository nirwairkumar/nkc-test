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

interface Attempt {
    id: string;
    test_id: string;
    score: number;
    created_at: string;
    answers?: any; // Now optional as we fetch it lazily
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
        <div className="container mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">Test History</h1>
                <Button variant="outline" size="sm" onClick={() => loadHistory()} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>
            
            <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
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
                                        {combinedAttempts.map((attempt) => (
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
                                        ))}

                                        {/* Regular Attempts */}
                                        {attempts.map((attempt) => (
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
                                                        <Badge variant={attempt.score >= 80 ? 'default' : 'secondary'} className="font-bold">
                                                            {attempt.score.toFixed(1)} Marks
                                                        </Badge>
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
                                                                            <Badge variant="outline" className="font-mono text-[10px]">ATTEMPT ID: {attempt.id.slice(0,8)}</Badge>
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
                                        ))}
                                    </>
                                )}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
