import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TestSection, Question } from '@/lib/testsApi';
import { ChevronRight, ChevronUp, ChevronDown, Map as MapIcon } from 'lucide-react';

interface TestBuilderMinimapProps {
    sections?: TestSection[];
    questions?: Question[];
    mode?: 'section' | 'standard';
    /** Question ids that still need something before the test can be saved. */
    issueIds?: Set<string>;
}

/*
 * A VS Code–style overview of the whole test. Questions are rendered as real text at
 * normal size and scaled down to ~20%, so the minimap has the same shape as the page:
 * long questions are long, passages stand out, correct options are green. The grey
 * slider is the part of the page currently on screen — drag it, or click anywhere.
 */

const PANEL_WIDTH = 112;
const PAD_X = 8;
const SCALE = 0.2;
const CONTENT_WIDTH = (PANEL_WIDTH - PAD_X * 2) / SCALE;

/** LaTeX and markdown down to plain characters — only the shape of the text matters here. */
function plain(text: unknown, max: number): string {
    if (typeof text !== 'string') return '';
    return text
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '▢▢▢')
        .replace(/<[^>]*>/g, '')
        .replace(/\\[a-zA-Z]+/g, ' ')
        .replace(/[${}\\^_]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}

const isCorrect = (q: Question, key: string) =>
    Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(key) : q.correctAnswer === key;

interface Anchor { page: number; mini: number }

