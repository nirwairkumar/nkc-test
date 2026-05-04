import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTests, Test } from '@/lib/testsApi';
import { fetchCategoryStats } from '@/lib/categoriesApi';
import IndependentTestCard from '@/components/IndependentTestCard';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';
import { useYouTubeStyleRender } from '@/hooks/useYouTubeStyleRender';
import { useCombinedExclusion } from '@/hooks/useCombinedExclusion';
import { Button } from '@/components/ui/button';
import {
    Search, X, Library, Loader2, ChevronDown,
    BookOpen, SlidersHorizontal, Tag, ArrowLeft,
    Sparkles
} from 'lucide-react';
import { Suspense, lazy } from 'react';
import FolderCard from '@/components/home/FolderCard';

const TestSettingsPanel = lazy(() => import('@/components/TestSettingsPanel'));

const ITEMS_PER_PAGE = 12;

export default function MoreTestsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') || '';

    const [searchInput, setSearchInput] = useState(initialQuery);
    const [activeQuery, setActiveQuery] = useState(initialQuery);
    const [tests, setTests] = useState<any[]>(
        Array.from({ length: 6 }, (_, i) => ({ id: `pending-more-${i}-${Math.random()}` }))
    );
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [matchedFolders, setMatchedFolders] = useState<any[]>([]);
    const [foldersLoading, setFoldersLoading] = useState(false);
    const [configuringTest, setConfiguringTest] = useState<any>(null);
    const [totalCount, setTotalCount] = useState<number | null>(null);

    const { isExcluded } = useCombinedExclusion();
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const {
        registerSkeleton,
        isItemRendered,
        renderedCount,
        isComplete,
    } = useYouTubeStyleRender(tests, loading || initialLoading, {
        rootMargin: '100px',
        threshold: 0.1,
    });

    // ─── Initial / Search Load ─────────────────────────────────
    const loadTests = useCallback(async (query: string, pageNum: number, append = false) => {
        if (abortRef.current) abortRef.current.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        if (!append) {
            setInitialLoading(true);
            setTests(Array.from({ length: 6 }, (_, i) => ({ id: `pending-more-${i}-${Math.random()}` })));
        } else {
            setLoading(true);
        }

        try {
            const { data, meta } = await fetchTests({
                page: pageNum,
                limit: ITEMS_PER_PAGE,
                searchQuery: query,
                signal: ctrl.signal,
                idsOnly: !query, // IDs-only when browsing; full data needed for search filtering
            });

            if (data) {
                const filtered = data.filter((t: Test) => !isExcluded(t.id));

                if (append) {
                    setTests(prev => {
                        const newItems = filtered.filter((d: Test) => !prev.find((p: any) => p.id === d.id));
                        return [...prev, ...newItems];
                    });
                } else {
                    setTests(filtered);
                    if (meta?.total !== undefined) setTotalCount(meta.total);
                }

                setHasMore(meta?.has_more ?? (data.length >= ITEMS_PER_PAGE));
                setPage(pageNum + 1);
            } else {
                if (!append) setTests([]);
                setHasMore(false);
            }
        } catch (err: any) {
            if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') return;
            if (!append) setTests([]);
            setHasMore(false);
        } finally {
            if (!append) setInitialLoading(false);
            else setLoading(false);
        }
    }, [isExcluded]);

    // ─── Category folder search ─────────────────────────────────
    const loadFolders = useCallback(async (query: string) => {
        if (!query.trim()) { setMatchedFolders([]); return; }
        setFoldersLoading(true);
        try {
            const { data: stats } = await fetchCategoryStats();
            if (stats) {
                const q = query.toLowerCase();
                const matched = stats.filter((c: any) => c.name.toLowerCase().includes(q));
                setMatchedFolders(matched.slice(0, 8));
            }
        } finally {
            setFoldersLoading(false);
        }
    }, []);

    // On mount
    useEffect(() => {
        loadTests(initialQuery, 1, false);
        if (initialQuery) loadFolders(initialQuery);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Debounced search
    const handleSearchChange = (val: string) => {
        setSearchInput(val);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            setActiveQuery(val);
            setSearchParams(val ? { q: val } : {});
            loadTests(val, 1, false);
            loadFolders(val);
        }, 380);
    };

    const clearSearch = () => {
        setSearchInput('');
        handleSearchChange('');
        inputRef.current?.focus();
    };

    const handleLoadMore = () => {
        if (!loading && hasMore) loadTests(activeQuery, page, true);
    };

    const isSearching = activeQuery.trim().length > 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617]">
            <SEO
                title="All Tests - TestoZa"
                description="Browse and search the full catalog of tests on TestoZa. Find tests by title, category, description, or tags."
            />

            {/* ── Hero / Header ──────────────────────────────── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 px-4 pt-10 pb-16">
                {/* Background blobs */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-700/20 blur-3xl" />
                    <div className="absolute top-10 right-0 h-72 w-72 rounded-full bg-purple-700/15 blur-3xl" />
                    <div className="absolute bottom-0 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-blue-700/10 blur-2xl" />
                </div>

                <div className="relative mx-auto max-w-4xl">
                    {/* Back navigation */}
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mb-6 flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
                    >
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                        Back to Dashboard
                    </button>

                    {/* Title */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30 flex-shrink-0">
                            <Library className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                                All Tests
                            </h1>
                            <p className="text-slate-400 text-sm mt-0.5">
                                {totalCount !== null ? `${totalCount.toLocaleString()} tests available` : 'Browse the full test catalog'}
                            </p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/30 via-purple-500/20 to-pink-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <div className="relative flex items-center bg-white/10 dark:bg-white/[0.07] backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl px-5 py-0 shadow-xl focus-within:border-indigo-400/60 focus-within:bg-white/15 transition-all duration-300">
                            <Search className="h-5 w-5 text-slate-400 flex-shrink-0 mr-3" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchInput}
                                onChange={e => handleSearchChange(e.target.value)}
                                placeholder="Search tests by title, category, description, tags…"
                                className="flex-1 bg-transparent py-4 text-white placeholder:text-slate-500 text-base outline-none"
                            />
                            {searchInput && (
                                <button
                                    onClick={clearSearch}
                                    className="ml-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Search hint chips */}
                    {!isSearching && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            {['Physics', 'Chemistry', 'Mathematics', 'JEE', 'NEET', 'Biology'].map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => handleSearchChange(tag)}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/10 hover:border-white/20 transition-all"
                                >
                                    <Tag className="h-3 w-3" />
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Content Area ───────────────────────────────── */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">

                {/* ── SEARCH STATE: Category Matches ── */}
                {isSearching && matchedFolders.length > 0 && (
                    <div className="mb-8 animate-in fade-in slide-in-from-top-2 duration-400">
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="h-4 w-4 text-indigo-500" />
                            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300">Matching Categories</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {matchedFolders.map(cat => (
                                <FolderCard key={cat.id} categoryName={cat.name} testCount={cat.count} />
                            ))}
                        </div>
                        <div className="h-px bg-slate-200 dark:bg-slate-800 mt-8 mb-2" />
                    </div>
                )}

                {/* ── Section heading ── */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        {isSearching ? (
                            <>
                                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                    <Search className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                        Results for "{activeQuery}"
                                    </h2>
                                    <p className="text-xs text-slate-500">Showing tests matching your search</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                    <Sparkles className="h-4 w-4 text-indigo-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">All Tests</h2>
                                    <p className="text-xs text-slate-500">Explore the full catalog of assessments</p>
                                </div>
                            </>
                        )}
                    </div>
                    {!initialLoading && tests.length > 0 && (
                        <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                            {tests.length} {tests.length === 1 ? 'test' : 'tests'}
                            {isSearching ? ' found' : ' loaded'}
                        </span>
                    )}
                </div>

                {/* ── Test Grid ── */}
                {initialLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {Array.from({ length: 6 }).map((_, i) => <TestCardSkeleton key={i} />)}
                    </div>
                ) : tests.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Search className="h-7 w-7 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            No tests found
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {isSearching
                                ? `No tests matched "${activeQuery}". Try a different search.`
                                : 'No tests available right now.'}
                        </p>
                        {isSearching && (
                            <Button variant="outline" className="mt-4" onClick={clearSearch}>
                                Clear search
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            {tests.map((test: any) => {
                                const testId = test.id;
                                const rendered = isItemRendered(testId);

                                if (!rendered) {
                                    return (
                                        <div key={testId} ref={el => registerSkeleton(testId, el)}>
                                            <TestCardSkeleton />
                                        </div>
                                    );
                                }

                                return (
                                    <IndependentTestCard
                                        key={test.id}
                                        testId={test.id}
                                        initialTitle={test.title}
                                        user={user}
                                        onManageTest={setConfiguringTest}
                                    />
                                );
                            })}

                            {/* YouTube-style in-grid progress */}
                            {!isComplete && tests.length > 0 && (
                                <div className="col-span-full py-4 text-center">
                                    <span className="text-sm text-muted-foreground">
                                        {renderedCount} of {tests.length} tests loaded
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Load More */}
                        {hasMore && !isSearching && (
                            <div className="mt-12 flex justify-center">
                                <Button
                                    variant="outline"
                                    onClick={handleLoadMore}
                                    disabled={loading}
                                    className="rounded-full px-8 py-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all font-semibold shadow-sm group"
                                >
                                    {loading ? (
                                        <Loader2 className="h-5 w-5 animate-spin mr-2 text-indigo-500" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5 mr-2 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                    )}
                                    {loading ? 'Loading…' : 'Load More Tests'}
                                </Button>
                            </div>
                        )}

                        {/* End of catalog */}
                        {!hasMore && tests.length > 0 && (
                            <div className="py-14 mt-4 text-center border-t border-dashed border-slate-200 dark:border-slate-800 relative">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-50 dark:bg-[#020617] px-4">
                                    <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto" />
                                </div>
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    {isSearching ? `All ${tests.length} results shown` : "You've reached the end of the catalog"}
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>

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
