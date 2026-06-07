import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Edit, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TestVoteButtons from '@/components/TestVoteButtons';
import { fetchTestsByUserId, Test } from '@/lib/testsApi';
import { toast } from 'sonner';
import TestCardCategoryList from '@/components/home/TestCardCategoryList';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';
import IndependentTestCard from '@/components/IndependentTestCard';
import { useCombinedExclusion } from '@/hooks/useCombinedExclusion';

export default function UserRecentTests({ user, onManageTest }: { user: any, onManageTest: (test: any) => void }) {
    const [userTests, setUserTests] = useState<any[]>(
        Array.from({ length: 3 }, (_, i) => ({ id: `pending-recent-${i}-${Math.random()}` }))
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const { isExcluded } = useCombinedExclusion();
    const navigate = useNavigate();

    const loadUserTests = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(false);
        try {
            const { data, error: fetchError } = await fetchTestsByUserId(user.id, { idsOnly: true });
            if (data) {
                const filtered = (data as Test[]).filter(t => !isExcluded(t.id));
                setUserTests(filtered);
            } else if (fetchError) {
                console.error('Failed to load user tests:', fetchError);
                setError(true);
                toast.error('Failed to load your recent tests. Please try again.');
            }
        } catch (e) {
            // Only catch unexpected errors (cancellation is rethrown by fetchTestsByUserId)
            console.error('Unexpected error loading user tests:', e);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadUserTests();
        }
    }, [user, loadUserTests]);

    const handleShare = (e: React.MouseEvent, testId: string) => {
        e.stopPropagation();
        const url = `${window.location.origin}/test-intro/${testId}`;
        navigator.clipboard.writeText(url);
        toast.success("Test link copied!");
    };

    if (!user) return null;

    // Loading state


    // Error state with retry
    if (error) {
        return (
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                        Your Recent Tests
                    </h2>
                </div>
                <div className="flex flex-col items-center justify-center py-8 px-4 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900">
                    <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">Couldn't load your tests. Network may be slow.</p>
                    <Button variant="outline" size="sm" onClick={loadUserTests} className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    // No tests
    if (userTests.length === 0) return null;

    return (
        <div className="mb-10 animate-slide-up-fade relative z-10">
            <div className="flex items-center justify-between mb-6 pl-1">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Clock className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent leading-tight">
                            Jump Back In
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                            Your recently accessed tests
                        </p>
                    </div>
                </div>
                
                <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded-full sm:px-4" onClick={() => navigate('/my-tests')}>
                    <span className="hidden sm:inline">Creator Dashboard</span>
                    <span className="sm:hidden">Dashboard</span>
                    <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {userTests.slice(0, 3).map((test, index) => {
                    const categories = test.categories || [];
                    return (
                        <div key={test.id} className={`relative h-full ${index === 1 ? 'hidden md:block' : index === 2 ? 'hidden lg:block' : 'block'}`}>
                            {(new Date().getTime() - new Date(test.created_at).getTime() < 5 * 60 * 1000) && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3 z-20 pointer-events-none">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                </span>
                            )}
                            <IndependentTestCard
                                testId={test.id}
                                initialTitle={test.title}
                                user={user}
                                onManageTest={onManageTest}
                            />
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
