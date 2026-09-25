/**
 * /pdf — the Panna hub. Built to hold more PDF tools later; today it leads
 * with the editor and the LaTeX-to-PDF converter.
 */
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Check, FileText, Layers, Lock, Minimize2, PenLine, Scissors, Sigma, Sparkles, WandSparkles, X } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { PANNA } from '../brand';
import { setPendingFile } from '../handoff';
import Dropzone from '../ui/Dropzone';
import PannaHeader from '../ui/PannaHeader';
import { PannaMark } from '../ui/PannaLogo';

const TOOLS = [
    { to: PANNA.routes.editor, icon: PenLine, title: 'PDF Editor', text: 'Edit existing text in its own font, erase, sign, highlight, add text and images, reorder pages.', live: true },
    { to: PANNA.routes.latex, icon: Sigma, title: 'LaTeX to PDF', text: 'Paste maths from ChatGPT, Gemini or your notes and get a clean, print-ready PDF.', live: true },
];

const SOON = [
    { icon: Layers, label: 'Merge PDFs' },
    { icon: Scissors, label: 'Split PDF' },
    { icon: Minimize2, label: 'Compress PDF' },
    { icon: FileText, label: 'PDF to Word' },
];

const COMPARE: [string, boolean | string, boolean | string][] = [
    ['Edits keep the PDF’s own font', true, 'Swaps in Arial/Times'],
    ['Removed text is actually deleted', true, 'Hidden under a white box'],
    ['Table cells edit independently', true, 'Whole column as one box'],
    ['Hindi (Devanagari) editing', true, 'Often broken'],
    ['Find & replace across pages', true, false],
    ['Download without an account', true, 'Paywall at download'],
    ['Your file stays on your device', true, 'Uploaded to a server'],
    ['Price', 'Free', 'Cheap trial that turns into a subscription'],
];

const FAQS = [
    { q: 'What is Panna?', a: 'Panna (पन्ना, “page”) is a set of free PDF tools by TestoZa. It starts with a PDF editor that keeps your document’s own fonts, and a LaTeX-to-PDF converter for maths.' },
    { q: 'Do I need an account?', a: 'No. Open the tool, work, download. No account, no watermark, no subscription.' },
    { q: 'Are my files safe?', a: 'Your PDF is processed inside your browser and never uploaded. Autosave keeps your work only in this browser.' },
    { q: 'Which tools are coming next?', a: 'Merge, split, compress and PDF-to-Word are next. Tell us what you need on the TestoZa support page.' },
];

function Cell({ v }: { v: boolean | string }) {
    if (v === true) return <Check className="mx-auto h-5 w-5 text-emerald-600" aria-label="Yes" />;
    if (v === false) return <X className="mx-auto h-5 w-5 text-slate-300" aria-label="No" />;
    return <span className="text-[13px] text-slate-500">{v}</span>;
}

