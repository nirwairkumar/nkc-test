import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Edit, FileText, ChevronRight, Sparkles, Library } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TestVoteButtons from '@/components/TestVoteButtons';
import { fetchTests, Test } from '@/lib/testsApi';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';
import IndependentTestCard from '@/components/IndependentTestCard';
import { useYouTubeStyleRender } from '@/hooks/useYouTubeStyleRender';
import { useCombinedExclusion } from '@/hooks/useCombinedExclusion';

export default function FeaturedTests({ user, onManageTest }: { user: any, onManageTest: (test: any) => void }) {
    // Initialize with unique pending IDs
    const [tests, setTests] = useState<any[]>(
        Array.from({ length: 6 }, (_, i) => ({ id: `pending-featured-${i}-${Math.random()}` }))
    );
    const [loadingIds, setLoadingIds] = useState(true);
    const { isExcluded, loading: vLoading } = useCombinedExclusion();
    const navigate = useNavigate();

    // YouTube-style lazy loading hook
    const {
        registerSkeleton,
        isItemRendered,
        renderedCount,
        totalCount,
        isComplete
    } = useYouTubeStyleRender(tests, loadingIds, {
        rootMargin: '50px',
        threshold: 0.1
    });

    useEffect(() => {
        async function loadData() {
            if (vLoading) return; // Wait for exclusions to load first for cleaner UI
            
            const { data: testData } = await fetchTests({ page: 1, limit: 10, idsOnly: true });

            if (testData) {
                // Filter out tests that are part of a combined session
                const filtered = testData.filter((t: any) => !isExcluded(t.id)).slice(0, 6);
                setTests(filtered);
            }
            setLoadingIds(false);
        }
        loadData();
    }, [vLoading]);

    const handleShare = (e: React.MouseEvent, testId: string) => {
        e.stopPropagation();
        const url = `${window.location.origin}/test-intro/${testId}`;
        navigator.clipboard.writeText(url);
        toast.success("Test link copied!");
    };



    return (
        <div className="mb-14 animate-slide-up-fade stagger-3 relative z-10">
            <div className="flex items-center gap-3 mb-6 pl-1">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                    <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                        Featured Tests
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Hand-picked assessments to boost your skills
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
                        <IndependentTestCard
                            key={test.id}
                            testId={test.id}
                            initialTitle={test.title}
                            user={user}
                            onManageTest={onManageTest}
                        />
                    );
                })}

                {/* Progress indicator */}
                {!isComplete && tests.length > 0 && (
                    <div className="col-span-full py-4 text-center">
                        <span className="text-sm text-muted-foreground">
                            {renderedCount} of {totalCount} featured tests loaded
                        </span>
                    </div>
                )}
            </div>

            {/* Browse More Tests CTA */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 flex-shrink-0">
                        <Library className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800 dark:text-white text-sm">Explore the full test catalog</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Search by title, category, description &amp; tags</p>
                    </div>
                </div>
                <Button
                    onClick={() => navigate('/more-tests')}
                    className="rounded-full px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all font-semibold text-sm flex-shrink-0 group"
                >
                    Browse More Tests
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
            </div>
        </div>
    );
}
