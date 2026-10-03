/**
 * A student's exam screen on a phone: TestoZa's NTA-style Standard Mode
 * (src/pages/TestPage.tsx) with its phone layout resolved (no md: variants), showing a
 * Hindi or bilingual question. Class strings are TestPage's, including the text-size
 * control at the top right of the question (12–32 px, 18 to start, options 2 px
 * smaller but at least 14) and the LatexRenderer container's classes; buttons use the
 * app's own buttonVariants. A bilingual field is two lines, as the AI writes it, and
 * LatexRenderer turns the line break into <br>. Always light (.ht-screen).
 */
import { Fragment } from 'react';
import { ChevronLeft, ChevronRight, Clock, EyeOff, Flag as FlagIcon, Maximize, Menu as MenuIcon, MessageSquareWarning, Minus, Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PAPER, bilingual, type BilingualQuestion, type OptionKey } from '@/guides/hindiData';

const btn = (variant: 'default' | 'outline' | 'ghost' | 'destructive', size: 'default' | 'sm' | 'icon', extra: string) => cn(buttonVariants({ variant, size }), extra);

export type PaperLanguage = 'hi' | 'bi';

/** "14:05" */
export const mmss = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export const questionText = (q: BilingualQuestion, lang: PaperLanguage) => (lang === 'bi' ? bilingual(q.hi.text, q.en.text) : q.hi.text);
export const optionText = (q: BilingualQuestion, key: OptionKey, lang: PaperLanguage) => (lang === 'bi' ? bilingual(q.hi.options[key], q.en.options[key]) : q.hi.options[key]);

/** LatexRenderer's output for plain text: line breaks become <br>. */
function Lines({ text }: { text: string }) {
    const parts = text.split('\n');
    return (
        <>
            {parts.map((p, i) => (
                <Fragment key={i}>
                    {i > 0 && <br />}
                    {p}
                </Fragment>
            ))}
        </>
    );
}

export interface ExamScreenProps {
    q: BilingualQuestion;
    /** 0-based position in the paper. */
    index: number;
    lang: PaperLanguage;
    selected?: OptionKey | null;
    seconds: number;
    fontSize: number;
    live?: boolean;
    /** Make the faint − / + easy to find (the demo's hint). */
    nudgeFont?: boolean;
    onFont?: (delta: -2 | 2) => void;
    onSelect?: (key: OptionKey) => void;
    onNext?: () => void;
    onBack?: () => void;
    onClear?: () => void;
    onSubmit?: () => void;
}

