import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Edit, FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TestLikeButton from '@/components/TestLikeButton';
import { fetchTests, Test } from '@/lib/testsApi';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import TestCardCategoryList from '@/components/home/TestCardCategoryList';
import supabase from '@/lib/supabaseClient';

export default function FeaturedTests({ user, onManageTest }: { user: any, onManageTest: (test: any) => void }) {
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<any[]>([]);
    const [testCategoryMap, setTestCategoryMap] = useState<Record<string, string[]>>({});
    const navigate = useNavigate();

    useEffect(() => {
        async function loadData() {
            // Load Tests
            const { data: testData } = await fetchTests({ page: 1, limit: 6 });

            // Load Categories
            const { data: catData } = await supabase.from('categories').select('*');
            const { data: mapData } = await supabase.from('test_categories').select('*');

            if (testData) setTests(testData);
            if (catData) setCategories(catData);

            const map: Record<string, string[]> = {};
            if (mapData) {
                mapData.forEach((m: any) => {
                    if (!map[m.test_id]) map[m.test_id] = [];
                    map[m.test_id].push(m.category_id);
                });
            }
            setTestCategoryMap(map);
            setLoading(false);
        }
        loadData();
    }, []);

    const handleShare = (e: React.MouseEvent, testId: string) => {
        e.stopPropagation();
        const url = `${window.location.origin}/test-intro/${testId}`;
        navigator.clipboard.writeText(url);
        toast.success("Test link copied!");
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} className="h-[250px] w-full rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="mb-12 animate-in fade-in duration-700">


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests.map((test) => (
                    <Card key={test.id} className="flex flex-col hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group border-slate-200 dark:border-slate-800">
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
                            <CardTitle className="text-lg font-bold text-red-900 md:text-xl pr-8 leading-tight line-clamp-2">{test.title}</CardTitle>
                        </CardHeader>

                        <CardContent className="flex-1 p-3 pt-0">
                            <div className="flex flex-col justify-end mt-auto gap-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Clock className="mr-1 h-4 w-4" />
                                        {test.questions?.length || 0} Qs • {test.duration || 30}m
                                    </div>
                                    {test.custom_id && (
                                        <span className="text-xs text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">#{test.custom_id}</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-1.5 gap-2 h-8">
                                <div className="flex items-center gap-2 shrink-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full pr-2 transition-colors py-0.5" onClick={() => navigate(`/creator/${test.created_by}`)}>
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={test.creator_avatar} />
                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{test.creator_name ? test.creator_name.substring(0, 2).toUpperCase() : 'TC'}</AvatarFallback>
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

                            {user?.id === test.created_by ? (
                                <div className="flex-1 flex gap-2">
                                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground px-2" onClick={() => onManageTest(test)}>
                                        <Settings className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">Manage</span>
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
                ))}
            </div>
        </div>
    );
}
