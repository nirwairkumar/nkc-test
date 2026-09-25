/**
 * /pdf/latex-to-pdf — paste an answer from ChatGPT / Gemini / Claude or a
 * LaTeX document, see it typeset on real pages, and download a vector PDF
 * (selectable text, same fonts as the preview) in one click. Runs entirely in
 * the browser; the draft is kept in localStorage.
 */
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    BookOpenText,
    ChevronDown,
    ClipboardPaste,
    Download,
    FileText,
    Languages,
    Loader2,
    Lock,
    PenLine,
    ScanText,
    Sigma,
    Sparkles,
    Trash2,
    Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/SEO';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PANNA } from '../brand';
import { setPendingFile } from '../handoff';
import PannaHeader from '../ui/PannaHeader';
import { MathDocument, documentCss, ensureDocumentFonts } from '../latex/MathDocument';
import { normalizeMath } from '../latex/normalize';
import { markdownFromPaste } from '../latex/pasteHtml';
import { MARGINS, PAGE_SIZES, PT_PER_PX, contentHeightPx, contentWidthPx, fitWideContent, measurePages, type MarginId, type PageSizeId } from '../latex/paging';

// ---------------------------------------------------------------------------

const SAMPLES: { id: string; label: string; hint: string; text: string }[] = [
    {
        id: 'chatgpt',
        label: 'ChatGPT answer',
        hint: '\\( \\) and \\[ \\] maths, a table',
        text: String.raw`### Solving a quadratic equation

We want to solve \( 2x^2 - 4x - 6 = 0 \). The quadratic formula gives

\[
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
\]

**Step 1.** Identify the coefficients: \( a = 2 \), \( b = -4 \), \( c = -6 \).

**Step 2.** Substitute and simplify:

\[
\begin{aligned}
x &= \frac{4 \pm \sqrt{16 + 48}}{4} \\
  &= \frac{4 \pm 8}{4}
\end{aligned}
\]

So \( x = 3 \) or \( x = -1 \).

| Discriminant | Nature of the roots |
|---|---|
| \( b^2 - 4ac > 0 \) | Real and distinct |
| \( b^2 - 4ac = 0 \) | Real and equal |
| \( b^2 - 4ac < 0 \) | No real roots |`,
    },
    {
        id: 'gemini',
        label: 'Gemini answer',
        hint: '$ … $ and $$ … $$ inside sentences',
        text: String.raw`**Kinematics — equations of motion**

1. A car starts from rest with acceleration $a = 2\,\text{m/s}^2$. Its velocity after $t$ seconds is $v = u + at$.
2. The distance covered is $$s = ut + \frac{1}{2}at^2$$ so after $t = 5\,\text{s}$ the car has moved $s = 25\,\text{m}$.
3. Eliminating $t$ gives $v^2 = u^2 + 2as$.

$$\int_0^{t} a \, dt = v(t) - v(0)$$

* **Energy:** $E_k = \tfrac{1}{2}mv^2$
* **Momentum:** $\vec{p} = m\vec{v}$`,
    },
    {
        id: 'broken',
        label: 'Copied with broken maths',
        hint: 'backslashes lost while copying',
        text: String.raw`The kinetic energy is ( KE = \frac{1}{2}mv^2 ) where ( v ) is the speed.

[
E = mc^2
]

\begin{align*}
F &= ma \\
W &= Fd
\end{align*}

\frac{a}{b} + \frac{c}{d} = \frac{ad + bc}{bd}`,
    },
    {
        id: 'latex',
        label: 'LaTeX document',
        hint: '\\documentclass, sections, lists, tables',
        text: String.raw`\documentclass{article}
\usepackage{amsmath}
\newcommand{\R}{\mathbb{R}}
\title{Worksheet 3: Limits and Continuity}
\author{Mathematics Department}
\begin{document}
\maketitle
\section{Limits}
Evaluate the following limits --- show your working.
\begin{enumerate}
  \item $\displaystyle\lim_{x \to 0} \frac{\sin x}{x}$
  \item $\displaystyle\lim_{x \to \infty} \left(1 + \frac{1}{x}\right)^x$
  \item Show that $f: \R \to \R$, $f(x) = x^2$ is \textbf{continuous}.
\end{enumerate}
\section{Identities}
\begin{align}
  \sin^2\theta + \cos^2\theta &= 1 \\
  e^{i\pi} + 1 &= 0
\end{align}
\begin{tabular}{|c|c|c|}
\hline
$x$ & $f(x)$ & $f'(x)$ \\ \hline
0 & 0 & 0 \\
1 & 1 & 2 \\
\hline
\end{tabular}
\end{document}`,
    },
    {
        id: 'hindi',
        label: 'Hindi worksheet',
        hint: 'हिंदी text, even inside formulas',
        text: String.raw`## अभ्यास प्रश्न — द्विघात समीकरण

**प्रश्न 1:** यदि \( x^2 - 5x + 6 = 0 \), तो \( x \) का मान ज्ञात कीजिए।

**हल:** गुणनखंड करने पर,
\[ (x - 2)(x - 3) = 0 \]
अतः \( x = 2 \) या \( x = 3 \)।

**प्रश्न 2:** त्रिभुज का क्षेत्रफल \( \frac{1}{2} \times \text{आधार} \times \text{ऊँचाई} \) होता है। यदि आधार \( 8 \) सेमी और ऊँचाई \( 5 \) सेमी है, तो क्षेत्रफल ज्ञात कीजिए।

**उत्तर:** \( \frac{1}{2} \times 8 \times 5 = 20 \) वर्ग सेमी`,
    },
    {
        id: 'chemistry',
        label: 'Chemistry',
        hint: '\\ce{…} reactions',
        text: String.raw`### Chemical reactions

1. Combustion of methane: \ce{CH4 + 2O2 -> CO2 + 2H2O}
2. Haber process: $\ce{N2 + 3H2 <=> 2NH3}$ with $\Delta H = -92\,\text{kJ mol}^{-1}$
3. Ionisation of sulphuric acid: \ce{H2SO4 -> 2H+ + SO4^2-}
4. Rate law: $\text{rate} = k[\ce{A}]^m[\ce{B}]^n$`,
    },
];

