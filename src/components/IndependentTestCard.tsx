import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TestVoteButtons from '@/components/TestVoteButtons';
import { fetchTestCardSnippet } from '@/lib/testsApi';
import { toast } from 'sonner';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';

interface IndependentTestCardProps {
    testId: string;
    initialTitle?: string;
    user?: any;
    onManageTest?: (test: any) => void;
}

export default function IndependentTestCard({ testId, initialTitle, user, onManageTest }: IndependentTestCardProps) {
    const [test, setTest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isRetrying, setIsRetrying] = useState(false);
    const navigate = useNavigate();

    const fetchSnippet = async (isRetry = false) => {
        if (isRetry) setIsRetrying(true);
        if (testId.startsWith('pending-')) {
            if (isRetry) setIsRetrying(false);
            return;
        }

        try {
            const { data, error } = await fetchTestCardSnippet(testId);
            if (data) {
                setTest(data);
            } else if (error) {
                setTest({ error: true });
            }
        } catch (err) {
            setTest({ error: true });
        } finally {
            setLoading(false);
            if (isRetry) setIsRetrying(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        fetchSnippet().then(() => {
            if (!mounted) return;
        });
        return () => { mounted = false; };
    }, [testId]);

    const handleShare = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const url = `${window.location.origin}/test-intro/${id}`;
        navigator.clipboard.writeText(url);
        toast.success("Test link copied!");
    };

    if (loading) {
        return <TestCardSkeleton />;
    }

    if (!test || test.error) {
        return (
            <Card className="flex flex-col h-full items-center justify-center p-6 text-center border-slate-200 dark:border-slate-800 bg-slate-50/50">
                <div className="text-muted-foreground text-sm mb-2 font-medium">Test Not Found</div>
                {initialTitle && (
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 leading-tight line-clamp-2">{initialTitle}</div>
                )}
                <div className="text-[10px] text-muted-foreground mb-3 opacity-50 px-2 line-clamp-1">{testId}</div>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => fetchSnippet(true)}
                    disabled={isRetrying}
                >
                    {isRetrying ? 'Retrying...' : 'Retry'}
                </Button>
            </Card>
        );
    }

    const categories = test.categories || [];

    return (
        <Card className="flex flex-col hover:shadow-lg transition-shadow relative overflow-hidden h-full border-slate-200 dark:border-slate-800 animate-in fade-in duration-500">
            <div className="absolute top-2 right-2 z-10">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 hover:bg-white text-muted-foreground hover:text-primary shadow-sm" onClick={(e) => handleShare(e, test.id)}>
                    <Share2 className="h-4 w-4" />
                </Button>
            </div>
            <CardHeader className="p-3 pb-2">
                <CardTitle className="text-lg font-bold text-red-900 md:text-xl pr-8 leading-tight line-clamp-2">{test.title || initialTitle}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-3 pt-0">
                <div className="flex flex-col justify-end mt-auto gap-1">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="mr-1 h-4 w-4" />{test.total_questions || 0} Qs • {test.duration || 30}m
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
                            {test.creator_verified && <VerifiedBadge size={14} />}
                            <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px]">{test.creator_name || 'Creator'}</span>
                        </div>
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
                <div className="flex-none"><TestVoteButtons testId={test.id} userId={user?.id} /></div>
                {user?.id === test.created_by ? (
                    <div className="flex-1 flex gap-2">
                        {onManageTest && (
                            <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground px-2" onClick={() => onManageTest(test)}>
                                <Settings className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">Manage</span>
                            </Button>
                        )}
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
    );
}
