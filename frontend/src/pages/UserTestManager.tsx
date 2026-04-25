import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, Edit, Plus, Upload, Radio, Settings, BarChart2, Link as LinkIcon, X, GraduationCap, Search, Inbox, CheckCircle, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import { fetchTestsByUserId, updateTest, deleteTest } from '@/lib/testsApi';
import { fetchClasses } from '@/lib/classesApi';
import { fetchUserDetails } from '@/lib/usersApi';
import { fetchCategories } from '@/lib/categoriesApi';
import { Globe, Lock } from 'lucide-react';
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

// YouTube-style lazy loading imports
import { UserTestCard } from '@/components/UserTestCard';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';
import { useYouTubeStyleRender } from '@/hooks/useYouTubeStyleRender';

export default function UserTestManager() {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const navigate = useNavigate();

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

    // Creator Check State
    const [isCreator, setIsCreator] = useState<boolean | null>(null);
    const [checkingCreator, setCheckingCreator] = useState(true);

    const [classes, setClasses] = useState<any[]>([]);

    // Reports State
    const [reports, setReports] = useState<Report[]>([]);
    const [reportsLoading, setReportsLoading] = useState(false);

    const loadReports = async () => {
        if (!user?.id) return;
        setReportsLoading(true);
        const { data, error } = await fetchCreatorReports(user.id);
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

    // YouTube-style lazy loading
    const {
        registerSkeleton,
        isItemRendered,
        getRenderedItem,
        renderedCount,
        totalCount,
        isComplete
    } = useYouTubeStyleRender(tests, testsLoading, {
        rootMargin: '100px',
        threshold: 0.1
    });

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        } else if (user?.id) {
            checkCreatorStatus();
            loadCategories();
            loadClasses();
            loadReports();
        }
    }, [user?.id, authLoading, navigate]);

    useEffect(() => {
        if (user?.id) {
            loadUserTests();
        }
    }, [user?.id, debouncedSearchQuery]);

    const checkCreatorStatus = async () => {
        if (!user) return;
        setCheckingCreator(true);
        const { data } = await fetchUserDetails(user.id);
        if (data) setIsCreator(data.is_creator);
        setCheckingCreator(false);
    };

    const loadClasses = async () => {
        if (!user) return;
        const { data } = await fetchClasses(user.id);
        if (data) setClasses(data);
    };

    const loadCategories = async () => {
        const { data } = await fetchCategories();
        if (data) setCategories(data);
    };

    const loadUserTests = React.useCallback(async () => {
        if (!user) return;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setTestsLoading(true);
        try {
            const { data, error } = await fetchTestsByUserId(user.id, {
                searchQuery: debouncedSearchQuery,
                signal: controller.signal
            });
            if (error) throw error;
            setTests(data || []);
        } catch (error: any) {
            if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') return;
            console.error('Error loading tests:', error);
            toast.error("Failed to load your tests");
        } finally {
            if (abortControllerRef.current === controller) {
                setTestsLoading(false);
            }
        }
    }, [user, debouncedSearchQuery]);

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
        navigate(`/edit-test/${test.id}`);
    };

    const handleVisibilityChange = async (test: any, newVisibility: 'public' | 'private') => {
        // Only allow public or private — no unlisted directly
        const isPublic = newVisibility === 'public';
        const oldVisibility = test.visibility;

        // Build slug restoration: if going public, restore original_slug if available
        const conductExamSettings = test.settings?.conduct_exam;
        const restoredSlug = isPublic && conductExamSettings?.original_slug
            ? conductExamSettings.original_slug
            : test.slug;

        const updatedSettings = test.settings
            ? { ...test.settings, conduct_exam: undefined }
            : test.settings;

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
        navigate(`/solutions-editor/${test.id}`);
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

    const handleRemoveExam = (testId: string, testTitle: string) => {
        setRemoveExamId(testId);
        setRemoveExamTitle(testTitle);
    };

    const confirmRemoveExam = async () => {
        if (!removeExamId) return;
        const test = tests.find(t => t.id === removeExamId);
        if (!test) return;

        const now = new Date();
        const testHasEnded = !!test.settings?.schedule?.end_time && new Date(test.settings.schedule.end_time) < now;
        const wasActive = test.settings?.conduct_exam?.enabled && !testHasEnded;

        // Restore original slug if any
        const originalSlug = test.settings?.conduct_exam?.original_slug || '';

        const newSettings = { ...(test.settings || {}) };
        
        if (wasActive) {
            newSettings.conduct_exam = { ...newSettings.conduct_exam, enabled: false };
        } else {
            delete newSettings.conduct_exam;
        }

        const payload: any = {
            visibility: 'private',
            is_public: false,
            settings: newSettings,
        };
        if (originalSlug) payload.slug = originalSlug;

        // Optimistic
        setTests(prev => prev.map(t =>
            t.id === removeExamId ? { ...t, ...payload } : t
        ));

        try {
            const { error } = await updateTest(removeExamId, payload, isAdmin);
            if (error) throw error;
            toast.success("Exam removed. Test set to private.");
        } catch (error: any) {
            toast.error("Failed to remove exam: " + error.message);
            setTests(prev => prev.map(t => t.id === removeExamId ? { ...t, ...test } : t));
        } finally {
            setRemoveExamId(null);
        }
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
        <div className="container mx-auto max-w-5xl py-6 space-y-6">
            <Tabs defaultValue="tests" onValueChange={(v) => v === 'reports' && loadReports()}>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Creator Dashboard</h1>
                        <p className="text-muted-foreground text-sm">Manage your tests and user reports.</p>
                    </div>
                    <TabsList>
                        <TabsTrigger value="tests">My Tests</TabsTrigger>
                        <TabsTrigger value="reports" className="relative">
                            Reports
                            {reports.filter(r => r.status === 'open').length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="tests" className="space-y-6 m-0 border-0 p-0">

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
                            <div className="relative flex items-center justify-between px-5 pt-4 pb-3 border-b border-emerald-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                                        <Radio className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-800 text-sm leading-tight">Active Exams</h2>
                                        <p className="text-xs text-slate-500">Currently being conducted</p>
                                    </div>
                                    <span className="ml-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                        {activeExams.length} Live
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Shield className="w-3.5 h-3.5" />
                                    Link-only access
                                </div>
                            </div>

                            {/* Cards */}
                            <div className="relative p-4 space-y-3">
                                {activeExams.map(test => {
                                    const conductSlug = test.settings?.conduct_exam?.conduct_slug || test.slug;
                                    const examUrl = conductSlug
                                        ? `${window.location.origin}/test/${conductSlug}`
                                        : `${window.location.origin}/test-intro/${test.id}`;
                                    const questionCount = test.total_questions || test.questions?.length || 0;

                                    return (
                                        <div
                                            key={test.id}
                                            className="group relative bg-white rounded-xl border border-emerald-100 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200 p-4"
                                        >
                                            {/* Left accent */}
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-l-xl" />

                                            <div className="pl-3 flex flex-col md:flex-row md:items-center gap-3">
                                                {/* Test Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-semibold text-slate-800 text-sm truncate">{test.title}</h3>
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <Radio className="w-2.5 h-2.5" /> LIVE
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                                        <span>{questionCount} Qs</span>
                                                        <span>·</span>
                                                        <span>{test.duration || 0} min</span>
                                                        <span>·</span>
                                                        <span className="font-mono text-slate-300 truncate max-w-[160px]">/test/{conductSlug}</span>
                                                    </div>
                                                </div>

                                                {/* Quick Actions */}
                                                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 px-3 text-xs border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                                        onClick={() => setConfiguringTest(test)}
                                                    >
                                                        <Settings className="w-3.5 h-3.5 mr-1.5" /> Settings
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 px-3 text-xs border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                                        onClick={() => setViewingResultsTest(test)}
                                                    >
                                                        <BarChart2 className="w-3.5 h-3.5 mr-1.5" /> Results
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 px-3 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                                                        onClick={async () => {
                                                            await navigator.clipboard.writeText(examUrl);
                                                            toast.success("Exam link copied!");
                                                        }}
                                                    >
                                                        <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Copy Link
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                                        onClick={() => handleRemoveExam(test.id, test.title)}
                                                    >
                                                        <X className="w-3.5 h-3.5 mr-1.5" /> Remove
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
                        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-slate-100/50 to-slate-50 shadow-sm">
                            {/* Header */}
                            <div className="relative flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-sm">
                                        <X className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-800 text-sm leading-tight">Inactive Exams</h2>
                                        <p className="text-xs text-slate-500">Scheduled time has ended</p>
                                    </div>
                                    <span className="ml-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-600 border border-slate-300">
                                        {inactiveExams.length} Ended
                                    </span>
                                </div>
                            </div>

                            {/* Cards */}
                            <div className="relative p-4 space-y-3">
                                {inactiveExams.map(test => {
                                    const questionCount = test.total_questions || test.questions?.length || 0;

                                    return (
                                        <div
                                            key={test.id}
                                            className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-4 opacity-90 hover:opacity-100"
                                        >
                                            {/* Left accent */}
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-slate-300 to-slate-500 rounded-l-xl" />

                                            <div className="pl-3 flex flex-col md:flex-row md:items-center gap-3">
                                                {/* Test Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-semibold text-slate-700 text-sm truncate line-through decoration-slate-300">{test.title}</h3>
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                            Ended
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                                        <span>{questionCount} Qs</span>
                                                        <span>·</span>
                                                        <span>{test.duration || 0} min</span>
                                                    </div>
                                                </div>

                                                {/* Quick Actions (Results and Remove only) */}
                                                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 px-3 text-xs border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                                        onClick={() => setViewingResultsTest(test)}
                                                    >
                                                        <BarChart2 className="w-3.5 h-3.5 mr-1.5" /> Results
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                                        onClick={() => handleRemoveExam(test.id, test.title)}
                                                    >
                                                        <X className="w-3.5 h-3.5 mr-1.5" /> Remove
                                                    </Button>

                                                    {/* Full hamburger menu */}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-primary hover:bg-violet-50">
                                                                <MoreVertical className="h-4 w-4" />
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
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex gap-3 items-center flex-wrap">
                            {/* Search Input */}
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Search tests..."
                                    className="pl-9 bg-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <Button onClick={() => { setEditingTest(null); setIsTestEditOpen(true); }}>
                                <Plus className="w-4 h-4 mr-2" /> Create Test
                            </Button>

                            <div className="flex flex-col items-end gap-1">
                                <label className="cursor-pointer">
                                    <Input
                                        type="file"
                                        accept=".json"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            try {
                                                const text = await file.text();
                                                const json = JSON.parse(text);

                                                const isValidFlat = json.questions && Array.isArray(json.questions);
                                                const isValidSection = json.enable_section_mode && json.sections && Array.isArray(json.sections);

                                                if (!json.title || (!isValidFlat && !isValidSection)) {
                                                    toast.error("Invalid JSON format. Must have 'title' and 'questions' array (or 'sections' if mode is enabled).");
                                                    return;
                                                }

                                                const { createTest, getNextTestId } = await import('@/lib/testsApi');
                                                const customId = await getNextTestId('M');

                                                const {
                                                    marks_per_question,
                                                    negative_marks,
                                                    id,
                                                    created_at,
                                                    ...safeJson
                                                } = json;

                                                const newTest = {
                                                    ...safeJson,
                                                    created_by: user.id,
                                                    custom_id: customId,
                                                    creator_name: user.user_metadata?.full_name || 'Anonymous',
                                                    creator_avatar: user.user_metadata?.avatar_url || '',
                                                    is_public: safeJson.is_public !== undefined ? safeJson.is_public : true,
                                                    created_at: new Date().toISOString()
                                                };

                                                const { error } = await createTest(newTest);
                                                if (error) throw error;

                                                toast.success("Test imported successfully!");
                                                loadUserTests();
                                                e.target.value = '';
                                            } catch (err: any) {
                                                console.error("Import error:", err);
                                                toast.error("Failed to import: " + err.message);
                                            }
                                        }}
                                    />
                                    <Button variant="outline" asChild>
                                        <span><Upload className="w-4 h-4 mr-2" /> Import JSON</span>
                                    </Button>
                                </label>
                                <TestUploadFormatGuide />
                            </div>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════
                        ALL TESTS GRID
                    ═══════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {testsLoading ? (
                            <div className="col-span-full text-center py-10">
                                <Loader2 className="animate-spin mx-auto h-8 w-8" />
                                <p className="text-muted-foreground mt-2 text-sm">Loading your tests...</p>
                            </div>
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
                                                onView={(t) => navigate(`/test-intro/${t.id}`)}
                                                onConductExam={handleConductExam}
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

                        {/* Progress indicator */}
                        {!testsLoading && !isComplete && (
                            <div className="col-span-full py-4 text-center">
                                <span className="text-sm text-muted-foreground">
                                    {renderedCount} of {totalCount} tests loaded
                                </span>
                            </div>
                        )}
                    </div>
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

            {/* ── Remove Exam Confirmation Dialog ── */}
            <AlertDialog open={!!removeExamId} onOpenChange={(open) => !open && setRemoveExamId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <X className="w-5 h-5 text-red-500" />
                            Remove from Conduct?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <span className="block">
                                "<strong>{removeExamTitle}</strong>" will be removed from Active Exams.
                            </span>
                            <span className="block text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-xs font-medium">
                                ⚠️ The test will automatically become <strong>Private</strong> and the exam link will stop working.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRemoveExamId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRemoveExam} className="bg-red-600 hover:bg-red-700">
                            Remove & Set Private
                        </AlertDialogAction>
                    </AlertDialogFooter>
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
                    onUpdate={loadUserTests}
                    onViewResults={() => {
                        setViewingResultsTest(configuringTest);
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
        </div>
    );
}
