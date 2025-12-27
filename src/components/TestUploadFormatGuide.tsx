import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { FileText, Download, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Sparkles, Copy, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function TestUploadFormatGuide() {
    const [isOpen, setIsOpen] = React.useState(false);

    const jsonTemplate = `ROLE:
You are an AI document parser, OCR analyst, and exam-content extractor.

GOAL:
Convert the PROVIDED PDF or IMAGE into a STRICT, VALID JSON test file.
DO NOT generate new questions.
ONLY extract and restructure content that exists in the file.

CRITICAL BEHAVIOR RULES:
- Read the uploaded PDF/Image visually (OCR + layout reasoning).
- Identify QUESTIONS, OPTIONS, ANSWERS, and IMAGES based on layout.
- If a diagram/image appears immediately before or after a question, attach it to that question.
- NEVER hallucinate or invent content.
- If something is unclear, infer conservatively from the document layout.
- Output ONLY valid JSON. No markdown. No explanations. No comments.

--------------------------------------------------
DOCUMENT ANALYSIS STEPS (MANDATORY):
1. Detect each question boundary using:
   - Question numbers
   - Line breaks
   - Bullets (Q., 1., 1), etc.
2. For each question:
   - Extract full question text
   - Detect if it is:
     - Single choice
     - Multiple choice
     - Numerical
3. Extract options (A/B/C/D or similar)
4. Detect correct answers using:
   - Answer keys
   - Highlighted/marked answers
   - End-of-page answer sections
5. Convert all mathematical expressions into LaTeX.
6. Preserve original wording (do NOT rewrite).
7. Attach diagrams/images to the correct question using base64 or URL placeholder.

--------------------------------------------------
MATH & FORMATTING RULES:
- Use LaTeX for ALL math: \\frac, \\sqrt, \\int, x^2, etc.
- Escape ALL backslashes for JSON (\\ instead of \).
- Inline math: $...$
- Block math: $$...$$
- Do NOT simplify expressions.

TEXT & LINE-BREAK RULES:
- DO NOT use escaped newline characters (\\n).
- Use REAL line breaks inside JSON strings.
- Multi-line questions must appear as visually separated lines.
- Do NOT use <br>, HTML tags, or markdown.

--------------------------------------------------
STRICT JSON OUTPUT FORMAT (DO NOT CHANGE):
{
  "title": "Extracted from document or inferred",
  "description": "Auto-generated from document content",
  "duration": 60,
  "marks_per_question": 4,
  "negative_marks": 1,
  "questions": [
    {
      "id": 1,
      "type": "single | multiple | numerical",
      "question": "Exact extracted question text with LaTeX",
      "image": "base64_or_url_if_present_else_null",
      "options": {
        "A": "Option text",
        "B": "Option text",
        "C": "Option text",
        "D": "Option text"
      },
      "correctAnswer":
        "A" |
        ["A","C"] |
        { "min": 9.8, "max": 10.2 }
    }
  ]
}

--------------------------------------------------
ANSWER RULES:
- Single choice → correctAnswer: "A"
- Multiple choice → correctAnswer: ["A","C"]
- Numerical → NO options field, only:
  { "min": value, "max": value }

--------------------------------------------------
FAIL-SAFE RULES:
- If an image-only question exists → still create a question entry.
- If options are missing → infer from alignment or labels.
- If answer key exists separately → map carefully to question IDs.
- If ANY field is missing → set it to null (never omit keys).
- If a question contains multiple statements or expressions,
  format them on separate physical lines.

--------------------------------------------------
FINAL OUTPUT RULE:
RETURN ONLY RAW JSON.
NO TEXT BEFORE OR AFTER.

`;

    const handleDownload = () => {
        const blob = new Blob([jsonTemplate], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_test_template.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Template downloaded!");
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="link" className="text-xs text-muted-foreground h-auto p-0 underline decoration-dashed underline-offset-4 hover:text-primary">
                    How do I format the file? (Guide)
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <FileText className="h-6 w-6 text-blue-600" />
                        Upload Guide
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        Follow these 5 simple steps to upload tests in bulk.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-8 py-4">

                    {/* Step 1: Generate with AI */}
                    <div className="flex gap-4">
                        <div className="flex-none w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">1</div>
                        <div className="space-y-3 flex-1">
                            <h3 className="font-semibold text-lg text-purple-700">Generate with AI</h3>
                            <p className="text-sm text-muted-foreground">
                                Paste this prompt into <strong>ChatGPT / Gemini / Perplexity</strong> to create your file automatically.
                            </p>

                            <div className="relative group">
                                <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono max-h-[200px] overflow-y-auto whitespace-pre-wrap border border-slate-800">
                                    {jsonTemplate.trim()}
                                </pre>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8"
                                    onClick={() => {
                                        navigator.clipboard.writeText(jsonTemplate.trim());
                                        toast.success("AI Prompt copied!");
                                    }}
                                >
                                    <Copy className="h-3 w-3 mr-2" /> Copy Prompt
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Upload Source to AI */}
                    <div className="flex gap-4">
                        <div className="flex-none w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">2</div>
                        <div className="space-y-2 flex-1">
                            <h3 className="font-semibold text-lg text-purple-700">Upload Source to AI</h3>
                            <p className="text-sm text-muted-foreground">
                                Go to <strong>ChatGPT / Gemini / Perplexity</strong>. Paste the prompt, then <strong>upload your PDF, Image, or Video</strong> that you want to create a test from.
                            </p>
                            <div className="flex gap-2 mt-2">
                                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">PDF</span>
                                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">Images</span>
                                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">Notes</span>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Download Template */}
                    <div className="flex gap-4">
                        <div className="flex-none w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">3</div>
                        <div className="space-y-2 flex-1">
                            <h3 className="font-semibold text-lg">Download the Template</h3>
                            <p className="text-sm text-muted-foreground">Get a ready-to-use file showing exactly how to structure your test if you want to edit manually.</p>
                            <Button onClick={handleDownload} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                                <Download className="h-4 w-4" /> Download Template File
                            </Button>
                        </div>
                    </div>

                    {/* Step 4: Paste & Save */}
                    <div className="flex gap-4">
                        <div className="flex-none w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">4</div>
                        <div className="space-y-4 flex-1">
                            <h3 className="font-semibold text-lg">Paste & Save</h3>
                            <p className="text-sm text-muted-foreground">
                                Paste the generated text from the AI chat platform into the <code>sample_test_template.json</code> file (or any .json file) and <strong>Save</strong>.
                            </p>
                        </div>
                    </div>

                    {/* Step 5: Upload It */}
                    <div className="flex gap-4">
                        <div className="flex-none w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">5</div>
                        <div className="space-y-2 flex-1">
                            <h3 className="font-semibold text-lg">Upload It</h3>
                            <p className="text-sm">Click <strong>Import JSON</strong> and select your saved file.</p>
                        </div>
                    </div>


                    {/* --- DETAILED SECTION (Collapsible) --- */}
                    <div className="border-t pt-6">
                        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full space-y-2">
                            <div className="flex items-center justify-between space-x-4 px-4">
                                <h4 className="text-sm font-semibold">Need more details? (Full Documentation)</h4>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="w-9 p-0">
                                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        <span className="sr-only">Toggle</span>
                                    </Button>
                                </CollapsibleTrigger>
                            </div>

                            <CollapsibleContent className="space-y-4">
                                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg opacity-90 text-sm space-y-6">

                                    <div>
                                        <h5 className="font-bold mb-2">File Structure</h5>
                                        <p className="text-muted-foreground mb-2">The JSON file should contain a single object representing the Test, which includes a questions array.</p>
                                        <pre className="bg-slate-950 text-slate-50 p-3 rounded text-xs font-mono overflow-x-auto">
                                            {`{
  "title": "Required: Test Title",
  "description": "Optional: Short description",
  "revision_notes": "Optional: Rich text summary/instructions (Markdown supported)",
  "institution_name": "Optional: Name of institution",
  "duration": 30,            // Duration in minutes (default: 30)
  "marks_per_question": 4,   // Marks for correct answer (default: 4)
  "negative_marks": 1,       // Deduction for wrong answer (default: 1)
  "is_public": true,         // true for Public, false for Private
  "questions": [
    // Array of Question objects (see below)
  ]
}`}
                                        </pre>
                                    </div>

                                    <div>
                                        <h5 className="font-bold mb-2">1. Single Choice Question (Default)</h5>
                                        <pre className="bg-slate-950 text-slate-50 p-3 rounded text-xs font-mono overflow-x-auto">
                                            {`{
  "id": 1, 
  "type": "single",
  "question": "What is the capital of India?",
  "options": {
    "A": "Mumbai",
    "B": "New Delhi",
    "C": "Kolkata",
    "D": "Chennai"
  },
  "correctAnswer": "B",
  "typingMode": "en"  // "en" for English, "hi" for Hindi
}`}
                                        </pre>
                                    </div>

                                    <div>
                                        <h5 className="font-bold mb-2">2. Multiple Choice Question (Checkbox)</h5>
                                        <pre className="bg-slate-950 text-slate-50 p-3 rounded text-xs font-mono overflow-x-auto">
                                            {`{
  "id": 2,
  "type": "multiple",
  "question": "Which of the following are prime numbers?",
  "options": {
    "A": "2",
    "B": "4",
    "C": "5",
    "D": "9"
  },
  "correctAnswer": ["A", "C"], // Array of correct options
  "typingMode": "en"
}`}
                                        </pre>
                                    </div>

                                    <div>
                                        <h5 className="font-bold mb-2">3. Numerical Question (Range)</h5>
                                        <pre className="bg-slate-950 text-slate-50 p-3 rounded text-xs font-mono overflow-x-auto">
                                            {`{
  "id": 3,
  "type": "numerical",
  "question": "Value of Pi up to 2 decimals?",
  "correctAnswer": {
    "min": 3.14,
    "max": 3.14
  },
  "typingMode": "en"
}`}
                                        </pre>
                                    </div>

                                    <div>
                                        <h5 className="font-bold mb-2">4. Image-Based Question</h5>
                                        <p className="text-muted-foreground mb-2">Images must be provided as Base64 strings or public URLs.</p>
                                        <pre className="bg-slate-950 text-slate-50 p-3 rounded text-xs font-mono overflow-x-auto">
                                            {`{
  "id": 4,
  "type": "single",
  "question": "Identify this logo:",
  "image": "https://example.com/logo.png",
  "options": {
    "A": "Apple",
    "B": "Google",
    "C": "Microsoft",
    "D": "Meta"
  },
  "optionImages": {
     "A": "base64_string_here..." // Optional: Images for options
  },
  "correctAnswer": "A"
}`}
                                        </pre>
                                    </div>

                                    <div>
                                        <h5 className="font-bold mb-2">Complete Example File (sample_test.json)</h5>
                                        <pre className="bg-slate-950 text-slate-50 p-3 rounded text-xs font-mono overflow-x-auto">
                                            {`{
  "title": "General Knowledge & Math Mock",
  "description": "A sample test uploaded via file.",
  "duration": 15,
  "marks_per_question": 2,
  "negative_marks": 0.5,
  "questions": [
    {
      "id": 1,
      "type": "single",
      "question": "Blue planet is?",
      "options": { "A": "Mars", "B": "Earth", "C": "Venus", "D": "Jupiter" },
      "correctAnswer": "B"
    },
    {
      "id": 2,
      "type": "numerical",
      "question": "Solve: 5 + 5",
      "correctAnswer": { "min": 10, "max": 10 }
    }
  ]
}`}
                                        </pre>
                                    </div>

                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
