import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, Edit, Plus, Upload, Radio, Settings, BarChart2, Link as LinkIcon, X, GraduationCap, Search, Inbox, CheckCircle, Shield, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import { fetchTestsByUserId, updateTest, deleteTest } from '@/lib/testsApi';
import { fetchClasses } from '@/lib/classesApi';
import { fetchUserDetails } from '@/lib/usersApi';
import { fetchCategories } from '@/lib/categoriesApi';
import { Globe, Lock, Info } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchCreatorReports, updateReportStatus, Report } from "@/lib/reportsApi";
import { Badge } from "@/components/ui/badge";
import TestBuilder from '@/components/TestBuilder';
import { TestUploadFormatGuide } from '@/components/TestUploadFormatGuide';
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
import { Trash2, MoreVertical, Check, FileText } from 'lucide-react';

import { UserTestCard } from '@/components/UserTestCard';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';
import { useYouTubeStyleRender } from '@/hooks/useYouTubeStyleRender';
import CreatorDashboardTour from '@/components/CreatorDashboardTour';

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

    // Reports State
    const [reports, setReports] = useState<Report[]>([]);
    const [reportsLoading, setReportsLoading] = useState(false);

    const [showTour, setShowTour] = useState(false);

    const checkCreatorStatus = async () => {
        if (!targetUserId) return;
        
        // If not impersonating and we already have the profile data, load it immediately
        if (targetUserId === user?.id && profile) {
            setIsCreator(profile.is_creator);
            setTargetUserProfile(profile);
            setCheckingCreator(false);
            return;
        }

        setCheckingCreator(true);
        const { data } = await fetchUserDetails(targetUserId);
        if (data) {
            setIsCreator(data.is_creator);
            setTargetUserProfile(data);
        }
        setCheckingCreator(false);
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
            navigate('/login');
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

            const newSettings = {
                ...(conductExamTest.settings || {}),
                conduct_exam: {
                    enabled: true,
                    conduct_slug: conductSlug,
                    original_slug: originalSlug,
                }
            };

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

    const handleRemoveExam = async (testId: string, testTitle: string) => {
        const test = tests.find(t => t.id === testId);
        if (!test) return;

        const now = new Date();
        const testHasEnded = !!test.settings?.schedule?.end_time && new Date(test.settings.schedule.end_time) < now;
        const isActive = test.settings?.conduct_exam?.enabled && !testHasEnded;

        if (!isActive) {
            // Inactive exam — remove silently, preserve current visibility
            setRemoveExamId(testId);
            setRemoveExamTitle(testTitle);
            await confirmRemoveExamById(testId, test.is_public ?? false);
            return;
        }

        // Active exam — show confirmation popup
        setRemoveExamId(testId);
        setRemoveExamTitle(testTitle);
    };

    const confirmRemoveExamById = async (testId: string, makePublic: boolean) => {
        const test = tests.find(t => t.id === testId);
        if (!test) return;

        const now = new Date();
        const testHasEnded = !!test.settings?.schedule?.end_time && new Date(test.settings.schedule.end_time) < now;
        const wasActive = test.settings?.conduct_exam?.enabled && !testHasEnded;
        const originalSlug = test.settings?.conduct_exam?.original_slug || '';
        const newSettings = { ...(test.settings || {}) };

        if (wasActive) {
            newSettings.conduct_exam = { ...newSettings.conduct_exam, enabled: false };
        } else {
            delete newSettings.conduct_exam;
        }

        const payload: any = { visibility: makePublic ? 'public' : 'private', is_public: makePublic, settings: newSettings };
        payload.slug = makePublic ? (test.custom_id || test.id) : `unlisted-${test.custom_id || test.id}`;

        setTests(prev => prev.map(t => t.id === testId ? { ...t, ...payload } : t));
        setRemoveExamId(null);

        try {
            const { error } = await updateTest(testId, payload, isAdmin);
            if (error) throw error;
            toast.success(`Exam removed. Test set to ${makePublic ? 'public' : 'private'}.`);
        } catch (error: any) {
            toast.error('Failed to remove exam: ' + error.message);
            setTests(prev => prev.map(t => t.id === testId ? { ...t, ...test } : t));
        }
    };

    const confirmRemoveExam = async (makePublic: boolean = false) => {
        if (!removeExamId) return;
        await confirmRemoveExamById(removeExamId, makePublic);
    };

    // ─── Helpers ──────────────────────────────────────────────────
    const getVisibilityIcon = (visibility: string) => {
        switch (visibility) {
            case 'public': return <Globe className="h-3 w-3" />;
            case 'private': return <Lock className="h-3 w-3" />;
            default: return <Globe className="h-3 w-3" />;
        }
    };

    const getVisibilityColor = (visibility: string) => {
        switch (visibility) {
            case 'public': return 'text-green-600 bg-green-50 border-green-200';
            case 'private': return 'text-slate-600 bg-slate-50 border-slate-200';
            default: return 'text-slate-500';
        }
    };

    if (authLoading || checkingCreator) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
    if (!user) return null;

    // Non-creator lock screen
    if (isCreator === false) {
        return (
            <div className="relative h-[80vh] w-full overflow-hidden flex flex-col items-center justify-center">
                <div className="absolute inset-0 blur-sm opacity-50 pointer-events-none select-none overflow-hidden flex flex-col items-center pt-20">
                    <div className="container max-w-5xl opacity-50 grayscale">
                        <div className="flex justify-between items-center mb-8">
                            <h1 className="text-3xl font-bold">Your Tests</h1>
                            <Button disabled>Import JSON</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <Card key={i} className="h-40 bg-slate-50"></Card>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="relative z-10 bg-white/90 backdrop-blur-md p-8 rounded-xl shadow-2xl border text-center max-w-md mx-4">
                    <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Edit className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Become a Creator</h2>
                    <p className="text-muted-foreground mb-6">
                        To manage and publish tests, you need to enable your **Creator Profile**. Using this feature, you can build a following and share your exams.
                    </p>
                    <Button size="lg" className="w-full" onClick={() => navigate('/profile')}>
                        Go to Profile & Enable
                    </Button>
                </div>
            </div>
        );
    }

    const now = new Date();
    const hasEnded = (test: any) => {
        if (!test.settings?.schedule?.end_time) return false;
        return new Date(test.settings.schedule.end_time) < now;
    };

    const hasConductSettings = (t: any) => t.settings?.conduct_exam !== undefined;

    const activeExams = tests.filter(t =>
        hasConductSettings(t) &&
        t.settings.conduct_exam.enabled === true &&
        !hasEnded(t)
    );
    const inactiveExams = tests.filter(t =>
        hasConductSettings(t) &&
        (t.settings.conduct_exam.enabled === false || hasEnded(t))
    );
    const regularTests = tests; // Show all tests in grid (conducted ones also show with LIVE badge)

    return (
        <div className="container mx-auto max-w-5xl py-3 px-3 sm:py-5 sm:px-4 space-y-4">
            {isAdmin && impersonateUserId && targetUserProfile && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm mb-4">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-sm font-medium">
                            Impersonating creator dashboard for <strong>{targetUserProfile.full_name || targetUserProfile.email}</strong>
                        </span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-800 hover:bg-amber-100" onClick={() => navigate('/manage-tests?tab=users')}>
                        Back to Admin Dashboard
                    </Button>
                </div>
            )}
            <Tabs defaultValue="tests" onValueChange={(v) => v === 'reports' && loadReports()}>
                <div className="flex items-center justify-between mb-4 gap-4">
                    <div>
                        <p className="text-[12px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-1">Creator</p>
                        <p className="text-[27px] font-semibold text-slate-800 tracking-tight leading-tight">Dashboard</p>
                    </div>

                    {/* Note explaining "Conduct" mode for creators, visible on medium and larger screens only */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-violet-100 bg-violet-50/50 text-[11px] text-violet-700 max-w-2xl flex-1 justify-center mx-4">
                        <Info className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                        <span>
                            Use <strong>"Conduct"</strong> mode on any test card to organize live exams, enable proctoring, and view submitted results.
                        </span>
                    </div>

                    <TabsList className="h-8 shrink-0">
                        <TabsTrigger value="tests" className="text-xs px-3 h-7">My Tests</TabsTrigger>
                        <TabsTrigger value="reports" className="relative text-xs px-3 h-7">
                            Reports
                            {reports.filter(r => r.status === 'open').length > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="tests" className="space-y-3 m-0 border-0 p-0">

                    {/* ═══════════════════════════════════════════════
                        ACTIVE EXAMS CONTAINER
                    ═══════════════════════════════════════════════ */}
                    {activeExams.length > 0 && (
                        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 shadow-sm mb-6">
                            {/* Decorative glow */}
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-300/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
                                <div className="absolute bottom-0 right-0 w-32 h-32 bg-teal-300/10 rounded-full translate-x-1/4 translate-y-1/4" />
                            </div>

                            {/* Header */}
                            <div className="relative flex items-center justify-between px-3.5 py-2.5 border-b border-emerald-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                                        <Radio className="w-3 h-3 text-white" />
                                    </div>
                                    <span className="font-semibold text-slate-800 text-xs">Active Exams</span>
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 animate-pulse shrink-0">
                                        <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block" />
                                        {activeExams.length} Live
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                    <Shield className="w-3 h-3" />
                                    <span className="hidden sm:inline">Link-only</span>
                                </div>
                            </div>

                            {/* Cards */}
                            <div className="relative px-3 py-2.5 space-y-2">
                                {activeExams.map(test => {
                                    const conductSlug = test.settings?.conduct_exam?.conduct_slug || test.slug;
                                    const examUrl = conductSlug
                                        ? `${window.location.origin}/test/${conductSlug}`
                                        : `${window.location.origin}/test-intro/${test.id}`;
                                    const questionCount = test.total_questions || test.questions?.length || 0;

                                    return (
                                        <div
                                            key={test.id}
                                            className="group relative bg-white rounded-lg border border-emerald-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 p-3"
                                        >
                                            {/* Left accent */}
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-l-xl" />

                                            <div className="pl-3 flex flex-col gap-3">
                                                {/* Test Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <h3 className="font-semibold text-slate-800 text-xs truncate">{test.title}</h3>
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <Radio className="w-2 h-2" /> LIVE
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 flex-wrap">
                                                        <span>{questionCount} Qs</span>
                                                        <span>·</span>
                                                        <span>{test.duration || 0} min</span>
                                                        <span className="hidden sm:inline">·</span>
                                                        <span className="hidden sm:inline font-mono text-slate-300 truncate max-w-[140px]">/test/{conductSlug}</span>
                                                    </div>
                                                </div>

                                                {/* Quick Actions */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <div className="relative">
                                                        <Button
                                                            id={test.settings?.is_user_example ? "tour-settings-btn-active" : undefined}
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 px-2 sm:px-3 text-xs border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors duration-200 cursor-pointer"
                                                            onClick={() => setConfiguringTest(test)}
                                                        >
                                                            <Settings className="w-3.5 h-3.5 sm:mr-1.5" />
                                                            <span className="hidden sm:inline">Settings</span>
                                                        </Button>
                                                        {!isProctoringEnabled(test) && (
                                                            <div className="absolute -top-1 -right-1 z-10 text-yellow-500">
                                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                            </div>
                                                        )}
                                                        {showEnvPopupTestId === test.id && (
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-yellow-500 text-slate-900 text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-200 flex items-center gap-1.5 border border-yellow-400">
                                                                <AlertTriangle className="w-3.5 h-3.5 text-slate-900" />
                                                                <span>Set exam environment</span>
                                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-yellow-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 px-2 sm:px-3 text-xs border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors duration-200 cursor-pointer"
                                                        onClick={() => setViewingResultsTest(test)}
                                                    >
                                                        <BarChart2 className="w-3.5 h-3.5 sm:mr-1.5" />
                                                        <span className="hidden sm:inline">Results</span>
                                                    </Button>
                                                    <Button
                                                        id={test.settings?.is_user_example ? "tour-copy-link-btn" : undefined}
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 px-2 sm:px-3 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-colors duration-200 cursor-pointer"
                                                        onClick={async () => {
                                                            await navigator.clipboard.writeText(examUrl);
                                                            toast.success("Exam link copied!");
                                                        }}
                                                    >
                                                        <LinkIcon className="w-3.5 h-3.5 sm:mr-1.5" />
                                                        <span className="hidden sm:inline">Copy Link</span>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 px-2 sm:px-3 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors duration-200 cursor-pointer"
                                                        onClick={() => handleRemoveExam(test.id, test.title)}
                                                    >
                                                        <X className="w-3.5 h-3.5 sm:mr-1.5" />
                                                        <span className="hidden sm:inline">Remove</span>
                                                    </Button>

                                                    {/* Full hamburger menu — identical to normal card */}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-primary hover:bg-violet-50">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56">
                                                            <DropdownMenuItem onClick={() => openTestEditor(test)}>
                                                                <Edit className="mr-2 h-4 w-4 text-slate-500" /> Edit Test
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => setConfiguringTest(test)}>
                                                                <Settings className="mr-2 h-4 w-4 text-slate-500" /> Manage Settings
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleShare(test)}>
                                                                <LinkIcon className="mr-2 h-4 w-4 text-slate-500" /> Share Link
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleUploadSolutions(test)}>
                                                                <FileText className="mr-2 h-4 w-4 text-indigo-500" /> Upload Solutions
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSub>
                                                                <DropdownMenuSubTrigger>
                                                                    <GraduationCap className="mr-2 h-4 w-4" /> Assign Class
                                                                </DropdownMenuSubTrigger>
                                                                <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                                                                    <DropdownMenuItem onClick={() => handleClassChange(test, null)}>
                                                                        <span className="opacity-50">None</span>
                                                                        {!test.class_id && <Check className="ml-auto h-4 w-4" />}
                                                                    </DropdownMenuItem>
                                                                    {classes.map(cls => (
                                                                        <DropdownMenuItem key={cls.id} onClick={() => handleClassChange(test, cls.id)}>
                                                                            {cls.name}
                                                                            {test.class_id === cls.id && <Check className="ml-auto h-4 w-4" />}
                                                                        </DropdownMenuItem>
                                                                    ))}
                                                                </DropdownMenuSubContent>
                                                            </DropdownMenuSub>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleRemoveExam(test.id, test.title)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                                                <X className="mr-2 h-4 w-4" /> Remove from Conduct
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDeleteTest(test.id, test.title)} className="text-red-700 focus:text-red-700 focus:bg-red-50 font-semibold">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Test
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════
                        INACTIVE EXAMS CONTAINER
                    ═══════════════════════════════════════════════ */}
                    {inactiveExams.length > 0 && (
                        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 shadow-sm">
                            {/* Header */}
                            <div className="relative flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-slate-400 flex items-center justify-center shrink-0">
                                        <X className="w-3 h-3 text-white" />
                                    </div>
                                    <span className="font-semibold text-slate-600 text-xs">Inactive Exams</span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-500 border border-slate-300 shrink-0">
                                        {inactiveExams.length} Ended
                                    </span>
                                </div>
                            </div>

                            {/* Cards */}
                            <div className="relative px-3 py-2.5 space-y-2">
                                {inactiveExams.map(test => {
                                    const questionCount = test.total_questions || test.questions?.length || 0;

                                    return (
                                        <div
                                            key={test.id}
                                            className="group relative bg-white rounded-lg border border-slate-200 shadow-sm p-3 opacity-80 hover:opacity-100 transition-opacity duration-200"
                                        >
                                            {/* Left accent */}
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-slate-300 to-slate-400 rounded-l-lg" />

                                            <div className="pl-3 flex flex-col gap-2">
                                                {/* Test Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <h3 className="font-semibold text-slate-500 text-xs truncate line-through decoration-slate-300">{test.title}</h3>
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                                            Ended
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                                        <span>{questionCount} Qs</span>
                                                        <span>·</span>
                                                        <span>{test.duration || 0} min</span>
                                                    </div>
                                                </div>

                                                {/* Quick Actions */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 px-2 sm:px-3 text-[11px] border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-colors duration-200 cursor-pointer"
                                                        onClick={() => setViewingResultsTest(test)}
                                                    >
                                                        <BarChart2 className="w-3 h-3 sm:mr-1" />
                                                        <span className="hidden sm:inline">Results</span>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 px-2 sm:px-3 text-[11px] border-red-100 text-red-400 hover:bg-red-50 hover:border-red-200 transition-colors duration-200 cursor-pointer"
                                                        onClick={() => handleRemoveExam(test.id, test.title)}
                                                    >
                                                        <X className="w-3 h-3 sm:mr-1" />
                                                        <span className="hidden sm:inline">Remove</span>
                                                    </Button>

                                                    {/* Hamburger menu */}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-400 hover:text-primary hover:bg-violet-50">
                                                                <MoreVertical className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56">
                                                            <DropdownMenuItem onClick={() => setViewingResultsTest(test)}>
                                                                <BarChart2 className="mr-2 h-4 w-4 text-slate-500" /> View Results
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openTestEditor(test)}>
                                                                <Edit className="mr-2 h-4 w-4 text-slate-500" /> Edit Test
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => setConfiguringTest(test)}>
                                                                <Settings className="mr-2 h-4 w-4 text-slate-500" /> Manage Settings
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleUploadSolutions(test)}>
                                                                <FileText className="mr-2 h-4 w-4 text-indigo-500" /> Upload Solutions
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSub>
                                                                <DropdownMenuSubTrigger>
                                                                    <GraduationCap className="mr-2 h-4 w-4" /> Assign Class
                                                                </DropdownMenuSubTrigger>
                                                                <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                                                                    <DropdownMenuItem onClick={() => handleClassChange(test, null)}>
                                                                        <span className="opacity-50">None</span>
                                                                        {!test.class_id && <Check className="ml-auto h-4 w-4" />}
                                                                    </DropdownMenuItem>
                                                                    {classes.map(cls => (
                                                                        <DropdownMenuItem key={cls.id} onClick={() => handleClassChange(test, cls.id)}>
                                                                            {cls.name}
                                                                            {test.class_id === cls.id && <Check className="ml-auto h-4 w-4" />}
                                                                        </DropdownMenuItem>
                                                                    ))}
                                                                </DropdownMenuSubContent>
                                                            </DropdownMenuSub>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleRemoveExam(test.id, test.title)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                                                <X className="mr-2 h-4 w-4" /> Remove from Conduct
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDeleteTest(test.id, test.title)} className="text-red-700 focus:text-red-700 focus:bg-red-50 font-semibold">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Test
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════
                        TOOLBAR
                    ═══════════════════════════════════════════════ */}
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 sm:items-center">
                            {/* Search Input */}
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Search tests..."
                                    className="pl-9 bg-white text-sm h-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <Button size="sm" className="h-9 text-sm w-full sm:w-auto" onClick={() => {
                                if (isAdmin && impersonateUserId) {
                                    navigate(`/create-test?userId=${impersonateUserId}`);
                                } else {
                                    navigate('/create-test');
                                }
                            }}>
                                <Plus className="w-4 h-4 mr-1.5" /> Create Test
                            </Button>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════
                        ALL TESTS GRID
                    ═══════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {testsLoading && tests.length === 0 ? (
                            <>
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <TestCardSkeleton key={i} />
                                ))}
                            </>
                        ) : tests.length === 0 ? (
                            <div className="col-span-full text-center py-10 text-muted-foreground border rounded-lg border-dashed">
                                You haven't generated any tests yet.
                            </div>
                        ) : (
                            <>
                                {tests.map((test) => {
                                    const testId = test.id;
                                    const isRendered = isItemRendered(testId);

                                    if (isRendered) {
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
                                                getVisibilityColor={getVisibilityColor}
                                                getVisibilityIcon={getVisibilityIcon}
                                                onViewResults={(t) => setViewingResultsTest(t)}
                                                onView={(t) => {
                                                    if (t.settings?.conduct_exam?.enabled) {
                                                        const conductSlug = t.settings.conduct_exam.conduct_slug || t.slug;
                                                        navigate(`/test/${conductSlug}`);
                                                    } else if (t.visibility === 'private' || !t.is_public) {
                                                        navigate(`/test/${t.slug || `unlisted-${t.custom_id || t.id}`}`);
                                                    } else {
                                                        navigate(`/test-intro/${t.id}`);
                                                    }
                                                }}
                                                onConductExam={handleConductExam}
                                                showEnvPopup={showEnvPopupTestId === test.id}
                                            />
                                        );
                                    } else {
                                        return (
                                            <div
                                                key={testId}
                                                ref={(el) => registerSkeleton(testId, el)}
                                            >
                                                <TestCardSkeleton />
                                            </div>
                                        );
                                    }
                                })}
                            </>
                        )}
                    </div>

                    {/* Observer Target for Paginated Infinite Scroll */}
                    {tests.length > 0 && (
                        <div ref={observerTarget} className="h-16 w-full flex items-center justify-center mt-6">
                            {testsLoading && (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Loader2 className="animate-spin h-5 w-5 text-primary" />
                                    <span>Loading more tests...</span>
                                </div>
                            )}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="reports" className="space-y-4 m-0 border-0 p-0">
                    <Card className="p-4 md:p-6 shadow-sm border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                                <Inbox className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Issue Reports</h2>
                                <p className="text-sm text-slate-500">Reports filed by users taking your tests.</p>
                            </div>
                        </div>

                        {reportsLoading ? (
                            <div className="py-10 text-center text-muted-foreground">Loading reports...</div>
                        ) : reports.length === 0 ? (
                            <div className="py-10 text-center border dashed rounded-md text-muted-foreground border-slate-200 bg-slate-50">
                                No reports found.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {reports.map((report) => (
                                    <div key={report.id} className={`p-4 rounded-lg border flex flex-col md:flex-row gap-4 items-start md:items-center justify-between transition-colors
                                        ${report.status === 'open' ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-70'}
                                    `}>
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant={report.status === 'open' ? 'destructive' : 'secondary'} className={report.status === 'open' ? 'bg-red-500' : ''}>
                                                    {report.status.toUpperCase()}
                                                </Badge>
                                                <span className="text-xs text-slate-500">{new Date(report.created_at).toLocaleString()}</span>
                                            </div>
                                            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                                {report.tests?.title || 'Unknown Test'} {report.tests?.custom_id ? <span className="text-xs font-normal text-slate-500">({report.tests.custom_id})</span> : ''}
                                                <span className="text-sm font-normal text-slate-500">| Q No: {report.question_id + 1}</span>
                                            </h4>
                                            <div className="text-sm text-slate-700">
                                                <span className="font-medium mr-1">Issue:</span>
                                                {report.reason}
                                            </div>
                                            {report.details && (
                                                <div className="text-sm text-slate-600 bg-slate-100 p-2 rounded mt-2 border border-slate-200">
                                                    "{report.details}"
                                                </div>
                                            )}
                                        </div>
                                        {report.status === 'open' && (
                                            <Button size="sm" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 shrink-0" onClick={() => handleResolveReport(report.id)}>
                                                <CheckCircle className="w-4 h-4 mr-2" /> Mark Solved
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ── Delete Test Dialog ── */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the test "{deleteTitle}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete Permanently</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Remove Exam Confirmation Dialog (Active exams only) ── */}
            <AlertDialog open={!!removeExamId} onOpenChange={(open) => !open && setRemoveExamId(null)}>
                <AlertDialogContent className="max-w-[min(380px,calc(100vw-32px))] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
                    {/* Dark header */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 pt-6 pb-5 text-center">
                        <div className="w-11 h-11 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                            <X className="w-5 h-5 text-red-400" />
                        </div>
                        <AlertDialogTitle className="text-white text-base font-bold leading-tight">
                            Stop conducting?
                        </AlertDialogTitle>

                    </div>

                    {/* Actions */}
                    <div className="p-4 space-y-2.5">
                        {/* Public option */}
                        <div className="space-y-1.5">
                            <div className="flex items-stretch gap-2">
                                <AlertDialogAction
                                    onClick={() => confirmRemoveExam(true)}
                                    className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl border-0 text-xs font-semibold shadow-lg shadow-indigo-200/50 transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    <Globe className="w-3.5 h-3.5 mr-1.5" /> Stop & Make Public
                                </AlertDialogAction>
                                <button
                                    onClick={() => setRemoveInfoOpen(removeInfoOpen === 'public' ? null : 'public')}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                                        removeInfoOpen === 'public'
                                            ? 'bg-indigo-200 text-indigo-700'
                                            : 'bg-indigo-50 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100'
                                    }`}
                                >
                                    <Info className="w-4 h-4" />
                                </button>
                            </div>
                            {removeInfoOpen === 'public' && (
                                <div className="text-[11px] leading-relaxed bg-indigo-50 text-indigo-800 border border-indigo-100 rounded-lg px-3 py-2">
                                    Allow candidates to analyse exam. Anonymous students can also access.
                                </div>
                            )}
                        </div>

                        {/* Private option */}
                        <div className="space-y-1.5">
                            <div className="flex items-stretch gap-2">
                                <AlertDialogAction
                                    onClick={() => confirmRemoveExam(false)}
                                    className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white rounded-xl border-0 text-xs font-semibold shadow-lg shadow-red-200/50 transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    <Lock className="w-3.5 h-3.5 mr-1.5" /> Stop & Make Private
                                </AlertDialogAction>
                                <button
                                    onClick={() => setRemoveInfoOpen(removeInfoOpen === 'private' ? null : 'private')}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                                        removeInfoOpen === 'private'
                                            ? 'bg-red-200 text-red-700'
                                            : 'bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100'
                                    }`}
                                >
                                    <Info className="w-4 h-4" />
                                </button>
                            </div>
                            {removeInfoOpen === 'private' && (
                                <div className="text-[11px] leading-relaxed bg-red-50 text-red-800 border border-red-100 rounded-lg px-3 py-2">
                                    Restrict all further access. Results and exam not visible to anyone.
                                </div>
                            )}
                        </div>

                        <AlertDialogCancel
                            onClick={() => { setRemoveExamId(null); setRemoveInfoOpen(null); }}
                            className="w-full h-9 border-0 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-medium transition-all active:scale-[0.98] cursor-pointer"
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
