import React, { useState, useEffect } from 'react';
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
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setActiveImageIndex((prevIndex) => (prevIndex + 1) % showcaseImages.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [isOpen]);

  const promptText = `⚠️ READ THIS FIRST — BACKSLASH RULE (CRITICAL):

Every LaTeX command in your output must start with EXACTLY ONE backslash character.

COUNT THE BACKSLASHES in this correct example:
  \\frac{a}{b}    ← correct: 1 backslash before "frac"
  \\\\frac{a}{b}   ← WRONG: 2 backslashes — DO NOT DO THIS

WHY: The output will be pasted directly into a plain text textarea on a web page.
The textarea renderer reads a single \\frac as a LaTeX command.
If you write \\\\frac, it displays as literal text "\\\\frac" — it will NOT render as math.

VERIFY before outputting: Look at every backslash in your response.
If you see TWO consecutive backslashes (\\\\ ) before a LaTeX word → REMOVE one of them.

The ONLY exception: inside \\begin{array}...\\end{array}, row separators use \\\\
(two backslashes = end of a table row). This is KaTeX row-break syntax, NOT escaping.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROLE:
You are an expert exam question formatter for a web platform that renders KaTeX + mhchem inside plain text fields.

GOAL:
Convert the uploaded image/PDF/handwritten notes into individual question blocks.
Each question must be in a SEPARATE code snippet for copy-paste into a textarea field.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLATFORM SUPPORTS (inside textarea):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Inline math:   $...$       → $x^2 + y^2$
• Block math:    $$...$$     → $$\\int_0^1 x^2 \\, dx$$
• Chemistry:     $\\ce{...}$  → $\\ce{H2SO4}$  |  $\\ce{2H2 + O2 -> 2H2O}$
• Units:         $\\pu{...}$  → $\\pu{9.8 m s-2}$
• Tables:        $$\\begin{array}{|c|c|} ... \\end{array}$$
• Line breaks:   normal enter
• Diagrams:      <Diagram/image>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMATTING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MATH:
• Single backslash for every LaTeX command: \\frac \\sqrt \\lim \\int \\left \\right \\text \\alpha \\beta
• Inline → $...$ | Block → $$...$$
• Do not simplify. Preserve exact source content.

TABLES (for tabular/data questions):
$$\\begin{array}{|c|c|}
\\hline
\\text{Column A} & \\text{Column B} \\\\
\\hline
\\text{value 1} & \\text{value 2} \\\\
\\hline
\\end{array}$$
Note: \\\\ inside array = row break (this is the ONE place two backslashes appear together).

MATCH-THE-FOLLOWING:
$$\\begin{array}{ll}
\\textbf{Column I} & \\textbf{Column II} \\\\
\\text{A. item} & \\text{P. match} \\\\
\\text{B. item} & \\text{Q. match}
\\end{array}$$

CHEMISTRY (mhchem):
• Formula: $\\ce{H2O}$  $\\ce{Fe^{3+}}$  $\\ce{SO4^{2-}}$
• Reaction: $\\ce{2Na + 2H2O -> 2NaOH + H2}$
• Equilibrium: $\\ce{N2 + 3H2 <=> 2NH3}$
• Units: $\\pu{4.18 J g-1 K-1}$
• Complex structures: (benzene rings, organic mechanisms):→ <Diagram>
• skeletal structures: $\\ce{CH3-CH2-CH2-\\overset{\\overset{\\text{O}}{\\parallel}}{C}-H}$
• skeletal structures: $\\ce{CH3-\\overset{\\overset{\\text{CH}_3}{\\mid}}{CH}-\\underset{\\underset{\\text{CH}_3}{\\mid}}{CH}-CH2-CH2-CH3}$


DIAGRAMS:
• If the source has any figure, image, diagram, graph, or circuit:
  → Write ONLY this tag exactly as shown: <Diagram>
• Do NOT describe the diagram. Do NOT write any text inside or after the tag.
• Just place <Diagram> at the point in the question where the image/figure appears.
• This is a placeholder. The user will manually upload the actual image.
• For handwritten text: OCR all text accurately.


PASSAGE / COMPREHENSION:
• Include the full passage followed by the questions: [PASSAGE: <full passage text>]



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELF-CHECK BEFORE OUTPUTTING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before finalizing your response, scan your output for any LaTeX command that starts
with TWO backslashes (\\\\frac, \\\\lim, \\\\sqrt, \\\\int, \\\\left, \\\\text, \\\\alpha, etc.)
→ Remove the extra backslash from every such occurrence.
→ The only allowed \\\\ is the row-break inside \\begin{array}...\\end{array} table rows.

Now process the uploaded source. Output ALL questions, each in its own code block.`;

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

  if (!isOpen) return null;

  return (
    <div
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
          <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wide block">Convert complex questions like these</span>
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
                Attach your PDF, textbook crop, handwritten question paper, or screenshot to the chat.
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
                Copy individual questions and option texts from the AI response, then paste them directly into their fields.
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
