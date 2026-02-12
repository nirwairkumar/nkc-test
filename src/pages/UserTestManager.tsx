import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, Edit, Plus, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import { fetchTestsByUserId, updateTest, deleteTest } from '@/lib/testsApi';
import { fetchClasses } from '@/lib/classesApi';
import { fetchUserDetails } from '@/lib/usersApi';
import { fetchCategories } from '@/lib/categoriesApi';
import { Globe, Link as LinkIcon, Lock, GraduationCap, Search } from 'lucide-react';

import TestBuilder from '@/components/TestBuilder';
import { TestUploadFormatGuide } from '@/components/TestUploadFormatGuide';
import TestSettingsPanel from '@/components/TestSettingsPanel';
import TestResultsPanel from '@/components/TestResultsPanel';
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

// YouTube-style lazy loading imports
import { UserTestCard } from '@/components/UserTestCard';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';
import { useYouTubeStyleRender } from '@/hooks/useYouTubeStyleRender';

export default function UserTestManager() {
    const { user, loading: authLoading } = useAuth();
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

    // Creator Check State
    const [isCreator, setIsCreator] = useState<boolean | null>(null);
    const [checkingCreator, setCheckingCreator] = useState(true);

    const [classes, setClasses] = useState<any[]>([]);

    // YouTube-style lazy loading - each card loads individually when visible
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
        }
    }, [user?.id, authLoading, navigate]);

    // Load tests on search
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
        setEditingTest(test);
        setIsTestEditOpen(true);
    };

    const handleVisibilityChange = async (test: any, newVisibility: 'public' | 'unlisted' | 'private') => {
        const isPublic = newVisibility === 'public';
        const oldVisibility = test.visibility;

        // Optimistic update
        setTests(prev => prev.map(t => t.id === test.id ? { ...t, visibility: newVisibility, is_public: isPublic } : t));

        try {
            const { error } = await updateTest(test.id, {
                visibility: newVisibility,
                is_public: isPublic
            });

            if (error) throw error;
            toast.success(`Visibility updated to ${newVisibility}`);
        } catch (error: any) {
            console.error("Failed to update visibility:", error);
            toast.error("Failed to update visibility");
            // Revert
            setTests(prev => prev.map(t => t.id === test.id ? { ...t, visibility: oldVisibility, is_public: test.is_public } : t));
        }
    };

    const handleShare = (test: any) => {
        const path = test.slug ? `/test/${test.slug}` : `/test-intro/${test.id}`;
        const url = `${window.location.origin}${path}`;
        navigator.clipboard.writeText(url);
        toast.success("Test link copied!");
    };

    const handleClassChange = async (test: any, classId: string | null) => {
        const oldClassId = test.class_id;
        // Optimistic update
        setTests(prev => prev.map(t => t.id === test.id ? { ...t, class_id: classId } : t));

        const { error } = await updateTest(test.id, { class_id: classId });
        if (error) {
            console.error("Failed to update class:", error);
            toast.error("Failed to update class assignment");
            // Revert
            setTests(prev => prev.map(t => t.id === test.id ? { ...t, class_id: oldClassId } : t));
        } else {
            toast.success(classId ? "Class assigned" : "Class removed");
        }
    };

    const getVisibilityIcon = (visibility: string) => {
        switch (visibility) {
            case 'public': return <Globe className="h-3 w-3" />;
            case 'unlisted': return <LinkIcon className="h-3 w-3" />;
            case 'private': return <Lock className="h-3 w-3" />;
            default: return <Globe className="h-3 w-3" />;
        }
    };

    const getVisibilityColor = (visibility: string) => {
        switch (visibility) {
            case 'public': return 'text-green-600 bg-green-50 border-green-200';
            case 'unlisted': return 'text-blue-600 bg-blue-50 border-blue-200';
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
                {/* Blurred Background Content */}
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

                {/* Overlay Content */}
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

    if (isTestEditOpen) {
        return (
            <TestBuilder
                initialData={editingTest}
                onSuccess={() => {
                    setIsTestEditOpen(false);
                    setEditingTest(null);
                    loadUserTests();
                }}
                onCancel={() => {
                    setIsTestEditOpen(false);
                    setEditingTest(null);
                }}
            />
        );
    }

    return (
        <div className="container mx-auto max-w-5xl py-6 space-y-6">
            {/* ... Header ... */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Your Tests</h1>
                    <p className="text-muted-foreground text-sm">Manage the tests you have generated.</p>
                </div>
                {/* ... Import buttons ... */}
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
                                            id, // Don't import ID, let DB generate it
                                            created_at, // Don't import timestamp
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
                        {/* YouTube-style: Each card loads individually when visible */}
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
                                        onClassChange={handleClassChange}
                                        getVisibilityColor={getVisibilityColor}
                                        getVisibilityIcon={getVisibilityIcon}
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

            {viewingResultsTest && (
                // Dynamic Import or Direct Import? Let's use Lazy if needed, but direct is fine for now if we import it
                <TestResultsPanel
                    test={viewingResultsTest}
                    onClose={() => setViewingResultsTest(null)}
                />
            )}
        </div >
    );
}
