
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Trash2, Settings, Save, Plus, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { fetchSections, assignSectionsToTest, fetchTestSections, updateSection, deleteSection, createSection, Section } from '@/lib/sectionsApi';
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
    const [selectedSectionsForTest, setSelectedSectionsForTest] = useState<string[]>([]);

    // Sections State
    const [sections, setSections] = useState<Section[]>([]);
    const [sectionsLoading, setSectionsLoading] = useState(true);
    const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<{ id?: string, name: string }>({ name: '' });

    // --- Effects ---
    useEffect(() => {
        loadTests();
        loadSections();
    }, []);

    // --- Loading Data ---
    const loadTests = async () => {
        setTestsLoading(true);
        try {
            const { data, error } = await supabase.from('tests').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setTests(data || []);
        } catch (error) {
            console.error('Error loading tests:', error);
            toast.error("Failed to load tests");
        } finally {
            setTestsLoading(false);
        }
    };

    const loadSections = async () => {
        setSectionsLoading(true);
        const { data } = await fetchSections();
        if (data) setSections(data);
        setSectionsLoading(false);
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
        setEditingTest({ ...test });
        setIsTestEditOpen(true);
        // Load sections for this test
        const { data } = await fetchTestSections(test.id);
        setSelectedSectionsForTest(data || []);
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
            await assignSectionsToTest(editingTest.id, selectedSectionsForTest);

            toast.success("Test updated successfully");
            setIsTestEditOpen(false);
            loadTests();
        } catch (error: any) {
            console.error("Error updating test:", error);
            toast.error("Failed to update test: " + error.message);
        }
    };

    const toggleSectionForTest = (id: string) => {
        setSelectedSectionsForTest(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };


    // --- Section Actions ---
    const openSectionDialog = (section?: Section) => {
        if (section) {
            setEditingSection({ id: section.id, name: section.name });
        } else {
            setEditingSection({ name: '' });
        }
        setIsSectionDialogOpen(true);
    };

    const handleSaveSection = async () => {
        if (!editingSection.name.trim()) return;

        try {
            if (editingSection.id) {
                // Update
                const { error } = await updateSection(editingSection.id, editingSection.name.trim());
                if (error) throw error;
                toast.success("Section updated");
            } else {
                // Create
                const { error } = await createSection(editingSection.name.trim());
                if (error) throw error;
                toast.success("Section created");
            }
            setIsSectionDialogOpen(false);
            loadSections();
        } catch (error: any) {
            console.error("Error saving section:", error);
            toast.error("Failed to save section");
        }
    };

    const handleDeleteSection = async (section: Section) => {
        if (!confirm(`Delete section "${section.name}" ? This will vanish from all tests.`)) return;

        try {
            const { error } = await deleteSection(section.id);
            if (error) throw error;
            toast.success("Section deleted");
            loadSections();
        } catch (error: any) {
            toast.error("Failed to delete section");
        }
    };


    if (authLoading) return <div className="p-10 text-center">Checking permissions...</div>;
    if (!isAdmin) return null;

    return (
        <div className="container mx-auto max-w-5xl py-10 space-y-6">
            <BackButton />
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Manage tests and master data.</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-[400px] grid-cols-2 mb-4">
                    <TabsTrigger value="tests">Manage Tests</TabsTrigger>
                    <TabsTrigger value="sections">Manage Sections</TabsTrigger>
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
                                <Card key={test.id} className="relative group hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <CardTitle className="text-lg line-clamp-1" title={test.title}>{test.title}</CardTitle>
                                            <Badge variant="secondary" className="font-mono text-xs">
                                                {test.custom_id || 'NO-ID'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-2">
                                        <div className="text-xs text-muted-foreground flex gap-4">
                                            <span>{test.questions?.length || 0} Qs</span>
                                            <span>{test.duration || 0} mins</span>
                                            <span>{test.marks_per_question || '-'} Marks</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-2 flex justify-between gap-2 border-t bg-slate-50/50 dark:bg-slate-900/50">
                                        <Button variant="outline" size="sm" className="w-full" onClick={() => openTestEditDialog(test)}>
                                            <Settings className="h-3 w-3 mr-2" />
                                            Edit Test
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
                                    </CardFooter>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                {/* --- SECTIONS TAB --- */}
                <TabsContent value="sections">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Test Sections</CardTitle>
                                    <CardDescription>Create and rename sections (e.g., JEE, NEET, Physics, Math).</CardDescription>
                                </div>
                                <Button onClick={() => openSectionDialog()} size="sm">
                                    <Plus className="w-4 h-4 mr-2" /> Add Section
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Section Name</TableHead>
                                        <TableHead className="w-[150px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sectionsLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                                        </TableRow>
                                    ) : sections.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center text-muted-foreground">No sections found.</TableCell>
                                        </TableRow>
                                    ) : (
                                        sections.map(section => (
                                            <TableRow key={section.id}>
                                                <TableCell className="font-medium">{section.name}</TableCell>
                                                <TableCell className="text-right flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openSectionDialog(section)}>
                                                        <Pencil className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSection(section)}>
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

            {/* TEST EDIT DIALOG */}
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
                            {/* Sections Selection inside Test Edit */}
                            <div className="grid gap-2">
                                <Label>Assigned Sections</Label>
                                <div className="flex flex-wrap gap-2 border p-3 rounded-md bg-slate-50 dark:bg-slate-900">
                                    {sections.map(section => (
                                        <div key={section.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`t - sec - ${section.id} `}
                                                checked={selectedSectionsForTest.includes(section.id)}
                                                onCheckedChange={() => toggleSectionForTest(section.id)}
                                            />
                                            <Label htmlFor={`t - sec - ${section.id} `}>{section.name}</Label>
                                        </div>
                                    ))}
                                    {sections.length === 0 && <span className="text-xs text-muted-foreground">No sections customized. Use "Manage Sections" tab to add some.</span>}
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

            {/* SECTION EDIT/ADD DIALOG */}
            <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingSection.id ? 'Edit Section' : 'Add New Section'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="sec-name">Section Name</Label>
                            <Input
                                id="sec-name"
                                value={editingSection.name}
                                onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                                placeholder="e.g. Physics, JEE Mains"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSectionDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveSection}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

