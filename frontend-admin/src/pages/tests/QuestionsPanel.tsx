/**
 * Admin → Manage Tests → Questions. Reads a test's paper — every question, option,
 * picture, passage, the correct answer and any uploaded solution — without opening the
 * exam, so nothing is started, saved or shown to the creator as an attempt.
 *
 * One read of GET /api/tests/{id} (admins get the answer key and `solutions` in it;
 * see backend app/routers/tests/read.py `_may_see_answers`). Read-only: no edits here.
 */
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Eye, EyeOff, Image as ImageIcon, X } from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import LatexRenderer from '@/components/ui/LatexRenderer';
import { fetchTestById, type Question } from '@/lib/testsApi';
import { cn } from '@/lib/utils';
import { ErrorState } from '../analytics/shared';
import { CARD, Chip, Skeleton } from '../analytics/ui';

type Num = number | string | undefined | null;
interface Part { id: string; name?: string; marks?: Num; negative?: Num; questions: Question[] }

const TYPE_LABEL: Record<string, string> = {
    single: 'Single correct',
    'single-advance': 'Single correct',
    multiple: 'Multiple correct',
    numerical: 'Numerical',
    comprehension: 'Passage',
};

const asNum = (v: Num) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

/** Flat tests become one unnamed part, so both kinds render the same way. */
function partsOf(test: any): Part[] {
    if (test?.enable_section_mode && Array.isArray(test.sections) && test.sections.length) {
        return test.sections.map((s: any, i: number) => ({
            id: String(s.id ?? i),
            name: s.name || `Section ${i + 1}`,
            marks: s.marks_per_question ?? test.marks_per_question,
            negative: s.negative_marks ?? test.negative_marks,
            questions: Array.isArray(s.questions) ? s.questions : [],
        }));
    }
    return [{ id: 'all', marks: test?.marks_per_question, negative: test?.negative_marks, questions: Array.isArray(test?.questions) ? test.questions : [] }];
}

function correctSet(q: Question): Set<string> {
    const a = q.correctAnswer as any;
    if (Array.isArray(a)) return new Set(a.map(String));
    if (typeof a === 'string' || typeof a === 'number') return new Set([String(a)]);
    return new Set();
}

function numericalAnswer(q: Question): string {
    const a = q.correctAnswer as any;
    if (!a || typeof a !== 'object') return a === undefined || a === null || a === '' ? '—' : String(a);
    if (a.exactMatch) return a.exactAnswers ? String(a.exactAnswers).split(/[,;]\s*/).filter(Boolean).join(' or ') : '—';
    if (a.min === undefined && a.max === undefined) return '—';
    return String(a.min) === String(a.max) ? String(a.min) : `${a.min} to ${a.max}`;
}

const isImg = (src?: string) => !!src && /^(https?:|data:image\/|blob:|\/)/i.test(src.trim());

