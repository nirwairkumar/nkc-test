import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import {
    Clock, HelpCircle, Trophy, BookOpen, AlertTriangle, PlayCircle,
    FileText, CheckCircle, ArrowLeft, RefreshCcw, WifiOff,
    UserCheck, ShieldCheck, Lock, Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { fetchTestById, fetchTestBySlug, Test, fetchSolutions } from '@/lib/testsApi';
import { SEO } from '@/components/SEO';
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

export type ExamFlowStep = 'intro' | 'waiting_room';

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

    // Step Flow Control (Simplified: 'intro' or 'waiting_room')
    const [flowStep, setFlowStep] = useState<ExamFlowStep>('intro');

    // System Diagnostics State (Run silently in background)
    const [diagResult, setDiagResult] = useState<SystemCheckResult | null>(null);

    // Logic State
    const [hasAttempted, setHasAttempted] = useState(false);
    const [checklistDiff, setChecklistDiff] = useState(true); // Default checked for 1-click start
    const [isTimerDisabled, setIsTimerDisabled] = useState(false);
    const [startFormValues, setStartFormValues] = useState<Record<string, string>>({});
    const [schedulingStatus, setSchedulingStatus] = useState<'upcoming' | 'ended' | 'live' | null>(null);
    const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
    const [hasSolutions, setHasSolutions] = useState(false);
    const [isAuthLoading, setIsAuthLoading] = useState(false);

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

    // Run silent diagnostics & storage vacate in background
    useEffect(() => {
        try {
            const diag = runBrowserDiagnosticsAndVacateStorage();
            setDiagResult(diag);
        } catch (e) {
            console.warn("Storage vacate silent run:", e);
        }
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

    // ─────────────────────────────────────────────────────────────────────────
    // 1-STEP START TEST HANDLER
    // ─────────────────────────────────────────────────────────────────────────
    const handleStartFlow = () => {
        if (!test) return;
        if (hasAttempted || schedulingStatus === 'ended') return;

        // 1. Check Login Requirement if enabled by Creator
        if (test.settings?.login_required && !user) {
            toast.error("Login Required: The creator has required authentication to take this exam.");
            return;
        }

        // 2. Validate Candidate Start Form (if enabled)
        if (test.settings?.start_form?.enabled) {
            const fields = test.settings.start_form.fields && test.settings.start_form.fields.length > 0
                ? test.settings.start_form.fields
                : [{ label: 'Name', required: true }];
            const missing = fields.filter((f: any) => f.required && !startFormValues[f.label]?.trim());
            if (missing.length > 0) {
                toast.error(`Please fill required candidate information: ${missing.map((f: any) => f.label).join(', ')}`);
                return;
            }
            sessionStorage.setItem(`start_form_${test.id}`, JSON.stringify(startFormValues));
        }

        // 3. If Scheduled in Future: Enter Waiting Room with live countdown
        if (test.settings?.schedule?.enabled && scheduledDate && new Date() < scheduledDate) {
            setFlowStep('waiting_room');
            return;
        }

        // 4. Launch Live Test
        handleFinalStartTest(true);
    };

    // Final Exam Launch
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

    const isLoginRequired = Boolean(test.settings?.login_required);
    const isLoginGateActive = isLoginRequired && !user;

    return (
        <div className="container mx-auto max-w-3xl py-4 px-4 space-y-4 relative font-sans">
            <SEO
                title={test.title}
                description={test.description || `${test.title} - Free Online Mock Test with ${test.questions?.length || 0} questions. Start practicing now on TestoZa.`}
                image={test.og_image}
                url={`${window.location.origin}${test.slug ? `/test/${test.slug}` : `/test-intro/${test.id}`}`}
            />

            {/* Structured Quiz Schema for Search Engines */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Quiz",
                        "name": test.title,
                        "description": test.description || `${test.title} - Educational online practice test with ${questionCount} questions.`,
                        "educationalUse": "Assessment",
                        "learningResourceType": "Quiz",
                        "timeRequired": `PT${test.duration || 60}M`,
                        "provider": {
                            "@type": "Organization",
                            "name": "TestoZa Educational Systems",
                            "url": "https://testoza.com"
                        },
                        "isAccessibleForFree": true,
                        "hasPart": (test.questions || []).slice(0, 3).map((q: any, i: number) => ({
                            "@type": "Question",
                            "name": `Question ${i + 1}`,
                            "text": typeof q.question_text === 'string' ? q.question_text.replace(/<[^>]*>?/gm, '') : `Practice Question ${i + 1}`
                        }))
                    })
                }}
            />

            {/* Back Button */}
            <Button
                variant="ghost"
                className="fixed top-20 left-0 h-10 w-12 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-none rounded-r-lg shadow-md z-50 transition-transform hover:translate-x-1"
                onClick={() => {
                    if (flowStep === 'waiting_room') {
                        setFlowStep('intro');
                    } else {
                        navigate(-1);
                    }
                }}
            >
                <ArrowLeft className="h-6 w-6" />
            </Button>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* VIEW A: DEDICATED PRE-EXAM WAITING ROOM (FOR SCHEDULED EXAMS)   */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {flowStep === 'waiting_room' && scheduledDate && (
                <Card className="border-t-4 border-t-indigo-600 shadow-2xl overflow-hidden rounded-3xl animate-in zoom-in-95 duration-200 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardHeader className="text-center pb-2 pt-8 px-6">
                        <div className="inline-flex items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-950/60 rounded-3xl mb-3 shadow-inner border border-indigo-100 dark:border-indigo-900/50">
                            <Clock className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mx-auto mb-2 border border-indigo-200 dark:border-indigo-800/60">
                            <span>Exam Waiting Room</span>
                        </div>
                        <CardTitle className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {test.title}
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm mt-1 max-w-md mx-auto text-slate-500 dark:text-slate-400">
                            You have arrived early. Please keep this screen open. Your test will automatically load when the countdown reaches zero.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6 p-6">
                        {/* Large Interactive Countdown Timer */}
                        <div className="py-2">
                            <CountdownDisplay
                                targetDate={scheduledDate}
                                onComplete={() => {
                                    setSchedulingStatus('live');
                                    toast.success("Exam start time reached! Loading test...");
                                    setTimeout(() => {
                                        handleFinalStartTest(true);
                                    }, 400);
                                }}
                            />
                        </div>

                        {/* Live Sync Status Alert */}
                        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3 text-xs text-indigo-900 dark:text-indigo-300">
                            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Auto-Launch Synchronized</p>
                                <p className="text-indigo-700/80 dark:text-indigo-400/80 mt-0.5">
                                    No need to refresh the page. The question paper will appear immediately at {formatTimeCustom(scheduledDate)}.
                                </p>
                            </div>
                        </div>

                        {/* Candidate Identity Summary if filled */}
                        {test.settings?.start_form?.enabled && Object.keys(startFormValues).length > 0 && (
                            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                                <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Candidate Profile Confirmed:</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600 dark:text-slate-400">
                                    {Object.entries(startFormValues).map(([k, v]) => (
                                        <span key={k}><strong>{k}:</strong> {v}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="flex flex-col sm:flex-row gap-3 pt-0 pb-8 px-6">
                        <Button
                            variant="outline"
                            className="w-full rounded-xl py-6 font-semibold border-slate-200 dark:border-slate-700"
                            onClick={() => setFlowStep('intro')}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Test Overview
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* VIEW B: UNIFIED 1-STEP TEST INTRO CARD                          */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {flowStep === 'intro' && (
                <Card className="border-t-4 border-t-indigo-600 shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 relative animate-in fade-in duration-300">
                    <CardHeader className="text-center pb-2 pt-6 p-4 sm:p-6">
                        <CardTitle className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {test.title}
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm mt-1 text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                            {test.description || "Review test parameters and start your assessment."}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-5 p-4 sm:p-6 pt-0">
                        {/* KPI Metrics Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3 py-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
                            <div className="flex flex-col items-center justify-center text-center p-2">
                                <HelpCircle className="h-5 w-5 text-indigo-500 mb-1" />
                                <span className="text-xs text-muted-foreground">Questions</span>
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">{questionCount}</span>
                                    {totalAllowedQuestions < questionCount && (
                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 rounded-full border border-indigo-100">
                                            Attempt: {totalAllowedQuestions}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center p-2">
                                <Clock className="h-5 w-5 text-orange-500 mb-1" />
                                <span className="text-xs text-muted-foreground">Duration</span>
                                <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">{test.duration || "N/A"} mins</span>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center p-2">
                                <Trophy className="h-5 w-5 text-emerald-600 mb-1" />
                                <span className="text-xs text-muted-foreground">Total Marks</span>
                                <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">{totalMaxMarks}</span>
                            </div>

                            {hasSolutions ? (
                                <div className="flex flex-col items-center justify-center text-center p-2">
                                    <CheckCircle className="h-5 w-5 text-indigo-600 mb-1" />
                                    <span className="text-xs text-muted-foreground">Answer Key</span>
                                    <span className="font-bold text-xs sm:text-sm text-indigo-700 dark:text-indigo-400">Detailed Sol.</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center p-2">
                                    <ShieldCheck className="h-5 w-5 text-purple-600 mb-1" />
                                    <span className="text-xs text-muted-foreground">Proctoring</span>
                                    <span className="font-bold text-xs sm:text-sm text-purple-700 dark:text-purple-400">
                                        {test.settings?.tab_switch_mode === 'strict' ? 'Strict' : 'Standard'}
                                    </span>
                                </div>
                            )}

                            {test.enable_section_mode && (
                                <div className="flex flex-col items-center justify-center text-center col-span-2 sm:col-span-3 md:col-span-4 bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
                                    <div className="flex items-center gap-1.5">
                                        <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            Section-wise Pattern {hasAnyAttemptControl ? "(Attempt Limits Apply)" : ""}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground mt-0.5">
                                        {test.sections?.length || 0} Sections configured for this assessment
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Section Table (if enabled) */}
                        {test.enable_section_mode && test.sections && test.sections.length > 0 && (
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                                <table className="w-full text-xs text-left bg-white dark:bg-slate-950">
                                    <thead className="bg-slate-100/80 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px]">
                                        <tr>
                                            <th className="p-2.5 sm:p-3">Section</th>
                                            <th className="p-2.5 sm:p-3 text-center">Questions</th>
                                            <th className="p-2.5 sm:p-3 text-center">Total Marks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {test.sections.map((sec: any) => {
                                            const { totalQs, maxAllowed, sectionMaxMarks, isEnabled } = getSectionDetails(sec);
                                            return (
                                                <tr key={sec.id} className={isEnabled ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""}>
                                                    <td className="p-2.5 sm:p-3 font-medium">
                                                        {sec.name}
                                                        {isEnabled && (
                                                            <Badge variant="outline" className="ml-2 text-[9px] h-4 px-1 bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300">
                                                                Limit
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 sm:p-3 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className={isEnabled ? "text-slate-400 text-xs line-through" : ""}>{totalQs}</span>
                                                            {isEnabled && (
                                                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                                                    {maxAllowed}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-2.5 sm:p-3 text-center text-emerald-600 font-bold">{sectionMaxMarks}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Syllabus & Notes Accordion (if present) */}
                        {test.revision_notes && (
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                                <details className="group">
                                    <summary className="cursor-pointer p-3.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs flex items-center justify-between select-none transition-colors">
                                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                            <FileText className="h-4 w-4 text-indigo-600" />
                                            View Test Syllabus & Study Notes
                                        </div>
                                        <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                                    </summary>
                                    <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 max-h-[350px] overflow-y-auto">
                                        <article
                                            className="prose prose-sm dark:prose-invert max-w-none text-xs"
                                            dangerouslySetInnerHTML={{ __html: test.revision_notes }}
                                        />
                                    </div>
                                </details>
                            </div>
                        )}

                        {/* Candidate Information Form (if enabled by Creator in Test Settings) */}
                        {test.settings?.start_form?.enabled && (
                            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-indigo-950 dark:text-indigo-300">
                                    <UserCheck className="w-4 h-4 text-indigo-600" />
                                    <span>Candidate Details</span>
                                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                                        Required
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(() => {
                                        const fields = test.settings?.start_form?.fields && test.settings.start_form.fields.length > 0
                                            ? test.settings.start_form.fields
                                            : [{ label: 'Name', required: true }];
                                        return fields.map((field: any, idx: number) => (
                                            <div key={idx} className="space-y-1">
                                                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                                    <span>{field.label}</span>
                                                    {field.required && <span className="text-red-500 font-bold">*</span>}
                                                </label>
                                                <input
                                                    className="flex h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs shadow-2xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                                    placeholder={`Enter your ${field.label.toLowerCase()}`}
                                                    value={startFormValues[field.label] || ''}
                                                    onChange={(e) => setStartFormValues(prev => ({ ...prev, [field.label]: e.target.value }))}
                                                    required={field.required}
                                                />
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* Pre-Exam Rules & Checklist */}
                        <div className="space-y-3 pt-1">
                            <label className="flex items-start gap-3 p-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors bg-white dark:bg-slate-900/50">
                                <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                                    checked={checklistDiff}
                                    onChange={(e) => setChecklistDiff(e.target.checked)}
                                />
                                <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                    I confirm that I am ready to take the exam in a quiet environment without distraction.
                                    {test.settings?.tab_switch_mode === 'strict' && (
                                        <span className="text-red-600 font-bold block mt-0.5">
                                            ⚠️ Strict tab switch monitoring is enabled for this exam.
                                        </span>
                                    )}
                                </span>
                            </label>

                            {test.settings?.allow_flexible_timer !== false && (
                                <div className="flex items-center justify-between p-3 border border-purple-100 dark:border-purple-900/40 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20">
                                    <div className="space-y-0.5">
                                        <label htmlFor="flexible-timer" className="text-xs font-semibold text-purple-950 dark:text-purple-300 cursor-pointer">
                                            Flexible Timer
                                        </label>
                                        <p className="text-[11px] text-purple-700/80 dark:text-purple-400/80">
                                            Practice without time limit pressure.
                                        </p>
                                    </div>
                                    <Switch
                                        id="flexible-timer"
                                        checked={isTimerDisabled}
                                        onCheckedChange={setIsTimerDisabled}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Login Gate Card (Only displayed if Creator enabled 'login_required' and candidate is not logged in) */}
                        {isLoginGateActive && (
                            <div className="p-4 sm:p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/40 space-y-3 animate-in zoom-in-95 duration-200">
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                                    <span>Authentication Required</span>
                                </div>
                                <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
                                    The creator has required candidates to log in for this exam. Sign in to start your test and save your results to your permanent profile.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                    <div className="flex-1">
                                        <GoogleSignInButton
                                            onClick={handleGoogleLogin}
                                            isLoading={isAuthLoading}
                                            text="Continue with Google"
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-10 text-xs font-semibold rounded-xl border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200"
                                        onClick={() => navigate('/login', { state: { from: location.pathname } })}
                                    >
                                        Login / Signup
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Scheduled Countdown Timer (Directly above Start Test Button if test is scheduled for future) */}
                        {schedulingStatus === 'upcoming' && scheduledDate && (
                            <div className="pt-2">
                                <CountdownDisplay
                                    targetDate={scheduledDate}
                                    onComplete={() => setSchedulingStatus('live')}
                                />
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="pt-0 pb-6 px-4 sm:px-6 flex flex-col gap-3">
                        {schedulingStatus === 'ended' && scheduledDate ? (
                            <div className="w-full p-4 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 rounded-2xl text-center font-bold text-xs sm:text-sm border border-red-200 dark:border-red-900/50 shadow-sm">
                                This exam ended on {formatDateCustom(scheduledDate)} at {formatTimeCustom(scheduledDate)}.
                            </div>
                        ) : hasAttempted ? (
                            <div className="w-full p-4 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 rounded-2xl text-center font-bold text-xs sm:text-sm border border-amber-200 dark:border-amber-900/50 shadow-sm">
                                You have already attempted this exam.
                            </div>
                        ) : isLoginGateActive ? (
                            <Button
                                size="lg"
                                className="w-full text-base h-12 rounded-2xl font-bold bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                                disabled
                            >
                                <Lock className="mr-2 h-4 w-4" /> Please Login Above to Begin Exam
                            </Button>
                        ) : schedulingStatus === 'upcoming' ? (
                            <Button
                                size="lg"
                                className="w-full text-base sm:text-lg h-12 font-bold rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.01]"
                                onClick={handleStartFlow}
                            >
                                <Clock className="mr-2 h-5 w-5" /> Enter Exam Waiting Room
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                className={`w-full text-base sm:text-lg h-12 font-bold rounded-2xl shadow-lg transition-all ${
                                    !checklistDiff
                                        ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 hover:scale-[1.01]'
                                }`}
                                disabled={!checklistDiff}
                                onClick={handleStartFlow}
                            >
                                <PlayCircle className="mr-2 h-6 w-6" /> Start Test Now
                            </Button>
                        )}

                        {/* Subtle guest status hint if login is not required and user is guest */}
                        {!user && !isLoginRequired && (
                            <p className="text-[11px] text-center text-slate-400">
                                Taking test as guest. <span onClick={() => navigate('/login', { state: { from: location.pathname } })} className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline">Sign in</span> to save results to your profile.
                            </p>
                        )}
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
