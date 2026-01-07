import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';

interface CategoryPageProps { }

const CategoryPage: React.FC<CategoryPageProps> = () => {
    const { category } = useParams<{ category: string }>();
    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryName, setCategoryName] = useState("");

    useEffect(() => {
        if (category) {
            loadCategoryTests(category);
        }
    }, [category]);

    const loadCategoryTests = async (slugOrName: string) => {
        setLoading(true);
        try {
            // First try to find the category by slug or name
            const { data: catData, error: catError } = await supabase
                .from('categories') // Was 'sections'
                .select('id, name')
                .ilike('name', slugOrName.replace(/-/g, ' ')) // Simple de-slugify attempt
                .maybeSingle();

            if (catData) {
                setCategoryName(catData.name);
                // Fetch tests for this category
                const { data: testData, error: testError } = await supabase
                    .from('test_categories')
                    .select('test_id, tests(id, title, slug, questions, duration)')
                    .eq('category_id', catData.id);

                if (testData) {
                    setTests(testData.map(t => t.tests));
                }
            } else {
                setCategoryName(slugOrName);
                setTests([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-10 px-4 max-w-5xl">
            <Helmet>
                <title>{`${categoryName} Tests | Practice Online`}</title>
                <meta name="description" content={`Practice ${categoryName} tests online. Improve your skills with our curated list of exams.`} />
            </Helmet>

            <BackButton />

            <div className="mt-6 mb-10">
                <h1 className="text-4xl font-bold capitalize mb-2">{categoryName} Practice Tests</h1>
                <p className="text-muted-foreground text-lg">Browse our collection of {categoryName} mock tests and exams.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
            ) : tests.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-xl">
                    <p className="text-muted-foreground">No tests found for this category.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tests.map((test: any) => (
                        <Card key={test.id} className="hover:shadow-md transition-all">
                            <CardHeader>
                                <CardTitle className="line-clamp-2">{test.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    <Badge variant="secondary">{test.questions?.length || 0} Qs</Badge>
                                    <Badge variant="secondary">{test.duration} mins</Badge>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button asChild className="w-full">
                                    <Link to={`/test/${test.slug || test.id}`}>
                                        Start Test <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CategoryPage;
