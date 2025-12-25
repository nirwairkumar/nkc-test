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

    const jsonTemplate = `**Role**: You are an expert educational content developer and software engineer. Your task is to generate a valid JSON file for a test platform based on a specific topic I will provide.

**Context**: The output JSON will be uploaded to a React application that supports:

- Multiple Question Types: Single Choice, Multiple Choice, and Numerical.
- Advanced Math Rendering: The system uses KaTeX and remark-math. It supports pure LaTeX syntax using libraries like MathJax or KaTeX (e.g., \int, \frac, \sqrt).
- Automatic Processing: The system automatically wraps "naked" LaTeX (like x^2) in math delimiters, so strict delimiter usage ($..$) is good but not strictly fatal. However, for complex equations, use $$...$$ for block math or $...$ for inline.

**Step-by-Step Instructions**:
- Analyze the Topic: Deeply understand the subject matter to create challenging, high-quality questions (JEE/University level).
- Formulate Questions: Create a mix of conceptual and calculation-based questions.
- Format Mathematics:
- Use LaTeX for ALL mathematical symbols.
- Crucial: Escape all backslashes in the JSON string (e.g., use \\frac instead of \frac).
- Example: "Calculate $\\int_{0}^{1} x^2 dx$"
- Construct JSON: Follow the Strict Schema below.
- Strict JSON Schema
{
  "title": "String: Test Title",
  "description": "String: Short description",
  "duration": Number (minutes, e.g., 60),
  "marks_per_question": Number (e.g., 4),
  "negative_marks": Number (positive integer, e.g., 1 for -1 penalty),
  "questions": [
    {
      "id": Number (1, 2, 3...),
      "type": "single" | "multiple" | "numerical",
      "question": "String: The question text with LaTeX math.",
      "image": "String (Optional): URL to an image",
      "options": {
        "A": "String: Option text (LaTeX allowed)",
        "B": "String: Option text",
        "C": "String: Option text",
        "D": "String: Option text"
      },
      "correctAnswer": "String (e.g., 'A') OR Array ['A','B'] OR Object { 'min': 10, 'max': 10.5 }"
    }
  ]
}

**Rules for correctAnswer**
- Single Choice (type: "single"): correctAnswer must be a string key (e.g., "A").
- Multiple Choice (type: "multiple"): correctAnswer must be an array of keys (e.g., ["A", "C"]).
- Numerical (type: "numerical"):
- No options object needed.
- correctAnswer must be a range object: {"min": 5.0, "max": 5.2}.

**Example Output to Generate**
{
  "title": "Advanced Calculus",
  "description": "Test on Limits, Derivatives, and Integrals.",
  "duration": 45,
  "marks_per_question": 4,
  "negative_marks": 1,
  "questions": [
    {
      "id": 1,
      "type": "single",
      "question": "Evaluate the limit: $$\\lim_{x \\to 0} \\frac{\\sin x}{x}$$",
      "options": {
        "A": "$0$",
        "B": "$1$",
        "C": "$\\infty$",
        "D": "Undefined"
      },
      "correctAnswer": "B"
    },
    {
      "id": 2,
      "type": "numerical",
      "question": "If $f(x) = x^2$, find $f'(2)$.",
      "correctAnswer": { "min": 3.99, "max": 4.01 }
    }
  ]
}

**Task:** Please generate a JSON test file for the topic: [INSERT TOPIC HERE] with [NUMBER] questions.
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
