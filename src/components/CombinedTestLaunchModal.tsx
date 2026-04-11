import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, ArrowRight, Layers, X, Coffee, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface CombinedTestLaunchModalProps {
    session: {
        id: string;
        title: string;
        paper1_label: string;
        paper2_label: string;
        break_duration_minutes: number;
        test1_id?: string;
        test2_id?: string;
        test1?: any;
        test2?: any;
    };
    open: boolean;
    onClose: () => void;
}

const PaperCard = ({
    label, number, test, color, onStart
}: {
    label: string;
    number: string;
    test?: any;
    color: 'violet' | 'blue';
    onStart: () => void;
}) => {
    const colors = {
        violet: {
            badge: 'bg-violet-600',
            title: 'text-violet-700 dark:text-violet-300',
            border: 'border-violet-200 dark:border-violet-800',
            bg: 'bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20',
            btn: 'border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-950/30',
            result: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        },
        blue: {
            badge: 'bg-blue-600',
            title: 'text-blue-700 dark:text-blue-300',
            border: 'border-blue-200 dark:border-blue-800',
            bg: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20',
            btn: 'border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/30',
            result: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        }
    }[color];

    const qCount = test?.questions?.length || (test?.sections?.reduce((a: number, s: any) => a + (s.questions?.length || 0), 0) || 0);

    return (
        <div className={`rounded-2xl border p-4 ${colors.border} ${colors.bg} flex flex-col gap-3`}>
            <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white ${colors.badge}`}>
                    {number}
                </div>
                <div>
                    <span className={`text-xs font-black uppercase tracking-wider ${colors.title}`}>{label}</span>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight line-clamp-1">
                        {test?.title || label}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{qCount} Qs</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{test?.duration || 0}m</span>
            </div>
            <div className={`text-[10px] font-bold px-2 py-1 rounded-full border w-fit ${colors.result}`}>
                ✓ Results shown immediately after submission
            </div>
            <Button
                variant="outline"
                size="sm"
                className={`w-full font-semibold ${colors.btn}`}
                onClick={onStart}
                disabled={!test && !onStart}
            >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Start {label} Only
            </Button>
        </div>
    );
};

export default function CombinedTestLaunchModal({ session, open, onClose }: CombinedTestLaunchModalProps) {
    const navigate = useNavigate();

    const handleStartP1 = () => {
        onClose();
        const id = session.test1?.id || session.test1_id;
        if (id) navigate(`/test-intro/${id}`);
    };

    const handleStartP2 = () => {
        onClose();
        const id = session.test2?.id || session.test2_id;
        if (id) navigate(`/test-intro/${id}`);
    };

    const handleStartCombined = () => {
        onClose();
        navigate(`/combined-intro/${session.id}`);
    };

    const hasTest1 = !!(session.test1 || session.test1_id);
    const hasTest2 = !!(session.test2 || session.test2_id);

    const p1Qs = session.test1?.questions?.length || (session.test1?.sections?.reduce((a: number, s: any) => a + (s.questions?.length || 0), 0) || 0);
    const p2Qs = session.test2?.questions?.length || (session.test2?.sections?.reduce((a: number, s: any) => a + (s.questions?.length || 0), 0) || 0);
    const totalDuration = (session.test1?.duration || 0) + (session.test2?.duration || 0) + session.break_duration_minutes;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 rounded-2xl">
                {/* Header */}
                <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-6 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_70%)]" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-white/20 text-white border-0 text-[10px] font-black tracking-wider">
                                <Layers className="w-3 h-3 mr-1" /> COMBINED SESSION
                            </Badge>
                        </div>
                        <DialogTitle className="text-2xl font-black text-white leading-tight mb-1">
                            {session.title}
                        </DialogTitle>
                        <div className="flex items-center gap-4 text-white/80 text-sm">
                            <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />{p1Qs + p2Qs} Total Questions</span>
                            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{totalDuration}m Total</span>
                            <span className="flex items-center gap-1.5"><Coffee className="w-4 h-4" />{session.break_duration_minutes}m break</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-5 bg-slate-50 dark:bg-slate-950">
                    {/* Individual paper options */}
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Start Individually</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <PaperCard
                                label={session.paper1_label}
                                number="I"
                                test={session.test1}
                                color="violet"
                                onStart={handleStartP1}
                            />
                            <PaperCard
                                label={session.paper2_label}
                                number="II"
                                test={session.test2}
                                color="blue"
                                onStart={handleStartP2}
                            />
                        </div>
                    </div>

                    {/* OR divider */}
                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                        <span className="text-xs font-black text-slate-400 uppercase">or</span>
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    </div>

                    {/* Combined session option */}
                    <div className="relative rounded-2xl border-2 border-indigo-300 dark:border-indigo-700 bg-gradient-to-br from-indigo-50 via-violet-50/50 to-blue-50 dark:from-indigo-950/30 dark:via-violet-950/20 dark:to-blue-950/30 p-5 overflow-hidden">
                        <div className="absolute top-0 right-0 bg-gradient-to-bl from-indigo-600 to-violet-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl tracking-wider">
                            RECOMMENDED
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50">
                                <Layers className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black text-slate-800 dark:text-white text-base">Full Combined Session</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                    {session.paper1_label} → {session.break_duration_minutes}min break → {session.paper2_label}. Results revealed only after both papers.
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-bold">
                                        Paper I: {p1Qs} Qs • {session.test1?.duration || 0}m
                                    </span>
                                    <span className="text-slate-300">+</span>
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-bold">
                                        <Coffee className="w-3 h-3" /> {session.break_duration_minutes}m Break
                                    </span>
                                    <span className="text-slate-300">+</span>
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold">
                                        Paper II: {p2Qs} Qs • {session.test2?.duration || 0}m
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Button
                            className="w-full mt-5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold h-11 shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/40 border-0 transition-all hover:scale-[1.02]"
                            onClick={handleStartCombined}
                            disabled={!hasTest1 || !hasTest2}
                        >
                            <Layers className="w-4 h-4 mr-2" />
                            Begin Combined Session
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
