import React, { useEffect, useState } from 'react';
import { fetchUserAttempts } from '@/lib/attemptsApi';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, ChevronUp, Calendar, Trash2, RefreshCw } from 'lucide-react';
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
import { fetchTestById } from '@/lib/testsApi';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import Latex from 'react-latex-next';

// Extend the attempt type to include test title which we might need to join or fetch
interface Attempt {
    id: string;
    test_id: string;
    score: number;
    created_at: string;
    answers: any;
    test_title?: string; // We'll populate this
}

export default function TestHistory() {
    const { user } = useAuth();
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);
    const [testDetails, setTestDetails] = useState<Record<string, any>>({}); // Cache test details for answer review

    useEffect(() => {
        if (user?.id) {
            loadHistory();
        }
    }, [user?.id]);

    async function loadHistory() {
        if (!user) return;
        try {
            const { data, error } = await fetchUserAttempts(user.id);
            if (error) throw error;

            // Fetch test titles for these attempts (optimize by fetching unique test IDs)
            // Fetch test titles for these attempts (optimize by fetching unique test IDs)
            const uniqueTestIds = Array.from(new Set(data?.map(a => a.test_id).filter(id => id) || []));
            const details: Record<string, any> = {};

            await Promise.all(uniqueTestIds.map(async (tid) => {
                if (!tid) return;
                try {
                    const { data: t } = await fetchTestById(tid);
                    if (t) details[tid] = t;
                } catch (e) {
                    console.error(`Failed to fetch test ${tid}`, e);
                }
            }));

            setTestDetails(details);

            const attemptsWithTitles = data?.map(attempt => ({
                ...attempt,
                test_title: details[attempt.test_id]?.title || 'Unknown Test'
            })) || [];

            setAttempts(attemptsWithTitles);
        } catch (err) {
            console.error('Failed to load history', err);
        } finally {
            setLoading(false);
        }
    }

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        // Prevent toggle if clicking buttons
        if ((e.target as HTMLElement).closest('button')) return;
        setExpandedAttempt(expandedAttempt === id ? null : id);
    };

    const handleDelete = async (attemptId: string) => {
        if (!confirm('Are you sure you want to delete this test record? This action cannot be undone.')) return;

        try {
            // Delete from user_tests
            const { error } = await supabase
                .from('user_tests')
                .delete()
                .eq('id', attemptId);

            if (error) throw error;

            toast.success('Test record deleted successfully');

            // Remove from local state
            setAttempts(prev => prev.filter(a => a.id !== attemptId));
            if (expandedAttempt === attemptId) setExpandedAttempt(null);

        } catch (error: any) {
            console.error('Error deleting test:', error);
            toast.error('Failed to delete test record: ' + (error.message || 'Unknown error'));
        }
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
                            {attempts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No attempts found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                attempts.map((attempt) => (
                                    <React.Fragment key={attempt.id}>
                                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={(e) => toggleExpand(attempt.id, e)}>
                                            <TableCell className="font-medium">{attempt.test_title}</TableCell>
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
                                                    <Button variant="ghost" size="sm" onClick={() => setExpandedAttempt(expandedAttempt === attempt.id ? null : attempt.id)}>
                                                        {expandedAttempt === attempt.id ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                                                        View Answers
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
                                                        {testDetails[attempt.test_id]?.questions?.map((q: any, idx: number) => {
                                                            // Helper to safely extract answer from mixed formats
                                                            const getAnswer = (answers: any, qId: number) => {
                                                                if (!answers) return null;
                                                                if (Array.isArray(answers)) {
                                                                    return answers.find((a: any) => a.questionId === qId)?.selectedAnswer;
                                                                }
                                                                return answers[qId];
                                                            };

                                                            const userAnswer = getAnswer(attempt.answers, q.id);

                                                            // Calculate correctness logic similar to ResultsPage
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

                                                                // Helper to render a single key (e.g. "A") with its content
                                                                const renderSingleKey = (key: string) => {
                                                                    const optText = q.options ? (Array.isArray(q.options) ? q.options[parseInt(key)] : q.options[key]) : null;
                                                                    const optImg = q.optionImages ? q.optionImages[key] : null;

                                                                    return (
                                                                        <div key={key} className="flex items-start gap-2 mt-1">
                                                                            <span className="font-semibold whitespace-nowrap min-w-[1.5rem]">{key})</span>
                                                                            <div className="flex flex-col gap-1">
                                                                                {optText && <span><Latex>{optText}</Latex></span>}
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

                                                                // Numerical Type
                                                                if (q.type === 'numerical') {
                                                                    if (typeof ansKey === 'object') {
                                                                        return <span>{ansKey.min} - {ansKey.max}</span>;
                                                                    }
                                                                    return <span>{ansKey}</span>;
                                                                }

                                                                // Multiple/Single Choice
                                                                // Check if it's an array (Multiple Choice)
                                                                if (Array.isArray(ansKey)) {
                                                                    return (
                                                                        <div className="flex flex-col gap-2">
                                                                            {ansKey.map((k: string) => renderSingleKey(k))}
                                                                        </div>
                                                                    );
                                                                }

                                                                // Single Key
                                                                return renderSingleKey(String(ansKey));
                                                            };

                                                            return (
                                                                <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
                                                                    <div className="mb-3">
                                                                        <span className="font-bold mr-2 text-slate-500">{idx + 1}.</span>
                                                                        <span className="font-medium"><Latex>{q.question}</Latex></span>
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
                                                        })}
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
