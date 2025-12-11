import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTest } from '@/contexts/TestContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Trophy,
  RotateCcw,
  CheckCircle,
  XCircle,
  Target,
  TrendingUp,
  ArrowUpDown,
  Home,
  History
} from 'lucide-react';

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
  const [allResults, setAllResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'submission_time' | 'marks_scored'>('submission_time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Check for state passed from TestPage
  // logs for debugging
  console.log('ResultsPage location state:', location.state);
  console.log('Context data:', { contextStudentName, contextSelectedTest, isTestCompleted });

  const stateData = location.state as {
    test: any;
    answers: Record<number, string>;
    score: number;
    totalQuestions: number
  } | undefined;

  // Use state data if available, otherwise fall back to context (legacy support)
  const showPersonalResults = !!stateData || (!!contextStudentName && !!contextSelectedTest && isTestCompleted);

  const studentName = stateData ? 'Student' : contextStudentName; // We could fetch user name if needed
  const selectedTest = stateData?.test || contextSelectedTest;

  // Normalize answers to array format: { questionId, selectedAnswer }
  let answers: { questionId: number; selectedAnswer: string }[] = [];
  try {
    if (stateData && stateData.answers) {
      answers = Object.entries(stateData.answers).map(([qid, ans]) => ({ questionId: Number(qid), selectedAnswer: ans }));
    } else if (contextAnswers) {
      answers = contextAnswers;
    }
  } catch (e) {
    console.error("Error parsing answers:", e);
  }

  useEffect(() => {
    fetchAllResults();
  }, []);

  const fetchAllResults = async () => {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (error) {
        console.error('Error fetching results:', error);
        return;
      }

      setAllResults(data || []);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: 'submission_time' | 'marks_scored') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  useEffect(() => {
    fetchAllResults();
  }, [sortBy, sortOrder]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPercentage = (scored: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((scored / total) * 100);
  };

  // Calculate Personal test results logic
  let totalQuestions = 0;
  let correctAnswers = 0;
  let score = 0;

  if (showPersonalResults && selectedTest && selectedTest.questions) {
    totalQuestions = selectedTest.questions.length;
    correctAnswers = answers.filter(answer => {
      const question = selectedTest?.questions?.find((q: any) => q.id === answer.questionId);
      return question && question.correctAnswer === answer.selectedAnswer;
    }).length;
    score = Math.round((correctAnswers / totalQuestions) * 100);
  } else {
    console.log("Skipping score calculation: Missing selectedTest or questions", { showPersonalResults, selectedTest });
  }

  const getScoreColor = () => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreMessage = () => {
    if (score >= 90) return 'Excellent work!';
    if (score >= 80) return 'Great job!';
    if (score >= 70) return 'Good effort!';
    if (score >= 60) return 'Keep practicing!';
    return 'Study more and try again!';
  };

  const handleRetakeTest = () => {
    resetTest();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex gap-2 w-full md:w-auto justify-center md:justify-start">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/history')}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              Test History
            </Button>
          </div>
          <div className="text-center w-full md:w-auto">
            <h1 className="text-xl md:text-3xl font-bold text-foreground break-words px-2">
              {showPersonalResults && selectedTest ? `Results: ${selectedTest.title}` : 'Test Results'}
            </h1>
            <p className="text-muted-foreground">
              {showPersonalResults ? `Here's how you performed` : 'Test results overview'}
            </p>
          </div>
          <div className="hidden md:block w-[120px]"></div> {/* Spacer for desktop centering */}
        </div>

        {/* Personal Score Summary (only if user just completed a test) */}

        {/* Detailed Results (only if user just completed a test) */}
        {showPersonalResults && selectedTest && (
          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Your Detailed Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTest.questions?.map((question: any, index: number) => {
                const userAnswer = answers.find(a => a.questionId === question.id);
                const isCorrect = userAnswer?.selectedAnswer === question.correctAnswer;

                return (
                  <div key={question.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="font-medium">
                          Q{index + 1}: {question.question}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Your answer:</span>
                            <Badge variant={isCorrect ? "default" : "destructive"}>
                              {userAnswer?.selectedAnswer} - {question.options[userAnswer?.selectedAnswer || 'A']}
                            </Badge>
                          </div>
                          {!isCorrect && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Correct answer:</span>
                              <Badge variant="outline" className="border-success text-success">
                                {question.correctAnswer} - {question.options[question.correctAnswer]}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Actions - Bottom */}
        {showPersonalResults && (
          <div className="flex flex-col items-center gap-4">
            <Button onClick={handleRetakeTest} size="lg" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Take Test Again
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;