
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Edit, MoreVertical, Globe, Link as LinkIcon, Lock, GraduationCap, Check } from 'lucide-react';
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
    const { isAdmin } = useAuth();

    const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>(test.visibility || (test.is_public ? 'public' : 'private'));

    const [classes, setClasses] = useState<any[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [progress, setProgress] = useState<{ status: 'in_progress' | 'submitted' | null, score: number | null, total_marks: number | null } | null>(null);

    useEffect(() => {
        if (user?.id && test?.id) {
            getTestAttemptStatus(test.id, user.id).then(prog => {
                if (!prog.error && prog.status) {
                    setProgress(prog);
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
        <Card className="flex flex-col hover:shadow-lg transition-shadow relative h-full border-slate-200 dark:border-slate-800">
            <div className="absolute top-2 right-2 z-10 flex gap-1">
                {(user?.id === test.created_by || isAdmin) && (
                    <DropdownMenu onOpenChange={(open) => { if (open) loadClasses(); }}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 hover:bg-white text-muted-foreground hover:text-primary shadow-sm">
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
                                        <Globe className="mr-2 h-4 w-4" /> Public
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleVisibilityChange('unlisted')}>
                                        <LinkIcon className="mr-2 h-4 w-4" /> Link Only
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleVisibilityChange('private')}>
                                        <Lock className="mr-2 h-4 w-4" /> Private
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
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 hover:bg-white text-muted-foreground hover:text-primary shadow-sm" onClick={(e) => handleShare(e, test)}>
                    <Share2 className="h-4 w-4" />
                </Button>
            </div>

            {/* CSS Stamp Overlay for Completed Tests */}
            {progress && progress.status === 'submitted' && (
                <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none -rotate-12 opacity-90 transition-transform duration-300 scale-90 sm:scale-100 mix-blend-multiply">
                    <div className="border-[4px] border-emerald-600/80 rounded-lg p-1.5 flex flex-col items-center justify-center bg-transparent">
                        <div className="border-[3px] border-emerald-600/80 rounded border-dotted p-3 text-center min-w-[140px]">
                            <div className="text-4xl font-black text-emerald-600/90 tracking-widest uppercase mb-1 origin-center drop-shadow-sm font-serif">
                                DONE
                            </div>
                            <div className="text-emerald-700/90 font-bold text-sm px-2 w-fit mx-auto uppercase tracking-wider border-t-2 border-emerald-600/50 pt-1">
                                SCORE: {progress.score ?? 0}/{progress.total_marks ?? '?'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <CardHeader className="p-3 pb-2 relative">
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
                        {/* @ts-ignore */}
                        {classInfo.name && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                <GraduationCap className="h-3 w-3" />
                                <span className="uppercase">{classInfo.name}</span>
                            </div>
                        )}
                        {(user?.id === test.created_by || isAdmin) && (
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getVisibilityColor()}`}>
                                {getVisibilityIcon()}
                                <span className="uppercase">{visibility === 'unlisted' ? 'Link' : visibility}</span>
                            </div>
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
                            {isVerifiedCreator && <VerifiedBadge size={14} />}
                            <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px]">{test.creator_name || 'Creator'}</span>
                        </div>
                    </div>
                    {/* Only show categories if available */}
                    <TestCardCategoryList categoryIds={categoryIds} allCategories={allCategories} customCategory={test.custom_category} />
                </div>
            </CardContent>
            <CardFooter className="p-3 pt-0 flex justify-between items-center gap-2">
                <div className="flex-none"><TestVoteButtons testId={test.id} userId={user?.id} isCreatorOrAdmin={user?.id === test.created_by || isAdmin} /></div>
                {(user?.id === test.created_by || isAdmin) ? (
                    <div className="flex-1 flex gap-2">
                        {onManage && (
                            <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground px-2" onClick={() => onManage(test)}>
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
                    <div className="flex-1">
                        <Button size="sm" className={`w-full h-8 text-sm ${progress?.status === 'in_progress' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`} onClick={() => navigate(`/test-intro/${test.id}`)}>
                            {progress?.status === 'in_progress' ? 'Resume' : 'Open'} <ArrowRight className="ml-2 h-3 w-3" />
                        </Button>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
