/**
 * pdf.testoza.com/ — the Panna hub. Built to hold more PDF tools later; today
 * it leads with the editors and the LaTeX / ChatGPT to PDF converters.
 * Title, description and structured data come from site/routes.ts.
 */
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Bot, FileText, Languages, Layers, Lock, Minimize2, PenLine, Scissors, Sigma, Sparkles, WandSparkles } from 'lucide-react';
import { PANNA, testozaUrl } from '../brand';
import { setPendingFile } from '../handoff';
import { COMMON_FACTS, DEFINITIONS, EDITOR_COMPARE, HOME_FAQS } from '../site/content';
import Dropzone from '../ui/Dropzone';
import PannaHeader from '../ui/PannaHeader';
import { PannaMark } from '../ui/PannaLogo';
import { CompareTable, FaqSection, QuickFacts } from '../ui/Sections';

const TOOLS = [
    { to: PANNA.routes.editor, icon: PenLine, title: 'Edit PDF', text: 'Change existing text in the PDF’s own font, erase for real, sign, highlight, add text and images, reorder pages.' },
    { to: PANNA.routes.hindi, icon: Languages, title: 'Edit Hindi PDF', text: 'Fix Hindi names, marks and forms with matras and conjuncts shaped correctly — हिंदी PDF एडिट करें।' },
    { to: PANNA.routes.latex, icon: Sigma, title: 'LaTeX to PDF', text: 'Paste LaTeX or maths from your notes and get a clean, print-ready PDF with real text.' },
    { to: PANNA.routes.chatgpt, icon: Bot, title: 'ChatGPT to PDF', text: 'Save ChatGPT, Gemini or Claude answers as a PDF with every equation intact.' },
];

const SOON = [
    { icon: Layers, label: 'Merge PDFs' },
    { icon: Scissors, label: 'Split PDF' },
    { icon: Minimize2, label: 'Compress PDF' },
    { icon: FileText, label: 'PDF to Word' },
];

export default function PdfToolsLanding() {
    const navigate = useNavigate();
    return (
        <div className="bg-white font-[Outfit,system-ui,sans-serif] text-slate-900">
            <PannaHeader />
            <main>
                {/* Hero */}
                <section className="relative overflow-hidden">
                    <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_18%_0%,rgba(16,185,129,0.16),transparent),radial-gradient(700px_380px_at_90%_20%,rgba(14,165,233,0.10),transparent)]" />
                    <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
                        <div>
                            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                                <PannaMark className="h-4 w-4" /> {PANNA.name} · free PDF tools {PANNA.by}
                            </p>
                            <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.06] tracking-tight sm:text-[56px]">
                                Free PDF tools that keep your document <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">looking like itself</span>
                            </h1>
                            <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-slate-600">
                                Fix a name on a certificate, update marks on a result sheet or correct a Hindi application form — in the original font, free, and without uploading your file anywhere.
                            </p>
                            <div className="mt-7 flex flex-wrap gap-3">
                                <Link to={PANNA.routes.editor} className="inline-flex h-12 items-center gap-2 rounded-xl bg-slate-900 px-6 font-semibold text-white hover:bg-slate-800">
                                    Edit a PDF <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link to={PANNA.routes.latex} className="inline-flex h-12 items-center gap-2 rounded-xl px-5 font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
                                    <Sigma className="h-4 w-4" /> LaTeX to PDF
                                </Link>
                            </div>
                        </div>
                        <Dropzone
                            label="Edit a PDF"
                            onFile={(f) => {
                                setPendingFile(f);
                                navigate(PANNA.routes.editor);
                            }}
                        />
                    </div>
                </section>

                <QuickFacts heading="What is Panna?" definition={DEFINITIONS.home} facts={COMMON_FACTS} />

                {/* Tools */}
                <section id="tools" aria-labelledby="tools-heading" className="border-t border-slate-100 bg-slate-50/70">
                    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                        <h2 id="tools-heading" className="text-3xl font-bold tracking-tight">
                            PDF tools
                        </h2>
                        <p className="mt-2 max-w-2xl text-slate-600">Every tool runs in your browser: free, with no sign-up and no watermark.</p>
                        <ul className="mt-8 grid gap-5 md:grid-cols-2">
                            {TOOLS.map(({ to, icon: Icon, title, text }) => (
                                <li key={to}>
                                    <Link to={to} className="group relative flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_20px_40px_-24px_rgba(5,150,105,0.45)]">
                                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-white">
                                            <Icon className="h-6 w-6" />
                                        </span>
                                        <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                                        <p className="mt-2 flex-1 leading-relaxed text-slate-600">{text}</p>
                                        <span className="mt-5 inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                                            Open {title} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                            <span className="font-medium text-slate-600">Coming next:</span>
                            {SOON.map(({ icon: Icon, label }) => (
                                <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                                    <Icon className="h-3.5 w-3.5" /> {label}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                <CompareTable
                    heading="Why not just use any online PDF editor?"
                    intro="Most online editors cover your text with a white rectangle and type over it in Helvetica — then ask for a card number before you can download."
                    rows={EDITOR_COMPARE}
                />

                {/* Privacy + TestoZa */}
                <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-16 sm:px-6 md:grid-cols-2">
                    <div className="rounded-3xl bg-slate-900 p-8 text-white">
                        <Lock className="h-7 w-7 text-emerald-400" />
                        <h2 className="mt-4 text-2xl font-semibold">Private by design</h2>
                        <p className="mt-2 leading-relaxed text-slate-300">Your PDF is opened and edited inside your browser. It is never uploaded — so answer keys, marksheets and ID documents stay with you.</p>
                    </div>
                    <div className="rounded-3xl bg-gradient-to-br from-sky-50 to-emerald-50 p-8 ring-1 ring-slate-200">
                        <WandSparkles className="h-7 w-7 text-sky-600" />
                        <h2 className="mt-4 text-2xl font-semibold">Teaching from PDFs?</h2>
                        <p className="mt-2 leading-relaxed text-slate-600">TestoZa turns a PDF of questions into an online test with auto-grading and results in minutes.</p>
                        <a href={testozaUrl('/pdf-to-quiz')} className="mt-4 inline-flex items-center gap-1.5 font-semibold text-sky-700 hover:text-sky-800">
                            <Sparkles className="h-4 w-4" /> Make a test from a PDF
                        </a>
                    </div>
                </section>

                <FaqSection heading="Questions about Panna" faqs={HOME_FAQS} />
            </main>
        </div>
    );
}
