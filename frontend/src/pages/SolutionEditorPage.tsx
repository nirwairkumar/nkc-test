import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Save, ArrowLeft, Upload, Trash2, ChevronUp, ChevronDown, Pencil, Sparkles } from 'lucide-react';
import { fetchTestById, fetchSolutions, saveSolutions, updateTest } from '@/lib/testsApi';
import { IMEInput } from '@/components/ui/IMEInput';
import LatexRenderer from '@/components/ui/LatexRenderer';

export default function SolutionEditorPage() {
    const { testId } = useParams();
    const navigate = useNavigate();

    const [test, setTest] = useState<any>(null);
    const [solutions, setSolutions] = useState<Record<string, string>>({});
    const [topics, setTopics] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

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

                // Initialize topics from test questions
                const allQs = testD.enable_section_mode && testD.sections
                    ? testD.sections.flatMap((s: any) => s.questions || [])
                    : testD.questions || [];
                
                const initialTopics: Record<string, string> = {};
                allQs.forEach((q: any) => {
                    if (q.topic) initialTopics[String(q.id)] = q.topic;
                });
                setTopics(initialTopics);
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

    const handleTopicChange = (questionId: string | number, value: string) => {
        setTopics(prev => ({
            ...prev,
            [String(questionId)]: value
        }));
    };

    const handleClearAll = () => {
        if (window.confirm("Are you sure you want to clear ALL solutions? This cannot be undone.")) {
            setSolutions({});
            toast.success("All solutions cleared");
        }
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

            const { error: solErr } = await saveSolutions(testId, cleanedSolutions);
            if (solErr) throw new Error(solErr.message || "Failed to save solutions");

            // 2. Save Topics (Update Test Object)
            const allQs = test.enable_section_mode && test.sections
                ? test.sections.flatMap((s: any) => s.questions || [])
                : test.questions || [];

            const updatedQuestions = allQs.map((q: any) => ({
                ...q,
                topic: topics[String(q.id)] || ''
            }));

            let updatePayload: any = {};
            if (test.enable_section_mode && test.sections) {
                let qIndex = 0;
                const updatedSections = test.sections.map((sec: any) => {
                    const secQs = (sec.questions || []).map(() => updatedQuestions[qIndex++]);
                    return { ...sec, questions: secQs };
                });
                updatePayload = { sections: updatedSections };
            } else {
                updatePayload = { questions: updatedQuestions };
            }

            const { error: testErr } = await updateTest(testId, updatePayload);
            if (testErr) throw new Error("Failed to save topics");

            toast.success("Solutions and Topics saved successfully!");
        } catch (err: any) {
            toast.error(err.message || "Failed to save data");
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
                <Button onClick={() => navigate('/my-tests')}>Back to Dashboard</Button>
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
                        <Button variant="ghost" size="icon" onClick={() => navigate('/my-tests')}>
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
                            variant="outline"
                            onClick={handleClearAll}
                            className="text-destructive hover:bg-destructive/10 border-destructive/20"
                            title="Clear all solutions"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear All
                        </Button>
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
                                            <div className="inline-flex items-center gap-2 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-semibold border border-emerald-100/50 dark:border-emerald-900/30">
                                                <span className="opacity-70">Correct Answer:</span>
                                                <span className="bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-emerald-800 dark:text-emerald-300">{correctDisplay}</span>
                                                {q.type !== 'numerical' && !Array.isArray(correctAns) && q.options && q.options[correctAns as string] && (
                                                    <span className="ml-0.5 font-medium truncate max-w-[300px]">
                                                        <LatexRenderer>{q.options[correctAns as string]}</LatexRenderer>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 pl-6 pb-4">
                                    <div className="space-y-4">
                                         <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Detailed Solution</label>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-md shadow-sm">
                                                    <Sparkles className="w-3 h-3 text-indigo-500" />
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Topic:</span>
                                                    <input 
                                                        className="text-xs font-medium bg-transparent border-none focus:ring-0 p-0 w-32 placeholder:text-slate-300"
                                                        placeholder="Add Topic..."
                                                        value={topics[q.id] || ''}
                                                        onChange={(e) => handleTopicChange(q.id, e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            {activeQuestionId === String(q.id) && (
                                                <span className="text-[10px] text-indigo-500 font-medium animate-pulse">Editing Mode</span>
                                            )}
                                        </div>

                                        {activeQuestionId === String(q.id) ? (
                                            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                                <IMEInput
                                                    as="textarea"
                                                    autoFocus
                                                    typingMode={typingMode}
                                                    value={solutions[q.id] || ''}
                                                    onChange={(val) => handleSolutionChange(q.id, val)}
                                                    onBlur={() => setActiveQuestionId(null)}
                                                    placeholder="Write detailed step-by-step solution here. Use $$ for math blocks or \ce{} for chemistry..."
                                                    className="min-h-[200px] font-mono text-sm border-indigo-200 ring-2 ring-indigo-50 shadow-sm"
                                                    enablePreview={true}
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => setActiveQuestionId(String(q.id))}
                                                className={`min-h-[100px] p-5 rounded-xl border transition-all cursor-text group relative flex flex-col ${solutions[q.id]
                                                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm'
                                                    : 'bg-slate-50 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                                                    }`}
                                            >
                                                {!solutions[q.id] ? (
                                                    <div className="flex flex-col items-center justify-center my-auto py-4 text-slate-400">
                                                        <Pencil className="h-5 w-5 mb-2 opacity-30" />
                                                        <p className="text-sm font-medium">Click to add detailed solution...</p>
                                                    </div>
                                                ) : (
                                                    <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 solution-renderer">
                                                        <LatexRenderer>{solutions[q.id]}</LatexRenderer>
                                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="flex items-center gap-1.5 p-1 px-2.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100 shadow-sm">
                                                                <Pencil className="w-3 h-3" />
                                                                EDIT
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    {/* Bottom Save Button */}
                    {allQuestions.length > 3 && (
                        <div className="flex justify-center pt-6 pb-10">
                            <Button
                                onClick={handleSaveAll}
                                disabled={saving}
                                size="lg"
                                className="bg-primary hover:bg-primary/90 text-white min-w-[200px] shadow-lg hover:shadow-xl transition-all"
                            >
                                {saving ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving All Solutions...</>
                                ) : (
                                    <><Save className="h-5 w-5 mr-2" /> Save All Solutions</>
                                )}
                            </Button>
                        </div>
                    )}
                </div>

                {allQuestions.length === 0 && (
                    <div className="text-center py-10 text-slate-500">
                        No questions in this test.
                    </div>
                )}
            </div>

            {/* Floating Navigation Arrows */}
            <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
                <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    title="Scroll to Top"
                >
                    <ChevronUp className="h-5 w-5" />
                </Button>
                <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800"
                    onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                    title="Scroll to Bottom"
                >
                    <ChevronDown className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
