import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Trash2, Settings, Save, Plus, Pencil, FileText, Info, Clock, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
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

export default function ManageTests() {
    const { loading: authLoading, isAdmin } = useAuth();
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
    const [viewingCreator, setViewingCreator] = useState<any>(null); // For Creator Info Dialog

    // Categories State
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<{ id?: string, name: string }>({ name: '' });

    // Manage & Results State
    const [configuringTest, setConfiguringTest] = useState<any>(null);
    const [viewingResultsTest, setViewingResultsTest] = useState<any>(null);

    // --- Effects ---
    useEffect(() => {
        loadTests();
        loadCategories();
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
                <TabsList className="grid w-[400px] grid-cols-2 mb-4">
                    <TabsTrigger value="tests">Manage Tests</TabsTrigger>
                    <TabsTrigger value="categories">Manage Categories</TabsTrigger>
                </TabsList>

                {/* --- TESTS TAB --- */}
                <TabsContent value="tests" className="space-y-4">
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={loadTests} size="sm">Refresh Tests</Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {testsLoading ? (
                            <div className="col-span-full text-center py-10">Loading tests...</div>
                        ) : tests.length === 0 ? (
                            <div className="col-span-full text-center py-10 text-muted-foreground border rounded-lg border-dashed">
                                No tests found.
                            </div>
                        ) : (
                            tests.map(test => (
                                <Card key={test.id} className="relative group hover:shadow-md transition-shadow flex flex-col h-full">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <CardTitle className="text-lg line-clamp-2 leading-tight min-h-[3.5rem]" title={test.title}>
                                                {test.title}
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-2 flex-grow">
                                        <div className="text-xs text-muted-foreground flex flex-wrap gap-3 items-center">
                                            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border font-mono text-[10px]">
                                                ID: {test.custom_id || 'N/A'}
                                            </span>
                                            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {test.questions?.length || 0} Qs</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {test.duration || 0} m</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-2 flex flex-col gap-2 border-t bg-slate-50/50 dark:bg-slate-900/50">
                                        <div className="flex flex-wrap justify-between gap-2 w-full">
                                            <Button variant="outline" size="sm" className="h-8 flex-1" onClick={() => openTestEditDialog(test)}>
                                                <Pencil className="h-3 w-3 mr-2" />
                                                Edit
                                            </Button>
                                            <Button variant="secondary" size="sm" className="h-8 flex-1" onClick={() => setConfiguringTest(test)}>
                                                <Settings className="h-3 w-3 mr-2" />
                                                Manage
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDeleteTest(test.id, test.title)}
                                                title="Delete Test"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* Creator Info Trigger */}
                                        <div className="w-full flex justify-start pt-1">
                                            <div
                                                className="group/info relative flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-600 cursor-pointer transition-colors"
                                                onClick={() => handleViewCreator(test.created_by)}
                                            >
                                                <Info className="w-3 h-3" />
                                                <span>Creator Info</span>
                                            </div>
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))
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
        </div>
    );
}


