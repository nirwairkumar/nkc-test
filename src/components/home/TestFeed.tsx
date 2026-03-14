import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Loader2, Edit, ChevronDown } from 'lucide-react';
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