export default function QuestionsPanel({ test, onClose }: { test: { id: string; title: string }; onClose: () => void }) {
    const [answers, setAnswers] = useState(true);
    const scroller = useRef<HTMLDivElement>(null);

    const { data, error, refetch } = useQuery({
        queryKey: ['tests', 'paper', test.id],
        queryFn: async () => {
            // Straight from the server: the editor's cached copy may be minutes old.
            const r = await fetchTestById(test.id, undefined, false, true);
            if (r.error || !r.data) throw r.error || new Error('Test not found');
            return r.data as any;
        },
        staleTime: 60_000,
    });

    const parts = useMemo(() => (data ? partsOf(data) : []), [data]);
    const total = parts.reduce((a, p) => a + p.questions.length, 0);
    const solutions: Record<string, string> = (data?.solutions && typeof data.solutions === 'object') ? data.solutions : {};
    const solved = Object.values(solutions).filter((s) => typeof s === 'string' && s.trim()).length;

    const jump = (id: string) => {
        const el = scroller.current?.querySelector<HTMLElement>(`[data-part="${id}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    let n = 0;
    return (
        <Sheet open onOpenChange={(o) => !o && onClose()}>
            <SheetContent className="flex w-full flex-col gap-0 overflow-hidden bg-slate-50 p-0 sm:max-w-full md:max-w-3xl [&>button]:hidden">
                {/* ── Header ── */}
                <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 pb-3 pt-4 sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700">Questions · view only</p>
                            <SheetTitle className="mt-0.5 line-clamp-2 !text-[17px] font-semibold leading-snug tracking-[-0.01em] text-slate-900">{test.title}</SheetTitle>
                            <SheetDescription className="mt-0.5 text-[12px] text-slate-500">
                                {data
                                    ? [data.custom_id ? `#${data.custom_id}` : null, `${total} question${total === 1 ? '' : 's'}`,
                                        parts.length > 1 ? `${parts.length} sections` : null,
                                        data.duration ? `${data.duration} min` : null,
                                        solved ? `${solved} with solutions` : null].filter(Boolean).join(' · ')
                                    : 'Loading the paper…'}
                            </SheetDescription>
                        </div>
                        <button type="button" onClick={onClose} aria-label="Close"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-slate-600 transition-colors hover:bg-slate-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => setAnswers((a) => !a)} aria-pressed={answers}
                            className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold ring-1 ring-inset transition-colors',
                                answers ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 hover:bg-emerald-100' : 'bg-white text-slate-600 ring-slate-900/10 hover:bg-slate-50')}>
                            {answers ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            {answers ? 'Answers shown' : 'Answers hidden'}
                        </button>
                        {parts.length > 1 && parts.map((p) => (
                            <button key={p.id} type="button" onClick={() => jump(p.id)}
                                className="inline-flex h-8 max-w-[180px] items-center truncate rounded-full bg-slate-100 px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-200">
                                {p.name} <span className="ml-1 text-slate-400">{p.questions.length}</span>
                            </button>
                        ))}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">Reading the paper here doesn’t start an attempt — the creator sees nothing.</p>
                </div>

                {/* ── Paper ── */}
                <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
                    {error && !data ? (
                        <ErrorState error={error} onRetry={() => refetch()} />
                    ) : !data ? (
                        <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-40" />)}</div>
                    ) : total === 0 ? (
                        <div className={cn(CARD, 'p-6 text-center text-[14px] text-slate-500')}>This test has no questions yet.</div>
                    ) : (
                        <div className="space-y-6">
                            {parts.map((p) => (
                                <section key={p.id} data-part={p.id} className="scroll-mt-2 space-y-3">
                                    {p.name && (
                                        <h3 className="px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                            {p.name} <span className="font-normal normal-case tracking-normal text-slate-400">· {p.questions.length} question{p.questions.length === 1 ? '' : 's'}</span>
                                        </h3>
                                    )}
                                    {p.questions.map((q, i) => {
                                        n += 1;
                                        const prev = p.questions[i - 1];
                                        const passage = q.passageContent?.trim() && (!prev || prev.passageContent !== q.passageContent || (q.groupId && prev.groupId !== q.groupId))
                                            ? q.passageContent : null;
                                        return (
                                            <React.Fragment key={`${p.id}-${q.id ?? i}-${i}`}>
                                                {passage && <Passage text={passage} />}
                                                <QuestionCard q={q} n={n} part={p} answers={answers}
                                                    solution={solutions[String(q.id)] || (q as any).explanation || (q as any).solution || ''} />
                                            </React.Fragment>
                                        );
                                    })}
                                </section>
                            ))}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

function Passage({ text }: { text: string }) {
    return (
        <div className="rounded-2xl bg-amber-50/70 p-4 ring-1 ring-inset ring-amber-600/15">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-800">Passage</p>
            <LatexRenderer className="text-[14px] leading-relaxed text-slate-800">{text}</LatexRenderer>
        </div>
    );
}

function QuestionCard({ q, n, part, answers, solution }: { q: Question; n: number; part: Part; answers: boolean; solution: string }) {
    const [showSolution, setShowSolution] = useState(false);
    const type = q.type || 'single';
    const correct = correctSet(q);
    const marks = asNum(q.marks) ?? asNum(part.marks);
    const negative = asNum(q.negativeMarks) ?? asNum(part.negative);
    const keys = q.options ? Object.keys(q.options) : [];
    const noKey = type !== 'numerical' && correct.size === 0;

    return (
        <article className={cn(CARD, 'p-4')}>
            <header className="flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 inline-flex h-6 min-w-[2rem] items-center justify-center rounded-md bg-slate-900 px-1.5 text-[12px] font-bold tabular-nums text-white">Q{n}</span>
                <Chip tone="slate">{TYPE_LABEL[type] || type}</Chip>
                {marks !== null && (
                    <Chip tone="sky">+{marks}{negative ? ` / −${Math.abs(negative)}` : ''}</Chip>
                )}
                {q.topic && <Chip tone="violet" className="max-w-[200px] truncate">{q.topic}</Chip>}
                {answers && noKey && <Chip tone="rose">No answer set</Chip>}
            </header>

            <div className="mt-3 text-[15px] leading-relaxed text-slate-900">
                {q.question?.trim() ? <LatexRenderer>{q.question}</LatexRenderer> : !q.image && <span className="italic text-slate-400">No question text</span>}
            </div>
            {q.image && <Picture src={q.image} alt={`Question ${n} picture`} className="mt-3 max-h-80" />}

            {type === 'numerical' ? (
                <div className={cn('mt-3 rounded-xl px-3 py-2.5 text-[14px]', answers ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-600/20' : 'bg-slate-50')}>
                    <span className="text-slate-500">Answer: </span>
                    {answers ? <span className="font-semibold text-emerald-800">{numericalAnswer(q)}</span> : <span className="text-slate-400">hidden</span>}
                </div>
            ) : (
                <ol className="mt-3 space-y-1.5">
                    {keys.map((k) => {
                        const right = answers && correct.has(k);
                        const img = q.optionImages?.[k];
                        return (
                            <li key={k}
                                className={cn('flex items-start gap-2.5 rounded-xl px-3 py-2 ring-1 ring-inset',
                                    right ? 'bg-emerald-50 ring-emerald-600/25' : 'bg-white ring-slate-900/[0.07]')}>
                                <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                                    right ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600')}>
                                    {right ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-label={`${k}, correct`} /> : k}
                                </span>
                                <div className={cn('min-w-0 flex-1 text-[14px] leading-relaxed', right ? 'font-medium text-emerald-900' : 'text-slate-800')}>
                                    {right && <span className="mr-1 font-bold">{k}.</span>}
                                    {q.options?.[k]?.trim() ? <LatexRenderer className={cn('inline', right ? 'font-semibold text-emerald-900' : 'font-normal')}>{q.options[k]}</LatexRenderer> : !img && <span className="italic text-slate-400">Empty</span>}
                                    {img && <Picture src={img} alt={`Option ${k} picture`} className="mt-1.5 max-h-48" />}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}

            {answers && correct.size > 1 && (
                <p className="mt-2 text-[12px] text-slate-500">
                    Correct: {[...correct].join(', ')}{q.partialMarking === 'per_option' ? ' · JEE Advanced partial marking' : ''}
                </p>
            )}

            {answers && solution.trim() && (
                <div className="mt-3 border-t border-slate-100 pt-2">
                    <button type="button" onClick={() => setShowSolution((s) => !s)} aria-expanded={showSolution}
                        className="inline-flex items-center gap-1 text-[13px] font-semibold text-sky-700 hover:text-sky-800">
                        <ChevronDown className={cn('h-4 w-4 transition-transform', showSolution && 'rotate-180')} />
                        {showSolution ? 'Hide solution' : 'Solution'}
                    </button>
                    {showSolution && (
                        <div className="mt-2 rounded-xl bg-slate-50 p-3 text-[14px] leading-relaxed text-slate-800">
                            <LatexRenderer>{solution}</LatexRenderer>
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}

function Picture({ src, alt, className }: { src: string; alt: string; className?: string }) {
    const [broken, setBroken] = useState(false);
    if (!isImg(src) || broken) {
        return (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[12px] text-slate-500">
                <ImageIcon className="h-3.5 w-3.5" /> Picture couldn’t load
            </p>
        );
    }
    return (
        <a href={src.trim()} target="_blank" rel="noopener noreferrer" className="block w-fit" title="Open full size">
            <img src={src.trim()} alt={alt} loading="lazy" onError={() => setBroken(true)}
                className={cn('w-auto max-w-full rounded-lg border border-slate-200 bg-white object-contain', className)} />
        </a>
    );
}
