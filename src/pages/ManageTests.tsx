import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Trash2, Settings, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { fetchSections, assignSectionsToTest, fetchTestSections, Section } from '@/lib/sectionsApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

export default function ManageTests() {
    const { loading: authLoading, isAdmin } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            navigate('/admin-login');
        }
    }, [authLoading, isAdmin, navigate]);

    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit Modal State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingTest, setEditingTest] = useState<any>(null);

    // Sections State
    const [availableSections, setAvailableSections] = useState<Section[]>([]);
    const [selectedSections, setSelectedSections] = useState<string[]>([]);

    useEffect(() => {
        loadTests();
        loadAllSections();
    }, []);

    const loadTests = async () => {
        try {
            const { data, error } = await supabase.from('tests').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setTests(data || []);
        } catch (error) {
            console.error('Error loading tests:', error);
            toast.error("Failed to load tests");
        } finally {
            setLoading(false);
        }
    };

    const loadAllSections = async () => {
        const { data } = await fetchSections();
        if (data) setAvailableSections(data);
    };

    const handleDeleteTest = async (testId: string, testTitle: string) => {
        if (!confirm(`Are you sure you want to delete "${testTitle}"?\n\nThis will permanently delete the test and all associated questions. This action cannot be undone.`)) {
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

    const openEditDialog = async (test: any) => {
        setEditingTest({ ...test });
        setIsEditOpen(true);

        // Load sections for this test
        const { data } = await fetchTestSections(test.id);
        setSelectedSections(data || []);
    };

    const handleSaveTest = async () => {
        if (!editingTest) return;

        try {
            // Update Test Details
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

            // Update Sections
            await assignSectionsToTest(editingTest.id, selectedSections);

            toast.success("Test updated successfully");
            setIsEditOpen(false);
            loadTests(); // Refresh list
        } catch (error: any) {
            console.error("Error updating test:", error);
            toast.error("Failed to update test: " + error.message);
        }
    };

    const toggleSection = (id: string) => {
        setSelectedSections(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    if (authLoading) return <div className="p-10 text-center">Checking permissions...</div>;
    if (!isAdmin) return null;

    return (
        <div className="container mx-auto max-w-5xl py-10 space-y-6">
            <BackButton />
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Manage Tests</h1>
                    <p className="text-muted-foreground">Edit test details, settings, and manage existing assessments.</p>
                </div>
                <Button variant="outline" onClick={loadTests} size="sm">Refresh List</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-10">Loading tests...</div>
                ) : tests.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-muted-foreground border rounded-lg border-dashed">
                        No tests found. Go to Admin Panel to add some.
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
                                <Button variant="outline" size="sm" className="w-full" onClick={() => openEditDialog(test)}>
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
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Test Details</DialogTitle>
                        <DialogDescription>Update test metadata and settings.</DialogDescription>
                    </DialogHeader>

                    {editingTest && (
                        <Tabs defaultValue="details" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="details">Details & Settings</TabsTrigger>
                                <TabsTrigger value="sections">Sections</TabsTrigger>
                            </TabsList>

                            <TabsContent value="details" className="space-y-4 py-4">
                                <div className="grid gap-4">
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
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="marks">Marks per Q</Label>
                                            <Input
                                                id="marks"
                                                type="number"
                                                value={editingTest.marks_per_question || ''}
                                                onChange={(e) => setEditingTest({ ...editingTest, marks_per_question: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="negative">Negative Marks</Label>
                                            <Input
                                                id="negative"
                                                type="number"
                                                step="0.25"
                                                value={editingTest.negative_marks !== undefined ? editingTest.negative_marks : 0}
                                                onChange={(e) => setEditingTest({ ...editingTest, negative_marks: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={editingTest.description || ''}
                                            onChange={(e) => setEditingTest({ ...editingTest, description: e.target.value })}
                                            rows={4}
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="sections" className="space-y-4 py-4">
                                <div className="flex flex-wrap gap-2">
                                    {availableSections.length === 0 && <span className="text-sm text-muted-foreground">No sections available.</span>}
                                    {availableSections.map(section => (
                                        <div key={section.id} className="flex items-center space-x-2 border p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer" onClick={() => toggleSection(section.id)}>
                                            <Checkbox
                                                id={`edit-section-${section.id}`}
                                                checked={selectedSections.includes(section.id)}
                                                onCheckedChange={() => toggleSection(section.id)}
                                            />
                                            <Label htmlFor={`edit-section-${section.id}`} className="cursor-pointer">{section.name}</Label>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveTest} disabled={!editingTest}>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