const FEATURES = [
    { icon: Sparkles, title: 'Made for AI answers', text: "ChatGPT's \\( \\) and \\[ \\], Gemini's $ … $ in the middle of sentences, Claude's $$ blocks — all understood as they are." },
    { icon: Wand2, title: 'Broken copies repaired', text: 'Backslashes lost while copying, doubled backslashes from JSON, or garbled "x2x^2" text from selecting an answer: Panna puts the maths back.' },
    { icon: BookOpenText, title: 'Full LaTeX documents', text: '\\documentclass, sections, enumerate and itemize, tabular, numbered equations and \\newcommand macros.' },
    { icon: Languages, title: 'Hindi and chemistry', text: 'Hindi text — even inside formulas — and mhchem reactions like \\ce{H2SO4} come out correctly.' },
    { icon: FileText, title: 'Real pages', text: 'A4 or Letter with the margins you choose. You see every page break before you download, and \\newpage is respected.' },
    { icon: ScanText, title: 'A real PDF, not a picture', text: 'Text stays selectable and searchable, sharp at any zoom, with clickable links and bookmarks. No print dialog.' },
];

const FAQS = [
    { q: 'How do I convert ChatGPT maths to PDF?', a: "Click the copy button under ChatGPT's answer, paste it here and press Download PDF. Formulas written as \\( … \\) and \\[ … \\] are converted automatically." },
    { q: 'Why does maths from ChatGPT or Gemini look broken when I paste it elsewhere?', a: 'AI chats write maths in several different notations, and copying often loses backslashes or mixes the formula with its rendered text. Panna recognises every common notation and repairs the usual copy damage before typesetting.' },
    { q: 'Can I paste a full LaTeX document?', a: 'Yes. \\documentclass, the preamble, sections, lists, tables, equations and simple \\newcommand macros are supported. Drawing packages such as TikZ are not.' },
    { q: 'Is the text in the PDF selectable?', a: 'Yes. The PDF contains real text in the same fonts as the preview, so you can search it, copy from it and zoom in without blur.' },
    { q: 'Does it work with Hindi?', a: 'Yes. Hindi text is shaped correctly (matras and conjuncts) and stays searchable, including Hindi written inside formulas with \\text{…}.' },
    { q: 'Is my text uploaded anywhere?', a: 'No. Everything happens in your browser, and your draft is saved only on this device.' },
];

