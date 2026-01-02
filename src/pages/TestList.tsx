import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchTests, Test, toggleTestLike, getTestLikeCount, getTestLikeStatus, fetchTestsByUserId } from '@/lib/testsApi';
import { BookOpen, Clock, ArrowRight, History, Loader2, Heart, Search, Share2, ChevronRight, ChevronLeft, RefreshCw, Settings, Edit, Tag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import supabase from '@/lib/supabaseClient';
import YouTubeGenerator from '@/components/YouTubeGenerator';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

import TestLikeButton from '@/components/TestLikeButton';
import TestSettingsPanel from '@/components/TestSettingsPanel';

// Renamed and Updated Component
function TestCardCategoryList({ categoryIds, allCategories, customCategory }: { categoryIds: string[] | undefined, allCategories: any[], customCategory?: string }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showRightArrow, setShowRightArrow] = useState(false);
    const [showLeftArrow, setShowLeftArrow] = useState(false);

    // Filter valid categories
    const categories = (categoryIds || []).map(id => allCategories.find(s => s.id === id)).filter(Boolean);

    useEffect(() => {
        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [categories, customCategory]);

    const checkOverflow = () => {
        if (scrollRef.current) {
            const { scrollWidth, clientWidth, scrollLeft } = scrollRef.current;
            setShowRightArrow(scrollWidth > clientWidth && Math.ceil(scrollLeft + clientWidth) < scrollWidth);
            setShowLeftArrow(scrollLeft > 0);
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const amount = 100;
            scrollRef.current.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' });
            setTimeout(checkOverflow, 300); // Check after scroll animation
        }
    };

    if (categories.length === 0) return null;

    return (
        <div className="flex-1 min-w-0 relative group flex items-center justify-end">
            {/* Left Fade/Arrow */}
            {showLeftArrow && (
                <div className="absolute left-0 z-10 h-full flex items-center bg-gradient-to-r from-white to-transparent pr-2">
                    <button onClick={(e) => { e.stopPropagation(); scroll('left'); }} className="h-5 w-5 flex items-center justify-center hover:text-primary transition-colors">
                        <ChevronLeft className="h-4 w-4 text-slate-500" />
                    </button>
                </div>
            )}

            <div
                ref={scrollRef}
                onScroll={checkOverflow}
                className="flex items-center gap-1 overflow-x-auto scrollbar-hide max-w-full px-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {categories.map((cat: any) => (
                    <span key={cat.id} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 whitespace-nowrap shrink-0">
                        {cat.name}
                    </span>
                ))}
                {customCategory && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap shrink-0">
                        {customCategory}
                    </span>
                )}
            </div>

            {/* Right Arrow */}
            {showRightArrow && (
                <div className="absolute right-0 z-10 h-full flex items-center bg-gradient-to-l from-white to-transparent pl-2">
                    <button onClick={(e) => { e.stopPropagation(); scroll('right'); }} className="h-5 w-5 flex items-center justify-center hover:text-primary transition-colors">
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                    </button>
                </div>
            )}
        </div>
    );
}

