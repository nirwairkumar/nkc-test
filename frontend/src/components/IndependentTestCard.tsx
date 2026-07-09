import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Edit, GitFork } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TestVoteButtons from '@/components/TestVoteButtons';
import { fetchTestCardSnippet, getTestAttemptStatus } from '@/lib/testsApi';
import { toast } from 'sonner';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';
import { shareTest } from '@/utils/shareUtils';
import { useAuth } from '@/contexts/AuthContext';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import CloneTestDialog from '@/components/CloneTestDialog';

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
    const [progress, setProgress] = useState<{ status: 'in_progress' | 'submitted' | null, score: number | null, total_marks: number | null } | null>(null);
    const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
    const navigate = useNavigate();
    const { user: authUser, profile } = useAuth();
    const { isPremium } = usePremiumStatus();

    // Whether this user can see the Clone button:
    // - must be a creator (is_creator flag or Teacher/Institution designation)
    // - must not be the owner of this test
    const isCreator = profile?.is_creator === true || profile?.designation === 'Teacher' || profile?.designation === 'Institution';
    const isOwnTest = authUser?.id && test?.created_by && authUser.id === test.created_by;

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
                if (user?.id) {
                    getTestAttemptStatus(testId, user.id).then(prog => {
                        if (!prog.error && prog.status) {
                            setProgress(prog);

                            // If submitted, fetch full test details to get computed_max_marks
                            // This follows the results.py logic of requiring full test metadata for accuracy
                            if (prog.status === 'submitted' && !prog.total_marks) {
                                import('@/lib/testsApi').then(({ fetchTestById }) => {
                                    fetchTestById(testId, undefined, true).then(({ data }) => {
                                        if (data?.total_max_marks !== undefined) {
                                            setProgress(prev => prev ? ({
                                                ...prev,
                                                total_marks: data.total_max_marks
                                            }) : null);
                                        }
                                    });
                                });
                            }
                        }
                    });
                }
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

    const handleShare = (e: React.MouseEvent, test: any) => {
        e.stopPropagation();
        shareTest(test);
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
        <>
            <Card className="flex flex-col hover:shadow-lg transition-shadow relative overflow-hidden h-full border-slate-200 dark:border-slate-800 animate-in fade-in duration-500">
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 hover:bg-white text-muted-foreground hover:text-primary shadow-sm" onClick={(e) => handleShare(e, test)}>
                        <Share2 className="h-4 w-4" />
                    </Button>
                </div>

                {/* CSS Stamp Overlay for Completed Tests */}
                {progress && progress.status === 'submitted' && (
                    <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none -rotate-[12deg] opacity-90 transition-transform duration-300 scale-[0.8] sm:scale-[0.9] mix-blend-multiply text-emerald-600/90 drop-shadow-sm">
                        <div className="relative w-[130px] h-[130px] flex items-center justify-center rounded-full border-[3.5px] border-emerald-600/70 p-1.5">
                            <div className="w-full h-full rounded-full border-[1.5px] border-emerald-600/50 flex flex-col items-center justify-start pt-2 bg-transparent">
                                {/* Top Stars */}
                                <div className="flex gap-1.5 opacity-80 items-center justify-center mb-1">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                                </div>

                                {/* "DONE" Text with horizontal lines - positioned higher to leave room for score */}
                                <div className="absolute top-[24%] left-1/2 -translate-x-1/2 z-30 w-[120%] flex flex-col items-center">
                                    <div className="w-full border-t-[2.5px] border-emerald-600/80 mb-[2px]"></div>
                                    <div className="text-[34px] font-black tracking-[0.1em] uppercase leading-none font-serif text-emerald-600 bg-white/5 px-2">
                                        DONE
                                    </div>
                                    <div className="w-full border-b-[2.5px] border-emerald-600/80 mt-[2px]"></div>
                                </div>

                                {/* Bottom Stars & Numerical Score only */}
                                <div className="mt-12 mb-0.5 flex flex-col items-center">
                                    <div className="flex gap-1.5 opacity-80 items-center justify-center mb-1">
                                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                                    </div>
                                    <div className="flex items-baseline mt-0.5">
                                        <span className="text-[22px] font-black text-emerald-600 leading-none">{progress.score ?? 0}</span>
                                        <span className="text-[16px] font-bold text-emerald-600/60 leading-none ml-1">/{progress.total_marks ?? '?'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <CardHeader className="p-3 pb-2 relative">
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
                            <Button size="sm" className={`flex-1 h-8 px-3 ${progress?.status === 'in_progress' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`} onClick={() => navigate(`/test-intro/${test.id}`)}>
                                {progress?.status === 'in_progress' ? 'Resume' : 'Open'} <ArrowRight className="ml-2 h-3 w-3" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex-1 flex gap-2 justify-end">
                            {isCreator && !isOwnTest && test && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 border-violet-200 text-violet-600 hover:bg-violet-50 hover:text-violet-700 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-900/50 transition-colors"
                                    title="Copy and conduct"
                                    onClick={(e) => { e.stopPropagation(); setCloneDialogOpen(true); }}
                                >
                                    <GitFork className="h-4 w-4 mr-1.5" /> Copy & Conduct
                                </Button>
                            )}
                            <Button size="sm" className={`h-8 text-sm px-4 ${progress?.status === 'in_progress' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`} onClick={() => navigate(`/test-intro/${test.id}`)}>
                                {progress?.status === 'in_progress' ? 'Resume' : 'Open'} <ArrowRight className="ml-2 h-3 w-3" />
                            </Button>
                        </div>
                    )}
                </CardFooter>
            </Card>

            {/* Clone Dialog */}
            {test && authUser?.id && (
                <CloneTestDialog
                    test={test}
                    userId={authUser.id}
                    isPremium={isPremium}
                    open={cloneDialogOpen}
                    onClose={() => setCloneDialogOpen(false)}
                />
            )}
        </>
    );
}
