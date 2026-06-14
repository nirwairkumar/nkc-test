import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, ExternalLink, Sparkles, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AiPromptGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const showcaseImages = [
  { src: '/sample-questions-showcase/chemistry-table-question.png', label: 'Chemistry & Tables' },
  { src: '/sample-questions-showcase/handwritten-question.png', label: 'Handwritten Notes' },
  { src: '/sample-questions-showcase/multiple-question-in-single-image.png', label: 'Bulk Questions' },
  { src: '/sample-questions-showcase/question-with-option.png', label: 'Standard MCQs' },
  { src: '/sample-questions-showcase/sceletor-chemical-structure-example.png', label: 'Skeletal Chem' },
  { src: '/sample-questions-showcase/tabular-question.png', label: 'Data & Tables' },
];

export function AiPromptGuide({ isOpen, onClose }: AiPromptGuideProps) {
  const [copied, setCopied] = useState(false);
  const [copiedChem, setCopiedChem] = useState(false);
  const [copiedTable, setCopiedTable] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const guideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setActiveImageIndex((prevIndex) => (prevIndex + 1) % showcaseImages.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (guideRef.current && !guideRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (target.closest('.ai-guide-trigger') || target.classList.contains('ai-guide-trigger')) {
          return;
        }
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const promptText = `Convert the provided input (image/text of questions, paragraphs, solutions, or tables) into a KaTeX/mhchem-formatted block.

RULES:
1. Output ONLY the converted content inside a single code snippet. If you find more then one question or separated content then make different code snippet.
2. Escape all LaTeX commands with single backslashes (e.g., use \\frac, \\ce, \\pu, \\text).
3. Inline math inside $...$, block math inside $$...$$.
4. Convert tables and column matches to \\begin{array}...\\end{array} syntax.
5. Apply \\ce{...} for chemical equations/formulas and \\pu{...} for units.
6. Use standard line breaks anywhere if required.
7. Mark complex diagrams/skeletal structures as [IMAGE].
`;

  const chemistryPrompt = `convert chemical structures:
Convert the chemical structure in this image into a single-line KaTeX string wrapped inside $ ... $. Do not use the "array" environment, as it creates too much blank space between the bonds and the atoms.

Follow these exact formatting rules to keep the structure compact, tightly packed, and perfectly aligned:

1. Horizontal Chain & Bonds: Use standard text characters wrapped in "\\text{}" for chemical symbols (e.g., \\text{CH}_3). Use "\\text{-}" for the single bonds so math spacing does not push the atoms apart.
2. Vertical Double Bonds: Use "\\overset{\\text{O}}{\\overset{\\parallel}{\\text{C}}}" for carbonyl groups (C=O).
3. Vertical Branching Alignment (CRITICAL): When a branching chain goes downward (e.g., -CH₂-CH₃) from a main-chain atom (like CH), use "\\mathrlap" inside the bottom "\\underset" block. This forces the branch to align perfectly by its first atom (the CH₂) and prevents it from pushing the horizontal bonds away or creating gaps.
   Example structure: \\underset{\\mathrlap{\\text{CH}_2\\text{-}\\text{CH}_3}}{\\underset{\\vert}{\\text{CH}}}
4. Output only the clean, final KaTeX string inside a code block.

`;
  const tablePrompt = `table prompt`;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      toast.success('AI Formatter Prompt copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy prompt.');
    }
  };

  const handleCopyChemistryPrompt = async () => {
    try {
      await navigator.clipboard.writeText(chemistryPrompt);
      setCopiedChem(true);
      toast.success('Chemistry Prompt copied to clipboard!');
      setTimeout(() => setCopiedChem(false), 2000);
    } catch (err) {
      toast.error('Failed to copy prompt.');
    }
  };

  const handleCopyTablePrompt = async () => {
    try {
      await navigator.clipboard.writeText(tablePrompt);
      setCopiedTable(true);
      toast.success('Table Prompt copied to clipboard!');
      setTimeout(() => setCopiedTable(false), 2000);
    } catch (err) {
      toast.error('Failed to copy prompt.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={guideRef}
      className="fixed left-14 top-24 bottom-24 w-80 z-[9997] bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-left-5 duration-300"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-indigo-500 text-white rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">AI Formatting Guide</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-slate-700 transition-colors"
          title="Close guide"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Guide Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* <p className="text-xs text-slate-500 leading-relaxed font-medium">
          Create complex questions with math formulae, chemical equations, matrices, or tables without knowing LaTeX syntax.
        </p> */}

        {/* Showcase Carousel */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wide block">Convert Question Images Into Required Format</span>
          <div className="relative h-28 w-full overflow-hidden rounded-xl border border-slate-200/60 bg-slate-50 flex items-center justify-center">
            <div
              className="flex transition-transform duration-500 ease-in-out h-full w-full"
              style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
            >
              {showcaseImages.map((img, idx) => (
                <div key={idx} className="w-full h-full shrink-0 relative flex items-center justify-center p-2 bg-slate-50">
                  <img
                    src={img.src}
                    alt={img.label}
                    className="max-h-full max-w-full object-contain rounded-md"
                  />
                  <div className="absolute bottom-1.5 right-1.5 bg-indigo-600/90 backdrop-blur-[1px] text-[8px] font-bold text-white px-2 py-0.5 rounded-full shadow-sm">
                    {img.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vertical Steps */}
        <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-50">

          {/* Step 1 */}
          <div className="relative pl-7 group">
            <div className="absolute left-1.5 top-0.5 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-white ring-2 ring-indigo-100 flex items-center justify-center text-[9px] font-bold text-white z-10">
              1
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800">Copy AI Prompt</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Copy the system instructions designed to format question structures perfectly.
              </p>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className={`flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all duration-200 ${copied
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-indigo-600 border-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-100'
                  }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied Prompt!' : 'Copy Formatting Prompt'}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyChemistryPrompt}
                  className={`flex items-center justify-center gap-1 flex-1 py-1 px-2 rounded-md border text-[10px] font-semibold transition-all duration-200 ${copiedChem
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-800'
                    }`}
                >
                  {copiedChem ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedChem ? 'Copied Chem!' : 'Chemistry'}
                </button>
                <button
                  type="button"
                  onClick={handleCopyTablePrompt}
                  className={`flex items-center justify-center gap-1 flex-1 py-1 px-2 rounded-md border text-[10px] font-semibold transition-all duration-200 ${copiedTable
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-800'
                    }`}
                >
                  {copiedTable ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedTable ? 'Copied Table!' : 'Table'}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative pl-7">
            <div className="absolute left-1.5 top-0.5 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-white ring-2 ring-indigo-100 flex items-center justify-center text-[9px] font-bold text-white z-10">
              2
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800">Open AI Chat</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Go to Google AI, Gemini, or ChatGPT and paste the copied prompt.
              </p>
              <div className="grid grid-cols-3 gap-1">
                <a
                  href="https://www.google.com/ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-lg border border-slate-200 text-[8px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors text-center"
                >
                  <span className="truncate w-full px-0.5">Google AI</span>
                  <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                </a>
                <a
                  href="https://gemini.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-lg border border-slate-200 text-[8px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors text-center"
                >
                  <span>Gemini</span>
                  <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                </a>
                <a
                  href="https://chatgpt.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-lg border border-slate-200 text-[8px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors text-center"
                >
                  <span>ChatGPT</span>
                  <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                </a>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative pl-7">
            <div className="absolute left-1.5 top-0.5 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-white ring-2 ring-indigo-100 flex items-center justify-center text-[9px] font-bold text-white z-10">
              3
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800">Upload Questions</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Attach your question image, textbook crop, handwritten question paper, or screenshot.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative pl-7">
            <div className="absolute left-1.5 top-0.5 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-white ring-2 ring-indigo-100 flex items-center justify-center text-[9px] font-bold text-white z-10">
              4
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800">Paste in Editor</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Copy individual questions and option texts from the AI response, then paste them directly into question & option fields.
              </p>
            </div>
          </div>

        </div>

        {/* Extra formatting tips or examples */}
        <div className="mt-6 pt-4 border-t border-slate-100 bg-slate-50/50 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
            <span>Format Details</span>
          </div>
          <div className="text-[10px] text-slate-500 leading-relaxed space-y-1">
            <div>• Math expressions render automatically when wrapped in <code className="bg-slate-100 px-1 rounded font-mono">$...$</code>.</div>
            <div>• Double line breaks create new paragraph blocks.</div>
            <div>• Chemistry equations automatically use LaTeX <code className="bg-slate-100 px-1 rounded font-mono">{"\\ce{...}"}</code> syntax.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
