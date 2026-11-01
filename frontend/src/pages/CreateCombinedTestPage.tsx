import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTestsByUserId, fetchTests } from '@/lib/testsApi';
import {
    createCombinedSession,
    fetchUserCombinedSessions,
    deleteCombinedSession
} from '@/lib/combinedSessionsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
    Layers,
    ArrowLeft,
    Clock,
    FileText,
    Sparkles,
    CheckCircle2,
    Trash2,
    Link,
    ChevronRight,
    Loader2,
    ShieldCheck,
    Plus,
    Share2,
    Play
} from 'lucide-react';

export default function CreateCombinedTestPage() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();

    const [userTests, setUserTests] = useState<any[]>([]);
    const [existingSessions, setExistingSessions] = useState<any[]>([]);
    const [loadingTests, setLoadingTests] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [paper1Id, setPaper1Id] = useState('');
    const [paper2Id, setPaper2Id] = useState('');
    const [paper1Label, setPaper1Label] = useState('Paper I');
    const [paper2Label, setPaper2Label] = useState('Paper II');
    const [breakDuration, setBreakDuration] = useState(30);
    const [isPublic, setIsPublic] = useState(true);

    useEffect(() => {
        if (user?.id) {
            loadInitialData();
        }
    }, [user]);

    const loadInitialData = async () => {
        setLoadingTests(true);
        try {
            // Load user tests
            const testsRes = await fetchTestsByUserId(user!.id);
            const userOwnedTests = testsRes.data || [];
            
            // If user has no created tests yet, fall back to fetching public tests so they can experiment
            if (userOwnedTests.length === 0) {
                const publicRes = await fetchTests({ page: 1, limit: 50 });
                setUserTests(publicRes.data || []);
            } else {
                setUserTests(userOwnedTests);
            }

            // Load existing combined sessions
            const sessionsRes = await fetchUserCombinedSessions(user!.id);
            setExistingSessions(sessionsRes.data || []);
        } catch (err) {
            console.error('Failed to load combined session data:', err);
        } finally {
            setLoadingTests(false);
        }
    };

    const handleCreate = async () => {
        if (!user) {
            localStorage.setItem('auth_redirect_intent', '/create-combined-test');
            toast.error('Please sign in to create combined tests.');
            navigate('/login');
            return;
        }

        const localDesignation = typeof window !== 'undefined' ? localStorage.getItem('user_designation') : null;
        const hasDesignation = user.user_metadata?.designation || profile?.designation || localDesignation;
        if (!hasDesignation) {
            localStorage.setItem('auth_redirect_intent', '/create-combined-test');
            toast.info("Please set your designation to create combined tests.");
            navigate('/onboarding');
            return;
        }

        if (!title.trim()) {
            toast.error('Please enter a title for the combined session');
            return;
        }
        if (!paper1Id) {
            toast.error('Please select Paper I');
            return;
        }
        if (!paper2Id) {
            toast.error('Please select Paper II');
            return;
        }
        if (paper1Id === paper2Id) {
            toast.error('Paper I and Paper II must be different tests');
            return;
        }

        setSaving(true);
        try {
            const { data, error } = await createCombinedSession({
                created_by: user!.id,
                title: title.trim(),
                description: description.trim(),
                test1_id: paper1Id,
                test2_id: paper2Id,
                paper1_label: paper1Label.trim() || 'Paper I',
                paper2_label: paper2Label.trim() || 'Paper II',
                break_duration_minutes: Number(breakDuration) || 30,
                is_public: isPublic,
            });

            if (error) throw error;

            toast.success('Combined Test session created successfully!');
            // Reset form
            setTitle('');
            setDescription('');
            setPaper1Id('');
            setPaper2Id('');
            setPaper1Label('Paper I');
            setPaper2Label('Paper II');
            setBreakDuration(30);

            // Reload combined sessions list
            const sessionsRes = await fetchUserCombinedSessions(user!.id);
            setExistingSessions(sessionsRes.data || []);
        } catch (err: any) {
            toast.error(err.message || 'Failed to create combined test');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (sessionId: string, sessionTitle: string) => {
        if (!confirm(`Are you sure you want to delete "${sessionTitle}"?`)) return;
        try {
            const { error } = await deleteCombinedSession(sessionId);
            if (error) throw error;
            toast.success('Combined test session deleted');
            setExistingSessions(prev => prev.filter(s => s.id !== sessionId));
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete session');
        }
    };

    const selectedP1 = userTests.find(t => t.id === paper1Id);
    const selectedP2 = userTests.find(t => t.id === paper2Id);

    return (
        <div className="min-h-screen bg-slate-50/60 pb-16 font-sans">
            {/* iOS Glass Header Bar */}
            <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/75 border-b border-slate-200/80 px-4 py-3 shadow-xs">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-full transition-all cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Dashboard</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                            <Layers className="w-4 h-4" />
                        </div>
                        <h1 className="text-sm font-bold text-slate-900 tracking-tight">Create Combined Test</h1>
                    </div>

                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 rounded-full text-[10px] px-2.5">
                        iOS Studio
                    </Badge>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
                {/* Hero iOS Card */}
                <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-900/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-indigo-200 text-xs font-medium mb-3">
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            Multi-Paper Exam Builder
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Combine Paper I & II into a Single Session
                        </h2>
                        <p className="text-xs sm:text-sm text-indigo-100/80 mt-2 leading-relaxed">
                            Seamlessly link two existing tests from your library with a scheduled inter-paper break duration. Perfect for UPSC, JEE, and competitive exam simulation.
                        </p>
                    </div>
                </div>

                {/* Main Configurator - iOS Glass Container */}
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <span>1. Basic Information</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Name your combined exam paper package</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                                Combined Exam Title <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. UPSC CSE Mains Mock 2026 (GS Paper 1 & CSAT)"
                                className="h-11 rounded-2xl border-slate-200 text-sm focus-visible:ring-indigo-500 bg-slate-50/50"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                                Description / Instructions (Optional)
                            </label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Write clear instructions for students taking this combined two-paper exam..."
                                className="rounded-2xl border-slate-200 text-sm focus-visible:ring-indigo-500 bg-slate-50/50 min-h-[80px]"
                            />
                        </div>
                    </div>

                    {/* Paper Selection Cards */}
                    <div className="border-t border-slate-100 pt-6">
                        <div className="border-b border-slate-100 pb-4 mb-4">
                            <h3 className="text-base font-bold text-slate-900 tracking-tight">
                                2. Select Papers & Break Setup
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">Choose two tests from your workspace library</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Paper I */}
                            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                                        FIRST EXAM
                                    </span>
                                    <Input
                                        value={paper1Label}
                                        onChange={(e) => setPaper1Label(e.target.value)}
                                        className="h-7 w-28 text-xs font-semibold text-right border-slate-200 rounded-xl bg-white"
                                        placeholder="Paper I"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Select Paper I</label>
                                    <select
                                        value={paper1Id}
                                        onChange={(e) => setPaper1Id(e.target.value)}
                                        className="w-full h-10 px-3 text-xs font-medium bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">-- Choose Paper I Test --</option>
                                        {userTests.map((t) => (
                                            <option key={t.id} value={t.id} disabled={t.id === paper2Id}>
                                                {t.title} ({t.total_questions || t.questions?.length || 0} Qs · {t.duration || 0}m)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedP1 && (
                                    <div className="bg-white rounded-xl p-3 border border-slate-200/60 text-xs space-y-1">
                                        <p className="font-bold text-slate-900 line-clamp-1">{selectedP1.title}</p>
                                        <p className="text-[11px] text-slate-500">
                                            {selectedP1.total_questions || selectedP1.questions?.length || 0} Questions · Duration: {selectedP1.duration || 0} mins
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Paper II */}
                            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-full">
                                        SECOND EXAM
                                    </span>
                                    <Input
                                        value={paper2Label}
                                        onChange={(e) => setPaper2Label(e.target.value)}
                                        className="h-7 w-28 text-xs font-semibold text-right border-slate-200 rounded-xl bg-white"
                                        placeholder="Paper II"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Select Paper II</label>
                                    <select
                                        value={paper2Id}
                                        onChange={(e) => setPaper2Id(e.target.value)}
                                        className="w-full h-10 px-3 text-xs font-medium bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">-- Choose Paper II Test --</option>
                                        {userTests.map((t) => (
                                            <option key={t.id} value={t.id} disabled={t.id === paper1Id}>
                                                {t.title} ({t.total_questions || t.questions?.length || 0} Qs · {t.duration || 0}m)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedP2 && (
                                    <div className="bg-white rounded-xl p-3 border border-slate-200/60 text-xs space-y-1">
                                        <p className="font-bold text-slate-900 line-clamp-1">{selectedP2.title}</p>
                                        <p className="text-[11px] text-slate-500">
                                            {selectedP2.total_questions || selectedP2.questions?.length || 0} Questions · Duration: {selectedP2.duration || 0} mins
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Break Settings & Visibility */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-200/60 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                        <Clock className="w-4.5 h-4.5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">Break Duration</p>
                                        <p className="text-[11px] text-slate-500">Time between Paper I and Paper II</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Input
                                        type="number"
                                        min="0"
                                        max="180"
                                        value={breakDuration}
                                        onChange={(e) => setBreakDuration(Number(e.target.value))}
                                        className="w-16 h-9 text-xs font-bold text-center border-slate-200 rounded-xl bg-white"
                                    />
                                    <span className="text-xs font-semibold text-slate-600">mins</span>
                                </div>
                            </div>

                            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                                        <ShieldCheck className="w-4.5 h-4.5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">Public Availability</p>
                                        <p className="text-[11px] text-slate-500">Allow candidates to access via link</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsPublic(!isPublic)}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        isPublic ? 'bg-indigo-600' : 'bg-slate-300'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                            isPublic ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/dashboard')}
                            className="h-11 px-6 rounded-2xl text-xs font-semibold text-slate-600 border-slate-200 cursor-pointer"
                        >
                            Cancel
                        </Button>

                        <Button
                            type="button"
                            disabled={saving || !title.trim() || !paper1Id || !paper2Id}
                            onClick={handleCreate}
                            className="h-11 px-8 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Creating Package...</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    <span>Publish Combined Session</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Existing Combined Sessions List */}
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 tracking-tight">Your Combined Test Sessions</h3>
                            <p className="text-xs text-slate-500">Manage existing multi-paper exam packages</p>
                        </div>
                        <Badge variant="outline" className="rounded-full text-xs font-mono">
                            {existingSessions.length} Total
                        </Badge>
                    </div>

                    {loadingTests ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                        </div>
                    ) : existingSessions.length === 0 ? (
                        <div className="text-center py-8 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-slate-700">No combined sessions created yet</p>
                            <p className="text-xs text-slate-400 mt-0.5">Use the builder above to package two tests into a combined session.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {existingSessions.map((sess) => (
                                <div
                                    key={sess.id}
                                    className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 transition-all flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200">
                                                {sess.break_duration_minutes || 30}m Break
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                ID: {sess.id.slice(0, 8)}
                                            </span>
                                        </div>

                                        <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{sess.title}</h4>
                                        {sess.description && (
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{sess.description}</p>
                                        )}

                                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] bg-white rounded-xl p-2 border border-slate-200/60">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{sess.paper1_label || 'Paper I'}</p>
                                                <p className="font-semibold text-slate-800 line-clamp-1">{sess.test1?.title || 'Test #1'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{sess.paper2_label || 'Paper II'}</p>
                                                <p className="font-semibold text-slate-800 line-clamp-1">{sess.test2?.title || 'Test #2'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => navigate(`/combined-intro/${sess.id}`)}
                                            className="h-8 px-3 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold cursor-pointer flex-1"
                                        >
                                            <Play className="w-3.5 h-3.5 mr-1" /> Start Session
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/combined-intro/${sess.id}`);
                                                toast.success('Combined Session URL copied to clipboard!');
                                            }}
                                            className="h-8 w-8 p-0 text-slate-500 border-slate-200 cursor-pointer"
                                            title="Copy Share Link"
                                        >
                                            <Share2 className="w-3.5 h-3.5" />
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDelete(sess.id, sess.title)}
                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 border-red-200 hover:bg-red-50 cursor-pointer"
                                            title="Delete Session"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
