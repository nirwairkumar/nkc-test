import React, { useState, useCallback } from 'react';
import { Copy, Check, FlaskConical, Calculator, Layout, CornerDownLeft, RotateCcw, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import LatexRenderer from '@/components/ui/LatexRenderer';

interface NotationItem {
    label: string;
    description: string;
    latex: string;
    displayOnly?: boolean; // If true, copy with $$ delimiters (for stacked/multi-line content)
}

interface NotationSection {
    id: string;
    title: string;
    icon: React.ReactNode;
    items: NotationItem[];
}

const SECTIONS: NotationSection[] = [
    {
        id: 'general',
        title: 'General Formatting',
        icon: <Layout className="h-5 w-5" />,
        items: [
            {
                label: 'Line Break',
                description: 'Move to the next line',
                latex: 'Line 1 <br> Line 2',
            },
            {
                label: 'Bold & Italic',
                description: 'Text styling',
                latex: '***Bold & Italic***',
            },
            {
                label: 'Simple Table (LaTeX)',
                description: 'Professional bordered table',
                latex: '\\begin{array}{|c|c|} \\hline Row 1 & Data \\\\ \\hline Row 2 & Data \\\\ \\hline \\end{array}',
            }
        ]
    },
    {
        id: 'chemistry',
        title: 'Chemistry Notations (mhchem)',
        icon: <FlaskConical className="h-5 w-5" />,
        items: [
            {
                label: 'Hydrate Crystal',
                description: 'Complex formula',
                latex: '\\ce{CuSO4 . 5H2O}',
            },
            {
                label: 'Potassium Ferrocyanide',
                description: 'Complex coordination',
                latex: '\\ce{K4[Fe(CN)6]}',
            },
            {
                label: 'Redox Reaction',
                description: 'Ionic equation',
                latex: '\\ce{MnO4- + 8H+ + 5e- -> Mn^2+ + 4H2O}',
            },
            {
                label: 'Radioactive Decay',
                description: 'Nuclear chemistry',
                latex: '\\ce{^{226}_{88}Ra -> ^{222}_{86}Rn + ^{4}_{2}He}',
            },
            {
                label: 'Complex Reversible',
                description: 'Equilibrium constants',
                latex: '\\ce{N2(g) + 3H2(g) <=> 2NH3(g) \\quad \\Delta H < 0}',
            },
            {
                label: 'Reaction: 2 Reagents',
                description: 'Two reagents stacked above arrow',
                latex: 'X \\xrightarrow{\\substack{\\text{(i) Heat} \\\\ \\text{(ii) KOH}}} Y',
                displayOnly: true,
            },
            {
                label: 'Reaction: 3 Reagents',
                description: 'With chemical formulas',
                latex: '\\xrightarrow{\\substack{\\text{i) }\\ce{Hg^{2+}}\\text{, }\\ce{H3O+} \\\\ \\text{ii) Zn-Hg/HCl} \\\\ \\text{iii) }\\ce{H3O+}\\text{, }\\Delta}} \\text{ P}',
                displayOnly: true,
            },
            {
                label: 'Above + Below Arrow',
                description: 'Reagents above and catalyst below',
                latex: 'X \\xrightarrow[\\text{catalyst}]{\\substack{\\text{(i) Strong heating} \\\\ \\text{(ii) Ethanolic KOH} \\\\ \\text{(iii) R-Br}}} Y',
                displayOnly: true,
            },
            {
                label: '6-Step Reaction',
                description: 'Many stacked reagents',
                latex: '\\ce{X} \\xrightarrow[\\substack{\\text{iv) a) }\\ce{BH3}\\text{, b) }\\ce{H2O2}\\text{, NaOH} \\\\ \\text{v) }\\ce{H3O+} \\\\ \\text{vi) }\\ce{NaBH4}}]{\\substack{\\text{i) }\\ce{O3}\\text{, Zn} \\\\ \\text{ii) aq. NaOH, }\\Delta \\\\ \\text{iii) ethylene glycol, PTSA}}} \\ce{Y}',
                displayOnly: true,
            }
        ]
    },
    {
        id: 'math',
        title: 'Mathematics (KaTeX)',
        icon: <Calculator className="h-5 w-5" />,
        items: [
            {
                label: 'Professional Integration',
                description: 'Definite integral with limits',
                latex: '\\int\\limits_{a}^{b} f(x) \\, dx',
            },
            {
                label: 'Professional Summation',
                description: 'Sigma with vertical limits',
                latex: '\\sum\\limits_{i=1}^{n} (x_i - \\bar{x})^2',
            },
            {
                label: 'Limits',
                description: 'Calculus limits',
                latex: '\\lim\\limits_{x \\to \\infty} \\left( 1 + \\frac{1}{x} \\right)^x = e',
            },
            {
                label: 'Matrices',
                description: '2x2 Matrix',
                latex: 'A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
            },
            {
                label: 'Roots & Powers',
                description: 'Complex grouping',
                latex: '\\sqrt[n]{\\frac{x^2 + y^2}{z^3}}',
            },
            {
                label: 'Binomial Coefficient',
                description: 'Combinations',
                latex: '\\binom{n}{k} = \\frac{n!}{k!(n-k)!}',
            }
        ]
    }
];

// --- Single Notation Row Component ---
function NotationRow({ item, sectionId }: { item: NotationItem; sectionId: string }) {
    const [copiedId, setCopiedId] = useState(false);
    const isGeneral = sectionId === 'general';

    // Editable state: user's current text
    const originalCopy = isGeneral ? item.latex : item.displayOnly ? `$$${item.latex}$$` : `$${item.latex}$`;
    const [editableText, setEditableText] = useState(originalCopy);
    const isModified = editableText !== originalCopy;

    // Build what to preview from the editable text
    const previewContent = editableText;

    const copyToClipboard = useCallback(() => {
        navigator.clipboard.writeText(editableText);
        setCopiedId(true);
        toast.success('Copied!');
        setTimeout(() => setCopiedId(false), 2000);
    }, [editableText]);

    const resetToOriginal = useCallback(() => {
        setEditableText(originalCopy);
    }, [originalCopy]);

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all hover:border-slate-300">
            {/* Top: Label + Live Preview */}
            <div className="flex items-start gap-4 p-4 sm:p-5 border-b border-slate-100">
                {/* Left: Meta */}
                <div className="shrink-0 w-40 sm:w-48">
                    <h4 className="text-sm font-semibold text-slate-800 leading-snug">{item.label}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
                </div>

                {/* Right: Live Preview */}
                <div className="flex-1 min-w-0 flex items-center justify-center py-2 overflow-x-auto">
                    <LatexRenderer className="!text-lg text-slate-900 whitespace-nowrap">
                        {previewContent}
                    </LatexRenderer>
                </div>
            </div>

            {/* Bottom: Editable Code + Actions */}
            <div className="flex items-stretch bg-slate-50/80">
                {/* Editable textarea */}
                <div className="flex-1 min-w-0 relative">
                    <textarea
                        value={editableText}
                        onChange={(e) => setEditableText(e.target.value)}
                        rows={1}
                        spellCheck={false}
                        className={cn(
                            "w-full px-4 py-2.5 text-xs font-mono bg-transparent border-none outline-none resize-none text-indigo-600 placeholder:text-slate-300",
                            "focus:bg-white focus:ring-1 focus:ring-inset focus:ring-indigo-200 transition-all",
                            isModified && "bg-amber-50/50"
                        )}
                        style={{ minHeight: '36px', height: 'auto' }}
                        onInput={(e) => {
                            const el = e.target as HTMLTextAreaElement;
                            el.style.height = 'auto';
                            el.style.height = el.scrollHeight + 'px';
                        }}
                    />
                    {isModified && (
                        <div 
                            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" 
                            title="Edited"
                        />
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-0.5 px-2 border-l border-slate-200/80">
                    {/* Reset */}
                    <button
                        onClick={resetToOriginal}
                        disabled={!isModified}
                        title="Reset to original"
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            isModified
                                ? "text-amber-500 hover:bg-amber-50 hover:text-amber-600"
                                : "text-slate-300 cursor-default"
                        )}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    {/* Copy */}
                    <button
                        onClick={copyToClipboard}
                        title="Copy to clipboard"
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            copiedId
                                ? "text-emerald-600 bg-emerald-50"
                                : "text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                        )}
                    >
                        {copiedId ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Main Component ---
export function ScientificNotationGuide({ isInline = false }: { isInline?: boolean }) {
    return (
        <div className={cn("space-y-12", isInline ? "" : "max-w-5xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-700")}>
            <div className="prose prose-slate max-w-none mb-6">
                <p className="text-base text-slate-600 leading-relaxed">
                    TestoZa uses <strong>KaTeX</strong> for mathematics and <strong>mhchem</strong> for chemistry.
                    Edit the syntax below to customize, then copy and paste into the question builder.
                    Use <code>$ ... $</code> for inline formulas and <code>$$ ... $$</code> for centered blocks.
                </p>
                <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Live preview updates as you type</span>
                    <span className="flex items-center gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Reset restores original syntax</span>
                </div>
            </div>

            {SECTIONS.map((section) => (
                <section key={section.id} className="space-y-4">
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            {section.icon}
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">{section.title}</h2>
                    </div>

                    <div className="space-y-3">
                        {section.items.map((item, idx) => (
                            <NotationRow key={`${section.id}-${idx}`} item={item} sectionId={section.id} />
                        ))}
                    </div>
                </section>
            ))}

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="bg-amber-100 p-2.5 rounded-xl">
                        <CornerDownLeft className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-amber-900 mb-1">Pro Tip: Edit & Customize</h3>
                        <p className="text-sm text-amber-800 leading-relaxed">
                            You can edit any syntax box above to create your own formula.
                            The preview updates instantly. If you make a mistake, hit the
                            <RotateCcw className="h-3 w-3 inline mx-1 text-amber-600" />
                            reset button to restore the original.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
