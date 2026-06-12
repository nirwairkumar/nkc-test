import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCategories, fetchSubCategories, fetchCategoryTestSubCategoryMap, SubCategory } from '@/lib/categoriesApi';
import { fetchTests } from '@/lib/testsApi';
import CombinedSessionsSection from '@/components/home/CombinedSessionsSection';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Share2, ArrowRight, Settings, Loader2, Edit, Layers } from 'lucide-react';
import TestVoteButtons from '@/components/TestVoteButtons';
import TestCardCategoryList from '@/components/home/TestCardCategoryList';
import { toSlug } from '@/lib/slugUtils';
import { toast } from 'sonner';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';
import IndependentTestCard from '@/components/IndependentTestCard';
import { useYouTubeStyleRender } from '@/hooks/useYouTubeStyleRender';
import { useCombinedExclusion } from '@/hooks/useCombinedExclusion';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

interface CategoryPageProps { }

const CategoryPage: React.FC<CategoryPageProps> = () => {
    const { category } = useParams<{ category: string }>();
    const { user } = useAuth();
    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryName, setCategoryName] = useState("");
    const [testIdsSet, setTestIdsSet] = useState<Set<string>>(new Set());
    const { isExcluded } = useCombinedExclusion();

    const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
    const [allCategories, setAllCategories] = useState<any[]>([]);
    const [categorySubCategories, setCategorySubCategories] = useState<SubCategory[]>([]);
    const [testSubCategoryMap, setTestSubCategoryMap] = useState<Record<string, string>>({});

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

                if (testData) {
                    setTestIdsSet(new Set((testData as any[]).map(t => t.id)));
                }

                const filteredTests = (testData || []).filter((t: any) => !isExcluded(t.id));
                setTests(filteredTests);

                // Fetch sub-categories for this category
                const { data: subCats } = await fetchSubCategories(matchedCat.id);
                setCategorySubCategories(subCats || []);
                const { data: scMap } = await fetchCategoryTestSubCategoryMap(matchedCat.id);
                setTestSubCategoryMap(scMap || {});
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

                    if (testData) {
                        setTestIdsSet(new Set((testData as any[]).map(t => t.id)));
                    }

                    const filteredTests = (testData || []).filter((t: any) => !isExcluded(t.id));
                    setTests(filteredTests);

                    // Fetch sub-categories for this category
                    const { data: subCats } = await fetchSubCategories(directMatch.id);
                    setCategorySubCategories(subCats || []);
                    const { data: scMap } = await fetchCategoryTestSubCategoryMap(directMatch.id);
                    setTestSubCategoryMap(scMap || {});
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

            {/* Combined Tests Section — Replaced with unified Component */}
            {testIdsSet.size > 0 && (
                <div className="mb-14">
                    <CombinedSessionsSection user={user} filterTestIds={testIdsSet} />
                </div>
            )}

            {tests.length === 0 && testIdsSet.size === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-xl">
                    <p className="text-muted-foreground">No tests found for this category.</p>
                </div>
            ) : categorySubCategories.length > 0 ? (
                // Grouped view by sub-category
                <div className="space-y-8">
                    <Accordion type="multiple" defaultValue={[...categorySubCategories.map(sc => sc.id), "other"]}>
                        {categorySubCategories.map(sc => {
                            const scTests = tests.filter(t => testSubCategoryMap[t.id] === sc.id);
                            if (scTests.length === 0) return null;
                            return (
                                <AccordionItem key={sc.id} value={sc.id} className="border-none mt-0">
                                    <AccordionTrigger className="hover:no-underline py-2 border-b">
                                        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">{sc.name}</h2>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {scTests.map((test: any) => {
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
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}

                        {/* Tests without a sub-category */}
                        {(() => {
                            const ungroupedTests = tests.filter(t => !testSubCategoryMap[t.id]);
                            if (ungroupedTests.length === 0) return null;
                            return (
                                <AccordionItem value="other" className="border-none mt-4">
                                    <AccordionTrigger className="hover:no-underline py-2 border-b">
                                        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Other</h2>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {ungroupedTests.map((test: any) => {
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
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })()}
                    </Accordion>

                    {/* Progress indicator */}
                    {!isComplete && tests.length > 0 && (
                        <div className="py-4 text-center">
                            <span className="text-sm text-muted-foreground">
                                {renderedCount} of {totalCount} tests loaded
                            </span>
                        </div>
                    )}
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
