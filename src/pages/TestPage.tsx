import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fetchTestById, Test } from '@/lib/testsApi';
import { saveAttempt } from '@/lib/attemptsApi';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, Clock, Save, Flag, Menu, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function TestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // State
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!id) return;
    loadTest(id);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (timeRemaining > 0 && !isTimeUp) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsTimeUp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeRemaining, isTimeUp]);

  // Mark current question as visited
  useEffect(() => {
    setVisited(prev => new Set(prev).add(currentQuestionIndex));
  }, [currentQuestionIndex]);

  async function loadTest(testId: string) {
    try {
      const { data, error } = await fetchTestById(testId);
      if (error) throw error;
      if (!data) throw new Error('Test not found');

      setTest(data);
      // Initialize timer: Use test duration if available, else calc from question count
      const durationMins = data.duration || (data.questions?.length || 0);
      setTimeRemaining(durationMins * 60);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load test');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  const handleAnswerSelect = (questionId: number, optionKey: string) => {
    if (isTimeUp) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionKey }));
  };

  const toggleMarkForReview = (questionId: number) => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleClearResponse = (questionId: number) => {
    if (isTimeUp) return;
    setAnswers(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const jumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const handleNext = () => {
    if (test && currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSaveAndNext = () => {
    // Already saved to state on selection. Just move next.
    // If not answered, maybe prompt? No, user can skip.
    handleNext();
  };

  const attemptSubmit = () => {
    setShowSubmitDialog(true);
  };

  const confirmSubmit = async () => {
    if (!test || !user) return;
    setIsSubmitting(true);
    setShowSubmitDialog(false);
    if (timerRef.current) clearInterval(timerRef.current);

    // Calculate score
    let score = 0;
    test.questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        // Correct
        score += (test.marks_per_question || 4);
      } else if (answers[q.id]) {
        // Wrong
        score -= (test.negative_marks !== undefined ? test.negative_marks : 1);
      }
      // Unanswered = 0
    });

    const { error } = await saveAttempt(user.id, test.id, answers, score);

    if (error) {
      toast.error('Failed to save results. Please try again.');
      setIsSubmitting(false);
    } else {
      toast.success('Test Submitted Successfully!');
      navigate('/results', {
        state: {
          test: test,
          answers: answers,
          score: score,
          totalQuestions: test.questions.length,
          marksPerQuestion: test.marks_per_question || 4,
          negativeMark: test.negative_marks !== undefined ? test.negative_marks : 1
        },
        replace: true
      });
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="p-8 text-center">Loading Test...</div>;
  if (!test) return <div className="p-8 text-center">Test not found.</div>;

  const currentQuestion = test.questions[currentQuestionIndex];

  // Palette Component
  const QuestionPalette = () => (
    <div className="grid grid-cols-5 gap-2">
      {test.questions.map((q, idx) => {
        const isAnswered = answers[q.id] !== undefined;
        const isMarked = markedForReview.has(q.id);
        const isVisited = visited.has(idx);
        const isCurrent = currentQuestionIndex === idx;

        let baseClasses = "h-10 w-10 flex items-center justify-center rounded-md border text-sm font-semibold transition-all";
        let colorClasses = "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"; // Default

        if (isCurrent) {
          // Focus ring, keeps underlying color unless strictly overridden, but usually we focus on the border.
          // If we want the current question to ALSO show its status (e.g. green if answered), we should merge logic.
          // But usually current question is highlighted distinctively.
          // Let's make current question have a strong blue border, but keep the status background if possible, or just blue.
          // The previous logic was: Replaced everything with blue ring.
          // Let's keep distinct status colors, but add a ring for current.
        }

        if (isMarked) {
          colorClasses = "bg-yellow-400 border-yellow-500 text-black shadow-sm hover:bg-yellow-500";
        } else if (isAnswered) {
          colorClasses = "bg-green-500 border-green-600 text-white shadow-sm hover:bg-green-600";
        } else if (isVisited) {
          colorClasses = "bg-red-500 border-red-600 text-white shadow-sm hover:bg-red-600";
        }

        // Apply Focus Ring strictly on top
        if (isCurrent) {
          baseClasses += " ring-2 ring-blue-600 border-blue-600 z-10";
        }

        return (
          <button
            key={q.id}
            onClick={() => jumpToQuestion(idx)}
            className={`${baseClasses} ${colorClasses}`}
          >
            {idx + 1}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header: Timer & Submit */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <div className="font-mono text-xl font-bold flex items-center gap-2">
          <Clock className={`w-5 h-5 ${timeRemaining < 300 ? 'text-red-500 animate-pulse' : 'text-slate-600'}`} />
          <span className={timeRemaining < 300 ? 'text-red-600' : 'text-slate-800'}>
            {formatTime(timeRemaining)}
          </span>
        </div>
        <Button onClick={attemptSubmit} disabled={isSubmitting} variant="destructive" size="sm">
          Submit Test
        </Button>
      </div>

      <div className="flex-1 container mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Question Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <Card className="flex-1 flex flex-col min-h-[500px] shadow-md border-t-4 border-t-primary">
            <CardContent className="p-6 flex-1 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-muted-foreground">Question {currentQuestionIndex + 1}</span>
                <span className="text-sm font-medium text-emerald-600">+{test.marks_per_question || 4} / -{test.negative_marks !== undefined ? test.negative_marks : 1}</span>
              </div>

              <div className="text-lg md:text-xl font-medium leading-relaxed">
                {currentQuestion.question}
              </div>

              <div className="space-y-3 mt-4">
                {Object.entries(currentQuestion.options).map(([key, text]) => {
                  const isSelected = answers[currentQuestion.id] === key;
                  return (
                    <div
                      key={key}
                      onClick={() => handleAnswerSelect(currentQuestion.id, key)}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all
                                        ${isSelected ? 'border-primary bg-primary/5 shadow-inner' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}
                                     `}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm border
                                         ${isSelected ? 'bg-primary text-white border-primary' : 'bg-white text-slate-500 border-slate-200'}
                                     `}>
                        {key}
                      </div>
                      <div className="flex-1 text-base">{text}</div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Bottom Controls */}
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Prev
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleClearResponse(currentQuestion.id)}
                disabled={!answers[currentQuestion.id]}
                className="text-muted-foreground border-dashed"
              >
                Clear
              </Button>
              <Button
                variant={markedForReview.has(currentQuestion.id) ? "secondary" : "ghost"}
                onClick={() => toggleMarkForReview(currentQuestion.id)}
                className={markedForReview.has(currentQuestion.id) ? "border-yellow-200 bg-yellow-50 text-yellow-800" : ""}
              >
                <Flag className={`w-4 h-4 mr-2 ${markedForReview.has(currentQuestion.id) ? "fill-yellow-500 text-yellow-500" : ""}`} />
                {markedForReview.has(currentQuestion.id) ? "Marked" : "Review"}
              </Button>
              <Button onClick={handleSaveAndNext} disabled={currentQuestionIndex === test.questions.length - 1}>
                Save & Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side Palette (Desktop) */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Question Palette</h3>
              <QuestionPalette />

              <div className="grid grid-cols-2 gap-2 mt-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 border border-green-600 rounded"></div> Answered</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-400 border border-yellow-500 rounded"></div> Review</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 border border-red-600 rounded"></div> Unanswered</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border border-slate-200 rounded"></div> Not Visited</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Palette Trigger */}
      <div className="lg:hidden fixed bottom-4 right-4 z-20">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" className="h-12 w-12 rounded-full shadow-lg">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Questions</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <QuestionPalette />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {Object.keys(answers).length} out of {test.questions.length} questions.
              {markedForReview.size > 0 && ` There are ${markedForReview.size} questions marked for review.`}
              <br /><br />
              Are you sure you want to finish the test? You cannot change your answers after submitting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit} className="bg-primary">Yes, Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Time Up Dialog - Non-dismissible essentially */}
      <AlertDialog open={isTimeUp}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <Clock className="w-5 h-5" /> Time's Up!
            </AlertDialogTitle>
            <AlertDialogDescription>
              The time allocated for this test has expired. Please submit your answers to see your result.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={confirmSubmit}>Submit Test</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}