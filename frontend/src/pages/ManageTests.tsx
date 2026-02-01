import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Trash2, Settings, Save, Plus, Pencil, FileText, Info, Clock, CheckCircle, Search, RefreshCw, Users, BookOpen, GraduationCap, MoreVertical, Globe, Link as LinkIcon, Lock, Check, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { fetchCategories, assignCategoriesToTest, fetchTestCategories, updateCategory, deleteCategory, createCategory, Category } from '@/lib/categoriesApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import TestSettingsPanel from '@/components/TestSettingsPanel';
import TestResultsPanel from '@/components/TestResultsPanel';
import VerifiedBadge from '@/components/ui/VerifiedBadge';

export default function ManageTests() {
    const { user, loading: authLoading, isAdmin } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            navigate('/admin-login');
        }
    }, [authLoading, isAdmin, navigate]);

    // --- State ---
    const [activeTab, setActiveTab] = useState("tests");

    // Tests State
    const [tests, setTests] = useState<any[]>([]);
    const [testsLoading, setTestsLoading] = useState(true);
    const [isTestEditOpen, setIsTestEditOpen] = useState(false);
    const [editingTest, setEditingTest] = useState<any>(null);

    const [selectedCategoriesForTest, setSelectedCategoriesForTest] = useState<string[]>([]);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const placeholders = ["Search by Title...", "Search by ID...", "Search by Creator...", "Search by Tags..."];

    const [viewingCreator, setViewingCreator] = useState<any>(null); // For Creator Info Dialog

    // Categories State
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<{ id?: string, name: string }>({ name: '' });

    // Users State
    const [users, setUsers] = useState<any[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [viewingUser, setViewingUser] = useState<any>(null); // For User Details Dialog
    const [userDetails, setUserDetails] = useState<any>({ createdTests: [], attempts: [] });

    // Manage & Results State
    const [configuringTest, setConfiguringTest] = useState<any>(null);
    const [viewingResultsTest, setViewingResultsTest] = useState<any>(null);

    // Three-dot menu state
    const [allClasses, setAllClasses] = useState<any[]>([]);

    // --- Effects ---
    useEffect(() => {
        loadTests();
        loadCategories();
        loadUsers();
        loadAllClasses();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // --- Loading Data ---
    const loadTests = async () => {
        setTestsLoading(true);
        try {
            // Reverted to simple select to prevent join errors
            const { data, error } = await supabase
                .from('tests')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setTests(data || []);
        } catch (error) {
            console.error('Error loading tests:', error);
            toast.error("Failed to load tests");
        } finally {
            setTestsLoading(false);
        }
    };

    // Helper to count tests by a creator
    const getCreatorTestCount = (creatorId: string) => {
        return tests.filter(t => t.created_by === creatorId).length;
    };

    const handleViewCreator = async (creatorId: string) => {
        if (!creatorId) {
            toast.error("No creator ID found for this test.");
            return;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', creatorId)
                .single();

            if (error) throw error;

            setViewingCreator({
                ...data, // Profile data
                testCount: getCreatorTestCount(creatorId)
            });
        } catch (error) {
            console.error("Error fetching creator:", error);
            toast.error("Could not fetch creator details.");
        }
    };

    const loadCategories = async () => {
        setCategoriesLoading(true);
        const { data } = await fetchCategories();
        if (data) setCategories(data);
        setCategoriesLoading(false);
    };

    const loadUsers = async () => {
        setUsersLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error("Error loading users:", error);
            toast.error("Failed to load users");
        } finally {
            setUsersLoading(false);
        }
    };

    const handleViewUserDetails = async (user: any) => {
        setViewingUser(user);
        setUserDetails({ createdTests: [], attempts: [] }); // Reset

        try {
            // 1. Fetch Created Tests
            const { data: createdTests } = await supabase
                .from('tests')
                .select('id, title, created_at, questions')
                .eq('created_by', user.id)
                .order('created_at', { ascending: false });

            // 2. Fetch Attempts (History)
            // Note: We need test titles. For optimization, we fetch attempts then join or fetch test info.
            const { data: attempts } = await supabase
                .from('user_tests')
                .select('id, test_id, score, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            // Fetch test titles for attempts if needed (or just show IDs/Dates)
            // Let's do a quick enrichment if attempts exist
            let enrichedAttempts = attempts || [];
            if (attempts && attempts.length > 0) {
                const testIds = Array.from(new Set(attempts.map(a => a.test_id)));
                const { data: testInfos } = await supabase.from('tests').select('id, title').in('id', testIds);
                const testMap = new Map(testInfos?.map(t => [t.id, t.title]));
                enrichedAttempts = attempts.map(a => ({ ...a, test_title: testMap.get(a.test_id) || 'Unknown Test' }));
            }

            setUserDetails({
                createdTests: createdTests || [],
                attempts: enrichedAttempts
            });

        } catch (error) {
            console.error("Error fetching user details", error);
            toast.error("Could not load full user details");
        }
    };

    const filteredUsers = users.filter(user => {
        if (!userSearchQuery) return true;
        const q = userSearchQuery.toLowerCase();
        return (
            (user.full_name?.toLowerCase() || '').includes(q) ||
            (user.email?.toLowerCase() || '').includes(q) ||
            (user.id?.toLowerCase() || '').includes(q)
        );
    });

    // --- Three-dot Menu Handlers ---
    const loadAllClasses = async () => {
        try {
            const { data, error } = await supabase.from('classes').select('*');
            if (error) throw error;
            setAllClasses(data || []);
        } catch (error) {
            console.error("Error loading classes:", error);
        }
    };

    const handleShare = (test: any) => {
        const path = test.slug ? `/test/${test.slug}` : `/test-intro/${test.id}`;
        const url = `${window.location.origin}${path}`;
        navigator.clipboard.writeText(url);
        toast.success("Test link copied!");
    };

    const handleVisibilityChange = async (test: any, newVisibility: 'public' | 'unlisted' | 'private') => {
        const isPublic = newVisibility === 'public';

        try {
            const { error } = await supabase
                .from('tests')
                .update({ visibility: newVisibility, is_public: isPublic })
                .eq('id', test.id);

            if (error) throw error;

            toast.success(`Visibility set to ${newVisibility === 'unlisted' ? 'Link Only' : newVisibility.charAt(0).toUpperCase() + newVisibility.slice(1)}`);
            loadTests(); // Refresh to show updated data
        } catch (error: any) {
            console.error("Failed to update visibility:", error);
            toast.error("Failed to update visibility");
        }
    };

    const handleClassChange = async (test: any, classId: string | null, className: string | null) => {
        try {
            const { error } = await supabase
                .from('tests')
                .update({ class_id: classId })
                .eq('id', test.id);

            if (error) throw error;

            toast.success(classId ? `Assigned to ${className}` : "Removed from class");
            loadTests(); // Refresh to show updated data
        } catch (error: any) {
            console.error("Failed to update class assignment:", error);
            toast.error("Failed to update class assignment");
        }
    };

    const getVisibilityIcon = (visibility: string) => {
        switch (visibility) {
            case 'public': return <Globe className="h-4 w-4" />;
            case 'unlisted': return <LinkIcon className="h-4 w-4" />;
            case 'private': return <Lock className="h-4 w-4" />;
            default: return <Globe className="h-4 w-4" />;
        }
    };

    // --- Verified Creator Actions ---
    const handleVerifyUser = async (userToVerify: any) => {
        if (!confirm(`Are you sure you want to verify "${userToVerify.full_name}" as an Authorized Partner?`)) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    is_verified_creator: true,
                    verified_role: 'authorized_partner',
                    verified_at: new Date().toISOString(),
                    verified_by_admin_id: user?.id
                })
                .eq('id', userToVerify.id);

            if (error) throw error;
            toast.success(`${userToVerify.full_name} is now a Verified Creator!`);
            loadUsers();
        } catch (error: any) {
            console.error("Error verifying user:", error);
            toast.error("Failed to verify user: " + error.message);
        }
    };

    const handleRevokeVerification = async (userToRevoke: any) => {
        if (!confirm(`Are you sure you want to REVOKE verification for "${userToRevoke.full_name}"?`)) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    is_verified_creator: false,
                    verified_role: null,
                    verified_at: null,
                    verified_by_admin_id: null
                })
                .eq('id', userToRevoke.id);

            if (error) throw error;
            toast.success(`Verification revoked for ${userToRevoke.full_name}`);
            loadUsers();
        } catch (error: any) {
            console.error("Error revoking verification:", error);
            toast.error("Failed to revoke verification: " + error.message);
        }
    };

    // --- Test Actions ---
    const handleDeleteTest = async (testId: string, testTitle: string) => {
        if (!confirm(`Are you sure you want to delete "${testTitle}" ?\n\nThis will permanently delete the test and all associated questions.`)) {
            return;
        }
        try {
            const { error } = await supabase.from('tests').delete().eq('id', testId);
            if (error) throw error;
            setTests(prev => prev.filter(t => t.id !== testId));
            toast.success(`Test "${testTitle}" deleted`);
        } catch (error: any) {
            console.error('Error deleting test:', error);
            toast.error('Failed to delete test: ' + error.message);
        }
    };

    const openTestEditDialog = async (test: any) => {
        // Navigate to the full editor instead of the limited dialog
        navigate(`/edit-test/${test.id}`);
    };

    const handleSaveTest = async () => {
        if (!editingTest) return;
        try {
            const { error } = await supabase
                .from('tests')
                .update({
                    title: editingTest.title,
                    description: editingTest.description,
                    custom_id: editingTest.custom_id,
                    marks_per_question: parseFloat(editingTest.marks_per_question),
                    negative_marks: parseFloat(editingTest.negative_marks),
                    duration: parseFloat(editingTest.duration)
                })
                .eq('id', editingTest.id);

            if (error) throw error;
            await assignCategoriesToTest(editingTest.id, selectedCategoriesForTest);

            toast.success("Test updated successfully");
            setIsTestEditOpen(false);
            loadTests();
        } catch (error: any) {
            console.error("Error updating test:", error);
            toast.error("Failed to update test: " + error.message);
        }
    };

    const toggleCategoryForTest = (id: string) => {
        setSelectedCategoriesForTest(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };


    // --- Category Actions ---
    const openCategoryDialog = (category?: Category) => {
        if (category) {
            setEditingCategory({ id: category.id, name: category.name });
        } else {
            setEditingCategory({ name: '' });
        }
        setIsCategoryDialogOpen(true);
    };

    const handleSaveCategory = async () => {
        if (!editingCategory.name.trim()) return;

        try {
            if (editingCategory.id) {
                // Update
                const { error } = await updateCategory(editingCategory.id, editingCategory.name.trim());
                if (error) throw error;
                toast.success("Category updated");
            } else {
                // Create
                const { error } = await createCategory(editingCategory.name.trim());
                if (error) throw error;
                toast.success("Category created");
            }
            setIsCategoryDialogOpen(false);
            loadCategories();
        } catch (error: any) {
            console.error("Error saving category:", error);
            toast.error("Failed to save category");
        }
    };

    const handleDeleteCategory = async (category: Category) => {
        if (!confirm(`Delete category "${category.name}" ? This will vanish from all tests.`)) return;

        try {
            const { error } = await deleteCategory(category.id);
            if (error) throw error;
            toast.success("Category deleted");
            loadCategories();
        } catch (error: any) {
            toast.error("Failed to delete category");
        }
    };


    const filteredTests = tests.filter(test => {
        if (!searchQuery) return true;
        const lowerQuery = searchQuery.toLowerCase();

        // Match Title
        if (test.title.toLowerCase().includes(lowerQuery)) return true;
        // Match ID
        if (test.custom_id?.toLowerCase().includes(lowerQuery)) return true;
        // Match Creator (if available in future, using ID for now or any profile data loaded)
        // Since we lazy load profiles, we can only search by what's in 'test' object or if we fetching profiles eagerly (which we reverted).
        // The user asked for "search particular test". Title and ID are most critical. 
        // We can add simple tag search if tags exist.
        if (test.tags?.some((t: string) => t.toLowerCase().includes(lowerQuery))) return true;

        return false;
    });

    if (authLoading) return <div className="p-10 text-center">Checking permissions...</div>;
    if (!isAdmin) return null;

    return (
        <div className="container mx-auto max-w-5xl py-10 space-y-6">

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Manage tests and master data.</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full md:w-[800px] grid-cols-4 mb-4">
                    <TabsTrigger value="tests">Manage Tests</TabsTrigger>
                    <TabsTrigger value="categories">Categories</TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="verified_creators">Verified</TabsTrigger>
                </TabsList>

                {/* --- TESTS TAB --- */}
                <TabsContent value="tests" className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        {/* Search Bar */}
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={placeholders[placeholderIndex]}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 bg-background"
                            />
                        </div>
                        <Button variant="outline" onClick={loadTests} size="sm" className="whitespace-nowrap">
                            <RefreshCw className={`h-4 w-4 mr-2 ${testsLoading ? 'animate-spin' : ''}`} />
                            <span className="hidden md:inline">Refresh Tests</span>
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {testsLoading ? (
                            <div className="col-span-full text-center py-10">Loading tests...</div>
                        ) : filteredTests.length === 0 ? (
                            <div className="col-span-full text-center py-10 text-muted-foreground border rounded-lg border-dashed">
                                {searchQuery ? "No matching tests found." : "No tests found."}
                            </div>
                        ) : (
                            filteredTests.map(test => {
                                const currentVisibility = test.visibility || (test.is_public ? 'public' : 'private');
                                const className = test.classes?.name || null;

                                return (
                                    <Card key={test.id} className="relative group hover:shadow-md transition-shadow flex flex-col h-full">
                                        {/* Top Icons Row */}
                                        <div className="absolute top-2 left-2 right-2 z-10 flex justify-between items-start">
                                            {/* Creator Info Icon - Left */}
                                            <div
                                                className="text-slate-400 hover:text-blue-600 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleViewCreator(test.created_by);
                                                }}
                                                title="Creator Info"
                                            >
                                                <Info className="w-4 h-4" />
                                            </div>

                                            {/* Three-dot Menu - Right */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 hover:bg-white text-muted-foreground hover:text-primary shadow-sm">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56">
                                                    {/* Visibility Submenu */}
                                                    <DropdownMenuSub>
                                                        <DropdownMenuSubTrigger>
                                                            {getVisibilityIcon(currentVisibility)}
                                                            <span className="ml-2">Visibility</span>
                                                        </DropdownMenuSubTrigger>
                                                        <DropdownMenuSubContent>
                                                            <DropdownMenuItem onClick={() => handleVisibilityChange(test, 'public')}>
                                                                <Globe className="mr-2 h-4 w-4" /> Public
                                                                {currentVisibility === 'public' && <Check className="ml-auto h-4 w-4" />}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleVisibilityChange(test, 'unlisted')}>
                                                                <LinkIcon className="mr-2 h-4 w-4" /> Link Only
                                                                {currentVisibility === 'unlisted' && <Check className="ml-auto h-4 w-4" />}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleVisibilityChange(test, 'private')}>
                                                                <Lock className="mr-2 h-4 w-4" /> Private
                                                                {currentVisibility === 'private' && <Check className="ml-auto h-4 w-4" />}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuSubContent>
                                                    </DropdownMenuSub>

                                                    {/* Share Link */}
                                                    <DropdownMenuItem onClick={() => handleShare(test)}>
                                                        <LinkIcon className="mr-2 h-4 w-4" /> Share Link
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator />

                                                    {/* Class Assignment Submenu */}
                                                    <DropdownMenuSub>
                                                        <DropdownMenuSubTrigger>
                                                            <GraduationCap className="mr-2 h-4 w-4" /> Assign Class
                                                        </DropdownMenuSubTrigger>
                                                        <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                                                            {allClasses.length === 0 ? (
                                                                <DropdownMenuItem disabled>No classes found</DropdownMenuItem>
                                                            ) : (
                                                                <>
                                                                    <DropdownMenuItem onClick={() => handleClassChange(test, null, null)}>
                                                                        <span className="opacity-50">None</span>
                                                                        {!test.class_id && <Check className="ml-auto h-4 w-4" />}
                                                                    </DropdownMenuItem>
                                                                    {allClasses.map(cls => (
                                                                        <DropdownMenuItem key={cls.id} onClick={() => handleClassChange(test, cls.id, cls.name)}>
                                                                            {cls.name}
                                                                            {test.class_id === cls.id && <Check className="ml-auto h-4 w-4" />}
                                                                        </DropdownMenuItem>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </DropdownMenuSubContent>
                                                    </DropdownMenuSub>

                                                    <DropdownMenuSeparator />

                                                    {/* Edit Action */}
                                                    <DropdownMenuItem onClick={() => openTestEditDialog(test)}>
                                                        <Pencil className="mr-2 h-4 w-4" /> Edit Test
                                                    </DropdownMenuItem>

                                                    {/* Manage Action */}
                                                    <DropdownMenuItem onClick={() => setConfiguringTest(test)}>
                                                        <Settings className="mr-2 h-4 w-4" /> Manage Settings
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator />

                                                    {/* Delete Action */}
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteTest(test.id, test.title)}
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Test
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <CardHeader className="pb-2 pt-6">
                                            <div className="flex justify-between items-start gap-2">
                                                <CardTitle className="text-lg line-clamp-2 leading-tight min-h-[3.5rem]" title={test.title}>
                                                    {test.title}
                                                </CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pb-2 flex-grow">
                                            <div className="text-xs text-muted-foreground flex flex-wrap gap-3 items-center">
                                                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {test.questions?.length || 0} Qs</span>
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {test.duration || 0} m</span>
                                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border font-mono text-[10px] ml-auto">
                                                    ID: {test.custom_id || 'N/A'}
                                                </span>
                                            </div>
                                            {className && (
                                                <div className="mt-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 w-fit">
                                                    <GraduationCap className="h-3 w-3" />
                                                    <span className="uppercase">{className}</span>
                                                </div>
                                            )}
                                        </CardContent>
                                        <CardFooter className="pt-2 flex gap-2 border-t bg-slate-50/50 dark:bg-slate-900/50">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 flex-1"
                                                onClick={() => navigate(`/test-intro/${test.id}`)}
                                            >
                                                <ArrowRight className="h-3 w-3 mr-2" />
                                                View
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 flex-1"
                                                onClick={() => setViewingResultsTest(test)}
                                            >
                                                <FileText className="h-3 w-3 mr-2" />
                                                Results
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </TabsContent>

                {/* --- CATEGORIES TAB --- */}
                <TabsContent value="categories">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Test Categories</CardTitle>
                                    <CardDescription>Create and rename categories (e.g., JEE, NEET, Physics, Math).</CardDescription>
                                </div>
                                <Button onClick={() => openCategoryDialog()} size="sm">
                                    <Plus className="w-4 h-4 mr-2" /> Add Category
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Category Name</TableHead>
                                        <TableHead className="w-[150px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categoriesLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                                        </TableRow>
                                    ) : categories.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center text-muted-foreground">No categories found.</TableCell>
                                        </TableRow>
                                    ) : (
                                        categories.map(category => (
                                            <TableRow key={category.id}>
                                                <TableCell className="font-medium">{category.name}</TableCell>
                                                <TableCell className="text-right flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openCategoryDialog(category)}>
                                                        <Pencil className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category)}>
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- USERS TAB --- */}
                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <CardTitle>Registered Users</CardTitle>
                                    <CardDescription>View and manage all users on the platform.</CardDescription>
                                </div>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search users..."
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {usersLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8">Loading users...</TableCell>
                                        </TableRow>
                                    ) : filteredUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No users found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredUsers.map(user => (
                                            <TableRow key={user.id}>
                                                <TableCell>
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={user.avatar_url} />
                                                        <AvatarFallback>{(user.full_name || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                </TableCell>
                                                <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                                                <TableCell>{user.email}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => handleViewUserDetails(user)}>
                                                        View Profile
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- VERIFIED CREATORS TAB --- */}
                <TabsContent value="verified_creators">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <CardTitle>Manage Verified Creators</CardTitle>
                                    <CardDescription>Grant or revoke "Authorized Partner" status.</CardDescription>
                                </div>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search users..."
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Verified Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {usersLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">Loading users...</TableCell>
                                        </TableRow>
                                    ) : filteredUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No users found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredUsers.map(user => (
                                            <TableRow key={user.id}>
                                                <TableCell>
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={user.avatar_url} />
                                                        <AvatarFallback>{(user.full_name || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                </TableCell>
                                                <TableCell className="font-medium flex items-center gap-2">
                                                    {user.full_name || 'N/A'}
                                                    {user.is_verified_creator && <VerifiedBadge size={14} />}
                                                </TableCell>
                                                <TableCell>{user.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{user.designation || 'Student'}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {user.is_verified_creator ? (
                                                        <span className="text-green-600 font-semibold text-xs flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" /> YES
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">No</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {user.is_verified_creator ? (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleRevokeVerification(user)}
                                                            className="h-7 text-xs"
                                                        >
                                                            Remove Verified Status
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="default" // "Make Verified Creator"
                                                            size="sm"
                                                            onClick={() => handleVerifyUser(user)}
                                                            className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                                                        >
                                                            Make Verified Creator
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* TEST EDIT DIALOG - Leaving this logic even if using router, for backwards compat/safety */}
            <Dialog open={isTestEditOpen} onOpenChange={setIsTestEditOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Test Details</DialogTitle>
                        <DialogDescription>Update test metadata and settings.</DialogDescription>
                    </DialogHeader>

                    {editingTest && (
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Test Title</Label>
                                <Input
                                    id="title"
                                    value={editingTest.title}
                                    onChange={(e) => setEditingTest({ ...editingTest, title: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="custom_id">Custom ID</Label>
                                    <Input
                                        id="custom_id"
                                        value={editingTest.custom_id || ''}
                                        onChange={(e) => setEditingTest({ ...editingTest, custom_id: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="duration">Duration (mins)</Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        value={editingTest.duration || ''}
                                        onChange={(e) => setEditingTest({ ...editingTest, duration: e.target.value })}
                                    />
                                </div>
                            </div>
                            {/* Categories Selection inside Test Edit */}
                            <div className="grid gap-2">
                                <Label>Assigned Categories</Label>
                                <div className="flex flex-wrap gap-2 border p-3 rounded-md bg-slate-50 dark:bg-slate-900">
                                    {categories.map(category => (
                                        <div key={category.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`t - cat - ${category.id} `}
                                                checked={selectedCategoriesForTest.includes(category.id)}
                                                onCheckedChange={() => toggleCategoryForTest(category.id)}
                                            />
                                            <Label htmlFor={`t - cat - ${category.id} `}>{category.name}</Label>
                                        </div>
                                    ))}
                                    {categories.length === 0 && <span className="text-xs text-muted-foreground">No categories customized. Use "Manage Categories" tab to add some.</span>}
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={editingTest.description || ''}
                                    onChange={(e) => setEditingTest({ ...editingTest, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTestEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveTest}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CATEGORY EDIT/ADD DIALOG */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory.id ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="cat-name">Category Name</Label>
                            <Input
                                id="cat-name"
                                value={editingCategory.name}
                                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                placeholder="e.g. Physics, JEE Mains"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveCategory}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {configuringTest && (
                <TestSettingsPanel
                    test={configuringTest}
                    onClose={() => setConfiguringTest(null)}
                    onUpdate={loadTests}
                    onViewResults={() => {
                        setConfiguringTest(null);
                        setViewingResultsTest(configuringTest);
                    }}
                />
            )}

            {viewingResultsTest && (
                <TestResultsPanel
                    test={viewingResultsTest}
                    onClose={() => setViewingResultsTest(null)}
                />
            )}

            {/* Creator Info Dialog */}
            <Dialog open={!!viewingCreator} onOpenChange={(open) => !open && setViewingCreator(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Creator Details</DialogTitle>
                        <DialogDescription>Information about the test creator.</DialogDescription>
                    </DialogHeader>
                    {viewingCreator && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <Avatar className="h-20 w-20 border-2 border-slate-200">
                                <AvatarImage src={viewingCreator.avatar_url} />
                                <AvatarFallback className="text-xl bg-slate-100">{viewingCreator.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="text-center space-y-1">
                                <h3 className="font-bold text-xl">{viewingCreator.full_name}</h3>
                                <Badge variant="secondary">{viewingCreator.designation || 'Member'}</Badge>
                                <p className="text-sm text-muted-foreground">{viewingCreator.email}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full mt-2">
                                <div className="bg-slate-50 p-3 rounded-lg text-center border">
                                    <div className="text-2xl font-bold">{viewingCreator.testCount}</div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Tests Created</div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg text-center border flex flex-col items-center justify-center">
                                    <span className="text-sm font-medium">Status</span>
                                    <span className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Active</span>
                                </div>
                            </div>

                            {viewingCreator.bio && (
                                <div className="w-full bg-slate-50 p-3 rounded-lg border mt-2">
                                    <h4 className="text-xs font-semibold text-slate-500 mb-1">BIO</h4>
                                    <p className="text-sm text-slate-700 italic">"{viewingCreator.bio}"</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* USER DETAILS DIALOG (Admin View) */}
            <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>User Profile</DialogTitle>
                    </DialogHeader>
                    {viewingUser && (
                        <div className="space-y-6">
                            {/* Header Info */}
                            <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                                <Avatar className="h-20 w-20 border-2 border-white shadow-sm">
                                    <AvatarImage src={viewingUser.avatar_url} />
                                    <AvatarFallback className="text-xl">{viewingUser.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-center md:text-left space-y-1">
                                    <h2 className="text-2xl font-bold">{viewingUser.full_name}</h2>
                                    <p className="text-muted-foreground">{viewingUser.email}</p>
                                    <div className="flex items-center justify-center md:justify-start gap-2 pt-1 text-xs text-slate-500 font-mono">
                                        ID: {viewingUser.id}
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="text-center p-2 bg-white dark:bg-black rounded border min-w-[80px]">
                                        <div className="text-2xl font-bold">{userDetails.createdTests?.length || 0}</div>
                                        <div className="text-[10px] uppercase text-muted-foreground font-semibold">Tests Created</div>
                                    </div>
                                    <div className="text-center p-2 bg-white dark:bg-black rounded border min-w-[80px]">
                                        <div className="text-2xl font-bold">{userDetails.attempts?.length || 0}</div>
                                        <div className="text-[10px] uppercase text-muted-foreground font-semibold">Tests Taken</div>
                                    </div>
                                </div>
                            </div>

                            <Tabs defaultValue="created" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="created" className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4" /> Created Tests
                                    </TabsTrigger>
                                    <TabsTrigger value="history" className="flex items-center gap-2">
                                        <GraduationCap className="w-4 h-4" /> Attempt History
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="created" className="mt-4 border rounded-md p-0 overflow-hidden">
                                    {userDetails.createdTests.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">No tests created by this user.</div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50/50">
                                                    <TableHead>Test Title</TableHead>
                                                    <TableHead>Created</TableHead>
                                                    <TableHead>Questions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {userDetails.createdTests.map((t: any) => (
                                                    <TableRow key={t.id}>
                                                        <TableCell className="font-medium">{t.title}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                                                        <TableCell>{t.questions?.length || 0}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </TabsContent>

                                <TabsContent value="history" className="mt-4 border rounded-md p-0 overflow-hidden">
                                    {userDetails.attempts.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">No tests taken by this user.</div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50/50">
                                                    <TableHead>Test Name</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Score</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {userDetails.attempts.map((a: any) => (
                                                    <TableRow key={a.id}>
                                                        <TableCell className="font-medium">{a.test_title}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{a.score}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </div >
    );
}
