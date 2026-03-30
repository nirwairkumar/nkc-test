import React from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { BookOpen, FileText, FlaskConical, Sparkles, ChevronRight } from 'lucide-react';
import { SolutionUploadGuide } from '@/components/SolutionUploadGuide';
import { TestUploadFormatGuide } from '@/components/TestUploadFormatGuide';
import { cn } from '@/lib/utils';

// --- Guide Registry ---
// Add new guides here. The component will automatically pick them up.
interface GuideEntry {
    slug: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    status: 'available' | 'coming-soon';
}

const GUIDES: GuideEntry[] = [
    {
        slug: 'solution-upload-guide',
        title: 'Solution Upload Guide',
        description: 'Learn how to bulk-upload detailed solutions for your tests using JSON.',
        icon: <BookOpen className="h-5 w-5" />,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        status: 'available',
    },
    {
        slug: 'json-test-upload-guide',
        title: 'JSON Test Upload Guide',
        description: 'Follow step-by-step instructions to upload tests in bulk via JSON files.',
        icon: <FileText className="h-5 w-5" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        status: 'available',
    },
    {
        slug: 'ai-test-generation',
        title: 'AI Test Generation',
        description: 'Use AI to automatically generate tests from PDFs, images, or text.',
        icon: <Sparkles className="h-5 w-5" />,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        status: 'coming-soon',
    },
    {
        slug: 'chemistry-notation',
        title: 'Chemistry & Scientific Notation',
        description: 'Guide for using mhchem and KaTeX for chemistry and scientific formulas.',
        icon: <FlaskConical className="h-5 w-5" />,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        status: 'coming-soon',
    },
];

// --- Main Page ---

export default function UserGuidePage() {
    const { slug } = useParams<{ slug?: string }>();
    const navigate = useNavigate();

    const [isSolutionGuideOpen, setIsSolutionGuideOpen] = React.useState(false);
    const [isTestUploadGuideOpen, setIsTestUploadGuideOpen] = React.useState(false);

    const activeGuide = slug ? GUIDES.find(g => g.slug === slug) : null;

    // Auto-open the correct dialog when route has a slug
    React.useEffect(() => {
        if (!slug) return;
        if (slug === 'solution-upload-guide') {
            setIsSolutionGuideOpen(true);
            setIsTestUploadGuideOpen(false);
        } else if (slug === 'json-test-upload-guide') {
            setIsTestUploadGuideOpen(true);
            setIsSolutionGuideOpen(false);
        }
    }, [slug]);

    // When a dialog is closed, navigate back to the guide index
    const handleSolutionGuideChange = (open: boolean) => {
        setIsSolutionGuideOpen(open);
        if (!open) navigate('/user-guide');
    };

    const handleTestUploadGuideChange = (open: boolean) => {
        setIsTestUploadGuideOpen(open);
        if (!open) navigate('/user-guide');
    };

    // If slug is provided but doesn't match any guide, redirect to guide index
    if (slug && !activeGuide) {
        return <Navigate to="/user-guide" replace />;
    }

    const openGuide = (guide: GuideEntry) => {
        if (guide.status === 'coming-soon') return;
        navigate(`/user-guide/${guide.slug}`);
    };

    return (
        <div className="min-h-[calc(100vh-4rem)]">
            <SEO
                title={activeGuide ? `${activeGuide.title} - User Guide - TestoZa` : 'User Guides - TestoZa'}
                description="Comprehensive guides to help you get the most out of TestoZa. Learn about test uploads, solution management, and more."
                keywords={["testoza guide", "user guide", "test upload guide", "solution upload guide", "help"]}
            />

            <div className="flex flex-col lg:flex-row">
                {/* --- Sidebar --- */}
                <aside className="w-full lg:w-72 xl:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white/70 backdrop-blur-sm lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto">
                    <div className="p-5">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
                                <BookOpen className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-800">User Guides</h1>
                                <p className="text-xs text-slate-500">Learn how to use TestoZa</p>
                            </div>
                        </div>

                        <nav className="space-y-1.5">
                            {GUIDES.map((guide) => {
                                const isActive = slug === guide.slug;
                                const isComingSoon = guide.status === 'coming-soon';

                                return (
                                    <button
                                        key={guide.slug}
                                        onClick={() => openGuide(guide)}
                                        disabled={isComingSoon}
                                        className={cn(
                                            "w-full text-left p-3 rounded-xl transition-all duration-200 group flex items-start gap-3",
                                            isActive
                                                ? "bg-indigo-50 border border-indigo-200 shadow-sm"
                                                : isComingSoon
                                                    ? "opacity-60 cursor-not-allowed hover:bg-transparent"
                                                    : "hover:bg-slate-50 border border-transparent hover:border-slate-100"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all",
                                            isActive ? guide.bgColor : "bg-slate-100 group-hover:bg-slate-200/70",
                                            isActive ? guide.color : "text-slate-500"
                                        )}>
                                            {guide.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-sm font-semibold truncate",
                                                    isActive ? "text-indigo-700" : "text-slate-700"
                                                )}>
                                                    {guide.title}
                                                </span>
                                                {isComingSoon && (
                                                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                                                        Soon
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{guide.description}</p>
                                        </div>
                                        {!isComingSoon && (
                                            <ChevronRight className={cn(
                                                "h-4 w-4 shrink-0 mt-2.5 transition-transform",
                                                isActive ? "text-indigo-500 translate-x-0.5" : "text-slate-300 group-hover:text-slate-400"
                                            )} />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                {/* --- Content Area --- */}
                <main className="flex-1 min-w-0">
                    <div className="p-6 sm:p-8 lg:p-10 max-w-4xl mx-auto">
                        <div className="text-center mb-10">
                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">
                                Welcome to the User Guides
                            </h2>
                            <p className="text-slate-500 max-w-lg mx-auto">
                                Choose a guide from the sidebar or below to get started. We're constantly adding new guides to help you.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {GUIDES.map((guide) => {
                                const isComingSoon = guide.status === 'coming-soon';
                                return (
                                    <button
                                        key={guide.slug}
                                        onClick={() => openGuide(guide)}
                                        disabled={isComingSoon}
                                        className={cn(
                                            "text-left p-5 rounded-2xl border transition-all duration-200 group",
                                            isComingSoon
                                                ? "border-dashed border-slate-200 opacity-70 cursor-not-allowed"
                                                : "border-slate-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50 bg-white hover:-translate-y-0.5"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-11 h-11 rounded-xl flex items-center justify-center mb-4",
                                            guide.bgColor, guide.color
                                        )}>
                                            {guide.icon}
                                        </div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <h3 className="font-bold text-slate-800">{guide.title}</h3>
                                            {isComingSoon && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                                                    Coming Soon
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500">{guide.description}</p>
                                        {!isComingSoon && (
                                            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:gap-2 transition-all">
                                                Read Guide <ChevronRight className="h-3.5 w-3.5" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </main>
            </div>

            {/* Guide Dialogs (existing components, rendered as controlled dialogs) */}
            <SolutionUploadGuide
                open={isSolutionGuideOpen}
                onOpenChange={handleSolutionGuideChange}
            />
            <TestUploadFormatGuide
                open={isTestUploadGuideOpen}
                onOpenChange={handleTestUploadGuideChange}
            />
        </div>
    );
}
