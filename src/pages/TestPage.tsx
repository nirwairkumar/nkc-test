import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fetchTestById, Test } from '@/lib/testsApi';
import { saveAttempt } from '@/lib/attemptsApi';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, Clock, Save, Flag, Menu, X, CheckCircle, Sun, Moon } from 'lucide-react';
import { useTheme } from "next-themes";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import Latex from 'react-latex-next';
import ScientificCalculator from '@/components/ScientificCalculator';
import { Calculator } from 'lucide-react';

const parseMark = (value: string | number | undefined, defaultVal: number = 0): number => {
  if (typeof value === 'number') {
    return isFinite(value) ? value : defaultVal;
  }
  if (!value) return defaultVal;
  try {
    if (value.includes('/')) {
      const parts = value.split('/');
      if (parts.length === 2) {
        const num = parseFloat(parts[0]);
        const den = parseFloat(parts[1]);
        if (den === 0) return defaultVal;
        return num / den;
      }
    }
    const parsed = parseFloat(value);
    return (isNaN(parsed) || !isFinite(parsed)) ? defaultVal : parsed;
  } catch (e) {
    return defaultVal;
  }
};

export default function TestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // State
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Resume Session State
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumeData, setResumeData] = useState<any>(null);
  const [isRefresh, setIsRefresh] = useState(false);

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
  // Save progress to localStorage
  useEffect(() => {
    if (!user || !test || isSubmitting || isTimeUp || !id) return;

    // Create session object
    const sessionData = {
      answers,
      markedForReview: Array.from(markedForReview),
      visited: Array.from(visited),
      currentQuestionIndex,
      timeRemaining,
      timestamp: Date.now()
    };

    localStorage.setItem(`test_session_${user.id}_${id}`, JSON.stringify(sessionData));
  }, [answers, markedForReview, visited, currentQuestionIndex, timeRemaining, user, id]);

  // Check for saved session on mount
  useEffect(() => {
    if (!user || !id) return;
    const saved = localStorage.getItem(`test_session_${user.id}_${id}`);
    const activeSession = sessionStorage.getItem(`test_active_${user.id}_${id}`);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setResumeData(parsed);

        // If session storage exists, it's a refresh. If not, it's a fresh tab/disconnect return.
        if (activeSession) {
          setIsRefresh(true);
        } else {
          setIsRefresh(false);
        }

        // Mark tab as active
        sessionStorage.setItem(`test_active_${user.id}_${id}`, 'true');
        setShowResumeDialog(true);
      } catch (e) {
        console.error("Failed to parse saved session", e);
      }
    }
  }, [user, id]);

  const handleResumeTest = () => {
    if (!resumeData) return;
    setAnswers(resumeData.answers || {});
    setMarkedForReview(new Set(resumeData.markedForReview || []));
    setVisited(new Set(resumeData.visited || [0]));
    setCurrentQuestionIndex(resumeData.currentQuestionIndex || 0);
    if (resumeData.timeRemaining) {
      setTimeRemaining(resumeData.timeRemaining);
    }
    setShowResumeDialog(false);
    toast.success("Test session resumed!");
  };

  const cancelResume = () => {
    if (!user || !id) return;
    localStorage.removeItem(`test_session_${user.id}_${id}`);
    sessionStorage.removeItem(`test_active_${user.id}_${id}`);
    setShowResumeDialog(false);
    toast.info("Starting fresh test session.");
  };

  // Proctoring State
  const [warnings, setWarnings] = useState(0);
  const MAX_WARNINGS = 2; // Auto-submit on 3rd violation

  // Proctoring: Full Screen & Tab Switching & Action Blocking
  useEffect(() => {
    if (!test || isSubmitting || isTimeUp) return;
    const settings = test.settings;
    if (!settings) return;

    // 1. Action Blocking
    const handleContextMenu = (e: Event) => {
      if (settings.disable_actions) {
        e.preventDefault();
        return false;
      }
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      if (settings.disable_copy_paste) {
        e.preventDefault();
        toast.error("Copy/Paste is disabled for this test.");
        return false;
      }
    };

    if (settings.disable_actions) {
      document.addEventListener('contextmenu', handleContextMenu);
    }
    if (settings.disable_copy_paste) {
      document.addEventListener('copy', handleCopyPaste);
      document.addEventListener('cut', handleCopyPaste);
      document.addEventListener('paste', handleCopyPaste);
    }

    // 2. Tab Swithcing / Visibility
    const handleVisibilityChange = () => {
      if (document.hidden && settings.tab_switch_mode !== 'off') {
        handleViolation("Tab Switching / Navigation");
      }
    };

    // 3. Full Screen Check
    const handleFullScreenChange = () => {
      if (!document.fullscreenElement && settings.force_fullscreen) {
        handleViolation("Exited Full Screen");
      }
    };

    if (settings.tab_switch_mode !== 'off') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    if (settings.force_fullscreen) {
      document.addEventListener('fullscreenchange', handleFullScreenChange);
      // Initial Check
      if (!document.fullscreenElement) {
        // Maybe give a grace period or dialog to re-enter?
        // For now, we'll just warn if they start without it or exit
      }
    }

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, [test, isSubmitting, isTimeUp, warnings]); // Re-bind if warnings change? No, better handleViolation internally

  const handleViolation = (reason: string) => {
    if (!test?.settings) return;
    const mode = test.settings.tab_switch_mode;
    const isStrict = mode === 'strict';

    if (isStrict) {
      toast.error(`Violation Detected: ${reason}. Test Auto-Submitting.`);
      confirmSubmit(); // Immediate Submit
    } else if (mode === 'warming') {
      if (warnings >= MAX_WARNINGS) {
        toast.error(`Maximum violations reached (${reason}). Test Auto-Submitting.`);
        confirmSubmit();
      } else {
        setWarnings(prev => prev + 1);
        toast.warning(`Warning ${warnings + 1}/${MAX_WARNINGS + 1}: ${reason} is not allowed!`);
      }
    }

    // Ideally log this violation to DB (to be implemented in next step)
  };

  // Mark current question as visited
  useEffect(() => {
    setVisited(prev => new Set(prev).add(currentQuestionIndex));
  }, [currentQuestionIndex]);

  async function loadTest(testId: string) {
    try {
      const { data, error } = await fetchTestById(testId);
      if (error) throw error;
      if (!data) throw new Error('Test not found');

      // Randomize questions if setting is enabled
      const settings = data.settings;
      if (settings?.shuffle_questions && data.questions && data.questions.length > 0) {
        // Fisher-Yates shuffle
        for (let i = data.questions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [data.questions[i], data.questions[j]] = [data.questions[j], data.questions[i]];
        }
      }

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

    // Calculate score & stats
    let score = 0;
    let positiveScore = 0;
    let negativeScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let partialCount = 0;
    let unattemptedCount = 0;

    test.questions.forEach((q, index) => {
      let isCorrect = false;
      const userAns = answers[q.id];

      if (!userAns) {
        unattemptedCount++;
        return; // Unanswered
      }

      let sectionMarks = test.marks_per_question ? parseMark(test.marks_per_question, 4) : 4;
      let sectionNegative = test.negative_marks !== undefined ? parseMark(test.negative_marks, 1) : 1;

      // Section-specific marks overrides
      if (test.enable_section_mode && test.sections) {
        let runningCount = 0;
        for (const section of test.sections) {
          // We can rely on the current question index 'index'
          if (index >= runningCount && index < runningCount + section.questions.length) {
            sectionMarks = parseMark(section.marks_per_question, 4);
            sectionNegative = parseMark(section.negative_marks, 1);
            break;
          }
          runningCount += section.questions.length;
        }
      }

      if (q.type === 'numerical') {
        const numAns = parseFloat(userAns as string);
        const range = q.correctAnswer as { min: number, max: number };
        if (!isNaN(numAns) && range && typeof range === 'object' && numAns >= range.min && numAns <= range.max) {
          isCorrect = true;
          score += sectionMarks;
          positiveScore += sectionMarks;
          correctCount++;
        } else {
          score -= sectionNegative;
          negativeScore += sectionNegative;
          wrongCount++;
        }
      } else if (q.type === 'multiple') {
        const correctArr = (Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer]).map(String).sort();
        const userArr = (Array.isArray(userAns) ? userAns : [userAns]).map(String).sort();

        // Check for 'any incorrect option selected'
        const hasIncorrectSelection = userArr.some(ans => !correctArr.includes(ans));

        if (hasIncorrectSelection) {
          // Overall wrong -> Negative Mark
          score -= sectionNegative;
          negativeScore += sectionNegative;
          wrongCount++;
        } else {
          // No incorrect options selected. Check for Partial or Full.
          if (userArr.length === correctArr.length) {
            // Full Correct
            isCorrect = true;
            score += sectionMarks;
            positiveScore += sectionMarks;
            correctCount++;
          } else if (userArr.length > 0) {
            // Partial Correct
            const fraction = userArr.length / correctArr.length;
            const partialScore = fraction * sectionMarks;
            score += partialScore;
            positiveScore += partialScore;
            partialCount++;
          }
        }
      } else {
        // Single Choice
        if (userAns === q.correctAnswer) {
          isCorrect = true;
          score += sectionMarks;
          positiveScore += sectionMarks;
          correctCount++;
        } else {
          score -= sectionNegative;
          negativeScore += sectionNegative;
          wrongCount++;
        }
      }
    });

    // Prepare Metadata
    let startFormData = {};
    try {
      const storedForm = sessionStorage.getItem(`start_form_${test.id}`);
      if (storedForm) {
        startFormData = JSON.parse(storedForm);
      }
    } catch (e) {
      console.error("Failed to parse start form data", e);
    }

    const metadata = {
      startFormData,
      stats: {
        positiveScore,
        negativeScore,
        correctCount,
        partialCount,
        wrongCount,
        unattemptedCount,
        totalQuestions: test.questions.length
      },
      submittedAt: new Date().toISOString()
    };

    const finalScore = (isNaN(score) || !isFinite(score)) ? 0 : parseFloat(score.toFixed(2));
    const { error } = await saveAttempt(user.id, test.id, answers, finalScore, metadata);

    if (error) {
      console.error("Save Attempt Error:", error);
      toast.error('Failed to save results. Please try again.');
      setIsSubmitting(false);
    } else {
      toast.success('Test Submitted Successfully!');
      // Clear saved session on submit
      localStorage.removeItem(`test_session_${user.id}_${test.id}`);
      sessionStorage.removeItem(`test_active_${user.id}_${test.id}`);

      // Handle Result Visibility
      if (test.settings?.show_results_immediate === false) {
        // Navigate to home or a simpler success page if results are hidden
        navigate('/dashboard', { state: { message: "Test submitted successfully. Results will be published later." } });
        // Note: Assuming /dashboard exists or similar (UserTestManager is at / ?)
        // Let's go to root '/' which seems to be the main list or dashboard
        navigate('/');
      } else {
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
  if (loading) return <div className="p-8 text-center">Loading Test...</div>;
  if (!test) return <div className="p-8 text-center">Test not found.</div>;
  if (!test.questions || test.questions.length === 0) return <div className="p-8 text-center">This test has no questions.</div>;

  const currentQuestion = test.questions[currentQuestionIndex];

  // Palette Component
  const QuestionPalette = ({ onQuestionClick }: { onQuestionClick?: () => void }) => {
    // Group questions if in section mode
    if (test.enable_section_mode && test.sections) {
      let runningIndex = 0;
      return (
        <div className="space-y-4">
          {test.sections.map((section: any, sIdx: number) => {
            const startIndex = runningIndex;
            const sectionQuestions = section.questions;
            runningIndex += sectionQuestions.length;

            return (
              <div key={section.id} className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{section.name}</h4>
                <div className="grid grid-cols-5 gap-2">
                  {sectionQuestions.map((_: any, localIdx: number) => {
                    const globalIdx = startIndex + localIdx;
                    const q = test.questions[globalIdx];

                    const isAnswered = answers[q.id] !== undefined;
                    const isMarked = markedForReview.has(q.id);
                    const isVisited = visited.has(globalIdx);
                    const isCurrent = currentQuestionIndex === globalIdx;

                    let baseClasses = "h-8 w-8 flex items-center justify-center rounded text-xs font-semibold transition-all";
                    let colorClasses = "bg-white border text-slate-700 hover:bg-slate-50";

                    if (isMarked) {
                      colorClasses = "bg-yellow-400 border-yellow-500 text-black";
                    } else if (isAnswered) {
                      colorClasses = "bg-green-500 border-green-600 text-white";
                    } else if (isVisited) {
                      colorClasses = "bg-red-500 border-red-600 text-white";
                    }

                    if (isCurrent) {
                      baseClasses += " ring-2 ring-blue-600 border-blue-600 z-10";
                    }

                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          jumpToQuestion(globalIdx);
                          onQuestionClick?.();
                        }}
                        className={`${baseClasses} ${colorClasses}`}
                      >
                        {globalIdx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Default Flat Palette
    return (
      <div className="grid grid-cols-5 gap-2">
        {test.questions.map((q, idx) => {
          const isAnswered = answers[q.id] !== undefined;
          const isMarked = markedForReview.has(q.id);
          const isVisited = visited.has(idx);
          const isCurrent = currentQuestionIndex === idx;

          let baseClasses = "h-10 w-10 flex items-center justify-center rounded-md border text-sm font-semibold transition-all";
          let colorClasses = "bg-white border-slate-200 text-slate-700 hover:bg-slate-50";

          if (isMarked) {
            colorClasses = "bg-yellow-400 border-yellow-500 text-black shadow-sm hover:bg-yellow-500";
          } else if (isAnswered) {
            colorClasses = "bg-green-500 border-green-600 text-white shadow-sm hover:bg-green-600";
          } else if (isVisited) {
            colorClasses = "bg-red-500 border-red-600 text-white shadow-sm hover:bg-red-600";
          }

          if (isCurrent) {
            baseClasses += " ring-2 ring-blue-600 border-blue-600 z-10";
          }

          return (
            <button
              key={q.id}
              onClick={() => {
                jumpToQuestion(idx);
                onQuestionClick?.();
              }}
              className={`${baseClasses} ${colorClasses}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Institution Branding Bar */}
      {(test.institution_name || test.institution_logo) && (
        <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-4 py-2 flex items-center justify-center gap-3">
          {test.institution_logo && (
            <img src={test.institution_logo} alt="Institution Logo" className="h-10 w-auto object-contain" />
          )}
          {test.institution_name && (
            <span className="text-lg font-bold text-slate-800">{test.institution_name}</span>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-4 py-3 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <div className="font-mono text-xl font-bold flex items-center gap-2">
          <Clock className={`w-5 h-5 ${timeRemaining < 300 ? 'text-red-500 animate-pulse' : 'text-slate-600 dark:text-slate-400'}`} />
          <span className={timeRemaining < 300 ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}>
            {formatTime(timeRemaining)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {test.has_scientific_calculator && (
            <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:flex h-9 w-9 p-0 rounded-full" title="Scientific Calculator">
                  <Calculator className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none">
                <ScientificCalculator />
              </DialogContent>
            </Dialog>
          )}

          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button onClick={attemptSubmit} disabled={isSubmitting} variant="destructive" size="sm">
            Submit Test
          </Button>
        </div>
      </div>

      <div className="flex-1 w-full px-2 lg:px-4 py-2 grid grid-cols-1 lg:grid-cols-12 gap-4 relative lg:h-full lg:overflow-hidden">
        {/* Main Question Area */}
        {/* Main Question Area - Independently Scrollable on Desktop */}
        {/* Main Question Area - Independently Scrollable on Desktop */}
        <div className="lg:col-span-9 flex flex-col gap-0 relative lg:h-full lg:overflow-hidden">

          {/* Section Tabs */}
          {test.enable_section_mode && test.sections && (
            <div className="flex overflow-x-auto border-b bg-white dark:bg-slate-900 scrollbar-hide">
              {(() => {
                let runningIndex = 0;
                return test.sections.map((section: any, idx: number) => {
                  const startIndex = runningIndex;
                  const count = section.questions.length; // Assumes structure is preserved in JSON even if flat list used for render
                  const endIndex = startIndex + count - 1;
                  runningIndex += count;

                  const isActive = currentQuestionIndex >= startIndex && currentQuestionIndex <= endIndex;

                  return (
                    <button
                      key={section.id}
                      onClick={() => setCurrentQuestionIndex(startIndex)}
                      className={`
                                flex-1 min-w-[100px] py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-4
                                ${isActive
                          ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                          : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}
                            `}
                    >
                      {section.name}
                    </button>
                  );
                });
              })()}
            </div>
          )}

          {/* Mobile Palette Trigger (Top Left - Floating above Card) */}
          <div className="lg:hidden absolute top-2 left-2 z-20">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button size="icon" className="h-10 w-10 rounded-full shadow-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[80%] sm:w-[380px] flex flex-col h-full">
                <SheetHeader>
                  <SheetTitle>Questions</SheetTitle>
                </SheetHeader>
                <div className="py-4 flex-1 overflow-y-auto pb-6">
                  {/* Legend - Above Palette */}
                  <div className="grid grid-cols-2 gap-y-2 mb-6 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 border border-green-600 rounded"></div> Answered</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-400 border border-yellow-500 rounded"></div> Review</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 border border-red-600 rounded"></div> Unanswered</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border border-slate-200 rounded"></div> Not Visited</div>
                  </div>

                  <QuestionPalette onQuestionClick={() => setIsMobileMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {currentQuestion.passageContent ? (
            /* SPLIT VIEW FOR COMPREHENSION */
            <div className="flex-1 h-full flex flex-col lg:flex-row gap-4 lg:overflow-hidden pb-4 p-1 pt-14 lg:pt-1">
              {/* Passage Pane (Desktop) */}
              <div className="hidden lg:block w-1/2 h-full overflow-y-auto bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-800 shadow-sm custom-scrollbar">
                <div className="p-4 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-sm">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px]">Passage</span>
                  </h3>
                </div>
                <div className="p-6 text-base leading-relaxed text-slate-800 dark:text-slate-200">
                  <Latex>{currentQuestion.passageContent}</Latex>
                </div>
              </div>

              {/* Question Pane */}
              <div className="flex-1 h-full overflow-y-auto lg:pr-2 custom-scrollbar">
                {/* Mobile Passage (Collapsed/Scrollable) */}
                <div className="lg:hidden bg-white p-4 rounded-lg border mb-4 shadow-sm">
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-2">Passage Reference</div>
                  <div className="text-sm leading-relaxed max-h-48 overflow-y-auto bg-slate-50 p-3 rounded border">
                    <Latex>{currentQuestion.passageContent}</Latex>
                  </div>
                </div>

                <Card className="min-h-[400px] shadow-sm border-0 bg-white dark:bg-slate-900 w-full h-auto block">
                  <CardContent className="p-6 gap-6 flex flex-col h-auto">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">Question {currentQuestionIndex + 1}</span>
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                            {currentQuestion.type === 'multiple' ? 'Multiple Choice' :
                              currentQuestion.type === 'numerical' ? 'Numerical' :
                                currentQuestion.type === 'comprehension' ? 'Passage' : 'Single Choice'}
                          </span>
                        </div>
                      </div>

                      {(() => {
                        let marks = test.marks_per_question || 4;
                        let neg = test.negative_marks !== undefined ? test.negative_marks : 1;
                        // Use parseMark for fractions
                        let marksVal = parseMark(marks, 4);
                        let negVal = parseMark(neg, 1);

                        // If section mode is enabled, find the specific section for this question
                        if (test.enable_section_mode && test.sections) {
                          let runningCount = 0;
                          for (const section of test.sections) {
                            if (currentQuestionIndex >= runningCount && currentQuestionIndex < runningCount + section.questions.length) {
                              marksVal = parseMark(section.marks_per_question, 4);
                              negVal = parseMark(section.negative_marks, 1);
                              break;
                            }
                            runningCount += section.questions.length;
                          }
                        }

                        return (
                          <div className="text-sm font-medium flex items-center gap-1">
                            <span className="text-emerald-600">+{parseFloat(marksVal.toFixed(2))}</span>
                            <span className="text-slate-400">/</span>
                            <span className="text-red-500">-{parseFloat(negVal.toFixed(2))}</span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="text-lg md:text-xl font-medium leading-relaxed break-words">
                      <Latex>{currentQuestion.question}</Latex>
                    </div>

                    {currentQuestion.image && (
                      <div className="my-4">
                        <img
                          src={currentQuestion.image.trim()}
                          alt={`Question ${currentQuestionIndex + 1}`}
                          referrerPolicy="no-referrer"
                          className="max-w-full max-h-[400px] rounded-lg border object-contain mx-auto"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const errorMsg = document.createElement('div');
                              errorMsg.className = "text-center p-4 border border-red-200 bg-red-50 rounded-lg text-sm text-red-600 space-y-2";
                              errorMsg.innerHTML = `<p>Image failed to load.</p><a href="${currentQuestion.image?.trim()}" target="_blank" rel="noopener noreferrer" class="underline font-bold">Click here to view image</a>`;
                              parent.appendChild(errorMsg);
                            }
                          }}
                        />
                      </div>
                    )}

                    <div className="space-y-3 mt-4">
                      {currentQuestion.type === 'numerical' ? (
                        <div className="max-w-xs">
                          <Label className="mb-2 block">Your Answer</Label>
                          <Input
                            type="number"
                            step="any"
                            placeholder="Enter your answer"
                            value={answers[currentQuestion.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
                            }}
                            className="text-lg bg-white dark:bg-slate-950 dark:border-slate-800"
                          />
                        </div>
                      ) : (
                        Object.entries(currentQuestion.options || {}).map(([key, text]) => {
                          const isSelected = currentQuestion.type === 'multiple'
                            ? (Array.isArray(answers[currentQuestion.id]) && (answers[currentQuestion.id] as any).includes(key))
                            : answers[currentQuestion.id] === key;

                          const optionImage = currentQuestion.optionImages?.[key];

                          return (
                            <div
                              key={key}
                              onClick={() => {
                                if (currentQuestion.type === 'multiple') {
                                  const current = (answers[currentQuestion.id] as any) || [];
                                  const newAnswers = Array.isArray(current) ? [...current] : [];

                                  if (newAnswers.includes(key)) {
                                    newAnswers.splice(newAnswers.indexOf(key), 1);
                                  } else {
                                    newAnswers.push(key);
                                  }
                                  newAnswers.sort();
                                  setAnswers(prev => ({ ...prev, [currentQuestion.id]: newAnswers }));
                                } else {
                                  handleAnswerSelect(currentQuestion.id, key);
                                }
                              }}
                              className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all
                                                       ${isSelected ? 'border-primary bg-primary/5 shadow-inner' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}
                                                   `}

                            >
                              <div className={`h-8 w-8 flex items-center justify-center font-bold text-sm border shrink-0 transition-colors
                                                       ${currentQuestion.type === 'multiple' ? 'rounded-md' : 'rounded-full'}
                                                       ${isSelected ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}
                                                   `}>
                                {currentQuestion.type === 'multiple' && isSelected && <CheckCircle className="w-5 h-5 absolute" />}
                                <span className={currentQuestion.type === 'multiple' && isSelected ? 'opacity-0' : ''}>{key}</span>
                              </div>

                              <div className="flex-1 flex flex-col gap-2">
                                {text && <div className="text-base break-words pt-1"><Latex>{text}</Latex></div>}
                                {optionImage && (
                                  <img
                                    src={optionImage.trim()}
                                    alt={`Option ${key}`}
                                    referrerPolicy="no-referrer"
                                    className="max-w-[200px] max-h-[200px] rounded-md border object-contain"
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        // Simple error handler
                                      }
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            /* STANDARD VIEW */
            <div className="flex-1 h-full flex flex-col gap-6 lg:overflow-y-auto lg:overflow-x-hidden lg:pr-2 pb-24 p-1 pt-14 lg:pt-1">
              <Card className="min-h-[500px] shadow-none border-none bg-transparent w-full h-auto block">
                <CardContent className="p-6 gap-6 flex flex-col h-auto">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Question {currentQuestionIndex + 1}</span>
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                          {currentQuestion.type === 'multiple' ? 'Multiple Choice' :
                            currentQuestion.type === 'numerical' ? 'Numerical' :
                              currentQuestion.type === 'comprehension' ? 'Passage' : 'Single Choice'}
                        </span>
                      </div>
                    </div>

                    {(() => {
                      let marks = test.marks_per_question || 4;
                      let neg = test.negative_marks !== undefined ? test.negative_marks : 1;

                      // If section mode is enabled, find the specific section for this question
                      if (test.enable_section_mode && test.sections) {
                        let runningCount = 0;
                        for (const section of test.sections) {
                          if (currentQuestionIndex >= runningCount && currentQuestionIndex < runningCount + section.questions.length) {
                            marks = section.marks_per_question ?? marks;
                            neg = section.negative_marks ?? neg;
                            break;
                          }
                          runningCount += section.questions.length;
                        }
                      }

                      return (
                        <span className="text-sm font-medium text-emerald-600">+{marks} / -{neg}</span>
                      );
                    })()}
                  </div>

                  <div className="text-lg md:text-xl font-medium leading-relaxed break-words">
                    <Latex>{currentQuestion.question}</Latex>
                  </div>

                  {currentQuestion.image && (
                    <div className="my-4">
                      <img
                        src={currentQuestion.image.trim()}
                        alt={`Question ${currentQuestionIndex + 1}`}
                        referrerPolicy="no-referrer"
                        className="max-w-full max-h-[400px] rounded-lg border object-contain mx-auto"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const errorMsg = document.createElement('div');
                            errorMsg.className = "text-center p-4 border border-red-200 bg-red-50 rounded-lg text-sm text-red-600 space-y-2";
                            errorMsg.innerHTML = `<p>Image failed to load.</p><a href="${currentQuestion.image?.trim()}" target="_blank" rel="noopener noreferrer" class="underline font-bold">Click here to view image</a>`;
                            parent.appendChild(errorMsg);
                          }
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-3 mt-4">
                    {currentQuestion.type === 'numerical' ? (
                      <div className="max-w-xs">
                        <Label className="mb-2 block">Your Answer</Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Enter your answer"
                          value={answers[currentQuestion.id] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
                          }}
                          className="text-lg bg-white dark:bg-slate-950 dark:border-slate-800"
                        />
                      </div>
                    ) : (
                      Object.entries(currentQuestion.options || {}).map(([key, text]) => {
                        const isSelected = currentQuestion.type === 'multiple'
                          ? (Array.isArray(answers[currentQuestion.id]) && (answers[currentQuestion.id] as any).includes(key))
                          : answers[currentQuestion.id] === key;

                        const optionImage = currentQuestion.optionImages?.[key];

                        return (
                          <div
                            key={key}
                            onClick={() => {
                              if (currentQuestion.type === 'multiple') {
                                const current = (answers[currentQuestion.id] as any) || [];
                                const newAnswers = Array.isArray(current) ? [...current] : [];

                                if (newAnswers.includes(key)) {
                                  newAnswers.splice(newAnswers.indexOf(key), 1);
                                } else {
                                  newAnswers.push(key);
                                }
                                newAnswers.sort();
                                setAnswers(prev => ({ ...prev, [currentQuestion.id]: newAnswers }));
                              } else {
                                handleAnswerSelect(currentQuestion.id, key);
                              }
                            }}
                            className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all
                                                 ${isSelected ? 'border-primary bg-primary/5 shadow-inner' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}
                                             `}
                          >
                            <div className={`h-8 w-8 flex items-center justify-center font-bold text-sm border shrink-0 transition-colors
                                                 ${currentQuestion.type === 'multiple' ? 'rounded-md' : 'rounded-full'}
                                                 ${isSelected ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}
                                             `}>
                              {currentQuestion.type === 'multiple' && isSelected && <CheckCircle className="w-5 h-5 absolute" />}
                              <span className={currentQuestion.type === 'multiple' && isSelected ? 'opacity-0' : ''}>{key}</span>
                            </div>

                            <div className="flex-1 flex flex-col gap-2">
                              {text && <div className="text-base break-words pt-1"><Latex>{text}</Latex></div>}
                              {optionImage && (
                                <img
                                  src={optionImage.trim()}
                                  alt={`Option ${key}`}
                                  referrerPolicy="no-referrer"
                                  className="max-w-[200px] max-h-[200px] rounded-md border object-contain"
                                  onError={(e) => {
                                    // Simple Error Handler
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Bottom Controls */}
          {/* Fixed Bottom for Mobile, Absolute for Desktop Column */}
          <div className="fixed lg:absolute bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-2 rounded-b-lg transition-all">
            <div className="flex items-center justify-between gap-2 md:gap-4">

              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                size="sm"
                className="md:w-auto md:px-3 md:py-1 h-9"
              >
                <ChevronLeft className="w-6 h-6 md:w-4 md:h-4 md:mr-1" />
                <span className="hidden md:inline">Previous</span>
              </Button>

              <div className="flex gap-2 md:gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleClearResponse(currentQuestion.id)}
                  disabled={!answers[currentQuestion.id]}
                  size="sm"
                  className="text-muted-foreground border-dashed md:border-solid md:text-slate-600 md:hover:text-slate-900 h-9"
                >
                  <span className="hidden md:inline mr-2">Clear</span>
                  <span className="md:hidden">Clear</span>
                </Button>

                <Button
                  variant={markedForReview.has(currentQuestion.id) ? "secondary" : "ghost"}
                  onClick={() => toggleMarkForReview(currentQuestion.id)}
                  className={`
                            ${markedForReview.has(currentQuestion.id)
                      ? "border-yellow-200 bg-yellow-50 text-yellow-800"
                      : "text-slate-600 hover:text-slate-900"}
                        `}
                  title="Mark for Review"
                  size="sm"
                >
                  <Flag className={`w-4 h-4 ${markedForReview.has(currentQuestion.id) ? "md:mr-2 fill-yellow-500 text-yellow-500" : ""}`} />
                  <span className={`hidden ${markedForReview.has(currentQuestion.id) ? "md:inline" : ""}`}>
                    Marked
                  </span>
                </Button>

                <Button
                  onClick={handleSaveAndNext}
                  size="sm"
                  className="px-3 md:px-4 md:py-1 h-9"
                  disabled={currentQuestionIndex === test.questions.length - 1}
                >
                  <span className="hidden md:inline mr-2">Save & Next</span>
                  <span className="md:hidden">Save & Next</span>
                  <ChevronRight className="w-4 h-4 ml-0.5 md:ml-0" />
                </Button>
              </div>
            </div>
          </div>

          {/* Spacer to prevent content from being hidden behind sticky bar */}
          <div className="block h-6 md:h-6"></div>
        </div>

        {/* Right Side Palette (Desktop) - Independently Scrollable */}
        <div className="hidden lg:block lg:col-span-3 lg:h-full lg:overflow-hidden">

          <Card className="h-full flex flex-col shadow-md border-t-4 border-t-slate-500 dark:border-t-slate-600 bg-white dark:bg-slate-900 border-x dark:border-x-slate-800 border-b dark:border-b-slate-800">
            <CardContent className="p-4 flex-1 overflow-y-auto overflow-x-hidden">
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

      {/* Resume Session Dialog */}
      <AlertDialog open={showResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume Test?</AlertDialogTitle>
            <AlertDialogDescription>
              {isRefresh
                ? "Resuming your active test session. Click continue."
                : "We found an interrupted session. Would you like to continue from where you left off?"
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {!isRefresh && <AlertDialogCancel onClick={cancelResume}>Start Over</AlertDialogCancel>}
            <AlertDialogAction onClick={handleResumeTest}>Continue Test</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
