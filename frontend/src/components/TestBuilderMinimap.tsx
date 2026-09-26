import React, { useState, useEffect, useRef } from 'react';
import { TestSection, Question } from '@/lib/testsApi';
import {
    Layers,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Image as ImageIcon
} from 'lucide-react';

interface TestBuilderMinimapProps {
    sections?: TestSection[];
    questions?: Question[];
    mode?: 'section' | 'standard';
    activeQuestionId?: string | number;
    onSelectQuestion?: (questionId: string | number) => void;
    issueIds?: Set<string>;
}

/** Clean HTML, image markdown, and LaTeX syntax down to a readable plain text snippet */
function cleanSnippet(text: unknown, maxLen = 75): string {
    if (typeof text !== 'string') return '';
    return text
        .replace(/<[^>]*>/g, '') // remove HTML tags
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '[img]') // image markdown
        .replace(/\[\/?(latex|katex)\]/gi, '')
        .replace(/\\times/g, '×')
        .replace(/\\div/g, '÷')
        .replace(/\\pm/g, '±')
        .replace(/\\approx/g, '≈')
        .replace(/\\ne(q)?/g, '≠')
        .replace(/\\le(q)?/g, '≤')
        .replace(/\\ge(q)?/g, '≥')
        .replace(/\\alpha/g, 'α')
        .replace(/\\beta/g, 'β')
        .replace(/\\theta/g, 'θ')
        .replace(/\\pi/g, 'π')
        .replace(/\\infty/g, '∞')
        .replace(/\$([^\$]+)\$/g, '$1')
        .replace(/\\[a-zA-Z]+/g, ' ')
        .replace(/[\\{}]/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLen);
}

