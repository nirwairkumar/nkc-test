import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import apiClient from '@/lib/apiClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, BookOpen, GraduationCap } from 'lucide-react';
import TestCard from '@/components/TestCard';
import { Test } from '@/lib/testsApi';
import { ClassItem } from '@/lib/classesApi';
import { fetchCategories } from '@/lib/categoriesApi';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';
import { useYouTubeStyleRender } from '@/hooks/useYouTubeStyleRender';
import { toast } from 'sonner';
import { roleLabel } from '@/lib/roleLabel';

interface CreatorProfile {
    id: string;
    full_name: string;
    avatar_url: string;
    bio: string;
    role: string;
    designation: string;
}

const getBadgeStyle = (role: string) => {
    switch (role) {
        case 'Admin': return { backgroundColor: '#dc2626', color: 'white', border: 'none' };
        case 'Teacher': return { backgroundColor: '#3b82f6', color: 'white', border: 'none' };
        case 'Institution': return { backgroundColor: '#eab308', color: 'black', border: 'none' };
        case 'Student': return { backgroundColor: '#6b7280', color: 'white', border: 'none' };
        case 'Guest': return { backgroundColor: '#9ca3af', color: 'white', border: 'none' };
        default: return {};
    }
};

const getRoleIcon = (role: string) => {
    switch (role) {
        case 'Institution': return <GraduationCap className="h-3 w-3" />;
        case 'Teacher': return <BookOpen className="h-3 w-3" />;
        case 'Student': return <User className="h-3 w-3" />;
        default: return <User className="h-3 w-3" />;
    }
};

export default function CreatorProfilePage() {
    const { id: creatorId } = useParams();
    const navigate = useNavigate();
    const [creator, setCreator] = useState<CreatorProfile | null>(null);
    const [tests, setTests] = useState<Test[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClassId, setSelectedClassId] = useState<string | 'all'>('all');

    useEffect(() => {
        if (creatorId) {
            loadCreatorData();
        } else {
            setLoading(false);
        }
    }, [creatorId]);

    const loadCreatorData = async () => {
        setLoading(true);
        try {
            // REFACTORED: Single API call to Python Backend
            console.log("loadCreatorData: Fetching creators data...", creatorId);
            const response = await apiClient.get(`/creators/${creatorId}`);
            console.log("loadCreatorData: API response received!", response.data);
            const { profile, tests, classes } = response.data;

            if (profile) setCreator(profile);
            setTests(tests || []);
            setClasses(classes || []);

            // Categories might still need to be fetched globally or added to the backend endpoint
            // For now, let's keep fetchCategories as is or fetch it separately if it's not in the response
            const catRes = await fetchCategories();
            setCategories(catRes.data || []);

        } catch (error) {
            console.error("Failed to load creator data", error); toast.error("Failed to load creator profile!");
        } finally {
            setLoading(false);
        }
    };

    // Filter content based on selected class
    const filteredTests = selectedClassId === 'all'
        ? tests
        : tests.filter(t => t.class_id === selectedClassId);

    // YouTube-style lazy loading hook for filtered tests (MUST run before early returns)
    const {
        registerSkeleton,
        isItemRendered,
        renderedCount,
        totalCount,
        isComplete
    } = useYouTubeStyleRender(filteredTests, loading, {
        rootMargin: '100px',
        threshold: 0.1
    });

    console.log("CreatorProfilePage render state - loading:", loading, "hasCreator:", !!creator, "tests count:", tests.length);

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    if (!creator) return <div className="container py-10 text-center">Creator not found</div>;

    return (
        <div className="container mx-auto max-w-6xl py-8 px-4">
            <SEO
                title={`${creator.full_name} - Test Creator Profile | TestoZa`}
                description={`View tests created by ${creator.full_name} on TestoZa. ${creator.bio ? creator.bio.substring(0, 150) + "..." : "Explore their educational content."}`}
                keywords={[creator.full_name, "test creator", "online teacher", "testoza profile"]}
            />
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start mb-10">
                <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-white shadow-lg">
                    <AvatarImage src={creator.avatar_url} />
                    <AvatarFallback className="text-4xl">{creator.full_name ? creator.full_name[0].toUpperCase() : "C"}</AvatarFallback>
                </Avatar>
                <div className="text-center md:text-left flex-1">
                    <h1 className="text-3xl font-bold">{creator.full_name}</h1>
                    <p className="text-muted-foreground mt-2 max-w-2xl whitespace-pre-line">{creator.bio || "No bio available."}</p>
                    <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                        <Badge
                            variant="secondary"
                            className="gap-1 px-2 py-0.5"
                            style={getBadgeStyle(creator.designation || 'Student')}
                        >
                            {getRoleIcon(creator.designation || 'Student')}
                            {roleLabel(creator.designation) || 'Student'}
                        </Badge>
                        <Badge variant="outline" className="gap-1"><BookOpen className="h-3 w-3" /> {tests.length} Tests</Badge>
                    </div>
                </div>
            </div>

            {/* Class Filters */}
            {classes.length > 0 && (
                <div className="mb-8 overflow-x-auto pb-2">
                    <div className="flex gap-2 min-w-max">
                        <Button
                            variant={selectedClassId === 'all' ? "default" : "outline"}
                            onClick={() => setSelectedClassId('all')}
                            className="rounded-full"
                        >
                            All Content
                        </Button>
                        {classes.map(cls => (
                            <Button
                                key={cls.id}
                                variant={selectedClassId === cls.id ? "default" : "outline"}
                                onClick={() => setSelectedClassId(cls.id)}
                                className="rounded-full gap-2"
                            >
                                <GraduationCap className="h-4 w-4" />
                                {cls.name}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            <section className="w-full space-y-6">
                <h2 className="text-lg font-semibold">Tests ({filteredTests.length})</h2>
                    {filteredTests.length === 0 ? (
                        <div className="text-center py-10 opacity-60">No tests found for this selection.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredTests.map(test => {
                                const testId = test.id;
                                const isRendered = isItemRendered(testId);

                                if (!isRendered) {
                                    return (
                                        <div key={testId} ref={(el) => registerSkeleton(testId, el)}>
                                            <TestCardSkeleton />
                                        </div>
                                    );
                                }

                                return (
                                    <div key={testId} className="animate-in fade-in duration-500">
                                        <TestCard
                                            test={test}
                                            user={null}
                                            categoryIds={test.categories?.map((tc: any) => tc.category_id || tc.id) || []}
                                            allCategories={categories}
                                        />
                                    </div>
                                );
                            })}

                            {/* Progress indicator */}
                            {!isComplete && filteredTests.length > 0 && (
                                <div className="col-span-full py-4 text-center">
                                    <span className="text-sm text-muted-foreground">
                                        {renderedCount} of {totalCount} tests loaded
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
            </section>
        </div>
    );
}
