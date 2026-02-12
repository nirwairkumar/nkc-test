import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Loader2, Edit, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TestLikeButton from '@/components/TestLikeButton';
import { fetchTests, Test } from '@/lib/testsApi';
import { toast } from 'sonner';
import TestCardCategoryList from '@/components/home/TestCardCategoryList';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';
import { useYouTubeStyleRender } from '@/hooks/useYouTubeStyleRender';

const ITEMS_PER_PAGE = 12;

export default function TestFeed({ user, onManageTest }: { user: any, onManageTest: (test: any) => void }) {
    const [tests, setTests] = useState<Test[]>([]);

    const [page, setPage] = useState(1); // Backend handles pagination logic, start at 1
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);

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
        // Initial Load
        loadMoreTests(1);
    }, []);

    const loadMoreTests = async (pageNum: number = page) => {
        if (loading) return; // removed !hasMore check for initial load flexibility, but acceptable
        setLoading(true);

        const { data, meta } = await fetchTests({ page: pageNum, limit: ITEMS_PER_PAGE });

        if (data && data.length > 0) {
            setTests(prev => {
                // Avoid duplicates if any
                if (pageNum === 1) return data;
                const newTests = data.filter((d: Test) => !prev.find(p => p.id === d.id));
                return [...prev, ...newTests];
            });

            if (meta?.has_more !== undefined) {
                setHasMore(meta.has_more);
            } else {
                if (data.length < ITEMS_PER_PAGE) setHasMore(false);
            }

            setPage(pageNum + 1);
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
                        <div key={test.id}>
                            <Card className="flex flex-col hover:shadow-lg transition-shadow relative overflow-hidden h-full border-slate-200 dark:border-slate-800 animate-in fade-in duration-500">
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
                                                {/* Backend returns 'creator_verified' boolean now */}
                                                {test.creator_verified && <VerifiedBadge size={14} />}
                                                <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px]">{test.creator_name || 'Creator'}</span>
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
                
                {/* Progress indicator */}
                {!isComplete && (
                    <div className="col-span-full py-4 text-center">
                        <span className="text-sm text-muted-foreground">
                            {renderedCount} of {totalCount} tests loaded
                        </span>
                    </div>
                )}
            </div>

            {hasMore && (
                <div className="mt-8 flex justify-center">
                    <Button
                        variant="outline"
                        onClick={() => loadMoreTests()}
                        disabled={loading}
                        className="min-w-[150px]"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                        {loading ? 'Loading...' : 'View More Tests'}
                    </Button>
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
