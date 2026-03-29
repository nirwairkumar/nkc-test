import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Edit, FileText, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TestVoteButtons from '@/components/TestVoteButtons';
import { fetchTests, Test } from '@/lib/testsApi';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';
import IndependentTestCard from '@/components/IndependentTestCard';
import { useYouTubeStyleRender } from '@/hooks/useYouTubeStyleRender';

export default function FeaturedTests({ user, onManageTest }: { user: any, onManageTest: (test: any) => void }) {
    // Initialize with unique pending IDs
    const [tests, setTests] = useState<any[]>(
        Array.from({ length: 6 }, (_, i) => ({ id: `pending-featured-${i}-${Math.random()}` }))
    );
    const [loadingIds, setLoadingIds] = useState(true);
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
            // Load Tests (Backend now provides enriched data: categories, verification, etc.)
            const { data: testData } = await fetchTests({ page: 1, limit: 6, idsOnly: true });

            if (testData) {
                setTests(testData);
            }
            setLoadingIds(false);
        }
        loadData();
    }, []);

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
        </div>
    );
}
