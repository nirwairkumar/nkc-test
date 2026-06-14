import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import {
    BookOpen, FileText, FlaskConical, Sparkles, ChevronRight, ArrowLeft,
    ArrowRight, Menu, X, Clock, Search, Copy, Check, Sun, Moon,
    Terminal, Download, HelpCircle, Info, Layout, Lightbulb, AlertTriangle, Loader2,
    Radio, BarChart2
} from 'lucide-react';
const SolutionUploadGuide = React.lazy(() => import('@/components/SolutionUploadGuide').then(module => ({ default: module.SolutionUploadGuide })));
const TestUploadFormatGuide = React.lazy(() => import('@/components/TestUploadFormatGuide').then(module => ({ default: module.TestUploadFormatGuide })));
const ScientificNotationGuide = React.lazy(() => import('@/components/ScientificNotationGuide').then(module => ({ default: module.ScientificNotationGuide })));
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- Guide Content Registry ---
interface SubSection {
    slug: string;
    title: string;
    description: string;
    icon: React.ReactNode;
}

interface DocSection {
    title: string;
    items: SubSection[];
}

const DOC_SECTIONS: DocSection[] = [
    {
        title: "Start with TestoZa",
        items: [
            {
                slug: "intro",
                title: "Introduction",
                description: "Get started with the TestoZa question creator and doc formatting tools.",
                icon: <Layout className="h-4 w-4" />
            },
            {
                slug: "bulk-test-upload",
                title: "Bulk Test Upload",
                description: "Learn how to format and upload massive tests in bulk using JSON formats.",
                icon: <UploadIcon className="h-4 w-4" />
            },
            {
                slug: "solution-upload-guide",
                title: "Solution Upload Guide",
                description: "Learn how to format and bulk upload detailed step-by-step solutions for tests.",
                icon: <BookOpen className="h-4 w-4" />
            },
            {
                slug: "ai-test-generation",
                title: "AI Test Generation",
                description: "Understand how to harness AI models to auto-generate complete tests from text, PDFs or images.",
                icon: <Sparkles className="h-4 w-4" />
            },
        ]
    },
    {
        title: "Platform Overview",
        items: [
            {
                slug: "conduct-exam",
                title: "Conduct Exams",
                description: "Step-by-step guide with screenshots on how to activate, configure, and conduct exams on TestoZa.",
                icon: <Radio className="h-4 w-4" />
            },
            {
                slug: "view-results-guide",
                title: "Viewing Results (Upcoming)",
                description: "Learn how to analyze student performance, download Excel sheets, and view proctoring logs (Coming Soon).",
                icon: <BarChart2 className="h-4 w-4" />
            }
        ]
    },
    {
        title: "JSON Schema Reference",
        items: [
            {
                slug: "schema-flat",
                title: "Standard Test Format",
                description: "Complete JSON reference for single-section flat tests.",
                icon: <FileText className="h-4 w-4" />
            },
            {
                slug: "schema-section",
                title: "Section-wise Format",
                description: "JSON format schema for JEE, NEET and multiple sections exams with attempt controls.",
                icon: <Terminal className="h-4 w-4" />
            },
            {
                slug: "schema-solutions",
                title: "Solutions JSON Format",
                description: "JSON format reference for mapping detailed answers and explanations to question IDs.",
                icon: <BookOpen className="h-4 w-4" />
            },
        ]
    },
    {
        title: "Formatting & Syntax",
        items: [
            {
                slug: "chemistry-notation",
                title: "Chemistry (mhchem)",
                description: "Chemical equations, redox reactions, equilibrium arrows, radioactive decays, skeletal organic structures.",
                icon: <FlaskConical className="h-4 w-4" />
            },
            {
                slug: "notation-math",
                title: "Mathematics (KaTeX)",
                description: "Definite integrals, summations, fractions, limits, matrices, binomial equations.",
                icon: <CalculatorIcon className="h-4 w-4" />
            },
            {
                slug: "notation-tables",
                title: "Tables & LaTeX Arrays",
                description: "Convert visual grids and matrix equations into professional KaTeX arrays.",
                icon: <GridIcon className="h-4 w-4" />
            },
            {
                slug: "notation-matching",
                title: "Match Column System",
                description: "Format double list column match questions using LaTeX array formatting.",
                icon: <ArrowRightLeft className="h-4 w-4" />
            }
        ]
    },
    {
        title: "AI Extractor Prompts",
        items: [
            {
                slug: "ai-prompt-guide",
                title: "AI OCR Parsing Prompt",
                description: "Complete prompts and backslash escape instructions for Gemini / ChatGPT parsers.",
                icon: <Sparkles className="h-4 w-4" />
            },
            {
                slug: "prompt-sections",
                title: "Multi-Section OCR Prompt",
                description: "Optimized prompt for extracting multi-section papers with marking overrides.",
                icon: <Terminal className="h-4 w-4" />
            },
            {
                slug: "prompt-solutions",
                title: "Solutions OCR Prompt",
                description: "Specialized prompt to OCR scan step-by-step solutions.",
                icon: <BookOpen className="h-4 w-4" />
            },
        ]
    }
];

// Helper SVGs to avoid extra lucide-react dependencies
function UploadIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
        </svg>
    );
}

function CalculatorIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <rect width="16" height="20" x="4" y="2" rx="2" />
            <line x1="8" x2="16" y1="6" y2="6" />
            <line x1="16" x2="16" y1="14" y2="18" />
            <path d="M16 10h.01" />
            <path d="M12 10h.01" />
            <path d="M8 10h.01" />
            <path d="M12 14h.01" />
            <path d="M8 14h.01" />
            <path d="M12 18h.01" />
            <path d="M8 18h.01" />
        </svg>
    );
}

function GridIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M3 15h18" />
            <path d="M9 3v18" />
            <path d="M15 3v18" />
        </svg>
    );
}

function ArrowRightLeft(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="m16 3 4 4-4 4" />
            <path d="M20 7H4" />
            <path d="m8 21-4-4 4-4" />
            <path d="M4 17h16" />
        </svg>
    );
}

// --- Custom Code Copy Component ---
function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code.trim());
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group my-4 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span>{language.toUpperCase()}</span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    {copied ? (
                        <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            <span className="text-emerald-500 font-medium">Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
            <pre className="bg-slate-950 text-slate-200 p-4 text-xs font-mono overflow-x-auto leading-relaxed max-h-[400px]">
                <code>{code.trim()}</code>
            </pre>
        </div>
    );
}

// --- Custom Alert Callout ---
function AlertBlock({ type = 'info', title, children }: { type?: 'info' | 'tip' | 'warning'; title: string; children: React.ReactNode }) {
    const styles = {
        info: {
            bg: 'bg-emerald-50/50 dark:bg-emerald-950/10',
            border: 'border-l-4 border-emerald-500 dark:border-emerald-600',
            textTitle: 'text-emerald-800 dark:text-emerald-400',
            textContent: 'text-emerald-700 dark:text-emerald-300/90',
            icon: <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        },
        tip: {
            bg: 'bg-indigo-50/50 dark:bg-indigo-950/10',
            border: 'border-l-4 border-indigo-500 dark:border-indigo-600',
            textTitle: 'text-indigo-800 dark:text-indigo-400',
            textContent: 'text-indigo-700 dark:text-indigo-300/90',
            icon: <Lightbulb className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        },
        warning: {
            bg: 'bg-amber-50/50 dark:bg-amber-950/10',
            border: 'border-l-4 border-amber-500 dark:border-amber-600',
            textTitle: 'text-amber-800 dark:text-amber-400',
            textContent: 'text-amber-700 dark:text-amber-300/90',
            icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        }
    };

    const s = styles[type];

    return (
        <div className={cn("p-4 rounded-r-xl my-5 flex gap-3 items-start", s.bg, s.border)}>
            <div className="mt-0.5">{s.icon}</div>
            <div>
                <h4 className={cn("text-xs font-bold uppercase tracking-wide mb-1", s.textTitle)}>{title}</h4>
                <div className={cn("text-sm leading-relaxed", s.textContent)}>{children}</div>
            </div>
        </div>
    );
}

