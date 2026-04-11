import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCombinedSessionById } from '@/lib/combinedSessionsApi';
import { fetchTestById } from '@/lib/testsApi';
import { Button } from '@/components/ui/button';
import { Loader2, Clock, BookOpen, Trophy, Coffee, ArrowRight, Layers, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function CombinedIntroPage() {
    const { combinedId } = useParams<{ combinedId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadProgress, setLoadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(false);

    useEffect(() => {
        if (!combinedId) return;
        setLoading(true);

        const interval = setInterval(() => {
            setLoadProgress(p => Math.min(90, p + Math.random() * 8 + 2));
        }, 300);

        async function load() {
            try {
                const { data, error } = await fetchCombinedSessionById(combinedId);
                if (error || !data) {
                    setError('Combined session not found.');
                    setLoading(false);
                    return;
                }

                let sessionData = { ...data };
                
                // Self-healing: if test1/test2 details are missing, fetch them
                if (!sessionData.test1 && sessionData.test1_id) {
                    const res = await fetchTestById(sessionData.test1_id).catch(() => ({ data: null }));
                    if (res.data) sessionData.test1 = res.data;
                }
                if (!sessionData.test2 && sessionData.test2_id) {
                    const res = await fetchTestById(sessionData.test2_id).catch(() => ({ data: null }));
                    if (res.data) sessionData.test2 = res.data;
                }

                setSession(sessionData);
                setLoadProgress(100);
            } catch (err) {
                console.error('Failed to load combined session:', err);
                setError('Failed to load session details.');
            } finally {
                setLoading(false);
                clearInterval(interval);
            }
        }

        load();

        return () => clearInterval(interval);
    }, [combinedId]);

    const handleStartCombined = useCallback(() => {
        if (!session || !user) {
            if (!user) toast.error('Please sign in to start a combined session.');
            return;
        }

        // Store combined session context in sessionStorage
        sessionStorage.setItem(`combined_active_${session.id}`, JSON.stringify({
            combinedSessionId: session.id,
            test1Id: session.test1_id,
            test2Id: session.test2_id,
            paper1Label: session.paper1_label,
            paper2Label: session.paper2_label,
            sessionTitle: session.title,
            breakDuration: session.break_duration_minutes,
        }));

        // Navigate to Paper 1 with combined mode context
        navigate(`/live/${session.test1_id}`, {
            state: {
                combinedMode: true,
                combinedSessionId: session.id,
                paper: 1,
                paper1Label: session.paper1_label,
                paper2Label: session.paper2_label,
                sessionTitle: session.title,
            }
        });
    }, [session, user, navigate]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50 dark:bg-slate-950 p-6">
                <div className="w-full max-w-sm space-y-8 animate-in fade-in duration-500">
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl mb-2">
                            <Layers className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Loading Combined Session</h2>
                    </div>
                    <Progress value={loadProgress} className="h-2 bg-indigo-100 dark:bg-indigo-950" />
                </div>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh]">
                <h2 className="text-xl font-bold text-red-600 mb-4">{error || 'Session not found'}</h2>
                <Button onClick={() => navigate('/')}>Go Home</Button>
            </div>
        );
    }

    const t1 = session.test1;
    const t2 = session.test2;

    const getQCount = (test: any) => {
        if (!test) return 0;
        if (typeof test.total_questions === 'number') return test.total_questions;
        if (test.enable_section_mode && test.sections) return test.sections.reduce((a: number, s: any) => a + (s.questions?.length || 0), 0);
        return test.questions?.length || 0;
    };

    const p1Qs = getQCount(t1);
    const p2Qs = getQCount(t2);
    const totalDuration = (t1?.duration || 0) + (t2?.duration || 0) + session.break_duration_minutes;

    const getMaxMarks = (test: any) => {
        if (!test) return 0;
        if (typeof test.computed_max_marks === 'number') return test.computed_max_marks;
        if (test.computed_max_marks?.total_max_marks !== undefined) return test.computed_max_marks.total_max_marks;
        
        const marksPerQ = parseFloat(String(test.marks_per_question || 4)) || 4;
        const totalQs = getQCount(test);
        
        // If we have sections with marks, use that
        if (test.enable_section_mode && test.sections) {
            return test.sections.reduce((acc: number, s: any) => {
                const sectionMarks = parseFloat(String(s.marks_per_question || marksPerQ));
                return acc + (s.questions?.length || 0) * sectionMarks;
            }, 0);
        }
        
        return totalQs * marksPerQ;
    };

    const p1Marks = getMaxMarks(t1);
    const p2Marks = getMaxMarks(t2);

    return (
        <div className="container mx-auto max-w-3xl py-6 px-4 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="relative rounded-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_70%)]" />
                <div className="relative p-8 text-white">
                    <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-white/20 text-white border-0 text-[10px] font-black tracking-widest uppercase">
                            <Layers className="w-3 h-3 mr-1" /> Combined Session
                        </Badge>
                    </div>
                    <h1 className="text-3xl font-black leading-tight mb-2">{session.title}</h1>
                    {session.description && (
                        <p className="text-white/80 text-sm">{session.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-5 text-sm">
                        <span className="flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full font-semibold">
                            <Clock className="w-4 h-4" /> {totalDuration}m total
                        </span>
                        <span className="flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full font-semibold">
                            <BookOpen className="w-4 h-4" /> {p1Qs + p2Qs} Questions
                        </span>
                        <span className="flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full font-semibold">
                            <Trophy className="w-4 h-4" /> {p1Marks + p2Marks} Marks
                        </span>
                    </div>
                </div>
            </div>

            {/* Session Flow */}
            <div className="flex items-stretch gap-2">
                {/* Paper 1 */}
                <div className="flex-1 rounded-2xl border border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-black">I</div>
                        <div>
                            <span className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-wider">{session.paper1_label}</span>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-1">{t1?.title || 'Paper I'}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-center p-2 bg-white/60 dark:bg-slate-800/40 rounded-lg">
                            <div className="font-black text-slate-800 dark:text-white text-base">{p1Qs}</div>
                            <div className="text-slate-500 text-[10px] uppercase font-bold">Questions</div>
                        </div>
                        <div className="text-center p-2 bg-white/60 dark:bg-slate-800/40 rounded-lg">
                            <div className="font-black text-slate-800 dark:text-white text-base">{t1?.duration || 0}m</div>
                            <div className="text-slate-500 text-[10px] uppercase font-bold">Duration</div>
                        </div>
                        <div className="text-center p-2 bg-white/60 dark:bg-slate-800/40 rounded-lg col-span-2">
                            <div className="font-black text-emerald-600 text-base">{p1Marks}</div>
                            <div className="text-slate-500 text-[10px] uppercase font-bold">Max Marks</div>
                        </div>
                    </div>
                </div>

                {/* Break Arrow */}
                <div className="flex flex-col items-center justify-center gap-1 px-1 min-w-[64px]">
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                    <div className="flex flex-col items-center bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-2 py-2 text-center">
                        <Coffee className="w-4 h-4 text-amber-500 mb-1" />
                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">{session.break_duration_minutes}</span>
                        <span className="text-[8px] text-amber-500 uppercase font-bold">min</span>
                        <span className="text-[8px] text-amber-500 uppercase font-bold">break</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                </div>

                {/* Paper 2 */}
                <div className="flex-1 rounded-2xl border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-black">II</div>
                        <div>
                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">{session.paper2_label}</span>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-1">{t2?.title || 'Paper II'}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-center p-2 bg-white/60 dark:bg-slate-800/40 rounded-lg">
                            <div className="font-black text-slate-800 dark:text-white text-base">{p2Qs}</div>
                            <div className="text-slate-500 text-[10px] uppercase font-bold">Questions</div>
                        </div>
                        <div className="text-center p-2 bg-white/60 dark:bg-slate-800/40 rounded-lg">
                            <div className="font-black text-slate-800 dark:text-white text-base">{t2?.duration || 0}m</div>
                            <div className="text-slate-500 text-[10px] uppercase font-bold">Duration</div>
                        </div>
                        <div className="text-center p-2 bg-white/60 dark:bg-slate-800/40 rounded-lg col-span-2">
                            <div className="font-black text-emerald-600 text-base">{p2Marks}</div>
                            <div className="text-slate-500 text-[10px] uppercase font-bold">Max Marks</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Instructions */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <h3 className="font-black text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Important Instructions
                </h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /><span><strong>Paper I</strong> runs first ({t1?.duration || 0} minutes). Submit when done.</span></li>
                    <li className="flex items-start gap-2"><Coffee className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" /><span>A <strong>{session.break_duration_minutes}-minute break</strong> follows. Relax, hydrate, stretch.</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /><span><strong>Paper II</strong> starts after the break ({t2?.duration || 0} minutes).</span></li>
                    <li className="flex items-start gap-2"><Trophy className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" /><span><strong>Results are shown only after both papers</strong> are completed.</span></li>
                </ul>
            </div>

            {/* Confirmation and Start */}
            <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 border rounded-xl bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <input
                        type="checkbox"
                        className="mt-0.5 w-4 h-4 rounded border-slate-300"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200 leading-snug">
                        I understand that results will only be shown after both papers are completed. I am ready to begin.
                    </span>
                </label>

                <Button
                    size="lg"
                    className="w-full h-14 text-lg font-black bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 shadow-xl shadow-indigo-200/50 dark:shadow-indigo-900/40 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none"
                    disabled={!confirmed || !user}
                    onClick={handleStartCombined}
                >
                    {!user ? (
                        'Sign in to start'
                    ) : (
                        <>
                            <Layers className="w-5 h-5 mr-2" />
                            Begin — Start {session.paper1_label}
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
