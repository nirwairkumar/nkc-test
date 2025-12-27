import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTest } from '@/contexts/TestContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Trophy,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Home,
  History,
  Timer,
  Target
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from '@/components/ui/separator';
import { FeedbackForm } from '@/components/FeedbackForm';
import Latex from 'react-latex-next';

interface TestResult {
  id: string;
  test_name: string;
  student_name: string;
  marks_scored: number;
  total_marks: number;
  submission_time: string;
}

const ResultsPage = () => {
  const { studentName: contextStudentName, selectedTest: contextSelectedTest, answers: contextAnswers, resetTest, isTestCompleted } = useTest();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  const stateData = location.state as {
    test: any;
    answers: Record<number, string>;
    score: number;
    totalQuestions: number;
    marksPerQuestion: number;
    negativeMark: number;
  } | undefined;

  const showPersonalResults = !!stateData || (!!contextStudentName && !!contextSelectedTest && isTestCompleted);

  const selectedTest = stateData?.test || contextSelectedTest;

  // Normalize answers
  let answers: Record<number, string> = {};
  if (stateData?.answers) {
    answers = stateData.answers;
  } else if (contextAnswers) {
    answers = {};
  }

  // Calculate Stats
  let totalQuestions = selectedTest?.questions?.length || 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  let marksScored = stateData?.score || 0;
  let totalMarks = totalQuestions * (selectedTest?.marks_per_question || 4);

  if (selectedTest?.questions) {
    selectedTest.questions.forEach((q: any) => {
      const ans = answers[q.id];
      let isCorrect = false;

      if (q.type === 'numerical') {
        // Numerical Check
        const numAns = parseFloat(ans);
        const range = q.correctAnswer;
        if (!isNaN(numAns) && range && typeof range === 'object' && numAns >= range.min && numAns <= range.max) {
          isCorrect = true;
        }
      } else if (q.type === 'multiple') {
        // Multiple Choice Check (Exact Match)
        const correctArr = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort() : [];
        const userArr = Array.isArray(ans) ? [...ans].sort() : [];

        if (correctArr.length > 0 && correctArr.length === userArr.length &&
          correctArr.every((val, index) => val === userArr[index])) {
          isCorrect = true;
        }
      } else {
        // Single Choice Check
        if (ans === q.correctAnswer) {
          isCorrect = true;
        }
      }

      if (isCorrect) {
        correctCount++;
      } else if (ans) {
        wrongCount++;
      } else {
        skippedCount++;
      }
    });
  }

  const percentage = totalMarks > 0 ? Math.round((marksScored / totalMarks) * 100) : 0;

  const handleRetakeTest = () => {
    resetTest();
    navigate('/');
  };

  if (!showPersonalResults) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">No Result Found</h1>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    )
  }

  // Determine testId for feedback
  const testId = selectedTest?.id;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Result Analysis</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <Home className="w-4 h-4 mr-2" /> Home
            </Button>
          </div>
        </div>

        {/* Score Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-xl">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div>
                <h2 className="text-2xl font-semibold opacity-90">{selectedTest?.title}</h2>
                <p className="text-indigo-100">Test Completed Successfully</p>
              </div>

              <div className="flex items-end gap-4 mt-6">
                <div>
                  <span className="text-6xl font-bold">{marksScored}</span>
                  <span className="text-2xl opacity-75">/{totalMarks}</span>
                </div>
                <div className="mb-2">
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {percentage}% Score
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-center gap-4 p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Correct</span>
              </div>
              <span className="font-bold text-xl">{correctCount}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Wrong</span>
              </div>
              <span className="font-bold text-xl">{wrongCount}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Skipped</span>
              </div>
              <span className="font-bold text-xl">{skippedCount}</span>
            </div>
          </Card>
        </div>

        {/* Detailed Analysis Accordion */}
        <Card className="shadow-lg border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" /> Detailed Analysis
            </CardTitle>
            <CardDescription>Review your answers against the correct solutions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {selectedTest?.questions?.map((q: any, index: number) => {
                const ans = answers[q.id];

                let isCorrect = false;
                if (q.type === 'numerical') {
                  const numAns = parseFloat(ans);
                  const range = q.correctAnswer;
                  if (!isNaN(numAns) && range && typeof range === 'object' && numAns >= range.min && numAns <= range.max) {
                    isCorrect = true;
                  }
                } else if (q.type === 'multiple') {
                  const correctArr = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort() : [];
                  const userArr = Array.isArray(ans) ? [...ans].sort() : [];
                  if (correctArr.length > 0 && correctArr.length === userArr.length &&
                    correctArr.every((val, index) => val === userArr[index])) {
                    isCorrect = true;
                  }
                } else {
                  if (ans === q.correctAnswer) {
                    isCorrect = true;
                  }
                }

                const isSkipped = !ans;
                const isWrong = !isSkipped && !isCorrect;

                return (
                  <AccordionItem key={q.id} value={`item-${q.id}`} className="border rounded-lg px-2 data-[state=open]:bg-slate-50">
                    <AccordionTrigger className="hover:no-underline py-3 px-2">
                      <div className="flex items-center gap-4 text-left w-full">
                        <div className={`
                                            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border
                                            ${isCorrect ? 'bg-green-100 text-green-700 border-green-200' : ''}
                                            ${isWrong ? 'bg-red-100 text-red-700 border-red-200' : ''}
                                            ${isSkipped ? 'bg-slate-100 text-slate-500 border-slate-200' : ''}
                                        `}>
                          {index + 1}
                        </div>
                        <div className="flex-1 font-medium text-sm line-clamp-1">
                          <Latex>{q.question}</Latex>
                        </div>
                        <div className="mr-2">
                          {isCorrect && <Badge className="bg-green-600">Correct</Badge>}
                          {isWrong && <Badge variant="destructive">Wrong</Badge>}
                          {isSkipped && <Badge variant="secondary">Skipped</Badge>}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-4 pt-2">
                        <div className="text-base font-medium text-slate-900 border-l-4 border-primary pl-3">
                          <Latex>{q.question}</Latex>
                        </div>

                        {/* Question Image */}
                        {q.image && (
                          <div className="my-2">
                            <img
                              src={q.image.trim()}
                              alt={`Question ${index + 1}`}
                              referrerPolicy="no-referrer"
                              className="max-w-full max-h-[300px] rounded-lg border object-contain"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const errorLink = document.createElement('a');
                                  errorLink.href = q.image.trim();
                                  errorLink.target = "_blank";
                                  errorLink.rel = "noopener noreferrer";
                                  errorLink.className = "text-xs text-blue-600 underline block mt-1";
                                  errorLink.textContent = "View Image (Load Failed)";
                                  parent.appendChild(errorLink);
                                }
                              }}
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className={`p-3 rounded-md border ${isCorrect ? 'bg-green-50 border-green-200' : isWrong ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Your Answer</span>
                            <div className={`font-semibold ${isCorrect ? 'text-green-700' : isWrong ? 'text-red-700' : 'text-slate-600'}`}>
                              {ans ? (
                                <div className="flex flex-col gap-1">
                                  <span>
                                    {q.type === 'numerical'
                                      ? ans
                                      : Array.isArray(ans)
                                        ? (ans as string[]).join(', ') // Multi
                                        : `${ans}) ` // Single
                                    }
                                    {q.type !== 'numerical' && !Array.isArray(ans) && <Latex>{q.options[ans]}</Latex>}
                                  </span>
                                  {q.type !== 'numerical' && !Array.isArray(ans) && q.optionImages?.[ans] && (
                                    <img
                                      src={q.optionImages[ans].trim()}
                                      alt="Your Answer"
                                      referrerPolicy="no-referrer"
                                      className="max-h-[100px] w-auto rounded border bg-white object-contain"
                                      onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                  )}
                                </div>
                              ) : 'Not Answered'}
                            </div>
                          </div>

                          <div className="p-3 rounded-md border bg-blue-50 border-blue-100">
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-500 block mb-1">Correct Answer</span>
                            <div className="font-semibold text-blue-900 flex flex-col gap-1">
                              <span>
                                {q.type === 'numerical' ? (
                                  `Between ${(q.correctAnswer as any).min} and ${(q.correctAnswer as any).max}`
                                ) : Array.isArray(q.correctAnswer) ? (
                                  (q.correctAnswer as string[]).join(', ')
                                ) : (
                                  `${q.correctAnswer}) `
                                )}
                                {q.type !== 'numerical' && !Array.isArray(q.correctAnswer) && <Latex>{q.options[q.correctAnswer as string]}</Latex>}
                              </span>
                              {q.type !== 'numerical' && !Array.isArray(q.correctAnswer) && q.optionImages?.[q.correctAnswer as string] && (
                                <img
                                  src={q.optionImages[q.correctAnswer as string].trim()}
                                  alt="Correct Answer"
                                  referrerPolicy="no-referrer"
                                  className="max-h-[100px] w-auto rounded border bg-white object-contain"
                                  onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>

        {/* Feedback Section */}
        {testId && (
          <div className="max-w-2xl mx-auto">
            <FeedbackForm testId={testId} />
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-center gap-4 pb-10">
          <Button size="lg" onClick={handleRetakeTest}>
            <RotateCcw className="w-4 h-4 mr-2" /> Retake Test
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/')}>
            View Other Tests
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;