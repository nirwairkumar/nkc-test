import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Loader2, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TestLikeButton from '@/components/TestLikeButton';
import { fetchTests, Test } from '@/lib/testsApi';
import { toast } from 'sonner';
import TestCardCategoryList from '@/components/home/TestCardCategoryList';
import supabase from '@/lib/supabaseClient';
import VerifiedBadge from '@/components/ui/VerifiedBadge';

const ITEMS_PER_PAGE = 9;

export default function TestFeed({ user, onManageTest }: { user: any, onManageTest: (test: any) => void }) {
    const [tests, setTests] = useState<Test[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [testCategoryMap, setTestCategoryMap] = useState<Record<string, string[]>>({});
    const [verifiedCreators, setVerifiedCreators] = useState<Record<string, boolean>>({});

    const [page, setPage] = useState(2);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);

    const observer = useRef<IntersectionObserver | null>(null);
    const navigate = useNavigate();

    const lastTestElementRef = useCallback((node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    useEffect(() => {
        // Load initial metadata like categories
        const loadMetadata = async () => {
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
        };
        loadMetadata();
        loadMoreTests();
    }, []);

    useEffect(() => {
        loadMoreTests();
    }, [page]);

    // Fetch Verified Creators
    useEffect(() => {
        const fetchVerifiedStatus = async () => {
            const creatorIds = Array.from(new Set(tests.map(t => t.created_by).filter(Boolean)));
            if (creatorIds.length === 0) return;

            const idsToFetch = creatorIds.filter(id => verifiedCreators[id as string] === undefined);
            if (idsToFetch.length === 0) return;

            const { data } = await supabase
                .from('profiles')
                .select('id, is_verified_creator')
                .in('id', idsToFetch);

            if (data) {
                setVerifiedCreators(prev => {
                    const next = { ...prev };
                    data.forEach((p: any) => {
                        next[p.id] = p.is_verified_creator;
                    });
                    return next;
                });
            }
        };

        if (tests.length > 0) {
            fetchVerifiedStatus();
        }
    }, [tests]);

    const loadMoreTests = async () => {
        if (loading || !hasMore) return;
        setLoading(true);

        const { data } = await fetchTests({ page: page, limit: ITEMS_PER_PAGE });

        if (data && data.length > 0) {
            setTests(prev => {
                const newTests = data.filter(d => !prev.find(p => p.id === d.id));
                return [...prev, ...newTests];
            });
            if (data.length < ITEMS_PER_PAGE) setHasMore(false);
        } else {
            setHasMore(false);
        }
        setLoading(false);
    };

    const handleShare = (e: React.MouseEvent, testId: string) => {
        e.stopPropagation();
        const url = `${window.location.origin}/test-intro/${testId}`;
        navigator.clipboard.writeText(url);
        toast.success("Test link copied!");
    };

    return (
        <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-300">More Tests</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests.map((test, index) => {
                    const isLast = tests.length === index + 1;
                    return (
                        <div key={test.id} ref={isLast ? lastTestElementRef : null}>
                            <Card className="flex flex-col hover:shadow-lg transition-shadow relative overflow-hidden h-full">
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
                                        <div className="flex items-center gap-2 shrink-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full pr-2 transition-colors py-0.5" onClick={(e) => { e.stopPropagation(); navigate(`/creator/${test.created_by}`); }}>
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={test.creator_avatar} />
                                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{test.creator_name ? test.creator_name.substring(0, 2).toUpperCase() : 'TC'}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex items-center gap-1 min-w-0">
                                                {verifiedCreators[test.created_by as string] && <VerifiedBadge size={14} />}
                                                <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px]">{test.creator_name || 'Creator'}</span>
                                            </div>
                                        </div>
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
                        </div>
                    );
                })}
            </div>

            {loading && (
                <div className="py-8 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                </div>
            )}

            {!hasMore && tests.length > 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                    You've reached the end of the list.
                </div>
            )}
        </div>
    );
}
