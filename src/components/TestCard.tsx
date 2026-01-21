
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TestLikeButton from '@/components/TestLikeButton';
import { toast } from 'sonner';
import TestCardCategoryList from '@/components/home/TestCardCategoryList';
import VerifiedBadge from '@/components/ui/VerifiedBadge';

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

    const handleShare = (e: React.MouseEvent, testId: string) => {
        e.stopPropagation();
        const url = `${window.location.origin}/test-intro/${testId}`;
        navigator.clipboard.writeText(url);
        toast.success("Test link copied!");
    };

    return (
        <Card className="flex flex-col hover:shadow-lg transition-shadow relative overflow-hidden h-full border-slate-200 dark:border-slate-800">
            <div className="absolute top-2 right-2 z-10">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 hover:bg-white text-muted-foreground hover:text-primary shadow-sm" onClick={(e) => handleShare(e, test.id)}>
                    <Share2 className="h-4 w-4" />
                </Button>
            </div>
            <CardHeader className="p-3 pb-2">
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
                <div className="flex-none"><TestLikeButton testId={test.id} userId={user?.id} /></div>
                {user?.id === test.created_by ? (
                    <div className="flex-1 flex gap-2">
                        {onManage && (
                            <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground px-2" onClick={() => onManage(test)}>
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
