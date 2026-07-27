import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import {
    Loader2, Clock, HelpCircle, Trophy, BookOpen, AlertTriangle, PlayCircle,
    FileText, CheckCircle, ArrowLeft, Info, RefreshCcw, WifiOff, Monitor,
    HardDrive, UserCheck, ShieldCheck, ArrowRight, CheckCircle2, Lock, Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { fetchTestById, fetchTestBySlug, Test, fetchSolutions } from '@/lib/testsApi';
import { SEO } from '@/components/SEO';
import { fetchFeatureFlags } from '@/lib/featuresApi';
import { toast } from 'sonner';
import { signInWithGoogle } from '@/hooks/useAuthActions';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { runBrowserDiagnosticsAndVacateStorage, SystemCheckResult } from '@/lib/browserCheck';

const formatDateCustom = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
};

const formatTimeCustom = (date: Date) => {
    return date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const TimeBox = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-900 min-w-[60px] md:min-w-[70px] py-1.5 px-1 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-900/50">
        <span className="text-2xl md:text-3xl font-bold bg-gradient-to-b from-indigo-500 to-indigo-700 bg-clip-text text-transparent w-full text-center">
            {String(value).padStart(2, '0')}
        </span>
        <span className="text-[10px] md:text-[11px] tracking-widest uppercase font-semibold text-indigo-500 dark:text-indigo-400 mt-0.5">
            {label}
        </span>
    </div>
);

