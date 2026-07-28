import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fetchTestById, Test } from '@/lib/testsApi';
import { saveAttempt, saveAttemptWithRetry } from '@/lib/attemptsApi';
import { AnswerVault, startProactiveTokenRefresh } from '@/lib/testResilience';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, Clock, Save, Flag, Menu, X, CheckCircle, Sun, Moon, Bookmark, Info, Eye, EyeOff, TriangleAlert, Calculator, MessageSquareWarning, Maximize, Maximize2, ScrollText, Loader2, Plus, Minus, PlayCircle, BookOpen } from 'lucide-react';
import { useTheme } from "next-themes";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import LatexRenderer from '@/components/ui/LatexRenderer';
import ScientificCalculator from '@/components/ScientificCalculator';
import { submitReport } from '@/lib/reportsApi';
import { analyticsApi } from '@/lib/analyticsApi';
import { Progress } from '@/components/ui/progress';
import ExitFeedbackDialog from '@/components/ExitFeedbackDialog';
import VirtualNumericPad from '@/components/test/VirtualNumericPad';

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
  const location = useLocation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  // Combined mode state (from CombinedIntroPage navigation)
  const combinedState = (location.state as any) || {};
  const isCombinedMode = !!combinedState.combinedMode;
  const combinedSessionId = combinedState.combinedSessionId as string | undefined;
  const combinedPaper = combinedState.paper as 1 | 2 | undefined; // 1 or 2
  const combinedPaper2TestId = combinedState.paper2TestId as string | undefined;

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [fontSize, setFontSize] = useState(18);

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
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showFullScreenWarning, setShowFullScreenWarning] = useState(false);
  const [fullScreenLogs, setFullScreenLogs] = useState<{ event: string, timestamp: number }[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [violationWarningData, setViolationWarningData] = useState<{ show: boolean, title: string, message: string }>({ show: false, title: '', message: '' });

  // ── Phase 2: Connection health indicator state ──
  type ConnectionStatus = 'online' | 'offline' | 'reconnecting';
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('online');

  // Track delayed proctoring start state
  const [isExamStarted, setIsExamStarted] = useState(false);

  // Reporting State
  const [reportReason, setReportReason] = useState<string>('');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportedQuestions, setReportedQuestions] = useState<Set<number>>(new Set());
  const [isReportPopoverOpen, setIsReportPopoverOpen] = useState(false);

  // ── Resilience: proactive token refresh every 45 min + IndexedDB vault backup ──
  const vaultSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRefreshCleanupRef = useRef<(() => void) | null>(null);
  const isFullScreenViolationLoggedRef = useRef(false);
  // ── Screen Wake Lock: prevents screen sleep during conduct-exam tests ──
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const handleReportSubmit = async (questionId: number, reason: string, details?: string) => {
    if (!test) return;
    if (!user) {
      toast.error("Please login to report a question.");
      return;
    }

    setIsReporting(true);

    // Find the original index of the question
    const qObj = test?.questions.find((q: any) => q.id === questionId);
    const submitIndex = qObj && qObj.originalIndex !== undefined ? qObj.originalIndex : questionId;

    const payload = {
      test_id: test.id,
      question_id: submitIndex,
      creator_id: test.created_by,
      reason: reason,
      details: details || ''
    };

    const { error } = await submitReport(payload);
    setIsReporting(false);

    if (error) {
      toast.error("Failed to submit report.");
    } else {
      toast.success("Report submitted successfully.");
      setReportedQuestions(prev => new Set(prev).add(questionId));
      setIsReportPopoverOpen(false);
      setReportReason('');
      setReportDetails('');
    }
  };

  // Palette Resize State
  const [paletteWidth, setPaletteWidth] = useState(320);
  const isResizingRef = useRef(false);

  // 1. Browser Back Button Prevention
  // 1. Browser Back Button Prevention
  useEffect(() => {
    if (!test?.settings?.block_back_button) return;

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
  }, [test?.settings?.block_back_button]);

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
  const [isTimerDisabled] = useState(() => sessionStorage.getItem(`flexible_timer_${id}`) === 'true');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Simulated loading progress
  useEffect(() => {
    if (!loading) {
      setLoadingProgress(100);
      return;
    }

    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        // Incremental jump to make it feel organic
        const inc = Math.random() * 8 + 2;
        return Math.min(90, prev + inc);
      });
    }, 300);

    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (!id) return;
    loadTest(id);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (!isExamStarted) return;
    if (timeRemaining > 0 && !isTimeUp && !isTimerDisabled) {
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
  }, [timeRemaining, isTimeUp, isExamStarted]);

  // Mark current question as visited
  // Save progress to localStorage
  useEffect(() => {
    if (!isExamStarted) return;
    // Attempt tracking requires user logic currently, skip for anonymous for now or use simplified local storage
    if (!test || isSubmitting || isTimeUp || !id) return;

    // Only persist if user is logged in
    if (!user) return;

    // Create session object
    const sessionData = {
      answers,
      markedForReview: Array.from(markedForReview),
      visited: Array.from(visited),
      currentQuestionIndex,
      timeRemaining,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(`test_session_${user.id}_${id}`, JSON.stringify(sessionData));
    } catch (e) {
      console.warn("Storage quota exceeded, could not save session draft", e);
    }
  }, [answers, markedForReview, visited, currentQuestionIndex, timeRemaining, user, id, isExamStarted]);

  // ─── IndexedDB vault: save answers on every change (throttled 30s) ────────
  useEffect(() => {
    if (!user || !test || !id || isSubmitting) return;
    if (vaultSaveTimerRef.current) clearTimeout(vaultSaveTimerRef.current);
    vaultSaveTimerRef.current = setTimeout(() => {
      AnswerVault.save(user.id, test.id, answers as Record<string, any>);
    }, 30_000); // save after 30s of inactivity
    return () => { if (vaultSaveTimerRef.current) clearTimeout(vaultSaveTimerRef.current); };
  }, [answers, user, test, id, isSubmitting]);

  // ─── Proactive token refresh: start when test loads, stop on unmount ────────
  useEffect(() => {
    if (!test || !user) return;
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '') + '/';
    tokenRefreshCleanupRef.current = startProactiveTokenRefresh(apiBase);
    return () => { tokenRefreshCleanupRef.current?.(); };
  }, [test?.id, user?.id]);

  // ── Phase 2: Background auto-sync answers every 3 minutes ──
  const answersRef = useRef(answers);
  const visitedRef = useRef(visited);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    visitedRef.current = visited;
  }, [visited]);

  useEffect(() => {
    if (!isExamStarted) return;
    if (!test || !user || isSubmitting) return;
    const syncInterval = setInterval(async () => {
      if (submittedRef.current) return;
      try {
        const currentAnswers = answersRef.current;
        const currentVisitedCount = visitedRef.current.size;
        const totalQ = test.questions?.length || 1;
        const pct = Math.round((currentVisitedCount / totalQ) * 100);
        // Reuse the progress endpoint to push current answers to the server
        await analyticsApi.updateProgress(user.id, test.id, Math.min(pct, 99), currentAnswers);
        // Also flush the vault with a fresh save
        await AnswerVault.save(user.id, test.id, currentAnswers as Record<string, any>);
      } catch { /* non-fatal: will retry next interval */ }
    }, 2 * 60 * 1000); // every 2 minutes
    return () => clearInterval(syncInterval);
  }, [test, user, isSubmitting, isExamStarted]);

  // ── Phase 2: Network online/offline listener ──
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ─── Analytics: Progress Tracking & Abandon Detection ───────
  const submittedRef = useRef(false);

  // On test load: register anonymous start
  useEffect(() => {
    if (!isExamStarted) return;
    if (!test || !id) return;
    if (!user) {
      // Anonymous user starts — track in dedicated anon table
      analyticsApi.startAnonAttempt(id);
    }
  }, [test?.id, isExamStarted]);

  // Periodic progress ping (every 60 seconds)
  useEffect(() => {
    if (!isExamStarted) return;
    if (!test || !id || isSubmitting) return;
    const interval = setInterval(() => {
      if (submittedRef.current) return;
      const totalQ = test.questions?.length || 1;
      const answeredQ = Object.keys(answers).length;
      const pct = Math.round((answeredQ / totalQ) * 100);
      if (user) {
        // Registered user
        analyticsApi.updateProgress(user.id, id, Math.min(pct, 99));
      } else {
        // Anonymous user — use dedicated anon endpoint
        analyticsApi.updateAnonProgress(id, Math.min(pct, 99));
      }
    }, 60000); // every 60 seconds
    return () => clearInterval(interval);
  }, [test, user, id, answers, isSubmitting, isExamStarted]);

  // Abandon detection on tab close / navigation away
  useEffect(() => {
    if (!isExamStarted) return;
    if (!test || !id) return;
    const handleBeforeUnload = () => {
      if (submittedRef.current) return; // already submitted, don't mark abandoned
      const totalQ = test.questions?.length || 1;
      const answeredQ = Object.keys(answers).length;
      const pct = Math.round((answeredQ / totalQ) * 100);
      if (user) {
        // Emergency vault save on unload — synchronous fallback
        try {
          const draft = JSON.stringify({ key: `${user.id}_${test.id}`, answers, savedAt: new Date().toISOString() });
          sessionStorage.setItem(`vault_emergency_${user.id}_${test.id}`, draft);
        } catch { /**/ }
        analyticsApi.markAbandoned(user.id, id, 'tab_closed', pct);
      } else {
        analyticsApi.abandonAnonAttempt(id, 'tab_closed', pct);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [test, user, id, answers, isExamStarted]);

  // ─── Guard: Redirect away if this test was already submitted ─────────────
  useEffect(() => {
    if (!id || !user) return;
    const submittedKey = `test_submitted_${user.id}_${id}`;
    const alreadySubmitted = localStorage.getItem(submittedKey) === 'true';
    if (alreadySubmitted) {
      // The session localStorage was cleared on submit, so no resume data exists.
      // Redirect student away from the test page — they cannot go back.
      toast.error('This test has already been submitted. You cannot re-enter it.');
      navigate('/', { replace: true });
    }
  }, [user, id]);

  // Check for saved session on mount
  useEffect(() => {
    if (!id) return;
    // Only check persistence if user is logged in
    if (!user) return;

    // If the student arrived here with a fresh intro-page entry (combinedMode, or
    // location.state has introEntry flag), clear any stale submitted marker so
    // unlimited-attempt tests can start a new attempt.
    const isFromIntro = !!(location.state as any)?.fromIntro;
    if (isFromIntro) {
      localStorage.removeItem(`test_submitted_${user.id}_${id}`);
    }

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
        try {
          sessionStorage.setItem(`test_active_${user.id}_${id}`, 'true');
        } catch (e) {
          console.warn("Storage quota exceeded, could not mark session active", e);
        }
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
    setIsExamStarted(true);
    setShowResumeDialog(false);
    toast.success("Test session resumed!");
  };

  const cancelResume = () => {
    if (!id) return;
    if (user) {
      localStorage.removeItem(`test_session_${user.id}_${id}`);
      sessionStorage.removeItem(`test_active_${user.id}_${id}`);
    }
    setShowResumeDialog(false);
    toast.info("Starting fresh test session.");
  };

  // Proctoring State
  // Warning State - Initialize from saved state to persist across refreshes
  const [warnings, setWarnings] = useState<number>(() => {
    if (!test?.id) return 0;
    if (!user?.id) return 0; // Don't persist warnings for anonymous
    const saved = localStorage.getItem(`test_warnings_${user.id}_${test.id}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  // Persist warnings whenever they change
  useEffect(() => {
    if (test?.id && user?.id) {
      try {
        localStorage.setItem(`test_warnings_${user.id}_${test.id}`, warnings.toString());
      } catch (e) {
        console.warn("Storage quota exceeded, could not save warnings count", e);
      }
    }
  }, [warnings, test?.id, user?.id]);
  const MAX_WARNINGS = test?.settings?.violation_limit || null; // null = no auto-submit (warn only)

  // ── Screen Wake Lock: prevent screen sleep during conduct-exam tests ─────────
  // Uses the W3C Screen Wake Lock API (supported in Chrome 84+, Edge 84+, Firefox 126+).
  // Automatically re-acquires the lock when the page becomes visible again.
  useEffect(() => {
    if (!isExamStarted) return;
    if (!test || isSubmitting || isTimeUp) return;
    const isConductExam = !!test.settings?.conduct_exam?.enabled;
    if (!isConductExam) return; // Only apply wake lock for proctored conduct-exam tests

    const acquireWakeLock = async () => {
      if (!('wakeLock' in navigator)) return; // Browser doesn't support Wake Lock API
      try {
        if (wakeLockRef.current) return; // Already acquired
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      } catch (err: any) {
        // Permission denied or API unavailable — non-fatal, don't bother user
        console.warn('[WakeLock] Could not acquire screen wake lock:', err.message);
      }
    };

    // Re-acquire after tab becomes visible again (lock is released on hide)
    const handleVisibilityForWakeLock = () => {
      if (document.visibilityState === 'visible') {
        acquireWakeLock();
      }
    };

    acquireWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityForWakeLock);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityForWakeLock);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => { });
        wakeLockRef.current = null;
      }
    };
  }, [test?.id, isSubmitting, isTimeUp, isExamStarted]);

  // Proctoring: Full Screen & Tab Switching & Action Blocking
  // NOTE: Violations (tab switch, fullscreen exit) only apply to conduct-exam tests.
  // Regular public/private tests never trigger violation warnings.
  useEffect(() => {
    if (!isExamStarted) return;
    if (!test || isSubmitting || isTimeUp) return;
    const settings = test.settings;
    if (!settings) return;

    // Only conduct-exam tests have proctoring violations
    const isConductExam = !!settings.conduct_exam?.enabled;

    // 1. Action Blocking (applies to all test types if enabled)
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

    // 2. Tab Switching / Visibility — violations ONLY for conduct-exam tests
    const handleVisibilityChange = () => {
      if (!isConductExam) return; // Skip violations for public/private tests
      const isEnabled = settings.tab_switch_mode && settings.tab_switch_mode !== 'off';
      if (document.hidden && isEnabled) {
        handleViolation("Tab Switching / Navigation");
      }
    };

    // 3. Full Screen Check — violations ONLY for conduct-exam tests
    const checkFullScreenState = () => {
      const isAPIFullScreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      const isWindowFullScreen = window.innerWidth === window.screen.width && window.innerHeight === window.screen.height;
      const currentFullScreen = isAPIFullScreen || isWindowFullScreen;

      setIsFullScreen(currentFullScreen);

      if (!currentFullScreen && settings.force_fullscreen) {
        if (isConductExam && !isFullScreenViolationLoggedRef.current) {
          // Count as violation only for conduct-exam tests
          isFullScreenViolationLoggedRef.current = true;
          setFullScreenLogs(prev => [...prev, { event: 'Exit Full Screen', timestamp: Date.now() }]);
          setShowFullScreenWarning(true);
          handleViolation("Exited Full Screen");
        } else if (!isConductExam) {
          // For non-conduct tests: just show the dialog, no violation count
          setShowFullScreenWarning(true);
        }
      } else if (currentFullScreen) {
        isFullScreenViolationLoggedRef.current = false;
        setFullScreenLogs(prev => {
          const lastEvent = prev.length > 0 ? prev[prev.length - 1].event : null;
          if (lastEvent !== 'Entered Full Screen') {
            return [...prev, { event: 'Entered Full Screen', timestamp: Date.now() }];
          }
          return prev;
        });
        setShowFullScreenWarning(false);
      }
    };

    const handleFullScreenChange = () => {
      checkFullScreenState();
    };

    if (settings.tab_switch_mode && settings.tab_switch_mode !== 'off') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    if (settings.force_fullscreen) {
      document.addEventListener('fullscreenchange', handleFullScreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
      document.addEventListener('mozfullscreenchange', handleFullScreenChange);
      document.addEventListener('MSFullscreenChange', handleFullScreenChange);
      window.addEventListener('resize', handleFullScreenChange);
      setTimeout(checkFullScreenState, 500);
    }

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullScreenChange);
      window.removeEventListener('resize', handleFullScreenChange);
    };
  }, [test, isSubmitting, isTimeUp, warnings, isExamStarted]);

  const handleViolation = (reason: string) => {
    if (!test?.settings) return;

    const isFullScreenReason = reason === "Exited Full Screen";

    if (MAX_WARNINGS === null) {
      // No limit — warn only, never auto-submit
      setWarnings(prev => prev + 1);
      if (!isFullScreenReason) {
        setViolationWarningData({ show: true, title: "⚠️ Violation Detected", message: `${reason} is not allowed!` });
      } else {
        toast.warning(`⚠️ Violation: ${reason} is not allowed!`);
      }
    } else if (MAX_WARNINGS === 0) {
      // Strict Mode (0 warnings allowed)
      if (!isFullScreenReason) {
        setViolationWarningData({ show: true, title: "Strict Mode Violation", message: `${reason} is not allowed. Test Auto-Submitting.` });
      }
      toast.error(`Strict Mode Violation: ${reason}. Test Auto-Submitting.`);
      confirmSubmit();
    } else {
      // Has a limit (e.g. 2, 3, 4, 5)
      if (warnings >= MAX_WARNINGS) {
        if (!isFullScreenReason) {
          setViolationWarningData({ show: true, title: "Maximum Violations Reached", message: `You have reached the maximum limit of violations (${reason}). Test Auto-Submitting.` });
        }
        toast.error(`Maximum violations reached (${reason}). Test Auto-Submitting.`);
        confirmSubmit();
      } else {
        setWarnings(prev => prev + 1);
        if (!isFullScreenReason) {
          setViolationWarningData({ show: true, title: "⚠️ Warning", message: `Warning ${warnings + 1}/${MAX_WARNINGS}: ${reason} is not allowed!` });
        } else {
          toast.warning(`Warning ${warnings + 1}/${MAX_WARNINGS}: ${reason} is not allowed!`);
        }
      }
    }

    // Ideally log this violation to DB (to be implemented in next step)
  };

  const enterFullScreen = () => {
    const elem = document.documentElement;
    try {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
      }
    } catch (err) {
      console.error("Error attempting to enable full-screen mode:", err);
    }
  };

  // Mark current question as visited
  useEffect(() => {
    setVisited(prev => new Set(prev).add(currentQuestionIndex));
  }, [currentQuestionIndex]);

  async function loadTest(testId: string) {
    const processTestData = (data: any) => {
      // Embed original index before shuffling to ensure accurate reporting
      if (data.questions) {
        data.questions.forEach((q: any, idx: number) => {
          q.originalIndex = idx;
        });
      }

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

      // Save start time if not already stored
      const startKey = `test_start_time_${user?.id || 'anon'}_${data.id}`;
      if (!localStorage.getItem(startKey)) {
        try {
          localStorage.setItem(startKey, new Date().toISOString());
        } catch (e) {
          console.warn("Storage quota exceeded, could not save start time", e);
        }
      }
    };

    setLoading(true);
    try {
      const { data, error } = await fetchTestById(testId, (cachedData) => {
        processTestData(cachedData);
        // Small delay to show 100% progress
        setLoadingProgress(100);
        setTimeout(() => setLoading(false), 400);
      });
      if (error) throw error;
      if (data) {
        processTestData(data);
        setLoadingProgress(100);
        setTimeout(() => setLoading(false), 400);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load test');
      navigate('/');
      setLoading(false);
    }
  }

  const checkAttemptLimit = (questionId: number): boolean => {
    const isAnswered = answers[questionId] !== undefined && answers[questionId] !== '' && (Array.isArray(answers[questionId]) ? (answers[questionId] as string[]).length > 0 : true);
    if (!isAnswered && test && test.max_attempts_per_question && test.max_attempts_per_question > 0) {
      const attemptsCount = test.questions.reduce((acc, q) => {
        if (answers[q.id] !== undefined && answers[q.id] !== '' && (Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).length > 0 : true)) {
          return acc + 1;
        }
        return acc;
      }, 0);

      if (attemptsCount >= test.max_attempts_per_question) {
        toast.error(`Maximum attempt limit of ${test.max_attempts_per_question} questions reached!`);
        return false;
      }
    }
    if (!test || !test.enable_section_mode || !test.sections) return true;

    let targetSection: any = null;
    for (const section of test.sections) {
      if (section.questions.some((q: any) => q.id === questionId)) {
        targetSection = section;
        break;
      }
    }

    if (targetSection && targetSection.attempt_control && targetSection.attempt_control.mode === 'hard') {
      let attemptCount = 0;
      targetSection.questions.forEach((q: any) => {
        const ans = answers[q.id];
        const isAttempted = ans !== undefined && ans !== '' && (!Array.isArray(ans) || ans.length > 0);
        if (isAttempted) attemptCount++;
      });

      const maxAttempts = targetSection.attempt_control.max_attempts || 0;
      if (attemptCount >= maxAttempts) {
        toast.error(`Limit reached! You can only attempt ${maxAttempts} questions in the ${targetSection.name} section.`);
        return false;
      }
    }
    return true;
  };

  const handleNumericKeypadPress = (key: string, questionId: number) => {
    const currentVal = (answers[questionId] as string) || '';
    let newVal = currentVal;

    if (key === 'AC') {
      newVal = '';
    } else if (key === 'BACKSPACE') {
      newVal = currentVal.slice(0, -1);
    } else if (key === '-') {
      if (currentVal === '') newVal = '-';
      else if (currentVal.startsWith('-')) newVal = currentVal.slice(1);
      else newVal = '-' + currentVal;
    } else if (key === '.') {
      if (!currentVal.includes('.')) {
        newVal = currentVal === '' ? '0.' : currentVal + '.';
      }
    } else {
      // Normal numbers
      newVal = currentVal + key;
    }

    const isCurrentlyAnswered = currentVal !== '';
    if (newVal !== '' && !isCurrentlyAnswered) {
      if (!checkAttemptLimit(questionId)) return;
    }

    setAnswers(prev => ({ ...prev, [questionId]: newVal }));
  };

  const handleAnswerSelect = (questionId: number, optionKey: string) => {
    if (isTimeUp) return;

    const currentAns = answers[questionId];
    const isCurrentlyAnswered = currentAns !== undefined && currentAns !== '' && (!Array.isArray(currentAns) || currentAns.length > 0);

    if (!isCurrentlyAnswered) {
      if (!checkAttemptLimit(questionId)) return;
    }

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
      // UPDATED: Allow marking for review even on last question
      setMarkedForReview(prev => new Set(prev).add(test.questions[currentQuestionIndex].id));

      // If it's the last question, just save and showing toast, don't try to go next
      if (currentQuestionIndex === test.questions.length - 1) {
        toast.success("Question marked for review.");
        return;
      }

      handleNext();
    }
  };

  const attemptSubmit = () => {
    setShowSubmitDialog(true);
  };

  const confirmSubmit = async () => {
    if (!test) return;
    submittedRef.current = true; // Prevent abandon detection from firing
    setIsSubmitting(true);
    setShowSubmitDialog(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const unattemptedCountOriginal = test.questions.filter(q => !answers[q.id]).length;

    let score = 0;
    let positiveScore = 0;
    let negativeScore = 0;
    let correctCount = 0;
    let partialCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;

    // SECTION ATTEMPT CONTROL FILTERING
    let finalAnswers = { ...answers };
    if (test.enable_section_mode && test.sections) {
      const filteredAnswers: Record<number, string | string[]> = {};

      test.sections.forEach(section => {
        const sectionQIds = section.questions.map((q: any) => q.id);
        const sectionAnswers = Object.entries(answers)
          .filter(([qId]) => sectionQIds.includes(Number(qId)))
          .map(([qId, ans]) => ({ id: Number(qId), ans }));

        const control = (section as any).attempt_control;
        if (control && control.mode === 'soft') {
          const max = control.max_attempts || 0;
          if (sectionAnswers.length > max) {
            if (control.soft_type === 'first_n') {
              // Group answers by question order in section
              sectionAnswers.sort((a, b) => sectionQIds.indexOf(a.id) - sectionQIds.indexOf(b.id));
              sectionAnswers.slice(0, max).forEach(item => {
                filteredAnswers[item.id] = item.ans;
              });
            } else if (control.soft_type === 'best_n') {
              // This is TRICKY. We need to calculate score per question FIRST to pick best.
              // Let's create a scored list for this section
              const scoredSectionAnswers = sectionAnswers.map(item => {
                const q = section.questions.find((sq: any) => sq.id === item.id);
                // Simple score calculation (reusing logic from below but simplified)
                let itemScore = 0;
                const sectionMarks = parseMark((section as any).marks_per_question, 4);
                const sectionNegative = parseMark((section as any).negative_marks, 1);

                if (q.type === 'numerical') {
                  const numAns = parseFloat(item.ans as string);
                  const range = q.correctAnswer as { min: number, max: number };
                  if (!isNaN(numAns) && range && typeof range === 'object' && numAns >= range.min && numAns <= range.max) itemScore = sectionMarks;
                  else itemScore = -sectionNegative;
                } else if (q.type === 'multiple') {
                  const correctArr = (Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer]).map(String).sort();
                  const userArr = (Array.isArray(item.ans) ? item.ans : [item.ans]).map(String).sort();
                  if (userArr.some(ans => !correctArr.includes(ans))) itemScore = -sectionNegative;
                  else if (userArr.length === correctArr.length) itemScore = sectionMarks;
                  else if (userArr.length > 0) itemScore = (userArr.length / correctArr.length) * sectionMarks;
                } else {
                  if (item.ans === q.correctAnswer) itemScore = sectionMarks;
                  else itemScore = -sectionNegative;
                }
                return { ...item, score: itemScore };
              });

              // Sort by score descending
              scoredSectionAnswers.sort((a, b) => b.score - a.score);
              scoredSectionAnswers.slice(0, max).forEach(item => {
                filteredAnswers[item.id] = item.ans;
              });
            }
          } else {
            sectionAnswers.forEach(item => {
              filteredAnswers[item.id] = item.ans;
            });
          }
        } else {
          // No control or Hard mode (already validated or truncated)
          sectionAnswers.forEach(item => {
            filteredAnswers[item.id] = item.ans;
          });
        }
      });
      finalAnswers = filteredAnswers;
    }

    test.questions.forEach((q, index) => {
      let isCorrect = false;
      const userAns = finalAnswers[q.id];

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

    const startKey = `test_start_time_${user?.id || 'anon'}_${test.id}`;
    let startTimeStr = localStorage.getItem(startKey);
    if (!startTimeStr) {
      const elapsed = (test.duration || 0) * 60 - timeRemaining;
      startTimeStr = new Date(Date.now() - elapsed * 1000).toISOString();
    }

    const metadata: Record<string, any> = {
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
      submittedAt: new Date().toISOString(),
      startedAt: startTimeStr
    };

    // Tag as conduct exam attempt so creator dashboard can filter correctly
    if (test.settings?.conduct_exam?.enabled) {
      metadata.conduct_exam = true;
    }

    const finalScore = (isNaN(score) || !isFinite(score)) ? 0 : parseFloat(score.toFixed(2));

    // Compute exact completion percentage based on visited questions instead of defaulting to 100
    const totalQ = test.questions?.length || 1;
    const finalCompletionPercentage = Math.round((visited.size / totalQ) * 100);

    // ANONYMOUS SUBMISSION
    if (!user) {
      // Submit to dedicated anon table — correctly marks this session as submitted
      await analyticsApi.submitAnonAttempt(id || test.id, finalAnswers as Record<string, any>, finalScore);
      toast.info('Test Submitted (Anonymous Mode). Result not saved to history.');

      // Exit Full Screen if active
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (err) {
          console.error("Error exiting full screen:", err);
        }
      }

      // Handle Result Visibility
      if (test.settings?.show_results_immediate === false) {
        navigate('/test-submitted', { replace: true });
      } else {
        navigate('/results', {
          state: {
            test: test,
            answers: answers,
            score: score,
            totalQuestions: test.questions.length,
            marksPerQuestion: test.marks_per_question || 4,
            negativeMark: test.negative_marks !== undefined ? test.negative_marks : 1,
            justSubmitted: true
          },
          replace: true
        });
      }
      return;
    }

    let retryToastId: string | number | undefined;
    const { error } = await saveAttemptWithRetry(
      user.id, test.id, answers, finalScore, metadata, finalCompletionPercentage,
      (attempt) => {
        // Show a "Retrying..." toast on 2nd attempt onwards
        const msg = `Connection issue — retrying submission (${attempt}/5)...`;
        if (retryToastId) toast.dismiss(retryToastId);
        retryToastId = toast.loading(msg, { duration: 10_000 });
      }
    );
    if (retryToastId) toast.dismiss(retryToastId);

    if (error) {
      console.error("Save Attempt Error:", error);

      // Detailed error for admin debugging
      const errorMsg = error?.response?.data?.detail
        || error?.response?.data?.message
        || error?.message
        || (typeof error === 'string' ? error : JSON.stringify(error, Object.getOwnPropertyNames(error)));

      window.alert(`Submission Error Log (Take Screenshot):\n\n${JSON.stringify(error?.response?.data || error, null, 2)}\n\nMessage: ${errorMsg}`);
      toast.error('Failed to save results. See popup for details.', { duration: 10000 });
      setIsSubmitting(false);
    } else {
      // ─── Success: clear all saved state ────────────────────────────────
      localStorage.removeItem(`test_session_${user.id}_${test.id}`);
      localStorage.removeItem(`test_start_time_${user.id}_${test.id}`);
      sessionStorage.removeItem(`test_active_${user.id}_${test.id}`);
      sessionStorage.removeItem(`vault_emergency_${user.id}_${test.id}`);
      AnswerVault.clear(user.id, test.id); // clean IndexedDB vault
      // Mark this test as submitted — prevents student going back to live test page
      try {
        localStorage.setItem(`test_submitted_${user.id}_${test.id}`, 'true');
      } catch (e) {
        console.warn("Storage quota exceeded, could not save submission marker", e);
      }

      // Exit Full Screen if active
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (err) {
          console.error("Error exiting full screen:", err);
        }
      }

      // ── COMBINED MODE HANDLING ──────────────────────────────
      if (isCombinedMode && combinedSessionId) {
        // Get combined session context
        let sessionCtx: any = null;
        try { sessionCtx = JSON.parse(sessionStorage.getItem(`combined_active_${combinedSessionId}`) || 'null'); } catch { }

        // Compute total marks for this test
        let totalMaxMarks = 0;
        if (test.total_max_marks !== undefined) {
          totalMaxMarks = test.total_max_marks;
        } else {
          const qs = test.enable_section_mode
            ? test.sections?.flatMap((s: any) => s.questions || []) || []
            : test.questions || [];
          totalMaxMarks = qs.reduce((acc: number, q: any) => acc + parseMark(q.marks ?? test.marks_per_question ?? 4, 4), 0);
        }

        if (combinedPaper === 1) {
          // Paper 1 done → go to break screen
          toast.success('Paper I Submitted! Enjoy your break.');
          navigate(`/combined-break/${combinedSessionId}`, {
            state: {
              paper1Answers: finalAnswers,
              paper1Score: finalScore,
              paper1TotalMarks: totalMaxMarks,
              paper1TestId: test.id,
              paper1TestTitle: test.title,
              paper1Test: test,
              paper2TestId: sessionCtx?.test2Id,
              sessionTitle: sessionCtx?.sessionTitle || combinedState.sessionTitle,
              paper2Label: sessionCtx?.paper2Label || combinedState.paper2Label,
              breakDuration: sessionCtx?.breakDuration || 30,
            },
            replace: true
          });
        } else if (combinedPaper === 2) {
          // Paper 2 done → retrieve Paper 1 data and show combined results
          let p1Data: any = null;
          try { p1Data = JSON.parse(sessionStorage.getItem(`combined_p1_${combinedSessionId}`) || 'null'); } catch { }

          if (!p1Data) {
            toast.warning('Could not retrieve Paper I results. Showing Paper II results only.');
            navigate('/results', {
              state: { test, answers: finalAnswers, score: finalScore, justSubmitted: true },
              replace: true
            });
            return;
          }

          // Save combined attempt to DB
          try {
            const { saveCombinedAttempt } = await import('@/lib/combinedSessionsApi');
            await saveCombinedAttempt({
              user_id: user.id,
              combined_session_id: combinedSessionId,
              paper1_data: {
                test_id: p1Data.test_id,
                answers: p1Data.answers,
                score: p1Data.score,
                total_marks: p1Data.total_marks,
                test_title: p1Data.test_title,
              },
              paper2_data: {
                test_id: test.id,
                answers: finalAnswers,
                score: finalScore,
                total_marks: totalMaxMarks,
                test_title: test.title,
              },
              total_score: (p1Data.score || 0) + finalScore,
            });
          } catch (saveErr) {
            console.error('Failed to save combined attempt:', saveErr);
          }

          // Clean up sessionStorage
          sessionStorage.removeItem(`combined_p1_${combinedSessionId}`);
          sessionStorage.removeItem(`combined_active_${combinedSessionId}`);

          toast.success('Both papers completed! Here are your combined results.');
          navigate('/results', {
            state: {
              isCombined: true,
              combinedSessionId,
              sessionTitle: sessionCtx?.sessionTitle || combinedState.sessionTitle || 'Combined Test',
              paper1Label: sessionCtx?.paper1Label || combinedState.paper1Label || 'Paper I',
              paper2Label: sessionCtx?.paper2Label || combinedState.paper2Label || 'Paper II',
              p1: {
                test: p1Data.test,
                answers: p1Data.answers,
                score: p1Data.score,
                totalMarks: p1Data.total_marks,
              },
              p2: {
                test,
                answers: finalAnswers,
                score: finalScore,
                totalMarks: totalMaxMarks,
              },
              justSubmitted: true,
            },
            replace: true
          });
        }
        return;
      }
      // ── END COMBINED MODE ───────────────────────────────────

      toast.success('Test Submitted Successfully!');
      // Handle Result Visibility
      if (test.settings?.show_results_immediate === false) {
        // Navigate to thank you page when results are hidden
        navigate('/test-submitted', { replace: true });
      } else {
        navigate('/results', {
          state: {
            test: test,
            answers: answers,
            score: score,
            totalQuestions: test.questions.length,
            marksPerQuestion: test.marks_per_question || 4,
            negativeMark: test.negative_marks !== undefined ? test.negative_marks : 1,
            justSubmitted: true
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-950 p-6">
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl mb-2">
              <Clock className="h-6 w-6 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Preparing Your Test
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
              We're setting up your exam environment...
            </p>
          </div>

          <div className="space-y-4">
            <Progress value={loadingProgress} className="h-2.5 bg-indigo-100 dark:bg-indigo-950" />
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-indigo-500">
              <span className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></div>
                Loading Questions
              </span>
              <span>{Math.round(loadingProgress)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500/20 animate-shimmer"
                  style={{ animationDelay: `${i * 0.2}s`, width: '100%' }}
                ></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (!test) return <div className="p-8 text-center">Test not found.</div>;
  if (!test.questions || test.questions.length === 0) return <div className="p-8 text-center">This test has no questions.</div>;

  // Safety Check for Question Index (e.g. from bad Resume Data)
  if (currentQuestionIndex >= test.questions.length) {
    setCurrentQuestionIndex(0);
    return <div className="p-8 text-center">Resetting question index...</div>;
  }

  const currentQuestion = test.questions[currentQuestionIndex];
  if (!currentQuestion) return <div className="p-8 text-center">Error loading question.</div>;

  console.log("TestPage Render. ID:", id, "Test:", test?.title, "Q:", currentQuestion?.id);

  const renderReportQuestionButton = (questionId: number) => {
    const isReported = reportedQuestions.has(questionId);

    return (
      <Popover
        open={isReportPopoverOpen && currentQuestion?.id === questionId}
        onOpenChange={(open) => {
          if (!open) {
            setIsReportPopoverOpen(false);
            setReportReason('');
            setReportDetails('');
          } else {
            if (isReported) {
              toast.info("You already reported this question.");
              return;
            }
            setIsReportPopoverOpen(true);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 p-0 ml-1 ${isReported ? 'text-green-600 hover:text-green-700 bg-green-50' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
            title={isReported ? "Reported" : "Report Issue"}
          >
            <MessageSquareWarning className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2.5 z-[100] border-slate-100 shadow-md" align="end">
          <div className="space-y-2.5">
            <h4 className="font-medium text-xs text-slate-400 px-1">Report Question</h4>
            <div className="space-y-0.5">
              {['Wrong Question', 'Formatting Issue', 'Incorrect Marking', 'Content Missing', 'Other'].map(r => (
                <div
                  key={r}
                  className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs text-slate-500 transition-colors"
                  onClick={() => {
                    if (r === 'Other') {
                      setReportReason(r);
                    } else {
                      handleReportSubmit(questionId, r);
                    }
                  }}
                >
                  <div className={`w-2.5 h-2.5 rounded-full border ${reportReason === r ? 'border-slate-400 bg-slate-400' : 'border-slate-300'}`} />
                  {r}
                </div>
              ))}
            </div>
            {reportReason === 'Other' && (
              <div className="space-y-2 mt-2 px-1">
                <Textarea
                  placeholder="Describe the issue..."
                  value={reportDetails}
                  onChange={e => setReportDetails(e.target.value)}
                  className="text-xs min-h-[50px] resize-none border-slate-200 focus-visible:ring-slate-200"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full h-7 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200"
                  disabled={isReporting || !reportDetails.trim()}
                  onClick={() => handleReportSubmit(questionId, 'Other', reportDetails)}
                >
                  {isReporting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

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

  if (!isExamStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-300">

          <div className="text-center space-y-2">
            <div className="inline-flex p-3.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl mb-2">
              <BookOpen className="w-7 h-7" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {test?.title || "Examination Gateway"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Please review the guidelines below before beginning your attempt.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-center space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Questions</span>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {test?.questions?.length || 0}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-center space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Duration</span>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {test?.duration ? `${test.duration}m` : "N/A"}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-center space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Passing Marks</span>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {test?.passing_marks || "N/A"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Important Rules:</h3>
            <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
              <div className="flex gap-3 text-sm text-slate-600 dark:text-slate-400">
                <TriangleAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Do Not Close or Switch Tabs:</span> Leaving the browser page or switching tabs might trigger cheating warnings or auto-submit your exam.
                </div>

              </div>
              <div className="flex gap-3 text-sm text-slate-600 dark:text-slate-400">
                <Clock className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Continuous Timer:</span> Once started, the countdown timer cannot be paused or stopped under any circumstances.
                </div>
              </div>
              <div className="flex gap-3 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Auto-Save Active:</span> Your answers are continuously synced and saved to the cloud, allowing recovery in case of connection failure.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full sm:w-1/3 py-6 text-sm font-bold rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Exit Portal
            </Button>
            <Button
              onClick={() => {
                setIsExamStarted(true);
                // Trigger full screen request on start if required
                if (test?.settings?.force_fullscreen) {
                  enterFullScreen();
                }
              }}
              className="w-full sm:w-2/3 py-6 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              Start Examination Now
            </Button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Institution Branding Bar */}
      {(test.institution_name || test.institution_logo) && (
        <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-4 py-1 flex items-center justify-center gap-3">
          {test.institution_logo && (
            <img src={test.institution_logo} alt="Institution Logo" className="h-9 w-auto object-contain" />
          )}
          {test.institution_name && (
            <span className="text-xl font-bold" style={{ color: test.institution_color || '#475569', fontFamily: test.institution_font || 'inherit' }}>{test.institution_name}</span>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-4 py-2.5 md:px-5 md:py-2.5 relative md:sticky top-0 z-10 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-0">
        {/* Left Side: Test Title (Dim, grayish, aesthetic) */}
        <div className="flex items-center justify-between gap-0 w-full md:w-auto md:max-w-[40%] md:flex-1">
          <div className="text-[13px] md:text-sm font-medium text-slate-400 tracking-wide truncate text-left">
            {test?.title || "Live Test"}
          </div>

          {/* Mobile Full Screen Button (Visible only on phone screens) */}
          <button
            onClick={(e) => {
              e.preventDefault();
              enterFullScreen();
            }}
            className="md:hidden flex items-center justify-center p-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0 -mr-3"
            title="Enter Full Screen"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Side: Timer & Controls */}
        <div className="flex items-center justify-between md:justify-end gap-1.5 md:gap-3 w-full md:w-auto mt-0.5 md:mt-0">

          {/* Desktop Full Screen Button (Hidden on mobile) */}
          <button
            onClick={(e) => {
              e.preventDefault();
              enterFullScreen();
            }}
            className="hidden md:flex items-center justify-center p-1.5 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
            title="Enter Full Screen"
          >
            <Maximize className="w-4 h-4 md:w-4.5 md:h-4.5" />
          </button>

          {/* Timer Block */}
          {(() => {
            const isCriticalTime = timeRemaining < 300;
            const shouldShow = !isTimeHidden || isCriticalTime;

            if (isTimerDisabled) {
              return (
                <div className="flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-[11px] md:text-xs font-semibold border transition-colors bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="min-w-[40px] md:min-w-[45px] text-center font-medium">
                    No Time Limit
                  </span>
                </div>
              );
            }

            return (
              <div className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-[11px] md:text-xs font-semibold border transition-colors ${isCriticalTime ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50/80 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}>
                <Clock className={`w-3.5 h-3.5 ${isCriticalTime ? 'animate-pulse text-red-500' : 'text-slate-400'}`} />
                <span className="min-w-[40px] md:min-w-[45px] text-center font-mono">
                  {shouldShow ? formatTime(timeRemaining) : '**:**'}
                </span>
                <button
                  className="flex items-center justify-center p-0.5 rounded-full text-slate-400 hover:text-slate-600 disabled:opacity-50 transition-colors"
                  onClick={() => setIsTimeHidden(!isTimeHidden)}
                  disabled={isCriticalTime}
                  title={isCriticalTime ? "Time cannot be hidden (less than 5m left)" : (isTimeHidden ? "Show Time" : "Hide Time")}
                >
                  {shouldShow ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            );
          })()}

          {/* Warning Counter - Security Violations */}
          {((test?.settings?.tab_switch_mode && test?.settings?.tab_switch_mode !== 'off') || test?.settings?.force_fullscreen) && (
            <div className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-[11px] md:text-xs font-bold border transition-colors ${warnings > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              <TriangleAlert className={`w-3.5 h-3.5 ${warnings > 0 ? 'fill-red-100 text-red-600' : 'fill-amber-100 text-amber-600'}`} />
              <span>
                {test.settings?.tab_switch_mode === 'strict'
                  ? `${warnings}/1`
                  : `${warnings}/3`
                }
              </span>
            </div>
          )}

          {test.has_scientific_calculator && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex h-7 w-7 md:h-8 md:w-8 p-0 rounded-full text-slate-500 hover:text-slate-700"
                title="Scientific Calculator"
                onClick={() => setIsCalculatorOpen(true)}
              >
                <Calculator className="w-4 h-4" />
              </Button>
              <ScientificCalculator
                onClose={() => setIsCalculatorOpen(false)}
                className={isCalculatorOpen ? '' : 'hidden'}
              />
            </>
          )}

          {!test.settings?.disable_exit_button && (
            <>
              {/* Connection health dot — always visible, beside Exit button */}
              <span
                className={`inline-block w-2 h-2 rounded-full transition-colors shrink-0 ${connectionStatus === 'online' ? 'bg-emerald-400' :
                  connectionStatus === 'offline' ? 'bg-red-400 animate-pulse' :
                    'bg-amber-400 animate-pulse'
                  }`}
                title={connectionStatus === 'online' ? 'Connected' : connectionStatus === 'offline' ? 'No internet — answers saved locally' : 'Reconnecting...'}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 md:h-8 rounded-full px-3 md:px-4 text-[11px] md:text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                onClick={() => setShowExitDialog(true)}
              >
                Exit
              </Button>
            </>
          )}

          <Button onClick={attemptSubmit} disabled={isSubmitting} variant="destructive" size="sm" className="h-7 md:h-8 rounded-full px-3 md:px-4 text-[11px] md:text-xs font-semibold shadow-sm ml-auto md:ml-0 overflow-hidden shrink-0">
            Submit Test
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-row relative">
        {/* Main Question Area (Left Panel) */}
        <div className={`
          flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 relative transition-all duration-300 ease-in-out
        `}>
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Collapse Toggle Button (Desktop Only) */}
            <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 z-50 translate-x-1/2">
              <Button
                size="icon"
                variant="secondary"
                onClick={() => setIsPaletteCollapsed(!isPaletteCollapsed)}
                className="h-8 w-8 rounded-full shadow-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600"
                title={isPaletteCollapsed ? "Expand Palette" : "Collapse Palette"}
              >
                {isPaletteCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
            {/* Section Tabs */}
            {test.enable_section_mode && test.sections && (
              <div className="flex-none flex gap-2 p-2 overflow-x-auto bg-white dark:bg-slate-900 scrollbar-hide">
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
                        title={section.name}
                        className={`
                                flex items-center justify-between gap-2 px-4 py-2 text-sm font-bold border transition-colors whitespace-nowrap min-w-[140px]
                                ${isActive
                            ? 'bg-[#0073E6] text-white border-[#0073E6]'
                            : 'bg-white text-[#0073E6] border-slate-300 hover:bg-blue-50'}
                            `}
                      >
                        <span className="truncate">{section.name}</span>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Info
                                className={`w-4 h-4 cursor-pointer hover:scale-110 active:scale-95 transition-transform ${isActive ? 'text-white/80' : 'text-[#0073E6]/70'}`}
                              />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2 text-sm max-w-[200px]" side="top">
                              <p className="font-semibold text-center">{section.name}</p>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            )}

            {/* Mobile Palette Trigger (Floating Action Button) */}
            <div className="lg:hidden fixed bottom-[55px] right-0 z-50">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    size="icon"
                    className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-transform hover:scale-105"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[80%] sm:w-[380px] flex flex-col h-full">
                  <SheetHeader>
                    <SheetTitle>Questions</SheetTitle>
                  </SheetHeader>
                  <div className="py-4 flex-1 overflow-y-auto pb-6">
                    {/* Legend - Above Palette */}
                    <div className="mb-4">
                      <div className="grid grid-cols-2 gap-y-2 mb-2 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-2"><div className="w-5 h-5 bg-white border border-slate-200 rounded-md text-[9px] flex items-center justify-center font-bold">1</div> Not Visited</div>
                        <div className="flex items-center gap-2"><div className="w-5 h-5 bg-red-500 border border-red-600 rounded-md text-[9px] flex items-center justify-center font-bold text-white">2</div> Not Answered</div>
                        <div className="flex items-center gap-2"><div className="w-5 h-5 bg-green-500 border border-green-600 rounded-md text-[9px] flex items-center justify-center font-bold text-white">3</div> Answered</div>
                        <div className="flex items-center gap-2"><div className="w-5 h-5 bg-purple-600 border border-purple-700 rounded-md text-[9px] flex items-center justify-center font-bold text-white">4</div> Review</div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-purple-600 border border-purple-700 rounded-md text-[9px] flex items-center justify-center font-bold text-white relative">
                            5
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full"><CheckCircle className="w-2.5 h-2.5 text-green-500 fill-white" /></div>
                          </div>
                          <span className="ml-2">Ans & Review</span>
                        </div>
                      </div>
                      <hr className="border-slate-200 dark:border-slate-700" />
                    </div>

                    <QuestionPalette onQuestionClick={() => setIsMobileMenuOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {currentQuestion.passageContent ? (
              /* SPLIT VIEW FOR COMPREHENSION */
              /* SPLIT VIEW FOR COMPREHENSION */
              <div className="flex-1 w-full overflow-y-visible lg:overflow-hidden flex flex-col lg:flex-row gap-2 lg:gap-4 pb-0 p-1 pt-1 lg:pt-1">
                {/* Passage Pane (Desktop) */}
                <div className="hidden lg:block w-1/2 h-full overflow-y-auto bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-800 shadow-sm custom-scrollbar">
                  <div className="p-4 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-sm">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px]">Passage</span>
                    </h3>
                  </div>
                  <div className="p-6 text-base leading-relaxed text-slate-800 dark:text-slate-200 [&_a]:pointer-events-none [&_a]:cursor-text [&_a]:no-underline [&_a]:text-current">
                    <LatexRenderer>{currentQuestion.passageContent}</LatexRenderer>
                  </div>
                </div>

                {/* Question Pane */}
                <div className="flex-1 h-auto lg:h-full lg:overflow-y-auto lg:pr-2 overflow-y-visible">
                  {/* Mobile Passage (Full View) */}
                  <div className="lg:hidden bg-white p-4 rounded-lg border mb-4 shadow-sm">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Passage</div>
                    <div className="text-[15px] leading-relaxed h-auto bg-slate-50 p-4 rounded-lg border border-slate-100 [&_a]:pointer-events-none [&_a]:cursor-text [&_a]:no-underline [&_a]:text-current">
                      <LatexRenderer>{currentQuestion.passageContent}</LatexRenderer>
                    </div>
                  </div>

                  <Card className="min-h-[400px] shadow-sm border-0 bg-white dark:bg-slate-900 w-full h-auto block">
                    <CardContent className="p-3 md:p-4 gap-2 flex flex-col h-auto">
                      {/* Question Header */}
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">Question {currentQuestionIndex + 1}</span>
                          <span className="inline-flex items-center rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                            {currentQuestion.type === 'multiple' ? 'Multiple Choice' :
                              currentQuestion.type === 'numerical' ? 'Numerical' :
                                currentQuestion.type === 'comprehension' ? 'Passage' : 'Single Choice'}
                          </span>
                        </div>

                        {(() => {
                          // 1. Determine Fallback Pattern (Section Default or Test Default)
                          let fallbackMarks = 4;
                          let fallbackNeg = 1;
                          let targetQ = currentQuestion; // Default to flat question
                          let forceSectionMarks = false;

                          if (test.enable_section_mode && test.sections) {
                            const markingModel = test.section_marking_model || 'section-wise';
                            if (markingModel === 'section-wise') {
                              forceSectionMarks = true;
                            }

                            let runningCount = 0;
                            for (const section of test.sections) {
                              if (currentQuestionIndex >= runningCount && currentQuestionIndex < runningCount + section.questions.length) {
                                fallbackMarks = parseMark(section.marks_per_question, 4);
                                fallbackNeg = parseMark(section.negative_marks, 1);
                                const localIdx = currentQuestionIndex - runningCount;
                                if (section.questions[localIdx]) {
                                  targetQ = section.questions[localIdx];
                                }
                                break;
                              }
                              runningCount += section.questions.length;
                            }
                          } else {
                            fallbackMarks = parseMark(test.marks_per_question, 4);
                            fallbackNeg = parseMark(test.negative_marks, 1);
                          }

                          const marksVal = forceSectionMarks
                            ? fallbackMarks
                            : parseMark(targetQ.marks, fallbackMarks);

                          const negVal = forceSectionMarks
                            ? fallbackNeg
                            : parseMark(targetQ.negativeMarks, fallbackNeg);

                          return (
                            <div className="flex items-center gap-1">
                              <div className="text-xs font-medium flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">
                                <span className="text-emerald-700">+{parseFloat(marksVal.toFixed(2))}</span>
                                <span className="text-slate-300">|</span>
                                <span className="text-red-600">-{parseFloat(negVal.toFixed(2))}</span>
                              </div>
                              {renderReportQuestionButton(targetQ.id)}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Divider */}
                      <hr className="border-slate-200 mb-3" />

                      {/* Question Text */}
                      <div
                        className="relative text-slate-800 dark:text-slate-200 font-medium leading-relaxed break-words px-2 py-4 md:px-4 rounded-lg selection:bg-blue-100 selection:text-blue-900 tracking-wide [word-spacing:1.5px] [&_.katex]:[word-spacing:normal]"
                        style={{ fontSize: `${fontSize}px` }}
                      >
                        {/* Subtle Font Size Adjuster */}
                        <div className="absolute -top-3 -right-2 flex items-center gap-0 opacity-10 hover:opacity-100 transition-opacity z-10 print:hidden">
                          <button
                            onClick={() => setFontSize(prev => Math.max(12, prev - 2))}
                            className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Decrease font size"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setFontSize(prev => Math.min(32, prev + 2))}
                            className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Increase font size"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="overflow-x-auto max-w-full">
                          <LatexRenderer>{currentQuestion.question}</LatexRenderer>
                        </div>
                      </div>

                      {/* Question Image */}
                      {currentQuestion.image && (
                        <div className="mb-8 flex justify-center">
                          <img
                            src={currentQuestion.image.trim()}
                            alt={`Question ${currentQuestionIndex + 1}`}
                            referrerPolicy="no-referrer"
                            className="max-w-full max-h-[400px] rounded-lg border border-slate-200 shadow-sm object-contain bg-white"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {/* Options Area */}
                      <div className="space-y-4 mt-6">
                        {currentQuestion.type !== 'numerical' && (
                          <div className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">Options</div>
                        )}
                        {currentQuestion.type === 'numerical' ? (
                          <div className="flex flex-col gap-4">
                            <div className="max-w-xs">
                              <Label className="mb-2 block text-slate-600">Your Answer</Label>
                              <Input
                                type="text"
                                inputMode="none"
                                placeholder="Enter value"
                                value={answers[currentQuestion.id] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (!/^-?\d*\.?\d*$/.test(val)) return;
                                  const currentAns = answers[currentQuestion.id];
                                  const isCurrentlyAnswered = currentAns !== undefined && currentAns !== '';
                                  if (val !== '' && !isCurrentlyAnswered) {
                                    if (!checkAttemptLimit(currentQuestion.id)) return;
                                  }
                                  setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
                                }}
                                className="text-lg bg-white dark:bg-slate-950 dark:border-slate-800 h-12 focus-visible:ring-blue-500 font-bold"
                              />
                            </div>
                            <VirtualNumericPad
                              onKeyPress={(key) => handleNumericKeypadPress(key, currentQuestion.id)}
                              className="max-w-[280px]"
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
                                className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all group relative
                                                 ${isSelected
                                    ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20'
                                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 bg-white'}
                                             `}
                              >
                                <div className={`h-7 w-7 flex items-center justify-center font-bold text-sm border shrink-0 transition-colors mt-0.5
                                                 ${currentQuestion.type === 'multiple' ? 'rounded-md' : 'rounded-full'}
                                                 ${isSelected
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-slate-50 text-slate-500 border-slate-200 group-hover:border-blue-400 group-hover:text-blue-600'}
                                             `}>
                                  {currentQuestion.type === 'multiple' && isSelected ? <CheckCircle className="w-4 h-4" /> : key}
                                </div>

                                <div className="flex-1 flex flex-col gap-2">
                                  {text && (
                                    <div
                                      className="text-slate-700 dark:text-slate-300 leading-relaxed max-w-[95%] break-words pt-0.5"
                                      style={{ fontSize: `${Math.max(14, fontSize - 2)}px` }}
                                    >
                                      <LatexRenderer>{text}</LatexRenderer>
                                    </div>
                                  )}
                                  {optionImage && (
                                    <img
                                      src={optionImage.trim()}
                                      alt={`Option ${key}`}
                                      referrerPolicy="no-referrer"
                                      className="max-w-[200px] max-h-[200px] rounded-md border border-slate-200 object-contain bg-white"
                                      onError={(e) => {
                                        const target = e.currentTarget;
                                        target.style.display = 'none';
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
              /* STANDARD VIEW */
              <div className="flex-1 w-full h-auto flex flex-col gap-2 lg:gap-6 lg:pr-2 pb-4 px-0 py-1 lg:px-1 lg:pt-1 overflow-y-visible overflow-x-hidden">
                <Card className="min-h-[500px] shadow-none border-none bg-transparent w-full h-auto block">
                  <CardContent className="p-3 md:p-4 gap-2 flex flex-col h-auto">
                    {/* Question Header */}
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">Question {currentQuestionIndex + 1}</span>
                        <span className="inline-flex items-center rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                          {currentQuestion.type === 'multiple' ? 'Multiple Choice' :
                            currentQuestion.type === 'numerical' ? 'Numerical' :
                              currentQuestion.type === 'comprehension' ? 'Passage' : 'Single Choice'}
                        </span>
                      </div>

                      {(() => {
                        const getDisplayVal = (val: any, fallback: string | number) => {
                          if (val !== undefined && val !== null && val !== '') return val;
                          return fallback;
                        };

                        let marks = getDisplayVal(test.marks_per_question, 4);
                        let neg = getDisplayVal(test.negative_marks, 1);

                        if (test.enable_section_mode && test.sections) {
                          let runningCount = 0;
                          for (const section of test.sections) {
                            if (currentQuestionIndex >= runningCount && currentQuestionIndex < runningCount + section.questions.length) {
                              marks = getDisplayVal(section.marks_per_question, 4);
                              neg = getDisplayVal(section.negative_marks, 1);
                              const localIdx = currentQuestionIndex - runningCount;
                              if (section.questions[localIdx]) {
                                const qMarks = section.questions[localIdx].marks;
                                const qNeg = section.questions[localIdx].negativeMarks;
                                if (qMarks !== undefined && qMarks !== '') marks = qMarks;
                                if (qNeg !== undefined && qNeg !== '') neg = qNeg;
                              }
                              break;
                            }
                            runningCount += section.questions.length;
                          }
                        } else {
                          const qMarks = currentQuestion.marks;
                          const qNeg = currentQuestion.negativeMarks;
                          if (qMarks !== undefined && qMarks !== '') marks = qMarks;
                          if (qNeg !== undefined && qNeg !== '') neg = qNeg;
                        }

                        return (
                          <div className="flex items-center gap-1">
                            <div className="text-xs font-medium flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">
                              <span className="text-emerald-700">+{marks}</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-red-600">-{neg}</span>
                            </div>
                            {renderReportQuestionButton(currentQuestion.id)}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Divider */}
                    <hr className="border-slate-200 mb-3" />

                    {/* Question Text */}
                    {/* Question Text */}
                    <div
                      className="relative text-slate-800 dark:text-slate-200 font-medium leading-relaxed break-words px-2 py-4 md:px-4 rounded-lg selection:bg-blue-100 selection:text-blue-900 tracking-wide [word-spacing:1.5px] [&_.katex]:[word-spacing:normal]"
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {/* Subtle Font Size Adjuster */}
                      <div className="absolute -top-4 -right-1 flex items-center gap-0 opacity-10 hover:opacity-100 transition-opacity z-10 print:hidden">
                        <button
                          onClick={() => setFontSize(prev => Math.max(12, prev - 2))}
                          className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Decrease font size"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setFontSize(prev => Math.min(32, prev + 2))}
                          className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Increase font size"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="overflow-x-auto max-w-full">
                        <LatexRenderer>{currentQuestion.question}</LatexRenderer>
                      </div>
                    </div>

                    {/* Question Image */}
                    {currentQuestion.image && (
                      <div className="mb-8 flex justify-center">
                        <img
                          src={currentQuestion.image.trim()}
                          alt={`Question ${currentQuestionIndex + 1}`}
                          referrerPolicy="no-referrer"
                          className="max-w-full max-h-[400px] rounded-lg border border-slate-200 shadow-sm object-contain bg-white"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Options Area */}
                    <div className="space-y-4 mt-6">
                      {currentQuestion.type !== 'numerical' && (
                        <div className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">Options</div>
                      )}
                      {currentQuestion.type === 'numerical' ? (
                        <div className="flex flex-col gap-4">
                          <div className="max-w-xs">
                            <Label className="mb-2 block text-slate-600">Your Answer</Label>
                            <Input
                              type="text"
                              inputMode="none"
                              placeholder="Enter value"
                              value={answers[currentQuestion.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!/^-?\d*\.?\d*$/.test(val)) return;
                                const currentAns = answers[currentQuestion.id];
                                const isCurrentlyAnswered = currentAns !== undefined && currentAns !== '';
                                if (val !== '' && !isCurrentlyAnswered) {
                                  if (!checkAttemptLimit(currentQuestion.id)) return;
                                }
                                setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
                              }}
                              className="text-lg bg-white dark:bg-slate-950 dark:border-slate-800 h-12 focus-visible:ring-blue-500 font-bold"
                            />
                          </div>
                          <VirtualNumericPad
                            onKeyPress={(key) => handleNumericKeypadPress(key, currentQuestion.id)}
                            className="max-w-[280px]"
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
                                  const isCurrentlyAnswered = newAnswers.length > 0;

                                  if (newAnswers.includes(key)) {
                                    newAnswers.splice(newAnswers.indexOf(key), 1);
                                  } else {
                                    newAnswers.push(key);
                                  }

                                  const willBeAnswered = newAnswers.length > 0;
                                  if (!isCurrentlyAnswered && willBeAnswered) {
                                    if (!checkAttemptLimit(currentQuestion.id)) return;
                                  }

                                  newAnswers.sort();
                                  setAnswers(prev => ({ ...prev, [currentQuestion.id]: newAnswers }));
                                } else {
                                  handleAnswerSelect(currentQuestion.id, key);
                                }
                              }}
                              className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all group relative
                                                 ${isSelected
                                  ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20'
                                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 bg-white'}
                                             `}
                            >
                              {/* Option Key (A, B, C...) */}
                              <div className={`h-7 w-7 flex items-center justify-center font-bold text-sm border shrink-0 transition-colors mt-0.5
                                                 ${currentQuestion.type === 'multiple' ? 'rounded-md' : 'rounded-full'}
                                                 ${isSelected
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-slate-50 text-slate-500 border-slate-200 group-hover:border-blue-400 group-hover:text-blue-600'}
                                             `}>
                                {currentQuestion.type === 'multiple' && isSelected ? <CheckCircle className="w-4 h-4" /> : key}
                              </div>

                              {/* Option Text/Image */}
                              <div className="flex-1 flex flex-col gap-2">
                                {text && (
                                  <div
                                    className="text-slate-700 dark:text-slate-300 leading-relaxed max-w-[95%] break-words pt-0.5"
                                    style={{ fontSize: `${Math.max(14, fontSize - 2)}px` }}
                                  >
                                    <LatexRenderer>{text}</LatexRenderer>
                                  </div>
                                )}
                                {optionImage && (
                                  <img
                                    src={optionImage.trim()}
                                    alt={`Option ${key}`}
                                    referrerPolicy="no-referrer"
                                    className="max-w-[200px] max-h-[200px] rounded-md border border-slate-200 object-contain bg-white"
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
          </div>

          {/* Bottom Controls */}
          {/* Fixed Bottom for Mobile, Absolute for Desktop Column */}
          {/* Bottom Controls - Static at bottom of Left Panel */}
          <div className="flex-none z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-2 transition-all">
            <div className="flex items-center justify-between gap-2 md:gap-4">
              <div className="flex gap-2 md:gap-3 justify-between w-full">
                {/* Previous (Back Icon) */}
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  size={window.innerWidth < 768 ? "default" : "icon"}
                  className="h-9 w-9 md:w-9 flex-1 md:flex-none"
                  title="Previous Question"
                >
                  <ChevronLeft className="w-6 h-6 mr-1 md:mr-0" />
                  <span className="md:hidden">Back</span>
                </Button>

                <div className="flex gap-2 flex-[2] md:flex-none justify-end">
                  {/* Clear Response */}
                  <Button
                    variant="outline"
                    onClick={() => handleClearResponse(currentQuestion.id)}
                    disabled={!answers[currentQuestion.id]}
                    size="sm"
                    className="text-muted-foreground border-dashed md:border-solid md:text-slate-600 md:hover:text-slate-900 h-9"
                  >
                    <span>Clear</span>
                  </Button>

                  {/* Mobile-Only Flag Button */}
                  <Button
                    variant={markedForReview.has(currentQuestion.id) ? "secondary" : "outline"}
                    onClick={() => {
                      if (answers[currentQuestion.id]) {
                        handleSaveAndMarkReview();
                      } else {
                        toggleMarkForReview(currentQuestion.id);
                      }
                    }}
                    className={`
                      md:hidden h-9 px-3 transition-all
                      ${answers[currentQuestion.id]
                        ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                        : markedForReview.has(currentQuestion.id)
                          ? "border-purple-200 bg-purple-50 text-purple-800"
                          : "text-slate-600 border-slate-200"}
                    `}
                    title="Flag Question"
                    size="sm"
                  >
                    <Flag className={`w-4 h-4 ${markedForReview.has(currentQuestion.id) ? "fill-current" : ""}`} />
                  </Button>

                  {/* Desktop-Only Mark for Review */}
                  <Button
                    variant={markedForReview.has(currentQuestion.id) ? "secondary" : "ghost"}
                    onClick={() => toggleMarkForReview(currentQuestion.id)}
                    className={`
                      hidden md:flex
                      ${markedForReview.has(currentQuestion.id)
                        ? "border-purple-200 bg-purple-50 text-purple-800"
                        : "text-slate-600 hover:text-slate-900"}
                    `}
                    title="Mark for Review"
                    size="sm"
                  >
                    <Flag className={`w-4 h-4 ${markedForReview.has(currentQuestion.id) ? "md:mr-2 fill-purple-500 text-purple-500" : ""}`} />
                    <span>Review</span>
                  </Button>

                  {/* Desktop-Only Save & Mark for Review */}
                  <Button
                    onClick={handleSaveAndMarkReview}
                    size="sm"
                    disabled={!answers[currentQuestion.id]}
                    className={`
                      hidden md:flex px-3 md:px-4 md:py-1 h-9 text-white transition-all
                      ${!answers[currentQuestion.id]
                        ? "bg-purple-300 dark:bg-purple-900/50 cursor-not-allowed opacity-70"
                        : "bg-purple-600 hover:bg-purple-700"}
                    `}
                  >
                    <span>Ans & Review</span>
                  </Button>

                  {/* Save & Next (Blue) */}
                  <Button
                    onClick={handleSaveAndNext}
                    size="sm"
                    className="bg-[#0073E6] hover:bg-[#005fb8] text-white px-3 md:px-4 md:py-1 h-9"
                    disabled={false}  // Enabled for all, handler checks if last
                  >
                    <span className="hidden md:inline mr-2">Save & Next</span>
                    <span className="md:hidden">Save & Next</span>
                    <ChevronRight className="w-4 h-4 ml-0.5 md:ml-0" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Spacer removed as bottom bar is static */}
        </div>

        {/* Right Side Palette (Desktop) - Independently Scrollable (Right Panel) */}
        {!isPaletteCollapsed && (
          <div
            className="hidden lg:block w-1 hover:bg-blue-400 cursor-col-resize z-50 transition-colors bg-transparent active:bg-blue-600"
            onMouseDown={startResizing}
          />
        )}
        <div
          style={{ width: isPaletteCollapsed ? 0 : paletteWidth }}
          className={`
            flex-none h-full overflow-hidden border-l dark:border-slate-800 transition-all duration-300 ease-in-out
            ${isPaletteCollapsed ? 'opacity-0 pointer-events-none border-l-0' : 'opacity-100 hidden lg:flex flex-col'}
        `}>

          <Card className="h-full flex flex-col shadow-md border-t-4 border-t-slate-500 dark:border-t-slate-600 bg-white dark:bg-slate-900 border-x dark:border-x-slate-800 border-b dark:border-b-slate-800">
            <CardContent className="p-4 flex-1 overflow-y-auto overflow-x-hidden">
              <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">Question Palette</h3>

              <div className="mb-4">
                <div className="grid grid-cols-2 gap-2 mb-2 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-2"><div className="w-5 h-5 bg-white border border-slate-200 rounded-md text-[9px] flex items-center justify-center font-bold">1</div> Not Visited</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 bg-red-500 border border-red-600 rounded-md text-[9px] flex items-center justify-center font-bold text-white clip-polygon-answer">2</div> Not Ans</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 bg-green-500 border border-green-600 rounded-md text-[9px] flex items-center justify-center font-bold text-white">3</div> Answered</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 bg-purple-600 border border-purple-700 rounded-md text-[9px] flex items-center justify-center font-bold text-white">4</div> Review</div>
                  <div className="flex items-center gap-2 relative">
                    <div className="w-5 h-5 bg-purple-600 border border-purple-700 rounded-md text-[9px] flex items-center justify-center font-bold text-white relative">
                      5
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full"><CheckCircle className="w-2.5 h-2.5 text-green-500 fill-white" /></div>
                    </div>
                    <span className="ml-2 leading-tight">Ans & Review</span>
                  </div>
                </div>
                <hr className="border-slate-200 dark:border-slate-700" />
              </div>

              <QuestionPalette />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <p>Are you sure you want to finish the test? You cannot change your answers after submitting.</p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 p-3 rounded-md border text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total Questions</div>
                    <div className="text-xl font-bold text-slate-800">{test.questions.length}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-md border border-green-100 text-center">
                    <div className="text-xs text-green-600 uppercase font-bold tracking-wider mb-1">Answered</div>
                    <div className="text-xl font-bold text-green-700">{Object.keys(answers).length}</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-md border border-purple-100 text-center">
                    <div className="text-xs text-purple-600 uppercase font-bold tracking-wider mb-1">Marked for Review</div>
                    <div className="text-xl font-bold text-purple-700">{markedForReview.size}</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-md border border-red-100 text-center">
                    <div className="text-xs text-red-600 uppercase font-bold tracking-wider mb-1">Unanswered</div>
                    <div className="text-xl font-bold text-red-700">{test.questions.length - Object.keys(answers).length}</div>
                  </div>
                </div>
              </div>
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

      {/* Full Screen Warning Dialog */}
      <AlertDialog open={showFullScreenWarning}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2 text-xl font-bold uppercase tracking-tight">
              <Maximize className="w-6 h-6 stroke-[2.5px]" /> Full Screen Required
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-700 dark:text-slate-300">
              This test must be taken in Full Screen mode for proctoring purposes. Please return to full screen to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800 my-4">
            <div className="flex items-center gap-2 mb-3 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <ScrollText className="w-4 h-4" /> Full Screen Working Log
            </div>
            <div className="max-h-32 overflow-y-auto space-y-2 custom-scrollbar pr-2">
              {fullScreenLogs.length === 0 ? (
                <div className="text-slate-400 text-sm italic py-2 text-center">No events recorded.</div>
              ) : (
                fullScreenLogs.slice().reverse().map((log, i) => (
                  <div key={i} className="flex justify-between items-center text-xs border-b border-slate-200 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
                    <span className={`flex items-center gap-1.5 ${log.event === 'Exit Full Screen' ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${log.event === 'Exit Full Screen' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                      {log.event}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                enterFullScreen();
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-11 text-base shadow-md"
            >
              <Maximize2 className="w-5 h-5" /> Return to Full Screen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* General Violation Warning Dialog */}
      <AlertDialog open={violationWarningData.show}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2 text-xl font-bold uppercase tracking-tight">
              <TriangleAlert className="w-6 h-6 stroke-[2.5px]" /> {violationWarningData.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-700 dark:text-slate-300">
              {violationWarningData.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setViolationWarningData(prev => ({ ...prev, show: false }))}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-11 text-base shadow-md"
            >
              Understand & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExitFeedbackDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
        testId={id || test.id}
        userId={user?.id}
        onConfirmExit={() => navigate('/')}
      />

      {isSubmitting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-2xl flex flex-col items-center border dark:border-slate-800">
            <Loader2 className="h-12 w-12 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Submitting Test...</h2>
            <p className="text-slate-500 dark:text-slate-400 text-center">Please stay on this page.<br />Finalizing your answers.</p>
          </div>
        </div>
      )}
    </div >
  );
}
