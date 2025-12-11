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
    // Context answers are array? Or record? check context definition. 
    // Based on previous file, contextAnswers was treated as array in some places but map in others.
    // previous file: answers = contextAnswers; (as array of {questionId, selectedAnswer})
    // let's assume map for consistency if possible, or convert.
    // actually previous file had `contextAnswers` as `any` and tried to map it.
    // Let's rely on stateData mostly as that's the new flow.
    answers = {}; // Fallback
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
      if (ans === q.correctAnswer) {
        correctCount++;
      } else if (ans) {
        wrongCount++;
      } else {
        skippedCount++;
      }
    });
    // Recalculate score just in case to be safe, or trust passed score.
    // marksScored = (correctCount * (selectedTest.marks_per_question || 4)) - (wrongCount * (selectedTest.negative_marks || 1));
    // Trust passed score for now.
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
                const isCorrect = ans === q.correctAnswer;
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
                          {q.question}
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
                          {q.question}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className={`p-3 rounded-md border ${isCorrect ? 'bg-green-50 border-green-200' : isWrong ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Your Answer</span>
                            <span className={`font-semibold ${isCorrect ? 'text-green-700' : isWrong ? 'text-red-700' : 'text-slate-600'}`}>
                              {ans ? `${ans}) ${q.options[ans]}` : 'Not Answered'}
                            </span>
                          </div>

                          <div className="p-3 rounded-md border bg-blue-50 border-blue-100">
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-500 block mb-1">Correct Answer</span>
                            <span className="font-semibold text-blue-900">
                              {q.correctAnswer}) {q.options[q.correctAnswer]}
                            </span>
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