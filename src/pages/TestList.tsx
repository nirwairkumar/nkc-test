import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchTests, Test } from '@/lib/testsApi';
import { BookOpen, Clock, ArrowRight, History, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import supabase from '@/lib/supabaseClient';

export default function TestList() {
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth(); // To conditionally show things or just personalized greeting

    // Section State
    const [sections, setSections] = useState<any[]>([]); // Using any for minimal import changes
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
    const [testSectionMap, setTestSectionMap] = useState<Record<string, string[]>>({});

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);

            // 1. Fetch Tests
            const { data: testsData, error: testsError } = await fetchTests();
            if (testsError) throw testsError;

            // 2. Fetch Sections
            const { data: sectionsData, error: sectionsError } = await supabase
                .from('sections')
                .select('*')
                .order('name');

            if (sectionsError) console.error('Error loading sections', sectionsError);

            // 3. Fetch Mappings
            const { data: mappingsData, error: mappingsError } = await supabase
                .from('test_sections')
                .select('*');

            if (mappingsError) console.error('Error loading mappings', mappingsError);

            // Process Mappings
            const map: Record<string, string[]> = {};
            if (mappingsData) {
                mappingsData.forEach((m: any) => {
                    if (!map[m.test_id]) map[m.test_id] = [];
                    map[m.test_id].push(m.section_id);
                });
            }

            setTests(testsData || []);
            setSections(sectionsData || []);
            setTestSectionMap(map);

        } catch (err) {
            console.error('Failed to load data', err);
        } finally {
            setLoading(false);
        }
    }

    // Filter Logic
    const filteredTests = selectedSectionId
        ? tests.filter(test => testSectionMap[test.id]?.includes(selectedSectionId))
        : tests;

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex flex-col mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Available Tests</h1>
                    <p className="text-muted-foreground mt-2">Select a test to begin your practice</p>
                </div>

                {/* Section Filters */}
                {sections.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={selectedSectionId === null ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedSectionId(null)}
                            className="rounded-full"
                        >
                            All
                        </Button>
                        {sections.map(section => (
                            <Button
                                key={section.id}
                                variant={selectedSectionId === section.id ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedSectionId(section.id)}
                                className="rounded-full"
                            >
                                {section.name}
                            </Button>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTests.map((test) => (
                    <Card key={test.id} className="flex flex-col hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-xl">{test.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <p className="text-muted-foreground mb-4 line-clamp-3">{test.description}</p>
                            <div className="flex flex-col justify-end mt-auto gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Clock className="mr-1 h-4 w-4" />
                                        {test.questions?.length || 0} Questions
                                        <span className="mx-2">•</span>
                                        {test.questions?.length || 0} Minutes
                                    </div>
                                    {test.custom_id && (
                                        <span className="text-xs text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                            ID: {test.custom_id}
                                        </span>
                                    )}
                                </div>
                                {/* Section Tags on Card */}
                                <div className="flex flex-wrap gap-1">
                                    {testSectionMap[test.id]?.map(secId => {
                                        const sec = sections.find(s => s.id === secId);
                                        if (!sec) return null;
                                        return (
                                            <span key={secId} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                                {sec.name}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => navigate(`/test/${test.id}`)}>
                                Start Test
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {filteredTests.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No tests found for this section.</p>
                </div>
            )}
        </div>
    );
}
