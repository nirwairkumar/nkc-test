import React from 'react';
import { Check, Copy, PenLine, Play, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { Checklist, LiveExam } from '@/lib/teacherDashboardApi';
import { examInviteText, examWhatsAppUrl } from '@/lib/conductExam';
import { CARD, PILL_BTN, PRIMARY_BTN, WhatsAppIcon } from './dashboardUi';
import { copyText, plural } from './format';

interface NextStepCardProps {
    checklist: Checklist;
    liveExam: LiveExam | null;
    onUploadPaper: () => void;
    onTypeQuestions: () => void;
    onConduct: (test: any) => void;
    className?: string;
}

type Stage = 'make' | 'run' | 'send';
const STEPS = ['Make a test', 'Start the exam', 'Send it to your class'];

/**
 * One thing to do next, until the educator has real candidates' results. Most of them stop
 * between "exam is live" and "link sent", so the send step shows the exact message the
 * class group will get, with the WhatsApp button right under it.
 */
export default function NextStepCard({ checklist, liveExam, onUploadPaper, onTypeQuestions, onConduct, className = '' }: NextStepCardProps) {
    const stage: Stage = liveExam ? 'send' : !checklist.hasTest ? 'make' : !checklist.hasConducted ? 'run' : 'send';
    const step = stage === 'make' ? 0 : stage === 'run' ? 1 : 2;
    const test = liveExam?.test || checklist.nextToConduct;
    const title = test?.title || 'your test';
    const n = checklist.resultCount;

    let heading: string;
    let body: string;
    if (stage === 'make') {
        heading = 'Make your first test';
        body = 'Upload a question paper, a PDF or a photo, and AI types it in with the maths and diagrams. Or type the questions yourself.';
    } else if (stage === 'run') {
        heading = `Start “${title}” as an online exam`;
        body = 'You get one private link. Candidates open it on any phone or computer, with no app and no sign-up, and you see each one’s marks as they submit.';
    } else if (liveExam && n > 0) {
        heading = `${plural(n, 'candidate')} so far. Send it to the rest.`;
        body = 'Post the link once more in your class group. Marks, ranks and who needs help fill in here as they submit.';
    } else if (liveExam) {
        heading = 'Your exam is live. Now send the link.';
        body = checklist.selfTried
            ? 'You have tried it yourself, so you know it works. Your candidates see the same screen. Post this message in your class group.'
            : 'Nobody has the link yet. Post this message in your class group. Candidates tap the link and start, no app needed.';
    } else {
        heading = `Run “${title}” again, for your class`;
        body = checklist.selfTried
            ? 'You have tried it yourself. This time start it, post the link in your class group and watch the marks come in.'
            : 'Start it, post the link in your class group and watch the marks come in.';
    }

    const copyMessage = async () => {
        if (!test) return;
        const ok = await copyText(examInviteText(test));
        if (ok) toast.success('Message copied. Paste it in your class group.');
        else toast.error('Could not copy the message');
    };

    return (
        <section aria-labelledby="next-step-heading" className={`${CARD} flex flex-col overflow-hidden ${className}`}>
            {/* Where they are: three short segments */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
                <p className="shrink-0 text-[12px] font-semibold uppercase tracking-[0.12em] text-sky-700">Your next step</p>
                <ol className="flex min-w-0 flex-1 items-center justify-end gap-1.5" aria-label={`Step ${step + 1} of 3`}>
                    {STEPS.map((label, i) => (
                        <li key={label} className="flex min-w-0 items-center gap-1.5">
                            <span
                                className={[
                                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                                    i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500',
                                ].join(' ')}
                            >
                                {i < step ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                            </span>
                            <span className={`hidden truncate text-[12px] md:inline ${i === step ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{label}</span>
                            {i < STEPS.length - 1 && <span className="h-px w-3 shrink-0 bg-slate-200 sm:w-5" aria-hidden="true" />}
                        </li>
                    ))}
                </ol>
            </div>

            <div className="grid flex-1 gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_248px] sm:items-center">
                <div className="min-w-0">
                    <h2 id="next-step-heading" className="text-[20px] font-bold leading-snug tracking-[-0.02em] text-slate-900">{heading}</h2>
                    <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{body}</p>

                    <div className="mt-5 flex flex-wrap gap-2">
                        {stage === 'make' && (
                            <>
                                <button type="button" onClick={onUploadPaper} className={`${PRIMARY_BTN} h-10 px-4 text-[14px]`}>
                                    <Upload className="h-4 w-4" /> Upload a paper
                                </button>
                                <button type="button" onClick={onTypeQuestions} className={`${PILL_BTN} h-10`}>
                                    <PenLine className="h-4 w-4 text-sky-600" /> Type questions
                                </button>
                            </>
                        )}
                        {stage === 'send' && liveExam && (
                            <>
                                <a
                                    href={examWhatsAppUrl(liveExam.test)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-[14px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(18,140,126,0.9)] transition-[filter,transform] hover:brightness-95 motion-safe:active:scale-[0.97]"
                                >
                                    <WhatsAppIcon /> Send on WhatsApp
                                </a>
                                <button type="button" onClick={copyMessage} className={`${PILL_BTN} h-10`}>
                                    <Copy className="h-4 w-4 text-sky-600" /> Copy message
                                </button>
                            </>
                        )}
                        {(stage === 'run' || (stage === 'send' && !liveExam)) && test && (
                            <button type="button" onClick={() => onConduct(test)} className={`${PRIMARY_BTN} h-10 max-w-full px-4 text-[14px]`}>
                                <Play className="h-4 w-4 shrink-0 fill-current" />
                                <span className="truncate">{stage === 'run' ? 'Start the exam' : 'Start it again'}</span>
                            </button>
                        )}
                    </div>
                    {stage === 'run' && <p className="mt-2.5 text-[12px] text-slate-500">You can stop it any time. Results stay saved.</p>}
                </div>

                <div className={stage === 'send' ? '' : 'hidden sm:block'} aria-hidden="true">
                    {stage === 'make' && <PaperToTest />}
                    {stage === 'run' && test && <PhoneStart test={test} />}
                    {stage === 'send' && test && <ChatPreview test={test} />}
                </div>
            </div>
        </section>
    );
}

/* ── Small pictures beside each step ─────────────────────────────────────── */

/** The invitation exactly as the class group will read it. */
function ChatPreview({ test }: { test: any }) {
    const lines = examInviteText(test).split('\n');
    return (
        <div className="overflow-hidden rounded-2xl bg-[#efeae2] ring-1 ring-slate-900/[0.06]">
            <div className="flex items-center gap-2 bg-[#0b6b5d] px-3 py-2 text-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">10</span>
                <span className="min-w-0">
                    <span className="block truncate text-[12px] font-semibold leading-tight">Your class group</span>
                    <span className="block text-[10px] leading-tight text-white/70">tap to send</span>
                </span>
            </div>
            <div className="p-2.5">
                <div className="ml-auto max-w-[94%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-2.5 py-2 text-[11.5px] leading-[1.45] text-slate-800 shadow-sm">
                    {lines.map((line, i) => {
                        if (!line) return <div key={i} className="h-1.5" />;
                        const bold = line.match(/^\*(.+)\*$/);
                        if (bold) return <p key={i} className="font-semibold">{bold[1]}</p>;
                        if (/^https?:\/\//.test(line)) return <p key={i} className="break-all text-[#027eb5] underline">{line}</p>;
                        return <p key={i}>{line}</p>;
                    })}
                    <p className="mt-1 text-right text-[10px] text-slate-500">now ✓✓</p>
                </div>
            </div>
        </div>
    );
}

/** What a candidate sees after tapping the link. */
function PhoneStart({ test }: { test: any }) {
    const questions = test.total_questions || 0;
    return (
        <div className="mx-auto w-[176px] rounded-[28px] bg-slate-900 p-[6px] shadow-[0_18px_40px_-20px_rgba(15,23,42,0.6)]">
            <div className="flex h-[236px] flex-col rounded-[22px] bg-white px-3 pb-3 pt-4">
                <span className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
                <p className="line-clamp-2 text-[12.5px] font-bold leading-snug text-slate-900">{test.title}</p>
                <p className="mt-1 text-[10.5px] text-slate-500">
                    {[questions ? plural(questions, 'question') : null, test.duration ? `${test.duration} min` : null].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-4 text-[10px] font-medium text-slate-500">Your name</p>
                <div className="mt-1 h-7 rounded-lg bg-slate-50 px-2 text-[11px] leading-7 text-slate-700 ring-1 ring-slate-200">Aarav Patel</div>
                <p className="mt-2 text-[10px] font-medium text-slate-500">Roll no</p>
                <div className="mt-1 h-7 rounded-lg bg-slate-50 px-2 text-[11px] leading-7 text-slate-700 ring-1 ring-slate-200">104</div>
                <div className="mt-auto flex h-8 items-center justify-center rounded-lg bg-primary text-[12px] font-semibold text-white">Start</div>
            </div>
        </div>
    );
}

/** A question paper turning into a test. */
function PaperToTest() {
    return (
        <div className="relative mx-auto h-[220px] w-[248px]">
            <div className="absolute left-2 top-4 h-[170px] w-[128px] -rotate-6 rounded-md bg-white p-3 shadow-[0_12px_30px_-16px_rgba(15,23,42,0.5)] ring-1 ring-slate-200">
                <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Question paper</p>
                {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className="mt-2.5 space-y-1">
                        <div className="h-1.5 w-full rounded bg-slate-200" />
                        <div className="h-1.5 w-2/3 rounded bg-slate-200" />
                    </div>
                ))}
            </div>
            <div className="absolute right-0 top-10 w-[150px] rounded-xl bg-white p-2.5 shadow-[0_18px_40px_-18px_rgba(2,132,199,0.55)] ring-1 ring-sky-500/20">
                {['Q1', 'Q2', 'Q3'].map(q => (
                    <div key={q} className="mb-1.5 flex items-center gap-1.5 rounded-lg bg-sky-50/70 px-2 py-1.5">
                        <span className="text-[9px] font-bold text-sky-700">{q}</span>
                        <span className="h-1.5 flex-1 rounded bg-sky-200/80" />
                    </div>
                ))}
                <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                    <Check className="h-3 w-3" strokeWidth={3} /> 25 questions ready
                </p>
            </div>
        </div>
    );
}
