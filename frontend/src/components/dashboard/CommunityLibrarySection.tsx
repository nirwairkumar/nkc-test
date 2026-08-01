import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Copy, Eye, Users, Building2, Sparkles, Flame, Clock, Heart, Loader2 } from 'lucide-react';
import { fetchTests, cloneTest } from '@/lib/testsApi';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CommunityLibrarySectionProps {
    currentUserId: string;
}

export default function CommunityLibrarySection({ currentUserId }: CommunityLibrarySectionProps) {
    const [communityTests, setCommunityTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'trending' | 'cloned' | 'newest'>('trending');
    const [cloningId, setCloningId] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadCommunityTests();
    }, [activeTab]);

    const loadCommunityTests = async () => {
        setLoading(true);
        try {
            const { data } = await fetchTests({ page: 1, limit: 6 });
            setCommunityTests(data || []);
        } catch (e) {
            console.error('Failed to load community tests:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleClone = async (testId: string, title: string) => {
        if (!currentUserId) {
            toast.error('Please login to clone tests');
            return;
        }
        setCloningId(testId);
        try {
            const { data, error } = await cloneTest(testId, currentUserId);
            if (error) throw new Error(typeof error === 'string' ? error : 'Failed to clone test');
            toast.success(`"${title}" cloned into your workspace!`);
            if (data?.id) {
                navigate(`/edit-test/${data.id}`);
            }
        } catch (err: any) {
            toast.error(err.message || 'Could not clone test');
        } finally {
            setCloningId(null);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs mb-6">
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
                        <Globe className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900 tracking-tight">Community Library & Repository</h2>
                        <p className="text-xs text-slate-400">Discover and clone top-rated test papers published by peer institutions</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl shrink-0">
                    <button
                        onClick={() => setActiveTab('trending')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                            activeTab === 'trending' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Flame className="w-3 h-3 text-amber-500" /> Trending
                    </button>
                    <button
                        onClick={() => setActiveTab('cloned')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === 'cloned' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Most Cloned
                    </button>
                    <button
                        onClick={() => setActiveTab('newest')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === 'newest' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Newest
                    </button>
                </div>
            </div>

            {/* Test Cards Grid */}
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

                        return (
                            <div
                                key={test.id}
                                className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 hover:bg-slate-50 transition-all group"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-md border border-violet-200">
                                            {test.custom_category || 'General'}
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
