import React, { useState, useEffect, lazy, Suspense } from 'react';

import { SEO } from '@/components/SEO';
import TestBuilder from '@/components/TestBuilder';
const AITestImporter = lazy(() => import('./AITestImporter'));
import { Button } from '@/components/ui/button';
import { FileText, Loader2, ChevronDown, HelpCircle, CheckCircle2, Clock, ShieldAlert, Layers, BookOpen } from 'lucide-react';

import { useLocation, useParams } from 'react-router-dom';

const CREATE_TEST_FAQS = [
    {
        q: "What question types does TestoZa support?",
        a: "TestoZa supports multiple question formats including Single-Choice Multiple Choice Questions (MCQs), Multiple-Select Questions (MSQs), Numerical Value Questions, True or False, Fill-in-the-Blanks, and Short Answer questions. You can combine different question types within a single test or organize them into distinct subject sections to mirror standard competitive and school exam formats."
    },
    {
        q: "Can I import questions from Word or Excel?",
        a: "Yes, you can import questions in bulk from Microsoft Word documents, Excel spreadsheets, or text files. With our AI and text import tools, you can simply copy and paste your existing question sets or upload documents directly. The system automatically parses question text, answer options, and correct answers into structured, editable test questions."
    },
    {
        q: "Can I add images or math equations to questions?",
        a: "Yes, TestoZa provides full support for images, diagrams, and complex mathematical formulas. You can upload images directly into questions and answer explanations, and format scientific notations and equations using LaTeX syntax. This makes it easy to construct technical exams in Mathematics, Physics, Chemistry, and Engineering."
    },
    {
        q: "How do I configure negative marking and marking schemes?",
        a: "You can configure custom marking schemes for each question or section within the test builder. Specify the positive marks awarded for correct answers and choose fractional negative deductions (such as -0.25, -0.33, -0.5, or -1) for incorrect responses. TestoZa calculates aggregate scores and negative deductions automatically when students submit their tests."
    },
    {
        q: "Can I organize tests into multiple sections?",
        a: "Yes, you can divide any test into multiple named sections—such as Physics, Chemistry, and Mathematics, or Section A (Objective) and Section B (Numerical). Each section can have its own instructions, question count, and optional sectional time limits, giving students an authentic exam environment."
    },
    {
        q: "Can I download results and student responses as an Excel sheet?",
        a: "Yes, you can export complete exam results and individual student scorecards to an Excel (CSV/XLSX) spreadsheet with a single click. The download includes student names, roll numbers, total scores, section-wise marks, accuracy percentages, time spent per question, and timestamps for comprehensive offline record-keeping."
    },
    {
        q: "Can I schedule an exam to open and close at specific times?",
        a: "Yes, you can schedule tests with precise start and end dates and times. Once scheduled, the test becomes accessible only during the designated exam window. You can also configure whether students can review answers immediately upon submission or only after the test window has officially closed."
    }
];

const createTestFAQSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": CREATE_TEST_FAQS.map(faq => ({
        "@type": "Question",
        "name": faq.q,
        "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.a
        }
    }))
};

export default function CreateTestPage() {
    const location = useLocation();
    const { id: paramId } = useParams();
    const [showImporter, setShowImporter] = useState(false);
    const [importedData, setImportedData] = useState<any>(null);

    // Handle imported data from navigation state (e.g., from /generate-with-ai route)
    useEffect(() => {
        if (location.state?.importedData) {
            setImportedData(location.state.importedData);
            // Clear the state to prevent re-processing on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const handleImport = (data: any) => {
        setImportedData(data);
        setShowImporter(false);
    };

    if (showImporter) {
        return (
            <div className="container mx-auto py-6">
                <Button variant="ghost" onClick={() => setShowImporter(false)} className="mb-4">
                    Back to Editor
                </Button>
                <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                    <AITestImporter onImport={handleImport} />
                </Suspense>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
            <SEO
                title={paramId ? "Edit Online Test | TestoZa" : "Create Online Test & Exam – Manual Question Builder & Rules | TestoZa"}
                description={paramId ? "Edit your online test, manage questions, sections, and scoring." : "Build online tests and exams manually with custom question types, timer settings, negative marking, section rules, and anti-cheat proctoring. Free for teachers and coaching institutes."}
                canonicalUrl={paramId ? `https://testoza.com/edit-test/${paramId}` : "https://testoza.com/create-test"}
                schemas={paramId ? [] : [createTestFAQSchema]}
            />
            
            <TestBuilder
                key={importedData ? 'imported-test' : (paramId ? `edit-${paramId}` : 'new-test')}
                initialData={importedData}
                onAiImport={() => setShowImporter(true)}
            />

            {/* Educational / Capability Reference Section (Visible below the builder for educators & crawlers) */}
            {!paramId && (
                <div className="container mx-auto px-4 py-16 max-w-5xl border-t border-slate-200 dark:border-slate-800 mt-12">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 mb-3">
                            <BookOpen className="w-3.5 h-3.5" />
                            Educator Reference Guide
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            Manual Test Building Capabilities & Exam Rules
                        </h2>
                        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                            Everything you can customize in TestoZa's test editor to match your curriculum, competitive exams, and classroom evaluations.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-2.5">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                                <Layers className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">Diverse Question Formats</h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                Support for Single-choice MCQs, Multi-select (MSQs), Numerical values, True/False, and Fill-in-the-blank questions with rich text and LaTeX equation formatting.
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-2.5">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                                <Clock className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">Timer & Scheduling</h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                Configure total exam countdowns, section-wise timers, auto-submission upon expiry, and fixed date-and-time testing windows.
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-2.5">
                            <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center">
                                <ShieldAlert className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">Marking & Negative Marking</h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                Assign custom positive marks and fractional penalties (-0.25, -0.33, -0.5, -1). Scores and deductions calculate automatically.
                            </p>
                        </div>
                    </div>

                    {/* Test Creation FAQs */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-sm">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-3">
                                <HelpCircle className="w-3.5 h-3.5" />
                                Test Creation Questions
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                Frequently Asked Questions About Creating Tests
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                Detailed guidance on question formats, import options, and scoring rules.
                            </p>
                        </div>

                        <div className="space-y-4 max-w-3xl mx-auto">
                            {CREATE_TEST_FAQS.map((faq, idx) => (
                                <details
                                    key={idx}
                                    className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-5 transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-800 open:bg-white dark:open:bg-slate-900 open:shadow-sm"
                                >
                                    <summary className="flex cursor-pointer items-center justify-between font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base list-none select-none">
                                        <span>{faq.q}</span>
                                        <ChevronDown className="w-5 h-5 text-slate-400 transition-transform duration-200 group-open:rotate-180 shrink-0 ml-4" />
                                    </summary>
                                    <p className="mt-3 text-slate-600 dark:text-slate-300 leading-relaxed text-xs sm:text-sm border-t border-slate-100 dark:border-slate-800 pt-3">
                                        {faq.a}
                                    </p>
                                </details>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
