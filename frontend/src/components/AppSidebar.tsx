import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutDashboard,
    FileText,
    Sparkles,
    PlusCircle,
    BarChart2,
    BookOpen,
    History,
    Book,
    PanelLeftClose,
    PanelLeft,
    Shield,
    ChevronDown,
    ChevronRight,
    Trash2,
    Loader2,
    X,
    Calculator,
    Copy,
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AppSidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
}

export default function AppSidebar({
    isCollapsed,
    setIsCollapsed,
    mobileOpen,
    setMobileOpen
}: AppSidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAdmin } = useAuth();

    const isAiPage = location.pathname === '/generate-with-ai';
    const isCreateTestPage = location.pathname.startsWith('/create-test') || location.pathname.startsWith('/edit-test');

    // AI History Dropdown state (defaults to open on /generate-with-ai page)
    const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(true);
    const [historyItems, setHistoryItems] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

    // AI Guide Dropdown state (for /create-test page)
    const [isAiGuideOpen, setIsAiGuideOpen] = useState<boolean>(true);

    const promptText = `Convert the provided input (image/text of questions, paragraphs, solutions, or tables) into a KaTeX/mhchem-formatted block.

RULES:
1. Output ONLY the converted content inside a single code snippet. If you find more than one question or separated content then make different code snippets.
2. Escape all LaTeX commands with single backslashes (e.g., use \\frac, \\ce, \\pu, \\text).
3. Inline math inside $...$, block math inside $$...$$.
4. Convert tables and column matches to \\begin{array}...\\end{array} syntax.
5. Apply \\ce{...} for chemical equations/formulas and \\pu{...} for units.
6. Use standard line breaks anywhere if required.
7. Mark complex diagrams/skeletal structures as [IMAGE].`;

    const chemistryPrompt = `convert chemical structures:
Convert the chemical structure in this image into a single-line KaTeX string wrapped inside $ ... $. Do not use the "array" environment, as it creates too much blank space between the bonds and the atoms.

Follow these exact formatting rules:
1. Horizontal Chain & Bonds: Use standard text characters wrapped in "\\text{}" (e.g., \\text{CH}_3). Use "\\text{-}" for single bonds.
2. Vertical Double Bonds: Use "\\overset{\\text{O}}{\\overset{\\parallel}{\\text{C}}}" for carbonyl groups (C=O).
3. Vertical Branching Alignment (CRITICAL): When a branching chain goes downward, use "\\mathrlap" inside the bottom "\\underset" block.
   Example: \\underset{\\mathrlap{\\text{CH}_2\\text{-}\\text{CH}_3}}{\\underset{\\vert}{\\text{CH}}}
4. Output only the clean, final KaTeX string inside a code block.`;

    const tablePrompt = `Convert tabular data into LaTeX array format:
\\begin{array}{|c|c|c|}
\\hline
\\textbf{Col 1} & \\textbf{Col 2} & \\textbf{Col 3} \\\\
\\hline
Item 1 & Value A & 100 \\\\
Item 2 & Value B & 200 \\\\
\\hline
\\end{array}`;

    const handleCopyPrompt = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copied to clipboard!`);
        } catch {
            toast.error('Failed to copy prompt.');
        }
    };

    // Close mobile sidebar on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname, setMobileOpen]);

    // Load AI History items
    const loadHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            if (user) {
                const { fetchAiHistory } = await import('@/lib/aiHistoryApi');
                const { data } = await fetchAiHistory();
                setHistoryItems(data || []);
            } else {
                const guestHistoryStr = localStorage.getItem('guest_ai_history');
                if (guestHistoryStr) {
                    try {
                        const parsed = JSON.parse(guestHistoryStr);
                        setHistoryItems(Array.isArray(parsed) ? parsed : []);
                    } catch {
                        setHistoryItems([]);
                    }
                } else {
                    setHistoryItems([]);
                }
            }
        } catch (err) {
            console.error('Failed to fetch AI history in sidebar:', err);
        } finally {
            setLoadingHistory(false);
        }
    }, [user]);

    useEffect(() => {
        loadHistory();

        const handleRefresh = () => loadHistory();
        window.addEventListener('refresh_ai_history', handleRefresh);
        return () => window.removeEventListener('refresh_ai_history', handleRefresh);
    }, [loadHistory]);

    const handleSelectHistoryItem = async (item: any) => {
        if (!isAiPage) {
            navigate('/generate-with-ai');
        }
        window.dispatchEvent(new CustomEvent('load_ai_history_item', { detail: item }));
        setMobileOpen(false);
    };

    const handleDeleteHistoryItem = async (e: React.MouseEvent, id: string, index: number) => {
        e.stopPropagation();
        if (user) {
            try {
                const { deleteAiHistory } = await import('@/lib/aiHistoryApi');
                const { error } = await deleteAiHistory(id);
                if (error) throw error;
                setHistoryItems(prev => prev.filter(h => h.id !== id));
                toast.success('History item deleted');
            } catch (err) {
                console.error('Failed to delete history item:', err);
                toast.error('Failed to delete item');
            }
        } else {
            try {
                const guestHistoryStr = localStorage.getItem('guest_ai_history');
                if (guestHistoryStr) {
                    let parsed = JSON.parse(guestHistoryStr);
                    parsed = parsed.filter((_: any, idx: number) => idx !== index);
                    localStorage.setItem('guest_ai_history', JSON.stringify(parsed));
                    setHistoryItems(parsed);
                    toast.success('History item deleted');
                }
            } catch (err) {
                console.error('Failed to delete guest item:', err);
            }
        }
    };

    // Filter nav items: hide Reports and Materials when on /generate-with-ai page
    const navItems = [
        {
            title: 'Dashboard',
            path: '/dashboard',
            icon: LayoutDashboard,
            exact: true,
            matchPaths: ['/dashboard']
        },
        {
            title: 'My Tests',
            path: '/my-tests',
            icon: FileText,
            exact: false,
            matchPaths: ['/my-tests']
        },
        {
            title: 'Generate with AI',
            path: '/generate-with-ai',
            icon: Sparkles,
            badge: 'AI',
            badgeColor: 'bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300 border-violet-200 dark:border-violet-800',
            iconColor: 'text-violet-600 dark:text-violet-400'
        },
        {
            title: 'Create Test',
            path: '/create-test',
            icon: PlusCircle,
            matchPaths: ['/create-test', '/edit-test']
        },
        ...(!isAiPage && !isCreateTestPage ? [
            {
                title: 'Reports',
                path: '/my-tests?tab=reports',
                icon: BarChart2,
                matchPaths: ['/results', '/results/analytics']
            },
            {
                title: 'Materials',
                path: '/materials',
                icon: BookOpen,
            }
        ] : []),
        ...(!isCreateTestPage ? [
            {
                title: 'Test History',
                path: '/history',
                icon: History,
            }
        ] : []),
        {
            title: 'User Guide',
            path: '/user-guide',
            icon: Book,
        },
    ];

    const isActive = (item: typeof navItems[0]) => {
        if (item.path === '/dashboard') {
            return location.pathname === '/dashboard';
        }
        if (item.title === 'Reports') {
            return location.pathname === '/my-tests' && location.search.includes('tab=reports');
        }
        if (item.title === 'My Tests') {
            return location.pathname === '/my-tests' && !location.search.includes('tab=reports');
        }
        if (item.matchPaths) {
            return item.matchPaths.some(p => location.pathname.startsWith(p));
        }
        return location.pathname === item.path;
    };

    const handleItemClick = (path: string) => {
        navigate(path);
        setMobileOpen(false);
    };

    return (
        <TooltipProvider delayDuration={200}>
            {/* Mobile Backdrop Overlay */}
            {mobileOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden transition-opacity animate-in fade-in duration-200"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`
                    fixed md:sticky top-0 md:top-16 left-0 z-50 md:z-40 h-full md:h-[calc(100vh-4rem)]
                    bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl md:backdrop-blur-md
                    border-r border-slate-200/80 dark:border-slate-800/80
                    transition-all duration-300 ease-in-out flex flex-col justify-between
                    ${mobileOpen ? 'translate-x-0 w-72 sm:w-80 shadow-2xl' : '-translate-x-full md:translate-x-0'}
                    ${!mobileOpen && isCollapsed ? 'md:w-16' : 'md:w-64'}
                `}
            >
                {/* Top Sidebar Header */}
                <div>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 dark:border-slate-800/60">
                        {(!isCollapsed || mobileOpen) && (
                            <div className="flex items-center gap-2 px-1">
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-base tracking-tight">
                                    Menu
                                </span>
                            </div>
                        )}

                        {/* Mobile Close Button */}
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-500 hover:text-slate-800 md:hidden"
                                onClick={() => setMobileOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>

                            {/* Desktop Collapse Toggle */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hidden md:flex"
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                title={isCollapsed ? "Expand menu" : "Collapse menu"}
                            >
                                {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    {/* Menu Navigation List */}
                    <nav className="p-2 space-y-1.5 overflow-y-auto max-h-[calc(100vh-8.5rem)]">
                        {navItems.map((item) => {
                            const active = isActive(item);
                            const Icon = item.icon;
                            const isAiItem = item.path === '/generate-with-ai';

                            const content = (
                                <div key={item.title} className="space-y-1">
                                    <button
                                        onClick={() => handleItemClick(item.path)}
                                        className={`
                                            w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium
                                            transition-all duration-200 group cursor-pointer text-left relative
                                            ${active
                                                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md shadow-slate-900/10 dark:shadow-slate-100/10 font-semibold'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
                                            }
                                            ${(isCollapsed && !mobileOpen) ? 'justify-center px-0 h-10 w-10 mx-auto' : ''}
                                        `}
                                    >
                                        <Icon className={`
                                            h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110
                                            ${active 
                                                ? 'text-white dark:text-slate-900' 
                                                : item.iconColor || 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                                            }
                                        `} />

                                        {(!isCollapsed || mobileOpen) && (
                                            <div className="flex items-center justify-between flex-1 min-w-0">
                                                <span className="truncate">{item.title}</span>
                                                {item.badge && (
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${item.badgeColor}`}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </button>

                                    {/* AI Import History Dropdown nested directly under Generate with AI - ONLY visible on Generate with AI page */}
                                    {isAiItem && isAiPage && (!isCollapsed || mobileOpen) && (
                                        <div className="pl-3 py-1 space-y-1">
                                            <button
                                                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                                                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <History className="h-4 w-4 text-violet-500 shrink-0" />
                                                    <span className="truncate">AI Import History</span>
                                                </div>
                                                {isHistoryOpen ? (
                                                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                                ) : (
                                                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                                                )}
                                            </button>

                                            {isHistoryOpen && (
                                                <div className="pl-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                                                    {loadingHistory ? (
                                                        <div className="flex items-center justify-center p-3">
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                                        </div>
                                                    ) : historyItems.length === 0 ? (
                                                        <div className="p-2 text-xs text-slate-400 dark:text-slate-500 italic text-center">
                                                            No past generations
                                                        </div>
                                                    ) : (
                                                        historyItems.map((item, idx) => (
                                                            <div
                                                                key={item.id || idx}
                                                                onClick={() => handleSelectHistoryItem(item)}
                                                                className="w-full flex items-center justify-between gap-1.5 px-2 py-1.5 text-xs rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/40 text-slate-600 dark:text-slate-300 hover:text-violet-700 dark:hover:text-violet-300 group cursor-pointer transition-colors"
                                                            >
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="truncate font-medium leading-tight">
                                                                        {item.title || 'AI Generated Test'}
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-400 leading-tight">
                                                                        {item.question_count} Questions
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => handleDeleteHistoryItem(e, item.id, idx)}
                                                                    title="Delete"
                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded-md transition-opacity shrink-0"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* AI Guide & Sy Pad Option under Create Test - ONLY on create test page */}
                                    {item.path === '/create-test' && isCreateTestPage && (!isCollapsed || mobileOpen) && (
                                        <div className="pl-3 py-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <button
                                                onClick={() => window.dispatchEvent(new CustomEvent('toggle_ai_guide'))}
                                                className="ai-guide-trigger w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
                                                    <span className="truncate">AI Guide</span>
                                                </div>
                                            </button>

                                            {/* Sy Pad Option directly below AI Guide - ONLY on create test page */}
                                            <button
                                                onClick={() => window.dispatchEvent(new CustomEvent('toggle_sy_pad'))}
                                                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors cursor-pointer mt-1"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Calculator className="h-4 w-4 text-blue-500 shrink-0" />
                                                    <span className="truncate">Sy Pad</span>
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );

                            if (isCollapsed && !mobileOpen) {
                                return (
                                    <Tooltip key={item.title}>
                                        <TooltipTrigger asChild>
                                            {content}
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="font-medium text-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-none">
                                            {item.title}
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            }

                            return content;
                        })}
                    </nav>
                </div>
            </aside>
        </TooltipProvider>
    );
}

