import React, { useState, useRef } from 'react';
import { SEO } from '@/components/SEO';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/mhchem';
import { FileText, Eye, Download, Trash2, ClipboardPaste, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function ConvertPage() {
    const [input, setInput] = useState('');
    const [converted, setConverted] = useState(false);
    const [printing, setPrinting] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);

    const handleConvert = () => {
        if (!input.trim()) {
            toast.error('Please paste some text first.');
            return;
        }
        setConverted(true);
    };

    const handleClear = () => {
        setInput('');
        setConverted(false);
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setInput(text);
            setConverted(false);
            toast.success('Text pasted from clipboard.');
        } catch {
            toast.error('Could not read clipboard. Please paste manually.');
        }
    };

    /**
     * Industry-grade PDF download:
     * Opens a dedicated blank print window with:
     *  - KaTeX CSS loaded from CDN (ensures math fonts render on all pages)
     *  - Proper @page rules for A4 margins
     *  - Page-break-inside: avoid on math blocks, tables, headings
     *  - Natural document flow (NO position:fixed) so multi-page content flows correctly
     *  - Waits for fonts via document.fonts.ready before triggering print
     */
    const handleDownloadPDF = async () => {
        if (!converted || !input.trim() || !previewRef.current) {
            toast.error('Please convert the text first.');
            return;
        }

        setPrinting(true);

        try {
            const contentHTML = previewRef.current.innerHTML;

            const printWindow = window.open('', '_blank', 'width=900,height=700');
            if (!printWindow) {
                toast.error('Pop-ups are blocked. Please allow pop-ups for this site and try again.');
                setPrinting(false);
                return;
            }

            // Get the KaTeX version from the installed package to use matching CDN
            // We use the broadly compatible 0.16.x line
            const KATEX_CDN = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';

            const printCSS = `
                @page {
                    size: A4;
                    margin: 22mm 25mm 22mm 25mm;
                }

                *, *::before, *::after {
                    box-sizing: border-box;
                }

                html {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }

                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
                    font-size: 11pt;
                    line-height: 1.75;
                    color: #1e293b;
                    background: #ffffff;
                    word-break: break-word;
                    overflow-wrap: break-word;
                }

                /* ── Headings ─────────────────────────────────── */
                h1, h2, h3, h4, h5, h6 {
                    font-weight: 700;
                    color: #0f172a;
                    margin-top: 1.4em;
                    margin-bottom: 0.4em;
                    page-break-after: avoid;
                    page-break-inside: avoid;
                }
                h1 { font-size: 1.55em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.25em; }
                h2 { font-size: 1.3em; }
                h3 { font-size: 1.12em; }
                h4 { font-size: 1em; }

                /* ── Body text ───────────────────────────────── */
                p {
                    margin: 0.55em 0;
                    orphans: 4;
                    widows: 4;
                }

                strong { color: #0f172a; font-weight: 700; }
                em     { font-style: italic; }

                /* ── Lists ───────────────────────────────────── */
                ul, ol {
                    margin: 0.4em 0;
                    padding-left: 1.6em;
                }
                li {
                    margin: 0.25em 0;
                    page-break-inside: avoid;
                }

                /* ── Horizontal rule ─────────────────────────── */
                hr {
                    border: none;
                    border-top: 1.5px solid #cbd5e1;
                    margin: 1.2em 0;
                }

                /* ── Blockquote ──────────────────────────────── */
                blockquote {
                    border-left: 4px solid #6366f1;
                    margin: 0.8em 0;
                    padding: 0.4em 1em;
                    background: #f8fafc;
                    color: #475569;
                    page-break-inside: avoid;
                }

                /* ── Code ────────────────────────────────────── */
                code {
                    font-family: 'Consolas', 'Courier New', monospace;
                    background: #f1f5f9;
                    padding: 0.1em 0.3em;
                    border-radius: 3px;
                    font-size: 0.88em;
                }
                pre {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 0.8em 1em;
                    overflow-x: auto;
                    page-break-inside: avoid;
                    font-size: 0.85em;
                }
                pre code { background: none; padding: 0; }

                /* ── Tables ──────────────────────────────────── */
                table {
                    border-collapse: collapse;
                    width: 100%;
                    page-break-inside: avoid;
                    margin: 0.8em 0;
                    font-size: 0.95em;
                }
                th, td {
                    border: 1px solid #cbd5e1;
                    padding: 0.35em 0.65em;
                    text-align: left;
                }
                th {
                    background: #f1f5f9;
                    font-weight: 600;
                    color: #334155;
                }
                tr:nth-child(even) td { background: #f8fafc; }

                /* ── KaTeX math ──────────────────────────────── */
                .katex-display {
                    page-break-inside: avoid;
                    overflow-x: auto;
                    overflow-y: visible;
                    margin: 0.9em 0;
                    text-align: center;
                }
                .katex { font-size: 1.08em; }
                .katex-html { overflow-x: auto; }

                /* ── Images ──────────────────────────────────── */
                img {
                    max-width: 100%;
                    page-break-inside: avoid;
                    display: block;
                    margin: 0.5em auto;
                }

                /* ── Page break utilities ────────────────────── */
                .page-break { page-break-before: always; }
            `;

            // Script waits for fonts (KaTeX webfonts) before printing,
            // with a 3-second fallback so it never hangs.
            const printScript = `
                (function () {
                    var done = false;
                    function doPrint() {
                        if (done) return;
                        done = true;
                        window.focus();
                        window.print();
                    }
                    if (document.fonts && document.fonts.ready) {
                        document.fonts.ready.then(doPrint);
                    }
                    // Fallback — print anyway after 3 s if fonts API never resolves
                    setTimeout(doPrint, 3000);
                })();
            `;

            const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TestoZa — Converted Document</title>
  <link rel="stylesheet" href="${KATEX_CDN}" crossorigin="anonymous">
  <style>${printCSS}</style>
</head>
<body>
  <div id="print-content">
    ${contentHTML}
  </div>
  <script>${printScript}</script>
</body>
</html>`;

            printWindow.document.open();
            printWindow.document.write(fullHTML);
            printWindow.document.close();

            toast.success('Print dialog opening… choose "Save as PDF" in your browser.');
        } catch (err) {
            console.error('PDF generation error:', err);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setPrinting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <SEO
                title="LaTeX/KaTeX Converter – TestoZa"
                description="Paste LaTeX, KaTeX, or mhchem text and instantly preview it in a clean readable format. Download as PDF."
                keywords={['latex converter', 'katex preview', 'mhchem renderer', 'math to pdf', 'testoza convert']}
            />

            {/* Hero Header */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 pt-8 pb-16">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Tools</p>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-white">LaTeX / KaTeX Converter</p>
                    <p className="text-sm text-slate-400 mt-1">
                        Paste LaTeX, KaTeX, or mhchem text — preview it instantly and download as PDF.
                    </p>
                </div>
            </div>

            <div className="px-4 -mt-10 pb-12 max-w-3xl mx-auto space-y-4">

                {/* Input Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-indigo-500" />
                            <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Input Text</p>
                                <p className="text-xs text-slate-400">Paste your LaTeX / KaTeX / mhchem content here</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-xs text-slate-500 hover:text-indigo-600"
                            onClick={handlePaste}
                        >
                            <ClipboardPaste className="h-3.5 w-3.5" />
                            Paste
                        </Button>
                    </div>

                    <div className="p-4 space-y-3">
                        <Textarea
                            id="latex-input"
                            placeholder={`Paste your text here...\n\nSupports:\n• Inline math: $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$\n• Display math: $$E = mc^2$$\n• Chemistry: \\ce{H2O}\n• Markdown: **bold**, # Heading, - lists`}
                            value={input}
                            onChange={(e) => { setInput(e.target.value); setConverted(false); }}
                            rows={12}
                            className="text-sm font-mono resize-none bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-500"
                        />

                        <div className="flex gap-2">
                            <Button
                                onClick={handleConvert}
                                className="flex-1 h-10 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                                disabled={!input.trim()}
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                Preview Rendered Output
                            </Button>
                            {input && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 shrink-0 text-slate-400 hover:text-red-500"
                                    onClick={handleClear}
                                    title="Clear"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Preview Card */}
                {converted && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-emerald-500" />
                                <div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Rendered Preview</p>
                                    <p className="text-xs text-slate-400">Your text with math rendered beautifully</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-900/30"
                                onClick={handleDownloadPDF}
                                disabled={printing}
                            >
                                {printing
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Download className="h-3.5 w-3.5" />
                                }
                                {printing ? 'Preparing…' : 'Download PDF'}
                            </Button>
                        </div>

                        {/* The rendered preview — ref captures its innerHTML for the print window */}
                        <div className="p-5 sm:p-6" ref={previewRef}>
                            <div className="prose prose-slate dark:prose-invert max-w-none
                                prose-headings:font-bold prose-headings:text-slate-800 dark:prose-headings:text-slate-100
                                prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed
                                prose-li:text-slate-700 dark:prose-li:text-slate-300
                                prose-strong:text-slate-900 dark:prose-strong:text-white
                                prose-hr:border-slate-200 dark:prose-hr:border-slate-700
                                [&_.katex-display]:overflow-x-auto [&_.katex-display]:py-1
                                [&_.katex]:text-base
                            ">
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath, remarkGfm]}
                                    rehypePlugins={[[rehypeKatex, { strict: false }]]}
                                >
                                    {input}
                                </ReactMarkdown>
                            </div>
                        </div>

                        <div className="px-5 pb-4">
                            <Button
                                onClick={handleDownloadPDF}
                                className="w-full h-10 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={printing}
                            >
                                {printing
                                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing PDF…</>
                                    : <><Download className="mr-2 h-4 w-4" />Download as PDF</>
                                }
                            </Button>
                        </div>
                    </div>
                )}

                {/* Info tip */}
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-4">
                    <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide mb-1.5">💡 Supported Formats</p>
                    <ul className="text-xs text-indigo-700 dark:text-indigo-300 space-y-1 list-disc list-inside">
                        <li>Inline math: <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded">$...$</code> or <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded">\(...\)</code></li>
                        <li>Display math: <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded">$$...$$</code> or <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded">\[...\]</code></li>
                        <li>Chemistry (mhchem): <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded">\ce{"{H2O}"}</code></li>
                        <li>Markdown: <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded"># Headings</code>, <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded">**bold**</code>, lists, <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded">---</code> rules, tables</li>
                        <li>PDF tip: In the print dialog, select <strong>"Save as PDF"</strong> and set margins to <strong>None / Default</strong></li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
