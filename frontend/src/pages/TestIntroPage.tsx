import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Clock, HelpCircle, Trophy, BookOpen, AlertTriangle, PlayCircle, FileText, CheckCircle, ArrowLeft, Info, RefreshCcw, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { fetchTestById, fetchTestBySlug, Test, fetchSolutions } from '@/lib/testsApi';
// import { Helmet } from 'react-helmet-async'; // Replaced by SEO component
import { SEO } from '@/components/SEO';
import { fetchFeatureFlags } from '@/lib/featuresApi';
import { SEOContent } from '@/components/SEOContent';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { signInWithGoogle } from '@/hooks/useAuthActions';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

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
    <div className="flex flex-col items-center justify-center bg-white min-w-[60px] md:min-w-[70px] py-1.5 px-1 rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)] border border-indigo-50/50">
        <span className="text-2xl md:text-3xl font-bold bg-gradient-to-b from-indigo-500 to-indigo-700 bg-clip-text text-transparent w-full text-center">
            {String(value).padStart(2, '0')}
        </span>
        <span className="text-[10px] md:text-[11px] tracking-widest uppercase font-semibold text-indigo-400 mt-0.5">
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
        <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-br from-indigo-50/80 to-blue-50/50 rounded-2xl border border-indigo-100/60 shadow-sm w-full my-2">
            <p className="text-xs font-semibold text-indigo-800/70 mb-3 tracking-widest uppercase">Test Starts In</p>
            <div className="flex items-center gap-3">
                {days > 0 && <TimeBox value={days} label="Days" />}
                {(hours > 0 || days > 0) && <TimeBox value={hours} label="Hours" />}
                <TimeBox value={minutes} label="Mins" />
                <TimeBox value={seconds} label="Secs" />
            </div>
            <p className="text-xs text-indigo-600/80 mt-4 font-medium px-4 text-center">
                Scheduled for {formatDateCustom(targetDate)} at {formatTimeCustom(targetDate)}
            </p>
        </div>
    );
};

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

    // Logic State
    const [showFullScreenDialog, setShowFullScreenDialog] = useState(false);
    const [hasAttempted, setHasAttempted] = useState(false);
    const [checklistDiff, setChecklistDiff] = useState(false);
    const [isTimerDisabled, setIsTimerDisabled] = useState(false);
    const [startFormValues, setStartFormValues] = useState<Record<string, string>>({});
    const [schedulingStatus, setSchedulingStatus] = useState<'upcoming' | 'ended' | 'live' | null>(null);
    const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
    const [showAuthWarning, setShowAuthWarning] = useState(false);
    const [hasSolutions, setHasSolutions] = useState(false);
    const [isAuthLoading, setIsAuthLoading] = useState(false);
    const [enableAnonymousTests, setEnableAnonymousTests] = useState(false);

    // Logic Functions
    const checkPermissions = async () => {
        if (!test) return;

        // Schedule Check
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

        // Attempt Limit Check
        if (test.settings?.attempt_limit === 1) {
            try {
                const { checkUserTestAttempt } = await import('@/lib/attemptsApi');
                const { hasAttempted, error } = await checkUserTestAttempt(user.id, test.id);
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
            });
            if (error) throw error;
            if (data) {
                setTest(data);
                setLoadingProgress(100);
                setTimeout(() => setLoading(false), 300);
            }
        } catch (err: any) {
            console.error(`Error loading test by slug (attempt ${attempt + 1}):`, err);
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
                });
                data = res.data;
                error = res.error;
            } else {
                const { fetchTestByCustomId } = await import('@/lib/testsApi');
                const res = await fetchTestByCustomId(testId, (cachedData) => {
                    setTest(cachedData);
                    setLoadingProgress(100);
                    setTimeout(() => setLoading(false), 300);
                });
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
            console.error(`Error loading test (attempt ${attempt + 1}):`, err);
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

    // 1. Authentication Check & Feature Flags
    useEffect(() => {
        if (!authLoading && !user) {
            // Optional: Redirect to login logic if required
        }
    }, [user, authLoading]);

    useEffect(() => {
        fetchFeatureFlags().then(flags => setEnableAnonymousTests(flags.enable_anonymous_tests));
    }, []);

    // 2. Load Test Data
    useEffect(() => {
        if (slug) {
            loadTestBySlug(slug);
        } else if (id) {
            loadTestById(id);
        }
    }, [id, slug]);

    // 3. Check Permissions (Schedule & Attempts)
    useEffect(() => {
        if (test) {
            checkPermissions();
            // Check for solutions
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

    // Simulated loading progress
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


    const handleStartTest = () => {
        if (hasAttempted) return;
        if (schedulingStatus === 'upcoming' || schedulingStatus === 'ended') return;

        // Auth Check for Anonymous Start
        if (!user) {
            setShowAuthWarning(true);
            return;
        }

        // Show Checklist / Fullscreen Dialog
        setShowFullScreenDialog(true);
    };

    const handleGoogleLogin = async () => {
        setIsAuthLoading(true);
        try {
            // Save current path for redirect after Google login
            localStorage.setItem('auth_redirect_intent', location.pathname);

            const { error } = await signInWithGoogle();
            if (error) throw error;
        } catch (error: any) {
            toast.error(error.message || 'Google login failed');
            setIsAuthLoading(false);
        }
    };

    const handleAnonymousContinue = () => {
        setShowAuthWarning(false);
        setShowFullScreenDialog(true);
    };

    const confirmStartTest = async (enableFullScreen: boolean) => {
        if (!test) return;

        // Validate Start Form
        if (test.settings?.start_form?.enabled) {
            const missing = test.settings.start_form.fields.filter((f: any) => f.required && !startFormValues[f.label]);
            if (missing.length > 0) {
                alert(`Please fill all required fields: ${missing.map((f: any) => f.label).join(', ')}`);
                return;
            }
            sessionStorage.setItem(`start_form_${test.id}`, JSON.stringify(startFormValues));
        }

        // Save flexible timer preference
        sessionStorage.setItem(`flexible_timer_${test.id}`, String(isTimerDisabled));

        setShowFullScreenDialog(false);

        // Register Attempt (for both logged-in and anonymous users)
        try {
            const { registerTestStart } = await import('@/lib/attemptsApi');
            await registerTestStart(user?.id || null, test.id);
        } catch (err) {
            console.error("Error registering start:", err);
        }

        // Request Fullscreen
        if (enableFullScreen || test.settings?.force_fullscreen) {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch((err) => {
                    console.log("Fullscreen request denied:", err);
                });
            }
        }

        // Navigate to Live Test — mark as a legitimate intro-page entry
        navigate(`/live/${test.slug || test.custom_id || test.id}`, { state: { fromIntro: true } });
    };

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
                            <Button
                                onClick={handleReload}
                                className="w-full py-6 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <RefreshCcw className="mr-2 h-5 w-5" />
                                Try Again
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => navigate('/')}
                                className="w-full py-6 text-lg font-semibold rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all"
                            >
                                <ArrowLeft className="mr-2 h-5 w-5" />
                                Back to Home
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Subtle Support Text */}
                <p className="mt-8 text-slate-400 dark:text-slate-500 text-sm">
                    If the problem persists, please contact support.
                </p>
            </div>
        );
    }
    console.log("TestIntroPage Render. Test:", test);
    if (!test) return <div className="flex justify-center items-center h-screen">Test not found.</div>;

    // ─ Client-side visibility guard ──────────────────────────────────────────
    const testVisibility = test.visibility || (test.is_public ? 'public' : 'private');
    const isConductExam = !!(test.settings?.conduct_exam?.enabled);
    const isCreatorViewing = user?.id === test.created_by;
    const isUUIDRoute = location.pathname.startsWith('/test-intro/');

    // Instruction: Attempts to access the test via UUID (/test-intro/{uuid}) will also fail to all users and return a 404 Not Found.
    if (isUUIDRoute && (testVisibility === 'private' || isConductExam)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50 dark:bg-slate-950 p-6">
                <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none animate-in zoom-in duration-300">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                            <AlertTriangle className="h-10 w-10 text-slate-400" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Test Not Available</h2>
                            <p className="text-slate-500 dark:text-slate-400">
                                This test is private or in conduct mode, and cannot be accessed via this link.
                            </p>
                        </div>
                        <Button
                            onClick={() => navigate('/')}
                            className="w-full py-6 text-lg font-semibold rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white transition-all"
                        >
                            <ArrowLeft className="mr-2 h-5 w-5" />
                            Back to Home
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Private tests are only visible to their creator (via the exact slug link)
    if (testVisibility === 'private' && !isCreatorViewing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50 dark:bg-slate-950 p-6">
                <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none animate-in zoom-in duration-300">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                            <AlertTriangle className="h-10 w-10 text-slate-400" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Test Not Available</h2>
                            <p className="text-slate-500 dark:text-slate-400">
                                This test is private and is not available for public access.
                            </p>
                        </div>
                        <Button
                            onClick={() => navigate('/')}
                            className="w-full py-6 text-lg font-semibold rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white transition-all"
                        >
                            <ArrowLeft className="mr-2 h-5 w-5" />
                            Back to Home
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Conduct-exam tests are not accessible via the public-slug route
    if (isConductExam && !isCreatorViewing && testVisibility !== 'unlisted') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50 dark:bg-slate-950 p-6">
                <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none animate-in zoom-in duration-300">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="h-20 w-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                            <AlertTriangle className="h-10 w-10 text-amber-400" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Access Restricted</h2>
                            <p className="text-slate-500 dark:text-slate-400">
                                This test is currently in conduct-exam mode. Please use the link provided by your examiner to access it.
                            </p>
                        </div>
                        <Button
                            onClick={() => navigate('/')}
                            className="w-full py-6 text-lg font-semibold rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white transition-all"
                        >
                            <ArrowLeft className="mr-2 h-5 w-5" />
                            Back to Home
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
    // ─────────────────────────────────────────────────────────────────────────

    const questionCount = test.questions?.length || 0;

    const getSectionDetails = (sec: any) => {
        const totalQs = sec.questions?.length || 0;
        const attemptControl = sec.attempt_control;
        const isEnabled = attemptControl && (attemptControl.enabled !== false);
        const maxAllowed = isEnabled && attemptControl.max_attempts ? Math.min(attemptControl.max_attempts, totalQs) : totalQs;

        let sectionMaxMarks = 0;

        // Use backend computed marks if available
        if (test.computed_max_marks?.section_max_marks && test.computed_max_marks.section_max_marks[sec.id] !== undefined) {
            sectionMaxMarks = test.computed_max_marks.section_max_marks[sec.id];
        } else if (sec.questions) {
            const marksList = sec.questions.map((q: any) => {
                const m = q.marks !== undefined ? parseFloat(String(q.marks)) : (sec.marks_per_question ? parseFloat(String(sec.marks_per_question)) : 4);
                return isNaN(m) ? 0 : m;
            });

            if (isEnabled && attemptControl.max_attempts && attemptControl.max_attempts < totalQs) {
                // Best N logic to find max possible marks
                marksList.sort((a, b) => b - a);
                sectionMaxMarks = marksList.slice(0, attemptControl.max_attempts).reduce((a, b) => a + b, 0);
            } else {
                sectionMaxMarks = marksList.reduce((a, b) => a + b, 0);
            }
        }

        return { totalQs, maxAllowed, sectionMaxMarks, isEnabled };
    };

    const hasAnyAttemptControl = test.enable_section_mode && test.sections?.some((s: any) => s.attempt_control && (s.attempt_control.enabled !== false));

    let totalMaxMarks = 0;
    // 1. Prioritize the pre-calculated database column (Bypassing calculations)
    if (test.total_max_marks !== undefined && test.total_max_marks !== 0) {
        totalMaxMarks = test.total_max_marks;
    } 
    // 2. Fallback to backend enrichment only if DB column is missing/zero
    else if (test.computed_max_marks?.total_max_marks !== undefined) {
        totalMaxMarks = test.computed_max_marks.total_max_marks;
    } 
    // 3. Last resort fallback to local calculation
    else if (test.enable_section_mode && test.sections) {
        totalMaxMarks = test.sections.reduce((acc, sec) => acc + getSectionDetails(sec).sectionMaxMarks, 0);
    } else if (test.questions) {
        test.questions.forEach((q: any) => {
            const m = q.marks !== undefined ? parseFloat(String(q.marks)) : (test.marks_per_question ? parseFloat(String(test.marks_per_question)) : 4);
            totalMaxMarks += isNaN(m) ? 0 : m;
        });
    }

    const totalAllowedQuestions = test.enable_section_mode && test.sections
        ? test.sections.reduce((acc, sec) => acc + getSectionDetails(sec).maxAllowed, 0)
        : questionCount;

    return (
        <div className="container mx-auto max-w-3xl py-2 px-4 space-y-4 relative">
            <SEO
                title={test.title}
                description={test.description || `${test.title} - Free Online Mock Test with ${test.questions?.length} questions. Start practicing now on TestoZa.`}
                image={test.og_image} // Fallback handled in component
                url={`${window.location.origin}${test.slug ? `/test/${test.slug}` : `/test-intro/${test.id}`}`}
                categories={[...(test.tags || []), ...(test.custom_category ? [test.custom_category] : [])]}
                keywords={[
                    ...(test.tags || []),
                    "JEE Main 2026",
                    "Session 1",
                    "Shift 1",
                    "Shift 2",
                    "Previous Year Papers",
                    "Mock Test"
                ]}
                schemas={[
                    {
                        "@context": "https://schema.org",
                        "@type": "Quiz",
                        "name": test.title,
                        "description": test.description || `Online Mock Test for ${test.title}`,
                        "url": `${window.location.origin}${test.slug ? `/test/${test.slug}` : `/test-intro/${test.id}`}`,
                        "educationLevel": "Intermediate",
                        "datePublished": test.created_at,
                        "dateModified": test.updated_at || test.created_at,
                        "hasPart": test.questions?.map((q) => ({
                            "@type": "Question",
                            "name": q.question.substring(0, 150),
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": "Answer available in test results"
                            }
                        })) || []
                    }
                ]}
            />
            <Button
                variant="ghost"
                className="fixed top-20 left-0 h-10 w-12 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-none rounded-r-lg shadow-md z-50 transition-transform hover:translate-x-1"
                onClick={() => navigate(-1)}
            >
                <ArrowLeft className="h-6 w-6" />
            </Button>

            <Card className="border-t-4 border-t-primary shadow-lg relative">
                <CardHeader className="text-center pb-2 pt-6 p-4">
                    <CardTitle className="text-2xl font-bold text-red-900">{test.title}</CardTitle>
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

                    <div className="space-y-3 border p-3 rounded-md">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold text-base">Terms & Instructions</h3>
                        </div>
                        <Separator />
                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            <li>The test contains <strong>{test.questions?.length}</strong> questions.</li>
                            <li>Total duration of the test is <strong>{test.duration} minutes</strong>.</li>
                            <li>Total Marks: <strong>{totalMaxMarks}</strong></li>
                            <li>Once you start, the timer will begin and cannot be paused.</li>

                        </ul>

                        {/* Advance Rules Section */}
                        {(test.settings && (
                            (test.settings.attempt_limit && test.settings.attempt_limit > 0) ||
                            test.settings.start_form?.enabled ||
                            test.settings.schedule?.enabled ||
                            (test.settings.tab_switch_mode && test.settings.tab_switch_mode !== 'off') ||
                            test.settings.show_results_immediate === false ||
                            test.settings.strict_timer ||
                            test.settings.shuffle_questions ||
                            test.settings.force_fullscreen
                        )) && (
                                <>
                                    <Separator className="my-3" />
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                                        <h4 className="font-semibold text-sm text-amber-700">Advance Rules</h4>
                                    </div>
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground mt-2">
                                        {test.settings.attempt_limit && test.settings.attempt_limit > 0 && (
                                            <li><strong>Attempt Limit:</strong> Only {test.settings.attempt_limit} attempt(s) allowed.</li>
                                        )}

                                        {hasAnyAttemptControl && (
                                            <li className="text-indigo-600 font-medium">
                                                <strong>Section Attempt Control:</strong> Some sections have a limit on the number of questions you can attempt.
                                            </li>
                                        )}

                                        {test.settings.start_form?.enabled && (
                                            <li>
                                                <strong>Candidate Details:</strong> You must fill {test.settings.start_form.fields.map(f => `<${f.label}>`).join(' and ')} before starting.
                                            </li>
                                        )}

                                        {test.settings.schedule?.enabled && (
                                            <li>
                                                <strong>Scheduled:</strong> Test is live from {test.settings.schedule.start_time ? formatDateCustom(new Date(test.settings.schedule.start_time)) : '...'} to {test.settings.schedule.end_time ? formatDateCustom(new Date(test.settings.schedule.end_time)) : '...'}.
                                            </li>
                                        )}

                                        {test.settings.tab_switch_mode === 'strict' && (
                                            <li className="text-red-600 font-medium">
                                                <strong>Tab Switching:</strong> Strictly PROHIBITED. Test will auto-submit if you switch tabs.
                                            </li>
                                        )}
                                        {test.settings.tab_switch_mode === 'warming' && (
                                            <li className="text-amber-600 font-medium">
                                                <strong>Tab Switching:</strong> Strictly PROHIBITED. Test may auto-submit if you switch tabs.
                                            </li>
                                        )}

                                        {test.settings.force_fullscreen && (
                                            <li className="text-red-600 font-medium">
                                                <strong>Full Screen:</strong> Mandatory. Exiting full screen may submit the test.
                                            </li>
                                        )}

                                        {test.settings.show_results_immediate === false && (
                                            <li><strong>Result Visibility:</strong> Score/Result will NOT be shown immediately after submission.</li>
                                        )}

                                        {test.settings.strict_timer && (
                                            <li><strong>Timer:</strong> Synchronized with Server Time.</li>
                                        )}

                                        {test.settings.shuffle_questions && (
                                            <li><strong>Randomization:</strong> Questions are randomized for each candidate.</li>
                                        )}
                                    </ul>
                                </>
                            )}
                    </div>

                    {test.revision_notes && (
                        <div className="mt-4 border rounded-md">
                            <details className="group">
                                <summary className="cursor-pointer p-4 bg-muted/30 hover:bg-muted/50 font-medium flex items-center justify-center select-none">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        View Test Summary & Instructions
                                    </div>
                                    <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform ml-2">▼</span>
                                </summary>
                                <div className="p-4 bg-slate-50 dark:bg-slate-950/30 border-t max-h-[500px] overflow-y-auto">
                                    <article className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {test.revision_notes}
                                        </ReactMarkdown>
                                    </article>
                                </div>
                            </details>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="pt-0 pb-4 px-4 flex flex-col gap-3">
                    {schedulingStatus === 'upcoming' && scheduledDate ? (
                        <CountdownDisplay targetDate={scheduledDate} onComplete={() => setSchedulingStatus('live')} />
                    ) : schedulingStatus === 'ended' && scheduledDate ? (
                        <div className="w-full p-4 bg-red-50 text-red-800 rounded-xl text-center font-medium border border-red-100 shadow-sm">
                            This test ended on {formatDateCustom(scheduledDate)}
                        </div>
                    ) : hasAttempted ? (
                        <div className="w-full p-4 bg-amber-50 text-amber-800 rounded-xl text-center font-medium border border-amber-100 shadow-sm">
                            You have already attempted this test.
                        </div>
                    ) : (
                        <Button size="lg" className="w-full text-lg h-10" onClick={handleStartTest}>
                            Start Test Now
                        </Button>
                    )}
                </CardFooter>
            </Card>

            <AlertDialog open={showFullScreenDialog} onOpenChange={setShowFullScreenDialog}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Pre-Exam Checklist</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4 pt-2">
                            <div className="space-y-3">
                                <label className="flex items-start gap-3 p-3 border rounded hover:bg-slate-50 cursor-pointer">
                                    <input type="checkbox" className="mt-1 flex-shrink-0" checked={checklistDiff} onChange={(e) => setChecklistDiff(e.target.checked)} />
                                    <span className="text-sm text-slate-800 leading-tight">
                                        I have closed all other tabs and applications. I enable "Do Not Disturb" mode on my device.
                                    </span>
                                </label>
                                {test.settings?.allow_flexible_timer !== false && (
                                    <div className="flex items-center gap-3 p-3 border rounded hover:bg-slate-50 bg-purple-50/50 border-purple-100">
                                        <Switch
                                            id="flexible-timer"
                                            checked={isTimerDisabled}
                                            onCheckedChange={setIsTimerDisabled}
                                        />
                                        <label htmlFor="flexible-timer" className="text-sm text-slate-800 cursor-pointer leading-tight">
                                            <strong>Flexible Timer:</strong> Take this test without a time limit.
                                        </label>
                                    </div>
                                )}
                                {test.settings?.force_fullscreen && (
                                    <div className="text-xs text-amber-600 font-medium p-2 bg-amber-50 rounded">
                                        Note: This test requires Full Screen mode.
                                    </div>
                                )}
                            </div>

                            {test.settings?.start_form?.enabled && (
                                <div className="space-y-3 pt-2 border-t">
                                    <p className="text-sm font-bold text-slate-900">Candidate Details</p>
                                    {test.settings.start_form.fields.map((field: any, idx: number) => (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex justify-between">
                                                <label className="text-xs font-medium">{field.label}</label>
                                                {field.required && <span className="text-xs text-red-500">*</span>}
                                            </div>
                                            <input
                                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                placeholder={`Enter ${field.label}`}
                                                value={startFormValues[field.label] || ''}
                                                onChange={(e) => setStartFormValues(prev => ({ ...prev, [field.label]: e.target.value }))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-between items-center gap-2">
                        <AlertDialogCancel onClick={() => setShowFullScreenDialog(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                if (!checklistDiff) {
                                    e.preventDefault();
                                    alert("Please accept the checklist.");
                                    return;
                                }
                                confirmStartTest(true);
                            }}
                            disabled={!checklistDiff}
                            className={!checklistDiff ? "opacity-50 cursor-not-allowed" : ""}
                        >
                            {test.settings?.force_fullscreen ? "Enable Full Screen & Start" : "Start Test"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={showAuthWarning} onOpenChange={setShowAuthWarning}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Start Test Anonymously?</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="bg-amber-50 p-3 rounded-md border border-amber-200 text-sm text-amber-800 flex gap-2">
                            <Info className="h-5 w-5 shrink-0" />
                            <p>You are not logged in. Your test results and history will <strong>NOT</strong> be saved if you proceed anonymously.</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <GoogleSignInButton
                                onClick={handleGoogleLogin}
                                isLoading={isAuthLoading}
                                text="Continue with Google"
                            />
                            <div className="relative my-2">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                        Or
                                    </span>
                                </div>
                            </div>
                            <Button className="w-full" onClick={() => navigate('/login', { state: { from: location.pathname } })}>
                                Login
                            </Button>
                            <Button variant="outline" className="w-full" onClick={() => navigate('/login', { state: { isSignup: true, from: location.pathname } })}>
                                Create Account
                            </Button>
                            {enableAnonymousTests && (
                                <>
                                    <div className="relative my-2">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-background px-2 text-muted-foreground">
                                                Or
                                            </span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleAnonymousContinue}>
                                        Continue Anonymously
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}
