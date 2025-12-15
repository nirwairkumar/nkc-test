import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchTests, Test, toggleTestLike, getTestLikeCount, getTestLikeStatus } from '@/lib/testsApi';
import { BookOpen, Clock, ArrowRight, History, Loader2, Heart, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import supabase from '@/lib/supabaseClient';
import YouTubeGenerator from '@/components/YouTubeGenerator';
import { Input } from '@/components/ui/input';

function TestLikeButton({ testId, userId }: { testId: string, userId: string | undefined }) {
    const [liked, setLiked] = useState(false);
    const [count, setCount] = useState(0);

    useEffect(() => {
        getTestLikeCount(testId).then(({ count }) => setCount(count || 0));
        if (userId) {
            getTestLikeStatus(testId, userId).then(({ liked }) => setLiked(liked));
        }
    }, [testId, userId]);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!userId) return; // Or show login toast

        // Optimistic update
        const newLiked = !liked;
        setLiked(newLiked);
        setCount(prev => newLiked ? prev + 1 : prev - 1);

        const { error } = await toggleTestLike(testId, userId);
        if (error) {
            // Revert on error
            setLiked(!newLiked);
            setCount(prev => !newLiked ? prev + 1 : prev - 1);
        }
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 ${liked ? 'text-red-500' : 'text-muted-foreground'}`}
        >
            <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
            <span className="text-xs">{count > 0 ? count : ''}</span>
        </Button>
    );
}

export default function TestList() {
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth(); // To conditionally show things or just personalized greeting

    // Section State
    const [sections, setSections] = useState<any[]>([]); // Using any for minimal import changes
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
    const [testSectionMap, setTestSectionMap] = useState<Record<string, string[]>>({});
    const [searchQuery, setSearchQuery] = useState("");

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
    const filteredTests = tests.filter(test => {
        // 1. Section Filter
        if (selectedSectionId && !testSectionMap[test.id]?.includes(selectedSectionId)) {
            return false;
        }
        // 2. Search Filter (Title or ID)
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            const matchesTitle = test.title.toLowerCase().includes(lowerQuery);
            const matchesId = test.custom_id?.toLowerCase().includes(lowerQuery);
            return matchesTitle || matchesId;
        }
        return true;
    });

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

                <YouTubeGenerator onTestGenerated={loadData} />

                {/* Filters & Search Row */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border">
                    <h2 className="text-lg font-semibold text-foreground pl-2">
                        Explore Tests
                    </h2>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by Title or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-8 text-sm bg-background"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTests.map((test) => (
                    <Card key={test.id} className="flex flex-col hover:shadow-lg transition-shadow">
                        <CardHeader className="p-3">
                            <CardTitle className="text-base font-bold text-red-900 md:text-lg">{test.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-3 pt-0">
                            <div className="flex flex-col justify-end mt-auto gap-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Clock className="mr-1 h-4 w-4" />
                                        {test.questions?.length || 0} Questions
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
                        <CardFooter className="p-3 pt-0 flex justify-between gap-2">
                            <TestLikeButton testId={test.id} userId={user?.id} />
                            <Button size="sm" className="flex-1 h-8 text-sm" onClick={() => navigate(`/test-intro/${test.id}`)}>
                                Open
                                <ArrowRight className="ml-2 h-3 w-3" />
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
