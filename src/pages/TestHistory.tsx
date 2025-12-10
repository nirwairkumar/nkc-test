import React, { useEffect, useState } from 'react';
import { fetchUserAttempts } from '@/lib/attemptsApi';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
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
import { BackButton } from '@/components/ui/BackButton';

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
        if (user) {
            loadHistory();
        }
    }, [user]);

    async function loadHistory() {
        if (!user) return;
        try {
            const { data, error } = await fetchUserAttempts(user.id);
            if (error) throw error;

            // Fetch test titles for these attempts (optimize by fetching unique test IDs)
            const uniqueTestIds = Array.from(new Set(data?.map(a => a.test_id) || []));
            const details: Record<string, any> = {};

            await Promise.all(uniqueTestIds.map(async (tid) => {
                const { data: t } = await fetchTestById(tid);
                if (t) details[tid] = t;
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

    const toggleExpand = (id: string) => {
        setExpandedAttempt(expandedAttempt === id ? null : id);
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Test History</h1>
            <BackButton />
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
                                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(attempt.id)}>
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
                                                <Button variant="ghost" size="sm">
                                                    {expandedAttempt === attempt.id ? <ChevronUp /> : <ChevronDown />}
                                                    View Answers
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        {expandedAttempt === attempt.id && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="bg-muted/30 p-4">
                                                    <div className="space-y-4">
                                                        <h4 className="font-semibold">Detailed Answers</h4>
                                                        {testDetails[attempt.test_id]?.questions?.map((q: any, idx: number) => {
                                                            const userAnswer = attempt.answers?.[q.id] || attempt.answers?.find((a: any) => a.questionId === q.id)?.selectedAnswer; // handle both map or array formats if any
                                                            const isCorrect = userAnswer === q.correctAnswer;
                                                            return (
                                                                <div key={q.id} className={`p-3 rounded border ${isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                                                                    <p className="font-medium text-sm mb-2">{idx + 1}. {q.question}</p>
                                                                    <div className="flex gap-4 text-sm">
                                                                        <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                                                                            Your Answer: {userAnswer || 'Not answered'}
                                                                        </span>
                                                                        {!isCorrect && (
                                                                            <span className="text-green-700 font-semibold">
                                                                                Correct: {q.correctAnswer}
                                                                            </span>
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
