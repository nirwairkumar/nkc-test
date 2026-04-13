import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { fetchTestById, fetchSolutions } from '@/lib/testsApi';
import LatexRenderer from '@/components/ui/LatexRenderer';
import { Badge } from '@/components/ui/badge';

export default function SolutionsViewPage() {
    const { testId } = useParams();
    const navigate = useNavigate();
    const outletCtx = useOutletContext<{ stateData: any }>() || { stateData: null };
    const answers = outletCtx.stateData?.answers || {};

    const [test, setTest] = useState<any>(null);
    const [solutions, setSolutions] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    useEffect(() => {
        if (!testId) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const { data: testD, error: testErr } = await fetchTestById(testId);
                if (testErr) throw new Error(testErr);
                setTest(testD);

                const solRes = await fetchSolutions(testId);
                if (solRes.data && solRes.data.solutions) {
                    setSolutions(solRes.data.solutions);
                }
            } catch (err: any) {
                console.error("Error loading solutions view:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [testId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-slate-500">Loading solutions...</p>
            </div>
        );
    }

    if (!test || Object.keys(solutions).length === 0) {
        return (
            <div className="container mx-auto py-20 text-center space-y-4">
                <h2 className="text-2xl font-bold">Solutions Not Available</h2>
                <p className="text-muted-foreground">The creator has not published detailed solutions for this test yet.</p>
                <Button onClick={() => navigate(-1)} variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
                </Button>
            </div>
        );
    }

    const allQuestions = test.enable_section_mode && test.sections
        ? test.sections.flatMap((s: any) => s.questions || [])
        : test.questions || [];

    const currentQ = allQuestions[currentQuestionIndex];
    if (!currentQ) return null;

    const correctAns = currentQ.correctAnswer;
    const correctDisplay = Array.isArray(correctAns)
        ? correctAns.join(", ")
        : typeof correctAns === 'object' && correctAns.min !== undefined
            ? `Between ${correctAns.min} and ${correctAns.max}`
            : correctAns;

    const answerOptionText = currentQ.type !== 'numerical' && !Array.isArray(correctAns) && currentQ.options && currentQ.options[correctAns as string];

    // Get user answers and calculate correctness
    const userAnswer = answers[currentQ.id];
    let isCorrect = false;
    let userAnswerDisplay: any = null;

    if (userAnswer !== undefined && userAnswer !== null) {
        if (currentQ.type === 'numerical') {
            const numAns = parseFloat(userAnswer);
            const range = currentQ.correctAnswer as any;
            if (!isNaN(numAns) && range && typeof range === 'object' && numAns >= range.min && numAns <= range.max) {
                isCorrect = true;
            }
            userAnswerDisplay = userAnswer;
        } else if (currentQ.type === 'multiple') {
            const correctArr = Array.isArray(currentQ.correctAnswer) ? [...currentQ.correctAnswer].sort() : [];
            const userArr = Array.isArray(userAnswer) ? [...(userAnswer as string[])].sort() : [];
            if (correctArr.length > 0 && correctArr.length === userArr.length &&
                correctArr.every((val: string, index: number) => val === userArr[index])) {
                isCorrect = true;
            }
            userAnswerDisplay = Array.isArray(userAnswer) ? (userAnswer as string[]).join(", ") : userAnswer;
        } else {
            if (userAnswer === currentQ.correctAnswer) {
                isCorrect = true;
            }
            userAnswerDisplay = userAnswer;
            if (currentQ.options && currentQ.options[userAnswer]) {
                userAnswerDisplay = `${userAnswer}) ${currentQ.options[userAnswer]}`;
            }
        }
    }

    // Build correct answer display text with option text
    let correctAnswerFullDisplay = correctDisplay;
    if (answerOptionText) {
        correctAnswerFullDisplay = `${correctDisplay}) ${answerOptionText}`;
    }

    return (
        <div className="flex flex-col px-4 py-6 max-w-3xl mx-auto w-full">

            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Solutions</h2>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm px-3 py-1 font-medium">
                        {currentQuestionIndex + 1} / {allQuestions.length}
                    </Badge>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        disabled={currentQuestionIndex === 0}
                        onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        disabled={currentQuestionIndex === allQuestions.length - 1}
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    >
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Question Section */}
            <div className="mb-6">
                <div className="flex gap-3 items-start">
                    <span className="shrink-0 w-7 h-7 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-sm font-bold">
                        {currentQuestionIndex + 1}
                    </span>
                    <div className="flex-1 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">
                        <LatexRenderer>{currentQ.question}</LatexRenderer>
                    </div>
                </div>
                {currentQ.image && (
                    <div className="mt-4 ml-10">
                        <img
                            src={currentQ.image}
                            alt="Question figure"
                            className="max-h-[280px] rounded-lg border border-slate-200 dark:border-slate-700 object-contain bg-white"
                        />
                    </div>
                )}
            </div>

            {/* Answer Comparison Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {/* Your Answer */}
                <div className={`rounded-xl px-4 py-3 border ${userAnswer !== undefined && userAnswer !== null
                    ? isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    }`}>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Your Answer</div>
                    {userAnswer !== undefined && userAnswer !== null ? (
                        <div className="flex items-center gap-2">
                            {isCorrect
                                ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                : <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            }
                            <span className={`text-sm font-semibold ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                {userAnswerDisplay}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <MinusCircle className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="text-sm text-slate-400 italic">Skipped</span>
                        </div>
                    )}
                </div>

                {/* Correct Answer */}
                <div className="rounded-xl px-4 py-3 border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-500 mb-2">Correct Answer</div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                            {answerOptionText ? (
                                <LatexRenderer>{correctAnswerFullDisplay}</LatexRenderer>
                            ) : (
                                correctDisplay
                            )}
                        </span>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700" /></div>
                <div className="relative flex justify-start">
                    <span className="bg-slate-50 dark:bg-slate-950 pr-3 text-xs font-bold uppercase tracking-widest text-indigo-500">
                        Solution
                    </span>
                </div>
            </div>

            {/* Solution Content */}
            {solutions[currentQ.id] ? (
                <div className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 mb-10">
                    <LatexRenderer>{solutions[currentQ.id]}</LatexRenderer>
                </div>
            ) : (
                <div className="text-center py-10 text-slate-400 italic mb-10">
                    No detailed solution provided for this question.
                </div>
            )}

            {/* Bottom Navigation */}
            <div className="flex justify-between mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Previous
                </Button>
                <Button
                    size="sm"
                    disabled={currentQuestionIndex === allQuestions.length - 1}
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                >
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}
