import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { fetchTestById, Test, Question } from '@/lib/testsApi';
import { saveAttempt } from '@/lib/attemptsApi';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/BackButton';

export default function TestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // Store simple map of questionId -> answerKey
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!id) return;
    loadTest(id);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSubmitTest(true); // Auto submit
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeRemaining]);

  async function loadTest(testId: string) {
    try {
      const { data, error } = await fetchTestById(testId);
      if (error) throw error;
      if (!data) throw new Error('Test not found');

      setTest(data);
      // Initialize timer: 1 minute per question (example)
      const duration = (data.questions?.length || 0) * 60;
      setTimeRemaining(duration);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load test');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  const handleAnswerSelect = (questionId: number, optionKey: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionKey }));
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

  const handleSubmitTest = async (autoSubmit = false) => {
    if (!test || !user) return;
    if (isSubmitting) return;

    const totalQuestions = test.questions.length;
    const currentAnswerCount = Object.keys(answers).length;

    if (!autoSubmit && currentAnswerCount < totalQuestions) {
      toast.warning(`You have answered ${currentAnswerCount} of ${totalQuestions} questions.`);
      // Allow them to continue or enforce it? User requirement said "graceful error handling". 
      // We'll trust the user wants to submit if they clicked submit, but maybe show a confirmation?
      // For simplicity, we proceed but showed warning. Or we can just return.
      // To match previous behavior:
      if (!window.confirm("You have unanswered questions. Are you sure you want to submit?")) return;
    }

    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    // Calculate score
    let score = 0;
    test.questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        score++;
      }
    });

    const { error } = await saveAttempt(user.id, test.id, answers, score);

    if (error) {
      toast.error('Failed to save results. Please try again.');
      setIsSubmitting(false);
    } else {
      toast.success('Test Submitted Successfully!');

      // Navigate to results page with data, replacing current history entry
      navigate('/results', {
        state: {
          test: test,
          answers: answers,
          score: score,
          totalQuestions: test.questions.length
        },
        replace: true
      });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="p-8 text-center">Loading Test...</div>;
  if (!test) return <div className="p-8 text-center">Test not found.</div>;

  const currentQuestion = test.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / test.questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <BackButton className="mb-0" />
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
          <div>
            <h1 className="text-xl font-bold">{test.title}</h1>
            <p className="text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {test.questions.length}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="w-4 h-4" /> Time Remaining
            </div>
            <div className={`text-xl font-mono font-bold ${timeRemaining < 60 ? 'text-red-500' : 'text-primary'}`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>

        <Progress value={progress} className="h-2" />

        {/* Question Card */}
        <Card className="min-h-[400px] flex flex-col justify-center">
          <CardHeader>
            <CardTitle className="text-lg leading-relaxed">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(currentQuestion.options).map(([key, text]) => {
              const isSelected = answers[currentQuestion.id] === key;
              return (
                <div
                  key={key}
                  onClick={() => handleAnswerSelect(currentQuestion.id, key)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3
                                        ${isSelected ? 'border-primary bg-primary/5' : 'border-transparent bg-secondary/50 hover:bg-secondary'}
                                    `}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border
                                        ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-muted-foreground border-muted'}`}>
                    {key}
                  </div>
                  <span className="text-base">{text}</span>
                  {isSelected && <CheckCircle className="ml-auto w-5 h-5 text-primary" />}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Previous
          </Button>

          {currentQuestionIndex === test.questions.length - 1 ? (
            <Button onClick={() => handleSubmitTest(false)} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Test'}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}