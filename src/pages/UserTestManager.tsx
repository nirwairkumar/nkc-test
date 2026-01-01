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
import { fetchSections, createSection, fetchTestSections, assignSectionsToTest } from '@/lib/sectionsApi';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Upload } from 'lucide-react';
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

    // Section State
    const [sections, setSections] = useState<any[]>([]);
    const [selectedSection, setSelectedSection] = useState<string>("none");
    const [isNewSectionMode, setIsNewSectionMode] = useState(false);
    const [newSectionName, setNewSectionName] = useState("");

    const [configuringTest, setConfiguringTest] = useState<any>(null);
    const [viewingResultsTest, setViewingResultsTest] = useState<any>(null); // New State

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        } else if (user?.id) {
            loadUserTests();
            loadSections();
        }
    }, [user?.id, authLoading, navigate]);

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

    if (authLoading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
    if (!user) return null;

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
        <div className="container mx-auto max-w-5xl py-10 space-y-6">
            {/* ... Header ... */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Your Tests</h1>
                    <p className="text-muted-foreground">Manage the tests you have generated.</p>
                </div>
                {/* ... Import buttons ... */}
                <div className="flex gap-4 items-start">
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

                                        if (!json.title || !json.questions || !Array.isArray(json.questions)) {
                                            toast.error("Invalid JSON format. Must have 'title' and 'questions' array.");
                                            return;
                                        }

                                        const { createTest, getNextTestId } = await import('@/lib/testsApi');
                                        const customId = await getNextTestId('M');

                                        const newTest = {
                                            ...json,
                                            created_by: user.id,
                                            custom_id: customId,
                                            creator_name: user.user_metadata?.full_name || 'Anonymous',
                                            creator_avatar: user.user_metadata?.avatar_url || '',
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
                            <Button variant="outline" size="sm" asChild>
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
                        setConfiguringTest(null);
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
