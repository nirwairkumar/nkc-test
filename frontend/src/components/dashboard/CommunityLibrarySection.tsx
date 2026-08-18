import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Copy, Eye, Users, Building2, Sparkles, Flame, Clock, Heart, Loader2 } from 'lucide-react';
import { fetchTests, cloneTest } from '@/lib/testsApi';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const resolveExamCategory = (test: any): string => {
    // 1. Check categories array if returned by API
    if (test.categories && Array.isArray(test.categories) && test.categories.length > 0) {
        const catName = test.categories[0]?.name || test.categories[0]?.title;
        if (catName && typeof catName === 'string' && catName.trim()) return catName.trim();
    }

    // 2. Check custom_category or other explicit category fields
    const directCat = test.custom_category || test.exam_category || test.category_name || test.subject || (typeof test.category === 'string' ? test.category : '');
    if (directCat && typeof directCat === 'string' && directCat.trim() && directCat.toLowerCase() !== 'general' && directCat.toLowerCase() !== 'practice paper') {
        return directCat.trim();
    }

    // 3. Extract exam type from title / content (e.g. SSC, NEET, JEE, UPSC, GATE, Banking, etc.)
    const title = (test.title || '').toUpperCase();
    if (title.includes('SSC CGL') || title.includes('SSC-CGL')) return 'SSC CGL';
    if (title.includes('SSC')) return 'SSC EXAM';
    if (title.includes('NEET')) return 'NEET (UG)';
    if (title.includes('JEE MAIN') || title.includes('JEE-MAIN')) return 'JEE MAIN';
    if (title.includes('JEE ADVANCED') || title.includes('JEE-ADV')) return 'JEE ADV';
    if (title.includes('JEE')) return 'JEE';
    if (title.includes('UPSC') || title.includes('CIVIL SERVICES')) return 'UPSC CSE';
    if (title.includes('GATE')) return 'GATE';
    if (title.includes('CUET')) return 'CUET';
    if (title.includes('BANK') || title.includes('IBPS') || title.includes('SBI')) return 'BANKING';
    if (title.includes('SOLAR') || title.includes('PASSIVE')) return 'SOLAR & ENERGY';

    // 4. Default clean badge if unclassified
    return 'MOCK EXAM';
};

interface CommunityLibrarySectionProps {
    currentUserId?: string;
}

export default function CommunityLibrarySection({ currentUserId }: CommunityLibrarySectionProps = {}) {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [communityTests, setCommunityTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [cloningId, setCloningId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'trending' | 'cloned' | 'newest'>('trending');

    useEffect(() => {
        loadCommunityFeed();
    }, []);

    const loadCommunityFeed = async () => {
        setLoading(true);
        try {
            const { data } = await fetchTests({ page: 1, limit: 12 });
            setCommunityTests(data || []);
        } catch (err) {
            console.error("Failed to load community tests", err);
        } finally {
            setLoading(false);
        }
    };

    const handleClone = async (testId: string, testTitle?: string) => {
        const targetUserId = currentUserId || user?.id;
        if (!targetUserId) {
            toast.error("Please login to clone tests to your workspace");
            navigate('/auth');
            return;
        }

        setCloningId(testId);
        try {
            const { data, error } = await cloneTest(testId, targetUserId);
            if (error) {
                toast.error(typeof error === 'string' ? error : "Failed to clone test to your library");
                return;
            }
            toast.success(`"${testTitle || 'Test'}" cloned successfully to your workspace!`);
            navigate('/my-tests');
        } catch (err: any) {
            toast.error(err.message || "Failed to clone test");
        } finally {
            setCloningId(null);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 shrink-0">
                        <Globe className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight truncate">Community Library & Repository</h2>
                        <p className="text-[11px] sm:text-xs text-slate-400 truncate">Discover and clone top-rated test papers published by peer institutions</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl text-xs overflow-x-auto max-w-full scrollbar-hide shrink-0">
                    <button
                        onClick={() => setFilter('trending')}
                        className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                            filter === 'trending' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>Trending</span>
                    </button>
                    <button
                        onClick={() => setFilter('cloned')}
                        className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                            filter === 'cloned' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Most Cloned
                    </button>
                    <button
                        onClick={() => setFilter('newest')}
                        className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                            filter === 'newest' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Newest
                    </button>
                </div>
            </div>

            {/* Test Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-36 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : communityTests.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No public community tests available right now.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {communityTests.slice(0, 6).map((test) => {
                        const questionCount = test.total_questions || test.questions?.length || 0;
                        const isCloningThis = cloningId === test.id;
                        const displayCategory = resolveExamCategory(test);

                        return (
                            <div
                                key={test.id}
                                className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 hover:bg-slate-50 transition-all group"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-md border border-violet-200 uppercase tracking-wider">
                                            {displayCategory}
                                        </span>
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <Users className="w-3 h-3" /> By {test.creator_name || 'Verified Author'}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-violet-600 transition-colors">
                                        {test.title}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        {questionCount} Questions · {test.duration || 0} mins · Max Marks: {test.total_max_marks || 100}
                                    </p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => navigate(`/test-intro/${test.slug || test.id}`)}
                                        className="h-7 px-2.5 text-[11px] border-slate-200 text-slate-700 hover:bg-white cursor-pointer"
                                    >
                                        <Eye className="w-3 h-3 mr-1" /> Preview
                                    </Button>

                                    <Button
                                        size="sm"
                                        disabled={isCloningThis}
                                        onClick={() => handleClone(test.id, test.title)}
                                        className="h-7 px-3 text-[11px] bg-slate-900 hover:bg-slate-800 text-white cursor-pointer font-semibold flex items-center gap-1"
                                    >
                                        {isCloningThis ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Copy className="w-3 h-3" />
                                        )}
                                        <span>Clone to Workspace</span>
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
