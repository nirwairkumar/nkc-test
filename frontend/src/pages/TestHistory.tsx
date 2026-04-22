import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserAttempts, deleteAttempt } from '@/lib/attemptsApi';
import { fetchUserCombinedAttempts, deleteCombinedAttempt } from '@/lib/combinedSessionsApi';
import { fetchTestById } from '@/lib/testsApi';
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
import LatexRenderer from '@/components/ui/LatexRenderer';

interface Attempt {
    id: string;
    test_id: string;
    score: number;
    created_at: string;
    answers: any;
    test_title?: string;
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

            // Hybrid Loading: Prefer Enriched Data (Fast), Fallback to Fetch (Robust)
            const details: Record<string, any> = {};
            const uniqueTestIdsToFetch = new Set<string>();

            if (data && Array.isArray(data)) {
                data.forEach((attempt: any) => {
                    if (attempt.test_id) {
                        // Mark for fetching to ensure we have FULL metadata (sections, etc.)
                        // even if basic info was provided. This is the most robust way.
                        uniqueTestIdsToFetch.add(attempt.test_id);
                        
                        // Populate basic info if present to show title immediately
                        if (attempt.test_title) {
                            details[attempt.test_id] = {
                                id: attempt.test_id,
                                title: attempt.test_title,
                                settings: attempt.test_settings || {}
                            };
                        }
                    }
                });
            }

            setTestDetails(details);

            const attemptsWithTitles = data?.map((attempt: any) => ({
                ...attempt,
                test_title: details[attempt.test_id]?.title || attempt.test_title || 'Unknown Test',
                answers: typeof attempt.answers === 'string' ? JSON.parse(attempt.answers) : attempt.answers // Ensure answers parsed
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
            await fetchFullTestIfNeeded(testId);
            setExpandedAttempt(id);
        } catch (error) {
            toast.error("Failed to load detailed answers.");
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
        // Fetch full test details for both papers for proper result reconstruction
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

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">Test History</h1>
                <Button variant="outline" size="sm" onClick={() => loadHistory()} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Test Name</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Combined Attempts Section */}
                            {combinedAttempts.map((attempt) => (
                                <TableRow key={`combined-${attempt.id}`} className="bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/30">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 text-[10px] font-black">
                                                <Layers className="w-3 h-3 mr-1" /> Combined
                                            </Badge>
                                            <span>{attempt.session_title || 'Combined Test'}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {attempt.paper1_label || 'Paper I'}: {attempt.paper1_data?.test_title || '—'} &nbsp;+&nbsp; {attempt.paper2_label || 'Paper II'}: {attempt.paper2_data?.test_title || '—'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center text-muted-foreground">
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {format(new Date(attempt.created_at), 'PPP p')}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-xs text-violet-600 font-bold">{attempt.paper1_label || 'P1'}: {(attempt.paper1_data?.score ?? 0).toFixed(1)}</span>
                                            <span className="text-xs text-blue-600 font-bold">{attempt.paper2_label || 'P2'}: {(attempt.paper2_data?.score ?? 0).toFixed(1)}</span>
                                            <Badge className="w-fit bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 text-xs font-black">
                                                Total: {(attempt.total_score ?? 0).toFixed(1)}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleViewCombinedResult(attempt)}>
                                                <Target className="h-4 w-4 mr-1" /> View Results
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteCombined(attempt.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {/* Regular Attempts */}
                            {attempts.length === 0 && combinedAttempts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No attempts found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                attempts.map((attempt) => (
                                    <React.Fragment key={attempt.id}>
                                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={(e) => handleToggleExpand(attempt.id, attempt.test_id, e)}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {attempt.test_title}
                                                    {actionLoading === `expand-${attempt.id}` && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center text-muted-foreground">
                                                    <Calendar className="mr-2 h-4 w-4" />
                                                    {format(new Date(attempt.created_at), 'PPP p')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={attempt.score >= 80 ? 'default' : 'secondary'}>
                                                    {attempt.score} Marks
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            setActionLoading(`view-${attempt.id}`);
                                                            try {
                                                                const test = await fetchFullTestIfNeeded(attempt.test_id);
                                                                navigate('/results', {
                                                                    state: {
                                                                        test: test,
                                                                        answers: attempt.answers,
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
                                                        View Result
                                                    </Button>

                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(attempt.id);
                                                        }}
                                                        className="h-8 px-2"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {expandedAttempt === attempt.id && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="bg-muted/30 p-4">
                                                    <div className="space-y-4">
                                                        <h4 className="font-semibold">Detailed Answers</h4>
                                                        {testDetails[attempt.test_id] ? (
                                                            testDetails[attempt.test_id]?.questions?.map((q: any, idx: number) => {
                                                                const getAnswer = (answers: any, qId: number) => {
                                                                    if (!answers) return null;
                                                                    if (Array.isArray(answers)) {
                                                                        return answers.find((a: any) => a.questionId === qId)?.selectedAnswer;
                                                                    }
                                                                    return answers[qId];
                                                                };

                                                                const userAnswer = getAnswer(attempt.answers, q.id);

                                                                // Calculate correctness (Logic from User's snippet)
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
                                                                                            className="max-h-[80px] w-auto h-auto object-contain border rounded bg-white"
                                                                                        />
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    };

                                                                    if (q.type === 'numerical') {
                                                                        if (typeof ansKey === 'object') {
                                                                            return <span>{ansKey.min} - {ansKey.max}</span>;
                                                                        }
                                                                        return <span>{ansKey}</span>;
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
                                                                    <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
                                                                        <div className="mb-3">
                                                                            <span className="font-bold mr-2 text-slate-500">{idx + 1}.</span>
                                                                            <span className="font-medium"><LatexRenderer>{q.question}</LatexRenderer></span>
                                                                            {q.image && (
                                                                                <div className="mt-2">
                                                                                    <img src={q.image} alt="Question" className="max-h-[150px] rounded border" />
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                                            <div className={`p-3 rounded border ${isCorrect ? 'bg-green-100/50 border-green-200' : 'bg-red-100/50 border-red-200'}`}>
                                                                                <span className={`block text-xs font-bold uppercase mb-2 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                                                                    Your Answer
                                                                                </span>
                                                                                <div className={isCorrect ? 'text-green-900' : 'text-red-900'}>
                                                                                    {renderRichAnswer(userAnswer, true)}
                                                                                </div>
                                                                            </div>

                                                                            {!isCorrect && (
                                                                                <div className="p-3 rounded border bg-blue-50 border-blue-100">
                                                                                    <span className="block text-xs font-bold uppercase mb-2 text-blue-700">
                                                                                        Correct Answer
                                                                                    </span>
                                                                                    <div className="text-blue-900">
                                                                                        {renderRichAnswer(q.correctAnswer, false)}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })
                                                        ) : (
                                                            <div className="p-4 text-center text-muted-foreground">
                                                                Details for this test are no longer available.
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
