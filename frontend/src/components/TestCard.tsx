
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Edit, MoreVertical, Globe, Link as LinkIcon, Lock, GraduationCap, Check, GitFork } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import TestVoteButtons from '@/components/TestVoteButtons';
import { toast } from 'sonner';
import TestCardCategoryList from '@/components/home/TestCardCategoryList';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { updateTest, getTestAttemptStatus } from '@/lib/testsApi';
import { fetchClasses } from '@/lib/classesApi';
import { useState, useEffect } from 'react';
import { shareTest } from '@/utils/shareUtils';
import CloneTestDialog from '@/components/CloneTestDialog';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

interface TestCardProps {
    test: any;
    user: any;
    onManage?: (test: any) => void;
    // Optional props if we have extra data, otherwise defaults/nulls
    categoryIds?: string[];
    allCategories?: any[];
    isVerifiedCreator?: boolean;
}

export default function TestCard({
    test,
    user,
    onManage,
    categoryIds = [],
    allCategories = [],
    isVerifiedCreator = false
}: TestCardProps) {
    const navigate = useNavigate();
    const { isAdmin, profile } = useAuth();
    const { isPremium } = usePremiumStatus();

    const isCreator = profile?.is_creator === true || profile?.designation === 'Teacher' || profile?.designation === 'Institution';
    const isOwnTest = user?.id === test.created_by;
    const [cloneDialogOpen, setCloneDialogOpen] = useState(false);

    const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>(test.visibility || (test.is_public ? 'public' : 'private'));

    const [classes, setClasses] = useState<any[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [progress, setProgress] = useState<{ status: 'in_progress' | 'submitted' | null, score: number | null, total_marks: number | null } | null>(null);

    useEffect(() => {
        if (user?.id && test?.id) {
            getTestAttemptStatus(test.id, user.id).then(prog => {
                if (!prog.error && prog.status) {
                    setProgress(prog);

                    // If submitted, fetch full test details to get computed_max_marks as fallback/verification
                    if (prog.status === 'submitted' && !prog.total_marks) {
                        import('@/lib/testsApi').then(({ fetchTestById }) => {
                            fetchTestById(test.id, undefined, true).then(({ data }) => {
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
    }, [test?.id, user?.id]);

    // Handle Supabase response which might be object or array for 'classes' join
    const getClassName = (testObj: any) => {
        if (!testObj.classes) return null;
        if (Array.isArray(testObj.classes)) return testObj.classes[0]?.name || null;
        return testObj.classes.name || null;
    };

    const [classInfo, setClassInfo] = useState<{ id: string | null, name: string | null }>({
        id: test.class_id || null,
        name: getClassName(test)
    });

    const loadClasses = async () => {
        if (classes.length > 0 || !user) return;
        setLoadingClasses(true);
        console.log("Loading classes for user:", user.id);
        try {
            const { data } = await fetchClasses(user.id);
            if (data) setClasses(data);
        } catch (e) {
            console.error("Failed to load classes", e);
        } finally {
            setLoadingClasses(false);
        }
    };

    const handleClassChange = async (classId: string | null, className: string | null) => {
        const prevInfo = classInfo;
        setClassInfo({ id: classId, name: className }); // Optimistic

        const { error } = await updateTest(test.id, { class_id: classId }, isAdmin);
        if (error) {
            toast.error("Failed to update class assignment");
            setClassInfo(prevInfo); // Revert
        } else {
            toast.success(classId ? `Assigned to ${className}` : "Removed from class");
        }
    };

    const handleShare = (e: React.MouseEvent, test: any) => {
        e.stopPropagation();
        shareTest(test);
    };

    const handleVisibilityChange = async (newVisibility: 'public' | 'unlisted' | 'private') => {
        const isPublic = newVisibility === 'public';
        const previousVisibility = visibility;

        // Optimistic update
        setVisibility(newVisibility);

        try {
            const { error } = await updateTest(test.id, {
                visibility: newVisibility,
                is_public: isPublic // Sync legacy field
            }, isAdmin);

            if (error) throw error;

            toast.success(`Visibility set to ${newVisibility === 'unlisted' ? 'Link Only' : newVisibility.charAt(0).toUpperCase() + newVisibility.slice(1)}`);

            // Update the local test object if it's being used elsewhere without reload
            if (test) {
                test.visibility = newVisibility;
                test.is_public = isPublic;
            }

        } catch (error: any) {
            console.error("Failed to update visibility:", error);
            toast.error("Failed to update visibility");
            setVisibility(previousVisibility); // Revert
        }
    };

    const getVisibilityIcon = () => {
        switch (visibility) {
            case 'public': return <Globe className="h-3 w-3" />;
            case 'unlisted': return <LinkIcon className="h-3 w-3" />;
            case 'private': return <Lock className="h-3 w-3" />;
            default: return <Globe className="h-3 w-3" />;
        }
    };

    const getVisibilityColor = () => {
        switch (visibility) {
            case 'public': return 'text-green-600 bg-green-50 border-green-200';
            case 'unlisted': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'private': return 'text-slate-600 bg-slate-50 border-slate-200';
            default: return 'text-slate-500';
        }
    };

    return (
        <>
            <Card className="flex flex-col hover-elevate relative h-full bg-white dark:bg-slate-900 overflow-hidden group">
                {/* Top Gradient Accent Strip */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-80 group-hover:opacity-100 transition-opacity" />

                <div className="absolute top-2.5 right-2.5 z-10 flex gap-1">
                    {(user?.id === test.created_by || isAdmin) && (
                        <DropdownMenu onOpenChange={(open) => { if (open) loadClasses(); }}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-slate-50/80 hover:bg-slate-100 text-slate-500 hover:text-slate-900 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white backdrop-blur-sm shadow-sm transition-all">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <Globe className="mr-2 h-4 w-4" /> Visibility
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuItem onClick={() => handleVisibilityChange('public')}>
                                            <Globe className="mr-2 h-4 w-4 text-green-600" /> Public
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleVisibilityChange('unlisted')}>
                                            <LinkIcon className="mr-2 h-4 w-4 text-blue-600" /> Link Only
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleVisibilityChange('private')}>
                                            <Lock className="mr-2 h-4 w-4 text-slate-600" /> Private
                                        </DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>

                                <DropdownMenuItem onClick={(e) => handleShare(e, test)}>
                                    <LinkIcon className="mr-2 h-4 w-4" /> Share Link
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <GraduationCap className="mr-2 h-4 w-4" /> Assign Class
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                                        {loadingClasses ? (
                                            <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
                                        ) : classes.length === 0 ? (
                                            <DropdownMenuItem disabled>No classes found</DropdownMenuItem>
                                        ) : (
                                            <>
                                                <DropdownMenuItem onClick={() => handleClassChange(null, null)}>
                                                    <span className="opacity-50">None</span>
                                                    {classInfo.id === null && <Check className="ml-auto h-4 w-4" />}
                                                </DropdownMenuItem>
                                                {classes.map(cls => (
                                                    <DropdownMenuItem key={cls.id} onClick={() => handleClassChange(cls.id, cls.name)}>
                                                        {cls.name}
                                                        {classInfo.id === cls.id && <Check className="ml-auto h-4 w-4" />}
                                                    </DropdownMenuItem>
                                                ))}
                                            </>
                                        )}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-slate-50/80 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-indigo-400 backdrop-blur-sm shadow-sm transition-all" onClick={(e) => handleShare(e, test)}>
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

                <CardHeader className="p-4 pb-2 relative mt-1">
                    <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 md:text-xl pr-14 leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {test.title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-4 pt-0">
                    <div className="flex flex-col justify-end mt-auto gap-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center text-[13px] text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-md">
                                <Clock className="mr-1.5 h-3.5 w-3.5 text-indigo-500" />{test.total_questions !== undefined ? test.total_questions : (test.questions?.length || 0)} Qs • {test.duration || 30}m
                            </div>
                            {test.custom_id && (
                                <span className="text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md shadow-sm">{test.custom_id}</span>
                            )}
                            {/* @ts-ignore */}
                            {classInfo.name && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-800/50">
                                    <GraduationCap className="h-3.5 w-3.5" />
                                    <span className="uppercase">{classInfo.name}</span>
                                </div>
                            )}
                            {(user?.id === test.created_by || isAdmin) && (
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide border ${getVisibilityColor()}`}>
                                    {getVisibilityIcon()}
                                    <span className="uppercase">{visibility === 'unlisted' ? 'Link' : visibility}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-full h-[1px] bg-slate-100 dark:bg-slate-800 my-3" />

                    <div className="flex items-center justify-between gap-2 h-8">
                        <div className="flex items-center gap-2 shrink-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-full pr-3 pl-1 py-1 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700" onClick={(e) => { e.stopPropagation(); navigate(`/creator/${test.created_by}`); }}>
                            <Avatar className="h-7 w-7 border-2 border-white dark:border-slate-900 shadow-sm">
                                <AvatarImage src={test.creator_avatar} />
                                <AvatarFallback className="text-[10px] bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 text-indigo-700 dark:text-indigo-300 font-bold">
                                    {test.creator_name ? test.creator_name.substring(0, 2).toUpperCase() : 'TC'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-1 min-w-0">
                                {isVerifiedCreator && <VerifiedBadge size={14} />}
                                <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold truncate max-w-[100px] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                    {test.creator_name || 'Creator'}
                                </span>
                            </div>
                        </div>
                        {/* Only show categories if available */}
                        <div className="scale-95 origin-right">
                            <TestCardCategoryList categoryIds={categoryIds} allCategories={allCategories} customCategory={test.custom_category} />
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="p-4 pt-3 mt-auto bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-3">
                    <div className="flex-none bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
                        <TestVoteButtons testId={test.id} userId={user?.id} isCreatorOrAdmin={user?.id === test.created_by || isAdmin} />
                    </div>
                    {(user?.id === test.created_by || isAdmin) ? (
                        <div className="flex-1 flex gap-2 justify-end">
                            {onManage && (
                                <Button variant="ghost" size="sm" className="h-9 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => onManage(test)}>
                                    <Settings className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline font-medium">Manage</span>
                                </Button>
                            )}
                            <Button variant="outline" size="sm" className="h-9 px-3 bg-white dark:bg-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-medium" onClick={() => navigate(`/edit-test/${test.id}`)}>
                                <Edit className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Edit</span>
                            </Button>
                            <Button size="sm" className={`h-9 px-4 font-semibold shadow-sm transition-all hover:scale-105 ${progress?.status === 'in_progress' ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0'}`} onClick={() => navigate(`/test-intro/${test.id}`)}>
                                {progress?.status === 'in_progress' ? 'Resume' : 'Open'} <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex-1 flex gap-2 justify-end">
                            {isCreator && !isOwnTest && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 px-3 border-violet-200 text-violet-600 hover:bg-violet-50 hover:text-violet-700 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-900/50 transition-colors font-medium"
                                    title="Copy and conduct"
                                    onClick={(e) => { e.stopPropagation(); setCloneDialogOpen(true); }}
                                >
                                    <GitFork className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Copy & Conduct</span>
                                </Button>
                            )}
                            <Button size="sm" className={`h-9 px-4 font-semibold shadow-sm transition-all hover:scale-105 ${progress?.status === 'in_progress' ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0'}`} onClick={() => navigate(`/test-intro/${test.id}`)}>
                                {progress?.status === 'in_progress' ? 'Resume' : 'Open'} <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </CardFooter>
            </Card>

            {/* Clone Dialog */}
            {isCreator && !isOwnTest && user?.id && (
                <CloneTestDialog
                    test={test}
                    userId={user.id}
                    isPremium={isPremium}
                    open={cloneDialogOpen}
                    onClose={() => setCloneDialogOpen(false)}
                />
            )}
        </>
    );
}
