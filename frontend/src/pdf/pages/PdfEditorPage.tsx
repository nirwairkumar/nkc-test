/**
 * pdf.testoza.com/edit-pdf (and /edit-hindi-pdf) — pick a PDF (or resume the
 * last one), then the full-screen workspace. Everything runs in the browser:
 * the file is never uploaded. The "hindi" variant is the same editor with
 * copy written for people editing Hindi documents.
 * Title, description and structured data come from site/routes.ts.
 */
import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, FileLock2, Keyboard, Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PANNA } from '../brand';
import type { PageEdit, PageSlot } from '../engine/edits';
import { takePendingFile } from '../handoff';
import { COMMON_FACTS, DEFINITIONS, EDITOR_COMPARE, EDITOR_FAQS, EDITOR_STEPS, EDITOR_TOOLS, HINDI_FAQS, HINDI_STEPS, HINDI_SUPPORT, TOOL_FACTS } from '../site/content';
import PannaHeader from '../ui/PannaHeader';
import Dropzone from '../ui/Dropzone';
import { CompareTable, FaqSection, HowToSteps, QuickFacts, RelatedTools, Screenshot } from '../ui/Sections';
import { clearSession, loadSession, type SavedSession } from '../editor/persist';
import type { PdfSession } from '../session/session';

// pdf.js + pdf-lib are only downloaded once a file is actually opened.
const Workspace = lazy(() => import('../editor/Workspace'));

const Opening = () => (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
);

const HERO = {
    default: {
        badge: 'Free · No sign-up · No watermark',
        title: (
            <>
                Edit PDF text online — <span className="text-emerald-600">in the same font</span>
            </>
        ),
        intro: 'Change names, dates, marks and whole paragraphs in any PDF — Hindi or English — and download it looking like it was never touched.',
        points: ["Uses your PDF's own fonts", 'Removed text is truly deleted', 'Works on phones and laptops', 'Runs in your browser — private by design'],
    },
    hindi: {
        badge: 'Free · हिंदी · No upload',
        title: (
            <>
                Edit Hindi PDF online —{' '}
                <span lang="hi" className="text-emerald-600">
                    हिंदी PDF एडिट करें
                </span>
            </>
        ),
        intro: 'Change Hindi names, marks and application forms in any PDF. Matras and conjuncts are shaped correctly and the text stays searchable — free, and your file never leaves your device.',
        points: ['मात्राएँ और संयुक्त अक्षर सही बनते हैं', 'Hindi and English in one document', 'Edited text stays searchable and copyable', 'Runs in your browser — nothing uploaded'],
    },
};