const CountdownDisplay = ({ targetDate, onComplete }: { targetDate: Date; onComplete: () => void }) => {
    const [timeLeft, setTimeLeft] = useState(targetDate.getTime() - Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            const newTimeLeft = targetDate.getTime() - Date.now();
            setTimeLeft(newTimeLeft);
            if (newTimeLeft <= 0) {
                clearInterval(timer);
                onComplete();
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [targetDate, onComplete]);

    if (timeLeft <= 0) return null;

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
    const seconds = Math.floor((timeLeft / 1000) % 60);

    return (
        <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-br from-indigo-50/80 to-blue-50/50 dark:from-indigo-950/40 dark:to-blue-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 shadow-sm w-full my-2">
            <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 mb-3 tracking-widest uppercase flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 animate-spin" /> Scheduled Exam Starts In
            </p>
            <div className="flex items-center gap-3">
                {days > 0 && <TimeBox value={days} label="Days" />}
                {(hours > 0 || days > 0) && <TimeBox value={hours} label="Hours" />}
                <TimeBox value={minutes} label="Mins" />
                <TimeBox value={seconds} label="Secs" />
            </div>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-4 font-medium px-4 text-center">
                Scheduled for {formatDateCustom(targetDate)} at {formatTimeCustom(targetDate)}
            </p>
        </div>
    );
};

export type ExamFlowStep = 'intro' | 'system_check' | 'start_form' | 'final_instructions';

export default function TestIntroPage() {
    const { id, slug } = useParams<{ id: string; slug: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, loading: authLoading } = useAuth();

    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_AUTO_RETRIES = 2;

    // Step Flow Control
    const [flowStep, setFlowStep] = useState<ExamFlowStep>('intro');

    // System Diagnostics State
    const [diagResult, setDiagResult] = useState<SystemCheckResult | null>(null);
    const [isSystemChecking, setIsSystemChecking] = useState(false);
    const [systemCheckDone, setSystemCheckDone] = useState(false);

    // Logic State
    const [hasAttempted, setHasAttempted] = useState(false);
    const [checklistDiff, setChecklistDiff] = useState(false);
    const [isTimerDisabled, setIsTimerDisabled] = useState(false);
    const [startFormValues, setStartFormValues] = useState<Record<string, string>>({});
    const [schedulingStatus, setSchedulingStatus] = useState<'upcoming' | 'ended' | 'live' | null>(null);
    const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
    const [hasSolutions, setHasSolutions] = useState(false);
    const [isAuthLoading, setIsAuthLoading] = useState(false);
    const [enableAnonymousTests, setEnableAnonymousTests] = useState(false);

    // Permission check
    const checkPermissions = async () => {
        if (!test) return;

        if (test.settings?.schedule?.enabled) {
            const now = new Date();
            const start = test.settings.schedule.start_time ? new Date(test.settings.schedule.start_time) : null;
            const end = test.settings.schedule.end_time ? new Date(test.settings.schedule.end_time) : null;

            if (start && now < start) {
                setSchedulingStatus('upcoming');
                setScheduledDate(start);
            } else if (end && now > end) {
                setSchedulingStatus('ended');
                setScheduledDate(end);
            } else {
                setSchedulingStatus('live');
            }
        } else {
            setSchedulingStatus('live');
        }

        if (!user) return;

        if (test.settings?.attempt_limit === 1) {
            try {
                const { checkUserTestAttempt } = await import('@/lib/attemptsApi');
                const { hasAttempted } = await checkUserTestAttempt(user.id, test.id);
                if (hasAttempted) setHasAttempted(true);
            } catch (err) {
                console.error("Failed to check attempts:", err);
            }
        }
    };

    const loadTestBySlug = async (testSlug: string, attempt: number = 0) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await fetchTestBySlug(testSlug, (cachedData) => {
                setTest(cachedData);
                setLoadingProgress(100);
                setTimeout(() => setLoading(false), 300);
            }, true);
            if (error) throw error;
            if (data) {
                setTest(data);
                setLoadingProgress(100);
                setTimeout(() => setLoading(false), 300);
            }
        } catch (err: any) {
            const is404 = err?.response?.status === 404 || err?.message === 'Test not found';
            if (!is404 && attempt < MAX_AUTO_RETRIES) {
                setRetryCount(attempt + 1);
                await new Promise(r => setTimeout(r, 2000));
                return loadTestBySlug(testSlug, attempt + 1);
            }
            setError(err.message || "Failed to load test details.");
        } finally {
            setLoading(false);
        }
    };

    const loadTestById = async (testId: string, attempt: number = 0) => {
        setLoading(true);
        setError(null);
        try {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testId);
            let data, error;

            if (isUUID) {
                const res = await fetchTestById(testId, (cachedData) => {
                    setTest(cachedData);
                    setLoadingProgress(100);
                    setTimeout(() => setLoading(false), 300);
                }, true);
                data = res.data;
                error = res.error;
            } else {
                const { fetchTestByCustomId } = await import('@/lib/testsApi');
                const res = await fetchTestByCustomId(testId, (cachedData) => {
                    setTest(cachedData);
                    setLoadingProgress(100);
                    setTimeout(() => setLoading(false), 300);
                }, true);
                data = res.data;
                error = res.error;
            }

            if (error) throw error;
            if (!data) throw new Error("Test not found");

            if (data.slug) {
                navigate(`/test/${data.slug}`, { replace: true });
                return;
            }

            setTest(data);
        } catch (err: any) {
            const is404 = err?.response?.status === 404 || err?.message === 'Test not found';
            if (!is404 && attempt < MAX_AUTO_RETRIES) {
                setRetryCount(attempt + 1);
                await new Promise(r => setTimeout(r, 2000));
                return loadTestById(testId, attempt + 1);
            }
            setError(err.message || "Failed to load test details.");
        } finally {
            setLoading(false);
        }
    };

    const handleReload = () => {
        if (slug) {
            loadTestBySlug(slug);
        } else if (id) {
            loadTestById(id);
        } else {
            window.location.reload();
        }
    };

    useEffect(() => {
        fetchFeatureFlags().then(flags => setEnableAnonymousTests(flags.enable_anonymous_tests));
    }, []);

    useEffect(() => {
        if (slug) {
            loadTestBySlug(slug);
        } else if (id) {
            loadTestById(id);
        }
    }, [id, slug]);

    useEffect(() => {
        if (test) {
            checkPermissions();
            const checkSolutions = async () => {
                try {
                    const { data } = await fetchSolutions(test.id);
                    if (data && data.has_solutions) {
                        setHasSolutions(true);
                    }
                } catch (err) {
                    console.error("Error checking solutions:", err);
                }
            };
            checkSolutions();
        }
    }, [test, user]);

    useEffect(() => {
        if (!loading) {
            setLoadingProgress(100);
            return;
        }

        const interval = setInterval(() => {
            setLoadingProgress(prev => {
                if (prev >= 95) {
                    clearInterval(interval);
                    return 95;
                }
                const inc = Math.random() * 5 + 2;
                return Math.min(95, prev + inc);
            });
        }, 400);

        return () => clearInterval(interval);
    }, [loading]);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP NAVIGATION HANDLERS
    // ─────────────────────────────────────────────────────────────────────────

    // Step 1 -> Step 2: System Compatibility & Storage Check
    const handleStartFlow = () => {
        if (hasAttempted || schedulingStatus === 'ended') return;
        setFlowStep('system_check');
        runSystemDiagnostics();
    };

    // Step 2 Logic: Diagnostics & Storage Vacate
    const runSystemDiagnostics = () => {
        setIsSystemChecking(true);
        setSystemCheckDone(false);

        setTimeout(() => {
            const diag = runBrowserDiagnosticsAndVacateStorage();
            setDiagResult(diag);
            setIsSystemChecking(false);
            setSystemCheckDone(true);

            // Auto-continue to Step 3 if user is already authenticated
            if (user) {
                setTimeout(() => {
                    advanceToNextStepAfterSystemCheck();
                }, 1200);
            }
        }, 600);
    };

    // Auto-advance after system check & auth resolution
    const advanceToNextStepAfterSystemCheck = () => {
        if (test?.settings?.start_form?.enabled) {
            setFlowStep('start_form');
        } else {
            setFlowStep('final_instructions');
        }
    };

    const handleGoogleLogin = async () => {
        setIsAuthLoading(true);
        try {
            localStorage.setItem('auth_redirect_intent', location.pathname);
            const { error } = await signInWithGoogle();
            if (error) throw error;
        } catch (error: any) {
            toast.error(error.message || 'Google login failed');
            setIsAuthLoading(false);
        }
    };

    const handleAnonymousContinue = () => {
        advanceToNextStepAfterSystemCheck();
    };

    // Step 3 -> Step 4: Validate Start Form
    const handleStartFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!test) return;

        if (test.settings?.start_form?.enabled) {
            const fields = test.settings.start_form.fields && test.settings.start_form.fields.length > 0
                ? test.settings.start_form.fields
                : [{ label: 'Name', required: true }];
            const missing = fields.filter((f: any) => f.required && !startFormValues[f.label]);
            if (missing.length > 0) {
                toast.error(`Please fill all required fields: ${missing.map((f: any) => f.label).join(', ')}`);
                return;
            }
            sessionStorage.setItem(`start_form_${test.id}`, JSON.stringify(startFormValues));
        }

        setFlowStep('final_instructions');
    };

    // Step 4: Final Start Exam
    const handleFinalStartTest = async (enableFullScreen: boolean) => {
        if (!test) return;

        sessionStorage.setItem(`flexible_timer_${test.id}`, String(isTimerDisabled));

        try {
            const { registerTestStart } = await import('@/lib/attemptsApi');
            await registerTestStart(user?.id || null, test.id);
        } catch (err) {
            console.error("Error registering start:", err);
        }

        if (enableFullScreen || test.settings?.force_fullscreen) {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch((err) => {
                    console.log("Fullscreen request denied:", err);
                });
            }
        }

        navigate(`/live/${test.slug || test.custom_id || test.id}`, { state: { fromIntro: true } });
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER LOADING & ERROR STATES
    // ─────────────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50 dark:bg-slate-950 p-6">
                <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl mb-2">
                            <BookOpen className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            Fetching Test Details
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Almost there! We're gathering everything you need.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <Progress value={loadingProgress} className="h-2 bg-indigo-100 dark:bg-indigo-950" />
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-indigo-500">
                            <span className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></div>
                                {retryCount > 0 ? `Retrying (${retryCount}/${MAX_AUTO_RETRIES})...` : 'Loading Data'}
                            </span>
                            <span>{Math.round(loadingProgress)}%</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50 dark:bg-slate-950 p-6">
                <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none animate-in zoom-in duration-300">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="h-20 w-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                            <WifiOff className="h-10 w-10 text-red-500 dark:text-red-400" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Connection Error</h2>
                            <p className="text-slate-500 dark:text-slate-400">
                                {error === "Test not found"
                                    ? "We couldn't find the test you're looking for. It might have been removed or the link is incorrect."
                                    : "We're having trouble reaching our servers. Please check your connection and try again."}
                            </p>
                        </div>
                        <div className="w-full flex flex-col gap-3">
                            <Button onClick={handleReload} className="w-full py-6 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl">
                                <RefreshCcw className="mr-2 h-5 w-5" /> Try Again
                            </Button>
                            <Button variant="outline" onClick={() => navigate('/')} className="w-full py-6 text-lg font-semibold rounded-2xl">
                                <ArrowLeft className="mr-2 h-5 w-5" /> Back to Home
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!test) return <div className="flex justify-center items-center h-screen">Test not found.</div>;

    // Visibility Guards
    const testVisibility = test.visibility || (test.is_public ? 'public' : 'private');
    const isConductExam = !!(test.settings?.conduct_exam?.enabled);
    const isCreatorViewing = user?.id === test.created_by;
    const isUUIDRoute = location.pathname.startsWith('/test-intro/');

    if (isUUIDRoute && (testVisibility === 'private' || isConductExam)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50 dark:bg-slate-950 p-6">
                <div className="w-full max-w-md bg-white dark:bg-slate-900 border rounded-3xl p-8 text-center space-y-6">
                    <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
                    <h2 className="text-2xl font-bold">Test Not Available</h2>
                    <p className="text-slate-500 text-sm">This test is private or in conduct mode, and cannot be accessed via this link.</p>
                    <Button onClick={() => navigate('/')} className="w-full"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Button>
                </div>
            </div>
        );
    }

    if (testVisibility === 'private' && !isCreatorViewing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50 dark:bg-slate-950 p-6">
                <div className="w-full max-w-md bg-white dark:bg-slate-900 border rounded-3xl p-8 text-center space-y-6">
                    <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto" />
                    <h2 className="text-2xl font-bold">Test Private</h2>
                    <p className="text-slate-500 text-sm">This test is private and not available for public access.</p>
                    <Button onClick={() => navigate('/')} className="w-full"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Button>
                </div>
            </div>
        );
    }

    const questionCount = test.total_questions !== undefined ? test.total_questions : (test.questions?.length || 0);

    const getSectionDetails = (sec: any) => {
        const totalQs = sec.questions?.length !== undefined ? sec.questions.length : (sec.total_questions || 0);
        const attemptControl = sec.attempt_control;
        const isEnabled = attemptControl && (attemptControl.enabled !== false);
        const maxAllowed = isEnabled && attemptControl.max_attempts ? Math.min(attemptControl.max_attempts, totalQs) : totalQs;

        let sectionMaxMarks = 0;
        if (test.computed_max_marks?.section_max_marks && test.computed_max_marks.section_max_marks[sec.id] !== undefined) {
            sectionMaxMarks = test.computed_max_marks.section_max_marks[sec.id];
        } else if (sec.questions && sec.questions.length > 0) {
            const marksList = sec.questions.map((q: any) => {
                const m = q.marks !== undefined ? parseFloat(String(q.marks)) : (sec.marks_per_question ? parseFloat(String(sec.marks_per_question)) : 4);
                return isNaN(m) ? 0 : m;
            });
            if (isEnabled && attemptControl.max_attempts && attemptControl.max_attempts < totalQs) {
                marksList.sort((a, b) => b - a);
                sectionMaxMarks = marksList.slice(0, attemptControl.max_attempts).reduce((a, b) => a + b, 0);
            } else {
                sectionMaxMarks = marksList.reduce((a, b) => a + b, 0);
            }
        } else {
            const marksPerQ = parseFloat(String(sec.marks_per_question || test.marks_per_question || 4)) || 4;
            sectionMaxMarks = maxAllowed * marksPerQ;
        }
        return { totalQs, maxAllowed, sectionMaxMarks, isEnabled };
    };

    const hasAnyAttemptControl = test.enable_section_mode && test.sections?.some((s: any) => s.attempt_control && (s.attempt_control.enabled !== false));

    let totalMaxMarks = 0;
    if (test.total_max_marks !== undefined && test.total_max_marks !== 0) {
        totalMaxMarks = test.total_max_marks;
    } else if (test.computed_max_marks?.total_max_marks !== undefined && test.computed_max_marks.total_max_marks !== 0) {
        totalMaxMarks = test.computed_max_marks.total_max_marks;
    } else if (test.enable_section_mode && test.sections) {
        totalMaxMarks = test.sections.reduce((acc, sec) => acc + getSectionDetails(sec).sectionMaxMarks, 0);
    } else if (test.questions && test.questions.length > 0) {
        test.questions.forEach((q: any) => {
            const m = q.marks !== undefined ? parseFloat(String(q.marks)) : (test.marks_per_question ? parseFloat(String(test.marks_per_question)) : 4);
            totalMaxMarks += isNaN(m) ? 0 : m;
        });
    } else {
        const marksPerQ = parseFloat(String(test.marks_per_question || 4)) || 4;
        totalMaxMarks = questionCount * marksPerQ;
    }

    const totalAllowedQuestions = test.enable_section_mode && test.sections
        ? test.sections.reduce((acc, sec) => acc + getSectionDetails(sec).maxAllowed, 0)
        : questionCount;

    const hasStartForm = Boolean(test.settings?.start_form?.enabled);

    return (
        <div className="container mx-auto max-w-3xl py-4 px-4 space-y-4 relative">
            <SEO
                title={test.title}
                description={test.description || `${test.title} - Free Online Mock Test with ${test.questions?.length || 0} questions. Start practicing now on TestoZa.`}
                image={test.og_image}
                url={`${window.location.origin}${test.slug ? `/test/${test.slug}` : `/test-intro/${test.id}`}`}
            />

            <Button
                variant="ghost"
                className="fixed top-20 left-0 h-10 w-12 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-none rounded-r-lg shadow-md z-50 transition-transform hover:translate-x-1"
                onClick={() => {
                    if (flowStep === 'intro') navigate(-1);
                    else if (flowStep === 'system_check') setFlowStep('intro');
                    else if (flowStep === 'start_form') setFlowStep('system_check');
                    else if (flowStep === 'final_instructions') setFlowStep(hasStartForm ? 'start_form' : 'system_check');
                }}
            >
                <ArrowLeft className="h-6 w-6" />
            </Button>

            {/* Stepper Header */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <div className={`flex items-center gap-1.5 ${flowStep === 'intro' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${flowStep === 'intro' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>1</span>
                    Overview
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

                <div className={`flex items-center gap-1.5 ${flowStep === 'system_check' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${flowStep === 'system_check' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>2</span>
                    Verification
                </div>

                {hasStartForm && (
                    <>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <div className={`flex items-center gap-1.5 ${flowStep === 'start_form' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${flowStep === 'start_form' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>3</span>
                            Candidate Form
                        </div>
                    </>
                )}

                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <div className={`flex items-center gap-1.5 ${flowStep === 'final_instructions' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${flowStep === 'final_instructions' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>
                        {hasStartForm ? '4' : '3'}
                    </span>
                    Start Exam
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* STEP 1: TEST OVERVIEW PAGE                                      */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {flowStep === 'intro' && (
                <Card className="border-t-4 border-t-primary shadow-lg relative">
                    <CardHeader className="text-center pb-2 pt-6 p-4">
                        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">{test.title}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                            {test.description || "No description provided."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 pt-0">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-3 bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                            <div className="flex flex-col items-center justify-center text-center">
                                <HelpCircle className="h-6 w-6 text-blue-500 mb-2" />
                                <span className="text-sm text-muted-foreground">Questions</span>
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-lg">{questionCount}</span>
                                    {totalAllowedQuestions < questionCount && (
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded-full border border-blue-100">
                                            Attempt: {totalAllowedQuestions}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center">
                                <Clock className="h-6 w-6 text-orange-500 mb-2" />
                                <span className="text-sm text-muted-foreground">Duration</span>
                                <span className="font-bold text-lg">{test.duration || "N/A"} mins</span>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center">
                                <Trophy className="h-6 w-6 text-emerald-600 mb-2" />
                                <span className="text-sm text-muted-foreground">Total Marks</span>
                                <span className="font-bold text-lg">{totalMaxMarks}</span>
                            </div>

                            {hasSolutions && (
                                <div className="flex flex-col items-center justify-center text-center">
                                    <CheckCircle className="h-6 w-6 text-indigo-600 mb-2 animate-pulse" />
                                    <span className="text-sm text-muted-foreground">Detailed</span>
                                    <span className="font-bold text-sm text-indigo-700">Solutions</span>
                                </div>
                            )}

                            {test.enable_section_mode && (
                                <div className="flex flex-col items-center justify-center text-center col-span-2 md:col-span-2 bg-white dark:bg-slate-800 rounded border border-dashed">
                                    <BookOpen className="h-6 w-6 text-purple-500 mb-1" />
                                    <span className="text-sm font-medium">Section-wise {hasAnyAttemptControl ? "& Attempt Control" : "Pattern"}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {test.sections?.length || 0} Sections
                                        {hasAnyAttemptControl && " • Limits Applied"}
                                    </span>
                                </div>
                            )}
                        </div>

                        {test.enable_section_mode && test.sections && test.sections.length > 0 && (
                            <div className="border rounded-md overflow-hidden my-4">
                                <table className="w-full text-sm text-left bg-white dark:bg-slate-950">
                                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="p-3">Section</th>
                                            <th className="p-3 text-center">Qs</th>
                                            <th className="p-3 text-center">Total Marks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-slate-800">
                                        {test.sections.map((sec: any) => {
                                            const { totalQs, maxAllowed, sectionMaxMarks, isEnabled } = getSectionDetails(sec);
                                            return (
                                                <tr key={sec.id} className={isEnabled ? "bg-indigo-50/30" : ""}>
                                                    <td className="p-3 font-medium">
                                                        {sec.name}
                                                        {isEnabled && (
                                                            <Badge variant="outline" className="ml-2 text-[9px] h-4 px-1 bg-indigo-100 text-indigo-700 border-indigo-200">
                                                                Limit
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className={isEnabled ? "text-slate-400 text-xs line-through" : ""}>{totalQs}</span>
                                                            {isEnabled && (
                                                                <span className="text-indigo-600 font-bold">
                                                                    {maxAllowed}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">{sectionMaxMarks}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {test.revision_notes && (
                            <div className="mt-4 border rounded-md">
                                <details className="group">
                                    <summary className="cursor-pointer p-4 bg-muted/30 hover:bg-muted/50 font-medium flex items-center justify-center select-none">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            View Test Summary & Syllabus
                                        </div>
                                        <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform ml-2">▼</span>
                                    </summary>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-950/30 border-t max-h-[500px] overflow-y-auto">
                                        <article
                                            className="prose prose-sm dark:prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: test.revision_notes }}
                                        />
                                    </div>
                                </details>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="pt-0 pb-4 px-4 flex flex-col gap-3">
                        {schedulingStatus === 'ended' && scheduledDate ? (
                            <div className="w-full p-4 bg-red-50 text-red-800 rounded-xl text-center font-medium border border-red-100 shadow-sm">
                                This test ended on {formatDateCustom(scheduledDate)}
                            </div>
                        ) : hasAttempted ? (
                            <div className="w-full p-4 bg-amber-50 text-amber-800 rounded-xl text-center font-medium border border-amber-100 shadow-sm">
                                You have already attempted this test.
                            </div>
                        ) : (
                            <Button size="lg" className="w-full text-lg h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md" onClick={handleStartFlow}>
                                Continue <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* STEP 2: BROWSER COMPATIBILITY & STORAGE CHECK & AUTH            */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {flowStep === 'system_check' && (
                <Card className="border-t-4 border-t-indigo-600 shadow-xl animate-in zoom-in-95 duration-200">
                    <CardHeader className="text-center pb-3">
                        <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center mb-2">
                            <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <CardTitle className="text-xl font-bold">System Diagnostics & Authentication</CardTitle>
                        <CardDescription className="text-xs">
                            Verifying browser compatibility, clearing storage cache, and checking login session.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isSystemChecking ? (
                            <div className="flex flex-col items-center justify-center py-8 space-y-3">
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Running diagnostic checks & freeing storage...</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Browser Compatibility Card */}
                                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-start gap-3">
                                    <Monitor className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                                    <div className="flex-1 text-xs">
                                        <p className="font-bold text-slate-800 dark:text-slate-200">Browser Compatibility</p>
                                        <p className="text-slate-500 mt-0.5">
                                            {diagResult?.browserName || 'Web Browser'} • {diagResult?.fullscreenSupported ? 'Fullscreen Supported' : 'Standard View'}
                                        </p>
                                    </div>
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                </div>

                                {/* Storage Check & Vacate Card */}
                                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-start gap-3">
                                    <HardDrive className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                                    <div className="flex-1 text-xs">
                                        <p className="font-bold text-slate-800 dark:text-slate-200">Browser Storage Check</p>
                                        <p className="text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                                            Vacated stale exam cache ({diagResult?.freedStorageKB || 0} KB freed). Storage optimized for live exam.
                                        </p>
                                    </div>
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                </div>

                                {/* Authentication Status Card */}
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
                                    <div className="flex items-center gap-2 mb-2">
                                        <UserCheck className="w-5 h-5 text-indigo-600" />
                                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">User Identity & Authentication</p>
                                    </div>

                                    {user ? (
                                        <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-lg">
                                            <div className="text-xs">
                                                <p className="font-semibold text-emerald-900 dark:text-emerald-300">Logged in as {user.email}</p>
                                                <p className="text-emerald-700 dark:text-emerald-400 text-[11px]">Identity verified. Auto-continuing...</p>
                                            </div>
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                        </div>
                                    ) : (
                                        <div className="space-y-3 pt-1">
                                            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
                                                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                                <p>You are not logged in. Login to save your progress, analysis, and certificate history.</p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <GoogleSignInButton
                                                    onClick={handleGoogleLogin}
                                                    isLoading={isAuthLoading}
                                                    text="Continue with Google"
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => navigate('/login', { state: { from: location.pathname } })}>
                                                        Login
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => navigate('/login', { state: { isSignup: true, from: location.pathname } })}>
                                                        Create Account
                                                    </Button>
                                                </div>
                                                {enableAnonymousTests && (
                                                    <Button variant="ghost" size="sm" className="text-slate-500 text-xs mt-1" onClick={handleAnonymousContinue}>
                                                        Continue Anonymously →
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                    {systemCheckDone && user && (
                        <CardFooter className="pt-0">
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={advanceToNextStepAfterSystemCheck}>
                                Auto-Continuing <ArrowRight className="ml-2 w-4 h-4 animate-pulse" />
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* STEP 3: CANDIDATE START FORM (if implemented by creator)         */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {flowStep === 'start_form' && (
                <Card className="border-t-4 border-t-indigo-600 shadow-xl animate-in zoom-in-95 duration-200">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-xl font-bold">Candidate Information</CardTitle>
                        <CardDescription className="text-xs">
                            The creator of this test requires you to fill out your details before starting.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleStartFormSubmit}>
                        <CardContent className="space-y-4 pt-2">
                            {(() => {
                                const fields = test.settings?.start_form?.fields && test.settings.start_form.fields.length > 0
                                    ? test.settings.start_form.fields
                                    : [{ label: 'Name', required: true }];
                                return fields.map((field: any, idx: number) => (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <label>{field.label}</label>
                                            {field.required && <span className="text-red-500">* Required</span>}
                                        </div>
                                        <input
                                            className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            placeholder={`Enter your ${field.label.toLowerCase()}`}
                                            value={startFormValues[field.label] || ''}
                                            onChange={(e) => setStartFormValues(prev => ({ ...prev, [field.label]: e.target.value }))}
                                            required={field.required}
                                        />
                                    </div>
                                ));
                            })()}
                        </CardContent>
                        <CardFooter className="pt-2">
                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11 rounded-xl">
                                Next: Final Instructions <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* STEP 4: FINAL INSTRUCTIONS & TIMER (IF APPLIED) & START BUTTON   */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {flowStep === 'final_instructions' && (
                <Card className="border-t-4 border-t-emerald-600 shadow-xl animate-in zoom-in-95 duration-200">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" /> Final Instructions & Checklist
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Please review rules and accept the pre-exam checklist to activate the Start Test button.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Rules Summary */}
                        <div className="space-y-3 border p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-2 font-semibold text-sm">
                                <FileText className="h-4 w-4 text-indigo-600" />
                                <span>Exam Parameters</span>
                            </div>
                            <Separator />
                            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                                <li>Total duration: <strong>{test.duration} minutes</strong>. Once started, timer cannot be paused.</li>
                                <li>Total questions: <strong>{questionCount}</strong> • Total marks: <strong>{totalMaxMarks}</strong></li>
                                {test.settings?.tab_switch_mode === 'strict' && (
                                    <li className="text-red-600 font-medium">Tab Switching: Strictly prohibited. Switching tabs auto-submits.</li>
                                )}
                                {test.settings?.force_fullscreen && (
                                    <li className="text-amber-600 font-medium">Full Screen: Required. Exiting full screen submits exam.</li>
                                )}
                            </ul>
                        </div>

                        {/* Pre-Exam Checklist Checkbox */}
                        <div className="space-y-3">
                            <label className="flex items-start gap-3 p-3.5 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                                    checked={checklistDiff}
                                    onChange={(e) => setChecklistDiff(e.target.checked)}
                                />
                                <span className="text-xs text-slate-800 dark:text-slate-200 leading-tight">
                                    I have closed all other tabs and applications. I confirm that I am ready to take the exam without distraction.
                                </span>
                            </label>

                            {test.settings?.allow_flexible_timer !== false && (
                                <div className="flex items-center gap-3 p-3 border rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/40">
                                    <Switch
                                        id="flexible-timer"
                                        checked={isTimerDisabled}
                                        onCheckedChange={setIsTimerDisabled}
                                    />
                                    <label htmlFor="flexible-timer" className="text-xs text-slate-800 dark:text-slate-200 cursor-pointer leading-tight">
                                        <strong>Flexible Timer:</strong> Take this test without a strict time limit.
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Scheduled Countdown Timer (if applied by creator) */}
                        {schedulingStatus === 'upcoming' && scheduledDate && (
                            <CountdownDisplay
                                targetDate={scheduledDate}
                                onComplete={() => setSchedulingStatus('live')}
                            />
                        )}
                    </CardContent>
                    <CardFooter className="pt-2 pb-5">
                        {schedulingStatus === 'upcoming' ? (
                            <Button disabled size="lg" className="w-full text-base h-12 rounded-xl opacity-70">
                                <Lock className="mr-2 w-4 h-4" /> Waiting for Scheduled Start Time...
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                className={`w-full text-lg h-12 font-bold rounded-xl shadow-lg transition-all ${
                                    !checklistDiff
                                        ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 dark:shadow-none hover:scale-[1.01]'
                                }`}
                                disabled={!checklistDiff}
                                onClick={() => handleFinalStartTest(true)}
                            >
                                <PlayCircle className="mr-2 h-6 w-6" /> Start Test Now
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
