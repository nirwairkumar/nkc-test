import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Edit, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TestLikeButton from '@/components/TestLikeButton';
import { fetchTestsByUserId, Test } from '@/lib/testsApi';
import { toast } from 'sonner';
import TestCardCategoryList from '@/components/home/TestCardCategoryList';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';

export default function UserRecentTests({ user, onManageTest }: { user: any, onManageTest: (test: any) => void }) {
    const [userTests, setUserTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const navigate = useNavigate();

    const loadUserTests = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(false);
        try {
            const { data, error: fetchError } = await fetchTestsByUserId(user.id);
            if (data) {
                setUserTests(data as Test[]);
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
    if (loading) {
        return (
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                        Your Recent Tests
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <TestCardSkeleton key={i} />)}
                </div>
            </div>
        );
    }

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
        <div className="mb-8 animate-in slide-in-from-left-4 duration-700">
            <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                    Your Recent Tests
                </h2>
                <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 -mr-2" onClick={() => navigate('/my-tests')}>
                    View All
                    <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userTests.slice(0, 3).map((test, index) => {
                    const categories = test.categories || [];
                    return (
                        <div key={test.id} className={`relative h-full ${index === 1 ? 'hidden md:block' : index === 2 ? 'hidden lg:block' : 'block'}`}>
                            {(new Date().getTime() - new Date(test.created_at).getTime() < 5 * 60 * 1000) && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3 z-10 pointer-events-none">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                </span>
                            )}
                            <Card className="flex flex-col hover:shadow-lg transition-shadow relative overflow-hidden h-full border-blue-100 dark:border-blue-900 bg-blue-50/10">
                                {/* Share Button (Top Right) */}
                                <div className="absolute top-2 right-2 z-10">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full bg-white/80 hover:bg-white text-muted-foreground hover:text-primary shadow-sm"
                                        onClick={(e) => handleShare(e, test.id)}
                                        title="Share Test"
                                    >
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <CardHeader className="p-3 pb-2">
                                    <CardTitle className="text-lg font-bold text-red-900 md:text-xl pr-8 leading-tight line-clamp-2">
                                        {test.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 p-3 pt-0">
                                    <div className="flex flex-col justify-end mt-auto gap-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center text-sm text-muted-foreground">
                                                <Clock className="mr-1 h-4 w-4" />
                                                {test.questions?.length || 0} Qs • {test.duration || 30}m
                                            </div>
                                            {test.custom_id && (
                                                <span className="text-xs text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                    #{test.custom_id}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Footer Row: Profile & Categories */}
                                    <div className="flex items-center justify-between mt-1.5 gap-2 h-8">
                                        <div className="flex items-center gap-2 shrink-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full pr-2 transition-colors py-0.5" onClick={() => navigate(`/creator/${test.created_by}`)}>
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={test.creator_avatar} />
                                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                                    {test.creator_name ? test.creator_name.substring(0, 2).toUpperCase() : 'TC'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px]">
                                                {test.creator_name || 'Creator'}
                                            </span>
                                        </div>
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
                                </CardFooter>
                            </Card>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
