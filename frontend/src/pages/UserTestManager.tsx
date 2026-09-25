import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Loader2, Pencil, Plus, Radio, Settings, BarChart3, Link as LinkIcon, X, GraduationCap, Search, Inbox,
    CheckCircle, AlertTriangle, Copy, Share2, Globe, Lock, Info, Trash2, MoreHorizontal, Check, FileText,
    FilePlus2, ListChecks, Clock, Users, Square, History, ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import { fetchTestsByUserId, updateTest, deleteTest } from '@/lib/testsApi';
import { fetchClasses } from '@/lib/classesApi';
import { fetchUserDetails } from '@/lib/usersApi';
import { fetchCategories } from '@/lib/categoriesApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchCreatorReports, updateReportStatus, Report } from "@/lib/reportsApi";
import { shareTest } from '@/utils/shareUtils';
import TestSettingsPanel from '@/components/TestSettingsPanel';
import TestResultsPanel from '@/components/TestResultsPanel';
import ConductExamDialog from '@/components/ConductExamDialog';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { UserTestCard, UserTestCardSkeleton, StatusPill } from '@/components/UserTestCard';
import { useYouTubeStyleRender } from '@/hooks/useYouTubeStyleRender';
import CreatorDashboardTour from '@/components/CreatorDashboardTour';
import SplashLoader from '@/components/ui/SplashLoader';
import { CurrentGoalWidget } from '@/components/CurrentGoalWidget';
import { fetchCreatorRewards, CreatorRewardsStats } from '@/lib/rewardsApi';

/* Shared control styles — iOS-flavoured, in the landing page's sky palette. */
const PRIMARY_BTN =
    'inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary text-[15px] font-semibold text-white ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_24px_-12px_rgba(2,132,199,0.85)] ' +
    'transition-[background-color,transform] duration-150 hover:bg-[hsl(200,95%,30%)] motion-safe:active:scale-[0.97] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2 cursor-pointer';
const PILL_BTN =
    'inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-[13px] font-semibold text-slate-700 ' +
    'transition-[background-color,transform] duration-150 hover:bg-slate-200/80 motion-safe:active:scale-[0.97] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 cursor-pointer';
const MENU_TRIGGER =
    'flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 data-[state=open]:bg-slate-100 data-[state=open]:text-slate-900 cursor-pointer';
const SEGMENT =
    'h-9 rounded-[9px] px-4 text-sm font-semibold text-slate-600 transition-all hover:text-slate-900 ' +
    'data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-[0_1px_3px_rgba(15,23,42,0.12),0_1px_1px_rgba(15,23,42,0.04)]';

const GUIDE_DISMISSED_KEY = 'testoza_mytests_guide_dismissed';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const isProctoringEnabled = (test: any) => {
    const s = test?.settings;
    if (!s) return false;
    return !!(
        s.force_fullscreen ||
        (s.tab_switch_mode && s.tab_switch_mode !== 'off') ||
        s.disable_copy_paste ||
        s.disable_actions ||
        s.block_back_button ||
        s.disable_exit_button
    );
};

