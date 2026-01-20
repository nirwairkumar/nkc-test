import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Loader2, Edit } from 'lucide-react';
import TestLikeButton from '@/components/TestLikeButton';
import TestCardCategoryList from '@/components/home/TestCardCategoryList';
import { toSlug } from '@/lib/slugUtils';
import { toast } from 'sonner';

interface CategoryPageProps { }

const CategoryPage: React.FC<CategoryPageProps> = () => {
    const { category } = useParams<{ category: string }>();
    const { user } = useAuth();
    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryName, setCategoryName] = useState("");

    const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
    const [allCategories, setAllCategories] = useState<any[]>([]);

    useEffect(() => {
        if (category) {
            loadCategoryTests(category);
        }
    }, [category]);

    const loadCategoryTests = async (slugOrName: string) => {
        setLoading(true);
        try {
            const { data: allCats } = await supabase.from('categories').select('id, name');
            if (allCats) setAllCategories(allCats);

            const matchedCat = allCats?.find(c => toSlug(c.name) === slugOrName);

            if (matchedCat) {
                setCategoryName(matchedCat.name);
                setCurrentCategoryId(matchedCat.id);
                // Fetch tests for this category
                const { data: testData } = await supabase
                    .from('test_categories')
                    .select('test_id, tests(*)')
                    .eq('category_id', matchedCat.id);

                if (testData) {
                    // Filter valid tests and ensure objects + visibility check
                    const validTests = testData
                        .map(t => t.tests)
                        .filter(t => {
                            if (!t || typeof t !== 'object') return false;
                            // Visibility Check: Show if public OR if created by current user
                            const isPublic = t.is_public !== false; // Default to true if undefined
                            const isCreator = user && t.created_by === user.id;
                            return isPublic || isCreator;
                        });
                    setTests(validTests);
                }
            } else {
                // Fallback: Try name direct match
                const directMatch = allCats?.find(c => c.name.toLowerCase() === slugOrName.replace(/-/g, ' ').toLowerCase());
                if (directMatch) {
                    setCategoryName(directMatch.name);
                    setCurrentCategoryId(directMatch.id);
                    const { data: testData } = await supabase
                        .from('test_categories')
                        .select('test_id, tests(*)')
                        .eq('category_id', directMatch.id);
                    if (testData) {
                        const validTests = testData
                            .map(t => t.tests)
                            .filter(t => {
                                if (!t || typeof t !== 'object') return false;
                                // Visibility Check
                                const isPublic = t.is_public !== false;
                                const isCreator = user && t.created_by === user.id;
                                return isPublic || isCreator;
                            });
                        setTests(validTests);
                    }
                } else {
                    setCategoryName(slugOrName.replace(/-/g, ' '));
                    setTests([]);
                }
            }
        } catch (err) {
            console.error("Error loading category tests:", err);
            toast.error("Failed to load tests");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    return (
        <div className="container mx-auto py-6 px-4">
            <Helmet>
                <title>{categoryName ? `${categoryName} Mock Tests | Testoza` : 'Test Category | Testoza'}</title>
                <meta name="description" content={`Prepare for ${categoryName || 'exams'} with our curated mock tests. Best online test series for ${categoryName || 'students'}.`} />
                <link rel="canonical" href={window.location.href} />
            </Helmet>

            <div className="mt-6 mb-8">
                <h1 className="text-2xl font-bold capitalize mb-2">{categoryName} Practice Tests</h1>
                <p className="text-muted-foreground text-sm">Browse our collection of {categoryName} mock tests and exams.</p>
            </div>

            {tests.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-xl">
                    <p className="text-muted-foreground">No tests found for this category.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tests.map((test: any) => {
                        if (!test) return null;
                        return (
                            <Card key={test.id || Math.random()} className="flex flex-col hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group border-slate-200 dark:border-slate-800 h-full">
                                <div className="absolute top-2 right-2 z-10">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 hover:bg-white text-muted-foreground hover:text-primary shadow-sm" onClick={(e) => {
                                        e.stopPropagation();
                                        const url = `${window.location.origin}/test-intro/${test.id}`;
                                        navigator.clipboard.writeText(url);
                                        toast.success("Test link copied!");
                                    }}>
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <CardHeader className="p-3 pb-2">
                                    <CardTitle className="text-lg font-bold text-red-900 md:text-xl pr-8 leading-tight line-clamp-2">{test.title || 'Untitled Test'}</CardTitle>
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
                                        <div className="flex items-center gap-2 shrink-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full pr-2 transition-colors py-0.5">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={test.creator_avatar} />
                                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                                    {test.creator_name ? test.creator_name.substring(0, 2).toUpperCase() : 'TC'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px]">{test.creator_name || 'Creator'}</span>
                                        </div>
                                        <TestCardCategoryList
                                            categoryIds={currentCategoryId ? [currentCategoryId] : []}
                                            allCategories={allCategories}
                                            customCategory={test.custom_category}
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter className="p-3 pt-0 flex justify-between items-center gap-2">
                                    <div className="flex-none"><TestLikeButton testId={test.id} userId={undefined} /></div>
                                    <div className="flex-1">
                                        <Button asChild size="sm" className="w-full h-8 text-sm">
                                            <Link to={`/test-intro/${test.id}`}>
                                                Open <ArrowRight className="ml-2 h-3 w-3" />
                                            </Link>
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CategoryPage;
