/**
 * A replica of TestoZa's NTA-style exam screen (Standard Mode, src/pages/TestPage.tsx)
 * for the NEET guide: the hero animates it on a phone and ExamDemo lets readers use it.
 *
 * Class strings are copied from TestPage, resolved for one layout at a time.
 * Tailwind's sm:/md:/lg: prefixes follow the browser window, not this replica, so a
 * phone drawn on a desktop page would otherwise pick up the desktop variants. Buttons
 * use the app's buttonVariants + cn, so they merge exactly as the real ones do. The
 * screen is always light (.ng-screen resets the theme tokens), like a screenshot.
 */
import { useEffect, useRef, type Ref } from 'react';
import {
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    Eye,
    EyeOff,
    Flag,
    Info,
    Layers,
    Maximize,
    Menu,
    MessageSquareWarning,
    Minus,
    Plus,
    X,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MiniMockQuestion, OptionKey } from '@/guides/neetMiniMock';
import MitochondrionFigure from './MitochondrionFigure';
import { formatExamTime, isAnswered, isMarked, useInert, type PillState } from './examUtils';

export type { PillState };
export type ExamLayout = 'phone' | 'desktop';
export type Control =
    | 'save'
    | 'clear'
    | 'flag'
    | 'review'
    | 'ansrev'
    | 'back'
    | 'fab'
    | 'close-sheet'
    | 'submit'
    | 'confirm'
    | 'cancel'
    | 'eye'
    | `opt-${OptionKey}`
    | `pal-${number}`
    | `tab-${number}`;

export interface ExamSection {
    name: string;
    count: number;
}

export interface ExamScreenProps {
    layout: ExamLayout;
    title: string;
    sections: ExamSection[];
    /** Index of the question on screen, across all sections. */
    current: number;
    question: MiniMockQuestion;
    selected?: OptionKey;
    /** Palette state of every question. */
    states: PillState[];
    seconds: number;
    marks?: { plus: number; minus: number };
    timeHidden?: boolean;
    sheetOpen?: boolean;
    dialog?: 'submit' | 'timeup' | null;
    /** A control shown mid-tap (scripted hero). */
    pressed?: Control | null;
    /** Interactive (the demo) rather than scripted (the hero). */
    live?: boolean;
    sheetBodyRef?: Ref<HTMLDivElement>;
    onControl?: (control: Control) => void;
}

