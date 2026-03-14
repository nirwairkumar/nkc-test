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
import TestVoteButtons from '@/components/TestVoteButtons';
import TestCardCategoryList from '@/components/home/TestCardCategoryList';
import { toSlug } from '@/lib/slugUtils';
import { toast } from 'sonner';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';
import IndependentTestCard from '@/components/IndependentTestCard';
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
                    limit: 100,
                    idsOnly: true
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
                        limit: 100,
                        idsOnly: true
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
                            <IndependentTestCard
                                key={testId}
                                testId={test.id || testId}
                                initialTitle={test.title}
                                user={user}
                            />
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
