import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fetchTestById, Test } from '@/lib/testsApi';
import { saveAttempt } from '@/lib/attemptsApi';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, Clock, Save, Flag, Menu, X, CheckCircle, Sun, Moon, Bookmark, Info, Eye, EyeOff, TriangleAlert, Calculator } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Latex from 'react-latex-next';
import ScientificCalculator from '@/components/ScientificCalculator';

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
    const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(false);
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

    // Palette Resize State
    const [paletteWidth, setPaletteWidth] = useState(320);
    const isResizingRef = useRef(false);

    // 1. Browser Back Button Prevention
    useEffect(() => {
        // Push current state to history stack
        window.history.pushState(null, "", window.location.href);

        const handlePopState = (e: PopStateEvent) => {
            // Prevent back navigation
            window.history.pushState(null, "", window.location.href);
            toast.warning("Back navigation is disabled during the test.");
        };

        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizingRef.current) return;

            const newWidth = window.innerWidth - e.clientX;
            const minWidth = 240;
            const maxWidth = window.innerWidth * 0.25; // Max 25% of screen width

            if (newWidth >= minWidth && newWidth <= maxWidth) {
                setPaletteWidth(newWidth);
            } else if (newWidth > maxWidth) {
                setPaletteWidth(maxWidth);
            } else if (newWidth < minWidth) {
                setPaletteWidth(minWidth);
            }
        };

        const handleMouseUp = () => {
            if (isResizingRef.current) {
                isResizingRef.current = false;
                document.body.style.cursor = 'default';
                document.body.style.userSelect = 'auto';
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const startResizing = () => {
        isResizingRef.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    // Resume Session State
    const [showResumeDialog, setShowResumeDialog] = useState(false);
    const [resumeData, setResumeData] = useState<any>(null);
    const [isRefresh, setIsRefresh] = useState(false);


    const [isTimeHidden, setIsTimeHidden] = useState(false);

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
        // UPDATED: Allow last question save
        if (test && currentQuestionIndex === test.questions.length - 1) {
            toast.info("This is the last question. Please click Submit Test at the top right.");
            // We do not return here, we let it proceed if we wanted to just save, but the button is "Save & Next"
            // Since there is no "Next", we just save (which is done by state update).
            // Actually, handleNext() just changes index.
            return;
        }
        handleNext();
    };

    const handleSaveAndMarkReview = () => {
        if (test) {
            setMarkedForReview(prev => new Set(prev).add(test.questions[currentQuestionIndex].id));
            handleNext();
        }
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

            // Per-Question overrides (highest priority)
            if (q.marks !== undefined) sectionMarks = parseMark(q.marks, sectionMarks);
            if (q.negativeMarks !== undefined) sectionNegative = parseMark(q.negativeMarks, sectionNegative);

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

                                        let baseClasses = "h-8 w-8 flex items-center justify-center text-xs font-semibold transition-all relative rounded-md border";
                                        let colorClasses = "bg-white border-slate-300 text-slate-700 hover:bg-slate-50";

                                        // 1. Answered & Marked (Purple Square + Green Dot)
                                        if (isAnswered && isMarked) {
                                            colorClasses = "bg-purple-600 border-purple-700 text-white";
                                        }
                                        // 2. Marked for Review (Purple Square)
                                        else if (isMarked) {
                                            colorClasses = "bg-purple-600 border-purple-700 text-white";
                                        }
                                        // 3. Answered (Green Box)
                                        else if (isAnswered) {
                                            colorClasses = "bg-green-500 border-green-600 text-white clip-polygon-answer";
                                        }
                                        // 4. Not Answered (Red Box)
                                        else if (isVisited) {
                                            colorClasses = "bg-red-500 border-red-600 text-white";
                                        }
                                        // 5. Not Visited (White Box - Default)
                                        else {
                                            colorClasses = "bg-white border-slate-300 text-slate-700 hover:bg-slate-50";
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
                                                {isAnswered && isMarked && (
                                                    <div className="absolute -bottom-1 -right-1">
                                                        <CheckCircle className="w-3 h-3 text-green-500 fill-white" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* End of Test Indicator */}
                    <div className="pt-4 pb-2">
                        <div className="flex items-center gap-2">
                            <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">End of Test</span>
                            <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                        </div>
                    </div>
                </div>
            );
        }

        // Default Flat Palette
        return (
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-5 gap-2">
                    {test.questions.map((q, idx) => {
                        const isAnswered = answers[q.id] !== undefined;
                        const isMarked = markedForReview.has(q.id);
                        const isVisited = visited.has(idx);
                        const isCurrent = currentQuestionIndex === idx;

                        let baseClasses = "h-8 w-8 flex items-center justify-center text-xs font-semibold transition-all relative rounded-md border";
                        let colorClasses = "bg-white border-slate-300 text-slate-700 hover:bg-slate-50";

                        // 1. Answered & Marked (Purple Square + Green Dot)
                        if (isAnswered && isMarked) {
                            colorClasses = "bg-purple-600 border-purple-700 text-white shadow-sm hover:bg-purple-700";
                        }
                        // 2. Marked for Review (Purple Square)
                        else if (isMarked) {
                            colorClasses = "bg-purple-600 border-purple-700 text-white shadow-sm hover:bg-purple-700";
                        }
                        // 3. Answered (Green Box)
                        else if (isAnswered) {
                            colorClasses = "bg-green-500 border-green-600 text-white shadow-sm hover:bg-green-600";
                        }
                        // 4. Not Answered (Red Box)
                        else if (isVisited) {
                            colorClasses = "bg-red-500 border-red-600 text-white shadow-sm hover:bg-red-600";
                        }
                        // 5. Not Visited (White Box)
                        else {
                            colorClasses = "bg-white border-slate-300 text-slate-700 hover:bg-slate-50";
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
                                {isAnswered && isMarked && (
                                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full">
                                        <CheckCircle className="w-4 h-4 text-green-500 fill-white" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
                {/* End of Test Indicator */}
                <div className="pt-2 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">End of Test</span>
                        <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                    </div>
                </div>
            </div>
        );
    };
