import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Coffee, ArrowRight, CheckCircle, Flame, Droplets, Zap, Brain, Wind, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const TIPS = [
    { icon: Droplets, text: "Hydrate! Drink a glass of water.", color: "text-blue-400" },
    { icon: Wind, text: "Take 5 deep breaths — it calms nerves.", color: "text-teal-400" },
    { icon: Flame, text: "You're halfway there. Keep going!", color: "text-orange-400" },
    { icon: Brain, text: "Quick review your rough work if allowed.", color: "text-violet-400" },
    { icon: Zap, text: "Stand up and stretch for 2 minutes.", color: "text-yellow-400" },
];

export default function CombinedBreakScreen() {
    const { combinedId } = useParams<{ combinedId: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const locationState = location.state as {
        paper1Answers?: any;
        paper1Score?: number;
        paper1TotalMarks?: number;
        paper1TestId?: string;
        paper1TestTitle?: string;
        paper1Test?: any;
        paper2TestId?: string;
        sessionTitle?: string;
        paper2Label?: string;
        breakDuration?: number;
    } | null;

    // Persist Paper 1 data in sessionStorage immediately
    useEffect(() => {
        if (combinedId && locationState?.paper1Answers !== undefined) {
            const p1Data = {
                test_id: locationState.paper1TestId,
                answers: locationState.paper1Answers,
                score: locationState.paper1Score ?? 0,
                total_marks: locationState.paper1TotalMarks ?? 0,
                test_title: locationState.paper1TestTitle || 'Paper I',
                test: locationState.paper1Test,
            };
            sessionStorage.setItem(`combined_p1_${combinedId}`, JSON.stringify(p1Data));
        }
    }, [combinedId]);

    const breakMinutes = locationState?.breakDuration ?? 30;
    const [secondsLeft, setSecondsLeft] = useState(breakMinutes * 60);
    const [tipIndex, setTipIndex] = useState(0);
    const [canStart, setCanStart] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const sessionActiveKey = combinedId ? `combined_active_${combinedId}` : null;
    let sessionCtx: any = null;
    try {
        if (sessionActiveKey) sessionCtx = JSON.parse(sessionStorage.getItem(sessionActiveKey) || 'null');
    } catch {}

    const paper2TestId = locationState?.paper2TestId || sessionCtx?.test2Id;

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    // Don't clear interval, just stay at 0 so if they add time it resumes
                    setCanStart(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    const handleAddExtraTime = () => {
        setSecondsLeft(prev => prev + 300); // 5 minutes
        toast.success("Added 5 minutes to your break!");
    };

    // Immediately allow manual start (can start Paper 2 whenever they want)
    useEffect(() => {
        setCanStart(true);
    }, []);

    useEffect(() => {
        const t = setInterval(() => setTipIndex(i => (i + 1) % TIPS.length), 8000);
        return () => clearInterval(t);
    }, []);

    const [showSuccessBanner, setShowSuccessBanner] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setShowSuccessBanner(false), 7000);
        return () => clearTimeout(timer);
    }, []);

    const handleStartPaper2 = useCallback(() => {
        if (!paper2TestId) return;

        navigate(`/live/${paper2TestId}`, {
            state: {
                combinedMode: true,
                combinedSessionId: combinedId,
                paper: 2,
                paper1Label: sessionCtx?.paper1Label || 'Paper I',
                paper2Label: locationState?.paper2Label || sessionCtx?.paper2Label || 'Paper II',
                sessionTitle: locationState?.sessionTitle || sessionCtx?.sessionTitle || 'Combined Test',
            }
        });
    }, [paper2TestId, combinedId, navigate, locationState, sessionCtx]);

    const totalSeconds = breakMinutes * 60;
    const elapsed = totalSeconds - secondsLeft;
    const progressPct = Math.min(100, (elapsed / totalSeconds) * 100);

    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;

    const CurrentTip = TIPS[tipIndex].icon;
    const tipColor = TIPS[tipIndex].color;

    return (
        <div className="min-h-[100dvh] w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center py-12 px-4 md:p-6 relative overflow-x-hidden overflow-y-auto">
            {/* Animated background orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-700/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-700/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-indigo-700/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />

            {/* Pop-down Success Banner */}
            <AnimatePresence>
                {showSuccessBanner && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="fixed top-6 left-0 right-0 flex justify-center z-[100] px-4 md:px-0"
                    >
                        <div className="w-full max-w-lg bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 rounded-xl overflow-hidden shadow-2xl shadow-emerald-500/20 mx-4 md:mx-0">
                            <div className="px-6 py-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/40">
                                    <CheckCircle className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-emerald-100 font-bold text-sm tracking-tight">
                                        {sessionCtx?.paper1Label || 'Paper I'} Submitted Successfully
                                    </p>
                                    <p className="text-emerald-300/50 text-[10px] font-black uppercase tracking-widest mt-0.5">
                                        Session Progress Saved
                                    </p>
                                </div>
                            </div>
                            {/* Decreasing line */}
                            <motion.div 
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 7, ease: "linear" }}
                                className="h-1 bg-emerald-500"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative z-10 w-full max-w-lg text-center space-y-8">
                {/* Break Heading */}
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Coffee className="w-12 h-12 text-amber-400 animate-bounce" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
                        Take a Breath.
                    </h1>
                    <p className="text-indigo-300 text-lg font-medium">
                        {sessionCtx?.paper2Label || 'Paper II'} begins when you're ready.
                    </p>
                </div>

                {/* Countdown */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 space-y-4 animate-in fade-in duration-700 delay-300">
                    <p className="text-white/60 text-xs font-black uppercase tracking-widest">Break Time Remaining</p>
                    <div className="flex items-center justify-center gap-2">
                        <div className="flex flex-col items-center bg-white/10 rounded-2xl px-6 py-4 min-w-[80px]">
                            <span className="text-5xl font-black text-white tabular-nums">{String(mins).padStart(2, '0')}</span>
                            <span className="text-xs text-white/50 uppercase font-bold mt-1">min</span>
                        </div>
                        <span className="text-4xl font-black text-white/40 mb-1">:</span>
                        <div className="flex flex-col items-center bg-white/10 rounded-2xl px-6 py-4 min-w-[80px]">
                            <span className="text-5xl font-black text-white tabular-nums">{String(secs).padStart(2, '0')}</span>
                            <span className="text-xs text-white/50 uppercase font-bold mt-1">sec</span>
                        </div>
                    </div>

                    <Progress
                        value={progressPct}
                        className="h-2 bg-white/10"
                    />

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button
                            variant="outline"
                            className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 py-6 rounded-2xl gap-2 group"
                            onClick={handleAddExtraTime}
                        >
                            <Plus className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                            Add 5 Minutes
                        </Button>
                        
                        <Button
                            variant="outline"
                            className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 py-6 rounded-2xl gap-2 group"
                            onClick={handleStartPaper2}
                        >
                            <Zap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                            Skip Break
                        </Button>
                    </div>

                    <p className="text-white/40 text-[10px] font-medium italic">
                        Feeling refreshed? You can skip the break or add more time if needed.
                    </p>
                </div>

                {/* Rotating tip */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 flex items-center gap-4 animate-in fade-in duration-700 delay-500">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <CurrentTip className={`w-5 h-5 ${tipColor}`} />
                    </div>
                    <p className="text-white/80 text-sm font-medium text-left">{TIPS[tipIndex].text}</p>
                </div>

                {/* Important Notice */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-3 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <p className="text-amber-300/90 text-sm font-medium text-left">
                        <strong>Combined results</strong> will be shown after Paper II is complete.
                    </p>
                </div>

                {/* Start Paper 2 CTA */}
                <Button
                    size="lg"
                    className="w-full h-14 text-lg font-black bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white border-0 shadow-2xl shadow-indigo-500/30 transition-all hover:scale-[1.02] disabled:opacity-40"
                    onClick={handleStartPaper2}
                    disabled={!canStart || !paper2TestId}
                >
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Start {sessionCtx?.paper2Label || 'Paper II'} Now
                </Button>

                <p className="text-white/30 text-xs">Results are locked until both papers are complete</p>
            </div>
        </div>
    );
}