export default function UserTestManager() {
    const { user, profile, isAdmin, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Tab state synced with URL ?tab=reports
    const [activeTab, setActiveTab] = useState<string>(() => {
        const searchParams = new URLSearchParams(window.location.search);
        return searchParams.get('tab') === 'reports' ? 'reports' : 'tests';
    });

    const [selectedReportTestId, setSelectedReportTestId] = useState<string | null>(() => {
        const searchParams = new URLSearchParams(window.location.search);
        return searchParams.get('testId');
    });

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const currentTab = searchParams.get('tab');
        const testIdParam = searchParams.get('testId');
        setSelectedReportTestId(testIdParam);

        if (currentTab === 'reports') {
            setActiveTab('reports');
            loadReports();
        } else {
            setActiveTab('tests');
        }
    }, [location.search]);

    // Impersonation check
    const queryParams = new URLSearchParams(window.location.search);
    const impersonateUserId = queryParams.get("userId");
    const targetUserId = (isAdmin && impersonateUserId) ? impersonateUserId : user?.id;
    const [targetUserProfile, setTargetUserProfile] = useState<any>(() => {
        if (!(isAdmin && impersonateUserId) && profile) {
            return profile;
        }
        return null;
    });

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const abortControllerRef = React.useRef<AbortController | null>(null);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Tests State
    const [tests, setTests] = useState<any[]>([]);
    const [testsLoading, setTestsLoading] = useState(true);
    const pageRef = React.useRef(1);
    const [hasMore, setHasMore] = useState(true);
    const {
        registerSkeleton,
        isItemRendered,
    } = useYouTubeStyleRender(tests, testsLoading, {
        rootMargin: '100px',
        threshold: 0.1
    });
    const observerTarget = React.useRef<HTMLDivElement | null>(null);
    const [isTestEditOpen, setIsTestEditOpen] = useState(false);
    const [editingTest, setEditingTest] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteTitle, setDeleteTitle] = useState("");

    // Category State
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("none");
    const [isNewCategoryMode, setIsNewCategoryMode] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    const [configuringTest, setConfiguringTest] = useState<any>(null);
    const [viewingResultsTest, setViewingResultsTest] = useState<any>(null);

    // Conduct Exam State
    const [conductExamTest, setConductExamTest] = useState<any>(null);
    const [conductExamLoading, setConductExamLoading] = useState(false);
    const [removeExamId, setRemoveExamId] = useState<string | null>(null);
    const [removeExamTitle, setRemoveExamTitle] = useState("");
    const [removeInfoOpen, setRemoveInfoOpen] = useState<'public' | 'private' | null>(null);
    const [removeExamSource, setRemoveExamSource] = useState<'active' | 'inactive' | null>(null);

    const [showEnvPopupTestId, setShowEnvPopupTestId] = useState<string | null>(null);

    useEffect(() => {
        if (showEnvPopupTestId) {
            const timer = setTimeout(() => {
                setShowEnvPopupTestId(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showEnvPopupTestId]);

    // Creator Check State
    const [isCreator, setIsCreator] = useState<boolean | null>(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const impersonateUserId = queryParams.get("userId");
        if (!(isAdmin && impersonateUserId) && profile) {
            return profile.is_creator;
        }
        return null;
    });
    const [checkingCreator, setCheckingCreator] = useState(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const impersonateUserId = queryParams.get("userId");
        if (!(isAdmin && impersonateUserId) && profile) {
            return false; // Already preloaded via AuthContext profile
        }
        return true;
    });

    const [classes, setClasses] = useState<any[]>([]);

    // Creator Rewards State
    const [rewardsStats, setRewardsStats] = useState<CreatorRewardsStats | null>(null);
    const [rewardsLoading, setRewardsLoading] = useState(true);

    useEffect(() => {
        if (targetUserId) {
            setRewardsLoading(true);
            fetchCreatorRewards(targetUserId).then(({ data }) => {
                setRewardsStats(data);
                setRewardsLoading(false);
            });
        }
    }, [targetUserId]);

    // Reports State
    const [reports, setReports] = useState<Report[]>([]);
    const [reportsLoading, setReportsLoading] = useState(false);

    const [showTour, setShowTour] = useState(false);

    const checkCreatorStatus = async () => {
        if (!targetUserId) {
            setCheckingCreator(false);
            return;
        }

        // If not impersonating and we already have the profile data, load it immediately
        if (targetUserId === user?.id && profile) {
            setIsCreator(profile.is_creator);
            setTargetUserProfile(profile);
            setCheckingCreator(false);
            return;
        }

        setCheckingCreator(true);
        try {
            const { data } = await fetchUserDetails(targetUserId);
            if (data) {
                setIsCreator(data.is_creator);
                setTargetUserProfile(data);
            }
        } catch (err) {
            console.error("Failed to check creator status:", err);
        } finally {
            setCheckingCreator(false);
        }
    };

    const loadClasses = async () => {
        if (!targetUserId) return;
        const { data } = await fetchClasses(targetUserId);
        if (data) setClasses(data);
    };

    const loadCategories = async () => {
        const { data } = await fetchCategories();
        if (data) setCategories(data);
    };

    const loadReports = async () => {
        if (!targetUserId) return;
        setReportsLoading(true);
        const { data, error } = await fetchCreatorReports(targetUserId);
        if (error) {
            toast.error("Failed to load reports");
        } else {
            setReports(data || []);
        }
        setReportsLoading(false);
    };

    const handleResolveReport = async (reportId: string) => {
        const { error } = await updateReportStatus(reportId, 'solved');
        if (error) {
            toast.error("Failed to resolve report");
        } else {
            toast.success("Report marked as solved");
            loadReports();
        }
    };

    useEffect(() => {
        if (targetUserId) {
            loadReports();
        }
    }, [targetUserId]);

    const unresolvedReportsByTestId = React.useMemo(() => {
        const map: Record<string, number> = {};
        reports.forEach(r => {
            if (r.status === 'open' && r.test_id) {
                map[r.test_id] = (map[r.test_id] || 0) + 1;
            }
        });
        return map;
    }, [reports]);

    const handleOpenTestReports = (test: any) => {
        setSelectedReportTestId(test?.id || null);
        setActiveTab('reports');
        const searchParams = new URLSearchParams(location.search);
        searchParams.set('tab', 'reports');
        if (test?.id) {
            searchParams.set('testId', test.id);
        } else {
            searchParams.delete('testId');
        }
        navigate(`/my-tests?${searchParams.toString()}`);
        loadReports();
    };

    const loadUserTests = React.useCallback(async (reset = false) => {
        if (!targetUserId) return;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        if (reset) {
            pageRef.current = 1;
        }
        const pageToLoad = pageRef.current;

        setTestsLoading(true);
        try {
            const completed = localStorage.getItem(`creator_dashboard_tour_completed_${targetUserId}`) === 'true';
            const { data, meta, error } = await fetchTestsByUserId(targetUserId, {
                page: pageToLoad,
                limit: 9,
                searchQuery: debouncedSearchQuery,
                tourCompleted: completed,
                signal: controller.signal
            });
            if (error) throw error;

            const fetchedTests = data || [];
            if (reset) {
                setTests(fetchedTests);
                pageRef.current = 2;
                setHasMore(meta?.has_more ?? (fetchedTests.length === 9));
            } else {
                setTests(prev => [...prev, ...fetchedTests]);
                pageRef.current = pageRef.current + 1;
                setHasMore(meta?.has_more ?? (fetchedTests.length === 9));
            }
        } catch (error: any) {
            if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') return;
            console.error('Error loading tests:', error);
            toast.error("Failed to load tests");
        } finally {
            if (abortControllerRef.current === controller) {
                setTestsLoading(false);
            }
        }
    }, [targetUserId, debouncedSearchQuery]);

    useEffect(() => {
        if (user?.id) {
            const completed = localStorage.getItem(`creator_dashboard_tour_completed_${user.id}`) === 'true';
            setShowTour(!completed);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && !user) {
            setCheckingCreator(false);
            navigate('/login?redirect=/my-tests');
            return;
        } else if (impersonateUserId && !isAdmin) {
            toast.error("You are not authorized to view this user's dashboard.");
            navigate('/my-tests', { replace: true });
        } else if (targetUserId) {
            checkCreatorStatus();
            loadCategories();
            loadClasses();
            loadReports();
        }
    }, [targetUserId, impersonateUserId, isAdmin, authLoading, navigate, profile]);

    useEffect(() => {
        if (targetUserId) {
            loadUserTests(true);
        }
    }, [targetUserId]);

    const isFirstSearchRef = React.useRef(true);
    useEffect(() => {
        if (isFirstSearchRef.current) {
            isFirstSearchRef.current = false;
            return;
        }
        if (targetUserId) {
            loadUserTests(true);
        }
    }, [debouncedSearchQuery]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !testsLoading) {
                    loadUserTests(false);
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [hasMore, testsLoading, loadUserTests]);

    const handleDeleteTest = (testId: string, testTitle: string) => {
        setDeleteId(testId);
        setDeleteTitle(testTitle);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            const { error } = await deleteTest(deleteId);
            if (error) throw error;
            setTests(prev => prev.filter(t => t.id !== deleteId));
            toast.success(`Test "${deleteTitle}" deleted`);
            setDeleteId(null);
        } catch (error: any) {
            console.error('Error deleting test:', error);
            toast.error('Failed to delete test: ' + error.message);
        }
    };

    const openTestEditor = (test: any) => {
        if (isAdmin && impersonateUserId) {
            navigate(`/edit-test/${test.id}?userId=${impersonateUserId}`);
        } else {
            navigate(`/edit-test/${test.id}`);
        }
    };

    const handleVisibilityChange = async (test: any, newVisibility: 'public' | 'private') => {
        // Only allow public or private — no unlisted directly
        const isPublic = newVisibility === 'public';
        const oldVisibility = test.visibility;

        const restoredSlug = isPublic
            ? (test.custom_id || test.id)
            : `unlisted-${test.custom_id || test.id}`;

        let updatedSettings = test.settings
            ? { ...test.settings, conduct_exam: undefined }
            : test.settings;

        if (isPublic && updatedSettings) {
            updatedSettings = {
                ...updatedSettings,
                force_fullscreen: false,
                tab_switch_mode: 'off',
                disable_copy_paste: false,
                disable_actions: false,
                block_back_button: false,
            };
        }

        // Optimistic update
        setTests(prev => prev.map(t =>
            t.id === test.id
                ? { ...t, visibility: newVisibility, is_public: isPublic, slug: restoredSlug, settings: updatedSettings }
                : t
        ));

        try {
            const payload: any = {
                visibility: newVisibility,
                is_public: isPublic,
            };
            if (restoredSlug !== test.slug) payload.slug = restoredSlug;
            if (updatedSettings !== test.settings) payload.settings = updatedSettings;

            const { error } = await updateTest(test.id, payload, isAdmin);
            if (error) throw error;
            toast.success(`Visibility updated to ${newVisibility}`);
        } catch (error: any) {
            console.error("Failed to update visibility:", error);
            toast.error("Failed to update visibility");
            setTests(prev => prev.map(t =>
                t.id === test.id ? { ...t, visibility: oldVisibility, is_public: test.is_public, slug: test.slug, settings: test.settings } : t
            ));
        }
    };

    const handleShare = (test: any) => {
        shareTest(test);
    };

    const handleUploadSolutions = (test: any) => {
        if (isAdmin && impersonateUserId) {
            navigate(`/solutions-editor/${test.id}?userId=${impersonateUserId}`);
        } else {
            navigate(`/solutions-editor/${test.id}`);
        }
    };

    const handleClassChange = async (test: any, classId: string | null) => {
        const oldClassId = test.class_id;
        setTests(prev => prev.map(t => t.id === test.id ? { ...t, class_id: classId } : t));

        const { error } = await updateTest(test.id, { class_id: classId }, isAdmin);
        if (error) {
            console.error("Failed to update class:", error);
            toast.error("Failed to update class assignment");
            setTests(prev => prev.map(t => t.id === test.id ? { ...t, class_id: oldClassId } : t));
        } else {
            toast.success(classId ? "Class assigned" : "Class removed");
        }
    };

    // ─── Conduct Exam ──────────────────────────────────────────────
    const handleConductExam = (test: any) => {
        setConductExamTest(test);
    };

    const confirmConductExam = async (conductSlug: string) => {
        if (!conductExamTest) return;
        setConductExamLoading(true);
        try {
            // Preserve original slug (only if test was public and had a slug)
            const originalSlug = conductExamTest.visibility === 'public' && conductExamTest.slug
                ? conductExamTest.slug
                : (conductExamTest.settings?.conduct_exam?.original_slug || null);

            const nowIso = new Date().toISOString();
            const newSettings = {
                ...(conductExamTest.settings || {}),
                conduct_exam: {
                    enabled: true,
                    conduct_slug: conductSlug,
                    original_slug: originalSlug,
                    started_at: nowIso,
                }
            };

            // If the test has an expired schedule, clear it when starting a live conduct exam
            if (newSettings.schedule?.end_time && new Date(newSettings.schedule.end_time) < new Date()) {
                delete newSettings.schedule;
            }

            const payload = {
                visibility: 'unlisted' as const,
                is_public: false,
                slug: conductSlug,
                settings: newSettings,
            };

            // Optimistic update
            setTests(prev => prev.map(t =>
                t.id === conductExamTest.id
                    ? { ...t, ...payload }
                    : t
            ));

            const { error } = await updateTest(conductExamTest.id, payload, isAdmin);
            if (error) throw error;

            toast.success("Exam is now live! Share the secure link with students.");
            setShowEnvPopupTestId(conductExamTest.id);
            setConductExamTest(null);
        } catch (error: any) {
            console.error("Failed to start exam:", error);
            toast.error("Failed to start exam: " + error.message);
            // revert
            setTests(prev => prev.map(t =>
                t.id === conductExamTest.id ? { ...t, ...conductExamTest } : t
            ));
        } finally {
            setConductExamLoading(false);
        }
    };

    const DEFAULT_ENVIRONMENT_SETTINGS = {
        attempt_limit: undefined,
        strict_timer: false,
        allow_flexible_timer: true,
        tab_switch_mode: 'off' as const,
        disable_copy_paste: false,
        disable_actions: false,
        force_fullscreen: false,
        block_back_button: false,
        disable_exit_button: false,
        shuffle_questions: false,
        show_results_immediate: true,
        schedule: { enabled: false },
        start_form: { enabled: false, fields: [] },
    };

    // Remove from ACTIVE container → move to Inactive as private (no dialog)
    const handleRemoveFromActive = async (testId: string) => {
        const test = tests.find(t => t.id === testId);
        if (!test) return;

        const resetSettings = {
            ...DEFAULT_ENVIRONMENT_SETTINGS,
            conduct_exam: { ...(test.settings?.conduct_exam || {}), enabled: false, ended_at: new Date().toISOString() }
        };

        const payload: any = {
            visibility: 'private',
            is_public: false,
            class_id: null,
            slug: `unlisted-${test.custom_id || test.id}`,
            settings: resetSettings,
        };

        // Optimistic update
        setTests(prev => prev.map(t => t.id === testId ? { ...t, ...payload } : t));

        try {
            const { error } = await updateTest(testId, payload, isAdmin);
            if (error) throw error;
            toast.success('Exam stopped. Reset to default settings and moved to Inactive (Private).');
        } catch (error: any) {
            toast.error('Failed to stop exam: ' + error.message);
            setTests(prev => prev.map(t => t.id === testId ? { ...t, ...test } : t));
        }
    };

    // Remove from INACTIVE container → show public/private choice dialog
    const handleRemoveFromInactive = (testId: string, testTitle: string) => {
        setRemoveExamId(testId);
        setRemoveExamTitle(testTitle);
        setRemoveExamSource('inactive');
    };

    // Legacy handler used by the hamburger menus and the "Remove" button
    const handleRemoveExam = async (testId: string, testTitle: string) => {
        const test = tests.find(t => t.id === testId);
        if (!test) return;

        const isActive = test.settings?.conduct_exam?.enabled === true;

        if (isActive) {
            // Active exam → move directly to inactive as private
            await handleRemoveFromActive(testId);
        } else {
            // Inactive exam → show public/private dialog
            handleRemoveFromInactive(testId, testTitle);
        }
    };

    // Confirm removal from inactive → fully remove conduct_exam settings, set visibility
    const confirmRemoveExamById = async (testId: string, makePublic: boolean) => {
        const test = tests.find(t => t.id === testId);
        if (!test) return;

        const resetSettings = {
            ...DEFAULT_ENVIRONMENT_SETTINGS,
        };

        const payload: any = {
            visibility: makePublic ? 'public' : 'private',
            is_public: makePublic,
            class_id: null,
            settings: resetSettings,
            slug: makePublic ? (test.custom_id || test.id) : `unlisted-${test.custom_id || test.id}`,
        };

        setTests(prev => prev.map(t => t.id === testId ? { ...t, ...payload } : t));
        setRemoveExamId(null);
        setRemoveExamSource(null);

        try {
            const { error } = await updateTest(testId, payload, isAdmin);
            if (error) throw error;
            toast.success(`Exam removed. Reset to default settings and set to ${makePublic ? 'public' : 'private'}.`);
        } catch (error: any) {
            toast.error('Failed to remove exam: ' + error.message);
            setTests(prev => prev.map(t => t.id === testId ? { ...t, ...test } : t));
        }
    };

    const confirmRemoveExam = async (makePublic: boolean = false) => {
        if (!removeExamId) return;
        await confirmRemoveExamById(removeExamId, makePublic);
    };

    // Auto-transition: when a scheduled exam ends, move it to inactive with private mode.
    // Declared above the early returns below so the hook count never changes between renders.
    const autoDeactivatedRef = React.useRef<Set<string>>(new Set());
    useEffect(() => {
        const currentNow = new Date();
        const endedActiveExams = tests.filter(t =>
            t.settings?.conduct_exam?.enabled === true &&
            t.settings?.schedule?.enabled === true &&
            t.settings?.schedule?.end_time &&
            new Date(t.settings.schedule.end_time) < currentNow &&
            !autoDeactivatedRef.current.has(t.id)
        );

        if (endedActiveExams.length === 0) return;

        endedActiveExams.forEach(async (test) => {
            autoDeactivatedRef.current.add(test.id);

            const resetSettings = {
                ...DEFAULT_ENVIRONMENT_SETTINGS,
                conduct_exam: { ...(test.settings?.conduct_exam || {}), enabled: false, ended_at: new Date().toISOString() }
            };

            const payload: any = {
                visibility: 'private',
                is_public: false,
                class_id: null,
                slug: `unlisted-${test.custom_id || test.id}`,
                settings: resetSettings,
            };

            // Optimistic update
            setTests(prev => prev.map(t => t.id === test.id ? { ...t, ...payload } : t));

            try {
                await updateTest(test.id, payload, isAdmin);
                toast.info(`"${test.title}" has ended and moved to Inactive.`);
            } catch (err) {
                console.error('Failed to auto-deactivate ended exam:', err);
                autoDeactivatedRef.current.delete(test.id);
            }
        });
    }, [tests]);

    // "How it works" strip — shown until the creator dismisses it once.
    const [guideDismissed, setGuideDismissed] = useState(() => {
        try {
            return localStorage.getItem(GUIDE_DISMISSED_KEY) === 'true';
        } catch {
            return false;
        }
    });
    const dismissGuide = () => {
        setGuideDismissed(true);
        try {
            localStorage.setItem(GUIDE_DISMISSED_KEY, 'true');
        } catch {
            // Storage blocked (private mode) — hiding for this visit is enough.
        }
    };

    const [showEnded, setShowEnded] = useState(false);

    if (authLoading || checkingCreator) return <SplashLoader text="Checking permissions..." />;
    if (!user) return null;

    // Non-creator lock screen
    if (isCreator === false) {
        return (
            <div className="relative flex min-h-[80vh] w-full items-center justify-center overflow-hidden px-4">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none overflow-hidden opacity-60 blur-sm">
                    <div className="mx-auto max-w-5xl px-6 pt-16">
                        <div className="mb-8 h-9 w-48 rounded-xl bg-slate-200" />
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                            {[1, 2, 3].map(i => <UserTestCardSkeleton key={i} />)}
                        </div>
                    </div>
                </div>
                <div className="relative z-10 w-full max-w-md rounded-3xl bg-white/90 p-8 text-center shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/[0.06] backdrop-blur-xl">
                    <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/15 to-sky-500/5 text-sky-700 ring-1 ring-inset ring-sky-500/20">
                        <Pencil className="h-6 w-6" />
                    </span>
                    <h2 className="text-2xl font-bold tracking-[-0.02em] text-slate-900">Turn on your creator profile</h2>
                    <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                        To create, publish and conduct tests, switch on <strong className="font-semibold text-slate-900">Creator Profile</strong> from your profile page.
                    </p>
                    <button type="button" className={`${PRIMARY_BTN} mt-6 h-12 w-full justify-center`} onClick={() => navigate('/profile')}>
                        Go to profile
                    </button>
                </div>
            </div>
        );
    }

    const now = new Date();
    const hasEnded = (test: any) => {
        if (test.computed_status === 'inactive' && test.settings?.conduct_exam?.enabled) return true;
        if (!test.settings?.schedule?.enabled) return false;
        if (!test.settings?.schedule?.end_time) return false;
        return new Date(test.settings.schedule.end_time) < now;
    };

    const isUpcoming = (test: any) => {
        if (test.computed_status === 'upcoming') return true;
        if (!test.settings?.schedule?.enabled) return false;
        if (!test.settings?.schedule?.start_time) return false;
        return new Date(test.settings.schedule.start_time) > now;
    };

    const hasConductSettings = (t: any) => t.settings?.conduct_exam !== undefined;

    // Active = conduct enabled AND currently in active window (not ended and not upcoming)
    const activeExams = tests.filter(t =>
        hasConductSettings(t) &&
        t.settings.conduct_exam.enabled === true &&
        !hasEnded(t) &&
        !isUpcoming(t)
    );
    // Inactive = conduct settings exist AND (explicitly disabled OR schedule ended)
    const inactiveExams = tests.filter(t =>
        hasConductSettings(t) &&
        (t.settings.conduct_exam.enabled !== true || hasEnded(t))
    );

    const openReportsCount = reports.filter(r => r.status === 'open').length;
    const visibleReports = selectedReportTestId ? reports.filter(r => r.test_id === selectedReportTestId) : reports;

    const goToCreateTest = () => {
        if (isAdmin && impersonateUserId) {
            navigate(`/create-test?userId=${impersonateUserId}`);
        } else {
            navigate('/create-test');
        }
    };

    const clearReportFilter = () => {
        setSelectedReportTestId(null);
        const searchParams = new URLSearchParams(location.search);
        searchParams.delete('testId');
        navigate(`/my-tests?${searchParams.toString()}`);
    };

    const viewTest = (t: any) => {
        if (t.settings?.conduct_exam?.enabled) {
            const conductSlug = t.settings.conduct_exam.conduct_slug || t.slug;
            navigate(`/test/${conductSlug}`);
        } else if (t.visibility === 'private' || !t.is_public) {
            navigate(`/test/${t.slug || `unlisted-${t.custom_id || t.id}`}`);
        } else {
            navigate(`/test-intro/${t.id}`);
        }
    };

    // Shared "•••" menu for rows in the Live and Ended lists.
    const renderExamMenu = (test: any, source: 'active' | 'inactive') => {
        const reportsCount = unresolvedReportsByTestId[test.id] || 0;
        return (
            <DropdownMenu>
                <div className="relative inline-flex shrink-0">
                    <DropdownMenuTrigger asChild>
                        <button type="button" aria-label="More options" className={MENU_TRIGGER}>
                            <MoreHorizontal className="h-[18px] w-[18px]" />
                        </button>
                    </DropdownMenuTrigger>
                    {reportsCount > 0 && (
                        <span className="pointer-events-none absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                    )}
                </div>
                <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5">
                    <DropdownMenuItem className="rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900" onClick={() => setViewingResultsTest(test)}>
                        <BarChart3 className="mr-2.5 h-4 w-4 text-slate-500" /> Results
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenTestReports(test)} className="flex items-center justify-between rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900 cursor-pointer">
                        <span className="flex items-center">
                            <Inbox className="mr-2.5 h-4 w-4 text-slate-500" /> Student reports
                        </span>
                        {reportsCount > 0 && (
                            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                                {reportsCount}
                            </span>
                        )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900" onClick={() => openTestEditor(test)}>
                        <Pencil className="mr-2.5 h-4 w-4 text-slate-500" /> Edit questions
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900" onClick={() => setConfiguringTest(test)}>
                        <Settings className="mr-2.5 h-4 w-4 text-slate-500" /> Settings
                    </DropdownMenuItem>
                    {source === 'active' && (
                        <DropdownMenuItem className="rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900" onClick={() => handleShare(test)}>
                            <LinkIcon className="mr-2.5 h-4 w-4 text-slate-500" /> Share link
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900" onClick={() => handleUploadSolutions(test)}>
                        <FileText className="mr-2.5 h-4 w-4 text-slate-500" /> Upload solutions
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900 data-[state=open]:bg-slate-100 data-[state=open]:text-slate-900">
                            <GraduationCap className="mr-2.5 h-4 w-4 text-slate-500" /> Assign to class
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="max-h-60 overflow-y-auto rounded-xl p-1.5">
                            <DropdownMenuItem className="rounded-lg focus:bg-slate-100 focus:text-slate-900" onClick={() => handleClassChange(test, null)}>
                                <span className="text-slate-500">No class</span>
                                {!test.class_id && <Check className="ml-auto h-4 w-4 text-sky-600" />}
                            </DropdownMenuItem>
                            {classes.map(cls => (
                                <DropdownMenuItem className="rounded-lg focus:bg-slate-100 focus:text-slate-900" key={cls.id} onClick={() => handleClassChange(test, cls.id)}>
                                    {cls.name}
                                    {test.class_id === cls.id && <Check className="ml-auto h-4 w-4 text-sky-600" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    {source === 'active' ? (
                        <DropdownMenuItem onClick={() => handleRemoveFromActive(test.id)} className="rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900 text-red-600 focus:bg-red-50 focus:text-red-600">
                            <Square className="mr-2.5 h-4 w-4" /> Stop exam
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem onClick={() => handleRemoveFromInactive(test.id, test.title)} className="rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900 text-red-600 focus:bg-red-50 focus:text-red-600">
                            <X className="mr-2.5 h-4 w-4" /> Remove from ended list
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleDeleteTest(test.id, test.title)} className="rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900 font-semibold text-red-700 focus:bg-red-50 focus:text-red-700">
                        <Trash2 className="mr-2.5 h-4 w-4" /> Delete test
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };

    return (
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8 lg:px-8">
            {isAdmin && impersonateUserId && targetUserProfile && (
                <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/20">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500 motion-safe:animate-pulse" />
                    <span>
                        Viewing the creator dashboard of <strong>{targetUserProfile.full_name || targetUserProfile.email}</strong>
                    </span>
                </div>
            )}
            <Tabs
                value={activeTab}
                onValueChange={(v) => {
                    setActiveTab(v);
                    if (v === 'reports') {
                        navigate('/my-tests?tab=reports', { replace: true });
                        loadReports();
                    } else {
                        navigate('/my-tests', { replace: true });
                    }
                }}
                className="space-y-6"
            >
                {/* ── Large title + the one primary action ── */}
                <header className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Creator studio</p>
                        <h1 className="mt-1.5 text-[28px] font-bold leading-[1.1] tracking-[-0.025em] text-slate-900 sm:text-[34px]">
                            My Tests
                        </h1>
                        <p className="mt-2 hidden text-[15px] text-slate-600 sm:block">
                            Create tests, run them as live exams, and see every student's result.
                        </p>
                    </div>
                    <button type="button" onClick={goToCreateTest} className={`${PRIMARY_BTN} h-11 px-4 sm:px-5`}>
                        <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
                        <span>Create test</span>
                    </button>
                </header>

                {/* ── Segmented control + search ── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-slate-200/60 p-1 sm:inline-grid sm:w-auto">
                        <TabsTrigger value="tests" className={SEGMENT}>
                            My tests
                        </TabsTrigger>
                        <TabsTrigger value="reports" className={SEGMENT}>
                            Student reports
                            {openReportsCount > 0 && (
                                <span className="ml-1.5 min-w-[20px] rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white tabular-nums">
                                    {openReportsCount}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {activeTab === 'tests' && (
                        <div className="relative w-full sm:w-72">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <Input
                                type="search"
                                aria-label="Search your tests"
                                placeholder="Search your tests"
                                className="h-10 rounded-xl border-transparent bg-slate-200/60 pl-9 text-[15px] text-slate-900 placeholder:text-slate-500 transition-colors focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-0"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <TabsContent value="tests" className="m-0 space-y-8 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                    <div className="space-y-4">
                        <CurrentGoalWidget stats={rewardsStats} loading={rewardsLoading} />
                        {!guideDismissed && <HowItWorks onDismiss={dismissGuide} />}
                    </div>

                    {/* ═══════════════════════════════════════════════
                        LIVE EXAMS
                    ═══════════════════════════════════════════════ */}
                    {activeExams.length > 0 && (
                        <section aria-labelledby="live-exams-heading">
                            <SectionTitle id="live-exams-heading" title="Live exams" count={activeExams.length} />
                            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-emerald-600/20 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-18px_rgba(5,150,105,0.45)]">
                                <div className="flex items-center gap-2.5 border-b border-emerald-100 bg-emerald-50/70 px-4 py-2.5 text-[13px] font-medium text-emerald-800 sm:px-5">
                                    <span className="relative flex h-2 w-2 shrink-0">
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 motion-safe:animate-ping" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                    </span>
                                    <span>Students can take these right now. Only people with the link can join.</span>
                                </div>

                                <ul className="divide-y divide-slate-100">
                                    {activeExams.map(test => {
                                        const conductSlug = test.settings?.conduct_exam?.conduct_slug || test.slug;
                                        const examUrl = conductSlug
                                            ? `${window.location.origin}/test/${conductSlug}`
                                            : `${window.location.origin}/test-intro/${test.id}`;
                                        const questionCount = test.total_questions || test.questions?.length || 0;
                                        const submissionCount = test.submission_count ?? 0;

                                        return (
                                            <li key={test.id} className="p-4 sm:p-5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <h3 className="truncate text-base font-semibold tracking-[-0.01em] text-slate-900" title={test.title}>
                                                            {test.title}
                                                        </h3>
                                                        <p className="mt-1 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-slate-600">
                                                            <span className="inline-flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5 text-slate-400" />{plural(questionCount, 'question')}</span>
                                                            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-400" />{test.duration || 0} min</span>
                                                            <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-400" />{submissionCount} submitted</span>
                                                        </p>
                                                    </div>
                                                    {renderExamMenu(test, 'active')}
                                                </div>

                                                {/* Exam link */}
                                                <p className="mb-1.5 mt-4 text-xs font-medium text-slate-500">Exam link — send this to your students</p>
                                                <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1.5 pl-3">
                                                    <LinkIcon className="h-4 w-4 shrink-0 text-slate-500" />
                                                    <span className="min-w-0 flex-1 select-all truncate font-mono text-[13px] text-slate-700" title={examUrl}>
                                                        {examUrl.replace(/^https?:\/\//, '')}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        id={test.settings?.is_user_example ? "tour-copy-link-btn" : undefined}
                                                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold text-sky-700 shadow-sm ring-1 ring-slate-900/5 transition-colors hover:bg-sky-50 motion-safe:active:scale-[0.97] cursor-pointer"
                                                        onClick={async () => {
                                                            await navigator.clipboard.writeText(examUrl);
                                                            toast.success("Exam link copied!");
                                                        }}
                                                    >
                                                        <Copy className="h-3.5 w-3.5" />
                                                        <span>Copy<span className="hidden sm:inline"> link</span></span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        aria-label="Share link"
                                                        title="Share link"
                                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-900/5 transition-colors hover:bg-sky-50 hover:text-sky-700 cursor-pointer"
                                                        onClick={() => handleShare(test)}
                                                    >
                                                        <Share2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>

                                                {/* Actions */}
                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            id={test.settings?.is_user_example ? "tour-settings-btn-active" : undefined}
                                                            className={PILL_BTN}
                                                            onClick={() => setConfiguringTest(test)}
                                                        >
                                                            <Settings className="h-4 w-4 text-sky-600" /> Settings
                                                        </button>
                                                        {showEnvPopupTestId === test.id && (
                                                            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-md animate-in fade-in zoom-in-95 duration-200">
                                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                                <span>Set exam environment</span>
                                                                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-amber-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button type="button" className={PILL_BTN} onClick={() => setViewingResultsTest(test)}>
                                                        <BarChart3 className="h-4 w-4 text-sky-600" /> Results
                                                        {submissionCount > 0 && (
                                                            <span className="min-w-[20px] rounded-full bg-sky-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white tabular-nums">
                                                                {submissionCount > 99 ? '99+' : submissionCount}
                                                            </span>
                                                        )}
                                                    </button>
                                                    {!isProctoringEnabled(test) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfiguringTest(test)}
                                                            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-amber-50 px-3 text-[13px] font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20 transition-colors hover:bg-amber-100 cursor-pointer"
                                                        >
                                                            <AlertTriangle className="h-3.5 w-3.5" /> Anti-cheating is off
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFromActive(test.id)}
                                                        className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-50 cursor-pointer"
                                                    >
                                                        <Square className="h-3 w-3 fill-current" /> Stop exam
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </section>
                    )}

                    {/* ═══════════════════════════════════════════════
                        ENDED EXAMS (collapsed by default)
                    ═══════════════════════════════════════════════ */}
                    {inactiveExams.length > 0 && (
                        <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)]">
                            <button
                                type="button"
                                aria-expanded={showEnded}
                                onClick={() => setShowEnded(v => !v)}
                                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 sm:px-5 cursor-pointer"
                            >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-slate-100 text-slate-500">
                                    <History className="h-[18px] w-[18px]" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
                                        Ended exams
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">{inactiveExams.length}</span>
                                    </span>
                                    <span className="block text-[13px] text-slate-500">Results stay saved here</span>
                                </span>
                                <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${showEnded ? 'rotate-180' : ''}`} />
                            </button>

                            {showEnded && (
                                <ul className="divide-y divide-slate-100 border-t border-slate-100">
                                    {inactiveExams.map(test => {
                                        const questionCount = test.total_questions || test.questions?.length || 0;
                                        const submissionCount = test.submission_count ?? 0;

                                        return (
                                            <li key={test.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                                                <div className="min-w-0">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <span className="truncate text-[15px] font-semibold text-slate-700" title={test.title}>{test.title}</span>
                                                        <StatusPill status="ended" />
                                                    </div>
                                                    <p className="mt-0.5 text-[13px] text-slate-500">
                                                        {plural(questionCount, 'question')} · {test.duration || 0} min
                                                        {submissionCount > 0 && ` · ${submissionCount} submitted`}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <button type="button" className={PILL_BTN} onClick={() => setViewingResultsTest(test)}>
                                                        <BarChart3 className="h-4 w-4 text-sky-600" /> Results
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFromInactive(test.id, test.title)}
                                                        className="inline-flex h-9 items-center rounded-full px-3 text-[13px] font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
                                                    >
                                                        Remove
                                                    </button>
                                                    {renderExamMenu(test, 'inactive')}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </section>
                    )}

                    {/* ═══════════════════════════════════════════════
                        ALL TESTS GRID
                    ═══════════════════════════════════════════════ */}
                    <section aria-labelledby="all-tests-heading">
                        <SectionTitle
                            id="all-tests-heading"
                            title={debouncedSearchQuery ? `Results for "${debouncedSearchQuery}"` : 'All tests'}
                        />
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                            {testsLoading && tests.length === 0 ? (
                                Array.from({ length: 6 }).map((_, i) => <UserTestCardSkeleton key={i} />)
                            ) : tests.length === 0 ? (
                                debouncedSearchQuery ? (
                                    <EmptyState
                                        icon={Search}
                                        title={`No tests match "${debouncedSearchQuery}"`}
                                        body="Check the spelling, or try a shorter word from the title."
                                        action={
                                            <button type="button" className={PILL_BTN} onClick={() => setSearchQuery('')}>
                                                <X className="h-4 w-4 text-slate-500" /> Clear search
                                            </button>
                                        }
                                    />
                                ) : (
                                    <EmptyState
                                        icon={FilePlus2}
                                        title="Create your first test"
                                        body="Upload a PDF, paste your questions, or type them in. You can conduct it online as soon as it's ready."
                                        action={
                                            <button type="button" onClick={goToCreateTest} className={`${PRIMARY_BTN} h-11 px-5`}>
                                                <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} /> Create test
                                            </button>
                                        }
                                    />
                                )
                            ) : (
                                tests.map((test) => {
                                    const testId = test.id;

                                    if (!isItemRendered(testId)) {
                                        return (
                                            <div key={testId} ref={(el) => registerSkeleton(testId, el)}>
                                                <UserTestCardSkeleton />
                                            </div>
                                        );
                                    }

                                    return (
                                        <UserTestCard
                                            key={testId}
                                            test={test}
                                            classes={classes}
                                            onEdit={openTestEditor}
                                            onConfigure={setConfiguringTest}
                                            onDelete={handleDeleteTest}
                                            onVisibilityChange={handleVisibilityChange}
                                            onShare={handleShare}
                                            onUploadSolutions={handleUploadSolutions}
                                            onClassChange={handleClassChange}
                                            onViewResults={(t) => setViewingResultsTest(t)}
                                            onView={viewTest}
                                            onConductExam={handleConductExam}
                                            onViewReports={handleOpenTestReports}
                                            unresolvedReportsCount={unresolvedReportsByTestId[test.id] || 0}
                                        />
                                    );
                                })
                            )}
                        </div>

                        {/* Observer Target for Paginated Infinite Scroll */}
                        {tests.length > 0 && (
                            <div ref={observerTarget} className="mt-6 flex h-16 w-full items-center justify-center">
                                {testsLoading && (
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
                                        <span>Loading more tests...</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </TabsContent>

                <TabsContent value="reports" className="m-0 space-y-4 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold tracking-[-0.01em] text-slate-900">Student reports</h2>
                            <p className="mt-0.5 text-[13px] text-slate-600">
                                Problems students flagged in your questions. Fix the question, then mark the report solved.
                            </p>
                        </div>

                        {selectedReportTestId && (
                            <div className="flex max-w-full items-center gap-1 self-start rounded-full bg-sky-50 py-1 pl-3 pr-1 text-[13px] text-sky-800 ring-1 ring-inset ring-sky-600/15 sm:self-auto">
                                <span className="truncate">
                                    Showing: <strong className="font-semibold">{tests.find(t => t.id === selectedReportTestId)?.title || reports.find(r => r.test_id === selectedReportTestId)?.tests?.title || 'Selected test'}</strong>
                                </span>
                                <button
                                    type="button"
                                    onClick={clearReportFilter}
                                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 font-semibold text-sky-700 transition-colors hover:bg-sky-100 cursor-pointer"
                                >
                                    <X className="h-3.5 w-3.5" /> Show all
                                </button>
                            </div>
                        )}
                    </div>

                    {reportsLoading ? (
                        <div className="flex items-center justify-center gap-2 rounded-2xl bg-white py-14 text-sm text-slate-500 ring-1 ring-slate-900/[0.06]">
                            <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
                            <span>Loading reports...</span>
                        </div>
                    ) : visibleReports.length === 0 ? (
                        <div className="grid">
                            <EmptyState
                                icon={CheckCircle}
                                tone="emerald"
                                title={selectedReportTestId ? 'No reports for this test' : 'All clear'}
                                body={selectedReportTestId ? 'Students have not flagged any question in this test.' : 'When a student flags a problem in one of your questions, it shows up here.'}
                                action={selectedReportTestId ? (
                                    <button type="button" className={PILL_BTN} onClick={clearReportFilter}>
                                        View all reports
                                    </button>
                                ) : undefined}
                            />
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)]">
                            {visibleReports.map((report) => {
                                const isOpen = report.status === 'open';
                                return (
                                    <li
                                        key={report.id}
                                        className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5 ${isOpen ? '' : 'bg-slate-50/60'}`}
                                    >
                                        <div className={`min-w-0 flex-1 ${isOpen ? '' : 'opacity-70'}`}>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {isOpen ? (
                                                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold leading-none text-red-700 ring-1 ring-inset ring-red-600/15">
                                                        Needs review
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize leading-none text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                                                        {report.status}
                                                    </span>
                                                )}
                                                <span className="text-xs text-slate-500">{new Date(report.created_at).toLocaleString()}</span>
                                            </div>
                                            <p className="mt-2 text-[15px] font-semibold text-slate-900">
                                                {report.tests?.title || 'Unknown test'}
                                                <span className="font-normal text-slate-500"> · Question {report.question_id + 1}</span>
                                                {report.tests?.custom_id && (
                                                    <span className="ml-1.5 font-mono text-xs font-normal text-slate-500">#{report.tests.custom_id}</span>
                                                )}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-700">
                                                <span className="font-medium text-slate-900">Issue: </span>
                                                {report.reason}
                                            </p>
                                            {report.details && (
                                                <p className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                                                    "{report.details}"
                                                </p>
                                            )}
                                        </div>
                                        {isOpen && (
                                            <div className="flex shrink-0 items-center gap-2">
                                                {report.test_id && (
                                                    <button type="button" className={PILL_BTN} onClick={() => openTestEditor({ id: report.test_id })}>
                                                        <Pencil className="h-4 w-4 text-sky-600" /> Fix question
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleResolveReport(report.id)}
                                                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 text-[13px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 transition-colors hover:bg-emerald-100 cursor-pointer"
                                                >
                                                    <CheckCircle className="h-4 w-4" /> Mark solved
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </TabsContent>
            </Tabs>

            {/* ── Delete Test Dialog ── */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="max-w-[min(420px,calc(100vw-32px))] rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this test?</AlertDialogTitle>
                        <AlertDialogDescription>
                            "{deleteTitle}" will be permanently deleted. This can't be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl" onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="rounded-xl bg-red-600 hover:bg-red-700">Delete permanently</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Remove Exam Confirmation Dialog (Active exams only) ── */}
            <AlertDialog open={!!removeExamId} onOpenChange={(open) => { if (!open) { setRemoveExamId(null); setRemoveExamSource(null); setRemoveInfoOpen(null); } }}>
                <AlertDialogContent className="max-w-[min(380px,calc(100vw-32px))] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
                    {/* Dark header */}
                    <div className="bg-[#0b1120] px-6 pt-6 pb-5 text-center">
                        <div className="w-11 h-11 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                            <X className="w-5 h-5 text-red-400" />
                        </div>
                        <AlertDialogTitle className="text-white text-base font-bold leading-tight">
                            {removeExamSource === 'inactive' ? 'Remove from exams?' : 'Stop conducting?'}
                        </AlertDialogTitle>
                        {removeExamSource === 'inactive' && (
                            <p className="text-slate-300 text-[13px] mt-1.5">Choose who can see "{removeExamTitle}" after removal.</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="p-4 space-y-2.5">
                        {/* Public option */}
                        <div className="space-y-1.5">
                            <div className="flex items-stretch gap-2">
                                <AlertDialogAction
                                    onClick={() => confirmRemoveExam(true)}
                                    className="flex-1 h-11 bg-primary hover:bg-[hsl(200,95%,30%)] text-white rounded-xl border-0 text-[13px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    <Globe className="w-4 h-4 mr-1.5" /> {removeExamSource === 'inactive' ? 'Save as Public' : 'Stop & Make Public'}
                                </AlertDialogAction>
                                <button
                                    type="button"
                                    aria-label="What does public mean?"
                                    onClick={() => setRemoveInfoOpen(removeInfoOpen === 'public' ? null : 'public')}
                                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer ${removeInfoOpen === 'public'
                                            ? 'bg-sky-200 text-sky-800'
                                            : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
                                        }`}
                                >
                                    <Info className="w-4 h-4" />
                                </button>
                            </div>
                            {removeInfoOpen === 'public' && (
                                <div className="text-[13px] leading-relaxed bg-sky-50 text-sky-900 ring-1 ring-inset ring-sky-600/15 rounded-xl px-3 py-2">
                                    Students can review the exam afterwards. Anyone, even without an account, can open it.
                                </div>
                            )}
                        </div>

                        {/* Private option */}
                        <div className="space-y-1.5">
                            <div className="flex items-stretch gap-2">
                                <AlertDialogAction
                                    onClick={() => confirmRemoveExam(false)}
                                    className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl border-0 text-[13px] font-semibold transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    <Lock className="w-4 h-4 mr-1.5" /> {removeExamSource === 'inactive' ? 'Save as Private' : 'Stop & Make Private'}
                                </AlertDialogAction>
                                <button
                                    type="button"
                                    aria-label="What does private mean?"
                                    onClick={() => setRemoveInfoOpen(removeInfoOpen === 'private' ? null : 'private')}
                                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer ${removeInfoOpen === 'private'
                                            ? 'bg-red-200 text-red-800'
                                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                                        }`}
                                >
                                    <Info className="w-4 h-4" />
                                </button>
                            </div>
                            {removeInfoOpen === 'private' && (
                                <div className="text-[13px] leading-relaxed bg-red-50 text-red-900 ring-1 ring-inset ring-red-600/15 rounded-xl px-3 py-2">
                                    Nobody else can open the exam or see its results.
                                </div>
                            )}
                        </div>

                        <AlertDialogCancel
                            onClick={() => { setRemoveExamId(null); setRemoveInfoOpen(null); setRemoveExamSource(null); }}
                            className="w-full h-10 border-0 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[13px] font-medium transition-all active:scale-[0.98] cursor-pointer"
                        >
                            Cancel
                        </AlertDialogCancel>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Conduct Exam Dialog ── */}
            {conductExamTest && (
                <ConductExamDialog
                    test={conductExamTest}
                    open={!!conductExamTest}
                    onClose={() => setConductExamTest(null)}
                    onConfirm={confirmConductExam}
                    loading={conductExamLoading}
                />
            )}

            {/* ── Settings Panel ── */}
            {configuringTest && (
                <TestSettingsPanel
                    test={configuringTest}
                    onClose={() => setConfiguringTest(null)}
                    onUpdate={(updatedTest) => {
                        if (updatedTest) {
                            setTests(prev => prev.map(t => t.id === updatedTest.id ? updatedTest : t));
                        } else {
                            loadUserTests();
                        }
                    }}
                    onSettingsChange={(newSettings) => {
                        setConfiguringTest(prev => prev ? { ...prev, settings: newSettings } : null);
                    }}
                    onViewResults={() => {
                        setViewingResultsTest(configuringTest);
                    }}
                    onRequestConductExam={(t) => {
                        setConfiguringTest(null);
                        setConductExamTest(t);
                    }}
                />
            )}

            {/* ── Results Panel ── */}
            {viewingResultsTest && (
                <TestResultsPanel
                    test={viewingResultsTest}
                    onClose={() => setViewingResultsTest(null)}
                />
            )}

            {showTour && (
                <CreatorDashboardTour
                    tests={tests}
                    configuringTest={configuringTest}
                    conductExamTest={conductExamTest}
                    userId={user?.id}
                    onSkip={() => {
                        if (user?.id) {
                            localStorage.setItem(`creator_dashboard_tour_completed_${user.id}`, 'true');
                        }
                        setShowTour(false);
                    }}
                />
            )}
        </div>
    );
}

/* ── Page-level building blocks ─────────────────────────────────────────── */

function SectionTitle({ id, title, count }: { id?: string; title: string; count?: number }) {
    return (
        <div className="mb-3 flex items-center gap-2 px-1">
            <h2 id={id} className="truncate text-lg font-semibold tracking-[-0.01em] text-slate-900">
                {title}
            </h2>
            {count !== undefined && (
                <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">
                    {count}
                </span>
            )}
        </div>
    );
}

const GUIDE_STEPS = [
    { icon: FilePlus2, title: 'Create a test', body: 'Upload a PDF, paste questions, or type them in.' },
    { icon: Radio, title: 'Conduct it online', body: 'Tap "Conduct exam" to get a secure link and switch on anti-cheating.' },
    { icon: BarChart3, title: 'Share and see results', body: 'Send the link to students. Scores appear here automatically.' },
];

function HowItWorks({ onDismiss }: { onDismiss: () => void }) {
    return (
        <section aria-labelledby="how-it-works-heading" className="rounded-2xl bg-white p-4 ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)] sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="how-it-works-heading" className="text-[15px] font-semibold text-slate-900">How it works</h2>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="h-8 rounded-full px-3 text-[13px] font-semibold text-sky-700 transition-colors hover:bg-sky-50 cursor-pointer"
                >
                    Got it
                </button>
            </div>
            <ol className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
                {GUIDE_STEPS.map((step, i) => (
                    <li key={step.title} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-sky-500/15 to-sky-500/5 text-sky-700 ring-1 ring-inset ring-sky-500/20">
                            <step.icon className="h-[18px] w-[18px]" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                                <span className="text-sky-700 tabular-nums">{i + 1}.</span> {step.title}
                            </p>
                            <p className="mt-0.5 text-[13px] leading-snug text-slate-600">{step.body}</p>
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
}

function EmptyState({
    icon: Icon, title, body, action, tone = 'sky',
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    body: string;
    action?: React.ReactNode;
    tone?: 'sky' | 'emerald';
}) {
    const tones = {
        sky: 'from-sky-500/15 to-sky-500/5 text-sky-700 ring-sky-500/20',
        emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-700 ring-emerald-500/20',
    } as const;
    return (
        <div className="col-span-full flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center ring-1 ring-slate-900/[0.06]">
            <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-inset ${tones[tone]}`}>
                <Icon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-slate-900">{title}</h3>
            <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-slate-600">{body}</p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
