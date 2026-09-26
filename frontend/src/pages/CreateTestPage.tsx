import React, { useState, useEffect, lazy, Suspense } from 'react';

import { SEO } from '@/components/SEO';
import TestBuilder from '@/components/TestBuilder';
const AITestImporter = lazy(() => import('./AITestImporter'));
import { Loader2, ChevronDown, HelpCircle, Clock, ShieldAlert, Layers, ArrowLeft } from 'lucide-react';

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

const CAPABILITIES = [
    {
        icon: <Layers className="h-[18px] w-[18px]" />,
        tone: 'bg-sky-100 text-sky-700',
        title: 'Diverse Question Formats',
        text: 'Support for Single-choice MCQs, Multi-select (MSQs), Numerical values, True/False, and Fill-in-the-blank questions with rich text and LaTeX equation formatting.',
    },
    {
        icon: <Clock className="h-[18px] w-[18px]" />,
        tone: 'bg-emerald-100 text-emerald-700',
        title: 'Timer & Scheduling',
        text: 'Configure total exam countdowns, section-wise timers, auto-submission upon expiry, and fixed date-and-time testing windows.',
    },
    {
        icon: <ShieldAlert className="h-[18px] w-[18px]" />,
        tone: 'bg-rose-100 text-rose-700',
        title: 'Marking & Negative Marking',
        text: 'Assign custom positive marks and fractional penalties (-0.25, -0.33, -0.5, -1). Scores and deductions calculate automatically.',
    },
];

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
                <button
                    type="button"
                    onClick={() => setShowImporter(false)}
                    className="mb-4 inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[15px] font-semibold text-sky-700 hover:bg-sky-50"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to my test
                </button>
                <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                    <AITestImporter onImport={handleImport} />
                </Suspense>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen">
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

            {/* Reference & FAQ — still in the page for search engines, folded away for teachers */}
            {!paramId && (
                <div className="mx-auto w-full max-w-4xl px-3 pb-16 pt-4 sm:px-6 lg:pr-[132px] xl:max-w-5xl">
                    <details className="group overflow-hidden rounded-2xl bg-white/70 ring-1 ring-slate-900/[0.06]">
                        <summary className="flex cursor-pointer list-none items-center gap-3.5 px-4 py-3.5 sm:px-5 [&::-webkit-details-marker]:hidden">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-slate-100 text-slate-500">
                                <HelpCircle className="h-[18px] w-[18px]" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-[15px] font-semibold text-slate-800">Help: question types, marking &amp; common questions</span>
                                <span className="block text-[13px] text-slate-500">What the test builder can do, and answers to frequent questions</span>
                            </span>
                            <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
                        </summary>

                        <div className="border-t border-slate-100 px-4 pb-6 pt-5 sm:px-6">
                            <h2 className="text-[19px] font-bold tracking-[-0.01em] text-slate-900">
                                Manual Test Building Capabilities &amp; Exam Rules
                            </h2>
                            <p className="mt-1 text-[14px] text-slate-600">
                                Everything you can customize in TestoZa's test editor to match your curriculum, competitive exams, and classroom evaluations.
                            </p>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                {CAPABILITIES.map(card => (
                                    <div key={card.title} className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-900/[0.05]">
                                        <span className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${card.tone}`}>{card.icon}</span>
                                        <h3 className="mt-2.5 text-[15px] font-semibold text-slate-900">{card.title}</h3>
                                        <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{card.text}</p>
                                    </div>
                                ))}
                            </div>

                            <h3 className="mt-7 text-[17px] font-bold text-slate-900">Frequently Asked Questions About Creating Tests</h3>
                            <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl ring-1 ring-slate-900/[0.06]">
                                {CREATE_TEST_FAQS.map((faq, idx) => (
                                    <details key={idx} className="group/faq bg-white">
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-[15px] font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                                            <span>{faq.q}</span>
                                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-open/faq:rotate-180" />
                                        </summary>
                                        <p className="px-4 pb-4 text-[14px] leading-relaxed text-slate-600">{faq.a}</p>
                                    </details>
                                ))}
                            </div>
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
}
