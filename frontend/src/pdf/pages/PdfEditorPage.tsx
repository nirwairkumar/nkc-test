/**
 * /pdf/editor — pick a PDF (or resume the last one), then the full-screen
 * workspace. Everything runs in the browser: the file is never uploaded.
 */
import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Eraser, FileLock2, Languages, Lock, Replace, Signature, Sparkles, Table2, TextCursorInput } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/SEO';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PANNA } from '../brand';
import type { PageEdit, PageSlot } from '../engine/edits';
import { takePendingFile } from '../handoff';
import PannaHeader from '../ui/PannaHeader';
import Dropzone from '../ui/Dropzone';
import { clearSession, loadSession, type SavedSession } from '../editor/persist';
import type { PdfSession } from '../session/session';

// pdf.js + pdf-lib are only downloaded once a file is actually opened.
const Workspace = lazy(() => import('../editor/Workspace'));

const Opening = () => (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
);

const FEATURES = [
    { icon: TextCursorInput, title: 'Same font, same place', text: "Click any text and type. Your words are set in the PDF's own embedded font — not a look-alike." },
    { icon: Table2, title: 'Tables stay tidy', text: 'Every cell is its own box, so changing one value never disturbs the rest of the row.' },
    { icon: Languages, title: 'Hindi and English', text: 'Devanagari matras and conjuncts are shaped correctly, and stay searchable after editing.' },
    { icon: Eraser, title: 'Erase for real', text: 'Removed text is deleted from the file — not hidden under a white box someone can lift off.' },
    { icon: Replace, title: 'Find & replace', text: 'Change a name, date or roll number everywhere in the document at once.' },
    { icon: Signature, title: 'Sign, mark, annotate', text: 'Signatures, highlights, drawings, shapes and images — plus page rotate, reorder and delete.' },
];

const FAQS = [
    { q: 'Can I edit text in a PDF in the same font?', a: "Yes. Panna re-uses the font embedded in your PDF. If a character you type isn't in that font (PDFs often carry only the letters they use), Panna tells you which ones and draws just those in the closest matching font." },
    { q: 'Is it free? Is there a watermark?', a: 'It is free, with no sign-up and no watermark. There is no trial that turns into a subscription.' },
    { q: 'Is my PDF uploaded anywhere?', a: 'No. The file is opened and edited inside your browser. It never reaches our servers, which is why it also works on private documents.' },
    { q: 'Can I edit Hindi text in a PDF?', a: 'Yes. You can change Hindi (Devanagari) text and add new Hindi text. Conjuncts and matras are shaped properly and the text stays copyable and searchable.' },
    { q: 'Can I open a password-protected PDF?', a: 'Yes. If the PDF needs a password to open, enter it. PDFs that only restrict editing open directly; please only change documents you have the right to modify.' },
    { q: 'What if I close the tab by mistake?', a: 'Your changes are autosaved in this browser. Open the editor again and choose "Continue editing".' },
];

function timeAgo(t: number) {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

export default function PdfEditorPage() {
    const [session, setSession] = useState<PdfSession | null>(null);
    const [initial, setInitial] = useState<{ edits: PageEdit[]; slots: PageSlot[] } | undefined>();
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState<SavedSession | null>(null);
    const [pw, setPw] = useState<{ bytes: Uint8Array; name: string; resume?: SavedSession; wrong: boolean } | null>(null);
    const [pwValue, setPwValue] = useState('');

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
            <SEO
                title="Free PDF Editor — Edit PDF Text in the Same Font"
                description="Edit text in any PDF in its original font, erase for real, sign, highlight and add images. Works with Hindi and English. Free, no sign-up, no watermark — your file never leaves your device."
                url={PANNA.routes.editor}
                keywords={['pdf editor', 'edit pdf', 'edit pdf text', 'edit pdf online free', 'pdf editor same font', 'edit hindi pdf', 'pdf editor without watermark', 'free pdf editor india']}
                schemas={[
                    {
                        '@context': 'https://schema.org',
                        '@type': 'SoftwareApplication',
                        name: `${PANNA.name} PDF Editor`,
                        applicationCategory: 'BusinessApplication',
                        operatingSystem: 'Web',
                        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
                        description: PANNA.description,
                    },
                    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
                ]}
            />
            <PannaHeader />

            <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
                <div>
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                        <Sparkles className="h-3.5 w-3.5" /> Free · No sign-up · No watermark
                    </p>
                    <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl">
                        Edit PDF text <span className="text-emerald-600">in the same font</span>
                    </h1>
                    <p className="mt-4 max-w-xl text-pretty text-lg leading-relaxed text-slate-600">
                        Change names, dates, marks and whole paragraphs in any PDF — Hindi or English — and download it looking like it was never touched.
                    </p>
                    <ul className="mt-6 space-y-2.5 text-[15px] text-slate-700">
                        {["Uses your PDF's own fonts", 'Removed text is truly deleted', 'Works on phones and laptops', 'Runs in your browser — private by design'].map((t) => (
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

            <section className="border-t border-slate-200/70 bg-white/70">
                <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Better edits than the paid editors</h2>
                    <p className="mt-2 max-w-2xl text-slate-600">Most online editors cover your text with a white box and retype it in Helvetica. Panna actually edits the page.</p>
                    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {FEATURES.map(({ icon: Icon, title, text }) => (
                            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
                                <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Questions</h2>
                <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                    {FAQS.map((f) => (
                        <details key={f.q} className="group px-5 py-4">
                            <summary className="cursor-pointer list-none font-medium text-slate-900 marker:hidden">
                                <span className="flex items-center justify-between gap-4">
                                    {f.q}
                                    <span className="text-slate-400 transition group-open:rotate-45">+</span>
                                </span>
                            </summary>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</p>
                        </details>
                    ))}
                </div>
                <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                    <Lock className="h-3.5 w-3.5" /> Processed on your device. Nothing is uploaded.
                </p>
            </section>

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
                        <button type="submit" disabled={busy || !pwValue} className="h-10 w-full rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                            {busy ? 'Opening…' : 'Open PDF'}
                        </button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
