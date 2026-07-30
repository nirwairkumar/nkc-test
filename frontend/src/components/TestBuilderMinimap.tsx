import React, { useState, useEffect, useRef } from 'react';
import { TestSection, Question } from '@/lib/testsApi';
import { 
    Layers, 
    ChevronRight, 
    ChevronLeft, 
    Sparkles
} from 'lucide-react';

interface TestBuilderMinimapProps {
    sections?: TestSection[];
    questions?: Question[];
    mode?: 'section' | 'standard';
    activeQuestionId?: string | number;
    onSelectQuestion?: (questionId: string | number) => void;
}

export const TestBuilderMinimap: React.FC<TestBuilderMinimapProps> = ({
    sections = [],
    questions = [],
    mode = 'standard',
    activeQuestionId,
    onSelectQuestion
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
                const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                window.scrollTo({ top: y, behavior: 'smooth' });
                setActiveId(id);
                if (onSelectQuestion) onSelectQuestion(id);
            }
        } catch (err) {
            console.error("Minimap scroll error:", err);
        }
    };

    if (totalQuestions === 0) return null;

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
                            {secQuestions.map((q, qIdx) => {
                                if (!q || q.id === undefined || q.id === null) return null;
                                totalQCounter++;
                                const isCurrentActive = String(activeId) === String(q.id) || String(activeQuestionId) === String(q.id);
                                const isPassage = !!q.groupId;
                                const optionsKeys = q.options ? Object.keys(q.options) : ['A', 'B', 'C', 'D'];
                                const optionsCount = optionsKeys.length;
                                const qText = typeof q.question === 'string' ? q.question.replace(/<[^>]*>?/gm, '').slice(0, 40) : '';

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
                                        title={`Q${totalQCounter}: ${qText || 'Question'}`}
                                    >
                                        {/* Passage Indicator vertical accent */}
                                        {isPassage && (
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${isCurrentActive ? 'bg-amber-300' : 'bg-indigo-500'}`} />
                                        )}

                                        <div className="flex items-center justify-between gap-1 mb-1 min-w-0 w-full">
                                            <div className="flex items-center gap-1 min-w-0">
                                                <span className={`text-[9px] font-extrabold ${isCurrentActive ? 'text-white' : 'text-slate-700 group-hover/qitem:text-indigo-600'}`}>
                                                    #{totalQCounter}
                                                </span>
                                                {isPassage && (
                                                    <span className={`text-[7px] font-bold px-1 rounded uppercase shrink-0 ${isCurrentActive ? 'bg-indigo-700 text-indigo-100' : 'bg-indigo-100 text-indigo-700'}`}>
                                                        PAS
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`text-[8px] font-semibold shrink-0 ${isCurrentActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                {q.marks || 1}M
                                            </span>
                                        </div>

                                        {/* Miniature Lines Visual Effect */}
                                        <div className="space-y-0.5 w-full min-w-0">
                                            <div className={`h-0.5 w-full rounded-full ${isCurrentActive ? 'bg-white/90' : 'bg-slate-300 group-hover/qitem:bg-indigo-400'}`} />
                                            <div className={`h-0.5 w-4/5 rounded-full ${isCurrentActive ? 'bg-indigo-200/80' : 'bg-slate-200'}`} />
                                            {qText && qText.length > 30 && (
                                                <div className={`h-0.5 w-3/5 rounded-full ${isCurrentActive ? 'bg-indigo-200/60' : 'bg-slate-200/70'}`} />
                                            )}

                                            <div className="pt-0.5 grid grid-cols-2 gap-0.5 w-full">
                                                {Array.from({ length: Math.min(optionsCount, 4) }).map((_, optIdx) => (
                                                    <div
                                                        key={optIdx}
                                                        className={`h-0.5 rounded-full ${isCurrentActive ? 'bg-indigo-200/80' : 'bg-slate-200'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            });
        }

        // Standard Mode
        return (
            <div className="space-y-1.5 w-full min-w-0 max-w-full">
                {safeQuestions.map((q, qIdx) => {
                    if (!q || q.id === undefined || q.id === null) return null;
                    const isCurrentActive = String(activeId) === String(q.id) || String(activeQuestionId) === String(q.id);
                    const isPassage = !!q.groupId;
                    const optionsKeys = q.options ? Object.keys(q.options) : ['A', 'B', 'C', 'D'];
                    const optionsCount = optionsKeys.length;
                    const qText = typeof q.question === 'string' ? q.question.replace(/<[^>]*>?/gm, '').slice(0, 40) : '';

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
                            title={`Q${qIdx + 1}: ${qText || 'Question'}`}
                        >
                            {/* Passage Indicator vertical accent */}
                            {isPassage && (
                                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${isCurrentActive ? 'bg-amber-300' : 'bg-indigo-500'}`} />
                            )}

                            <div className="flex items-center justify-between gap-1 mb-1 min-w-0 w-full">
                                <div className="flex items-center gap-1 min-w-0">
                                    <span className={`text-[9px] font-extrabold ${isCurrentActive ? 'text-white' : 'text-slate-700 group-hover/qitem:text-indigo-600'}`}>
                                        #{qIdx + 1}
                                    </span>
                                    {isPassage && (
                                        <span className={`text-[7px] font-bold px-1 rounded uppercase shrink-0 ${isCurrentActive ? 'bg-indigo-700 text-indigo-100' : 'bg-indigo-100 text-indigo-700'}`}>
                                            PAS
                                        </span>
                                    )}
                                </div>
                                <span className={`text-[8px] font-semibold shrink-0 ${isCurrentActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                                    {q.marks || 1}M
                                </span>
                            </div>

                            {/* Miniature Lines Visual Effect */}
                            <div className="space-y-0.5 w-full min-w-0">
                                <div className={`h-0.5 w-full rounded-full ${isCurrentActive ? 'bg-white/90' : 'bg-slate-300 group-hover/qitem:bg-indigo-400'}`} />
                                <div className={`h-0.5 w-4/5 rounded-full ${isCurrentActive ? 'bg-indigo-200/80' : 'bg-slate-200'}`} />
                                {qText && qText.length > 30 && (
                                    <div className={`h-0.5 w-3/5 rounded-full ${isCurrentActive ? 'bg-indigo-200/60' : 'bg-slate-200/70'}`} />
                                )}

                                <div className="pt-0.5 grid grid-cols-2 gap-0.5 w-full">
                                    {Array.from({ length: Math.min(optionsCount, 4) }).map((_, optIdx) => (
                                        <div
                                            key={optIdx}
                                            className={`h-0.5 rounded-full ${isCurrentActive ? 'bg-indigo-200/80' : 'bg-slate-200'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="fixed right-3 top-24 bottom-6 z-40 flex items-start pointer-events-none select-none">
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
                    className="pointer-events-auto w-44 min-w-[176px] max-w-[176px] shrink-0 h-full bg-white/95 border border-slate-200/90 rounded-r-xl shadow-xl backdrop-blur-md flex flex-col overflow-hidden relative transition-all duration-300"
                >
                    {/* Header Bar */}
                    <div className="px-2.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 w-full min-w-0 overflow-hidden">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-800 tracking-wider uppercase truncate">
                                Minimap
                            </span>
                        </div>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200/80 shrink-0">
                            {totalQuestions} Qs
                        </span>
                    </div>

                    {/* Minimap Scrollable Body */}
                    <div 
                        ref={minimapScrollRef}
                        className="flex-1 w-full min-w-0 overflow-y-auto overflow-x-hidden p-2 scrollbar-thin scrollbar-thumb-slate-300 relative space-y-1"
                    >
                        {renderItems()}
                    </div>
                </div>
            )}
        </div>
    );
};
