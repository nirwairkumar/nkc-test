import React, { useState, useRef } from 'react';
import { SEO } from '@/components/SEO';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/mhchem';
import { FileText, Eye, Download, Trash2, ClipboardPaste, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const PLACEHOLDER = `### **Part 1: Derivation of Newton's Forward Difference Formula**

We are tasked with deriving the interpolation formula using three equispaced data points: $(x_0, f_0)$, $(x_1, f_1)$, and $(x_2, f_2)$.

* This is defined as $\\alpha = \\frac{x - x_0}{h}$, which rearranges to $x = x_0 + \\alpha h$.

$$f(x_0 + \\alpha h) = A + B\\alpha + C\\alpha(\\alpha - 1)$$

**Step 1 (Substitute $\\alpha = 0$):**

$$f(x_0) = A + B(0) + C(0)(-1) \\implies A = f_0$$

**Final Error Term:**

$$R_2(\\alpha) = \\frac{f^{(3)}(\\xi)}{3!} h^3 \\alpha(\\alpha - 1)(\\alpha - 2)$$`;

export default function ConvertPage() {
    const [input, setInput] = useState('');
    const [converted, setConverted] = useState(false);
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

    const handleDownloadPDF = () => {
        if (!converted || !input.trim()) {
            toast.error('Please convert the text first.');
            return;
        }
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <SEO
                title="LaTeX/KaTeX Converter – TestoZa"
                description="Paste LaTeX, KaTeX, or mhchem text and instantly preview it in a clean readable format. Download as PDF."
                keywords={['latex converter', 'katex preview', 'mhchem renderer', 'math to pdf', 'testoza convert']}
            />

            {/* Print-only styles */}
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #convert-preview-area, #convert-preview-area * { visibility: visible !important; }
                    #convert-preview-area {
                        position: fixed !important;
                        top: 0 !important; left: 0 !important;
                        width: 100% !important;
                        padding: 32px !important;
                        background: white !important;
                        font-size: 14px !important;
                    }
                }
            `}</style>

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
                            placeholder={`Paste your text here...\n\nExample:\n${PLACEHOLDER.slice(0, 120)}...`}
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
                            >
                                <Download className="h-3.5 w-3.5" />
                                Download PDF
                            </Button>
                        </div>

                        <div className="p-5 sm:p-6" id="convert-preview-area" ref={previewRef}>
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
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Download as PDF
                            </Button>
                        </div>
                    </div>
                )}

                {/* Info tip */}
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-4">
                    <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide mb-1">💡 Supported Formats</p>
                    <ul className="text-xs text-indigo-700 dark:text-indigo-300 space-y-0.5 list-disc list-inside">
                        <li>Inline math: <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded">$...$</code> or <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded">\(...\)</code></li>
                        <li>Display math: <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded">$$...$$</code> or <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded">\[...\]</code></li>
                        <li>Chemistry (mhchem): <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded">\ce{"{H2O}"}</code></li>
                        <li>Markdown: headings, bold, lists, horizontal rules</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
