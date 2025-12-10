import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Trash2 } from 'lucide-react';

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

    useEffect(() => {
        loadTests();
    }, []);

    const loadTests = async () => {
        try {
            const { data, error } = await supabase.from('tests').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setTests(data || []);
        } catch (error) {
            console.error('Error loading tests:', error);
        } finally {
            setLoading(false);
        }
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
                        <Card key={test.id} className="relative group">
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
                            <CardContent>
                                <div className="text-sm text-muted-foreground flex items-center justify-between gap-2">
                                    <span className="bg-secondary px-2 py-1 rounded text-xs font-medium">
                                        {Array.isArray(test.questions) ? test.questions.length : 0} Questions • {Array.isArray(test.questions) ? test.questions.length : 0} Mins
                                    </span>
                                    {test.custom_id && (
                                        <span className="text-xs text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                            ID: {test.custom_id}
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