export const TestBuilderMinimap: React.FC<TestBuilderMinimapProps> = ({
    sections = [],
    questions = [],
    mode = 'standard',
    issueIds,
}) => {
    const [collapsed, setCollapsed] = useState(false);
    const [slider, setSlider] = useState({ top: 0, height: 0 });
    const [miniScroll, setMiniScroll] = useState(0);
    const [contentHeight, setContentHeight] = useState(0);
    const viewportRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const anchorsRef = useRef<Anchor[]>([]);
    const dragRef = useRef<{ grabOffset: number } | null>(null);
    const frameRef = useRef(0);

    const safeSections = Array.isArray(sections) ? sections.filter(Boolean) : [];
    const safeQuestions = Array.isArray(questions) ? questions.filter(Boolean) : [];
    const totalQuestions = mode === 'section'
        ? safeSections.reduce((acc, s) => acc + (Array.isArray(s.questions) ? s.questions.filter(Boolean).length : 0), 0)
        : safeQuestions.length;

    /** Pairs each question's position on the page with its position in the minimap. */
    const measure = useCallback(() => {
        const inner = innerRef.current;
        const viewport = viewportRef.current;
        if (!inner || !viewport) return;

        const miniHeight = inner.offsetHeight * SCALE;
        const docHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight + 1);
        const anchors: Anchor[] = [{ page: 0, mini: 0 }];
        inner.querySelectorAll<HTMLElement>('[data-mini-id]').forEach(block => {
            const id = block.dataset.miniId;
            const pageEl = document.querySelector<HTMLElement>(`[data-minimap-id="${CSS.escape(id || '')}"]`);
            if (!pageEl) return;
            const r = pageEl.getBoundingClientRect();
            const top = r.top + window.scrollY;
            const last = anchors[anchors.length - 1];
            const miniTop = block.offsetTop * SCALE;
            const miniBottom = (block.offsetTop + block.offsetHeight) * SCALE;
            if (top > last.page && miniTop >= last.mini) anchors.push({ page: top, mini: miniTop });
            const bottom = top + r.height;
            if (bottom > anchors[anchors.length - 1].page) anchors.push({ page: bottom, mini: Math.max(miniBottom, anchors[anchors.length - 1].mini) });
        });
        const tail = anchors[anchors.length - 1];
        anchors.push({ page: Math.max(docHeight, tail.page + 1), mini: Math.max(miniHeight, tail.mini) });
        anchorsRef.current = anchors;

        const toMini = (y: number) => {
            for (let i = 1; i < anchors.length; i++) {
                const a = anchors[i - 1], b = anchors[i];
                if (y <= b.page) return a.mini + ((y - a.page) / (b.page - a.page || 1)) * (b.mini - a.mini);
            }
            return anchors[anchors.length - 1].mini;
        };

        const top = toMini(window.scrollY);
        const bottom = toMini(window.scrollY + window.innerHeight);
        const overflow = Math.max(0, miniHeight - viewport.clientHeight);
        const progress = window.scrollY / Math.max(1, docHeight - window.innerHeight);
        setMiniScroll(overflow * Math.min(1, Math.max(0, progress)));
        setSlider({ top, height: Math.max(14, bottom - top) });
        setContentHeight(miniHeight);
    }, []);

    const schedule = useCallback(() => {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(measure);
    }, [measure]);

    useEffect(() => {
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule, { passive: true });
        const ro = new ResizeObserver(schedule);
        ro.observe(document.body);
        return () => {
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            ro.disconnect();
            cancelAnimationFrame(frameRef.current);
        };
    }, [schedule]);

    useLayoutEffect(() => {
        if (!collapsed) schedule();
    }, [sections, questions, mode, collapsed, schedule]);

    /** Minimap y (in its own coordinates) → page scroll position. */
    const toPage = (mini: number) => {
        const anchors = anchorsRef.current;
        for (let i = 1; i < anchors.length; i++) {
            const a = anchors[i - 1], b = anchors[i];
            if (mini <= b.mini) return a.page + ((mini - a.mini) / (b.mini - a.mini || 1)) * (b.page - a.page);
        }
        return anchors.length ? anchors[anchors.length - 1].page : 0;
    };

    const pointerMini = (clientY: number) => {
        const rect = viewportRef.current?.getBoundingClientRect();
        return rect ? clientY - rect.top + miniScroll : 0;
    };

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        const y = pointerMini(e.clientY);
        const onSlider = y >= slider.top && y <= slider.top + slider.height;
        // Clicking outside the slider jumps there first (centred), then the drag continues from it.
        const grabOffset = onSlider ? y - slider.top : slider.height / 2;
        if (!onSlider) window.scrollTo({ top: Math.max(0, toPage(y - grabOffset)), behavior: 'auto' });
        dragRef.current = { grabOffset };
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        e.preventDefault();
    };

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragRef.current) return;
        const y = pointerMini(e.clientY) - dragRef.current.grabOffset;
        window.scrollTo({ top: Math.max(0, toPage(y)), behavior: 'auto' });
    };

    const endDrag = () => { dragRef.current = null; };

    if (totalQuestions === 0) return null;

    const renderQuestion = (q: Question, number: number, prevGroup?: string) => {
        const id = String(q.id);
        const flagged = issueIds?.has(id);
        const keys = q.options && q.type !== 'numerical' ? Object.keys(q.options).sort() : [];
        const startsPassage = !!q.groupId && q.groupId !== prevGroup;
        return (
            <div key={id} data-mini-id={id} className="relative mb-5 pl-6">
                {flagged && <span className="absolute left-0 top-0 h-full w-[10px] rounded-full bg-amber-400" />}
                {startsPassage && q.passageContent && (
                    <p className="mb-1.5 text-violet-600">{plain(q.passageContent, 420)}</p>
                )}
                <p className="text-slate-800">
                    <span className="font-black text-sky-600">Q{number} </span>
                    {plain(q.question, 300) || <span className="text-slate-400">··················</span>}
                </p>
                {q.image && <div className="my-1 h-10 w-40 rounded bg-slate-300" />}
                {keys.map(k => (
                    <p key={k} className={isCorrect(q, k) ? 'text-emerald-600' : 'text-slate-500'}>
                        <span className="font-bold">{k} </span>
                        {plain(q.options?.[k], 90) || '·········'}
                    </p>
                ))}
                {q.type === 'numerical' && <p className="text-emerald-600">= ·····</p>}
            </div>
        );
    };

    const body = mode === 'section'
        ? safeSections.map((sec, sIdx) => {
            const qs = Array.isArray(sec.questions) ? sec.questions.filter(Boolean) : [];
            return (
                <div key={sec.id || sIdx} className="mb-6">
                    <p className="mb-3 border-b-[6px] border-amber-300 pb-1 text-[26px] font-black uppercase text-amber-700">
                        {sec.name || `Section ${sIdx + 1}`}
                    </p>
                    {qs.map((q, i) => renderQuestion(q, i + 1, qs[i - 1]?.groupId))}
                </div>
            );
        })
        : safeQuestions.map((q, i) => renderQuestion(q, i + 1, safeQuestions[i - 1]?.groupId));

    if (collapsed) {
        return (
            <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="fixed right-0 top-1/2 z-30 hidden -translate-y-1/2 items-center gap-1 rounded-l-xl bg-white/90 py-3 pl-2 pr-1.5 text-[12px] font-semibold text-slate-600 shadow-md ring-1 ring-slate-900/10 backdrop-blur hover:text-sky-700 lg:flex [body[data-sypad-open]_&]:hidden"
                title="Show the question map"
            >
                <MapIcon className="h-4 w-4" />
            </button>
        );
    }

    return (
        <aside
            aria-label="Question map"
            className="fixed bottom-3 right-2 top-[76px] z-30 hidden flex-col overflow-hidden rounded-2xl bg-white/85 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_32px_-18px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/[0.07] backdrop-blur-md lg:flex"
            style={{ width: PANEL_WIDTH }}
        >
            <div className="flex h-9 shrink-0 items-center gap-0.5 border-b border-slate-100 pl-2.5 pr-1">
                <span className="flex min-w-0 flex-1 items-center gap-1 text-[12px] font-semibold tabular-nums text-slate-700" title={`${totalQuestions} questions`}>
                    {totalQuestions}<span className="font-medium text-slate-400">Q</span>
                    {issueIds && issueIds.size > 0 && (
                        <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-bold text-amber-700" title={`${issueIds.size} need attention`}>{issueIds.size}</span>
                    )}
                </span>
                <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Go to top" aria-label="Go to top">
                    <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Go to bottom" aria-label="Go to bottom">
                    <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => setCollapsed(true)} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Hide the map" aria-label="Hide the question map">
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </div>

            <div
                ref={viewportRef}
                className="relative flex-1 cursor-pointer touch-none overflow-hidden"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
            >
                <div style={{ transform: `translateY(${-miniScroll}px)`, height: contentHeight }} className="relative">
                    <div
                        ref={innerRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute left-0 top-0 break-words font-mono text-[15px] font-bold leading-[1.3]"
                        style={{ width: CONTENT_WIDTH, transform: `scale(${SCALE})`, transformOrigin: 'top left', padding: `${PAD_X / SCALE}px ${PAD_X / SCALE}px 0` }}
                    >
                        {body}
                    </div>
                    <div
                        className="absolute inset-x-0 rounded-[3px] bg-slate-500/[0.14] ring-1 ring-inset ring-slate-500/10 transition-colors hover:bg-slate-500/25"
                        style={{ top: slider.top, height: slider.height }}
                    />
                </div>
            </div>
        </aside>
    );
};
