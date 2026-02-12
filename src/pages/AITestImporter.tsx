import React, { useState } from 'react';
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, FileText, Sparkles, ClipboardList, ArrowLeft, Check, ImageIcon, Download, Code, Eye, Plus, Calculator, CheckSquare } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// Type definitions matching backend response
interface Question {
    id: number;
    type: 'single' | 'multiple' | 'numerical' | string;
    question: string;
    image?: string | null;
    options?: { [key: string]: string } | null;
    optionImages?: { [key: string]: string | null };
    correctAnswer?: string | string[] | { min: number; max: number } | null;
    needsAnswer?: boolean; // Legacy support
    marks?: number;
    negativeMarks?: number;
    diagramPage?: number | null;
    passageContent?: string;
}

interface ParseResponse {
    title?: string;
    description?: string;
    revision_notes?: string;
    questions: Question[];
    canConfirm?: boolean;
    unansweredCount?: number;
    totalPages?: number;
    processedPages?: number;
}

type ProcessMode = 'extract' | 'generate';

export default function AITestImporter({ onImport }: { onImport?: (data: any) => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [mode, setMode] = useState<ProcessMode | null>(null);
    const [loading, setLoading] = useState(false);
    const [generatingMore, setGeneratingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<ParseResponse | null>(null);
    const [progress, setProgress] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setParsedData(null);
            setMode(null);
        }
    };

    // Helper to check if an option is correct based on question type
    const isCorrectAnswer = (q: Question, optionKey: string): boolean => {
        if (!q.correctAnswer) return false;

        if (q.type === 'multiple' && Array.isArray(q.correctAnswer)) {
            return q.correctAnswer.includes(optionKey);
        }

        return q.correctAnswer === optionKey;
    };

    // Helper to format correct answer display
    const formatCorrectAnswer = (q: Question): string => {
        if (!q.correctAnswer) return 'Not detected';

        if (q.type === 'multiple' && Array.isArray(q.correctAnswer)) {
            return q.correctAnswer.join(', ');
        }

        if (q.type === 'numerical' && typeof q.correctAnswer === 'object') {
            const range = q.correctAnswer as { min: number; max: number };
            if (range.min === range.max) {
                return range.min.toString();
            }
            return `${range.min} - ${range.max}`;
        }

        return String(q.correctAnswer);
    };

    const handleProcess = async (selectedMode: ProcessMode, isContinue: boolean = false) => {
        if (!file && !isContinue) {
            setError("Please select a file first.");
            return;
        }

        setMode(selectedMode);
        if (isContinue) {
            setGeneratingMore(true);
        } else {
            setLoading(true);
        }
        setError(null);

        const formData = new FormData();
        if (file) {
            formData.append("file", file);
        }

        // If continuing, send existing question IDs to avoid duplicates
        if (isContinue && parsedData) {
            const existingIds = parsedData.questions.map(q => q.id);
            formData.append("existing_ids", JSON.stringify(existingIds));
            formData.append("continue_mode", "true");
        }

        try {
            setProgress(isContinue
                ? 'AI is analyzing remaining content...'
                : (selectedMode === 'extract'
                    ? 'AI is reading your exam paper (processing in batches)...'
                    : 'AI is analyzing content & generating questions...')
            );

            const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
            const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

            const response = await fetch(`${baseUrl}/ai/parse?mode=${selectedMode}`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.detail || `Server error (${response.status}). Ensure backend is running.`);
            }

            const data: ParseResponse = await response.json();

            if (!data.questions || data.questions.length === 0) {
                throw new Error(isContinue
                    ? "No additional questions found in the remaining content."
                    : "AI returned 0 questions. Try a different file or mode."
                );
            }

            setProgress('');

            if (isContinue && parsedData) {
                // Append new questions to existing ones with adjusted IDs
                const maxId = Math.max(...parsedData.questions.map(q => q.id));
                const adjustedQuestions = data.questions.map((q, idx) => ({
                    ...q,
                    id: maxId + idx + 1
                }));

                setParsedData({
                    ...data,
                    questions: [...parsedData.questions, ...adjustedQuestions]
                });
            } else {
                setParsedData(data);
            }
        } catch (err: any) {
            console.error("Process Error:", err);
            setError(err.message || "An unknown error occurred");
            setProgress('');
        } finally {
            setLoading(false);
            setGeneratingMore(false);
        }
    };

    const handleDownloadJSON = () => {
        if (!parsedData) return;
        const jsonString = JSON.stringify(parsedData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `extracted_test_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImport = () => {
        console.log("[AITestImporter] handleImport called");
        console.log("[AITestImporter] parsedData:", parsedData);
        console.log("[AITestImporter] onImport exists:", !!onImport);
        
        if (!parsedData || !onImport) {
            console.error("[AITestImporter] Cannot import: parsedData or onImport is missing", { 
                hasParsedData: !!parsedData, 
                hasOnImport: !!onImport 
            });
            return;
        }

        // Clean and prepare extraction data for the builder
        const questions = parsedData.questions.map((q, index) => {
            console.log(`[AITestImporter] Processing question ${index + 1}:`, q);
            
            // Handle different question types
            let processedOptions: { [key: string]: { text: string; image: string | null } } = {};

            // Only process options for single/multiple choice questions
            if (q.type !== 'numerical' && q.options && typeof q.options === 'object') {
                Object.entries(q.options).forEach(([key, text]) => {
                    if (text && typeof text === 'object' && 'text' in text) {
                        // Already in nested format
                        processedOptions[key] = {
                            text: (text as any).text || '',
                            image: (text as any).image || null
                        };
                    } else {
                        // Flat format, convert to nested
                        processedOptions[key] = {
                            text: String(text || ''),
                            image: q.optionImages?.[key] || null
                        };
                    }
                });
            }

            const processedQuestion = {
                id: q.id || index + 1,
                type: q.type || 'single',
                question: q.question,
                questionText: q.question, // For compatibility
                options: processedOptions,
                correctAnswer: q.correctAnswer,
                image: q.image,
                marks: String(q.marks || 1),
                negativeMarks: String(q.negativeMarks || 0),
                explanation: "",
                passageContent: q.passageContent || "",
                typingMode: 'en' as const
            };
            
            console.log(`[AITestImporter] Processed question ${index + 1}:`, processedQuestion);
            return processedQuestion;
        });

        const importPayload: any = {
            questions: questions,
            duration: questions.length, // 1 minute per question as default
            marks_per_question: 1,
            negative_marks: 0,
        };

        if (parsedData.title) importPayload.title = parsedData.title;
        if (parsedData.description) importPayload.description = parsedData.description;
        if (parsedData.revision_notes) importPayload.revision_notes = parsedData.revision_notes;

        console.log("[AITestImporter] Final import payload:", importPayload);
        console.log("[AITestImporter] Calling onImport with payload...");
        onImport(importPayload);
        console.log("[AITestImporter] onImport called successfully");
    };

    // Helper component for markdown preview
    const MarkdownPreview = ({ content }: { content: string }) => (
        <div className="prose dark:prose-invert max-w-none text-sm">
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    p: ({ children }) => <span className="block mb-2 last:mb-0">{children}</span>
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );

    // Step 1: File Upload
    if (!file) {
        return (
            <div className="container mx-auto p-4 max-w-3xl">
                <SEO
                    title="AI Test Generator from PDF - TestoZa"
                    description="Generate tests from PDF documents using AI. Extract exact questions or generate new ones."
                    keywords={["ai test generator", "pdf to quiz", "exam maker ai"]}
                />
                <div className="text-center space-y-6 py-12">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                            Import from PDF
                        </h1>
                        <p className="text-muted-foreground">
                            Upload an exam paper or study material to create a test
                        </p>
                    </div>

                    <Card className="max-w-md mx-auto border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer">
                        <CardContent className="p-8">
                            <label className="cursor-pointer block space-y-4">
                                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                                    <FileText className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold">Choose PDF File</p>
                                    <p className="text-sm text-muted-foreground">Supports exam papers, textbooks, notes</p>
                                </div>
                                <Input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <Button variant="outline" className="pointer-events-none">
                                    Browse Files
                                </Button>
                            </label>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Step 2: Mode Selection (after file is selected, before processing)
    if (!loading && !generatingMore && !parsedData) {
        return (
            <div className="container mx-auto p-4 max-w-3xl">
                <SEO
                    title="AI Test Generator from PDF - TestoZa"
                    description="Generate tests from PDF documents using AI."
                    keywords={["ai test generator", "pdf to quiz"]}
                />

                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => { setFile(null); setError(null); }}>
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </Button>
                        <div>
                            <h2 className="text-lg font-semibold">{file.name}</h2>
                            <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                        </div>
                    </div>

                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-bold">How do you want to process this PDF?</h1>
                        <p className="text-muted-foreground">Choose a mode based on your goal</p>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        {/* Extract Mode */}
                        <Card
                            className="cursor-pointer border-2 hover:border-blue-500 hover:shadow-lg transition-all group"
                            onClick={() => handleProcess('extract')}
                        >
                            <CardContent className="p-6 text-center space-y-4">
                                <div className="w-14 h-14 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <ClipboardList className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Extract Questions</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Extract exact questions, options, and diagrams from the exam paper as-is
                                    </p>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                    Best for: Exam papers, question banks
                                </Badge>
                            </CardContent>
                        </Card>

                        {/* Generate Mode */}
                        <Card
                            className="cursor-pointer border-2 hover:border-purple-500 hover:shadow-lg transition-all group"
                            onClick={() => handleProcess('generate')}
                        >
                            <CardContent className="p-6 text-center space-y-4">
                                <div className="w-14 h-14 mx-auto rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Sparkles className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Generate New Questions</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        AI creates original questions based on the content and topics in the PDF
                                    </p>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                    Best for: Textbooks, notes, study material
                                </Badge>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    // Step 3: Loading state
    if (loading || generatingMore) {
        return (
            <div className="container mx-auto p-4 max-w-3xl">
                <div className="flex flex-col items-center justify-center py-20 space-y-6">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            {mode === 'extract'
                                ? <ClipboardList className="w-8 h-8 text-primary" />
                                : <Sparkles className="w-8 h-8 text-primary" />
                            }
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-semibold">
                            {generatingMore ? 'Generating More Questions...' : (mode === 'extract' ? 'Extracting Questions...' : 'Generating Questions...')}
                        </h2>
                        <p className="text-muted-foreground animate-pulse">{progress}</p>
                        <p className="text-xs text-muted-foreground/60">This may take a minute for larger documents (batch processing active)</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error Boundary Component
    class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
        constructor(props: any) {
            super(props);
            this.state = { hasError: false, error: null };
        }

        static getDerivedStateFromError(error: any) {
            return { hasError: true, error };
        }

        componentDidCatch(error: any, errorInfo: any) {
            console.error("Preview Error:", error, errorInfo);
        }

        render() {
            if (this.state.hasError) {
                return (
                    <div className="p-4 border border-red-500 bg-red-50 text-red-700 rounded-md">
                        <h3 className="font-bold">Something went wrong rendering the preview</h3>
                        <pre className="text-xs mt-2 overflow-auto max-h-40">{String(this.state.error)}</pre>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 border-red-200 hover:bg-red-100"
                            onClick={() => this.setState({ hasError: false })}
                        >
                            Try Again
                        </Button>
                    </div>
                );
            }

            return this.props.children;
        }
    }

    // Step 4: Preview & Import
    if (parsedData) {
        console.log("Rendering Preview for:", parsedData); // Debug log

        try {
            const questions = parsedData.questions || [];
            if (questions.length === 0) {
                return (
                    <div className="container mx-auto p-4 text-center">
                        <Alert variant="destructive" className="max-w-md mx-auto">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Extraction Failed</AlertTitle>
                            <AlertDescription>No questions could be found in the response.</AlertDescription>
                        </Alert>
                        <Button variant="outline" className="mt-4" onClick={() => { setParsedData(null); setMode(null); }}>
                            Try Again
                        </Button>
                    </div>
                );
            }

            // Count question types
            const singleCount = questions.filter(q => q.type === 'single' || !q.type).length;
            const multipleCount = questions.filter(q => q.type === 'multiple').length;
            const numericalCount = questions.filter(q => q.type === 'numerical').length;

            return (
                <div className="container mx-auto p-4 max-w-4xl">
                    <ErrorBoundary>
                        <div className="space-y-6 slide-in-from-bottom-5 animate-in duration-500">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg border shadow-sm sticky top-0 z-10">
                                <div>
                                    <h2 className="text-xl font-semibold">
                                        Preview — {questions.length} Questions
                                    </h2>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        <Badge variant={mode === 'extract' ? 'default' : 'secondary'}>
                                            {mode === 'extract' ? '📋 Extracted' : '✨ Generated'}
                                        </Badge>
                                        {singleCount > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                                {singleCount} Single Choice
                                            </Badge>
                                        )}
                                        {multipleCount > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                                {multipleCount} Multiple Choice
                                            </Badge>
                                        )}
                                        {numericalCount > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                                {numericalCount} Numerical
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleDownloadJSON}
                                        className="gap-2"
                                        title="Download raw JSON for debugging"
                                    >
                                        <Download className="w-4 h-4" />
                                        JSON
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => { setParsedData(null); setMode(null); }}
                                    >
                                        Try Again
                                    </Button>
                                    <Button
                                        onClick={handleImport}
                                        className="bg-green-600 hover:bg-green-700 font-bold gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        Import to Editor
                                    </Button>
                                </div>
                            </div>

                            {/* Title/Description if available */}
                            {(parsedData.title || parsedData.description) && (
                                <Card className="bg-muted/30">
                                    <CardContent className="p-4 space-y-1">
                                        {parsedData.title && (
                                            <p className="font-semibold text-lg">{parsedData.title}</p>
                                        )}
                                        {parsedData.description && (
                                            <p className="text-sm text-muted-foreground">{parsedData.description}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Questions List */}
                            <ScrollArea className="h-[600px] border rounded-md p-4 bg-muted/20">
                                {questions.map((q, idx) => (
                                    <Card key={idx} className="mb-4 hover:shadow-md transition-shadow">
                                        <CardContent className="p-4 space-y-4">
                                            <div className="flex gap-4">
                                                <div className="font-bold text-lg min-w-[30px] pt-1 text-primary">{q.id}.</div>
                                                <div className="flex-1 space-y-3">
                                                    {/* Question Type Badge */}
                                                    <div className="flex gap-2 items-center">
                                                        <Badge variant="secondary" className="text-xs">
                                                            {q.type === 'multiple' ? (
                                                                <><CheckSquare className="w-3 h-3 mr-1" /> Multiple Choice</>
                                                            ) : q.type === 'numerical' ? (
                                                                <><Calculator className="w-3 h-3 mr-1" /> Numerical</>
                                                            ) : (
                                                                <><Check className="w-3 h-3 mr-1" /> Single Choice</>
                                                            )}
                                                        </Badge>
                                                    </div>

                                                    {/* Question Content Toggle */}
                                                    <Tabs defaultValue="preview" className="w-full">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <label className="text-xs font-semibold uppercase text-muted-foreground">Question</label>
                                                            <TabsList className="h-6">
                                                                <TabsTrigger value="preview" className="text-xs px-2 h-5"><Eye className="w-3 h-3 mr-1" /> Preview</TabsTrigger>
                                                                <TabsTrigger value="raw" className="text-xs px-2 h-5"><Code className="w-3 h-3 mr-1" /> Raw</TabsTrigger>
                                                            </TabsList>
                                                        </div>
                                                        <TabsContent value="preview" className="mt-0 border rounded-md p-3 bg-card min-h-[60px]">
                                                            <ErrorBoundary>
                                                                <MarkdownPreview content={q.question || ""} />
                                                            </ErrorBoundary>
                                                        </TabsContent>
                                                        <TabsContent value="raw" className="mt-0">
                                                            <Textarea
                                                                defaultValue={q.question}
                                                                className="font-mono text-sm min-h-[80px]"
                                                                readOnly
                                                            />
                                                        </TabsContent>
                                                    </Tabs>

                                                    {/* Question Image */}
                                                    {q.image && (
                                                        <div className="mt-2 border rounded-lg p-2 bg-white dark:bg-gray-900 inline-block shadow-sm">
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                                                <ImageIcon className="w-3 h-3" /> Diagram {q.diagramPage ? `(Page ${q.diagramPage})` : ''}
                                                            </div>
                                                            <img src={q.image} alt="Question Diagram" className="max-h-60 object-contain" />
                                                        </div>
                                                    )}

                                                    {/* Passage Content for Comprehension */}
                                                    {q.passageContent && (
                                                        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                                                            <label className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">Passage</label>
                                                            <div className="text-sm mt-1 text-blue-800 dark:text-blue-200">
                                                                <MarkdownPreview content={q.passageContent} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Options - Only show for single/multiple choice */}
                                            {q.type !== 'numerical' && q.options && Object.keys(q.options).length > 0 && (
                                                <div className="space-y-2 ml-10 mt-2">
                                                    <label className="text-xs font-semibold uppercase text-muted-foreground">Options</label>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {Object.entries(q.options).map(([key, text]) => (
                                                            <div key={key} className={`flex gap-3 items-start border p-3 rounded-md bg-card group transition-colors ${isCorrectAnswer(q, key) ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'hover:border-primary/50'}`}>
                                                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm shrink-0 ${isCorrectAnswer(q, key) ? 'bg-green-100 border-green-600 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'}`}>
                                                                    {q.type === 'multiple' ? (
                                                                        isCorrectAnswer(q, key) ? <CheckSquare className="w-4 h-4" /> : <div className="w-4 h-4 border-2 border-gray-400 rounded" />
                                                                    ) : (
                                                                        key
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="text-sm pt-1">
                                                                        {text ? (
                                                                            <ErrorBoundary>
                                                                                <MarkdownPreview content={String(text)} />
                                                                            </ErrorBoundary>
                                                                        ) : <span className="text-muted-foreground italic">Empty</span>}
                                                                    </div>
                                                                    {q.optionImages?.[key] && (
                                                                        <div className="border rounded bg-white dark:bg-gray-900 p-1">
                                                                            <img src={q.optionImages[key]!} alt={`Option ${key}`} className="h-24 object-contain" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {isCorrectAnswer(q, key) && (
                                                                    <Check className="w-5 h-5 text-green-600 shrink-0" />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Numerical Answer Display */}
                                            {q.type === 'numerical' && (
                                                <div className="ml-10 mt-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
                                                    <label className="text-xs font-semibold uppercase text-purple-600 dark:text-purple-400">Correct Answer (Numerical)</label>
                                                    <div className="text-lg font-mono mt-1 text-purple-800 dark:text-purple-200">
                                                        {formatCorrectAnswer(q)}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Unanswered Warning */}
                                            {!q.correctAnswer && (
                                                <div className="ml-10">
                                                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                                                        ⚠ Correct answer not detected — set it in the editor
                                                    </Badge>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </ScrollArea>

                            {/* Generate More Questions Button */}
                            {file && mode && (
                                <Card className="mt-4 border-dashed border-2 border-primary/30">
                                    <CardContent className="p-4">
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div>
                                                <h3 className="font-semibold text-lg">Need more questions?</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    AI will analyze the remaining content in your document
                                                </p>
                                            </div>
                                            <Button
                                                onClick={() => handleProcess(mode, true)}
                                                disabled={generatingMore}
                                                variant="outline"
                                                className="gap-2 min-w-[200px]"
                                            >
                                                {generatingMore ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                                                ) : (
                                                    <><Plus className="w-4 h-4" /> Generate More Questions</>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </ErrorBoundary>
                </div>
            );
        } catch (err) {
            console.error("Critical Rendering Error:", err);
            return (
                <div className="container mx-auto p-4 max-w-3xl text-center">
                    <Alert variant="destructive">
                        <AlertTitle>Rendering Error</AlertTitle>
                        <AlertDescription>
                            Failed to display questions: {String(err)}
                        </AlertDescription>
                    </Alert>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => { setParsedData(null); setMode(null); }}
                    >
                        Try Again
                    </Button>
                </div>
            );
        }
    }

    return null;
}
