import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Loader2, Edit, FileText, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TestLikeButton from '@/components/TestLikeButton';
import { fetchTests, Test } from '@/lib/testsApi';
import { toast } from 'sonner';
import TestCardCategoryList from '@/components/home/TestCardCategoryList';
import supabase from '@/lib/supabaseClient';

export default function SearchResults({ searchQuery, user, onManageTest }: { searchQuery: string, user: any, onManageTest: (test: any) => void }) {
    const [tests, setTests] = useState<Test[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Metadata for cards
    const [categories, setCategories] = useState<any[]>([]);
    const [testCategoryMap, setTestCategoryMap] = useState<Record<string, string[]>>({});

    const navigate = useNavigate();

    useEffect(() => {
        loadSearchResults();
    }, [searchQuery]);

    const loadSearchResults = async () => {
        setLoading(true);
        // Load metadata
        const { data: catData } = await supabase.from('categories').select('*');
        const { data: mapData } = await supabase.from('test_categories').select('*');
        if (catData) setCategories(catData);
        const map: Record<string, string[]> = {};
        if (mapData) {
            mapData.forEach((m: any) => {
                if (!map[m.test_id]) map[m.test_id] = [];
                map[m.test_id].push(m.category_id);
            });
        }
        setTestCategoryMap(map);

        // Fetch Tests Matching Query
        // Note: fetchTests supports partial title match via 'searchQuery'
        // But for ID, we need to handle it. Our API modification handled Title.
        // We should check if API handles custom_id too.
        // Let's modify client side filtering for now if API is limited, OR trust the API.
        // Current API: ilike title. 
        // We need to fetch MORE and filter client side for better ID/Tag/Profile match?
        // Or update API. Let's update API usage here.
        // We will fetch a larger set and filter? Or ask for search improvement.
        // User said: "when I am searching for id it is not coming properly".
        // The API only updated title. We should probably update the API to search multiple fields or do it here.
        // Let's rely on a broader fetch + strong client filtering for immediate fix if API is restricted.
        // Actually, fetching everything is expensive. 
        // Let's fetch with the existing API (title search) AND maybe specific ID search?

        // Search Strategy:
        // 1. Fetch results using existing API (matches title).
        // 2. Fetch results matching exact ID (if query looks like ID or just generic).
        // 3. Profiles: Extract from results? Or separate query?

        // Let's try to pass searchQuery to fetchTests.
        // Ideally we update `fetchTests` to search more columns, but for now let's do:
        const { data } = await fetchTests({ page: 1, limit: 100, searchQuery: searchQuery });

        // Also Filter client side for tags/custom_id if API missed them (API only checks title currently).
        // Wait, if API only checks title, we miss tags/id.
        // We should probably fetch generic (no search query) and filter? No, that's too heavy.
        // Let's assume we can fetch by TITLE match from API.
        // AND we want to search ID.
        // Let's fetch all recent tests (limit 200?) and filter client side for accurate multi-field search?
        // Or update API. Updating API is better.
        // But to be safe and quick:

        // Let's fetch by plain list and filter client side to ensure "Profile" and "ID" work perfectly.
        const { data: allData } = await fetchTests({ page: 1, limit: 300 });

        if (allData) {
            const query = searchQuery.toLowerCase();

            // 1. Filter Tests
            const filtered = allData.filter(t => {
                const titleMatch = t.title.toLowerCase().includes(query);
                const idMatch = t.custom_id?.toLowerCase().includes(query);
                const creatorMatch = t.creator_name?.toLowerCase().includes(query);
                const tagsMatch = t.tags?.some(tag => tag.toLowerCase().includes(query));

                // If query starts with #, strict ID search
                if (query.startsWith('#')) return t.custom_id?.toLowerCase().includes(query);

                return titleMatch || idMatch || creatorMatch || tagsMatch;
            });
            setTests(filtered);

            // 2. Extract Matching Profiles
            // (From the filtered results OR from allData to find creators matching name)
            const creators = new Map();
            allData.forEach(t => {
                if (t.created_by && t.creator_name) {
                    if (t.creator_name.toLowerCase().includes(query)) {
                        creators.set(t.created_by, {
                            id: t.created_by,
                            name: t.creator_name,
                            avatar: t.creator_avatar
                        });
                    }
                }
            });
            setProfiles(Array.from(creators.values()));
        }
        setLoading(false);
    };

    const handleShare = (e: React.MouseEvent, testId: string) => {
        e.stopPropagation();
        const url = `${window.location.origin}/test-intro/${testId}`;
        navigator.clipboard.writeText(url);
        toast.success("Test link copied!");
    };

    if (loading) {
        return <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (tests.length === 0 && profiles.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No results found for "{searchQuery}"</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    Search Results
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({tests.length} tests, {profiles.length} creators)
                    </span>
                </h2>
            </div>

            {/* 1. Profiles First */}
            {profiles.length > 0 && (
                <div className="mb-10">
                    <h3 className="text-lg font-semibold mb-4 px-1 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <User className="h-4 w-4" /> Creators
                    </h3>
                    <div className="flex flex-wrap gap-6">
                        {profiles.map(profile => (
                            <div key={profile.id} className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => navigate(`/creator/${profile.id}`)}>
                                <Avatar className="h-16 w-16 border-2 border-transparent group-hover:border-primary transition-all">
                                    <AvatarImage src={profile.avatar} />
                                    <AvatarFallback>{profile.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium text-center group-hover:text-primary transition-colors">{profile.name}</span>
                            </div>
                        ))}
                    </div>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 my-6" />
                </div>
            )}

            {/* 2. Tests Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests.map((test) => (
                    <Card key={test.id} className="flex flex-col hover:shadow-lg transition-shadow relative overflow-hidden h-full">
                        <div className="absolute top-2 right-2 z-10">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 hover:bg-white text-muted-foreground hover:text-primary shadow-sm" onClick={(e) => handleShare(e, test.id)}>
                                <Share2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <CardHeader className="p-3 pb-2">
                            <CardTitle className="text-lg font-bold text-red-900 md:text-xl pr-8 leading-tight line-clamp-2">{test.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-3 pt-0">
                            <div className="flex flex-col justify-end mt-auto gap-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Clock className="mr-1 h-4 w-4" />{test.questions?.length || 0} Qs • {test.duration || 30}m
                                    </div>
                                    {test.custom_id && (
                                        <span className="text-xs text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">#{test.custom_id}</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-1.5 gap-2 h-8">
                                <TestCardCategoryList categoryIds={testCategoryMap[test.id]} allCategories={categories} customCategory={test.custom_category} />
                            </div>
                        </CardContent>
                        <CardFooter className="p-3 pt-0 flex justify-between items-center gap-2">
                            <div className="flex-none"><TestLikeButton testId={test.id} userId={user?.id} /></div>
                            {user?.id === test.created_by ? (
                                <div className="flex-1 flex gap-2">
                                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground px-2" onClick={() => onManageTest(test)}>
                                        <Settings className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">Manage</span>
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => navigate(`/edit-test/${test.id}`)}>
                                        <Edit className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">Edit</span>
                                    </Button>
                                    <Button size="sm" className="flex-1 h-8 px-3" onClick={() => navigate(`/test-intro/${test.id}`)}>
                                        Open <ArrowRight className="ml-2 h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex-1">
                                    <Button size="sm" className="w-full h-8 text-sm" onClick={() => navigate(`/test-intro/${test.id}`)}>
                                        Open <ArrowRight className="ml-2 h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