export const TestBuilderMinimap: React.FC<TestBuilderMinimapProps> = ({
    sections = [],
    questions = [],
    mode = 'standard',
    activeQuestionId,
    onSelectQuestion,
    issueIds
}) => {
    const [collapsed, setCollapsed] = useState<boolean>(false);
    const [activeId, setActiveId] = useState<string | number | null>(null);

    const minimapRef = useRef<HTMLDivElement>(null);
    const minimapScrollRef = useRef<HTMLDivElement>(null);

    // Safely calculate total question count
    const safeSections = Array.isArray(sections) ? sections : [];
    const safeQuestions = Array.isArray(questions) ? questions.filter(Boolean) : [];

    const totalQuestions = mode === 'section'
        ? safeSections.reduce((acc, s) => acc + (Array.isArray(s?.questions) ? s.questions.filter(Boolean).length : 0), 0)
        : safeQuestions.length;

    const prevTotalQuestionsRef = useRef<number>(totalQuestions);

    // 1. Auto scroll minimap container to bottom when new questions are added / generated
    useEffect(() => {
        if (totalQuestions > prevTotalQuestionsRef.current) {
            if (minimapScrollRef.current) {
                setTimeout(() => {
                    if (minimapScrollRef.current) {
                        minimapScrollRef.current.scrollTo({
                            top: minimapScrollRef.current.scrollHeight,
                            behavior: 'smooth'
                        });
                    }
                }, 100);
            }
        }
        prevTotalQuestionsRef.current = totalQuestions;
    }, [totalQuestions]);

    // 2. Auto scroll active question card inside minimap when scrolling main page
    useEffect(() => {
        if (activeId === null || !minimapScrollRef.current) return;
        const activeMinimapItem = minimapScrollRef.current.querySelector(`[data-minimap-item-id="${activeId}"]`);
        if (activeMinimapItem) {
            activeMinimapItem.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }, [activeId]);

    // Track scroll position to update active question indicator
    useEffect(() => {
        const handleScroll = () => {
            try {
                const windowHeight = window.innerHeight || 800;
                const questionElements = document.querySelectorAll('[data-minimap-id]');
                let currentActiveId: string | number | null = null;
                let minDistance = Infinity;

                questionElements.forEach((el) => {
                    const rect = el.getBoundingClientRect();
                    const distance = Math.abs(rect.top - 150);
                    if (rect.top <= windowHeight && rect.bottom >= 0 && distance < minDistance) {
                        minDistance = distance;
                        currentActiveId = el.getAttribute('data-minimap-id');
                    }
                });

                if (currentActiveId !== null) {
                    setActiveId(currentActiveId);
                }
            } catch (err) {
                // Silently handle DOM metric changes
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll, { passive: true });
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, []);

    // Scroll to target question when clicked in minimap
    const scrollToTarget = (id: string | number) => {
        try {
            const allNodes = Array.from(document.querySelectorAll('[data-minimap-id]'));
            const el = allNodes.find(node => node.getAttribute('data-minimap-id') === String(id));
            if (el) {
                const yOffset = -90; // Offset for fixed top navbar
                const y = el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0) + yOffset;
                window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
                setActiveId(id);
                if (onSelectQuestion) onSelectQuestion(id);
            }
        } catch (err) {
            console.error("Minimap scroll error:", err);
        }
    };

    if (totalQuestions === 0) return null;

    const renderQuestionCard = (q: Question, number: number) => {
        if (!q || q.id === undefined || q.id === null) return null;
        const isCurrentActive = String(activeId) === String(q.id) || (activeQuestionId !== undefined && String(activeQuestionId) === String(q.id));
        const isPassage = !!q.groupId;
        const hasIssue = issueIds?.has(String(q.id));
        const optionsKeys = q.options && q.type !== 'numerical' ? Object.keys(q.options) : [];
        const qSnippet = cleanSnippet(q.question, 75);

        return (
            <div
                key={q.id}
                data-minimap-item-id={q.id}
                onClick={() => scrollToTarget(q.id)}
                className={`group/qitem relative cursor-pointer p-1.5 rounded-lg border transition-all duration-150 w-full min-w-0 max-w-full overflow-hidden ${
                    isCurrentActive
                        ? 'bg-indigo-600 border-indigo-700 text-white shadow-md ring-2 ring-indigo-400/40'
                        : isPassage
                            ? 'bg-indigo-50/40 border-indigo-200/80 hover:bg-indigo-50 hover:border-indigo-300 text-slate-800'
                            : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 shadow-2xs'
                }`}
                title={`Q${number}: ${qSnippet || 'Question'}`}
            >
                {/* Passage Indicator vertical accent */}
                {isPassage && (
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${isCurrentActive ? 'bg-amber-300' : 'bg-indigo-500'}`} />
                )}

                {/* Header row: question number, passage pill, issue indicator, marking scheme */}
                <div className="flex items-center justify-between gap-0.5 mb-1 min-w-0 w-full">
                    <div className="flex items-center gap-0.5 min-w-0">
                        <span className={`text-[9px] font-extrabold ${isCurrentActive ? 'text-white' : 'text-slate-700 group-hover/qitem:text-indigo-600'}`}>
                            #{number}
                        </span>
                        {isPassage && (
                            <span className={`text-[7px] font-bold px-0.5 rounded uppercase shrink-0 ${isCurrentActive ? 'bg-indigo-700 text-indigo-100' : 'bg-indigo-100 text-indigo-700'}`}>
                                PAS
                            </span>
                        )}
                        {hasIssue && (
                            <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCurrentActive ? 'bg-amber-300' : 'bg-amber-500'}`}
                                title="Needs attention"
                            />
                        )}
                    </div>
                    <div className="inline-flex items-center gap-0.5 text-[8.5px] font-bold font-mono slashed-zero shrink-0 tracking-tighter">
                        <span className={isCurrentActive ? 'text-indigo-100' : 'text-slate-400'}>
                            {q.marks || 1}M
                        </span>
                        <span className={isCurrentActive ? 'text-rose-200' : 'text-rose-600'}>
                            {q.negativeMarks !== undefined && q.negativeMarks !== null ? q.negativeMarks : 0}N
                        </span>
                    </div>
                </div>

                {/* Actual Question Text in Small Letters */}
                <p
                    className={`text-[8px] leading-[1.25] font-medium line-clamp-2 break-words ${
                        isCurrentActive ? 'text-white' : 'text-slate-700 group-hover/qitem:text-slate-900'
                    }`}
                >
                    {qSnippet || <span className="opacity-40 italic">Empty question</span>}
                </p>

                {/* Image Indicator if question has an image */}
                {q.image && (
                    <div className={`mt-0.5 flex items-center gap-0.5 text-[7px] font-semibold ${
                        isCurrentActive ? 'text-indigo-200' : 'text-sky-600'
                    }`}>
                        <ImageIcon className="w-2.5 h-2.5 shrink-0" />
                        <span>Image</span>
                    </div>
                )}

                {/* Numerical answer indicator */}
                {q.type === 'numerical' && (
                    <div className={`mt-1 pt-0.5 border-t text-[7.5px] font-mono font-medium truncate ${
                        isCurrentActive ? 'border-indigo-500/50 text-emerald-200' : 'border-slate-100 text-emerald-600'
                    }`}>
                        = {q.correctAnswer !== undefined && q.correctAnswer !== '' ? String(q.correctAnswer) : 'Numerical'}
                    </div>
                )}

                {/* Actual Options Text in Small Letters */}
                {optionsKeys.length > 0 && q.type !== 'numerical' && (
                    <div className={`mt-1 pt-0.5 border-t space-y-0.5 ${
                        isCurrentActive ? 'border-indigo-500/50' : 'border-slate-100'
                    }`}>
                        {optionsKeys.map((key) => {
                            const optSnippet = cleanSnippet(q.options?.[key], 32);
                            const isCorrect = Array.isArray(q.correctAnswer)
                                ? q.correctAnswer.includes(key)
                                : q.correctAnswer === key;

                            return (
                                <div
                                    key={key}
                                    className={`flex items-baseline gap-1 text-[7.5px] leading-tight truncate ${
                                        isCorrect
                                            ? isCurrentActive
                                                ? 'text-emerald-200 font-extrabold'
                                                : 'text-emerald-600 font-bold'
                                            : isCurrentActive
                                                ? 'text-indigo-100/80'
                                                : 'text-slate-500'
                                    }`}
                                    title={`${key}: ${optSnippet}`}
                                >
                                    <span className="font-bold shrink-0">{key}.</span>
                                    <span className="truncate">{optSnippet || '—'}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // Render items with Light Mode styling matching the page UI
    const renderItems = () => {
        if (mode === 'section') {
            let totalQCounter = 0;
            return safeSections.map((sec, sIdx) => {
                if (!sec) return null;
                const secQuestions = Array.isArray(sec.questions) ? sec.questions.filter(Boolean) : [];
                return (
                    <div key={sec.id || sIdx} className="mb-3 w-full min-w-0 max-w-full">
                        {/* Section Header Indicator */}
                        <div className="flex items-center gap-1 px-1.5 py-1 mb-1 bg-indigo-50/90 rounded border border-indigo-200/80 text-[9px] font-bold text-indigo-700 shadow-2xs w-full min-w-0 max-w-full overflow-hidden">
                            <Layers className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                            <span className="truncate min-w-0 flex-1">{sec.name || `Section ${sIdx + 1}`}</span>
                        </div>

                        {/* Section Questions */}
                        <div className="space-y-1.5 pl-1 w-full min-w-0 max-w-full">
                            {secQuestions.map((q) => {
                                totalQCounter++;
                                return renderQuestionCard(q, totalQCounter);
                            })}
                        </div>
                    </div>
                );
            });
        }

        // Standard Mode
        return (
            <div className="space-y-1.5 w-full min-w-0 max-w-full">
                {safeQuestions.map((q, qIdx) => renderQuestionCard(q, qIdx + 1))}
            </div>
        );
    };

    return (
        <div className="fixed right-3 top-24 bottom-6 z-40 hidden lg:flex items-start pointer-events-none select-none [body[data-sypad-open]_&]:hidden">
            {/* Collapse / Expand Toggle Button */}
            <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                className="pointer-events-auto bg-white text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-slate-300 shadow-md rounded-l-lg p-1.5 transition-all cursor-pointer backdrop-blur-md self-center shrink-0"
                title={collapsed ? "Expand Minimap" : "Collapse Minimap"}
            >
                {collapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {/* Minimap Drawer Container (Light Mode theme matching page UI) */}
            {!collapsed && (
                <div
                    ref={minimapRef}
                    className="pointer-events-auto w-32 min-w-[128px] max-w-[128px] shrink-0 h-full bg-white/95 border border-slate-200/90 rounded-r-xl shadow-xl backdrop-blur-md flex flex-col overflow-hidden relative transition-all duration-300"
                >
                    {/* Header Bar */}
                    <div className="px-2 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 w-full min-w-0 overflow-hidden">
                        <div className="flex items-center gap-1 min-w-0">
                            <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-800 tracking-wider uppercase truncate">
                                Minimap
                            </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            {issueIds && issueIds.size > 0 && (
                                <span
                                    className="text-[8px] font-bold px-1 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200/80 shrink-0"
                                    title={`${issueIds.size} questions need attention`}
                                >
                                    {issueIds.size} !
                                </span>
                            )}
                            <span className="text-[9px] font-mono font-bold px-1 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200/80 shrink-0">
                                {totalQuestions} Qs
                            </span>
                        </div>
                    </div>

                    {/* Minimap Scrollable Body */}
                    <div
                        ref={minimapScrollRef}
                        className="flex-1 w-full min-w-0 overflow-y-auto overflow-x-hidden p-1.5 scrollbar-thin scrollbar-thumb-slate-300 relative space-y-1"
                    >
                        {renderItems()}
                    </div>
                </div>
            )}
        </div>
    );
};
