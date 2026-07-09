import React, { useState } from 'react';
import { GitFork, Loader2, Lock, ArrowRight, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cloneTest } from '@/lib/testsApi';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CloneTestDialogProps {
    test: any;
    userId: string;
    isPremium: boolean;
    open: boolean;
    onClose: () => void;
    onSuccess?: (newTest: any) => void;
}

export default function CloneTestDialog({
    test,
    userId,
    isPremium,
    open,
    onClose,
    onSuccess,
}: CloneTestDialogProps) {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleClone = async () => {
        if (!isPremium) return;
        setLoading(true);
        try {
            const { data, error } = await cloneTest(test.id, userId);
            if (error) throw new Error(typeof error === 'string' ? error : 'Clone failed');
            toast.success('Test copied! Find it in your Creator Dashboard.', {
                description: `"Copy of ${test.title}" saved as private.`,
                duration: 5000,
            });
            onClose();
            if (onSuccess) onSuccess(data);
        } catch (err: any) {
            toast.error(err.message || 'Failed to copy test. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const questionCount = test?.total_questions ?? test?.questions?.length ?? 0;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-[min(400px,calc(100vw-24px))] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl gap-0">

                {/* ── Header ── */}
                <div className="relative bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 px-6 pt-7 pb-6 text-center overflow-hidden">
                    {/* Decorative glow */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-violet-500/15 rounded-full blur-2xl" />
                    </div>

                    <div className="relative w-14 h-14 bg-violet-500/20 border border-violet-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/20">
                        <GitFork className="w-7 h-7 text-violet-300" />
                    </div>

                    <DialogHeader className="space-y-0">
                        <DialogTitle className="text-white text-lg font-bold leading-tight">
                            Copy and Conduct this Test?
                        </DialogTitle>
                    </DialogHeader>

                    {/* Test Preview */}
                    <div className="relative mt-4 bg-white/8 backdrop-blur-sm rounded-xl border border-white/10 p-3 text-left">
                        <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{test?.title}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={test?.creator_avatar} />
                                <AvatarFallback className="text-[9px] bg-violet-500/30 text-violet-300">
                                    {test?.creator_name?.substring(0, 2).toUpperCase() || 'CR'}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-white/60 text-xs truncate">{test?.creator_name || 'Creator'}</span>
                            <span className="text-white/30 text-xs">•</span>
                            <span className="text-white/60 text-xs">{questionCount} Qs</span>
                            {test?.duration && (
                                <>
                                    <span className="text-white/30 text-xs">•</span>
                                    <span className="text-white/60 text-xs">{test.duration}m</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="p-5 bg-white space-y-4">

                    {!isPremium ? (
                        /* Premium Upsell State */
                        <div className="space-y-4">
                            <div className="flex flex-col items-center text-center gap-2 py-2">
                                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                    <Crown className="w-5 h-5 text-amber-600" />
                                </div>
                                <p className="font-semibold text-slate-800 text-sm">Premium Feature</p>
                                <p className="text-xs text-slate-500 leading-relaxed max-w-[260px]">
                                    Copying and conducting tests is available exclusively for subscribed creators. Upgrade to get full access.
                                </p>
                            </div>

                            <Button
                                className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/25 rounded-xl transition-all active:scale-[0.98]"
                                onClick={() => { onClose(); navigate('/pricing'); }}
                            >
                                <Crown className="w-4 h-4 mr-2" />
                                Upgrade to Premium
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full h-9 text-slate-400 hover:text-slate-600 text-xs rounded-xl"
                                onClick={onClose}
                            >
                                Maybe later
                            </Button>
                        </div>
                    ) : (
                        /* Confirm Clone State */
                        <div className="space-y-4">
                            {/* Info bullets */}
                            <ul className="space-y-2">
                                {[
                                    'A private copy will appear in your Creator Dashboard',
                                    'Edit, conduct, and view results — fully independent',
                                    'Never visible on the original creator\'s profile',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                                        <div className="w-4 h-4 shrink-0 bg-violet-100 rounded-full flex items-center justify-center mt-0.5">
                                            <div className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            <div className="flex gap-2.5 pt-1">
                                <Button
                                    variant="outline"
                                    className="flex-1 h-11 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm"
                                    onClick={onClose}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 transition-all active:scale-[0.98] cursor-pointer"
                                    onClick={handleClone}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <GitFork className="w-4 h-4 mr-2" />
                                            Copy & Conduct
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
