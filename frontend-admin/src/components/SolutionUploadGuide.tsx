import React from 'react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { FileText, BookOpen, CheckCircle2, FlaskConical, Calculator, UploadCloud, ArrowRight } from 'lucide-react';

interface SolutionUploadGuideProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
    isInline?: boolean;
}

const solutionAiPrompt = `ROLE:
You are an AI document parser and educational content extractor.

GOAL:
Convert the PROVIDED PDF, IMAGE, or TEXT containing EXAM SOLUTIONS into a STRICT, VALID JSON file for bulk uploading.

RULES:
1. RETURN ONLY RAW JSON (No markdown, no talk).
2. Use DOUBLE BACKSLASHES (\\\\) for all LaTeX (e.g., \\\\frac, \\\\ce{H2O}).
3. Use <br> for line breaks within a solution.
4. Maintain the sequential order of questions.

STRICT JSON FORMAT:
{
  "solutions": [
    "Step-by-step solution for Q1 with KaTeX math...",
    "Detailed solution for Q2 using \\\\ce{H2O}...",
    "..."
  ]
}

FINAL COMMAND:
Extract solutions from the attached document and output ONLY the JSON snippet.`;

export function SolutionUploadGuide({ open: controlledOpen, onOpenChange, trigger, isInline = false }: SolutionUploadGuideProps) {
    const [internalOpen, setInternalOpen] = React.useState(false);

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setIsOpen = onOpenChange || setInternalOpen;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(solutionAiPrompt.trim());
        toast.success("AI Prompt copied to clipboard!");
    };

    const content = (
        <div className="space-y-8 py-4">

            {/* Section 0: Generate with AI */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-purple-700">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">0</div>
                    Generate Solutions via AI
                </h3>
                <p className="text-sm text-muted-foreground">
                    Paste this prompt into <strong className="text-blue-600">Google Gemini</strong> or ChatGPT along with your solution file to get your JSON instantly.
                </p>
                <div className="relative">
                    <pre className="bg-slate-900 text-slate-300 p-4 rounded-xl text-[10px] font-mono whitespace-pre-wrap border border-slate-800 max-h-[150px] overflow-y-auto">
                        {solutionAiPrompt.trim()}
                    </pre>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2 h-7 text-xs"
                        onClick={copyToClipboard}
                    >
                        Copy Prompt
                    </Button>
                </div>
            </div>

            {/* Section 1: JSON Formats */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">1</div>
                    Pick your JSON Format
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                        <h4 className="font-bold text-slate-700">Sequential Array (Easiest)</h4>
                        <p className="text-sm text-slate-500">Solutions map to questions in order. For section-wise tests, it follows all sections sequentially.</p>
                        <pre className="bg-slate-900 text-slate-300 p-3 rounded-lg text-[10px] font-mono whitespace-pre-wrap">
                            {`{
  "solutions": [
    "Solution for Q1...",
    "Solution for Q2..."
  ]
}`}
                        </pre>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                        <h4 className="font-bold text-slate-700">Explicit ID Mapping</h4>
                        <p className="text-sm text-slate-500">Map specific Question IDs to solutions. Best for ensuring 100% accuracy.</p>
                        <pre className="bg-slate-900 text-slate-300 p-3 rounded-lg text-[10px] font-mono whitespace-pre-wrap">
                            {`{
  "solutions": {
    "q-101": "Solution text...",
    "q-102": "Solution text..."
  }
}`}
                        </pre>
                    </div>
                </div>
            </div>

            {/* Section 2: Math & Chemistry */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">2</div>
                    Math & Chemistry Support
                </h3>
                <p className="text-sm text-slate-500">Full KaTeX and mhchem support inside your solution text.</p>

                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-blue-50 bg-blue-50/30">
                        <div className="flex items-center gap-3">
                            <Calculator className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium">Mathematical Formulas</span>
                        </div>
                        <code className="text-xs bg-white px-2 py-1 rounded border">$$x^2 + y^2 = r^2$$</code>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-50 bg-emerald-50/30">
                        <div className="flex items-center gap-3">
                            <FlaskConical className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-medium">Chemical Equations</span>
                        </div>
                        <code className="text-xs bg-white px-2 py-1 rounded border">{"\\ce{2H2 + O2 -> 2H2O}"}</code>
                    </div>
                </div>
            </div>

            {/* Section 3: How to Upload */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">3</div>
                    How to Upload
                </h3>

                <div className="relative pl-8 space-y-6 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    <div className="relative">
                        <div className="absolute -left-8 top-1 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white"></div>
                        <p className="text-sm text-slate-600">Go to your <strong>Creator Dashboard</strong> and find your test.</p>
                    </div>
                    <div className="relative">
                        <div className="absolute -left-8 top-1 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white"></div>
                        <p className="text-sm text-slate-600">Click the <strong>3-dot menu (⋮)</strong> → <strong>Upload Solutions</strong>.</p>
                    </div>
                    <div className="relative">
                        <div className="absolute -left-8 top-1 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white"></div>
                        <p className="text-sm text-slate-600">Click <strong>Import JSON</strong> and select your file.</p>
                    </div>
                    <div className="relative">
                        <div className="absolute -left-8 top-1 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-white shadow-sm"></div>
                        <p className="text-sm font-bold text-slate-800">Review in the editor and click "Save All".</p>
                    </div>
                </div>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-100 flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-amber-800">Pro Tip</p>
                    <p className="text-sm text-amber-700">Use the "Live Preview" toggle while editing to see how your solutions look to students!</p>
                </div>
            </div>

        </div>
    );

    if (isInline) {
        return content;
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {trigger && (
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
            )}
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <BookOpen className="h-6 w-6 text-indigo-600" />
                        Solution Upload Guide
                    </DialogTitle>
                    <DialogDescription className="text-base font-medium">
                        Learn how to bulk-upload detailed solutions for your tests.
                    </DialogDescription>
                </DialogHeader>

                {content}

                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={() => setIsOpen(false)} className="bg-indigo-600 hover:bg-indigo-700">
                        Got it!
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
