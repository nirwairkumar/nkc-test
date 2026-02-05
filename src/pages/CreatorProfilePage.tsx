import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, BookOpen, Clock, FileText, ExternalLink, Youtube, GraduationCap, Download } from 'lucide-react';
import TestCard from '@/components/TestCard';
import { Test, fetchTests } from '@/lib/testsApi';
import { Material, fetchMaterials } from '@/lib/materialsApi';
import { ClassItem, fetchClasses } from '@/lib/classesApi';
import { fetchCategories, fetchTestCategories } from '@/lib/categoriesApi';

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
    const [materials, setMaterials] = useState<Material[]>([]);
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
            // PERFORMANCE OPTIMIZATION: Parallelize all API calls for 3-5x faster loading
            // Instead of waiting for each call sequentially, run them all at once
            const [
                profileResult,
                testsResult,
                classesResult,
                materialsResult,
                categoriesResult
            ] = await Promise.all([
                // 1. Fetch Profile
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', creatorId)
                    .single(),

                // 2. Fetch Tests (Only Public) with categories
                supabase
                    .from('tests')
                    .select('*, classes(name), test_categories(category_id)')
                    .eq('created_by', creatorId)
                    .eq('visibility', 'public'),

                // 3. Fetch Classes
                fetchClasses(creatorId!),

                // 4. Fetch Materials
                fetchMaterials(creatorId!),

                // 5. Fetch Categories
                fetchCategories()
            ]);

            // Set all data at once
            if (profileResult.data) setCreator(profileResult.data);
            setTests(testsResult.data || []);
            setClasses(classesResult.data || []);
            setMaterials(materialsResult.data || []);
            setCategories(categoriesResult.data || []);

        } catch (error) {
            console.error("Failed to load creator data", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    if (!creator) return <div className="container py-10 text-center">Creator not found</div>;

    // Filter content based on selected class
    const filteredTests = selectedClassId === 'all'
        ? tests
        : tests.filter(t => t.class_id === selectedClassId);

    const filteredMaterials = selectedClassId === 'all'
        ? materials
        : materials.filter(m => m.class_id === selectedClassId);

    const publicMaterials = filteredMaterials; // Assuming all fetched are public for now

    const files = publicMaterials.filter(m => m.type === 'file');
    const links = publicMaterials.filter(m => m.type === 'link');

    return (
        <div className="container mx-auto max-w-6xl py-8 px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start mb-10">
                <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-white shadow-lg">
                    <AvatarImage src={creator.avatar_url} />
                    <AvatarFallback className="text-4xl">{creator.full_name?.[0]}</AvatarFallback>
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
                            {creator.designation || 'Student'}
                        </Badge>
                        <Badge variant="outline" className="gap-1"><BookOpen className="h-3 w-3" /> {tests.length} Tests</Badge>
                        <Badge variant="outline" className="gap-1"><FileText className="h-3 w-3" /> {files.length} Files</Badge>
                        <Badge variant="outline" className="gap-1"><Youtube className="h-3 w-3" /> {links.length} Links</Badge>
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

            <Tabs defaultValue="tests" className="w-full">
                <TabsList className="w-full max-w-lg grid grid-cols-4 mb-8 mx-auto md:mx-0">
                    <TabsTrigger value="tests">Tests ({filteredTests.length})</TabsTrigger>
                    <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
                    <TabsTrigger value="links">Videos ({links.length})</TabsTrigger>
                    <TabsTrigger value="external">Links ({publicMaterials.filter(m => m.type === 'external').length})</TabsTrigger>
                </TabsList>

                <TabsContent value="tests" className="space-y-6">
                    {filteredTests.length === 0 ? (
                        <div className="text-center py-10 opacity-60">No tests found for this selection.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredTests.map(test => (
                                <TestCard
                                    key={test.id}
                                    test={test}
                                    user={null}
                                    categoryIds={test.test_categories?.map((tc: any) => tc.category_id) || []}
                                    allCategories={categories}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="files" className="space-y-6">
                    {files.length === 0 ? (
                        <div className="text-center py-10 opacity-60">No files found for this selection.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {files.map(mat => (
                                <Card key={mat.id} className="group hover:shadow-md transition-all">
                                    <CardContent className="p-4 flex items-start gap-4">
                                        <div className="h-12 w-12 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg flex-shrink-0">
                                            <FileText className="h-6 w-6" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold truncate pr-2">{mat.title}</h4>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <a href={mat.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-medium text-primary hover:underline">
                                                    Download File
                                                    <ExternalLink className="h-3 w-3 ml-1" />
                                                </a>
                                                {/* @ts-ignore */}
                                                {mat.classes?.name && (
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1 bg-purple-50 text-purple-700 border-purple-200">
                                                        {/* @ts-ignore */}
                                                        {mat.classes.name}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="links" className="space-y-6">
                    {links.length === 0 ? (
                        <div className="text-center py-10 opacity-60">No video links found for this selection.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {links.map(mat => (
                                <Card
                                    key={mat.id}
                                    className="group hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
                                    onClick={() => window.open(mat.url, '_blank')}
                                >
                                    <CardContent className="p-4 flex items-start gap-4">
                                        <div className="relative h-20 w-32 flex-shrink-0 bg-slate-100 rounded overflow-hidden">
                                            {mat.thumbnail_url ? (
                                                <img src={mat.thumbnail_url} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center bg-slate-100"><Youtube className="h-8 w-8 text-slate-300" /></div>
                                            )}
                                            {/* Play Icon Overlay */}
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                                                <div className="bg-white/80 p-1.5 rounded-full opacity-80 group-hover:opacity-100 transition-opacity">
                                                    <ExternalLink className="h-4 w-4 text-slate-900" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold truncate pr-2 group-hover:text-primary transition-colors">{mat.title}</h4>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {/* @ts-ignore */}
                                                {mat.classes?.name && (
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1 bg-purple-50 text-purple-700 border-purple-200">
                                                        {/* @ts-ignore */}
                                                        {mat.classes.name}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="external" className="space-y-6">
                    {publicMaterials.filter(m => m.type === 'external').length === 0 ? (
                        <div className="text-center py-10 opacity-60">No external links found for this selection.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {publicMaterials.filter(m => m.type === 'external').map(mat => (
                                <Card key={mat.id} className="group hover:shadow-md transition-all border-l-4 border-l-pink-500">
                                    <CardContent className="p-4 flex items-start gap-4">
                                        <div className="h-12 w-12 flex items-center justify-center bg-pink-100 text-pink-600 rounded-lg flex-shrink-0">
                                            <ExternalLink className="h-6 w-6" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold truncate pr-2">{mat.title}</h4>
                                            {/* @ts-ignore */}
                                            {mat.classes?.name && (
                                                <Badge variant="outline" className="text-[10px] h-5 px-1 bg-purple-50 text-purple-700 border-purple-200 mt-1 mb-1">
                                                    {/* @ts-ignore */}
                                                    {mat.classes.name}
                                                </Badge>
                                            )}
                                            <p className="text-xs text-muted-foreground truncate mb-2">{mat.url}</p>
                                            <a href={mat.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-medium text-pink-600 hover:underline">
                                                Visit Resource
                                                <ExternalLink className="h-3 w-3 ml-1" />
                                            </a>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
