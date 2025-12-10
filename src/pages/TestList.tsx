import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchTests, Test } from '@/lib/testsApi';
import { BookOpen, Clock, ArrowRight, History, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function TestList() {
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth(); // To conditionally show things or just personalized greeting

    useEffect(() => {
        loadTests();
    }, []);

    async function loadTests() {
        try {
            const { data, error } = await fetchTests();
            if (error) throw error;
            setTests(data || []);
        } catch (err) {
            console.error('Failed to load tests', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Available Tests</h1>
                    <p className="text-muted-foreground mt-2">Select a test to begin your practice</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests.map((test) => (
                    <Card key={test.id} className="flex flex-col hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-xl">{test.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <p className="text-muted-foreground mb-4 line-clamp-3">{test.description}</p>
                            <div className="flex items-center justify-between mt-auto">
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Clock className="mr-1 h-4 w-4" />
                                    {test.questions?.length || 0} Questions
                                    <span className="mx-2">•</span>
                                    {test.questions?.length || 0} Minutes
                                </div>
                                {test.custom_id && (
                                    <span className="text-xs text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                        ID: {test.custom_id}
                                    </span>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => navigate(`/test/${test.id}`)}>
                                Start Test
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {tests.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No tests available at the moment.</p>
                </div>
            )}
        </div>
    );
}
