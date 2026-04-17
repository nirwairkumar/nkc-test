import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Loader2, Edit, FileText, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TestVoteButtons from '@/components/TestVoteButtons';
import { fetchTests, Test } from '@/lib/testsApi';
import { fetchCategoryStats } from '@/lib/categoriesApi';
import { toast } from 'sonner';
import FolderCard from '@/components/home/FolderCard';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';
import { useYouTubeStyleRender } from '@/hooks/useYouTubeStyleRender';
import { useCombinedExclusion } from '@/hooks/useCombinedExclusion';
import { shareTest } from '@/utils/shareUtils';

export default function SearchResults({ searchQuery, user, onManageTest }: { searchQuery: string, user: any, onManageTest: (test: any) => void }) {
    const [tests, setTests] = useState<Test[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [matchedFolders, setMatchedFolders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { isExcluded } = useCombinedExclusion();
    const abortControllerRef = React.useRef<AbortController | null>(null);

    const navigate = useNavigate();

    // YouTube-style lazy loading hook
    const {
        registerSkeleton,
        isItemRendered,
        renderedCount,
        totalCount,
        isComplete
    } = useYouTubeStyleRender(tests, loading, {
        rootMargin: '100px',
        threshold: 0.1
    });

    useEffect(() => {
        loadSearchResults();
    }, [searchQuery]);

    const loadSearchResults = async () => {
        setLoading(true);

        // Cancel previous request if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        // Create new controller for this request
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            // 1. Fetch Tests (Backend Search: Title, CustomID)
            // 2. Fetch Category Stats (Enriched with counts) - Run in parallel
            const [testsRes, statsRes] = await Promise.all([
                fetchTests({ page: 1, limit: 100, searchQuery: searchQuery, signal: controller.signal }),
                fetchCategoryStats()
            ]);

            const allData = testsRes.data;
            const stats = statsRes.data || [];

            if (allData) {
                const query = searchQuery.toLowerCase();

                // 3. Filter Tests (Client-side refinement)
                // Filter out tests that belong to a combined session
                const filtered = allData.filter((t: Test) => !isExcluded(t.id));
                setTests(filtered);

                // 4. Extract Matching Profiles (from the tests we found)
                const creators = new Map();
                allData.forEach((t: Test) => {
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


                // 5. Match Categories (Folders)
                const directCatMatch = stats.filter((c: any) => c.name.toLowerCase().includes(query));

                // Collect category IDs from found tests (Enriched categories)
                const relatedCatIds = new Set<string>();
                filtered.forEach((t: Test) => {
                    const cats = t.categories; // Backend Enriched
                    if (cats) cats.forEach((c: any) => relatedCatIds.add(c.id));
                });

                // Merge
                const relatedCats = stats.filter((c: any) => relatedCatIds.has(c.id));

                // Combine and Dedup
                const combinedCatsMap = new Map();
                [...directCatMatch, ...relatedCats].forEach(c => combinedCatsMap.set(c.id, c));

                // Stats already has count
                setMatchedFolders(Array.from(combinedCatsMap.values()));
            }
        } catch (error: any) {
            if (error.name === 'CanceledError' || error.message === 'canceled') {
                return;
            }
            console.error("Search failed", error);
        } finally {
            if (abortControllerRef.current === controller) {
                setLoading(false);
                abortControllerRef.current = null;
            }
        }
    };

    const handleShare = (e: React.MouseEvent, test: any) => {
        e.stopPropagation();
        shareTest(test);
    };

    if (loading) {
        return <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (tests.length === 0 && profiles.length === 0 && matchedFolders.length === 0) {
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
                        ({matchedFolders.length > 0 ? `${matchedFolders.length} folders, ` : ''}{tests.length} tests, {profiles.length} creators)
                    </span>
                </h2>
            </div>

            {/* 0. Categories First */}
            {matchedFolders.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 px-1 text-slate-700 dark:text-slate-300">
                        Categories
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {matchedFolders.map(cat => (
                            <FolderCard key={cat.id} categoryName={cat.name} testCount={cat.count} />
                        ))}
                    </div>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 my-6" />
                </div>
            )}

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
                {tests.map((test: any) => {
                    const testId = test.id;
                    const isRendered = isItemRendered(testId);
                    const categories = test.categories || [];

                    if (!isRendered) {
                        return (
                            <div key={testId} ref={(el) => registerSkeleton(testId, el)}>
                                <TestCardSkeleton />
                            </div>
                        );
                    }

                    return (
                        <Card key={test.id} className="flex flex-col hover:shadow-lg transition-shadow relative overflow-hidden h-full animate-in fade-in duration-500">
                            <div className="absolute top-2 right-2 z-10">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 hover:bg-white text-muted-foreground hover:text-primary shadow-sm" onClick={(e) => handleShare(e, test)}>
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
                                    <div className="flex items-center gap-2 shrink-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full pr-2 transition-colors py-0.5" onClick={() => navigate(`/creator/${test.created_by}`)}>
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={test.creator_avatar} />
                                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{test.creator_name ? test.creator_name.substring(0, 2).toUpperCase() : 'TC'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex items-center gap-1 min-w-0">
                                            {test.creator_verified && <VerifiedBadge size={14} />}
                                            <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px]">
                                                {test.creator_name || 'Creator'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Inline Categories Rendering */}
                                    <div className="flex items-center gap-1 overflow-hidden justify-end">
                                        {categories.slice(0, 2).map((cat: any) => (
                                            <span key={cat.id} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 whitespace-nowrap">
                                                {cat.name}
                                            </span>
                                        ))}
                                        {categories.length > 2 && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded-full border border-slate-100">+{categories.length - 2}</span>
                                        )}
                                        {test.custom_category && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-100 whitespace-nowrap">
                                                {test.custom_category}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="p-3 pt-0 flex justify-between items-center gap-2">
                                <div className="flex-none"><TestVoteButtons testId={test.id} userId={user?.id} /></div>
                                {user?.id === test.created_by ? (
                                    <div className="flex-1 flex gap-2">
                                        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground px-2" onClick={() => onManageTest(test)}>
                                            <Settings className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">Manage</span>
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => navigate(`/edit-test/${test.id}`)}>
                                            <Edit className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">Edit</span>
                                        </Button>
                                        <Button size="sm" className="flex-1 h-8 px-3" onClick={() => navigate(`/test/${test.slug || test.id}`)}>
                                            Open <ArrowRight className="ml-2 h-3 w-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex-1">
                                        <Button size="sm" className="w-full h-8 text-sm" onClick={() => navigate(`/test/${test.slug || test.id}`)}>
                                            Open <ArrowRight className="ml-2 h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                            </CardFooter>
                        </Card>
                    );
                })}

                {/* Progress indicator */}
                {!isComplete && tests.length > 0 && (
                    <div className="col-span-full py-4 text-center">
                        <span className="text-sm text-muted-foreground">
                            {renderedCount} of {totalCount} tests loaded
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