interface Settings {
    size: PageSizeId;
    margin: MarginId;
    family: 'serif' | 'sans';
    sizePt: 11 | 12 | 13;
    pageNumbers: boolean;
}
const DEFAULTS: Settings = { size: 'a4', margin: 'normal', family: 'serif', sizePt: 12, pageNumbers: true };
const DRAFT_KEY = 'panna:latex:draft';
const SETTINGS_KEY = 'panna:latex:settings';

function readSettings(): Settings {
    try {
        const s = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') } as Settings;
        if (!PAGE_SIZES[s.size]) s.size = DEFAULTS.size;
        if (!MARGINS[s.margin]) s.margin = DEFAULTS.margin;
        if (s.family !== 'serif' && s.family !== 'sans') s.family = DEFAULTS.family;
        if (![11, 12, 13].includes(s.sizePt)) s.sizePt = DEFAULTS.sizePt;
        s.pageNumbers = s.pageNumbers !== false;
        return s;
    } catch {
        return DEFAULTS;
    }
}
function readDraft(): string {
    try {
        return localStorage.getItem(DRAFT_KEY) ?? '';
    } catch {
        return '';
    }
}
function store(key: string, value: string) {
    try {
        if (value) localStorage.setItem(key, value);
        else localStorage.removeItem(key);
    } catch {
        /* private mode / quota: the draft just isn't kept */
    }
}

/** A title from the first heading (or first real line) of the document. */
function guessTitle(md: string): string {
    const clean = (s: string) =>
        s
            .replace(/\$[^$]*\$/g, ' ')
            .replace(/[*_`#>[\]()\\|]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    const heading = /^#{1,3}\s+(.+)$/m.exec(md)?.[1] ?? '';
    const t = clean(heading) || clean(md.split('\n').find((l) => clean(l).length > 3) ?? '');
    return t.length > 60 ? t.slice(0, 60).replace(/\s+\S*$/, '') : t;
}

/** "Worksheet 3: Limits — Part A" -> "Worksheet-3-Limits-Part-A.pdf" (Hindi letters kept). */
const fileName = (title: string) =>
    (
        title
            .replace(/[\\/:*?"<>|—–.,;!'“”‘’()[\]{}#%&$^~`]+/g, ' ')
            .trim()
            .replace(/\s+/g, '-')
            .slice(0, 60)
            .replace(/-+$/, '') || 'document'
    ) + '.pdf';

function useMediaQuery(query: string) {
    const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const on = () => setMatch(mq.matches);
        on();
        mq.addEventListener('change', on);
        return () => mq.removeEventListener('change', on);
    }, [query]);
    return match;
}

