import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, ArrowRight, Layers, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CombinedTestLaunchModal from './CombinedTestLaunchModal';
import { fetchTestCardSnippet } from '@/lib/testsApi';

interface CombinedTestCardProps {
    session: {
        id: string;
        title: string;
        description?: string;
        paper1_label: string;
        paper2_label: string;
        break_duration_minutes: number;
        test1_id?: string;
        test2_id?: string;
        test1?: any;
        test2?: any;
    };
    user?: any;
}

export default function CombinedTestCard({ session, user }: CombinedTestCardProps) {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);

    const [test1, setTest1] = useState<any>(session.test1 || null);
    const [test2, setTest2] = useState<any>(session.test2 || null);
    const [loading, setLoading] = useState(!session.test1 || !session.test2);

    useEffect(() => {
        let mounted = true;
        const loadSnippets = async () => {
            if (!session.test1 && session.test1_id) {
                const { data } = await fetchTestCardSnippet(session.test1_id);
                if (mounted) setTest1(data);
            }
            if (!session.test2 && session.test2_id) {
                const { data } = await fetchTestCardSnippet(session.test2_id);
                if (mounted) setTest2(data);
            }
            if (mounted) setLoading(false);
        };
        loadSnippets();
        return () => { mounted = false; };
    }, [session]);

    const totalQuestions = (test1?.questions?.length || 0) + (test2?.questions?.length || 0);
    const totalDuration = (test1?.duration || 0) + (test2?.duration || 0) + session.break_duration_minutes;

    const getQuestionCount = (test: any) => {
        if (!test) return 0;
        // total_questions is returned from backend enrichment (integer)
        if (typeof test.total_questions === 'number') return test.total_questions;
        if (test.enable_section_mode && test.sections) {
            return test.sections.reduce((acc: number, s: any) => acc + (s.questions?.length || 0), 0);
        }
        return test.questions?.length || 0;
    };

    const p1Qs = getQuestionCount(test1);
    const p2Qs = getQuestionCount(test2);

    if (loading) {
        return (
            <div className="h-[280px] w-full rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 shadow-sm animate-pulse p-5">
                <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
                <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800 rounded mb-6" />
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                </div>
                <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-md mt-4" />
            </div>
        );
    }

    return (
        <>
            <div
                className="relative group cursor-pointer select-none"
                onClick={() => setShowModal(true)}
            >
                {/* Always visible Glow layer (mimicking original hover state) */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/20 via-indigo-500/15 to-blue-500/20 opacity-100 transition-opacity duration-500 blur-xl -z-10 scale-105" />

                {/* Main Card — Permanently using 'hovered' styles */}
                <div
                    className="relative overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 transition-all duration-500 ease-out shadow-2xl shadow-indigo-200/50 dark:shadow-indigo-900/30 border-indigo-200 dark:border-indigo-800"
                >
                    {/* Top accent gradient bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500" />

                    {/* Combined badge */}
                    <div className="absolute top-3 right-3 z-10">
                        <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 text-[10px] font-black tracking-wider uppercase px-2.5 py-1 shadow-sm">
                            <Layers className="w-3 h-3 mr-1" />
                            Combined
                        </Badge>
                    </div>

                    <div className="p-5 pt-6">
                        {/* Title — Permanently highlighted */}
                        <h3 className="font-bold text-indigo-700 dark:text-indigo-300 leading-snug pr-24 mb-1 transition-colors duration-300">
                            {session.title}
                        </h3>
                        {session.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-1">{session.description}</p>
                        )}

                        {/* Stats row */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                            <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md font-medium">
                                <Clock className="w-3 h-3 text-indigo-500" />
                                {totalDuration}m total
                            </span>
                            <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md font-medium">
                                <BookOpen className="w-3 h-3 text-indigo-500" />
                                {totalQuestions} Questions
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-400 font-medium">{session.break_duration_minutes}min break</span>
                        </div>

                        {/* Paper cards — Permanently split */}
                        <div className="grid grid-cols-2 gap-3 transition-all duration-500 ease-out">
                            {/* Paper 1 Card */}
                            <div
                                className="relative rounded-xl border p-3 transition-all duration-500 ease-out overflow-hidden bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border-violet-200 dark:border-violet-800 shadow-md"
                            >
                                <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-violet-500 to-indigo-600" />
                                <div className="relative">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black bg-violet-600 text-white">
                                            I
                                        </div>
                                        <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300">
                                            {session.paper1_label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-1 mb-1">
                                        {test1?.title || 'Paper I'}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <span>{p1Qs} Qs</span>
                                        <span>•</span>
                                        <span>{test1?.duration || 0}m</span>
                                    </div>
                                </div>
                                {/* Start separately button — Permanently visible */}
                                {test1 && (
                                    <button
                                        className="mt-2 w-full text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 flex items-center justify-center gap-1 py-1 rounded-lg hover:bg-violet-100/50 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); navigate(`/test-intro/${test1.id}`); }}
                                    >
                                        Start separately <ChevronRight className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {/* Paper 2 Card */}
                            <div
                                className="relative rounded-xl border p-3 transition-all duration-500 ease-out overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800 shadow-md"
                            >
                                <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-blue-500 to-indigo-600" />
                                <div className="relative">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black bg-blue-600 text-white">
                                            II
                                        </div>
                                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                                            {session.paper2_label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-1 mb-1">
                                        {test2?.title || 'Paper II'}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <span>{p2Qs} Qs</span>
                                        <span>•</span>
                                        <span>{test2?.duration || 0}m</span>
                                    </div>
                                </div>
                                {test2 && (
                                    <button
                                        className="mt-2 w-full text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center justify-center gap-1 py-1 rounded-lg hover:bg-blue-100/50 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); navigate(`/test-intro/${test2.id}`); }}
                                    >
                                        Start separately <ChevronRight className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* CTA Button — Permanently visible */}
                        <div className="mt-4 transition-all duration-300 opacity-100 translate-y-0">
                            <Button
                                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 transition-all hover:scale-[1.02] border-0"
                                onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                            >
                                <Layers className="w-4 h-4 mr-2" />
                                Start Combined Session
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {showModal && (
                <CombinedTestLaunchModal
                    session={{ ...session, test1, test2 }}
                    open={showModal}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
}
