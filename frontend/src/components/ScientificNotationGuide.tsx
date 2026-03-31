import React, { useState } from 'react';
import { Copy, Check, FlaskConical, Calculator, Layout, CornerDownLeft, Table as TableIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import LatexRenderer from '@/components/ui/LatexRenderer';

interface NotationItem {
    label: string;
    description: string;
    latex: string;
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

export function ScientificNotationGuide({ isInline = false }: { isInline?: boolean }) {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className={cn("space-y-12", isInline ? "" : "max-w-5xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-700")}>
            <div className="prose prose-slate max-w-none mb-10">
                <p className="text-lg text-slate-600 leading-relaxed">
                    TestoZa uses <strong>KaTeX</strong> for mathematics and <strong>mhchem</strong> for chemistry.
                    Simply copy the LaTeX code and paste it directly into the question builder.
                    Use <code>$ ... $</code> for inline formulas and <code>$$ ... $$</code> for centered blocks.
                </p>
            </div>

            {SECTIONS.map((section) => (
                <section key={section.id} className="space-y-6">
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            {section.icon}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">{section.title}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {section.items.map((item, idx) => {
                            const itemId = `${section.id}-${idx}`;
                            const isGeneral = section.id === 'general';
                            const visualContent = isGeneral ? item.latex : `$$${item.latex}$$`;
                            const copyContent = isGeneral ? item.latex : `$${item.latex}$`;

                            return (
                                <div
                                    key={itemId}
                                    className="group bg-white rounded-3xl border border-slate-200 overflow-hidden transition-all hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100/30 flex flex-col"
                                >
                                    {/* Professional Visual Representation Row */}
                                    <div className="p-6 flex items-center justify-center bg-slate-50/50 border-b border-slate-100 min-h-[120px] flex-1">
                                        <div className="w-full">
                                            <LatexRenderer children={visualContent} className="!text-xl text-slate-900" />
                                        </div>
                                    </div>

                                    {/* Code / LaTeX Row */}
                                    <div className="p-4 bg-white flex items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <code className="text-indigo-600 font-mono text-xs break-all block py-1 bg-indigo-50/50 px-2 rounded-lg">
                                                {copyContent}
                                            </code>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(copyContent, itemId)}
                                            className={cn(
                                                "shrink-0 p-2.5 rounded-xl transition-all duration-200",
                                                copiedId === itemId
                                                    ? "bg-emerald-50 text-emerald-600"
                                                    : "bg-indigo-50 text-indigo-400 group-hover:text-indigo-600 hover:bg-indigo-100 shadow-sm"
                                            )}
                                            title="Copy Code"
                                        >
                                            {copiedId === itemId ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            ))}

            <div className="mt-12 bg-amber-50 border border-amber-200 rounded-3xl p-8">
                <div className="flex items-start gap-4">
                    <div className="bg-amber-100 p-3 rounded-2xl">
                        <CornerDownLeft className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-amber-900 mb-2">Pro Tip: Tables & Formulas</h3>
                        <p className="text-amber-800 leading-relaxed">
                            For complex tables, you can use standard Markdown syntax. If you need LaTeX inside a table, wrap it in <code>$ ... $</code>.
                            If a formula isn't rendering, ensure you have balanced braces <code>{'{}'}</code> and correctly escaped characters.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