function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: [T, ReactNode][]; onChange: (v: T) => void }) {
    return (
        <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-slate-100 p-0.5">
            {options.map(([v, text]) => (
                <button
                    key={String(v)}
                    type="button"
                    role="radio"
                    aria-checked={v === value}
                    onClick={() => onChange(v)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${v === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    {text}
                </button>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------

export default function LatexToPdfPage() {
    const navigate = useNavigate();
    const wide = useMediaQuery('(min-width: 1024px)');
    const [input, setInput] = useState(readDraft);
    const [settings, setSettings] = useState<Settings>(readSettings);
    const [title, setTitle] = useState('');
    const [tab, setTab] = useState<'write' | 'preview'>('write');
    const [busy, setBusy] = useState<'download' | 'edit' | null>(null);
    const [pages, setPages] = useState<[number, number][]>([]);
    const [errors, setErrors] = useState(0);
    const [docHeight, setDocHeight] = useState(0);
    const [avail, setAvail] = useState(0);
    const textRef = useRef<HTMLTextAreaElement>(null);
    const viewRef = useRef<HTMLDivElement>(null);
    const docRef = useRef<HTMLDivElement>(null);

    useEffect(() => ensureDocumentFonts(), []);
    useEffect(() => {
        const t = setTimeout(() => store(DRAFT_KEY, input), 400);
        return () => clearTimeout(t);
    }, [input]);
    useEffect(() => store(SETTINGS_KEY, JSON.stringify(settings)), [settings]);

    const deferred = useDeferredValue(input);
    const result = useMemo(() => normalizeMath(deferred), [deferred]);
    const setup = useMemo(() => ({ size: PAGE_SIZES[settings.size].size, margin: MARGINS[settings.margin].pt }), [settings.size, settings.margin]);
    const css = useMemo(() => documentCss('.panna-doc', { family: settings.family, sizePt: settings.sizePt }), [settings.family, settings.sizePt]);
    const autoTitle = useMemo(() => guessTitle(result.markdown), [result.markdown]);
    const docTitle = title.trim() || autoTitle;
    const empty = !deferred.trim();

    const paperW = setup.size[0] / PT_PER_PX;
    const marginPx = setup.margin / PT_PER_PX;
    const paperH = Math.max(docHeight, contentHeightPx(setup)) + 2 * marginPx;
    const scale = avail > 0 ? Math.min(1, avail / paperW) : 1;

    // Layout: shrink over-wide formulas, then find the page breaks.
    const relayout = useCallback(() => {
        const root = docRef.current;
        if (!root) return;
        fitWideContent(root);
        setPages(measurePages(root, setup));
        setDocHeight(root.offsetHeight);
        setErrors(root.querySelectorAll('.katex-error').length);
    }, [setup]);
    useLayoutEffect(relayout, [relayout, result, css]);
    useEffect(() => {
        const root = docRef.current;
        if (!root) return;
        let raf = 0;
        const schedule = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(relayout);
        };
        const ro = new ResizeObserver(schedule);
        ro.observe(root);
        document.fonts?.addEventListener?.('loadingdone', schedule);
        void document.fonts?.ready.then(schedule);
        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            document.fonts?.removeEventListener?.('loadingdone', schedule);
        };
    }, [relayout]);
    useEffect(() => {
        const el = viewRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => setAvail(e.contentRect.width));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // -- Editing -----------------------------------------------------------------

    /** Inserts at the caret, keeping the textarea's own undo history. */
    const insert = (text: string) => {
        const ta = textRef.current;
        if (!ta) return setInput((v) => v + text);
        ta.focus();
        if (!document.execCommand?.('insertText', false, text)) {
            const { selectionStart: a, selectionEnd: b, value } = ta;
            setInput(value.slice(0, a) + text + value.slice(b));
        }
    };

    const replaceAll = (text: string, message: string) => {
        const prev = input;
        setInput(text);
        if (prev.trim()) toast(message, { action: { label: 'Undo', onClick: () => setInput(prev) } });
    };

    const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
        const md = markdownFromPaste(e.clipboardData.getData('text/html'), e.clipboardData.getData('text/plain'));
        if (md === null) return;
        e.preventDefault();
        insert(md);
        toast.success('Maths recovered from the copied page');
    };

    const pasteFromClipboard = async () => {
        try {
            let html = '';
            let plain = '';
            if (navigator.clipboard.read) {
                try {
                    for (const item of await navigator.clipboard.read()) {
                        if (item.types.includes('text/html')) html = await (await item.getType('text/html')).text();
                        if (item.types.includes('text/plain')) plain = await (await item.getType('text/plain')).text();
                    }
                } catch {
                    /* fall back to plain text */
                }
            }
            if (!plain && !html) plain = await navigator.clipboard.readText();
            const text = markdownFromPaste(html, plain) ?? plain;
            if (!text.trim()) return toast.error('The clipboard is empty.');
            if (input.trim()) insert(text);
            else setInput(text);
        } catch {
            toast.error('Could not read the clipboard. Press Ctrl+V (or long-press → Paste) in the box instead.');
        }
    };

    // -- Export ------------------------------------------------------------------

    const makePdf = useCallback(async () => {
        const root = docRef.current;
        if (!root) throw new Error('Preview is not ready');
        const { renderDomToPdf } = await import('../latex/domToPdf');
        const bytes = await renderDomToPdf(root, { ...setup, title: docTitle || 'Document', pageNumbers: settings.pageNumbers, family: settings.family });
        return { bytes, name: fileName(docTitle) };
    }, [setup, docTitle, settings.pageNumbers, settings.family]);

    const openInEditor = useCallback((bytes: Uint8Array, name: string) => {
        setPendingFile(new File([bytes as unknown as BlobPart], name, { type: 'application/pdf' }));
        navigate(PANNA.routes.editor);
    }, [navigate]);

    const download = useCallback(async () => {
        if (busy || empty) return;
        setBusy('download');
        try {
            const { bytes, name } = await makePdf();
            const url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
            toast.success(`Downloaded ${name}`, {
                description: 'Need a logo, signature or a last-minute fix? Open it in the Panna editor.',
                action: { label: 'Edit PDF', onClick: () => openInEditor(bytes, name) },
                duration: 8000,
            });
        } catch (err) {
            console.error('[panna] LaTeX export failed', err);
            toast.error('Could not create the PDF. Please try again.');
        } finally {
            setBusy(null);
        }
    }, [busy, empty, makePdf, openInEditor]);

    const editAsPdf = async () => {
        if (busy || empty) return;
        setBusy('edit');
        try {
            const { bytes, name } = await makePdf();
            openInEditor(bytes, name);
        } catch (err) {
            console.error('[panna] LaTeX export failed', err);
            toast.error('Could not create the PDF. Please try again.');
            setBusy(null);
        }
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                void download();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [download]);

    const showError = () => {
        if (!wide) setTab('preview');
        requestAnimationFrame(() => docRef.current?.querySelector('.katex-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    };

    const pageCount = empty ? 0 : pages.length;
    const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((s) => ({ ...s, [key]: value }));

    const downloadButton = (full = false) => (
        <button
            type="button"
            onClick={() => void download()}
            disabled={!!busy || empty}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 ${full ? 'flex-1' : ''}`}
        >
            {busy === 'download' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {busy === 'download' ? 'Making PDF…' : 'Download PDF'}
        </button>
    );

    const samplesMenu = (
        <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                Samples <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                {SAMPLES.map((s) => (
                    <DropdownMenuItem key={s.id} onSelect={() => replaceAll(s.text, `Loaded “${s.label}”`)} className="flex flex-col items-start gap-0.5">
                        <span className="text-sm font-medium">{s.label}</span>
                        <span className="text-xs text-slate-500">{s.hint}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-[Outfit,system-ui,sans-serif]">
            <SEO
                title="LaTeX to PDF — Convert ChatGPT & Gemini Maths to PDF"
                description="Paste maths from ChatGPT, Gemini or Claude, or a full LaTeX document, and download a clean PDF with real selectable text. Repairs broken formulas, supports Hindi and chemistry. Free, no sign-up, no watermark."
                url={PANNA.routes.latex}
                keywords={['latex to pdf', 'chatgpt math to pdf', 'gemini math to pdf', 'latex converter online', 'katex to pdf', 'markdown math to pdf', 'mhchem to pdf', 'hindi latex pdf']}
                schemas={[
                    {
                        '@context': 'https://schema.org',
                        '@type': 'SoftwareApplication',
                        name: `${PANNA.name} LaTeX to PDF`,
                        applicationCategory: 'EducationalApplication',
                        operatingSystem: 'Web',
                        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
                        description: 'Convert LaTeX and AI-generated maths (ChatGPT, Gemini, Claude) into a print-ready PDF with selectable text, in the browser.',
                    },
                    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
                ]}
            />
            <style>{css}</style>
            <PannaHeader />

            <section className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-3 px-4 pb-4 pt-6 sm:px-6">
                <div className="min-w-0">
                    <h1 className="text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        LaTeX to PDF <span className="text-emerald-600">for ChatGPT & Gemini maths</span>
                    </h1>
                    <p className="mt-1 max-w-3xl text-pretty text-sm text-slate-600 sm:text-[15px]">
                        Paste an AI answer or a LaTeX document. Broken formulas are repaired, pages are laid out, and you download a sharp PDF with real, selectable text.
                    </p>
                </div>
                <div className="hidden items-center gap-2 lg:flex">
                    <button
                        type="button"
                        onClick={() => void editAsPdf()}
                        disabled={!!busy || empty}
                        className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                        title="Make the PDF and open it in the Panna PDF editor"
                    >
                        {busy === 'edit' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                        Edit as PDF
                    </button>
                    {downloadButton()}
                </div>
            </section>

            {/* Phone: switch between writing and the pages */}
            <div className="sticky top-16 z-30 border-y border-slate-200 bg-white/90 px-4 py-2 backdrop-blur lg:hidden">
                <div role="tablist" aria-label="View" className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                    {(['write', 'preview'] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            role="tab"
                            aria-selected={tab === t}
                            onClick={() => setTab(t)}
                            className={`rounded-lg py-2 text-sm font-semibold ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                        >
                            {t === 'write' ? 'Write' : `Pages${pageCount ? ` · ${pageCount}` : ''}`}
                        </button>
                    ))}
                </div>
            </div>

            <main className="mx-auto grid max-w-[1400px] gap-4 px-3 pb-28 pt-3 sm:px-6 lg:grid-cols-[minmax(340px,5fr)_7fr] lg:pb-12 lg:pt-0">
                {/* Input */}
                <section aria-label="Your text" className={`${!wide && tab !== 'write' ? 'hidden' : 'flex'} min-h-[60vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-20 lg:h-[calc(100vh-6.5rem)]`}>
                    <div className="flex items-center gap-1 border-b border-slate-200 px-3 py-2">
                        <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={autoTitle || 'Untitled document'}
                            aria-label="Document title (also the file name)"
                            className="min-w-0 flex-1 truncate bg-transparent px-1.5 py-1 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />
                        <button type="button" onClick={() => void pasteFromClipboard()} className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                            <ClipboardPaste className="h-3.5 w-3.5" /> Paste
                        </button>
                        {samplesMenu}
                        <button
                            type="button"
                            onClick={() => replaceAll('', 'Cleared')}
                            disabled={!input}
                            aria-label="Clear"
                            title="Clear"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                    <textarea
                        ref={textRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onPaste={onPaste}
                        spellCheck={false}
                        aria-label="LaTeX or Markdown with maths"
                        placeholder={
                            'Paste an answer from ChatGPT, Gemini or Claude, or a LaTeX document.\n\n' +
                            'Everything common works:\n' +
                            '  \\( x^2 \\)   \\[ \\frac{a}{b} \\]   $E = mc^2$   $$\\int_0^1 x\\,dx$$\n' +
                            '  \\begin{align} … \\end{align}   \\ce{H2O}   # Headings   **bold**   tables\n\n' +
                            'Tip: selecting an answer and copying it also works — the maths is recovered.'
                        }
                        className="min-h-0 w-full flex-1 resize-none bg-white p-4 font-mono text-[13.5px] leading-6 text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                    {(result.notes.length > 0 || errors > 0) && (
                        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200 bg-slate-50/80 px-3 py-2 text-xs">
                            {result.notes.length > 0 && (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                    <Wand2 className="h-3.5 w-3.5" /> Fixed:
                                </span>
                            )}
                            {result.notes.map((n) => (
                                <span key={n} className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800 ring-1 ring-emerald-200">
                                    {n}
                                </span>
                            ))}
                            {errors > 0 && (
                                <button type="button" onClick={showError} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100">
                                    <AlertTriangle className="h-3.5 w-3.5" /> {errors === 1 ? '1 formula has an error' : `${errors} formulas have errors`} — show
                                </button>
                            )}
                        </div>
                    )}
                </section>

                {/* Pages */}
                <section
                    aria-label="Preview"
                    aria-hidden={!wide && tab !== 'preview'}
                    className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-[calc(100vh-6.5rem)] ${!wide && tab !== 'preview' ? 'pointer-events-none fixed left-[-10000px] top-0 w-[900px]' : ''}`}
                >
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
                        <Segmented label="Paper size" value={settings.size} onChange={(v) => set('size', v)} options={Object.entries(PAGE_SIZES).map(([id, p]) => [id as PageSizeId, p.label] as [PageSizeId, ReactNode])} />
                        <Segmented label="Margins" value={settings.margin} onChange={(v) => set('margin', v)} options={Object.entries(MARGINS).map(([id, p]) => [id as MarginId, p.label] as [MarginId, ReactNode])} />
                        <Segmented
                            label="Font"
                            value={settings.family}
                            onChange={(v) => set('family', v)}
                            options={[
                                ['serif', <span key="s" className="font-serif">Serif</span>],
                                ['sans', 'Sans'],
                            ]}
                        />
                        <Segmented label="Text size" value={settings.sizePt} onChange={(v) => set('sizePt', v)} options={([11, 12, 13] as const).map((n) => [n, `${n} pt`] as [Settings['sizePt'], ReactNode])} />
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-semibold text-slate-600">
                            <input type="checkbox" checked={settings.pageNumbers} onChange={(e) => set('pageNumbers', e.target.checked)} className="h-3.5 w-3.5 accent-emerald-600" />
                            Page numbers
                        </label>
                        <span className="ml-auto text-xs font-medium text-slate-500" aria-live="polite">
                            {pageCount ? `${pageCount} ${pageCount === 1 ? 'page' : 'pages'}` : ''}
                        </span>
                    </div>
                    <div ref={viewRef} className="min-h-[60vh] flex-1 overflow-auto bg-slate-100 p-3 sm:p-6">
                        <div className="mx-auto" style={{ width: paperW * scale, height: paperH * scale }}>
                            <div
                                className="relative origin-top-left bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08),0_10px_30px_rgba(15,23,42,0.08)]"
                                style={{ width: paperW, minHeight: paperH, padding: marginPx, transform: scale < 1 ? `scale(${scale})` : undefined }}
                            >
                                <div ref={docRef} className="panna-doc" style={{ width: contentWidthPx(setup) }}>
                                    <MathDocument markdown={result.markdown} macros={result.macros} />
                                </div>
                                {empty && (
                                    <div className="absolute inset-x-0 top-[12%] flex flex-col items-center gap-4 p-10 text-center">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                            <Sigma className="h-7 w-7" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-semibold text-slate-900">Your pages appear here</p>
                                            <p className="mt-1 text-sm text-slate-500">Paste on the left, or try a sample:</p>
                                        </div>
                                        <div className="flex max-w-md flex-wrap justify-center gap-2">
                                            {SAMPLES.map((s) => (
                                                <button key={s.id} type="button" onClick={() => setInput(s.text)} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-emerald-50 hover:text-emerald-800 hover:ring-emerald-300">
                                                    {s.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {!empty &&
                                    pages.slice(1).map(([start], i) => (
                                        <div key={i} className="pointer-events-none absolute inset-x-0" style={{ top: marginPx + (pages[i][1] + start) / 2 }} aria-hidden="true">
                                            <div className="border-t-2 border-dashed border-emerald-400/70" />
                                            <span className="absolute right-3 -translate-y-1/2 rounded-full bg-emerald-600 px-2 py-0.5 font-semibold text-white shadow-sm" style={{ fontSize: 11 / scale }}>
                                                Page {i + 2}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Phone: download always in reach */}
            <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
                <button
                    type="button"
                    onClick={() => void editAsPdf()}
                    disabled={!!busy || empty}
                    aria-label="Edit as PDF"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 ring-1 ring-slate-300 disabled:opacity-50"
                >
                    {busy === 'edit' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                </button>
                {downloadButton(true)}
            </div>

            <section className="border-t border-slate-200 bg-white">
                <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Maths from any AI, typeset properly</h2>
                    <p className="mt-2 max-w-2xl text-slate-600">
                        Most converters only understand one notation and fall over on the rest. Panna reads what AI chats actually produce and gives you a PDF you can hand to a class.
                    </p>
                    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {FEATURES.map(({ icon: Icon, title: t, text }) => (
                            <div key={t} className="rounded-2xl border border-slate-200 bg-white p-5">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="mt-3 font-semibold text-slate-900">{t}</h3>
                                <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900 px-6 py-5 text-white">
                        <p className="text-[15px]">
                            <span className="font-semibold">Made a worksheet?</span> Turn it into an online test with auto-grading on TestoZa.
                        </p>
                        <Link to="/pdf-to-quiz" className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
                            Make a test from a PDF →
                        </Link>
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
                    <Lock className="h-3.5 w-3.5" /> Runs in your browser. Nothing is uploaded.
                </p>
                <p className="mt-2 text-center text-sm text-slate-600">
                    Need to change an existing PDF instead?{' '}
                    <Link to={PANNA.routes.editor} className="font-semibold text-emerald-700 hover:underline">
                        Try the Panna PDF editor
                    </Link>
                </p>
            </section>
        </div>
    );
}
