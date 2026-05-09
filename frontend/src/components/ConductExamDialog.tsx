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
            <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-32px)] max-w-[360px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl outline-none">
                {/* Header Gradient */}
                <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 px-5 py-4 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4.5 h-4.5 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-white text-base font-bold leading-tight">
                                Conduct Exam
                            </DialogTitle>
                            <DialogDescription className="text-white/70 text-[11px] mt-0.5">
                                Generate a secure private link
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-4 py-4 space-y-3">
                    {/* Test name */}
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Exam</p>
                            <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">{test?.title}</p>
                        </div>
                    </div>

                    {/* Info banner */}
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                            Accessible <strong>only via this secure link</strong>. Won't appear publicly — private mode blocks all other access.
                        </p>
                    </div>

                    {/* Slug field */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-slate-700">Secure Slug</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                onClick={regenerate}
                            >
                                <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
                            </Button>
                        </div>
                        <div className="relative">
                            <Input
                                value={slug}
                                readOnly
                                className="pr-10 font-mono text-[12px] h-9 border-slate-200 bg-slate-50 cursor-default focus-visible:ring-0"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                                {slug.length}c
                            </span>
                        </div>
                    </div>

                    {/* Preview link */}
                    {slug && (
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Link Preview</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 shrink-0 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                                    onClick={handleCopy}
                                >
                                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                </Button>
                            </div>
                            <div className="flex items-start gap-2 px-3 py-2 bg-slate-900 rounded-lg border border-slate-800">
                                <LinkIcon className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                <span
                                    className="text-[11px] text-slate-300 font-mono flex-1"
                                    style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                                >
                                    {examUrl}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 pb-4 pt-1 flex gap-2">
                    <Button variant="outline" onClick={onClose} className="flex-1 h-9 text-sm" disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!slug || loading}
                        className="flex-1 h-9 text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 shadow-md shadow-indigo-200"
                    >
                        {loading ? (
                            <span className="flex items-center gap-1.5">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Starting...
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5" /> Start Conducting
                            </span>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
