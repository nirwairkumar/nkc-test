import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Loader2, Edit, ChevronDown, Library } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TestVoteButtons from '@/components/TestVoteButtons';
import { fetchTests, Test } from '@/lib/testsApi';
import { toast } from 'sonner';
import TestCardCategoryList from '@/components/home/TestCardCategoryList';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';
import IndependentTestCard from '@/components/IndependentTestCard';
import { useYouTubeStyleRender } from '@/hooks/useYouTubeStyleRender';

const ITEMS_PER_PAGE = 12;

export default function TestFeed({ user, onManageTest }: { user: any, onManageTest: (test: any) => void }) {
    const [tests, setTests] = useState<any[]>(
        Array.from({ length: 3 }, (_, i) => ({ id: `pending-feed-${i}-${Math.random()}` }))
    );

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

        const { data, meta } = await fetchTests({ page: pageNum, limit: ITEMS_PER_PAGE, idsOnly: true });

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
        <div className="mb-14 animate-slide-up-fade stagger-4 relative z-10">
            <div className="flex items-center gap-3 mb-6 pl-1">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                    <Library className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                        More Tests
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Explore the full catalog of assessments
                    </p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
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
                            <IndependentTestCard
                                testId={test.id}
                                initialTitle={test.title}
                                user={user}
                                onManageTest={onManageTest}
                            />
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
                <div className="mt-10 flex justify-center">
                    <Button
                        variant="outline"
                        onClick={() => loadMoreTests()}
                        disabled={loading}
                        className="rounded-full px-8 py-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all font-semibold shadow-sm group"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin mr-2 text-indigo-500" />
                        ) : (
                            <ChevronDown className="h-5 w-5 mr-2 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        )}
                        {loading ? 'Loading...' : 'Load More Tests'}
                    </Button>
                </div>
            )}

            {!hasMore && tests.length > 0 && (
                <div className="py-12 mt-4 text-center border-t border-slate-200 dark:border-slate-800 border-dashed relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-50 dark:bg-[#020617] px-4">
                        <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto" />
                    </div>
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        You've reached the end of the catalog
                    </span>
                </div>
            )}
        </div>
    );
}