// --- Main Page Controller ---
export default function UserGuidePage() {
    const { slug } = useParams<{ slug?: string }>();
    const navigate = useNavigate();

    // Check default dark mode state
    const [isDark, setIsDark] = useState(() => {
        return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    });

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Toggle dark mode on html/documentElement
    const toggleTheme = () => {
        const nextDark = !isDark;
        setIsDark(nextDark);
        if (nextDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    // Keep state in sync with external theme toggles
    useEffect(() => {
        const checkClass = () => {
            const hasDarkClass = document.documentElement.classList.contains('dark');
            if (hasDarkClass !== isDark) {
                setIsDark(hasDarkClass);
            }
        };

        const interval = setInterval(checkClass, 1000);
        return () => clearInterval(interval);
    }, [isDark]);

    // Backward-compatibility and default slugs
    const activeSlug = useMemo(() => {
        if (!slug) return 'intro';
        if (slug === 'json-test-upload-guide') return 'bulk-test-upload';
        return slug;
    }, [slug]);

    // Find current active subsection and category name
    const activeInfo = useMemo(() => {
        for (const section of DOC_SECTIONS) {
            const match = section.items.find(item => item.slug === activeSlug);
            if (match) {
                return {
                    category: section.title,
                    item: match
                };
            }
        }
        return {
            category: "Getting Started",
            item: {
                slug: "intro",
                title: "Introduction",
                description: "Getting started with TestoZa docs.",
                icon: <Layout className="h-4 w-4" />
            }
        };
    }, [activeSlug]);

    // Search filter for sidebar items
    const filteredSections = useMemo(() => {
        if (!searchQuery) return DOC_SECTIONS;
        return DOC_SECTIONS.map(section => {
            const matchedItems = section.items.filter(item =>
                item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
            return {
                ...section,
                items: matchedItems
            };
        }).filter(section => section.items.length > 0);
    }, [searchQuery]);

    // Flattened available navigation items for Next/Prev buttons
    const flatItems = useMemo(() => {
        return DOC_SECTIONS.flatMap(section => section.items);
    }, []);

    const currentIndex = useMemo(() => {
        return flatItems.findIndex(item => item.slug === activeSlug);
    }, [flatItems, activeSlug]);

    const prevItem = currentIndex > 0 ? flatItems[currentIndex - 1] : null;
    const nextItem = currentIndex < flatItems.length - 1 ? flatItems[currentIndex + 1] : null;

    // Render contents based on active slugs
    const renderContent = () => {
        switch (activeSlug) {
            case 'intro':
                return (
                    <div className="space-y-6">
                        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                            Welcome to the TestoZa Creator Documentation. Whether you are creating competitive exams like JEE/NEET, academic mock papers, or custom student assessments, this guide will help you build and format your content efficiently.
                        </p>

                        <AlertBlock type="info" title="No-Code Test Creation">
                            You do not need to write raw JSON schemas or LaTeX syntax manually. You can copy our optimized AI prompts, drop your PDFs or handwritten notes into ChatGPT/Gemini, and paste the generated questions directly into TestoZa.
                        </AlertBlock>

                        <h3 className="text-xl font-bold mt-8 mb-4 text-slate-800 dark:text-slate-200">Documentation Blueprint</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => navigate('/user-guide/bulk-test-upload')}
                                className="p-5 text-left border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500/50 bg-white dark:bg-[#121316] rounded-xl transition-all duration-200 group"
                            >
                                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 w-fit rounded-lg mb-3">
                                    <UploadIcon className="h-5 w-5" />
                                </div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-500 transition-colors">Bulk Test Upload</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                    Import mock exams with hundreds of questions in seconds. Supports single, multiple, and numerical answer configurations.
                                </p>
                            </button>

                            <button
                                onClick={() => navigate('/user-guide/solution-upload-guide')}
                                className="p-5 text-left border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500/50 bg-white dark:bg-[#121316] rounded-xl transition-all duration-200 group"
                            >
                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 w-fit rounded-lg mb-3">
                                    <BookOpen className="h-5 w-5" />
                                </div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-500 transition-colors">Solutions Guide</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                    Configure step-by-step visual explanations mapping straight to test question keys.
                                </p>
                            </button>

                            <button
                                onClick={() => navigate('/user-guide/chemistry-notation')}
                                className="p-5 text-left border border-slate-200 dark:border-slate-800 hover:border-pink-500 dark:hover:border-pink-500/50 bg-white dark:bg-[#121316] rounded-xl transition-all duration-200 group"
                            >
                                <div className="p-2.5 bg-pink-50 dark:bg-pink-950/20 text-pink-600 dark:text-pink-400 w-fit rounded-lg mb-3">
                                    <FlaskConical className="h-5 w-5" />
                                </div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-pink-500 transition-colors">LaTeX & Chemistry Playground</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                    Real-time playground rendering math formulas (KaTeX) and chemical equations (mhchem). Copy and paste rendered blocks.
                                </p>
                            </button>

                            <button
                                onClick={() => navigate('/user-guide/ai-prompt-guide')}
                                className="p-5 text-left border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500/50 bg-white dark:bg-[#121316] rounded-xl transition-all duration-200 group"
                            >
                                <div className="p-2.5 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 w-fit rounded-lg mb-3">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-500 transition-colors">AI Prompts Center</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                    Access robust OCR prompts configured to strip equations, matrices, tables, columns, and figures without formatting bugs.
                                </p>
                            </button>
                        </div>
                    </div>
                );

            case 'bulk-test-upload':
                return (
                    <div className="space-y-4">
                        <React.Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>}>
                            <TestUploadFormatGuide isInline />
                        </React.Suspense>
                    </div>
                );

            case 'solution-upload-guide':
                return (
                    <div className="space-y-4">
                        <React.Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>}>
                            <SolutionUploadGuide isInline />
                        </React.Suspense>
                    </div>
                );

            case 'ai-test-generation':
                return (
                    <div className="space-y-6">
                        <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                            We are building an fully integrated AI panel that will allow test creators to drag and drop PDFs, scanned images, or word files directly inside the platform dashboard to convert them to TestoZa exam schemas dynamically.
                        </p>

                        <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900/10">
                            <Sparkles className="h-12 w-12 text-purple-500 animate-pulse mb-4" />
                            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">Interactive AI Generator</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-2 leading-relaxed">
                                Our engineering team is currently testing this feature. It is scheduled to release in the next major system update. Stay tuned!
                            </p>
                            <span className="mt-5 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800">
                                Release Stage: Private Beta
                            </span>
                        </div>
                    </div>
                );

            case 'schema-flat':
                return (
                    <div className="space-y-6">
                        <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                            Below is the standard JSON structure for flat tests (all questions belong to a single global sequence, and mark values apply evenly).
                        </p>

                        <CodeBlock
                            language="json"
                            code={`{
  "title": "Practice Mock Test",
  "description": "General physics and basic mechanics mock paper.",
  "duration": 60,
  "marks_per_question": 4,
  "negative_marks": 1,
  "questions": [
    {
      "id": 1,
      "type": "single",
      "question": "A body of mass 2 kg is acted upon by a force of $F = 10 \\\\text{ N}$. Find acceleration.",
      "options": {
        "A": "$5 \\\\text{ m/s}^2$",
        "B": "$10 \\\\text{ m/s}^2$",
        "C": "$2 \\\\text{ m/s}^2$",
        "D": "$8 \\\\text{ m/s}^2$"
      },
      "correctAnswer": "A",
      "passageContent": null
    }
  ]
}`}
                        />

                        <h3 className="text-lg font-bold mt-8 mb-4 text-slate-800 dark:text-slate-200">Schema Attributes</h3>
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                                        <th className="p-3">Field Name</th>
                                        <th className="p-3">Type</th>
                                        <th className="p-3">Mandatory</th>
                                        <th className="p-3">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
                                    <tr>
                                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-300">title</td>
                                        <td className="p-3">string</td>
                                        <td className="p-3 text-emerald-600">Yes</td>
                                        <td className="p-3">Title of the test paper.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-300">duration</td>
                                        <td className="p-3">number</td>
                                        <td className="p-3 text-emerald-600">Yes</td>
                                        <td className="p-3">Total time limits in minutes.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-300">questions</td>
                                        <td className="p-3">array</td>
                                        <td className="p-3 text-emerald-600">Yes</td>
                                        <td className="p-3">Array containing individual question blocks.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            case 'schema-section':
                return (
                    <div className="space-y-6">
                        <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                            Use the section schema for multi-part entrance exams (Physics, Chemistry, Maths) where individual sections contain custom marking, distinct instructions, and attempt restrictions.
                        </p>

                        <CodeBlock
                            language="json"
                            code={`{
  "title": "JEE Main Chemistry Mock",
  "description": "Contains multi-section questions.",
  "duration": 180,
  "sections": [
    {
      "id": "chem-sec-a",
      "name": "Chemistry Section A (MCQs)",
      "instructions": "Attempt all 20 questions.",
      "questions": [
        {
          "id": 1,
          "type": "single",
          "question": "Which molecule shows zero dipole moment?",
          "marks": "4",
          "negativeMarks": "1",
          "options": {
            "A": "$\\\\ce{CO2}$",
            "B": "$\\\\ce{H2O}$",
            "C": "$\\\\ce{NH3}$",
            "D": "$\\\\ce{SO2}$"
          },
          "correctAnswer": "A",
          "groupId": "",
          "passageContent": ""
        }
      ]
    },
    {
      "id": "chem-sec-b",
      "name": "Chemistry Section B (Numerical)",
      "instructions": "Attempt any 5 out of 10 questions.",
      "attempt_control": {
        "enabled": true,
        "mode": "hard",
        "max_attempts": 5
      },
      "questions": [
        {
          "id": 21,
          "type": "numerical",
          "question": "Calculate the pH of $10^{-3} \\\\text{ M HCl}$.",
          "marks": "4",
          "negativeMarks": "0",
          "options": { "A": "", "B": "", "C": "", "D": "" },
          "correctAnswer": { "min": 3.0, "max": 3.0 },
          "groupId": "",
          "passageContent": ""
        }
      ]
    }
  ]
}`}
                        />

                        <AlertBlock type="tip" title="Attempt Control Object">
                            The <code className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-red-600 font-mono">attempt_control</code> configurations allow you to set maximum attempt caps (e.g. attempt 5 out of 10) dynamically inside sections.
                        </AlertBlock>
                    </div>
                );

            case 'schema-solutions':
                return (
                    <div className="space-y-6">
                        <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                            Detailed solution explanation JSON configurations. You can use sequential arrays (easy upload) or map explanations to question keys explicitly.
                        </p>

                        <h4 className="font-bold text-slate-800 dark:text-slate-200">1. Sequential Array Format</h4>
                        <CodeBlock
                            language="json"
                            code={`{
  "solutions": [
    "Solution logic for Q1. Uses formula $a = \\\\frac{F}{m} = \\\\frac{10}{2} = 5 \\\\text{ m/s}^2$.",
    "Solution logic for Q2. $\\\\ce{CO2}$ is linear so symmetrical dipoles cancel."
  ]
}`}
                        />

                        <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-6">2. Explicit ID Mapping Format</h4>
                        <CodeBlock
                            language="json"
                            code={`{
  "solutions": {
    "q-101": "Explanation string for question ID q-101.",
    "q-102": "Explanation string for question ID q-102."
  }
}`}
                        />
                    </div>
                );

            case 'chemistry-notation':
            case 'notation-math':
            case 'notation-tables':
            case 'notation-matching':
                return (
                    <div className="space-y-4">
                        <React.Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>}>
                            <ScientificNotationGuide isInline />
                        </React.Suspense>
                    </div>
                );

            case 'ai-prompt-guide':
                return (
                    <div className="space-y-6">
                        <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                            Use this prompt template to parse exam images/PDF snapshots to extract plain-text question fields. It includes crucial directives detailing LaTeX backslash escapes.
                        </p>

                        <AlertBlock type="warning" title="Double Backslash Rule">
                            FastAPI JSON outputs require double backslashes (<code className="bg-slate-100 dark:bg-slate-900 text-red-600 font-mono">\\\\frac</code>) inside the JSON code block. This avoids syntax errors in JSON deserializers.
                        </AlertBlock>

                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Raw AI Parsing Prompt</span>
                            <Button
                                size="sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(AI_PARSING_PROMPT.trim());
                                    toast.success("AI Prompt copied!");
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1.5 flex items-center"
                            >
                                <Copy className="h-4 w-4" /> Copy Prompt
                            </Button>
                        </div>
                        <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl text-xs font-mono overflow-y-auto max-h-[300px] whitespace-pre-wrap border border-slate-800 leading-relaxed">
                            {AI_PARSING_PROMPT.trim()}
                        </pre>
                    </div>
                );

            case 'prompt-sections':
                return (
                    <div className="space-y-6">
                        <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                            Dedicated prompt instructing AI systems to create a section-wise JSON schema directly. Useful for entrance test papers.
                        </p>

                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Raw AI Section-Wise Prompt</span>
                            <Button
                                size="sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(AI_SECTION_PROMPT.trim());
                                    toast.success("AI Section Prompt copied!");
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1.5 flex items-center"
                            >
                                <Copy className="h-4 w-4" /> Copy Prompt
                            </Button>
                        </div>
                        <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl text-xs font-mono overflow-y-auto max-h-[300px] whitespace-pre-wrap border border-slate-800 leading-relaxed">
                            {AI_SECTION_PROMPT.trim()}
                        </pre>
                    </div>
                );

            case 'prompt-solutions':
                return (
                    <div className="space-y-6">
                        <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                            Extract detailed explanations and answers directly in bulk solution JSON format.
                        </p>

                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Raw AI Solutions Prompt</span>
                            <Button
                                size="sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(AI_SOLUTIONS_PROMPT.trim());
                                    toast.success("AI Solutions Prompt copied!");
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1.5 flex items-center"
                            >
                                <Copy className="h-4 w-4" /> Copy Prompt
                            </Button>
                        </div>
                        <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl text-xs font-mono overflow-y-auto max-h-[300px] whitespace-pre-wrap border border-slate-800 leading-relaxed">
                            {AI_SOLUTIONS_PROMPT.trim()}
                        </pre>
                    </div>
                );

            case 'conduct-exam':
                return (
                    <div className="space-y-8 divide-y divide-slate-100 dark:divide-slate-800">
                        {/* Step 1 */}
                        <div className="flex flex-col lg:flex-row gap-8 items-center py-8 first:pt-0">
                            <div className="w-full lg:w-1/2 shrink-0">
                                <img src="/user-guide/conduct-exams/step-1.png" alt="Step 1: Go to Your Tests" className="w-full h-auto object-contain mx-auto block" />
                            </div>
                            <div className="w-full lg:w-1/2 space-y-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    Step 1
                                </span>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Access Your Dashboard & Creator Area</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    Go to the user dropdown menu in the top navigation bar and click on <strong>Your Tests</strong>.
                                </p>
                                <ul className="list-disc pl-5 text-slate-600 dark:text-slate-400 text-sm space-y-1">
                                    <li>You will land on the <strong>Creator Dashboard</strong>.</li>
                                    <li>You will find all the tests you have created so far.</li>
                                </ul>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex flex-col lg:flex-row gap-8 items-center py-8">
                            <div className="w-full lg:w-1/2 shrink-0">
                                <img src="/user-guide/conduct-exams/step-2.png" alt="Step 2: Choose Test" className="w-full h-auto object-contain mx-auto block" />
                            </div>
                            <div className="w-full lg:w-1/2 space-y-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    Step 2
                                </span>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Choose the Test to Conduct</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    Find the test-card of the exam that you are going to conduct among your candidates.
                                </p>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    Click on the <strong>Conduct</strong> button of the test-card.
                                </p>
                                <AlertBlock type="tip" title="Verify Before Conducting">
                                    You can click on &quot;View&quot; to see your final live test view to recheck questions, options, timing, and sections. If you want to make changes, select &quot;edit test&quot; from the three-dot menu of the test card.
                                </AlertBlock>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex flex-col lg:flex-row gap-8 items-center py-8">
                            <div className="w-full lg:w-1/2 shrink-0">
                                <img src="/user-guide/conduct-exams/step-3.png" alt="Step 3: Start Conducting" className="w-full h-auto object-contain mx-auto block" />
                            </div>
                            <div className="w-full lg:w-1/2 space-y-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    Step 3
                                </span>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Activate the Test & Get Unlisted Link</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    A popup window will open where you can view and copy the unlisted link of the test card.
                                </p>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    Select <strong>Start Conducting</strong> to activate the test.
                                </p>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="flex flex-col lg:flex-row gap-8 items-center py-8">
                            <div className="w-full lg:w-1/2 shrink-0">
                                <img src="/user-guide/conduct-exams/step-4.png" alt="Step 4: Active Exam Controls" className="w-full h-auto object-contain mx-auto block" />
                            </div>
                            <div className="w-full lg:w-1/2 space-y-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    Step 4
                                </span>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Manage the Active Exam Mode</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    Now your test is live and accessible via the unique link. The test card displays four primary management options:
                                </p>
                                <ul className="list-decimal pl-5 text-slate-600 dark:text-slate-400 text-sm space-y-1">
                                    <li><strong>Settings</strong>: Apply proctoring, schedules, and custom settings.</li>
                                    <li><strong>Results</strong>: View responses submitted under Active Exam mode.</li>
                                    <li><strong>Copy Link</strong>: Copy the exam link to clipboard.</li>
                                    <li><strong>Remove</strong>: Stop the exam.</li>
                                </ul>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed pt-2">
                                    Click on <strong>Settings</strong> to configure the exam environment.
                                </p>
                            </div>
                        </div>

                        {/* Step 5 */}
                        <div className="flex flex-col lg:flex-row gap-8 items-center py-8">
                            <div className="w-full lg:w-1/2 shrink-0">
                                <img src="/user-guide/conduct-exams/step-5.png" alt="Step 5: Test Environment Settings" className="w-full h-auto object-contain mx-auto block" />
                            </div>
                            <div className="w-full lg:w-1/2 space-y-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    Step 5
                                </span>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Configure Proctoring & Security</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    You will land on the <strong>Test Environment Settings</strong> panel.
                                </p>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    Choose your desired proctoring preferences (e.g. Full Screen, Tab Switch Detection).
                                </p>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    Click on the <strong>Access & Control</strong> section header to view more configurations.
                                </p>
                            </div>
                        </div>

                        {/* Step 6 */}
                        <div className="flex flex-col lg:flex-row gap-8 items-center py-8">
                            <div className="w-full lg:w-1/2 shrink-0">
                                <img src="/user-guide/conduct-exams/step-6.png" alt="Step 6: Customize Access & Verification" className="w-full h-auto object-contain mx-auto block" />
                            </div>
                            <div className="w-full lg:w-1/2 space-y-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    Step 6
                                </span>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Customize Access & Student Verification</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    Turn on the <strong>Attempt Limit</strong> toggles to restrict students to a single attempt.
                                </p>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    Enable the <strong>Start Form</strong> to collect student credentials (e.g. Roll No, Name) before they are allowed to initiate the exam.
                                </p>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    Now expand the <strong>Result & Timing</strong> section header.
                                </p>
                            </div>
                        </div>

                        {/* Step 7 */}
                        <div className="flex flex-col lg:flex-row gap-8 items-center py-8">
                            <div className="w-full lg:w-1/2 shrink-0">
                                <img src="/user-guide/conduct-exams/step-7.png" alt="Step 7: Enforce Timer & Save" className="w-full h-auto object-contain mx-auto block" />
                            </div>
                            <div className="w-full lg:w-1/2 space-y-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    Step 7
                                </span>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Enable Server-Side Timer & Save Settings</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    Under the Results & Timing configurations, activate <strong>Server side timing</strong> and disable <strong>Flexible Timer</strong> to enforce a strict, synchronized countdown.
                                </p>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    Click the <strong>Save Settings</strong> button at the bottom of the panel to apply your proctoring and timing rules.
                                </p>
                            </div>
                        </div>

                        {/* Step 8 */}
                        <div className="flex flex-col lg:flex-row gap-8 items-center py-8">
                            <div className="w-full lg:w-1/2 shrink-0">
                                <img src="/user-guide/conduct-exams/step-8.png" alt="Step 8: Distribute Link" className="w-full h-auto object-contain mx-auto block" />
                            </div>
                            <div className="w-full lg:w-1/2 space-y-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    Step 8
                                </span>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Distribute Exam Link</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    Copy the active exam link and share it with your candidates via messaging apps or email.
                                </p>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    You can monitor student submissions in real-time by clicking the <strong>Results</strong> tab/button.
                                </p>
                            </div>
                        </div>

                        {/* Step 9 */}
                        <div className="flex flex-col lg:flex-row gap-8 items-center py-8">
                            <div className="w-full lg:w-1/2 shrink-0">
                                <img src="/user-guide/conduct-exams/step-9.png" alt="Step 9: Conclude Exam" className="w-full h-auto object-contain mx-auto block" />
                            </div>
                            <div className="w-full lg:w-1/2 space-y-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    Step 9
                                </span>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Deactivate or Conclude the Exam</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    To stop accepting candidate responses, click the <strong>Remove</strong> button on the test card. This takes the test out of Active Exam mode.
                                </p>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    You will be prompted with two closure modes:
                                </p>
                                <ol className="list-decimal pl-5 text-slate-600 dark:text-slate-400 text-sm space-y-1">
                                    <li><strong>Stop &amp; Make Public</strong>: Allows candidates to analyze the exam and results; anonymous practice will be enabled.</li>
                                    <li><strong>Stop &amp; Make Private</strong>: Restricts all further student access. Results and analysis are hidden from candidates.</li>
                                </ol>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed pt-2">
                                    After selecting either option, your test will return to the inactive state.
                                </p>
                            </div>
                        </div>
                    </div>
                );

            case 'view-results-guide':
                return (
                    <div className="space-y-6 text-center py-12">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 w-fit rounded-full mx-auto mb-4">
                            <BarChart2 className="h-10 w-10 animate-pulse text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Viewing & Analyzing Results</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed text-sm">
                            This section is currently being updated. In the upcoming release, it will explain how to check student scores, export metrics to Excel, view detailed timelines of tab-switches, and analyze question-by-question metrics.
                        </p>
                        <div className="pt-4">
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                                Coming Soon
                            </span>
                        </div>
                    </div>
                );

            default:
                return <Navigate to="/user-guide/intro" replace />;
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#0c0d0e] transition-colors duration-300" style={{ fontFamily: "'Inter', sans-serif" }}>
            <SEO
                title={activeSlug === 'intro'
                    ? "How to Create a Test Online \u2013 TestoZa User Guide for Teachers"
                    : `${activeInfo.item.title} \u2013 TestoZa Docs`}
                description={activeSlug === 'intro'
                    ? "Step-by-step guide on how to create a test online using TestoZa. Learn to make exams, quizzes, and mock tests with our free online test creator for teachers. Covers AI generation, bulk upload, and LaTeX formatting."
                    : activeInfo.item.description}
                canonicalUrl={`https://testoza.com/user-guide/${activeSlug}`}
                keywords={[
                    "how to create a test online",
                    "how to create a test",
                    "free test maker for teachers",
                    "test making software for teachers free",
                    "online test creator for teachers",
                    "online quiz generator for teachers",
                    "testoza guide",
                    "user guide",
                    "test upload guide",
                    "help documentation"
                ]}
            />

            {/* --- TOP HEADER BAR --- */}
            <header className="sticky top-0 z-[100] w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0c0d0e]/95 backdrop-blur-md transition-colors duration-300">
                <div className="flex h-14 items-center justify-between px-6 max-w-[1440px] mx-auto">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="mr-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden"
                        >
                            <Menu className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                        </button>
                        <div className="flex items-center gap-1.5" onClick={() => navigate('/user-guide')}>
                            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/10">
                                <BookOpen className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-extrabold text-slate-950 dark:text-white tracking-tight">testoza</span>
                            <span className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-md">
                                docs
                            </span>
                        </div>
                    </div>

                    {/* Navigation Center */}
                    <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
                        <button onClick={() => navigate('/user-guide/intro')} className="text-emerald-500 dark:text-emerald-400 border-b-2 border-emerald-500 dark:border-emerald-400 pb-1 translate-y-[9px] px-1">
                            Start
                        </button>
                        <button onClick={() => navigate('/user-guide/bulk-test-upload')} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                            Guides
                        </button>
                        <button onClick={() => navigate('/user-guide/schema-flat')} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                            Reference
                        </button>
                        <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                            App
                        </button>
                    </nav>

                    {/* Right side options */}
                    <div className="flex items-center gap-4">
                        {/* Search input bar */}
                        <div className="relative hidden sm:block w-48 lg:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search documentation..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg outline-none border border-transparent focus:border-slate-200 dark:focus:border-slate-800 focus:bg-white dark:focus:bg-[#0c0d0e] transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>

                        {/* Theme Toggle Button */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors border border-slate-200/55 dark:border-slate-800/80"
                            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                        >
                            {isDark ? <Sun className="h-4 w-4 text-emerald-400" /> : <Moon className="h-4 w-4" />}
                        </button>

                        <button
                            onClick={() => navigate('/dashboard')}
                            className="bg-slate-900 dark:bg-emerald-500 hover:bg-slate-800 dark:hover:bg-emerald-600 text-white dark:text-[#0c0d0e] font-bold text-xs px-3.5 py-2 rounded-lg transition-colors"
                        >
                            Dashboard
                        </button>
                    </div>
                </div>
            </header>

            {/* --- MAIN PAGE LAYOUT --- */}
            <div className="max-w-[1440px] mx-auto flex">
                {/* --- SIDEBAR NAVIGATION --- */}
                {/* Mobile overlay */}
                {sidebarOpen && (
                    <div
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-black/40 z-[98] lg:hidden backdrop-blur-sm"
                    />
                )}

                <aside className={cn(
                    "fixed inset-y-0 left-0 top-14 w-64 xl:w-72 shrink-0 bg-slate-50/50 dark:bg-[#0c0d0e] border-r border-slate-200/80 dark:border-slate-800/80 z-[99] lg:z-10",
                    "lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] overflow-y-auto custom-scrollbar p-5 transition-transform duration-300",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}>
                    {/* Mobile Search input */}
                    <div className="relative sm:hidden mb-4 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search guides..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg outline-none border border-transparent focus:border-slate-200 dark:focus:border-slate-800 transition-all"
                        />
                    </div>

                    <div className="space-y-6">
                        {filteredSections.map((section, idx) => (
                            <div key={idx} className="space-y-1.5">
                                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600 px-3">
                                    {section.title}
                                </h3>
                                <div className="space-y-0.5">
                                    {section.items.map((sub, sIdx) => {
                                        const isActive = activeSlug === sub.slug;
                                        return (
                                            <button
                                                key={sIdx}
                                                onClick={() => {
                                                    navigate(`/user-guide/${sub.slug}`);
                                                    setSidebarOpen(false);
                                                }}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2.5 transition-all duration-150",
                                                    isActive
                                                        ? "text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50/50 dark:bg-emerald-950/20 border-l-2 border-emerald-500"
                                                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-900/40"
                                                )}
                                            >
                                                <span className={cn(
                                                    "shrink-0",
                                                    isActive ? "text-emerald-500" : "text-slate-400 dark:text-slate-500"
                                                )}>
                                                    {sub.icon}
                                                </span>
                                                <span className="truncate">{sub.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {filteredSections.length === 0 && (
                            <div className="text-center py-8 text-slate-400 dark:text-slate-600">
                                <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
                                <p className="text-xs">No documentation matched.</p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* --- MAIN CONTENT WINDOW --- */}
                <main className="flex-1 min-w-0 min-h-[calc(100vh-3.5rem)] bg-white dark:bg-[#0c0d0e] transition-colors duration-300">
                    <div className="max-w-4xl mx-auto px-6 sm:px-10 py-10">
                        {/* Breadcrumbs */}
                        <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-6 font-medium">
                            <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer" onClick={() => navigate('/user-guide')}>
                                Docs
                            </span>
                            <ChevronRight className="h-3 w-3" />
                            <span>{activeInfo.category}</span>
                            <ChevronRight className="h-3 w-3" />
                            <span className="text-slate-900 dark:text-slate-100 font-bold">{activeInfo.item.title}</span>
                        </nav>

                        {/* Title Header */}
                        <div className="mb-8 border-b border-slate-200/60 dark:border-slate-800/60 pb-6">
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight leading-[1.1] mb-3">
                                {activeInfo.item.title}
                            </h1>
                            <p className="text-base text-slate-500 dark:text-slate-400 font-medium">
                                {activeInfo.item.description}
                            </p>
                        </div>

                        {/* Main Body content renderer */}
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                            {renderContent()}
                        </div>

                        {/* --- PREV / NEXT NAV BUTTONS --- */}
                        <div className="mt-14 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {prevItem ? (
                                <button
                                    onClick={() => navigate(`/user-guide/${prevItem.slug}`)}
                                    className="flex flex-col items-start p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121316] hover:border-emerald-500 dark:hover:border-emerald-500/50 hover:shadow-sm transition-all group text-left"
                                >
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                                        <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
                                        Previous
                                    </span>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                                        {prevItem.title}
                                    </span>
                                </button>
                            ) : <div />}

                            {nextItem ? (
                                <button
                                    onClick={() => navigate(`/user-guide/${nextItem.slug}`)}
                                    className="flex flex-col items-end p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121316] hover:border-emerald-500 dark:hover:border-emerald-500/50 hover:shadow-sm transition-all group text-right"
                                >
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                                        Next
                                        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                                    </span>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                                        {nextItem.title}
                                    </span>
                                </button>
                            ) : null}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

// --- Dynamic AI Prompt Content Lists ---
const AI_PARSING_PROMPT = `ROLE:
You are an expert exam question formatter for a web platform that renders KaTeX + mhchem inside plain text fields.

GOAL:
Convert the uploaded image/PDF/handwritten notes into individual question blocks.
Each question must be in a SEPARATE code snippet for copy-paste into a textarea field.

PLATFORM SUPPORTS:
• Inline math:   $...$       → $x^2 + y^2$
• Block math:    $$...$$     → $$\\int_0^1 x^2 \\\\, dx$$
• Chemistry:     $\\ce{...}$  → $\\ce{H2SO4}$
• Tables:        $$\\begin{array}{|c|c|} ... \\\\end{array}$$

FORMATTING RULES:
1. Every LaTeX command in your output must start with EXACTLY ONE backslash character (e.g. \\frac, not \\\\frac).
2. The ONLY exception: inside \\begin{array}...\\end{array}, row separators use \\\\ (two backslashes).
3. Do NOT use escaped newline characters (\\n). Use <br> for line breaks within questions and options.
4. For Passage questions, prefix with [PASSAGE: <text>]`;

const AI_SECTION_PROMPT = `ROLE:
You are a high-precision AI exam parser specialized in complex multi-section competitive exams (JEE/NEET/GATE/SSC/UPSC style).

GOAL:
Convert the PROVIDED PDF/IMAGE/TEXT into a STRICTLY VALID JSON test file.

STRICT JSON OUTPUT FORMAT (SECTION MODE):
{
  "title": "Exam Title",
  "description": "Description details",
  "duration": 180,
  "sections": [
    {
      "id": "section-id-1",
      "name": "Physics",
      "instructions": "Attempt all questions.",
      "attempt_control": {
        "enabled": true,
        "mode": "hard",
        "max_attempts": 10
      },
      "questions": [
        {
          "id": 1,
          "type": "single | multiple | numerical",
          "question": "Question text with double backslash LaTeX (\\\\frac)",
          "marks": "4",
          "negativeMarks": "1",
          "options": {
            "A": "Option text",
            "B": "Option text",
            "C": "Option text",
            "D": "Option text"
          },
          "correctAnswer": "A",
          "groupId": "",
          "passageContent": ""
        }
      ]
    }
  ]
}`;

const AI_SOLUTIONS_PROMPT = `ROLE:
You are an AI document parser specialized in bulk exam explanations.

GOAL:
Convert the provided solution sheet into a valid JSON file mapping answers to question IDs.

STRICT JSON FORMAT:
{
  "solutions": [
    "Sequential solution 1 text with double backslash LaTeX (\\\\frac)...",
    "Sequential solution 2 text..."
  ]
}`;