export default function TestList() {
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth();

    // Category State (Refactored from Sections)
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [testCategoryMap, setTestCategoryMap] = useState<Record<string, string[]>>({});

    // Tag Filter
    const [searchQuery, setSearchQuery] = useState("");

    const [userTests, setUserTests] = useState<Test[]>([]);
    const [configuringTest, setConfiguringTest] = useState<any>(null);

    // Dynamic Placeholder
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const placeholders = ["Search by Title...", "Search by Tag...", "Search by Category..."];

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);

            // 1. Fetch Tests
            const { data: testsData, error: testsError } = await fetchTests();
            if (testsError) throw testsError;

            // 2. Fetch Categories (was Sections)
            const { data: catData, error: catError } = await supabase
                .from('categories')
                .select('*')
                .order('name');
            if (catError) console.error('Error loading categories', catError);

            // 3. Fetch Category Mappings (was test_sections)
            const { data: mapData, error: mapError } = await supabase
                .from('test_categories')
                .select('*');
            if (mapError) console.error('Error loading mappings', mapError);

            // Process Mappings
            const map: Record<string, string[]> = {};
            if (mapData) {
                mapData.forEach((m: any) => {
                    if (!map[m.test_id]) map[m.test_id] = [];
                    map[m.test_id].push(m.category_id);
                });
            }

            setTests(testsData || []);
            setCategories(catData || []);
            setTestCategoryMap(map);

        } catch (err) {
            console.error('Failed to load data', err);
        } finally {
            setLoading(false);
        }

        if (user) {
            loadUserTests();
        }
    }

    async function loadUserTests() {
        if (!user) return;
        const { data } = await fetchTestsByUserId(user.id);
        if (data) {
            const sorted = (data as any[]).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setUserTests(sorted);
        }
    }

    // Extract Unique Profiles
    const uniqueCreators = React.useMemo(() => {
        const creators = new Map();
        tests.forEach(t => {
            if (t.created_by && t.creator_name && !creators.has(t.created_by)) {
                creators.set(t.created_by, { name: t.creator_name, avatar: t.creator_avatar, id: t.created_by });
            }
        });
        return Array.from(creators.values());
    }, [tests]);

    // Filter Logic
    const matchedProfiles = searchQuery
        ? uniqueCreators.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    const filteredTests = tests.filter(test => {
        // 1. Category Filter (via URL or UI logic if added later)
        // if (selectedCategoryId && !testCategoryMap[test.id]?.includes(selectedCategoryId)) return false;

        // 2. Search Filter
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            const matchesTitle = test.title.toLowerCase().includes(lowerQuery);
            const matchesId = test.custom_id?.toLowerCase().includes(lowerQuery);
            const matchesCreator = test.creator_name?.toLowerCase().includes(lowerQuery);

            // Check Categories
            const testCatIds = testCategoryMap[test.id] || [];
            const matchesCategory = testCatIds.some(id => {
                const cat = categories.find(c => c.id === id);
                return cat?.name.toLowerCase().includes(lowerQuery);
            });

            // Check Tags
            const matchesTags = test.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));

            return matchesTitle || matchesId || matchesCreator || matchesCategory || matchesTags;
        }
        return true;
    });

    const handleShare = (e: React.MouseEvent, testId: string) => {
        e.stopPropagation();
        const url = `${window.location.origin}/test-intro/${testId}`;
        navigator.clipboard.writeText(url);
        toast.success("Test link copied to clipboard!");
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex flex-col mb-8 gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Available Tests</h1>
                        <p className="text-muted-foreground mt-2">Select a test to begin your practice</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => loadData()} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                <YouTubeGenerator onTestGenerated={loadData} />

                {/* Your Tests Section */}
                {userTests.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">Your Recent Tests</h2>
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
                                                        <span className="text-xs text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                            #{test.custom_id}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Footer Row: Profile & Categories */}
                                            <div className="flex items-center justify-between mt-1.5 gap-2 h-8">
                                                {/* Creator */}
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
                                                {/* Categories */}
                                                <TestCardCategoryList categoryIds={testCategoryMap[test.id]} allCategories={categories} customCategory={test.custom_category} />
                                            </div>
                                        </CardContent>
                                        <CardFooter className="p-3 pt-0 flex justify-between items-center gap-2">
                                            <div className="flex-none"><TestLikeButton testId={test.id} userId={user?.id} /></div>
                                            <div className="flex-1 flex gap-2">
                                                <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground px-2" onClick={() => setConfiguringTest(test)}>
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
                )}

                {/* Filters & Search Row */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border">
                    <h2 className="text-lg font-semibold text-foreground pl-2">Explore Tests</h2>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={placeholders[placeholderIndex]}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-sm bg-background"
                        />
                    </div>
                </div>
            </div>

            {/* Profiles */}
            {matchedProfiles.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 px-1">Profiles</h3>
                    <div className="flex flex-wrap gap-6">
                        {matchedProfiles.map(profile => (
                            <div key={profile.id} className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => navigate(`/creator/${profile.id}`)}>
                                <Avatar className="h-16 w-16 border-2 border-transparent group-hover:border-primary transition-all">
                                    <AvatarImage src={profile.avatar} />
                                    <AvatarFallback>{profile.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium text-center group-hover:text-primary transition-colors">{profile.name}</span>
                            </div>
                        ))}
                    </div>
                    <div className="h-px bg-border my-6" />
                </div>
            )}

            {/* All Tests Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTests.map((test) => (
                    <Card key={test.id} className="flex flex-col hover:shadow-lg transition-shadow relative overflow-hidden">
                        <div className="absolute top-2 right-2 z-10">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 hover:bg-white text-muted-foreground hover:text-primary shadow-sm" onClick={(e) => handleShare(e, test.id)}>
                                <Share2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <CardHeader className="p-3 pb-2">
                            <CardTitle className="text-lg font-bold text-red-900 md:text-xl pr-8 leading-tight">{test.title}</CardTitle>
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
                                {/* Tags Display */}
                            </div>
                            <div className="flex items-center justify-between mt-1.5 gap-2 h-8">
                                <div className="flex items-center gap-2 shrink-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full pr-2 transition-colors py-0.5" onClick={(e) => { e.stopPropagation(); navigate(`/creator/${test.created_by}`); }}>
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={test.creator_avatar} />
                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{test.creator_name ? test.creator_name.substring(0, 2).toUpperCase() : 'TC'}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px]">{test.creator_name || 'Creator'}</span>
                                </div>
                                <TestCardCategoryList categoryIds={testCategoryMap[test.id]} allCategories={categories} customCategory={test.custom_category} />
                            </div>
                        </CardContent>
                        <CardFooter className="p-3 pt-0 flex justify-between items-center gap-2">
                            <div className="flex-none"><TestLikeButton testId={test.id} userId={user?.id} /></div>
                            {user?.id === test.created_by ? (
                                <div className="flex-1 flex gap-2">
                                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground px-2" onClick={() => setConfiguringTest(test)}>
                                        <Settings className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">Manage</span>
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => navigate(`/edit-test/${test.id}`)}>
                                        <Edit className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">Edit</span>
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

            {filteredTests.length === 0 && matchedProfiles.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">{searchQuery ? "No results found." : "No tests available."}</p>
                </div>
            )}
            {configuringTest && (
                <TestSettingsPanel
                    test={configuringTest}
                    onClose={() => setConfiguringTest(null)}
                    onUpdate={loadData}
                    onViewResults={() => {
                        setConfiguringTest(null);
                        navigate('/my-tests');
                    }}
                />
            )}
        </div>
    );
}
