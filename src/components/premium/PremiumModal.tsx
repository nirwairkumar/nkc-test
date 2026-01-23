import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Crown, CheckCircle } from 'lucide-react';

interface PremiumModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    triggerReason?: string;
}

export default function PremiumModal({ open, onOpenChange, triggerReason }: PremiumModalProps) {
    const navigate = useNavigate();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-yellow-500/20">
                <DialogHeader className="text-center items-center space-y-4 pt-4">
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full w-fit">
                        <Crown className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="space-y-1">
                        <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-600 to-amber-600 dark:from-yellow-400 dark:to-amber-500">
                            Unlock Pro Features
                        </DialogTitle>
                        <DialogDescription className="text-base text-slate-600 dark:text-slate-400">
                            {triggerReason || "This feature is available exclusively for Premium members."}
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="py-4 space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium">Add Institution Branding & Logs</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium">Create Unlimited Tests</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium">Detailed Analytics & Reports</span>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-col gap-2 mt-2">
                    <Button
                        className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-bold shadow-lg shadow-yellow-500/20"
                        size="lg"
                        onClick={() => {
                            onOpenChange(false);
                            navigate('/pricing');
                        }}
                    >
                        Upgrade Now
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full text-slate-500 hover:text-slate-700"
                        onClick={() => onOpenChange(false)}
                    >
                        Maybe Later
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
