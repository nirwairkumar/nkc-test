import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Trash2, Edit, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { fetchSections, assignSectionsToTest, fetchTestSections, Section } from '@/lib/sectionsApi';

export default function ManageTests() {
    const { loading: authLoading, isAdmin } = useAuth();
    const navigate = useNavigate();

    // Protect Route
    useEffect(() => {
        if (!authLoading && !isAdmin) {
            navigate('/admin-login');
        }
    }, [authLoading, isAdmin, navigate]);

    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Section Management State
    const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
    const [currentTestId, setCurrentTestId] = useState<string | null>(null);
    const [availableSections, setAvailableSections] = useState<Section[]>([]);
    const [selectedSections, setSelectedSections] = useState<string[]>([]);
    const [testsSectionsMap, setTestsSectionsMap] = useState<Record<string, string[]>>({}); // Map testId -> sectionIds

    useEffect(() => {
        loadTests();
        loadAllSections();
    }, []);

    const loadTests = async () => {
        try {
            const { data, error } = await supabase.from('tests').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setTests(data || []);

            // Fetch sections for all tests to display badges
            // Ideally we should join in the query but for now valid to fetch separate or just fetch on demand
            // Let's simplified: fetched sections on demand or load all mappings?
            // Let's try to load all test_sections mappings
            const { data: mappings } = await supabase.from('test_sections').select('*');
            if (mappings) {
                const map: Record<string, string[]> = {};
                mappings.forEach((m: any) => {
                    if (!map[m.test_id]) map[m.test_id] = [];
                    map[m.test_id].push(m.section_id);
                });
                setTestsSectionsMap(map);
            }

        } catch (error) {
            console.error('Error loading tests:', error);
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

            // Update UI
            setTests(prev => prev.filter(t => t.id !== testId));
            alert(`Test "${testTitle}" deleted successfully.`);
        } catch (error: any) {
            console.error('Error deleting test:', error);
            alert('Failed to delete test: ' + error.message);
        }
    };

    const openSectionDialog = async (testId: string) => {
        setCurrentTestId(testId);
        setIsSectionDialogOpen(true);
        // Load current sections for this test
        const { data } = await fetchTestSections(testId);
        setSelectedSections(data || []);
    };

    const handleSaveSections = async () => {
        if (!currentTestId) return;

        const { error } = await assignSectionsToTest(currentTestId, selectedSections);
        if (error) {
            alert('Failed to save sections: ' + error.message);
        } else {
            // Update local map
            setTestsSectionsMap(prev => ({
                ...prev,
                [currentTestId]: selectedSections
            }));
            setIsSectionDialogOpen(false);
        }
    };

    const toggleSection = (id: string) => {
        setSelectedSections(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const getSectionName = (id: string) => availableSections.find(s => s.id === id)?.name || id;

    if (authLoading) return <div className="p-10 text-center">Checking permissions...</div>;
    if (!isAdmin) return null;

    return (
        <div className="container mx-auto max-w-6xl py-10 space-y-6">
            <BackButton />
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Manage Tests</h1>
                    <p className="text-muted-foreground">View and delete existing tests.</p>
                </div>
                <Button variant="outline" onClick={loadTests} size="sm">Refresh List</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-10">Loading tests...</div>
                ) : tests.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-muted-foreground border rounded-lg border-dashed">
                        No tests found. Go to Admin Panel to add some.
                    </div>
                ) : (
                    tests.map(test => (
                        <Card key={test.id} className="relative group flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start gap-2">
                                    <CardTitle className="text-lg line-clamp-1" title={test.title}>{test.title}</CardTitle>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="h-8 w-8 absolute -top-3 -right-3 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDeleteTest(test.id, test.title)}
                                        title="Delete Test"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <CardDescription className="line-clamp-2 min-h-[40px]">
                                    {test.description || 'No description provided.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="text-sm text-muted-foreground flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="bg-secondary px-2 py-1 rounded text-xs font-medium">
                                            {Array.isArray(test.questions) ? test.questions.length : 0} Questions • {Array.isArray(test.questions) ? test.questions.length : 0} Mins
                                        </span>
                                        {test.custom_id && (
                                            <span className="text-xs text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                ID: {test.custom_id}
                                            </span>
                                        )}
                                    </div>

                                    {/* Sections Badges */}
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {testsSectionsMap[test.id]?.length > 0 ? (
                                            testsSectionsMap[test.id].map(secId => (
                                                <Badge key={secId} variant="outline" className="text-[10px] px-1 py-0 h-5">
                                                    {getSectionName(secId)}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">No sections</span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0">
                                <Button variant="outline" size="sm" className="w-full" onClick={() => openSectionDialog(test.id)}>
                                    <Tag className="h-3 w-3 mr-2" />
                                    Manage Sections
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>

            {/* Edit Sections Dialog */}
            <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Sections</DialogTitle>
                        <DialogDescription>
                            Assign sections to this test.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="flex flex-wrap gap-2">
                            {availableSections.length === 0 && <span className="text-sm text-muted-foreground">No sections available. Create some in the Migration page first.</span>}
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
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSectionDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveSections}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
