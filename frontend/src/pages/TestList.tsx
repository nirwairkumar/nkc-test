import React, { Suspense, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import HomeHero from '@/components/home/HomeHero';
import ExploreFilters from '@/components/home/ExploreFilters';
import TestCard from '@/components/TestCard';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';

// Lazy Load Components
const FeaturedTests = React.lazy(() => import('@/components/home/FeaturedTests'));
const UserRecentTests = React.lazy(() => import('@/components/home/UserRecentTests'));
const SearchResults = React.lazy(() => import('@/components/home/SearchResults'));

// Heavy Widgets
const YouTubeGenerator = React.lazy(() => import('@/components/YouTubeGenerator'));
const TestSettingsPanel = React.lazy(() => import('@/components/TestSettingsPanel'));
const CategoryFolderCards = React.lazy(() => import('@/components/home/CategoryFolderCards'));
const TestLinkPaster = React.lazy(() => import('@/components/TestLinkPaster'));
const CombinedSessionsSection = React.lazy(() => import('@/components/home/CombinedSessionsSection'));

// Skeletons
function SectionSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map(i => (
                <TestCardSkeleton key={i} />
            ))}
        </div>
    );
}

export default function TestList() {
    const [searchQuery, setSearchQuery] = useState("");
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const placeholders = ["Search by Title...", "Search by Tag...", "Search by Category..."];
    const [configuringTest, setConfiguringTest] = useState<any>(null);
    const [loading, setLoading] = useState(false); // Global loading for refresh
    const [generatedTest, setGeneratedTest] = useState<any>(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    // Placeholder Rotation
    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Clear generated test after 30 seconds
    useEffect(() => {
        if (generatedTest) {
            const timer = setTimeout(() => {
                setGeneratedTest(null);
            }, 30000);
            return () => clearTimeout(timer);
        }
    }, [generatedTest]);

    const onManageTest = (test: any) => {
        setConfiguringTest(test);
    };

    const handleRefresh = () => {
        setLoading(true);
        window.location.reload();
    };

    const handleTestGenerated = (test?: any) => {
        if (test) {
            setGeneratedTest(test);
            // Optionally scroll to it?
        } else {
            // refresh or something if needed
            handleRefresh();
        }
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl animate-in fade-in duration-500">
            <SEO
                title="Explore Free Mock Tests Online - TestoZa"
                description="Find free online mock tests for JEE, NEET, GATE, UPSC, SSC, and more. Practice with real exam-like interface on TestoZa."
                keywords={["online mock tests", "practice tests free", "jee mains mock test", "neet practice questions", "gate test series"]}
            />
            
            {/* 1. Header */}
            <div className="mb-10">
                <HomeHero
                    isLoading={loading}
                    onRefresh={handleRefresh}
                />
            </div>

            {/* 2. Test Link Paster (Replaces YouTube Generator) */}
            <Suspense fallback={<div className="h-20 w-full bg-slate-100 rounded-2xl animate-pulse mb-8" />}>
                <TestLinkPaster />
            </Suspense>

            {/* 3. Your Recent Tests (Lazy) - Only when NOT searching */}
            {user && !searchQuery && (
                <Suspense fallback={<SectionSkeleton />}>
                    <UserRecentTests user={user} onManageTest={onManageTest} />
                    <div className="section-divider" />
                </Suspense>
            )}

            {/* 4. Explore Tests / Search */}
            <ExploreFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                placeholders={placeholders}
                placeholderIndex={placeholderIndex}
            />

            {/* SEARCH RESULTS MODE */}
            {searchQuery ? (
                <div className="mt-8 animate-slide-up-fade">
                    <Suspense fallback={<SectionSkeleton />}>
                        <SearchResults
                            searchQuery={searchQuery}
                            user={user}
                            onManageTest={onManageTest}
                        />
                    </Suspense>
                </div>
            ) : (
                <div className="space-y-12 md:space-y-16 mt-10">
                    {/* 5. Category Folders */}
                    <Suspense fallback={<SectionSkeleton />}>
                        <CategoryFolderCards />
                    </Suspense>
                    
                    <div className="section-divider" />

                    {/* 6b. Combined Sessions */}
                    <Suspense fallback={null}>
                        <CombinedSessionsSection user={user} />
                    </Suspense>

                    <div className="section-divider" />

                    {/* 6. Featured Tests */}
                    <Suspense fallback={<SectionSkeleton />}>
                        <FeaturedTests user={user} onManageTest={onManageTest} />
                    </Suspense>
                    
                    {/* 7. YouTube Generator */}
                    <div className="mt-20 pt-10 border-t border-slate-200 dark:border-slate-800">
                        {/* <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent inline-block">
                                Generate Tests from YouTube
                            </h3>
                            <p className="text-muted-foreground mt-1">
                                Don't see what you're looking for? Create a test instantly from any video.
                            </p>
                        </div> */}
                        <Suspense fallback={<SectionSkeleton />}>
                            <YouTubeGenerator onTestGenerated={handleTestGenerated} />
                        </Suspense>

                        {/* Temporary Generated Test Display */}
                        {generatedTest && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        New Test Generated! (Disappears in 30s)
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <TestCard
                                        test={generatedTest}
                                        onManage={onManageTest}
                                        user={user}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Manage Test Panel */}
            {configuringTest && (
                <Suspense fallback={null}>
                    <TestSettingsPanel
                        test={configuringTest}
                        onClose={() => setConfiguringTest(null)}
                        onUpdate={() => {}}
                        onViewResults={() => {
                            setConfiguringTest(null);
                            navigate('/my-tests');
                        }}
                    />
                </Suspense>
            )}
        </div>
    );
}

function SuspenseFallbackWrapper({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={<SectionSkeleton />}>
            {children}
        </Suspense>
    );
}

