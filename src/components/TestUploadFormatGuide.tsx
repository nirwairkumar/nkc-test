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
import { FileText, Download, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function TestUploadFormatGuide() {
    const [isOpen, setIsOpen] = React.useState(false);

    const jsonTemplate = `{
  "title": "My New Test Title",
  "description": "Short description of the test",
  "duration": 30,
  "marks_per_question": 4,
  "questions": [
    {
      "id": 1,
      "type": "single",
      "question": "What is the capital of India?",
      "options": { "A": "Mumbai", "B": "New Delhi", "C": "Kolkata", "D": "Chennai" },
      "correctAnswer": "B"
    }
  ]
}`;

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
                        Follow these 3 simple steps to upload tests in bulk.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-8 py-4">

                    {/* --- SIMPLIFIED SECTION --- */}
                    {/* Step 1 */}
                    <div className="flex gap-4">
                        <div className="flex-none w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
                        <div className="space-y-2 flex-1">
                            <h3 className="font-semibold text-lg">Download the Template</h3>
                            <p className="text-sm text-muted-foreground">Get a ready-to-use file showing exactly how to structure your test.</p>
                            <Button onClick={handleDownload} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                                <Download className="h-4 w-4" /> Download Template File
                            </Button>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4">
                        <div className="flex-none w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">2</div>
                        <div className="space-y-4 flex-1">
                            <h3 className="font-semibold text-lg">Edit the File</h3>
                            <p className="text-sm text-muted-foreground">Open <code>sample_test_template.json</code> in Notepad and edit the text.</p>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-900">
                                    <h4 className="flex items-center gap-2 font-semibold text-green-700 dark:text-green-400 mb-2">
                                        <CheckCircle2 className="h-4 w-4" /> Do This
                                    </h4>
                                    <ul className="text-sm space-y-1 list-disc list-inside text-green-800 dark:text-green-300">
                                        <li>Change text inside quotes <code>" "</code>.</li>
                                        <li>Copy-paste question blocks to add more.</li>
                                    </ul>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-900">
                                    <h4 className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400 mb-2">
                                        <AlertTriangle className="h-4 w-4" /> Watch Out
                                    </h4>
                                    <ul className="text-sm space-y-1 list-disc list-inside text-amber-800 dark:text-amber-300">
                                        <li>Don't remove commas <code>,</code> or brackets <code>{`{ }`}</code>.</li>
                                        <li>Don't delete usage of quotes <code>" "</code>.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4">
                        <div className="flex-none w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">3</div>
                        <div className="space-y-2 flex-1">
                            <h3 className="font-semibold text-lg">Upload It</h3>
                            <p className="text-sm">Click <strong>Import JSON</strong> and select your file.</p>
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