function timeAgo(t: number) {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

function EditorContent() {
    return (
        <>
            <HowToSteps heading="How to edit a PDF online" intro="Three steps, no account. The whole thing happens in your browser tab." steps={EDITOR_STEPS} />
            <Screenshot src="/screenshots/edit-pdf.webp" alt="Editing a line of text in a PDF with the Panna editor — the new words use the document's own font" />

            <section aria-labelledby="can-do" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                <h2 id="can-do" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Everything you can do in the PDF editor
                </h2>
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {EDITOR_TOOLS.map((t) => (
                        <div key={t.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                            <h3 className="font-semibold text-slate-900">{t.title}</h3>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600">{t.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section aria-labelledby="same-font" className="border-y border-slate-200/70 bg-white">
                <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
                    <h2 id="same-font" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        Why edits made with Panna don’t look edited
                    </h2>
                    <div className="mt-5 space-y-4 leading-relaxed text-slate-700">
                        <p>
                            Most online PDF editors can’t write with the fonts embedded in your PDF. So they paint a white box over the old words and type new ones in Arial or Helvetica. The result is easy to spot — and the original text is
                            still in the file underneath the box.
                        </p>
                        <p>
                            Panna edits the page itself. It reads how each line was written, writes your new words with the <strong>same embedded font</strong>, at the same size, colour and spacing, and removes the old words from the file.
                            Paragraphs re-flow from the first changed line, so the rest of the page stays exactly as it was.
                        </p>
                        <p>
                            PDFs often contain only the letters they already use. If you type a letter that isn’t in the font — say a capital “V” in a document that never had one — Panna tells you before you finish and draws just that
                            letter in the closest matching font.
                        </p>
                    </div>
                </div>
            </section>

            <CompareTable heading="Panna vs typical online PDF editors" intro="What happens to your document, feature by feature." rows={EDITOR_COMPARE} />

            <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-br from-emerald-50 to-sky-50 p-7 ring-1 ring-slate-200">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">
                            Editing a Hindi document? <span lang="hi">हिंदी PDF</span>
                        </h2>
                        <p className="mt-1 max-w-2xl text-slate-600">Panna shapes Devanagari properly — matras, conjuncts and reph — and keeps the text searchable. See what works with Unicode and old Kruti Dev files.</p>
                    </div>
                    <Link to={PANNA.routes.hindi} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800">
                        Edit a Hindi PDF <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            <FaqSection heading="PDF editor questions" faqs={EDITOR_FAQS} />
            <RelatedTools current="editor" />
        </>
    );
}

function HindiContent() {
    return (
        <>
            <HowToSteps heading="हिंदी PDF कैसे एडिट करें — how to edit a Hindi PDF" steps={HINDI_STEPS} />
            <Screenshot src="/screenshots/edit-hindi-pdf.webp" alt="Editing a Hindi application form in Panna — the new Hindi text is shaped correctly" />

            <section aria-labelledby="why-hindi" className="border-y border-slate-200/70 bg-white">
                <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
                    <h2 id="why-hindi" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        Why Hindi text breaks in most PDF editors
                    </h2>
                    <div className="mt-5 space-y-4 leading-relaxed text-slate-700">
                        <p>
                            Hindi is not written one letter after another. The <span lang="hi">ि</span> matra is drawn before the consonant it follows, <span lang="hi">क्ष</span> and <span lang="hi">त्र</span> are single joined shapes, and the
                            reph in <span lang="hi">धर्म</span> sits on top of the next letter. Getting this right is called <em>text shaping</em>.
                        </p>
                        <p>
                            Many PDF editors skip shaping, so edited Hindi comes out with matras in the wrong place, broken conjuncts, or text that can no longer be searched or copied. Panna shapes every word with the OpenType rules of Noto
                            Sans Devanagari and stores the real Hindi text alongside it, so the page looks right <em>and</em> search, copy-paste and screen readers still work.
                        </p>
                    </div>
                </div>
            </section>

            <section aria-labelledby="which-hindi" className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
                <h2 id="which-hindi" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Which Hindi PDFs can be edited?
                </h2>
                <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full min-w-[560px] text-left text-sm">
                        <thead className="bg-slate-50 text-[13px] text-slate-600">
                            <tr>
                                <th scope="col" className="px-4 py-3 font-medium">
                                    Type of Hindi PDF
                                </th>
                                <th scope="col" className="px-4 py-3 font-medium">
                                    What to do
                                </th>
                                <th scope="col" className="px-4 py-3 font-medium">
                                    Why
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 align-top">
                            {HINDI_SUPPORT.map(([kind, action, why]) => (
                                <tr key={kind}>
                                    <th scope="row" className="px-4 py-3 font-medium text-slate-800">
                                        {kind}
                                    </th>
                                    <td className="px-4 py-3 font-semibold text-emerald-700">{action}</td>
                                    <td className="px-4 py-3 text-slate-600">{why}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section aria-labelledby="typing" className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
                <div className="rounded-3xl bg-slate-900 p-7 text-white sm:p-9">
                    <Keyboard className="h-7 w-7 text-emerald-400" />
                    <h2 id="typing" className="mt-4 text-2xl font-semibold">
                        Typing Hindi: <span lang="hi">कैसे लिखें</span>
                    </h2>
                    <ul className="mt-4 grid gap-3 text-slate-300 sm:grid-cols-3">
                        <li>
                            <strong className="text-white">Android / iPhone:</strong> add Hindi in Gboard or the iOS keyboard and type phonetically (“namaste” → नमस्ते).
                        </li>
                        <li>
                            <strong className="text-white">Windows:</strong> Settings → Time &amp; language → Language &amp; region → add Hindi, then switch with Win + Space.
                        </li>
                        <li>
                            <strong className="text-white">Anywhere:</strong> write the text in Google Docs or WhatsApp, copy it, and paste it into the PDF.
                        </li>
                    </ul>
                </div>
            </section>

            <FaqSection heading="सवाल-जवाब · Questions" faqs={HINDI_FAQS} />
            <RelatedTools current="hindi" />
        </>
    );
}

export default function PdfEditorPage({ variant = 'default' }: { variant?: 'default' | 'hindi' }) {
    const [session, setSession] = useState<PdfSession | null>(null);
    const [initial, setInitial] = useState<{ edits: PageEdit[]; slots: PageSlot[] } | undefined>();
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState<SavedSession | null>(null);
    const [pw, setPw] = useState<{ bytes: Uint8Array; name: string; resume?: SavedSession; wrong: boolean } | null>(null);
    const [pwValue, setPwValue] = useState('');
    const hero = HERO[variant];

    const open = useCallback(async (bytes: Uint8Array, name: string, password?: string, resume?: SavedSession) => {
        setBusy(true);
        try {
            const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
            if (!head.includes('%PDF')) throw new Error('This file is not a PDF.');
            // Loaded lazily: pdf.js + pdf-lib are only needed once a file is opened.
            const { PdfSession } = await import('../session/session');
            const s = await PdfSession.open(bytes, name, password);
            if (resume) {
                for (const [id, img] of resume.images) s.images.set(id, img);
                setInitial({ edits: resume.edits, slots: resume.slots });
            } else {
                setInitial(undefined);
                void clearSession();
            }
            setPw(null);
            setPwValue('');
            setSession(s);
        } catch (err) {
            const e = err as Error & { wrongPassword?: boolean };
            if (e?.name === 'PasswordError' || e?.name === 'PasswordException') {
                setPw({ bytes, name, resume, wrong: !!password });
            } else {
                console.error(err);
                toast.error("This PDF couldn't be opened", { description: e?.message && e.message.length < 140 ? e.message : 'It may be damaged or use an unsupported format.' });
            }
        } finally {
            setBusy(false);
        }
    }, []);

    const openFile = useCallback(
        async (f: File) => {
            if (f.size > 150 * 1024 * 1024) toast.warning('Large file — this may take a moment on phones.');
            await open(new Uint8Array(await f.arrayBuffer()), f.name);
        },
        [open],
    );

    useEffect(() => {
        const f = takePendingFile();
        if (f) void openFile(f);
        else void loadSession().then(setSaved);
    }, [openFile]);

    if (session) {
        return (
            <Suspense fallback={<Opening />}>
                <Workspace session={session} initial={initial} />
            </Suspense>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(1200px_500px_at_50%_-10%,rgba(16,185,129,0.14),transparent)] font-[Outfit,system-ui,sans-serif]">
            <PannaHeader />
            <main>
                <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
                    <div>
                        <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                            <Sparkles className="h-3.5 w-3.5" /> {hero.badge}
                        </p>
                        <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl">{hero.title}</h1>
                        <p className="mt-4 max-w-xl text-pretty text-lg leading-relaxed text-slate-600">{hero.intro}</p>
                        <ul className="mt-6 space-y-2.5 text-[15px] text-slate-700">
                            {hero.points.map((t) => (
                                <li key={t} className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> {t}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <Dropzone onFile={openFile} busy={busy} />
                        {saved && (
                            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <Clock3 className="h-5 w-5 text-emerald-600" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-900">{saved.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {saved.edits.length} {saved.edits.length === 1 ? 'change' : 'changes'} · {timeAgo(saved.savedAt)}
                                    </p>
                                </div>
                                <button type="button" onClick={() => open(saved.bytes, saved.name, undefined, saved)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                                    Continue editing
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        void clearSession();
                                        setSaved(null);
                                    }}
                                    className="rounded-lg px-2 py-2 text-sm font-medium text-slate-500 hover:text-slate-900"
                                >
                                    Discard
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                <QuickFacts
                    heading={variant === 'hindi' ? 'What is Panna Hindi PDF Editor?' : 'What is Panna PDF Editor?'}
                    definition={DEFINITIONS[variant === 'hindi' ? 'hindi' : 'editor']}
                    facts={[...COMMON_FACTS, ...TOOL_FACTS[variant === 'hindi' ? 'hindi' : 'editor']]}
                />
                {variant === 'hindi' ? <HindiContent /> : <EditorContent />}

                <p className="flex items-center justify-center gap-1.5 pb-10 text-xs text-slate-500">
                    <Lock className="h-3.5 w-3.5" /> Processed on your device. Nothing is uploaded.
                </p>
            </main>

            <Dialog
                open={!!pw}
                onOpenChange={(o) => {
                    if (!o) setPw(null);
                }}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileLock2 className="h-5 w-5 text-emerald-600" /> This PDF is password-protected
                        </DialogTitle>
                        <DialogDescription>Enter the password to open it. It's used only in your browser.</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (pw) void open(pw.bytes, pw.name, pwValue, pw.resume);
                        }}
                        className="space-y-3"
                    >
                        <input
                            type="password"
                            autoFocus
                            value={pwValue}
                            onChange={(e) => setPwValue(e.target.value)}
                            aria-label="PDF password"
                            className="h-11 w-full rounded-lg border border-slate-300 px-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                        {pw?.wrong && <p className="text-sm text-red-600">That password didn't work. Try again.</p>}
                        <button type="submit" disabled={busy || !pwValue} className="h-10 w-full rounded-lg bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                            {busy ? 'Opening…' : 'Open PDF'}
                        </button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