const btn = (variant: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive', size: 'default' | 'sm' | 'icon', extra: string) =>
    cn(buttonVariants({ variant, size }), extra);

function pillClass(state: PillState, current: boolean) {
    const base = 'h-8 w-8 flex items-center justify-center text-xs font-semibold transition-all relative rounded-md border';
    const colors =
        state === 'revans' || state === 'rev'
            ? 'bg-purple-600 border-purple-700 text-white'
            : state === 'ans'
              ? 'bg-green-500 border-green-600 text-white'
              : state === 'na'
                ? 'bg-red-500 border-red-600 text-white'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50';
    return `${base}${current ? ' ring-2 ring-blue-600 border-blue-600 z-10' : ''} ${colors}`;
}

/** The question text as LatexRenderer lays it out: lines joined with <br/>, tables in .table-wrapper. */
function QuestionText({ q }: { q: MiniMockQuestion }) {
    const lines: (string | 'table')[] = [q.lead, ...(q.statements ?? [])];
    if (q.table) lines.push('table');
    if (q.tail) lines.push(q.tail);
    return (
        <div className="latex-renderer-container font-medium text-slate-800">
            <span>
                {lines.map((line, i) =>
                    line === 'table' && q.table ? (
                        <div key="table" className="table-wrapper">
                            <button type="button" className="table-maximize-btn" title="Full Screen View" tabIndex={-1} aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 3 21 3 21 9" />
                                    <polyline points="9 21 3 21 3 15" />
                                    <line x1="21" y1="3" x2="14" y2="10" />
                                    <line x1="3" y1="21" x2="10" y2="14" />
                                </svg>
                            </button>
                            <div className="overflow-x-auto">
                                <table className="ng-qtable">
                                    <tbody>
                                        {[q.table.head, ...q.table.rows].map(([a, b]) => (
                                            <tr key={a}>
                                                <td>{a}</td>
                                                <td>{b}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <span key={i}>
                            {i > 0 && lines[i - 1] !== 'table' && <br />}
                            {line}
                        </span>
                    ),
                )}
            </span>
        </div>
    );
}

function Legend({ layout }: { layout: ExamLayout }) {
    const box = 'w-5 h-5 rounded-md text-[9px] flex items-center justify-center font-bold';
    return (
        <div className="mb-4">
            <div className={cn('grid grid-cols-2 mb-2 text-[10px] text-muted-foreground', layout === 'phone' ? 'gap-y-2' : 'gap-2')}>
                <div className="flex items-center gap-2">
                    <div className={`${box} bg-white border border-slate-200`}>1</div> Not Visited
                </div>
                <div className="flex items-center gap-2">
                    <div className={`${box} bg-red-500 border border-red-600 text-white`}>2</div> {layout === 'phone' ? 'Not Answered' : 'Not Ans'}
                </div>
                <div className="flex items-center gap-2">
                    <div className={`${box} bg-green-500 border border-green-600 text-white`}>3</div> Answered
                </div>
                <div className="flex items-center gap-2">
                    <div className={`${box} bg-purple-600 border border-purple-700 text-white`}>4</div> Review
                </div>
                <div className="flex items-center gap-2 relative">
                    <div className={`${box} bg-purple-600 border border-purple-700 text-white relative`}>
                        5
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full">
                            <CheckCircle className="w-2.5 h-2.5 text-green-500 fill-white" />
                        </div>
                    </div>
                    <span className={layout === 'phone' ? 'ml-2' : 'ml-2 leading-tight'}>Ans &amp; Review</span>
                </div>
            </div>
            <hr className="border-slate-200" />
        </div>
    );
}

export default function ExamScreen({
    layout,
    title,
    sections,
    current,
    question,
    selected,
    states,
    seconds,
    marks = { plus: 4, minus: 1 },
    timeHidden = false,
    sheetOpen = false,
    dialog = null,
    pressed = null,
    live = false,
    sheetBodyRef,
    onControl,
}: ExamScreenProps) {
    const phone = layout === 'phone';
    const tabsRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    useInert(sheetRef, !sheetOpen);
    const press = (c: Control) => (pressed === c ? ' is-pressed' : '');
    const fire = (c: Control) => () => onControl?.(c);
    const tab = live ? 0 : -1;

    let start = 0;
    const ranges = sections.map((s) => {
        const r = { ...s, start };
        start += s.count;
        return r;
    });
    const activeSection = ranges.findIndex((r) => current >= r.start && current < r.start + r.count);
    const number = current + 1;
    const critical = seconds < 300;
    const showTime = !timeHidden || critical;
    const answeredCount = states.filter(isAnswered).length;
    const markedCount = states.filter(isMarked).length;
    const marked = isMarked(states[current] ?? 'nv');

    // A new question starts at the top, and its section tab is brought into view.
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 });
    }, [current]);
    useEffect(() => {
        const strip = tabsRef.current;
        const el = strip?.children[activeSection] as HTMLElement | undefined;
        if (!strip || !el) return;
        const target = el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2;
        strip.scrollTo({ left: Math.max(0, target), behavior: live ? 'smooth' : 'auto' });
    }, [activeSection, live]);

    const timer = (
        <div
            className={cn(
                'flex items-center gap-1.5 rounded-full font-semibold border transition-colors',
                phone ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
                critical ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50/80 text-slate-600 border-slate-200',
            )}
        >
            <Clock className={cn('w-3.5 h-3.5', critical ? 'animate-pulse text-red-500' : 'text-slate-400')} />
            <span className={cn('text-center font-mono', phone ? 'min-w-[40px]' : 'min-w-[45px]')}>{showTime ? formatExamTime(seconds) : '**:**'}</span>
            <button
                type="button"
                tabIndex={tab}
                className="flex items-center justify-center p-0.5 rounded-full text-slate-400 hover:text-slate-600 disabled:opacity-50 transition-colors"
                onClick={fire('eye')}
                disabled={critical}
                title={critical ? 'Time cannot be hidden (less than 5m left)' : timeHidden ? 'Show Time' : 'Hide Time'}
            >
                {showTime ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
        </div>
    );

    const header = (
        <div
            className={cn(
                'bg-white border-b px-4 py-2.5 top-0 z-10 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] flex justify-between',
                phone ? 'relative flex-col items-start gap-2' : 'sticky px-5 flex-row items-center gap-0',
            )}
        >
            <div className={cn('flex items-center justify-between gap-0', phone ? 'w-full' : 'w-auto max-w-[40%] flex-1')}>
                <div className={cn('font-medium text-slate-400 tracking-wide truncate text-left', phone ? 'text-[13px]' : 'text-sm')}>{title}</div>
                {phone && (
                    <button type="button" tabIndex={tab} className="flex items-center justify-center p-1 rounded-full text-slate-400 transition-colors shrink-0 -mr-3" title="Enter Full Screen">
                        <Maximize className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
            <div className={cn('flex items-center', phone ? 'justify-between gap-1.5 w-full mt-0.5' : 'justify-end gap-3 w-auto')}>
                {!phone && (
                    <button type="button" tabIndex={tab} className="flex items-center justify-center p-1.5 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Enter Full Screen">
                        <Maximize className="w-4 h-4" />
                    </button>
                )}
                {timer}
                <span className="inline-block w-2 h-2 rounded-full transition-colors shrink-0 bg-emerald-400" title="Connected" />
                <button
                    type="button"
                    tabIndex={tab}
                    className={btn('ghost', 'sm', cn('rounded-full font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors', phone ? 'h-7 px-3 text-[11px]' : 'h-8 px-4 text-xs'))}
                >
                    Exit
                </button>
                <button
                    type="button"
                    tabIndex={tab}
                    onClick={fire('submit')}
                    className={
                        btn('destructive', 'sm', cn('rounded-full font-semibold shadow-sm overflow-hidden shrink-0', phone ? 'h-7 px-3 text-[11px] ml-auto' : 'h-8 px-4 text-xs ml-0')) +
                        press('submit')
                    }
                >
                    Submit Test
                </button>
            </div>
        </div>
    );

    const sectionTabs = (
        <div ref={tabsRef} className="flex-none flex gap-2 p-2 overflow-x-auto bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ranges.map((s, i) => (
                <button
                    key={s.name}
                    type="button"
                    tabIndex={tab}
                    title={s.name}
                    onClick={fire(`tab-${i}`)}
                    className={cn(
                        'flex items-center justify-between gap-2 px-4 py-2 text-sm font-bold border transition-colors whitespace-nowrap min-w-[140px]',
                        i === activeSection ? 'bg-[#0073E6] text-white border-[#0073E6]' : 'bg-white text-[#0073E6] border-slate-300 hover:bg-blue-50',
                    )}
                >
                    <span className="truncate">{s.name}</span>
                    <Info className={cn('w-4 h-4', i === activeSection ? 'text-white/80' : 'text-[#0073E6]/70')} />
                </button>
            ))}
        </div>
    );

    const options = (Object.entries(question.options) as [OptionKey, string][]).map(([key, text]) => {
        const on = selected === key;
        return (
            <div
                key={key}
                role={live ? 'button' : undefined}
                tabIndex={live ? 0 : undefined}
                aria-pressed={live ? on : undefined}
                onClick={fire(`opt-${key}`)}
                onKeyDown={(e) => {
                    if (live && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onControl?.(`opt-${key}`);
                    }
                }}
                className={
                    cn(
                        'flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all group relative',
                        on ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 bg-white',
                    ) + press(`opt-${key}`)
                }
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
                    <div className="text-slate-700 leading-relaxed max-w-[95%] break-words pt-0.5" style={{ fontSize: 16 }}>
                        <div className="latex-renderer-container font-medium text-slate-800">
                            <span>{text}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    });

    const questionArea = (
        <div className={cn('flex-1 w-full h-auto flex flex-col pb-4 py-1 overflow-y-visible overflow-x-hidden', phone ? 'gap-2 px-0' : 'gap-6 pr-2 pl-1 pt-1')}>
            <div className={cn('rounded-lg border text-card-foreground min-h-[500px] shadow-none border-none bg-transparent w-full h-auto block')}>
                <div className={cn('gap-2 flex flex-col h-auto', phone ? 'p-3' : 'p-4')}>
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">Question {number}</span>
                            <span className="inline-flex items-center rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">Single Choice</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="text-xs font-medium flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                <span className="text-emerald-700">+{marks.plus}</span>
                                <span className="text-slate-300">|</span>
                                <span className="text-red-600">-{marks.minus}</span>
                            </div>
                            <button type="button" tabIndex={tab} className={btn('ghost', 'icon', 'h-7 w-7 p-0 ml-1 text-slate-400 hover:text-red-500 hover:bg-red-50')} title="Report Issue">
                                <MessageSquareWarning className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <hr className="border-slate-200 mb-3" />
                    <div
                        className={cn(
                            'relative text-slate-800 font-medium leading-relaxed break-words py-4 rounded-lg tracking-wide [word-spacing:1.5px]',
                            phone ? 'px-2' : 'px-4',
                        )}
                        style={{ fontSize: 18 }}
                    >
                        <div className={cn('absolute flex items-center gap-0 opacity-10 z-10', phone ? '-top-4 -right-1' : '-top-4 -right-1')}>
                            <span className="p-1 text-slate-400">
                                <Minus className="w-3 h-3" />
                            </span>
                            <span className="p-1 text-slate-400">
                                <Plus className="w-3 h-3" />
                            </span>
                        </div>
                        <div className="overflow-x-auto max-w-full">
                            <QuestionText q={question} />
                        </div>
                    </div>
                    {question.figure === 'mitochondrion' && (
                        <div className="mb-8 flex justify-center">
                            <div className="max-w-full max-h-[400px] overflow-hidden rounded-lg border border-slate-200 shadow-sm bg-white">
                                <MitochondrionFigure />
                            </div>
                        </div>
                    )}
                    <div className="space-y-4 mt-6">
                        <div className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">Options</div>
                        {options}
                    </div>
                </div>
            </div>
        </div>
    );

    const bottomBar = (
        <div className="flex-none z-40 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-2 transition-all">
            <div className={cn('flex items-center justify-between', phone ? 'gap-2' : 'gap-4')}>
                <div className={cn('flex justify-between w-full', phone ? 'gap-2' : 'gap-3')}>
                    <button
                        type="button"
                        tabIndex={tab}
                        onClick={fire('back')}
                        disabled={current === 0}
                        title="Previous Question"
                        className={btn('outline', phone ? 'default' : 'icon', cn('h-9 w-9', phone ? 'flex-1' : 'flex-none')) + press('back')}
                    >
                        <ChevronLeft className={cn('w-6 h-6', phone ? 'mr-1' : 'mr-0')} />
                        {phone && <span>Back</span>}
                    </button>
                    <div className={cn('flex gap-2 justify-end', phone ? 'flex-[2]' : 'flex-none')}>
                        <button
                            type="button"
                            tabIndex={tab}
                            onClick={fire('clear')}
                            disabled={!selected}
                            className={btn('outline', 'sm', cn('h-9', phone ? 'text-muted-foreground border-dashed' : 'text-slate-600 hover:text-slate-900')) + press('clear')}
                        >
                            <span>Clear</span>
                        </button>
                        {phone ? (
                            <button
                                type="button"
                                tabIndex={tab}
                                onClick={fire('flag')}
                                title="Flag Question"
                                className={
                                    btn(
                                        marked ? 'secondary' : 'outline',
                                        'sm',
                                        cn(
                                            'h-9 px-3 transition-all',
                                            selected
                                                ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600'
                                                : marked
                                                  ? 'border-purple-200 bg-purple-50 text-purple-800'
                                                  : 'text-slate-600 border-slate-200',
                                        ),
                                    ) + press('flag')
                                }
                            >
                                <Flag className={cn('w-4 h-4', marked && 'fill-current')} />
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    tabIndex={tab}
                                    onClick={fire('review')}
                                    title="Mark for Review"
                                    className={
                                        btn(
                                            marked ? 'secondary' : 'ghost',
                                            'sm',
                                            cn('flex', marked ? 'border-purple-200 bg-purple-50 text-purple-800' : 'text-slate-600 hover:text-slate-900'),
                                        ) + press('review')
                                    }
                                >
                                    <Flag className={cn('w-4 h-4', marked && 'mr-2 fill-purple-500 text-purple-500')} />
                                    <span>Review</span>
                                </button>
                                <button
                                    type="button"
                                    tabIndex={tab}
                                    onClick={fire('ansrev')}
                                    disabled={!selected}
                                    className={
                                        btn(
                                            'default',
                                            'sm',
                                            cn('flex px-4 py-1 h-9 text-white transition-all', !selected ? 'bg-purple-300 cursor-not-allowed opacity-70' : 'bg-purple-600 hover:bg-purple-700'),
                                        ) + press('ansrev')
                                    }
                                >
                                    <span>Ans &amp; Review</span>
                                </button>
                            </>
                        )}
                        <button
                            type="button"
                            tabIndex={tab}
                            onClick={fire('save')}
                            className={btn('default', 'sm', cn('bg-[#0073E6] hover:bg-[#005fb8] text-white h-9', phone ? 'px-3' : 'px-4 py-1')) + press('save')}
                        >
                            {phone ? <span>Save &amp; Next</span> : <span className="mr-2">Save &amp; Next</span>}
                            <ChevronRight className={cn('w-4 h-4', phone ? 'ml-0.5' : 'ml-0')} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const palette = (
        <div className="space-y-4">
            {ranges.map((s) => (
                <div key={s.name} className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.name}</h4>
                    <div className="grid grid-cols-5 gap-2">
                        {Array.from({ length: s.count }, (_, k) => {
                            const i = s.start + k;
                            const st = states[i] ?? 'nv';
                            return (
                                <button key={i} type="button" tabIndex={tab} onClick={fire(`pal-${i}`)} className={pillClass(st, i === current) + press(`pal-${i}`)}>
                                    {i + 1}
                                    {st === 'revans' && (
                                        <div className="absolute -bottom-1 -right-1">
                                            <CheckCircle className="w-3 h-3 text-green-500 fill-white" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
            <div className="pt-4 pb-2">
                <div className="flex items-center gap-2">
                    <div className="h-px bg-slate-200 flex-1" />
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">End of Test</span>
                    <div className="h-px bg-slate-200 flex-1" />
                </div>
            </div>
        </div>
    );

    const sectionRows = ranges.map((s) => {
        const slice = states.slice(s.start, s.start + s.count);
        const secAnswered = slice.filter(isAnswered).length;
        const secMarked = slice.filter(isMarked).length;
        return { ...s, secAnswered, secMarked, secUnanswered: Math.max(0, s.count - secAnswered) };
    });

    const submitDialog = dialog === 'submit' && (
        <>
            <div className="absolute inset-0 z-50 bg-black/80" onClick={fire('cancel')} />
            <div
                role="alertdialog"
                aria-modal="true"
                aria-label="Submit Test?"
                className={cn(
                    'ng-dialog absolute left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg flex flex-col p-0 overflow-hidden gap-0',
                    phone ? 'max-w-md max-h-[90%]' : 'max-w-xl max-h-[92%] rounded-lg',
                )}
            >
                <div className={cn('flex flex-col space-y-2 p-5 pb-3 border-b border-slate-100', phone ? 'text-center' : 'text-left')}>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                        <CheckCircle className="w-5 h-5 text-primary" /> Submit Test?
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Are you sure you want to finish the test? You cannot change your answers after submitting.</p>
                </div>
                <div className={cn('p-5 space-y-4 overflow-y-auto', phone ? 'max-h-[470px]' : 'max-h-[300px]')}>
                    <div className={cn('grid gap-2.5 text-sm', phone ? 'grid-cols-2' : 'grid-cols-4')}>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-center">
                            <div className="text-[11px] text-slate-500 uppercase font-semibold tracking-wider mb-0.5">Total Questions</div>
                            <div className="text-xl font-extrabold text-slate-800">{states.length}</div>
                        </div>
                        <div className="bg-emerald-50/80 p-3 rounded-lg border border-emerald-200/80 text-center">
                            <div className="text-[11px] text-emerald-600 uppercase font-semibold tracking-wider mb-0.5">Answered</div>
                            <div className="text-xl font-extrabold text-emerald-700">{answeredCount}</div>
                        </div>
                        <div className="bg-purple-50/80 p-3 rounded-lg border border-purple-200/80 text-center">
                            <div className="text-[11px] text-purple-600 uppercase font-semibold tracking-wider mb-0.5">Marked for Review</div>
                            <div className="text-xl font-extrabold text-purple-700">{markedCount}</div>
                        </div>
                        <div className="bg-rose-50/80 p-3 rounded-lg border border-rose-200/80 text-center">
                            <div className="text-[11px] text-rose-600 uppercase font-semibold tracking-wider mb-0.5">Unanswered</div>
                            <div className="text-xl font-extrabold text-rose-700">{Math.max(0, states.length - answeredCount)}</div>
                        </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-primary" /> Section Breakdown
                            </span>
                            <span className="text-xs text-slate-400 font-medium">{sections.length} Sections</span>
                        </div>
                        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                            {sectionRows.map((s) => (
                                <div key={s.name} className="p-3 bg-slate-50/50 border border-slate-200/80 rounded-lg space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-800 text-sm">{s.name}</span>
                                        <span className="text-slate-500 font-medium text-xs">
                                            {s.secAnswered} / {s.count} Attempted
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
                                            Answered: <strong>{s.secAnswered}</strong>
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 font-medium">
                                            Review: <strong>{s.secMarked}</strong>
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/60 font-medium">
                                            Unanswered: <strong>{s.secUnanswered}</strong>
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden flex">
                                        <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${s.count ? (s.secAnswered / s.count) * 100 : 0}%` }} />
                                        <div className="bg-purple-500 h-full transition-all duration-300" style={{ width: `${s.count ? (s.secMarked / s.count) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className={cn('p-4 border-t border-slate-100 bg-slate-50/50 flex flex-row items-center justify-end gap-2', !phone && 'space-x-2')}>
                    <button type="button" tabIndex={tab} onClick={fire('cancel')} className={btn('outline', 'default', 'mt-0') + press('cancel')}>
                        Cancel
                    </button>
                    <button type="button" tabIndex={tab} onClick={fire('confirm')} className={btn('default', 'default', 'bg-primary hover:bg-primary/90 text-white font-semibold') + press('confirm')}>
                        Yes, Submit
                    </button>
                </div>
            </div>
        </>
    );

    const timeUpDialog = dialog === 'timeup' && (
        <>
            <div className="absolute inset-0 z-50 bg-black/80" />
            <div
                role="alertdialog"
                aria-modal="true"
                aria-label="Time's Up!"
                className={cn(
                    'ng-dialog absolute left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg',
                    !phone && 'rounded-lg',
                )}
            >
                <div className={cn('flex flex-col space-y-2', phone ? 'text-center' : 'text-left')}>
                    <h2 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                        <Clock className="w-5 h-5" /> Time&rsquo;s Up!
                    </h2>
                    <p className="text-sm text-muted-foreground">The time allocated for this test has expired. Please submit your answers to see your result.</p>
                </div>
                <div className={cn('flex', phone ? 'flex-col-reverse' : 'flex-row justify-end space-x-2')}>
                    <button type="button" tabIndex={tab} onClick={fire('confirm')} className={btn('default', 'default', '')}>
                        Submit Test
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <div className={cn('ng-screen relative h-full overflow-hidden bg-slate-50 text-slate-900 flex flex-col', live && 'is-live')}>
            {header}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-row relative">
                <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative transition-all duration-300 ease-in-out">
                    <div ref={scrollRef} className="flex-1 flex flex-col min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {!phone && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-50 translate-x-1/2">
                                <span className={btn('secondary', 'icon', 'h-8 w-8 rounded-full shadow-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600')}>
                                    <ChevronRight className="w-4 h-4" />
                                </span>
                            </div>
                        )}
                        {sectionTabs}
                        {questionArea}
                    </div>
                    {bottomBar}
                </div>
                {!phone && (
                    <>
                        <div className="w-1 z-50 bg-transparent" />
                        <div className="flex-none h-full overflow-hidden border-l flex flex-col" style={{ width: 320 }}>
                            <div className="rounded-lg border bg-white text-card-foreground h-full flex flex-col shadow-md border-t-4 border-t-slate-500 border-x border-b">
                                <div className="p-4 flex-1 overflow-y-auto overflow-x-hidden">
                                    <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">Question Palette</h3>
                                    <Legend layout="desktop" />
                                    {palette}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {phone && (
                <>
                    <div className="absolute bottom-[55px] right-0 z-40">
                        <button
                            type="button"
                            tabIndex={tab}
                            onClick={fire('fab')}
                            aria-label="Question palette"
                            className={btn('default', 'icon', 'h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-transform hover:scale-105') + press('fab')}
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                    </div>
                    <div
                        className={cn('ng-sheet-overlay absolute inset-0 z-50 bg-black/80', sheetOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')}
                        onClick={fire('close-sheet')}
                    />
                    <div
                        ref={sheetRef}
                        role="dialog"
                        aria-label="Questions"
                        aria-hidden={!sheetOpen}
                        className={cn(
                            'ng-sheet absolute z-50 gap-4 bg-background p-6 shadow-lg inset-y-0 right-0 h-full border-l w-[80%] flex flex-col',
                            sheetOpen ? 'translate-x-0' : 'translate-x-full',
                        )}
                    >
                        <button type="button" tabIndex={sheetOpen ? tab : -1} onClick={fire('close-sheet')} className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </button>
                        <div className="flex flex-col space-y-2 text-center">
                            <h2 className="text-lg font-semibold text-foreground">Questions</h2>
                        </div>
                        <div ref={sheetBodyRef} className="py-4 flex-1 overflow-y-auto pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <Legend layout="phone" />
                            {palette}
                        </div>
                    </div>
                </>
            )}

            {submitDialog}
            {timeUpDialog}
        </div>
    );
}
