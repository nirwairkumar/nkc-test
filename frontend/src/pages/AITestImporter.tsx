import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchFeatureFlags, FeatureFlags } from '@/lib/featuresApi';
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, FileText, Sparkles, ClipboardList, ArrowLeft, Check, ImageIcon, Download, Code, Eye, Plus, Calculator, CheckSquare, Camera, X, FileImage, Key, Zap, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProcessingProgress } from "@/components/ProcessingProgress";

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
    options?: { [key: string]: string | { text: string; image?: string | null } } | null;
    optionImages?: { [key: string]: string | null };
    correctAnswer?: string | string[] | { min: number; max: number } | null;
    needsAnswer?: boolean;
    marks?: number;
    negativeMarks?: number;
    diagramPage?: number | null;
    passageContent?: string;
    page?: number;
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
type FileType = 'pdf' | 'image';
type UploadType = 'document' | 'image' | null;

interface SelectedFile {
    file: File;
    id: string;
    type: FileType;
    preview?: string;
}


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
                    <button
                        className="mt-2 text-sm underline text-red-600 hover:text-red-800"
                        onClick={() => this.setState({ hasError: false })}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default function AITestImporter({ onImport }: { onImport?: (data: any) => void }) {
    const navigate = useNavigate();

    const [files, setFiles] = useState<SelectedFile[]>([]);
    const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
    const [mode, setMode] = useState<ProcessMode | null>(null);
    const [loading, setLoading] = useState(false);
    const [generatingMore, setGeneratingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<ParseResponse | null>(null);
    const [progress, setProgress] = useState('');
    const [showCamera, setShowCamera] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [uploadType, setUploadType] = useState<UploadType>(null);
    const [extractionMeta, setExtractionMeta] = useState<{ quality_tier?: string, dpi?: number, warning?: boolean } | null>(null);
    const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);

    // Fetch feature flags
    useEffect(() => {
        fetchFeatureFlags().then(data => setFeatureFlags(data));
    }, []);

    // ULTRA-FAST Streaming State
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamProgress, setStreamProgress] = useState<{
        stage: 'uploading' | 'analyzing' | 'processing' | 'extracting' | 'finalizing' | 'complete' | 'error';
        percent: number;
        message: string;
        data?: any;
    } | null>(null);
    const [streamingQuestions, setStreamingQuestions] = useState<Question[]>([]);
    const [abortController, setAbortController] = useState<AbortController | null>(null);

    const documentInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const answerKeyInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const generateId = () => Math.random().toString(36).substring(2, 9);

    const getFileType = (filename: string): FileType => {
        const ext = filename.toLowerCase();
        if (ext.endsWith('.pdf')) return 'pdf';
        return 'image';
    };

    const createPreview = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(file);
            } else {
                resolve('');
            }
        });
    };

    const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;

        const newFiles: SelectedFile[] = [];
        for (const file of selectedFiles) {
            const preview = await createPreview(file);
            newFiles.push({
                file,
                id: generateId(),
                type: getFileType(file.name),
                preview
            });
        }

        setFiles(newFiles); // Documents replace existing files
        setUploadType('document');
        setError(null);
        setParsedData(null);
        setMode(null);
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;

        const newFiles: SelectedFile[] = [];
        for (const file of selectedFiles) {
            const preview = await createPreview(file);
            newFiles.push({
                file,
                id: generateId(),
                type: 'image',
                preview
            });
        }

        setFiles(prev => [...prev, ...newFiles]); // Images are additive
        setUploadType('image');
        setError(null);
        setParsedData(null);
        setMode(null);
    };

    const handleAnswerKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAnswerKeyFile(e.target.files[0]);
            setError(null);
        }
    };

    const removeFile = (id: string) => {
        setFiles(prev => {
            const newFiles = prev.filter(f => f.id !== id);
            if (newFiles.length === 0) {
                setUploadType(null);
            }
            return newFiles;
        });
        setParsedData(null);
        setMode(null);
    };

    const clearAllFiles = () => {
        setFiles([]);
        setAnswerKeyFile(null);
        setUploadType(null);
        setError(null);
        setParsedData(null);
        setMode(null);
        // Reset streaming state
        setIsStreaming(false);
        setStreamProgress(null);
        setStreamingQuestions([]);
        setExtractionMeta(null);
        if (abortController) {
            abortController.abort();
            setAbortController(null);
        }
    };

    // Fix: Use useEffect to attach stream once videoRef is available in the DOM
    useEffect(() => {
        if (showCamera && cameraStream && videoRef.current) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [showCamera, cameraStream]);

    const openCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            setCameraStream(stream);
            setShowCamera(true);
            setUploadType('image'); // Ensure we enter the image workflow
            setError(null);
        } catch (err) {
            setError("Could not access camera. Please ensure you have granted camera permissions.");
        }
    };

    const closeCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setShowCamera(false);
    };

    const captureImage = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            setFiles(prev => [...prev, {
                                file,
                                id: generateId(),
                                type: 'image',
                                preview: e.target?.result as string
                            }]);
                            setUploadType('image');
                        };
                        reader.readAsDataURL(file);
                    }
                }, 'image/jpeg', 0.9);
            }
        }
        closeCamera();
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
        if (featureFlags && featureFlags.enable_ai_test_generation === false) {
            setError(featureFlags.ai_test_generation_notes || "This feature is currently disabled.");
            return;
        }

        if (files.length === 0 && !isContinue) {
            setError("Please select at least one file first.");
            return;
        }

        setMode(selectedMode);
        if (isContinue) {
            setGeneratingMore(true);
        } else {
            setLoading(true);
        }
        setError(null);
        setProgress('');

        // ULTRA-FAST: Use SSE streaming for new uploads (not for continue mode)
        if (!isContinue) {
            await handleStreamProcess(selectedMode);
        } else {
            // Fall back to old method for "generate more" mode
            await handleLegacyProcess(selectedMode, isContinue);
        }
    };

    // ULTRA-FAST SSE Streaming Process
    const handleStreamProcess = async (selectedMode: ProcessMode) => {
        setIsStreaming(true);
        setStreamingQuestions([]);
        setStreamProgress(null);

        const formData = new FormData();

        // Add all files
        files.forEach((fileObj) => {
            formData.append('files', fileObj.file);
        });

        // Add answer key if provided
        if (answerKeyFile) {
            formData.append('answer_key', answerKeyFile);
        }

        const abortCtrl = new AbortController();
        setAbortController(abortCtrl);

        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
            const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

            // Use ULTRA-FAST streaming endpoint
            const response = await fetch(`${baseUrl}/ai/parse-stream?mode=${selectedMode}`, {
                method: 'POST',
                body: formData,
                signal: abortCtrl.signal,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.detail || `Server error (${response.status})`);
            }

            if (!response.body) {
                throw new Error('No response body received');
            }

            // Read the stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];

                    // Parse SSE events
                    if (line.startsWith('event: ')) {
                        const eventType = line.slice(7).trim();
                        const dataLine = lines[i + 1];

                        if (dataLine && dataLine.startsWith('data: ')) {
                            const data = JSON.parse(dataLine.slice(6));

                            switch (eventType) {
                                case 'progress':
                                    setStreamProgress({
                                        stage: data.stage,
                                        percent: data.percent,
                                        message: data.message,
                                        data: data.data
                                    });
                                    if (data.data && data.data.quality_tier) {
                                        setExtractionMeta({
                                            quality_tier: data.data.quality_tier,
                                            dpi: data.data.dpi,
                                            warning: data.data.warning
                                        });
                                    }
                                    break;

                                case 'question':
                                    setStreamingQuestions(prev => [...prev, data.question]);
                                    break;

                                case 'complete':
                                    if (!data.questions || data.questions.length === 0) {
                                        throw new Error('AI returned 0 questions. Please adjust your file or prompt.');
                                    }
                                    setParsedData(data);
                                    setIsStreaming(false);
                                    setLoading(false);
                                    setStreamProgress(null);
                                    setAbortController(null);
                                    return;

                                case 'error':
                                    throw new Error(data.message);
                            }
                        }
                    }
                }
            }

        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('Processing cancelled by user');
            } else {
                console.error('Stream Error:', err);
                setError(err.message || 'An error occurred during processing');
            }
            setIsStreaming(false);
            setLoading(false);
            setAbortController(null);
        }
    };

    // Legacy non-streaming process (for "generate more" mode)
    const handleLegacyProcess = async (selectedMode: ProcessMode, isContinue: boolean) => {
        const formData = new FormData();

        files.forEach((fileObj) => {
            formData.append('files', fileObj.file);
        });

        if (answerKeyFile) {
            formData.append('answer_key', answerKeyFile);
        }

        if (isContinue && parsedData) {
            const existingIds = parsedData.questions.map(q => q.id);
            formData.append('existing_ids', JSON.stringify(existingIds));
            formData.append('continue_mode', 'true');
        }

        try {
            setProgress(isContinue
                ? 'AI is analyzing remaining content...'
                : (selectedMode === 'extract'
                    ? 'AI is reading your exam paper...'
                    : 'AI is analyzing content & generating questions...')
            );

            const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
            const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

            const response = await fetch(`${baseUrl}/ai/parse?mode=${selectedMode}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.detail || `Server error (${response.status})`);
            }

            const data: ParseResponse = await response.json();

            if (!data.questions || data.questions.length === 0) {
                throw new Error(isContinue
                    ? 'No additional questions found in the remaining content.'
                    : 'AI returned 0 questions. Try a different file or mode.'
                );
            }

            setProgress('');

            if (isContinue && parsedData) {
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
            console.error('Process Error:', err);
            setError(err.message || 'An unknown error occurred');
            setProgress('');
        } finally {
            setLoading(false);
            setGeneratingMore(false);
        }
    };

    // Cancel ongoing stream
    const handleCancelStream = () => {
        if (abortController) {
            abortController.abort();
            setIsStreaming(false);
            setLoading(false);
            setStreamProgress(null);
            setAbortController(null);
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
        if (!parsedData || !onImport) return;

        const questions = parsedData.questions.map((q, index) => {
            let processedOptions: { [key: string]: { text: string; image: string | null } } = {};

            if (q.type !== 'numerical' && q.options && typeof q.options === 'object') {
                Object.entries(q.options).forEach(([key, val]) => {
                    const optionVal = val as any;
                    if (optionVal && typeof optionVal === 'object' && 'text' in optionVal) {
                        processedOptions[key] = {
                            text: optionVal.text || '',
                            image: optionVal.image || null
                        };
                    } else {
                        processedOptions[key] = {
                            text: String(val || ''),
                            image: q.optionImages?.[key] || null
                        };
                    }
                });
            }

            return {
                id: q.id || index + 1,
                type: q.type || 'single',
                question: q.question,
                questionText: q.question,
                options: processedOptions,
                correctAnswer: q.correctAnswer,
                image: q.image,
                marks: String(q.marks || 1),
                negativeMarks: String(q.negativeMarks || 0),
                explanation: "",
                passageContent: q.passageContent || "",
                typingMode: 'en' as const
            };
        });

        const importPayload: any = {
            questions: questions,
            duration: questions.length,
            marks_per_question: 1,
            negative_marks: 0,
        };

        if (parsedData.title) importPayload.title = parsedData.title;
        if (parsedData.description) importPayload.description = parsedData.description;
        if (parsedData.revision_notes) importPayload.revision_notes = parsedData.revision_notes;

        onImport(importPayload);
    };

    // Auto-navigate to Test Editor upon successful test generation (Step 7)
    useEffect(() => {
        if (parsedData && parsedData.questions && parsedData.questions.length > 0) {
            const timer = setTimeout(() => {
                handleImport();
            }, 500); // Small delay to let user realize success before redirecting
            return () => clearTimeout(timer);
        }
    }, [parsedData, onImport]);

    if (featureFlags && featureFlags.enable_ai_test_generation === false) {
        return (
            <div className="container mx-auto p-4 max-w-4xl flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md w-full shadow-lg border-2 border-red-100 dark:border-red-900/30">
                    <CardHeader className="text-center space-y-2">
                        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Feature Disabled</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-6">
                        <p className="text-muted-foreground text-lg">
                            {featureFlags.ai_test_generation_notes || "AI Test Generation is currently disabled by the administrator."}
                        </p>
                        <Button 
                            size="lg" 
                            className="w-full"
                            onClick={() => navigate('/create-test')}
                        >
                            Create Test Manually
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Step 1: File Upload - Separate sections for Documents and Images
    if (files.length === 0 && !uploadType) {
        return (
            <div className="container mx-auto p-4 max-w-4xl">
                <SEO
                    title="AI Test Generator - TestoZa"
                    description="Generate tests from PDF documents and images using AI. Extract exact questions or generate new ones."
                    keywords={["ai test generator", "pdf to quiz", "image to quiz", "exam maker ai"]}
                />
                <div className="text-center space-y-6 py-12">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                            Import Test Questions
                        </h1>
                        <p className="text-muted-foreground">
                            Upload exam papers, question images, or study material to create a test
                        </p>
                    </div>

                    {/* Two separate upload sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                        {/* Document Upload Section */}
                        <Card className="border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer group">
                            <CardContent className="p-8">
                                <div className="space-y-4">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">Upload Document</p>
                                        <p className="text-sm text-muted-foreground">PDF, DOC, PPT files</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground">
                                            Best for exam papers, textbooks, notes
                                        </p>
                                        <Button
                                            variant="outline"
                                            onClick={() => documentInputRef.current?.click()}
                                            className="gap-2 w-full"
                                        >
                                            <FileText className="w-4 h-4" />
                                            Choose Document
                                        </Button>
                                    </div>
                                    <Input
                                        ref={documentInputRef}
                                        type="file"
                                        accept=".pdf,.doc,.docx,.ppt,.pptx"
                                        onChange={handleDocumentChange}
                                        className="hidden"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Images Upload Section */}
                        <Card
                            className="border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer group"
                            onClick={() => {
                                setUploadType('image');
                                setError(null);
                            }}
                        >
                            <CardContent className="p-8">
                                <div className="space-y-4">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <FileImage className="w-8 h-8 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">Upload Images</p>
                                        <p className="text-sm text-muted-foreground">JPG, PNG, WEBP</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground">
                                            Best for question photos, screenshots
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    imageInputRef.current?.click();
                                                }}
                                                className="gap-2 flex-1"
                                            >
                                                <ImageIcon className="w-4 h-4" />
                                                Browse
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openCamera();
                                                }}
                                                className="gap-2 flex-1"
                                            >
                                                <Camera className="w-4 h-4" />
                                                Camera
                                            </Button>
                                        </div>
                                    </div>
                                    <Input
                                        ref={imageInputRef}
                                        type="file"
                                        accept=".png,.jpg,.jpeg,.webp"
                                        multiple
                                        onChange={handleImageChange}
                                        className="hidden"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="max-w-2xl mx-auto bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                        <p className="font-medium mb-2">💡 Tips:</p>
                        <ul className="space-y-1 text-left list-disc list-inside">
                            <li>Use <strong>Documents</strong> for full exam papers, PDFs, or presentations</li>
                            <li>Use <strong>Images</strong> for question photos, screenshots, or individual question images</li>
                            <li>You can select multiple images at once</li>
                            <li>Add an answer key to help AI match correct answers automatically</li>
                        </ul>
                    </div>
                </div>

                {/* Camera Dialog */}
                <Dialog open={showCamera} onOpenChange={setShowCamera}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Capture Image</DialogTitle>
                            <DialogDescription>
                                Position your document in the camera view and click capture
                            </DialogDescription>
                        </DialogHeader>
                        <div className="relative">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full rounded-lg"
                            />
                            <canvas ref={canvasRef} className="hidden" />
                        </div>
                        <div className="flex justify-center gap-2">
                            <Button variant="outline" onClick={closeCamera}>
                                Cancel
                            </Button>
                            <Button onClick={captureImage} className="gap-2">
                                <Camera className="w-4 h-4" />
                                Capture
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // Step 2: Mode Selection (after files are selected, before processing)
    if (!loading && !generatingMore && !parsedData) {
        const hasPDF = files.some(f => f.type === 'pdf');
        const hasImages = files.some(f => f.type === 'image');

        return (
            <div className="container mx-auto p-4 max-w-4xl">
                <SEO
                    title="AI Test Generator - TestoZa"
                    description="Generate tests from PDF documents and images using AI."
                    keywords={["ai test generator", "pdf to quiz", "image to quiz"]}
                />

                <div className="space-y-6">
                    {/* Files Preview */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => {
                                            if (files.length === 0 || confirm("Going back will clear your selection. Continue?")) {
                                                clearAllFiles();
                                            }
                                        }}
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </Button>
                                    <span>
                                        {uploadType === 'document' ? 'Document' : 'Images'}
                                        {' '}({files.length} {files.length === 1 ? 'file' : 'files'})
                                    </span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={clearAllFiles} className="text-muted-foreground hover:text-destructive">
                                    <X className="w-4 h-4 mr-1" /> Clear All
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {files.map((fileObj) => (
                                    <div key={fileObj.id} className="relative group">
                                        {fileObj.preview ? (
                                            <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                                                <img
                                                    src={fileObj.preview}
                                                    alt={fileObj.file.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="aspect-square rounded-lg border bg-muted flex flex-col items-center justify-center p-2">
                                                <FileText className="w-8 h-8 text-muted-foreground mb-1" />
                                                <span className="text-xs text-center truncate w-full">{fileObj.file.name}</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => removeFile(fileObj.id)}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}

                                {/* Add More Button - only for images */}
                                {uploadType === 'image' && (
                                    <>
                                        <button
                                            onClick={() => imageInputRef.current?.click()}
                                            className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 flex flex-col items-center justify-center gap-2 transition-colors"
                                        >
                                            <Plus className="w-6 h-6 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">Add Image</span>
                                        </button>
                                        <button
                                            onClick={openCamera}
                                            className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 flex flex-col items-center justify-center gap-2 transition-colors"
                                        >
                                            <Camera className="w-6 h-6 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">Camera</span>
                                        </button>
                                    </>
                                )}
                            </div>



                            <Input
                                ref={imageInputRef}
                                type="file"
                                accept=".png,.jpg,.jpeg,.webp"
                                multiple
                                onChange={handleImageChange}
                                className="hidden"
                            />
                        </CardContent>
                    </Card>

                    {/* Answer Key Upload - Show for both document and image uploads */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Key className="w-5 h-5" />
                                Answer Key (Optional)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {answerKeyFile ? (
                                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Key className="w-5 h-5 text-primary" />
                                        <div>
                                            <p className="font-medium">{answerKeyFile.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                AI will use this to match correct answers with questions
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setAnswerKeyFile(null)}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div
                                    className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 rounded-lg p-6 text-center cursor-pointer transition-colors"
                                    onClick={() => answerKeyInputRef.current?.click()}
                                >
                                    <Key className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="font-medium">Upload Answer Key</p>
                                    <p className="text-sm text-muted-foreground">
                                        Helps AI accurately match correct answers (PDF or Image)
                                    </p>
                                    <Input
                                        ref={answerKeyInputRef}
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        onChange={handleAnswerKeyChange}
                                        className="hidden"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {featureFlags && featureFlags.enable_ai_test_generation === false ? (
                        <div className="mt-8 py-10 flex flex-col items-center justify-center space-y-4 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                            <Sparkles className="w-10 h-10 text-slate-400 mb-2 opacity-50" />
                            <h3 className="text-xl font-bold">AI Processing Temporarily Disabled</h3>
                            <p className="text-muted-foreground max-w-lg text-sm">
                                {featureFlags.ai_test_generation_notes || "This feature is currently disabled by administrators. Please check back later."}
                            </p>
                            <div className="flex gap-4 mt-4">
                                <Button onClick={() => window.location.href = '/create-test'} variant="default">
                                    Create Manually
                                </Button>
                                <Button onClick={() => window.location.href = '/create-test'} variant="outline">
                                    Import JSON
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="text-center space-y-2 mt-8">
                                <h1 className="text-2xl font-bold">How do you want to process {hasImages && hasPDF ? 'these files' : 'this file'}?</h1>
                                <p className="text-muted-foreground">Choose a mode based on your goal</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mt-4">
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
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            <Badge variant="secondary" className="text-xs">
                                                Best for: Exam papers, question banks
                                            </Badge>
                                            <Badge className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                                                <Zap className="w-3 h-3 mr-1" />
                                                ULTRA-FAST
                                            </Badge>
                                        </div>
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
                                                AI creates original questions based on the content and topics in the document
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            <Badge variant="secondary" className="text-xs">
                                                Best for: Textbooks, notes, study material
                                            </Badge>
                                            <Badge className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                                                <Zap className="w-3 h-3 mr-1" />
                                                ULTRA-FAST
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Step 3: Loading state - ULTRA-FAST Streaming with Progress
    if (loading || generatingMore) {
        // Show ULTRA-FAST streaming UI for new uploads
        if (isStreaming && streamProgress) {
            return (
                <div className="container mx-auto p-4 max-w-4xl space-y-8">
                    {/* Progress Component */}
                    <ProcessingProgress
                        stage={streamProgress.stage}
                        percent={streamProgress.percent}
                        message={streamProgress.message}
                        data={streamProgress.data}
                    />

                    {/* Progressive Question Display */}
                    {streamingQuestions.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold">
                                        Questions Found
                                    </h3>
                                    <Badge variant="default" className="bg-green-600">
                                        {streamingQuestions.length}
                                    </Badge>
                                </div>
                                {streamProgress.stage !== 'complete' && (
                                    <span className="text-sm text-muted-foreground animate-pulse flex items-center gap-1">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        More coming...
                                    </span>
                                )}
                            </div>

                            <ScrollArea className="h-[400px] border rounded-lg p-4 bg-muted/20">
                                <div className="space-y-3">
                                    {streamingQuestions.map((q, idx) => (
                                        <Card
                                            key={idx}
                                            className="border-l-4 border-l-primary/50 hover:border-l-primary transition-all duration-300 animate-in slide-in-from-left-2"
                                            style={{ animationDelay: `${idx * 50}ms` }}
                                        >
                                            <CardContent className="p-3">
                                                <div className="flex gap-3">
                                                    <span className="font-bold text-primary min-w-[28px] text-sm">
                                                        {q.id}.
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm line-clamp-2 text-foreground">
                                                            {q.question || 'No question text'}
                                                        </p>
                                                        {q.options && Object.keys(q.options).length > 0 && (
                                                            <div className="flex gap-2 mt-2 flex-wrap">
                                                                {Object.entries(q.options).slice(0, 4).map(([key, value]) => (
                                                                    <span
                                                                        key={key}
                                                                        className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded"
                                                                    >
                                                                        {key}: {typeof value === 'string' ? value.slice(0, 20) : '...'}
                                                                        {typeof value === 'string' && value.length > 20 ? '...' : ''}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Badge variant="outline" className="text-xs shrink-0">
                                                        {q.type || 'single'}
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>

                            {/* Actions Area */}
                            <div className="flex flex-col items-center mt-6 w-full">
                                {streamProgress.stage === 'complete' ? (
                                    <div className="w-full mt-4 border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            Review complete? Send these questions to the editor to finalize.
                                        </div>
                                        <Button
                                            onClick={() => onImport && onImport({ questions: streamingQuestions })}
                                            size="lg"
                                            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md text-white font-medium px-8 w-full md:w-auto"
                                        >
                                            <Sparkles className="w-5 h-5 text-amber-300" />
                                            Continue to Test Builder
                                            <ArrowLeft className="w-5 h-5 ml-1 rotate-180" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCancelStream}
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        <X className="w-4 h-4 mr-1" />
                                        Cancel Processing
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Legacy loading UI for "generate more" mode
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

                        {extractionMeta && (
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <Badge variant={extractionMeta.warning ? "destructive" : "secondary"} className="text-xs">
                                    Quality: {extractionMeta.quality_tier?.toUpperCase()} ({extractionMeta.dpi} DPI)
                                </Badge>
                                {extractionMeta.warning && (
                                    <span className="text-xs text-destructive">Low quality may affect accuracy</span>
                                )}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground/60 mt-2">Processing...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Step 4: Preview & Import
    if (parsedData) {
        try {
            const questions = parsedData.questions || [];
            if (questions.length === 0) {
                return (
                    <div className="container mx-auto p-4 text-center">
                        <Alert variant="destructive" className="max-w-md mx-auto text-left">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Extraction Failed</AlertTitle>
                            <AlertDescription className="mt-2 space-y-2">
                                <p>No extractable questions could be found.</p>
                                {error && (
                                    <div className="bg-destructive/10 p-2 rounded text-xs mt-2 overflow-auto max-h-32">
                                        <p className="font-semibold mb-1">Details:</p>
                                        <p className="whitespace-pre-wrap">{error}</p>
                                    </div>
                                )}
                            </AlertDescription>
                        </Alert>
                        <div className="flex gap-2 justify-center mt-4">
                            <Button variant="outline" onClick={() => { setParsedData(null); setMode(null); }}>
                                Try Another Document
                            </Button>
                            {mode === 'extract' && (
                                <Button variant="secondary" onClick={() => handleProcess('generate')}>
                                    Try Generate Mode Instead
                                </Button>
                            )}
                        </div>
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
                                        {extractionMeta && (
                                            <Badge variant={extractionMeta.warning ? "secondary" : "secondary"} className="text-xs bg-slate-100 dark:bg-slate-800">
                                                🖥️ {extractionMeta.dpi} DPI ({extractionMeta.quality_tier})
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
                                        <CardContent className="p-4 sm:p-6 space-y-4">
                                            {/* Question Diagram if present */}
                                            {q.image && (
                                                <div className="mb-4 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-md border text-center">
                                                    <span className="text-xs text-muted-foreground block mb-2">Diagram Extracted</span>
                                                    <img src={q.image} alt="Question Diagram" className="max-h-48 mx-auto object-contain rounded" />
                                                </div>
                                            )}

                                            <div className="flex gap-4">
                                                <div className="font-bold text-lg min-w-[30px] pt-1 text-primary">{q.id}.</div>
                                                <div className="flex-1 space-y-3">
                                                    {/* Question Type Badge & Page */}
                                                    <div className="flex gap-2 items-center flex-wrap">
                                                        <Badge variant="secondary" className="text-xs">
                                                            {q.type === 'multiple' ? (
                                                                <><CheckSquare className="w-3 h-3 mr-1" /> Multiple Choice</>
                                                            ) : q.type === 'numerical' ? (
                                                                <><Calculator className="w-3 h-3 mr-1" /> Numerical</>
                                                            ) : (
                                                                <><Check className="w-3 h-3 mr-1" /> Single Choice</>
                                                            )}
                                                        </Badge>
                                                        {q.page && (
                                                            <Badge variant="outline" className="text-xs">
                                                                Page {q.page}
                                                            </Badge>
                                                        )}
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
                                                                        {(() => {
                                                                            const displayValue = typeof text === 'object' && text !== null ? (text as any).text : text;
                                                                            return displayValue ? (
                                                                                <ErrorBoundary>
                                                                                    <MarkdownPreview content={String(displayValue)} />
                                                                                </ErrorBoundary>
                                                                            ) : <span className="text-muted-foreground italic">Empty</span>;
                                                                        })()}
                                                                    </div>
                                                                    {(q.optionImages?.[key] || (typeof text === 'object' && text !== null && (text as any).image)) && (
                                                                        <div className="border rounded bg-white dark:bg-gray-900 p-1">
                                                                            <img
                                                                                src={(q.optionImages?.[key] || (text as any).image)!}
                                                                                alt={`Option ${key}`}
                                                                                className="h-24 object-contain"
                                                                            />
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
                            {files.length > 0 && mode && (
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

                            {/* Proceed to test builder button */}
                            <div className="mt-8 mb-4 border-t pt-8 flex items-center justify-between">
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    Review complete? Send these questions to the editor to finalize.
                                </div>
                                <Button
                                    onClick={() => onImport && onImport(parsedData)}
                                    size="lg"
                                    className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md text-white font-medium px-8"
                                >
                                    <Sparkles className="w-5 h-5 text-amber-300" />
                                    Continue to Test Builder
                                    <ArrowLeft className="w-5 h-5 ml-1 rotate-180" />
                                </Button>
                            </div>
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
