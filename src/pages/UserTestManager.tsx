import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Trash2, Settings, Loader2, Edit, Heart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from "sonner";
import { fetchTestsByUserId } from '@/lib/testsApi';
import { fetchCategories, createCategory, fetchTestCategories, assignCategoriesToTest } from '@/lib/categoriesApi';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Upload, MoreVertical, Globe, Link as LinkIcon, Lock } from 'lucide-react';
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
import { updateTest } from '@/lib/testsApi';
import TestBuilder from '@/components/TestBuilder';
import { TestUploadFormatGuide } from '@/components/TestUploadFormatGuide';
import TestSettingsPanel from '@/components/TestSettingsPanel';
import TestResultsPanel from '@/components/TestResultsPanel';
import { FileText } from 'lucide-react';
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

export default function UserTestManager() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

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
    const [viewingResultsTest, setViewingResultsTest] = useState<any>(null); // New State

    // Creator Check State
    const [isCreator, setIsCreator] = useState<boolean | null>(null);
    const [checkingCreator, setCheckingCreator] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        } else if (user?.id) {
            checkCreatorStatus();
            loadUserTests();
            loadCategories();
        }
    }, [user?.id, authLoading, navigate]);

    const checkCreatorStatus = async () => {
        if (!user) return;
        setCheckingCreator(true);
        const { data } = await supabase
            .from('profiles')
            .select('is_creator')
            .eq('id', user.id)
            .single();

        if (data) setIsCreator(data.is_creator);
        setCheckingCreator(false);
    };

    const loadCategories = async () => {
        const { data } = await fetchCategories();
        if (data) setCategories(data);
    };

    const loadUserTests = async () => {
        if (!user) return;
        setTestsLoading(true);
        try {
            const { data, error } = await fetchTestsByUserId(user.id);
            if (error) throw error;
            setTests(data || []);
        } catch (error) {
            console.error('Error loading tests:', error);
            toast.error("Failed to load your tests");
        } finally {
            setTestsLoading(false);
        }
    };

    const handleDeleteTest = (testId: string, testTitle: string) => {
        setDeleteId(testId);
        setDeleteTitle(testTitle);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            const { error } = await supabase.from('tests').delete().eq('id', deleteId);
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Your Tests</h1>
                    <p className="text-muted-foreground text-sm">Manage the tests you have generated.</p>
                </div>
                {/* ... Import buttons ... */}
                <div className="flex gap-3 items-center">
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

                                        // Sanitize JSON: Remove fields that don't exist in the DB (schema mismatch)
                                        // The JSON template includes marks_per_question/negative_marks for the generator, 
                                        // but the current 'tests' table apparently doesn't have these columns.
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
                                            // Ensure critical fields are present if missing in JSON (though validation passed)
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
                    <div className="col-span-full text-center py-10"><Loader2 className="animate-spin mx-auto" /></div>
                ) : tests.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-muted-foreground border rounded-lg border-dashed">
                        You haven't generated any tests yet.
                    </div>
                ) : (
                    tests.map(test => (
                        <Card key={test.id} className="relative group hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-lg line-clamp-1 text-amber-900" title={test.title}>{test.title}</CardTitle>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>
                                                    <Globe className="mr-2 h-4 w-4" /> Visibility
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent>
                                                    <DropdownMenuItem onClick={() => handleVisibilityChange(test, 'public')}>
                                                        <Globe className="mr-2 h-4 w-4" /> Public
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleVisibilityChange(test, 'unlisted')}>
                                                        <LinkIcon className="mr-2 h-4 w-4" /> Link Only
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleVisibilityChange(test, 'private')}>
                                                        <Lock className="mr-2 h-4 w-4" /> Private
                                                    </DropdownMenuItem>
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                            <DropdownMenuItem onClick={() => handleShare(test)}>
                                                <LinkIcon className="mr-2 h-4 w-4" /> Share Link
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="pb-2">
                                <div className="text-xs text-muted-foreground flex items-center gap-3">
                                    <Badge variant="outline" className="font-mono text-[10px] py-0 h-5 border-slate-300 text-slate-500">
                                        {test.custom_id || 'NO-ID'}
                                    </Badge>
                                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getVisibilityColor(test.visibility || (test.is_public ? 'public' : 'private'))}`}>
                                        {getVisibilityIcon(test.visibility || (test.is_public ? 'public' : 'private'))}
                                        <span className="uppercase">{(test.visibility === 'unlisted' ? 'Link' : test.visibility) || (test.is_public ? 'Public' : 'Private')}</span>
                                    </div>
                                    <span>{test.questions?.length || 0} Qs</span>
                                    <span>{test.duration || 0} mins</span>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-2 flex flex-wrap justify-between gap-2 border-t bg-slate-50/50 dark:bg-slate-900/50 items-center">
                                <div className="flex items-center gap-1 text-muted-foreground mr-auto pl-1" title="Likes">
                                    <Heart className="h-4 w-4" />
                                    <span className="text-sm font-medium">
                                        {test.test_likes?.[0]?.count || 0}
                                    </span>
                                </div>
                                <Button variant="outline" size="sm" className="h-8" onClick={() => openTestEditor(test)}>
                                    <Edit className="h-3 w-3 mr-2" />
                                    Edit
                                </Button>
                                <Button variant="secondary" size="sm" className="h-8" onClick={() => setConfiguringTest(test)}>
                                    <Settings className="h-3 w-3 mr-2" />
                                    Manage
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-slate-100"
                                    onClick={() => handleDeleteTest(test.id, test.title)}
                                    title="Delete Test"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
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