export default function ExamScreen({ q, index, lang, selected, seconds, fontSize, live = false, nudgeFont, onFont, onSelect, onNext, onBack, onClear, onSubmit }: ExamScreenProps) {
    const critical = seconds < 300;
    const tab = live ? 0 : -1;
    const keys = Object.keys(q.hi.options) as OptionKey[];
    return (
        <div className="relative flex h-full flex-col overflow-hidden bg-slate-50 text-slate-900">
            <div className="bg-white border-b px-4 py-2.5 relative top-0 z-10 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] flex flex-col items-start justify-between gap-2">
                <div className="flex items-center justify-between gap-0 w-full">
                    <div className="text-[13px] font-medium text-slate-400 tracking-wide truncate text-left">{PAPER.title}</div>
                    <span className="flex items-center justify-center p-1 rounded-full text-slate-400 shrink-0 -mr-3" title="Enter Full Screen">
                        <Maximize className="w-3.5 h-3.5" />
                    </span>
                </div>
                <div className="flex items-center justify-between gap-1.5 w-full mt-0.5">
                    <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors', critical ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50/80 text-slate-600 border-slate-200')}>
                        <Clock className={cn('w-3.5 h-3.5', critical ? 'animate-pulse text-red-500' : 'text-slate-400')} />
                        <span className="min-w-[40px] text-center font-mono">{mmss(seconds)}</span>
                        <span className="flex items-center justify-center p-0.5 rounded-full text-slate-400">
                            <EyeOff className="w-3.5 h-3.5" />
                        </span>
                    </div>
                    <span className="inline-block w-2 h-2 rounded-full transition-colors shrink-0 bg-emerald-400" title="Connected" />
                    <span className={btn('ghost', 'sm', 'h-7 rounded-full px-3 text-[11px] font-semibold text-slate-500')}>Exit</span>
                    <button type="button" tabIndex={tab} onClick={onSubmit} className={btn('destructive', 'sm', 'h-7 rounded-full px-3 text-[11px] font-semibold shadow-sm overflow-hidden shrink-0 ml-auto')}>
                        Submit Test
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="p-3 gap-2 flex flex-col h-auto">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">Question {index + 1}</span>
                            <span className="inline-flex items-center rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">Single Choice</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="text-xs font-medium flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                <span className="text-emerald-700">+{PAPER.right}</span>
                                <span className="text-slate-300">|</span>
                                <span className="text-red-600">-{PAPER.wrong}</span>
                            </div>
                            <span className={btn('ghost', 'icon', 'h-7 w-7 p-0 ml-1 text-slate-400')}>
                                <MessageSquareWarning className="w-4 h-4" />
                            </span>
                        </div>
                    </div>
                    <hr className="border-slate-200 mb-3" />

                    <div
                        className="relative text-slate-800 font-medium leading-relaxed break-words px-2 py-4 rounded-lg selection:bg-blue-100 selection:text-blue-900 tracking-wide [word-spacing:1.5px] [&_.katex]:[word-spacing:normal]"
                        style={{ fontSize: `${fontSize}px` }}
                    >
                        <div className={cn('absolute -top-4 -right-1 flex items-center gap-0 opacity-10 hover:opacity-100 transition-opacity z-10 print:hidden', nudgeFont && 'ht-font-nudge')}>
                            <button type="button" tabIndex={tab} onClick={() => onFont?.(-2)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors" title="Decrease font size" aria-label="Decrease font size">
                                <Minus className="w-3 h-3" />
                            </button>
                            <button type="button" tabIndex={tab} onClick={() => onFont?.(2)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors" title="Increase font size" aria-label="Increase font size">
                                <Plus className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="overflow-x-auto max-w-full">
                            <div className="latex-renderer-container font-medium text-slate-800" lang="hi">
                                <span key={`${index}-${lang}`} className="ht-swap">
                                    <Lines text={questionText(q, lang)} />
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 mt-6">
                        <div className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">Options</div>
                        {keys.map((key) => {
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
                                            on ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200 group-hover:border-blue-400 group-hover:text-blue-600',
                                        )}
                                    >
                                        {key}
                                    </div>
                                    <div className="flex-1 flex flex-col gap-2">
                                        <div className="text-slate-700 leading-relaxed max-w-[95%] break-words pt-0.5" style={{ fontSize: `${Math.max(14, fontSize - 2)}px` }}>
                                            <div className="latex-renderer-container font-medium text-slate-800" lang="hi">
                                                <Lines text={optionText(q, key, lang)} />
                                            </div>
                                        </div>
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
                        <button type="button" tabIndex={tab} onClick={() => live && onBack?.()} disabled={index === 0} className={btn('outline', 'default', 'h-9 w-9 flex-1')}>
                            <ChevronLeft className="w-6 h-6 mr-1" />
                            <span>Back</span>
                        </button>
                        <div className="flex gap-2 justify-end flex-[2]">
                            <button type="button" tabIndex={tab} onClick={() => live && onClear?.()} disabled={!selected} className={btn('outline', 'sm', 'h-9 text-muted-foreground border-dashed')}>
                                <span>Clear</span>
                            </button>
                            <span className={btn('outline', 'sm', cn('h-9 px-3 transition-all', selected ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600' : 'text-slate-600 border-slate-200'))} title="Flag Question">
                                <FlagIcon className="w-4 h-4" />
                            </span>
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
