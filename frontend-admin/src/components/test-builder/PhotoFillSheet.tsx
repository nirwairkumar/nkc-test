import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Camera, ImagePlus, Loader2, ScanText, AlertCircle, LogIn } from 'lucide-react';
import { readQuestionFromPhoto, type PhotoQuestion, type PhotoQuestionType } from '@/lib/photoQuestionApi';

interface PhotoFillSheetProps {
    open: boolean;
    /** e.g. "Question 4" — shown so the teacher knows which card will be filled. */
    targetLabel: string;
    expectedType?: PhotoQuestionType;
    isSignedIn: boolean;
    onRequestSignIn: () => void;
    onClose: () => void;
    onFilled: (result: PhotoQuestion) => void;
}

const EXAMPLES = [
    { src: '/sample-questions-showcase/handwritten-question.png', label: 'Handwritten' },
    { src: '/sample-questions-showcase/question-with-option.png', label: 'Printed with options' },
    { src: '/sample-questions-showcase/chemistry-table-question.png', label: 'Tables & chemistry' },
];

const READING_STEPS = ['Reading the question…', 'Finding the options…', 'Looking for a marked answer…', 'Almost done…'];

export default function PhotoFillSheet({
    open, targetLabel, expectedType, isSignedIn, onRequestSignIn, onClose, onFilled,
}: PhotoFillSheetProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'reading' | 'error'>('idle');
    const [error, setError] = useState('');
    const [step, setStep] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const pickRef = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLInputElement>(null);

    const reset = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        setPreview(p => {
            if (p) URL.revokeObjectURL(p);
            return null;
        });
        setStatus('idle');
        setError('');
        setStep(0);
    }, []);

    useEffect(() => {
        if (!open) reset();
    }, [open, reset]);

    useEffect(() => {
        if (status !== 'reading') return;
        const t = setInterval(() => setStep(s => Math.min(s + 1, READING_STEPS.length - 1)), 2200);
        return () => clearInterval(t);
    }, [status]);

    const read = useCallback(async (file: File | null | undefined) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setStatus('error');
            setError('That file is not a photo. Please choose a JPG or PNG picture.');
            return;
        }
        reset();
        setPreview(URL.createObjectURL(file));
        setStatus('reading');
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        try {
            const result = await readQuestionFromPhoto(file, { expectedType, signal: ctrl.signal });
            if (ctrl.signal.aborted) return;
            onFilled(result);
        } catch (e: any) {
            if (e?.name === 'AbortError') return;
            setStatus('error');
            setError(e?.message || 'Could not read the photo. Please try again.');
        }
    }, [expectedType, onFilled, reset]);

    // Ctrl+V a screenshot straight into the sheet
    useEffect(() => {
        if (!open || !isSignedIn) return;
        const onPaste = (e: ClipboardEvent) => {
            const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'));
            if (item) {
                e.preventDefault();
                read(item.getAsFile());
            }
        };
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, [open, isSignedIn, read]);

    return (
        <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
            <DialogContent className="max-w-[440px] gap-0 overflow-hidden rounded-[22px] border-0 p-0 shadow-[0_24px_64px_-24px_rgba(15,23,42,0.5)] [&>button]:right-3.5 [&>button]:top-3.5 [&>button]:rounded-full [&>button]:bg-slate-100 [&>button]:p-1.5">
                <div className="px-5 pb-4 pt-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">{targetLabel}</p>
                    <DialogTitle className="mt-1 text-[22px] font-bold tracking-[-0.02em] text-slate-900">Fill from a photo</DialogTitle>
                    <DialogDescription className="mt-1.5 text-[15px] leading-relaxed text-slate-600">
                        Take or choose a photo of one question — printed or handwritten. We’ll type the question and
                        options for you, and tick the answer if it’s marked in the photo.
                    </DialogDescription>
                </div>

                {!isSignedIn ? (
                    <div className="mx-5 mb-5 rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-slate-900/5">
                        <p className="text-[15px] text-slate-700">Sign in to read questions from photos.</p>
                        <button
                            type="button"
                            onClick={onRequestSignIn}
                            className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-[15px] font-semibold text-white hover:bg-[hsl(200,95%,30%)]"
                        >
                            <LogIn className="h-4 w-4" /> Sign in
                        </button>
                    </div>
                ) : status === 'reading' ? (
                    <div className="mx-5 mb-5 overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-900/10">
                        <div className="relative flex h-56 items-center justify-center">
                            {preview && <img src={preview} alt="Your photo" className="max-h-full max-w-full object-contain opacity-60" />}
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-full motion-safe:animate-[photoscan_1.8s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-sky-400/25 to-transparent" style={{ height: '40%' }} />
                        </div>
                        <div className="flex items-center gap-3 bg-white px-4 py-3.5">
                            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-sky-600" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[15px] font-semibold text-slate-900">{READING_STEPS[step]}</p>
                                <p className="text-[13px] text-slate-500">Usually takes 5–15 seconds</p>
                            </div>
                            <button type="button" onClick={reset} className="h-9 rounded-full px-3 text-[14px] font-medium text-slate-600 hover:bg-slate-100">
                                Cancel
                            </button>
                        </div>
                        <style>{`@keyframes photoscan { 0% { transform: translateY(-100%) } 100% { transform: translateY(250%) } }`}</style>
                    </div>
                ) : (
                    <div className="px-5 pb-5">
                        {status === 'error' && (
                            <div className="mb-3 flex gap-2.5 rounded-xl bg-red-50 px-3.5 py-3 text-[14px] text-red-800 ring-1 ring-inset ring-red-600/15">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{error} Try a sharper, well-lit photo with the whole question in it.</span>
                            </div>
                        )}

                        <div
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={e => {
                                e.preventDefault();
                                setDragOver(false);
                                read(e.dataTransfer.files?.[0]);
                            }}
                            className={`rounded-2xl border-2 border-dashed p-4 transition-colors ${dragOver ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50/60'}`}
                        >
                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => cameraRef.current?.click()}
                                    className="flex flex-col items-center gap-2 rounded-xl bg-white px-3 py-4 text-[15px] font-semibold text-slate-800 shadow-sm ring-1 ring-slate-900/[0.06] transition-colors hover:bg-sky-50 hover:text-sky-800"
                                >
                                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-700"><Camera className="h-5 w-5" /></span>
                                    Take a photo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => pickRef.current?.click()}
                                    className="flex flex-col items-center gap-2 rounded-xl bg-white px-3 py-4 text-[15px] font-semibold text-slate-800 shadow-sm ring-1 ring-slate-900/[0.06] transition-colors hover:bg-sky-50 hover:text-sky-800"
                                >
                                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700"><ImagePlus className="h-5 w-5" /></span>
                                    Choose a photo
                                </button>
                            </div>
                            <p className="mt-3 text-center text-[13px] text-slate-500">
                                or drag it here, or press <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-600">Ctrl</kbd>+<kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-600">V</kbd> to paste a screenshot
                            </p>
                            <input ref={pickRef} type="file" accept="image/*" className="hidden" onChange={e => { read(e.target.files?.[0]); e.target.value = ''; }} />
                            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { read(e.target.files?.[0]); e.target.value = ''; }} />
                        </div>

                        <p className="mb-2 mt-4 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-slate-400">
                            <ScanText className="h-3.5 w-3.5" /> Works with photos like these
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {EXAMPLES.map(ex => (
                                <figure key={ex.src} className="overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-900/5">
                                    <img src={ex.src} alt={ex.label} loading="lazy" className="h-16 w-full object-cover object-top" />
                                    <figcaption className="truncate px-1.5 py-1 text-center text-[11px] font-medium text-slate-600">{ex.label}</figcaption>
                                </figure>
                            ))}
                        </div>
                        <p className="mt-3 text-[13px] leading-relaxed text-slate-500">
                            Have a whole page of questions? Use <strong className="font-semibold text-slate-700">Import from PDF or photos</strong> at the top of the page to add them all at once.
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
