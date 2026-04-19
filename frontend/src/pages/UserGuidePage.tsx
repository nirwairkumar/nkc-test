import React, { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import {
    BookOpen, FileText, FlaskConical, Sparkles, ChevronRight, ArrowLeft,
    ArrowRight, Menu, X, Clock, Search
} from 'lucide-react';
import { SolutionUploadGuide } from '@/components/SolutionUploadGuide';
import { TestUploadFormatGuide } from '@/components/TestUploadFormatGuide';
import { ScientificNotationGuide } from '@/components/ScientificNotationGuide';
import { cn } from '@/lib/utils';

// --- Guide Registry ---
interface GuideEntry {
    slug: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    accentColor: string; // tailwind border/text color class
    category: string;
    readTime: string;
    status: 'available' | 'coming-soon';
}

const GUIDES: GuideEntry[] = [
    {
        slug: 'json-test-upload-guide',
        title: 'JSON Test Upload Guide',
        description: 'Step-by-step instructions to create and upload tests in bulk via JSON files using AI prompts.',
        icon: <FileText className="h-5 w-5" />,
        accentColor: 'blue',
        category: 'Getting Started',
        readTime: '8 min',
        status: 'available',
    },
    {
        slug: 'solution-upload-guide',
        title: 'Solution Upload Guide',
        description: 'Learn how to bulk-upload detailed solutions for your tests using structured JSON format.',
        icon: <BookOpen className="h-5 w-5" />,
        accentColor: 'indigo',
        category: 'Content',
        readTime: '5 min',
        status: 'available',
    },
    {
        slug: 'chemistry-notation',
        title: 'Chemistry & Scientific Notation',
        description: 'Complete reference for mhchem, KaTeX math formulas, stacked reagents, and chemical equation rendering.',
        icon: <FlaskConical className="h-5 w-5" />,
        accentColor: 'emerald',
        category: 'Advanced',
        readTime: '6 min',
        status: 'available',
    },
    {
        slug: 'ai-test-generation',
        title: 'AI Test Generation',
        description: 'Use AI to automatically generate tests from PDFs, images, or text content.',
        icon: <Sparkles className="h-5 w-5" />,
        accentColor: 'purple',
        category: 'Getting Started',
        readTime: '4 min',
        status: 'coming-soon',
    },
];

const CATEGORIES = ['All', 'Getting Started', 'Content', 'Advanced'];

const accentStyles: Record<string, { border: string; text: string; bg: string; bgLight: string }> = {
    blue: { border: 'border-l-blue-500', text: 'text-blue-600', bg: 'bg-blue-50', bgLight: 'bg-blue-500/10' },
    indigo: { border: 'border-l-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50', bgLight: 'bg-indigo-500/10' },
    emerald: { border: 'border-l-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', bgLight: 'bg-emerald-500/10' },
    purple: { border: 'border-l-purple-500', text: 'text-purple-600', bg: 'bg-purple-50', bgLight: 'bg-purple-500/10' },
};

// --- Index (Landing) View ---
function DocsIndex({ onNavigate }: { onNavigate: (slug: string) => void }) {
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = GUIDES.filter(g => {
        const matchCategory = activeCategory === 'All' || g.category === activeCategory;
        const matchSearch = !searchQuery || g.title.toLowerCase().includes(searchQuery.toLowerCase()) || g.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCategory && matchSearch;
    });

    return (
        <div className="min-h-[calc(100vh-4rem)]">
            {/* Hero */}
            <div className="docs-hero-mesh border-b border-slate-200/80">
                <div className="max-w-5xl mx-auto px-6 pt-16 pb-12 sm:pt-20 sm:pb-14">
                    <div className="flex items-center gap-2 text-sm text-indigo-600 font-semibold mb-4 tracking-wide uppercase">
                        <BookOpen className="h-4 w-4" />
                        Documentation
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4 leading-[1.1]">
                        User Guides
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl leading-relaxed mb-8">
                        Everything you need to create, manage, and optimize tests on TestoZa. Follow our step-by-step guides to get the most out of the platform.
                    </p>

                    {/* Search */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search guides..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all placeholder:text-slate-400"
                        />
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="max-w-5xl mx-auto px-6 py-10">
                {/* Category pills */}
                <div className="flex items-center gap-2 mb-8 overflow-x-auto scrollbar-hide pb-1">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
                                activeCategory === cat
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((guide, idx) => {
                        const accent = accentStyles[guide.accentColor];
                        const isComingSoon = guide.status === 'coming-soon';

                        return (
                            <button
                                key={guide.slug}
                                onClick={() => !isComingSoon && onNavigate(guide.slug)}
                                disabled={isComingSoon}
                                className={cn(
                                    "docs-card-enter text-left p-5 rounded-xl border border-l-[3px] transition-all duration-200 group relative",
                                    accent.border,
                                    isComingSoon
                                        ? "opacity-60 cursor-not-allowed bg-slate-50/50 border-slate-200 border-l-slate-300"
                                        : "bg-white hover:shadow-md hover:shadow-slate-200/60 hover:border-slate-300 border-slate-200"
                                )}
                                style={{ animationDelay: `${idx * 80}ms` }}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                        isComingSoon ? "bg-slate-100 text-slate-400" : accent.bg,
                                        !isComingSoon && accent.text
                                    )}>
                                        {guide.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-slate-900 text-[15px] leading-snug">{guide.title}</h3>
                                            {isComingSoon && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200 shrink-0">
                                                    Soon
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-3">{guide.description}</p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                                {guide.category}
                                            </span>
                                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> {guide.readTime}
                                            </span>
                                        </div>
                                    </div>
                                    {!isComingSoon && (
                                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-3" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {filtered.length === 0 && (
                    <div className="text-center py-16 text-slate-400">
                        <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No guides match your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Guide Detail View ---
function GuideDetail({ guide, slug }: { guide: GuideEntry; slug: string }) {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const availableGuides = GUIDES.filter(g => g.status === 'available');
    const currentAvailIdx = availableGuides.findIndex(g => g.slug === slug);
    const prevGuide = currentAvailIdx > 0 ? availableGuides[currentAvailIdx - 1] : null;
    const nextGuide = currentAvailIdx < availableGuides.length - 1 ? availableGuides[currentAvailIdx + 1] : null;

    return (
        <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
            {/* Mobile sidebar toggle */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-300/40 flex items-center justify-center hover:bg-indigo-700 transition-colors"
            >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Sidebar overlay on mobile */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "w-72 xl:w-80 shrink-0 bg-white border-r border-slate-200/80 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] overflow-y-auto scrollbar-hide",
                "fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:block",
                sidebarOpen ? "translate-x-0 top-16" : "-translate-x-full"
            )}>
                <div className="p-5">
                    {/* Back to docs */}
                    <button
                        onClick={() => { navigate('/user-guide'); setSidebarOpen(false); }}
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-6 group"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                        <span className="font-medium">All Guides</span>
                    </button>

                    {/* Branding */}
                    <div className="flex items-center gap-3 mb-7">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200/50">
                            <BookOpen className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">Documentation</h2>
                            <p className="text-[11px] text-slate-400">TestoZa Platform</p>
                        </div>
                    </div>

                    {/* Nav grouped by category */}
                    {['Getting Started', 'Content', 'Advanced'].map(category => {
                        const categoryGuides = GUIDES.filter(g => g.category === category);
                        if (categoryGuides.length === 0) return null;

                        return (
                            <div key={category} className="mb-5">
                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-3">
                                    {category}
                                </h3>
                                <div className="space-y-0.5">
                                    {categoryGuides.map(g => {
                                        const isActive = slug === g.slug;
                                        const isComingSoon = g.status === 'coming-soon';

                                        return (
                                            <button
                                                key={g.slug}
                                                onClick={() => {
                                                    if (!isComingSoon) {
                                                        navigate(`/user-guide/${g.slug}`);
                                                        setSidebarOpen(false);
                                                    }
                                                }}
                                                disabled={isComingSoon}
                                                className={cn(
                                                    "docs-sidebar-item w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5",
                                                    isActive && "active",
                                                    isActive
                                                        ? "text-indigo-700 font-semibold"
                                                        : isComingSoon
                                                            ? "text-slate-400 cursor-not-allowed"
                                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                                )}
                                            >
                                                <span className={cn(
                                                    "shrink-0",
                                                    isActive ? "text-indigo-600" : "text-slate-400"
                                                )}>
                                                    {g.icon}
                                                </span>
                                                <span className="truncate">{g.title}</span>
                                                {isComingSoon && (
                                                    <span className="ml-auto text-[9px] font-bold uppercase text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                                                        Soon
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </aside>

            {/* Content */}
            <main className="flex-1 min-w-0 bg-slate-50/30">
                <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-10 py-8">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-6">
                        <button onClick={() => navigate('/user-guide')} className="hover:text-indigo-600 transition-colors">
                            Docs
                        </button>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-slate-400">{guide.category}</span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-slate-700 font-medium">{guide.title}</span>
                    </nav>

                    {/* Title */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={cn(
                                "p-2 rounded-lg",
                                accentStyles[guide.accentColor].bg,
                                accentStyles[guide.accentColor].text
                            )}>
                                {guide.icon}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {guide.category}
                                </span>
                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {guide.readTime} read
                                </span>
                            </div>
                        </div>
                        <h1 className="text-3xl sm:text-[2rem] font-bold text-slate-900 tracking-tight leading-tight">
                            {guide.title}
                        </h1>
                        <p className="text-slate-500 mt-2 text-[15px] leading-relaxed max-w-2xl">
                            {guide.description}
                        </p>
                    </div>

                    {/* Content card */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-8">
                        {slug === 'solution-upload-guide' && <SolutionUploadGuide isInline />}
                        {slug === 'json-test-upload-guide' && <TestUploadFormatGuide isInline />}
                        {slug === 'chemistry-notation' && <ScientificNotationGuide isInline />}
                    </div>

                    {/* Prev / Next navigation */}
                    <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8">
                        {prevGuide ? (
                            <button
                                onClick={() => navigate(`/user-guide/${prevGuide.slug}`)}
                                className="text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition-all group"
                            >
                                <div className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                                    <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
                                    Previous
                                </div>
                                <div className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                                    {prevGuide.title}
                                </div>
                            </button>
                        ) : <div />}

                        {nextGuide ? (
                            <button
                                onClick={() => navigate(`/user-guide/${nextGuide.slug}`)}
                                className="text-right p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition-all group sm:col-start-2"
                            >
                                <div className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1 justify-end">
                                    Next
                                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                                <div className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                                    {nextGuide.title}
                                </div>
                            </button>
                        ) : null}
                    </div>
                </div>
            </main>
        </div>
    );
}

// --- Main Page Controller ---
export default function UserGuidePage() {
    const { slug } = useParams<{ slug?: string }>();
    const navigate = useNavigate();

    const activeGuide = slug ? GUIDES.find(g => g.slug === slug) : null;

    // Invalid slug redirect
    if (slug && !activeGuide) {
        return <Navigate to="/user-guide" replace />;
    }

    return (
        <>
            <SEO
                title={activeGuide ? `${activeGuide.title} - Docs - TestoZa` : 'Documentation - TestoZa'}
                description="Comprehensive guides to help you get the most out of TestoZa. Learn about test uploads, solution management, and more."
                keywords={["testoza guide", "user guide", "test upload guide", "solution upload guide", "help", "documentation"]}
            />

            {slug && activeGuide ? (
                <GuideDetail guide={activeGuide} slug={slug} />
            ) : (
                <DocsIndex onNavigate={(s) => navigate(`/user-guide/${s}`)} />
            )}
        </>
    );
}
