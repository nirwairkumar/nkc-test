import React from 'react';
import { Check, Upload, PenLine, Radio, Copy, X } from 'lucide-react';
import type { Checklist, LiveExam } from '@/lib/teacherDashboardApi';
import { examWhatsAppUrl, getExamUrl } from '@/lib/conductExam';
import { toast } from 'sonner';
import { CARD, PILL_BTN, PRIMARY_BTN, WhatsAppIcon } from './dashboardUi';
import { copyText } from './format';

interface FirstExamChecklistProps {
    checklist: Checklist;
    liveExam: LiveExam | null;
    onUploadPaper: () => void;
    onTypeQuestions: () => void;
    onConduct: (test: any) => void;
    onHide: () => void;
}

/**
 * Shown until the teacher has run one real exam end to end (test → live link → a student's
 * result). Most educators who drop off do it between starting an exam and the first result.
 */
export default function FirstExamChecklist({
    checklist, liveExam, onUploadPaper, onTypeQuestions, onConduct, onHide,
}: FirstExamChecklistProps) {
    const steps = [
        { done: checklist.hasTest, title: 'Make your test', body: 'Upload a question paper (PDF, Word or photo) and AI types it in for you. Or type the questions yourself.' },
        { done: checklist.hasConducted, title: 'Start it as an online exam', body: 'You get a private link. Only students who have the link can take it.' },
        { done: checklist.hasResult, title: 'Send the link to your students', body: "Share it on your WhatsApp group. Each student's marks and rank appear here as soon as they submit." },
    ];
    const doneCount = steps.filter(s => s.done).length;
    const current = steps.findIndex(s => !s.done);
    const pct = doneCount / steps.length;

    const copyLink = async () => {
        if (!liveExam) return;
        const ok = await copyText(getExamUrl(liveExam.test));
        if (ok) toast.success('Exam link copied');
        else toast.error('Could not copy the link');
    };

    return (
        <section aria-labelledby="first-exam-heading" className={`${CARD} overflow-hidden`}>
            <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-4 sm:px-5">
                <ProgressRing value={pct} label={`${doneCount}/${steps.length}`} />
                <div className="min-w-0 flex-1">
                    <h2 id="first-exam-heading" className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900">
                        Run your first online exam
                    </h2>
                    <p className="mt-0.5 text-[13px] text-slate-600">Three steps from your question paper to your students' marks.</p>
                </div>
                <button
                    type="button"
                    onClick={onHide}
                    aria-label="Hide this guide"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <ol className="divide-y divide-slate-100">
                {steps.map((step, i) => {
                    const isCurrent = i === current;
                    return (
                        <li key={step.title} className={`flex gap-3.5 px-4 py-4 sm:px-5 ${isCurrent ? 'bg-sky-50/40' : ''}`}>
                            <span
                                className={[
                                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tabular-nums',
                                    step.done
                                        ? 'bg-emerald-500 text-white'
                                        : isCurrent
                                            ? 'bg-primary text-white shadow-[0_6px_14px_-6px_rgba(2,132,199,0.9)]'
                                            : 'bg-slate-100 text-slate-500',
                                ].join(' ')}
                            >
                                {step.done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className={`text-[15px] font-semibold ${step.done ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900'}`}>
                                    {step.title}
                                </p>
                                {!step.done && <p className="mt-0.5 text-[13px] leading-snug text-slate-600">{step.body}</p>}

                                {isCurrent && i === 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button type="button" onClick={onUploadPaper} className={`${PRIMARY_BTN} h-10 px-4 text-sm`}>
                                            <Upload className="h-4 w-4" /> Upload a paper
                                        </button>
                                        <button type="button" onClick={onTypeQuestions} className={PILL_BTN}>
                                            <PenLine className="h-4 w-4 text-sky-600" /> Type questions
                                        </button>
                                    </div>
                                )}

                                {isCurrent && i === 1 && checklist.nextToConduct && (
                                    <div className="mt-3">
                                        <button type="button" onClick={() => onConduct(checklist.nextToConduct)} className={`${PRIMARY_BTN} h-10 max-w-full px-4 text-sm`}>
                                            <Radio className="h-4 w-4 shrink-0" />
                                            <span className="truncate">Start "{checklist.nextToConduct.title}"</span>
                                        </button>
                                    </div>
                                )}

                                {isCurrent && i === 2 && (
                                    liveExam ? (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <a
                                                href={examWhatsAppUrl(liveExam.test)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white transition-[filter,transform] hover:brightness-95 motion-safe:active:scale-[0.97]"
                                            >
                                                <WhatsAppIcon /> Send on WhatsApp
                                            </a>
                                            <button type="button" onClick={copyLink} className={PILL_BTN}>
                                                <Copy className="h-4 w-4 text-sky-600" /> Copy link
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="mt-2 text-[13px] text-slate-500">Start an exam first. Its link will show here.</p>
                                    )
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

function ProgressRing({ value, label }: { value: number; label: string }) {
    const r = 20;
    const c = 2 * Math.PI * r;
    return (
        <div className="relative h-12 w-12 shrink-0" role="img" aria-label={`${label} steps done`}>
            <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
                <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-slate-100" />
                <circle
                    cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={c} strokeDashoffset={c * (1 - value)}
                    className="text-sky-500 transition-[stroke-dashoffset] duration-500"
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-slate-700">{label}</span>
        </div>
    );
}
