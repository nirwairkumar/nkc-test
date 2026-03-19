import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Save, ArrowLeft, Upload } from 'lucide-react';
import { fetchTestById, fetchSolutions, saveSolutions } from '@/lib/testsApi';
import { IMEInput } from '@/components/ui/IMEInput';
import LatexRenderer from '@/components/ui/LatexRenderer';

export default function SolutionEditorPage() {
    const { testId } = useParams();
    const navigate = useNavigate();

    const [test, setTest] = useState<any>(null);
    const [solutions, setSolutions] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Default to 'en' (Latex input) since solutions are mostly math
    const [typingMode, setTypingMode] = useState<'en' | 'hi'>('en');

    useEffect(() => {
        if (!testId) return;

        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch the test details to get the questions
                const { data: testD, error: testErr } = await fetchTestById(testId);
                if (testErr) throw new Error(testErr);
                setTest(testD);

                // Fetch existing solutions
                const solRes = await fetchSolutions(testId);
                if (solRes.data && solRes.data.solutions) {
                    setSolutions(solRes.data.solutions);
                }
            } catch (err: any) {
                toast.error("Failed to load test or solutions");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [testId]);

    const handleSolutionChange = (questionId: string | number, value: string) => {
        setSolutions(prev => ({
            ...prev,
            [String(questionId)]: value
        }));
    };

    const handleSaveAll = async () => {
        if (!testId) return;
        setSaving(true);
        try {
            // Filter out empty solutions
            const cleanedSolutions: Record<string, string> = {};
            for (const [k, v] of Object.entries(solutions)) {
                if (v && v.trim() !== '') {
                    cleanedSolutions[k] = v;
                }
            }

            const { error } = await saveSolutions(testId, cleanedSolutions);
            if (error) throw new Error(error.message || "Failed to save");

            toast.success("Solutions saved successfully!");
        } catch (err: any) {
            toast.error(err.message || "Failed to save solutions");
        } finally {
            setSaving(false);
        }
    };

    const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const data = JSON.parse(content);

                if (data.solutions && Array.isArray(data.solutions)) {
                    const importedSolutions: Record<string, string> = {};

                    // Map array index to question IDs sequentially
                    // Note: This assumes JSON solutions array is in the same sequential order as test questions
                    let index = 0;
                    const allQuestions = test?.enable_section_mode && test?.sections
                        ? test.sections.flatMap((s: any) => s.questions || [])
                        : test?.questions || [];

                    for (const q of allQuestions) {
                        if (index < data.solutions.length && data.solutions[index]) {
                            importedSolutions[q.id] = data.solutions[index];
                        }
                        index++;
                    }

                    // Merge with existing
                    setSolutions(prev => ({ ...prev, ...importedSolutions }));
                    toast.success(`Imported ${Object.keys(importedSolutions).length} solutions`);
                } else if (data.solutions && typeof data.solutions === 'object') {
                    // Direct key-value mapping if provided
                    setSolutions(prev => ({ ...prev, ...data.solutions }));
                    toast.success("Imported solutions mapped by ID");
                } else {
                    toast.error("Invalid JSON format. Expected { 'solutions': [...] }");
                }
            } catch (err) {
                toast.error("Failed to parse JSON file");
                console.error(err);
            }
        };
        reader.readAsText(file);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-slate-500">Loading editor...</p>
            </div>
        );
    }

    if (!test) {
        return (
            <div className="container mx-auto py-10 text-center">
                <h2 className="text-2xl font-bold mb-4">Test Not Found</h2>
                <Button onClick={() => navigate('/creator/tests')}>Back to Dashboard</Button>
            </div>
        );
    }

    const allQuestions = test.enable_section_mode && test.sections
        ? test.sections.flatMap((s: any) => s.questions || [])
        : test.questions || [];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 pb-20">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/creator/tests')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold line-clamp-1">Upload Solutions</h1>
                            <p className="text-sm text-slate-500 line-clamp-1">{test.title}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <input
                                type="file"
                                accept=".json"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleImportJson}
                                title="Import JSON Solutions"
                            />
                            <Button variant="outline" className="w-full">
                                <Upload className="h-4 w-4 mr-2" />
                                Import JSON
                            </Button>
                        </div>
                        <Button
                            onClick={handleSaveAll}
                            disabled={saving}
                            className="bg-primary hover:bg-primary/90 text-white min-w-[120px]"
                        >
                            {saving ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="h-4 w-4 mr-2" /> Save All</>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 p-4 rounded-lg text-sm mb-6 border border-indigo-100 dark:border-indigo-900 flex justify-between items-center">
                    <div>Solutions support full LaTeX formatting (e.g., <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded">{"\\ce{H2O}"}</code> or <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded">{"$$x^2 + y^2 = r^2$$"}</code>).</div>
                    <div>
                        <select
                            className="text-xs bg-white dark:bg-slate-800 border p-1 rounded"
                            value={typingMode}
                            onChange={(e) => setTypingMode(e.target.value as 'en' | 'hi')}
                        >
                            <option value="en">English (Math)</option>
                            <option value="hi">Hinglish</option>
                        </select>
                    </div>
                </div>

                {/* Editor List */}
                <div className="space-y-8 relative">
                    {allQuestions.map((q: any, idx: number) => {
                        const correctAns = q.correctAnswer;
                        const correctDisplay = Array.isArray(correctAns)
                            ? correctAns.join(", ")
                            : typeof correctAns === 'object' && correctAns.min !== undefined
                                ? `Between ${correctAns.min} and ${correctAns.max}`
                                : correctAns;

                        return (
                            <Card key={q.id || idx} className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="absolute w-1 bg-indigo-500 h-full left-0 top-0"></div>
                                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 pb-3 pl-6">
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium mb-3">
                                                <LatexRenderer>{q.question}</LatexRenderer>
                                            </div>

                                            {/* Minimal Correct Answer Display */}
                                            <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-md text-sm font-medium border border-green-100 dark:border-green-900/50">
                                                <span>Correct Answer:</span>
                                                <span>{correctDisplay}</span>
                                                {q.type !== 'numerical' && !Array.isArray(correctAns) && q.options && q.options[correctAns as string] && (
                                                    <span className="ml-1 opacity-90 truncate max-w-[200px]">
                                                        (<LatexRenderer>{q.options[correctAns as string]}</LatexRenderer>)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 pl-6 pb-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Detailed Solution</label>
                                        <IMEInput
                                            as="textarea"
                                            typingMode={typingMode}
                                            value={solutions[q.id] || ''}
                                            onChange={(val) => handleSolutionChange(q.id, val)}
                                            placeholder="Write detailed step-by-step solution here. Use $$ for math blocks or \ce{} for chemistry..."
                                            className="min-h-[150px] font-mono text-sm"
                                            enablePreview={true}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {allQuestions.length === 0 && (
                    <div className="text-center py-10 text-slate-500">
                        No questions in this test.
                    </div>
                )}
            </div>
        </div>
    );
}
