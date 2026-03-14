import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCategories } from '@/lib/categoriesApi';
import { fetchTests } from '@/lib/testsApi';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Loader2, Edit } from 'lucide-react';
import TestLikeButton from '@/components/TestLikeButton';
import TestCardCategoryList from '@/components/home/TestCardCategoryList';
import { toSlug } from '@/lib/slugUtils';
import { toast } from 'sonner';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';
import { useYouTubeStyleRender } from '@/hooks/useYouTubeStyleRender';

interface CategoryPageProps { }

const CategoryPage: React.FC<CategoryPageProps> = () => {
    const { category } = useParams<{ category: string }>();
    const { user } = useAuth();
    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryName, setCategoryName] = useState("");

    const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
    const [allCategories, setAllCategories] = useState<any[]>([]);

    // YouTube-style lazy loading hook
    const {
        registerSkeleton,
        isItemRendered,
        renderedCount,
        totalCount,
        isComplete
    } = useYouTubeStyleRender(tests, loading, {
        rootMargin: '100px',
        threshold: 0.1
    });

    useEffect(() => {
        if (category) {
            loadCategoryTests(category);
        }
    }, [category]);

    const loadCategoryTests = async (slugOrName: string) => {
        setLoading(true);
        try {
            const { data: allCats } = await fetchCategories();
            if (allCats) setAllCategories(allCats);

            // Find match
            const matchedCat = allCats?.find((c: any) => toSlug(c.name) === slugOrName);

            if (matchedCat) {
                setCategoryName(matchedCat.name);
                setCurrentCategoryId(matchedCat.id);
                // Fetch tests
                const { data: testData } = await fetchTests({
                    categoryId: matchedCat.id,
                    limit: 100
                });
                setTests(testData || []);
            } else {
                // Fallback: Name direct match
                const directMatch = allCats?.find((c: any) => c.name.toLowerCase() === slugOrName.replace(/-/g, ' ').toLowerCase());
                if (directMatch) {
                    setCategoryName(directMatch.name);
                    setCurrentCategoryId(directMatch.id);
                    const { data: testData } = await fetchTests({
                        categoryId: directMatch.id,
                        limit: 100
                    });
                    setTests(testData || []);
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
            <SEO
                title={categoryName ? `${categoryName} Mock Tests | TestoZa` : 'Test Category | TestoZa'}
                description={`Prepare for ${categoryName || 'exams'} with our curated mock tests. Best online test series for ${categoryName || 'students'}.`}
                url={window.location.href}
                schemas={[
                    {
                        "@context": "https://schema.org",
                        "@type": "BreadcrumbList",
                        "itemListElement": [
                            {
                                "@type": "ListItem",
                                "position": 1,
                                "name": "Simulated Exams",
                                "item": "https://testoza.com/tests"
                            },
                            {
                                "@type": "ListItem",
                                "position": 2,
                                "name": categoryName || "Category",
                                "item": window.location.href
                            }
                        ]
                    }
                ]}
            />

            <div className="mt-6 mb-8">
                <h1 className="text-2xl font-bold capitalize mb-2">{categoryName} Practice Tests</h1>
            </div>

            {tests.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-xl">
                    <p className="text-muted-foreground">No tests found for this category.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tests.map((test: any) => {
                        if (!test) return null;

                        const testId = test.id || Math.random();
                        const isRendered = isItemRendered(testId);

                        if (!isRendered) {
                            return (
                                <div key={testId} ref={(el) => registerSkeleton(testId, el)}>
                                    <TestCardSkeleton />
                                </div>
                            );
                        }

                        return (
                            <Card key={testId} className="flex flex-col hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group border-slate-200 dark:border-slate-800 h-full animate-in fade-in duration-500">
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

                    {/* Progress indicator */}
                    {!isComplete && tests.length > 0 && (
                        <div className="col-span-full py-4 text-center">
                            <span className="text-sm text-muted-foreground">
                                {renderedCount} of {totalCount} tests loaded
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CategoryPage;
