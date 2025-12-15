import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Trash2, Settings, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from "sonner";
import { fetchTestsByUserId } from '@/lib/testsApi';
import { fetchSections, createSection, fetchTestSections, assignSectionsToTest } from '@/lib/sectionsApi';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus } from 'lucide-react';

export default function UserTestManager() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Tests State
    const [tests, setTests] = useState<any[]>([]);
    const [testsLoading, setTestsLoading] = useState(true);
    const [isTestEditOpen, setIsTestEditOpen] = useState(false);
    const [editingTest, setEditingTest] = useState<any>(null);

    // Section State
    const [sections, setSections] = useState<any[]>([]);
    const [selectedSection, setSelectedSection] = useState<string>("none");
    const [isNewSectionMode, setIsNewSectionMode] = useState(false);
    const [newSectionName, setNewSectionName] = useState("");

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        } else if (user) {
            loadUserTests();
            loadSections();
        }
    }, [user, authLoading, navigate]);

    const loadSections = async () => {
        const { data } = await fetchSections();
        if (data) setSections(data);
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

    const handleDeleteTest = async (testId: string, testTitle: string) => {
        if (!confirm(`Are you sure you want to delete "${testTitle}" ?\n\nThis will permanently delete the test.`)) {
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
        setIsNewSectionMode(false);
        setNewSectionName("");

        // Fetch current section
        const { data } = await fetchTestSections(test.id);
        if (data && data.length > 0) {
            setSelectedSection(data[0]);
        } else {
            setSelectedSection("none");
        }

        setIsTestEditOpen(true);
    };

    const handleCreateSection = async () => {
        if (!newSectionName.trim()) return;
        try {
            const { data, error } = await createSection(newSectionName.trim());
            if (error) throw error;
            setSections(prev => [...prev, data]);
            setSelectedSection(data.id);
            setIsNewSectionMode(false);
            setNewSectionName("");
            toast.success("Section created!");
        } catch (error: any) {
            toast.error("Failed to create section: " + error.message);
        }
    };

    const handleSaveTest = async () => {
        if (!editingTest) return;
        try {
            const { error } = await supabase
                .from('tests')
                .update({
                    title: editingTest.title,
                    description: editingTest.description,
                    revision_notes: editingTest.revision_notes,
                    marks_per_question: parseFloat(editingTest.marks_per_question),
                    negative_marks: parseFloat(editingTest.negative_marks),
                    duration: parseFloat(editingTest.duration)
                })
                .eq('id', editingTest.id);

            if (error) throw error;

            // Update Section Association
            if (selectedSection && selectedSection !== "none") {
                await assignSectionsToTest(editingTest.id, [selectedSection]);
            } else {
                await assignSectionsToTest(editingTest.id, []);
            }

            toast.success("Test updated successfully");
            setIsTestEditOpen(false);
            loadUserTests();
        } catch (error: any) {
            console.error("Error updating test:", error);
            toast.error("Failed to update test: " + error.message);
        }
    };

    if (authLoading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
    if (!user) return null;

    return (
        <div className="container mx-auto max-w-5xl py-10 space-y-6">
            <BackButton />
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Your Tests</h1>
                    <p className="text-muted-foreground">Manage the tests you have generated.</p>
                </div>
                <Button variant="outline" onClick={loadUserTests} size="sm">Refresh</Button>
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
                                    Edit
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

            {/* TEST EDIT DIALOG */}
            <Dialog open={isTestEditOpen} onOpenChange={setIsTestEditOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Test Details</DialogTitle>
                        <DialogDescription>Update your test settings.</DialogDescription>
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

                            <div className="grid gap-2">
                                <Label>Section (Topic/Exam)</Label>
                                {!isNewSectionMode ? (
                                    <div className="flex gap-2">
                                        <Select value={selectedSection} onValueChange={(val) => {
                                            if (val === "new") {
                                                setIsNewSectionMode(true);
                                            } else {
                                                setSelectedSection(val);
                                            }
                                        }}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a section" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No Section</SelectItem>
                                                {sections.map((sec: any) => (
                                                    <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                                                ))}
                                                <SelectItem value="new" className="text-blue-600 font-medium">
                                                    + Create New Section
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Enter new section name (e.g. JEE/NEET)"
                                            value={newSectionName}
                                            onChange={(e) => setNewSectionName(e.target.value)}
                                        />
                                        <Button size="sm" onClick={handleCreateSection}>Create</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setIsNewSectionMode(false)}>Cancel</Button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="duration">Duration (mins)</Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        value={editingTest.duration || ''}
                                        onChange={(e) => setEditingTest({ ...editingTest, duration: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="marks">Marks/Q</Label>
                                    <Input
                                        id="marks"
                                        type="number"
                                        value={editingTest.marks_per_question || ''}
                                        onChange={(e) => setEditingTest({ ...editingTest, marks_per_question: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="neg_marks">Negative Marks</Label>
                                    <Input
                                        id="neg_marks"
                                        type="number"
                                        step="0.25"
                                        value={editingTest.negative_marks || ''}
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
                                    rows={2}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="summary">Summary / Revision Notes (Markdown)</Label>
                                <Textarea
                                    id="summary"
                                    value={editingTest.revision_notes || ''}
                                    onChange={(e) => setEditingTest({ ...editingTest, revision_notes: e.target.value })}
                                    rows={5}
                                    className="font-mono text-sm"
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
        </div>
    );
}
