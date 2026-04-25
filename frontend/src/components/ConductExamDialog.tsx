import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Copy, Check, Link as LinkIcon, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import { generateConductSlug } from '@/lib/testsApi';

interface ConductExamDialogProps {
    test: any;
    open: boolean;
    onClose: () => void;
    onConfirm: (conductSlug: string) => Promise<void>;
    loading?: boolean;
}

export default function ConductExamDialog({
    test,
    open,
    onClose,
    onConfirm,
    loading = false,
}: ConductExamDialogProps) {
    const [slug, setSlug] = useState('');
    const [copied, setCopied] = useState(false);
    const [slugError, setSlugError] = useState('');

    const examUrl = slug ? `${window.location.origin}/test/${slug}` : '';

    useEffect(() => {
        if (open && test) {
            setSlug(generateConductSlug(test.title));
            setSlugError('');
            setCopied(false);
        }
    }, [open, test]);

    const regenerate = () => {
        setSlug(generateConductSlug(test.title));
        setSlugError('');
        setCopied(false);
    };

    const handleCopy = async () => {
        if (!examUrl) return;
        await navigator.clipboard.writeText(examUrl);
        setCopied(true);
        toast.success('Exam link copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleConfirm = async () => {
        await onConfirm(slug);
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl mx-auto">
                {/* Header Gradient */}
                <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-6 text-white">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-white text-lg font-bold leading-tight">
                                Conduct Exam
                            </DialogTitle>
                            <DialogDescription className="text-white/70 text-xs mt-0.5">
                                Generate a secure private link for this exam
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Test name */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                            <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-slate-500 font-medium">Exam</p>
                            <p className="text-sm font-semibold text-slate-800 truncate">{test?.title}</p>
                        </div>
                    </div>

                    {/* Info banner */}
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 leading-relaxed">
                            This test will be accessible <strong>only via this secure link</strong>. It won't appear publicly and private mode blocks all access.
                        </p>
                    </div>

                    {/* Slug field */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-700">Secure Exam Slug</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                onClick={regenerate}
                            >
                                <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
                            </Button>
                        </div>
                        <div className="relative">
                            <Input
                                value={slug}
                                readOnly
                                className="pr-20 font-mono text-sm border-slate-200 bg-slate-50 cursor-default focus-visible:ring-0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                                {slug.length}c
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">Auto-generated secure link</p>
                    </div>

                    {/* Preview link */}
                    {slug && (
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500 font-medium">Exam Link Preview</Label>
                            <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-xl border border-slate-800">
                                <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="text-xs text-slate-300 font-mono truncate flex-1">
                                    {examUrl}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 shrink-0 text-slate-400 hover:text-white hover:bg-white/10"
                                    onClick={handleCopy}
                                >
                                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="px-6 pb-6 pt-0 flex gap-2">
                    <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!slug || loading}
                        className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 shadow-lg shadow-indigo-200"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Starting...
                            </span>
                        ) : (
                            '🎯 Start Conducting'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
