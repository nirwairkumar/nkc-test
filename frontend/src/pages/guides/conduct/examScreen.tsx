/**
 * The candidate's exam screen on a phone: TestoZa's NTA-style Standard Mode
 * (src/pages/TestPage.tsx) with its phone layout resolved (no md: variants), plus the
 * dialogs a conducted exam can raise: the violation warning, "Full Screen Required"
 * with its log, "Submitting Test..." and "Exam paused on this device". Class strings
 * are TestPage's and the shadcn AlertDialog's, merged as tailwind-merge does; buttons
 * use the app's own buttonVariants. Always light (.co-screen resets the theme tokens).
 */
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Clock, EyeOff, Flag as FlagIcon, Loader2, Maximize, Maximize2, Menu as MenuIcon, MessageSquareWarning, ScrollText, TriangleAlert } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EXAM } from '@/guides/conductData';

const btn = (variant: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive', size: 'default' | 'sm' | 'icon', extra: string) => cn(buttonVariants({ variant, size }), extra);

export type OptionKey = 'A' | 'B' | 'C' | 'D';

export interface Question {
    text: string;
    options: Record<OptionKey, string>;
}

/** A few questions from "Physics: Current Electricity". */
export const QUESTIONS: Question[] = [
    {
        text: 'A wire of resistance 12 Ω is stretched to twice its length. What is its new resistance?',
        options: { A: '24 Ω', B: '48 Ω', C: '6 Ω', D: '3 Ω' },
    },
    {
        text: 'Three 6 Ω resistors are connected in parallel. What is the equivalent resistance?',
        options: { A: '18 Ω', B: '6 Ω', C: '3 Ω', D: '2 Ω' },
    },
    {
        text: 'Kirchhoff’s junction rule is a statement of the conservation of',
        options: { A: 'energy', B: 'charge', C: 'momentum', D: 'mass' },
    },
    {
        text: 'A cell of emf 2 V and internal resistance 0.5 Ω drives a current through a 3.5 Ω resistor. The current is',
        options: { A: '0.25 A', B: '0.5 A', C: '1 A', D: '4 A' },
    },
    {
        text: 'When the temperature of a copper wire rises, its resistance',
        options: { A: 'increases', B: 'decreases', C: 'stays the same', D: 'becomes zero' },
    },
    {
        text: 'What is the SI unit of resistivity?',
        options: { A: 'ohm', B: 'ohm metre', C: 'ohm per metre', D: 'siemens' },
    },
];

/** "29:04" */
export const mmss = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export interface ExamScreenProps {
    /** 0-based question number. */
    index: number;
    selected?: OptionKey | null;
    seconds: number;
    /** Shown when full screen or app-switch detection is on: the product's counter. */
    warnings?: number | null;
    /** The warning limit. The app always prints "/3"; the replica prints the limit set. */
    limit?: number | null;
    online?: boolean;
    /** Interactive: options and Save & Next respond. */
    live?: boolean;
    onSelect?: (key: OptionKey) => void;
    onNext?: () => void;
    onClear?: () => void;
}

export default function ExamScreen({ index, selected, seconds, warnings = null, limit = 3, online = true, live = false, onSelect, onNext, onClear }: ExamScreenProps) {
    const q = QUESTIONS[index % QUESTIONS.length];
    const critical = seconds < 300;
    const tab = live ? 0 : -1;
    return (
        <div className="relative flex h-full flex-col overflow-hidden bg-slate-50 text-slate-900">
            <div className="bg-white border-b px-4 py-2.5 relative top-0 z-10 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] flex flex-col items-start justify-between gap-2">
                <div className="flex items-center justify-between gap-0 w-full">
                    <div className="text-[13px] font-medium text-slate-400 tracking-wide truncate text-left">{EXAM.paper}</div>
                    <span className="flex items-center justify-center p-1 rounded-full text-slate-400 shrink-0 -mr-3" title="Enter Full Screen">
                        <Maximize className="w-3.5 h-3.5" />
                    </span>
                </div>
                <div className="flex items-center justify-between gap-1.5 w-full mt-0.5">
                    <div
                        className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
                            critical ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50/80 text-slate-600 border-slate-200',
                        )}
                    >
                        <Clock className={cn('w-3.5 h-3.5', critical ? 'animate-pulse text-red-500' : 'text-slate-400')} />
                        <span className="min-w-[40px] text-center font-mono">{mmss(seconds)}</span>
                        <span className="flex items-center justify-center p-0.5 rounded-full text-slate-400">
                            <EyeOff className="w-3.5 h-3.5" />
                        </span>
                    </div>
                    {warnings !== null && (
                        <div
                            className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors',
                                warnings > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200',
                            )}
                        >
                            <TriangleAlert className={cn('w-3.5 h-3.5', warnings > 0 ? 'fill-red-100 text-red-600' : 'fill-amber-100 text-amber-600')} />
                            <span key={warnings} className="co-pop">
                                {warnings}
                                {limit ? `/${limit}` : ''}
                            </span>
                        </div>
                    )}
                    <span
                        className={cn('inline-block w-2 h-2 rounded-full transition-colors shrink-0', online ? 'bg-emerald-400' : 'bg-red-400 animate-pulse')}
                        title={online ? 'Connected' : 'No internet — answers saved locally'}
                    />
                    <span className={btn('ghost', 'sm', 'h-7 rounded-full px-3 text-[11px] font-semibold text-slate-500')}>Exit</span>
                    <span className={btn('destructive', 'sm', 'h-7 rounded-full px-3 text-[11px] font-semibold shadow-sm overflow-hidden shrink-0 ml-auto')}>Submit Test</span>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="gap-2 flex flex-col p-3">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">Question {index + 1}</span>
                            <span className="inline-flex items-center rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">Single Choice</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="text-xs font-medium flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                <span className="text-emerald-700">+{EXAM.right}</span>
                                <span className="text-slate-300">|</span>
                                <span className="text-red-600">-{EXAM.wrong}</span>
                            </div>
                            <span className={btn('ghost', 'icon', 'h-7 w-7 p-0 ml-1 text-slate-400')}>
                                <MessageSquareWarning className="w-4 h-4" />
                            </span>
                        </div>
                    </div>
                    <hr className="border-slate-200 mb-3" />
                    <div className="relative text-slate-800 font-medium leading-relaxed break-words py-3 px-2 rounded-lg tracking-wide [word-spacing:1.5px]" style={{ fontSize: 18 }}>
                        <span key={index} className="co-swap">
                            {q.text}
                        </span>
                    </div>
                    <div className="space-y-3 mt-3">
                        <div className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">Options</div>
                        {(Object.entries(q.options) as [OptionKey, string][]).map(([key, text]) => {
                            const on = selected === key;
                            return (
                                <div
                                    key={key}
                                    role={live ? 'button' : undefined}
                                    tabIndex={live ? 0 : undefined}
                                    aria-pressed={live ? on : undefined}
                                    onClick={() => live && onSelect?.(key)}
                                    onKeyDown={(e) => {
                                        if (live && (e.key === 'Enter' || e.key === ' ')) {
                                            e.preventDefault();
                                            onSelect?.(key);
                                        }
                                    }}
                                    className={cn(
                                        'flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all group relative',
                                        on ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 bg-white',
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'h-7 w-7 flex items-center justify-center font-bold text-sm border shrink-0 transition-colors mt-0.5 rounded-full',
                                            on ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200',
                                        )}
                                    >
                                        {key}
                                    </div>
                                    <div className="flex-1 text-slate-800 font-medium leading-relaxed break-words pt-0.5" style={{ fontSize: 16 }}>
                                        {text}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="h-16" />
                </div>
            </div>

            <div className="absolute bottom-[55px] right-0 z-40">
                <span className={btn('default', 'icon', 'h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg')} aria-hidden="true">
                    <MenuIcon className="h-6 w-6" />
                </span>
            </div>

            <div className="flex-none z-40 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-2">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex justify-between w-full gap-2">
                        <button type="button" tabIndex={tab} disabled={index === 0} className={btn('outline', 'default', 'h-9 w-9 flex-1')}>
                            <ChevronLeft className="w-6 h-6 mr-1" />
                            <span>Back</span>
                        </button>
                        <div className="flex gap-2 justify-end flex-[2]">
                            <button type="button" tabIndex={tab} onClick={() => live && onClear?.()} disabled={!selected} className={btn('outline', 'sm', 'h-9 text-muted-foreground border-dashed')}>
                                <span>Clear</span>
                            </button>
                            <button
                                type="button"
                                tabIndex={tab}
                                className={btn('outline', 'sm', cn('h-9 px-3 transition-all', selected ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600' : 'text-slate-600 border-slate-200'))}
                                title="Flag Question"
                            >
                                <FlagIcon className="w-4 h-4" />
                            </button>
                            <button type="button" tabIndex={tab} onClick={() => live && onNext?.()} className={btn('default', 'sm', 'bg-[#0073E6] hover:bg-[#005fb8] text-white h-9 px-3')}>
                                <span>Save &amp; Next</span>
                                <ChevronRight className="w-4 h-4 ml-0.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Dialogs (AlertDialog on a phone: centred, square corners below sm:) ──── */

function Dialog({ children, label }: { children: ReactNode; label: string }) {
    return (
        <>
            <div className="co-modal-scrim absolute inset-0 z-50 bg-black/80" />
            <div
                role="alertdialog"
                aria-modal="true"
                aria-label={label}
                className="co-dialog absolute left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg"
            >
                {children}
            </div>
        </>
    );
}

/** The violation dialog ("⚠️ Warning", "Maximum Violations Reached", "⚠️ Violation Detected"). */
export function ViolationDialog({ title, message, onClose, live }: { title: string; message: string; onClose?: () => void; live?: boolean }) {
    return (
        <Dialog label={title}>
            <div className="flex flex-col space-y-2 text-center">
                <h2 className="text-red-600 flex items-center gap-2 text-xl font-bold uppercase tracking-tight">
                    <TriangleAlert className="w-6 h-6 stroke-[2.5px] shrink-0" /> {title}
                </h2>
                <p className="text-base text-slate-700">{message}</p>
            </div>
            <div className="flex flex-col-reverse">
                <button type="button" tabIndex={live ? 0 : -1} onClick={onClose} className={cn(buttonVariants(), 'w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-11 text-base shadow-md')}>
                    Understand &amp; Continue
                </button>
            </div>
        </Dialog>
    );
}

/** "Full Screen Required", with the full-screen working log. */
export function FullScreenDialog({ log, onReturn, live }: { log: { event: string; time: string }[]; onReturn?: () => void; live?: boolean }) {
    return (
        <Dialog label="Full Screen Required">
            <div className="flex flex-col space-y-2 text-center">
                <h2 className="text-red-600 flex items-center gap-2 text-xl font-bold uppercase tracking-tight">
                    <Maximize className="w-6 h-6 stroke-[2.5px] shrink-0" /> Full Screen Required
                </h2>
                <p className="text-base text-slate-700">This test must be taken in Full Screen mode for proctoring purposes. Please return to full screen to continue.</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 my-1">
                <div className="flex items-center gap-2 mb-3 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <ScrollText className="w-4 h-4" /> Full Screen Working Log
                </div>
                <div className="max-h-24 overflow-y-auto space-y-2 pr-2">
                    {log
                        .slice()
                        .reverse()
                        .map((l, i) => (
                            <div key={i} className="flex justify-between items-center text-xs border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                <span className={cn('flex items-center gap-1.5 font-semibold', l.event === 'Exit Full Screen' ? 'text-red-600' : 'text-green-600')}>
                                    <span className={cn('w-1.5 h-1.5 rounded-full', l.event === 'Exit Full Screen' ? 'bg-red-500 animate-pulse' : 'bg-green-500')} />
                                    {l.event}
                                </span>
                                <span className="text-slate-500 font-mono">{l.time}</span>
                            </div>
                        ))}
                </div>
            </div>
            <div className="flex flex-col-reverse">
                <button type="button" tabIndex={live ? 0 : -1} onClick={onReturn} className={cn(buttonVariants(), 'w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-11 text-base shadow-md')}>
                    <Maximize2 className="w-5 h-5" /> Return to Full Screen
                </button>
            </div>
        </Dialog>
    );
}

/** The overlay while answers are sent. */
export function SubmittingOverlay() {
    return (
        <div className="co-modal-scrim absolute inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center border">
                <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-2xl font-bold text-slate-800 mb-2">Submitting Test...</p>
                <p className="text-slate-500 text-center">
                    Please stay on this page.
                    <br />
                    Finalizing your answers.
                </p>
            </div>
        </div>
    );
}

/** A removed candidate, or a seat that moved to another device. */
export function PausedDialog({ message }: { message: string }) {
    return (
        <>
            <div className="co-modal-scrim absolute inset-0 z-50 bg-black/80" />
            <div
                role="alertdialog"
                aria-modal="true"
                aria-label="Exam paused on this device"
                className="co-dialog absolute left-[50%] top-[50%] z-50 grid w-full max-w-[min(400px,calc(100%-32px))] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg rounded-2xl"
            >
                <div className="flex flex-col space-y-2 text-center">
                    <p className="text-lg font-semibold">Exam paused on this device</p>
                    <p className="text-[15px] leading-relaxed text-muted-foreground">{message}</p>
                </div>
                <div className="flex flex-col-reverse">
                    <span className={cn(buttonVariants(), 'h-11 rounded-xl')}>OK</span>
                </div>
            </div>
        </>
    );
}
