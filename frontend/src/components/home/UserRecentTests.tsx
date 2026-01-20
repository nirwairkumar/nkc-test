import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Edit, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TestLikeButton from '@/components/TestLikeButton';
import { fetchTestsByUserId, Test } from '@/lib/testsApi';
import { toast } from 'sonner';
import TestCardCategoryList from '@/components/home/TestCardCategoryList';
import supabase from '@/lib/supabaseClient';

export default function UserRecentTests({ user, onManageTest }: { user: any, onManageTest: (test: any) => void }) {
    const [userTests, setUserTests] = useState<Test[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [testCategoryMap, setTestCategoryMap] = useState<Record<string, string[]>>({});
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            loadUserTests();
            loadCategoriesData();
        }
    }, [user]);

    async function loadUserTests() {
        const { data } = await fetchTestsByUserId(user.id);
        if (data) {
            const sorted = (data as any[]).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setUserTests(sorted);
        }
    }

    async function loadCategoriesData() {
        const { data: catData } = await supabase.from('categories').select('*');
        const { data: mapData } = await supabase.from('test_categories').select('*');

        if (catData) setCategories(catData);

        const map: Record<string, string[]> = {};
        if (mapData) {
            mapData.forEach((m: any) => {
                if (!map[m.test_id]) map[m.test_id] = [];
                map[m.test_id].push(m.category_id);
            });
        }
        setTestCategoryMap(map);
    }

    const handleShare = (e: React.MouseEvent, testId: string) => {
        e.stopPropagation();
        const url = `${window.location.origin}/test-intro/${testId}`;
        navigator.clipboard.writeText(url);
        toast.success("Test link copied!");
    };

    if (!user || userTests.length === 0) return null;

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
                {userTests.slice(0, 3).map((test, index) => (
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
                                    <TestCardCategoryList categoryIds={testCategoryMap[test.id]} allCategories={categories} customCategory={test.custom_category} />
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
                ))}
            </div>
        </div>
    );
}
