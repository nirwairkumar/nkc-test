import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import HomeHero from '@/components/home/HomeHero';
import ExploreFilters from '@/components/home/ExploreFilters';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';

// Lazy Load Components
const FeaturedTests = React.lazy(() => import('@/components/home/FeaturedTests'));
const UserRecentTests = React.lazy(() => import('@/components/home/UserRecentTests'));
const SearchResults = React.lazy(() => import('@/components/home/SearchResults'));

// Heavy Widgets — all deferred until after first paint
const TestLinkPaster = React.lazy(() => import('@/components/TestLinkPaster'));
const YouTubeGenerator = React.lazy(() => import('@/components/YouTubeGenerator'));
const TestSettingsPanel = React.lazy(() => import('@/components/TestSettingsPanel'));
const CategoryFolderCards = React.lazy(() => import('@/components/home/CategoryFolderCards'));
const CombinedSessionsSection = React.lazy(() => import('@/components/home/CombinedSessionsSection'));
const SectionWiseBuilderShowcase = React.lazy(() => import('@/components/landing/SectionWiseBuilderShowcase'));
// Only loaded when a test is generated via YouTube tool (ephemeral 30s display)
const TestCard = React.lazy(() => import('@/components/TestCard'));

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
    const [configuringTest, setConfiguringTest] = useState<any>(null);
    const [loading, setLoading] = useState(false); // Global loading for refresh
    const [generatedTest, setGeneratedTest] = useState<any>(null);
    const [renderStage, setRenderStage] = useState(0);
    const { user } = useAuth();
    const navigate = useNavigate();

    // Progressive rendering stages to optimize FCP, LCP, and TBT
    useEffect(() => {
        const timer1 = setTimeout(() => setRenderStage(1), 50);
        const timer2 = setTimeout(() => setRenderStage(2), 300);
        const timer3 = setTimeout(() => setRenderStage(3), 800);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
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
        } else {
            handleRefresh();
        }
    };

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
            {renderStage >= 1 ? (
                <Suspense fallback={<div className="h-20 w-full bg-slate-100/50 rounded-2xl animate-pulse mb-8" />}>
                    <TestLinkPaster />
                </Suspense>
            ) : (
                <div className="h-20 w-full bg-slate-100/50 rounded-2xl animate-pulse mb-8" />
            )}

            {/* 3. Your Recent Tests (Lazy) - Only when NOT searching */}
            {user && !searchQuery && (
                renderStage >= 1 ? (
                    <Suspense fallback={<SectionSkeleton />}>
                        <UserRecentTests user={user} onManageTest={onManageTest} />
                        <div className="section-divider" />
                    </Suspense>
                ) : (
                    <div className="mb-8"><SectionSkeleton /></div>
                )
            )}

            {/* 4. Explore Tests / Search */}
            <ExploreFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
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
                    {renderStage >= 2 ? (
                        <Suspense fallback={<SectionSkeleton />}>
                            <CategoryFolderCards />
                        </Suspense>
                    ) : (
                        <SectionSkeleton />
                    )}
                    
                    <div className="section-divider" />

                    {/* 6b. Combined Sessions */}
                    {renderStage >= 2 ? (
                        <Suspense fallback={null}>
                            <CombinedSessionsSection user={user} />
                        </Suspense>
                    ) : null}

                    <div className="section-divider" />

                    {/* 6. Featured Tests */}
                    {renderStage >= 2 ? (
                        <Suspense fallback={<SectionSkeleton />}>
                            <FeaturedTests user={user} onManageTest={onManageTest} />
                        </Suspense>
                    ) : (
                        <SectionSkeleton />
                    )}
                    
                    {/* Advanced Section-Wise Builder Showcase */}
                     <div className="mt-16 sm:mt-24">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Create Advanced Section-Wise Tests
                            </h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                The best-in-class workflow to create highly specialized exams like JEE Advanced. With flawless support for matrices, rich equations, and diagrams.
                            </p>
                        </div>
                        {renderStage >= 3 ? (
                            <Suspense fallback={<div className="h-40 w-full animate-pulse bg-slate-100 rounded-xl" />}>
                                <SectionWiseBuilderShowcase />
                            </Suspense>
                        ) : (
                            <div className="h-40 w-full animate-pulse bg-slate-100 rounded-xl" />
                        )}
                    </div>

                    {/* 7. YouTube Generator */}
                    <div className="mt-20 pt-10 border-t border-slate-200 dark:border-slate-800">
                        {renderStage >= 3 ? (
                            <Suspense fallback={<SectionSkeleton />}>
                                <YouTubeGenerator onTestGenerated={handleTestGenerated} />
                            </Suspense>
                        ) : (
                            <SectionSkeleton />
                        )}

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
                                    <Suspense fallback={<TestCardSkeleton />}>
                                        <TestCard
                                            test={generatedTest}
                                            onManage={onManageTest}
                                            user={user}
                                        />
                                    </Suspense>
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

