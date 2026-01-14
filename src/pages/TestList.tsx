import React, { Suspense, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import HomeHero from '@/components/home/HomeHero';
import ExploreFilters from '@/components/home/ExploreFilters';

// Lazy Load Components
const FeaturedTests = React.lazy(() => import('@/components/home/FeaturedTests'));
const TestFeed = React.lazy(() => import('@/components/home/TestFeed'));
const UserRecentTests = React.lazy(() => import('@/components/home/UserRecentTests'));
const SearchResults = React.lazy(() => import('@/components/home/SearchResults'));

// Heavy Widgets
const YouTubeGenerator = React.lazy(() => import('@/components/YouTubeGenerator'));
const TestSettingsPanel = React.lazy(() => import('@/components/TestSettingsPanel'));
const CategoryFolderCards = React.lazy(() => import('@/components/home/CategoryFolderCards'));

// Skeletons
function SectionSkeleton() {
    return <div className="h-64 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg mb-8"></div>;
}

export default function TestList() {
    const [searchQuery, setSearchQuery] = useState("");
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const placeholders = ["Search by Title...", "Search by Tag...", "Search by Category..."];
    const [configuringTest, setConfiguringTest] = useState<any>(null);
    const [loading, setLoading] = useState(false); // Global loading for refresh
    const { user } = useAuth();
    const navigate = useNavigate();

    // Placeholder Rotation
    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const onManageTest = (test: any) => {
        setConfiguringTest(test);
    };

    const handleRefresh = () => {
        setLoading(true);
        window.location.reload();
    };

    return (
        <div className="container mx-auto py-6">
            <div className="flex flex-col mb-8 gap-4">
                {/* 1. Header */}
                <HomeHero
                    isLoading={loading}
                    onRefresh={handleRefresh}
                />

                {/* 2. YouTube Generator (Lazy) */}
                <Suspense fallback={<div className="h-32 w-full bg-slate-50 animate-pulse rounded-lg"></div>}>
                    <YouTubeGenerator onTestGenerated={() => { }} />
                </Suspense>

                {/* 3. Your Recent Tests (Lazy) - Only when NOT searching */}
                {user && !searchQuery && (
                    <Suspense fallback={<SectionSkeleton />}>
                        <UserRecentTests user={user} onManageTest={onManageTest} />
                    </Suspense>
                )}

                {/* 4. Explore Tests / Search */}
                <ExploreFilters
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    placeholders={placeholders}
                    placeholderIndex={placeholderIndex}
                />
            </div>

            {/* SEARCH RESULTS MODE */}
            {searchQuery ? (
                <Suspense fallback={<SectionSkeleton />}>
                    <SearchResults
                        searchQuery={searchQuery}
                        user={user}
                        onManageTest={onManageTest}
                    />
                </Suspense>
            ) : (
                <>
                    {/* 5. Category Folders */}
                    <Suspense fallback={<SectionSkeleton />}>
                        <CategoryFolderCards />
                    </Suspense>

                    {/* 6. Featured Tests */}
                    <Suspense fallback={<SectionSkeleton />}>
                        <FeaturedTests user={user} onManageTest={onManageTest} />
                    </Suspense>

                    {/* 7. Infinite Feed */}
                    <SuspenseFallbackWrapper>
                        <TestFeed user={user} onManageTest={onManageTest} />
                    </SuspenseFallbackWrapper>
                </>
            )}

            {/* Manage Test Panel */}
            {configuringTest && (
                <Suspense fallback={null}>
                    <TestSettingsPanel
                        test={configuringTest}
                        onClose={() => setConfiguringTest(null)}
                        onUpdate={() => { }}
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