export default function PdfToolsLanding() {
    const navigate = useNavigate();
    return (
        <div className="bg-white font-[Outfit,system-ui,sans-serif] text-slate-900">
            <SEO
                title="Panna — Free PDF Tools: Edit PDF in the Same Font, LaTeX to PDF"
                description="Free online PDF tools by TestoZa. Edit PDF text in its original font (Hindi and English), erase for real, sign and annotate, and convert LaTeX or ChatGPT maths to PDF. No sign-up, no watermark, files stay on your device."
                url={PANNA.routes.home}
                keywords={['pdf tools', 'free pdf editor', 'edit pdf same font', 'hindi pdf editor', 'latex to pdf', 'pdf editor no watermark']}
                schemas={[
                    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
                ]}
            />
            <PannaHeader />

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_18%_0%,rgba(16,185,129,0.16),transparent),radial-gradient(700px_380px_at_90%_20%,rgba(14,165,233,0.10),transparent)]" />
                <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
                    <div>
                        <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                            <PannaMark className="h-4 w-4" /> {PANNA.name} · PDF tools {PANNA.by}
                        </p>
                        <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.06] tracking-tight sm:text-[56px]">
                            PDF tools that keep your document <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">looking like itself</span>
                        </h1>
                        <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-slate-600">
                            Fix a name on a certificate, update marks on a result sheet or correct a Hindi application form — in the original font, free, and without uploading your file anywhere.
                        </p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link to={PANNA.routes.editor} className="inline-flex h-12 items-center gap-2 rounded-xl bg-slate-900 px-6 font-semibold text-white hover:bg-slate-800">
                                Open the PDF editor <ArrowRight className="h-4 w-4" />
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

            {/* Tools */}
            <section id="tools" className="border-t border-slate-100 bg-slate-50/70">
                <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                    <h2 className="text-3xl font-bold tracking-tight">Tools</h2>
                    <div className="mt-8 grid gap-5 md:grid-cols-2">
                        {TOOLS.map(({ to, icon: Icon, title, text }) => (
                            <Link key={to} to={to} className="group relative rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_20px_40px_-24px_rgba(5,150,105,0.45)]">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-white">
                                    <Icon className="h-6 w-6" />
                                </div>
                                <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                                <p className="mt-2 leading-relaxed text-slate-600">{text}</p>
                                <span className="mt-5 inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                                    Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                                </span>
                            </Link>
                        ))}
                    </div>
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

            {/* Comparison */}
            <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
                <h2 className="text-center text-3xl font-bold tracking-tight">Why not just use any online editor?</h2>
                <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">Most of them cover your text with a white rectangle and type over it in Helvetica — then ask for a card number before you can download.</p>
                <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[13px] text-slate-600">
                            <tr>
                                <th className="px-4 py-3 font-medium" />
                                <th className="w-32 px-4 py-3 text-center font-semibold text-emerald-700">{PANNA.name}</th>
                                <th className="w-40 px-4 py-3 text-center font-medium">Typical online editor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {COMPARE.map(([label, a, b]) => (
                                <tr key={label}>
                                    <td className="px-4 py-3 font-medium text-slate-800">{label}</td>
                                    <td className="px-4 py-3 text-center">
                                        <Cell v={a} />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Cell v={b} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Privacy + TestoZa */}
            <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-16 sm:px-6 md:grid-cols-2">
                <div className="rounded-3xl bg-slate-900 p-8 text-white">
                    <Lock className="h-7 w-7 text-emerald-400" />
                    <h3 className="mt-4 text-2xl font-semibold">Private by design</h3>
                    <p className="mt-2 leading-relaxed text-slate-300">Your PDF is opened and edited inside your browser. It is never uploaded — so answer keys, marksheets and ID documents stay with you.</p>
                </div>
                <div className="rounded-3xl bg-gradient-to-br from-sky-50 to-emerald-50 p-8 ring-1 ring-slate-200">
                    <WandSparkles className="h-7 w-7 text-sky-600" />
                    <h3 className="mt-4 text-2xl font-semibold">Teaching from PDFs?</h3>
                    <p className="mt-2 leading-relaxed text-slate-600">TestoZa turns a PDF of questions into an online test with auto-grading and results in minutes.</p>
                    <Link to="/pdf-to-quiz" className="mt-4 inline-flex items-center gap-1.5 font-semibold text-sky-700 hover:text-sky-800">
                        <Sparkles className="h-4 w-4" /> Make a test from a PDF
                    </Link>
                </div>
            </section>

            {/* FAQ */}
            <section className="border-t border-slate-100 bg-slate-50/70">
                <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
                    <h2 className="text-3xl font-bold tracking-tight">Questions</h2>
                    <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                        {FAQS.map((f) => (
                            <details key={f.q} className="group px-5 py-4">
                                <summary className="cursor-pointer list-none font-medium text-slate-900">
                                    <span className="flex items-center justify-between gap-4">
                                        {f.q}
                                        <span className="text-slate-400 transition group-open:rotate-45">+</span>
                                    </span>
                                </summary>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
