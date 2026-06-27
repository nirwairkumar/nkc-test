import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchFeatureFlags, FeatureFlags } from '@/lib/featuresApi';
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, FileText, Sparkles, ClipboardList, ArrowLeft, Check, ImageIcon, Download, Code, Eye, Plus, Calculator, CheckSquare, Camera, X, FileImage, Key, Zap, CheckCircle2, MoreVertical, PenLine } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProcessingProgress } from "@/components/ProcessingProgress";
import ManualEditorShowcase from "@/components/landing/ManualEditorShowcase";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface Section {
    id?: string;
    name?: string;
    attempt_control?: {
        enabled: boolean;
        mode?: string;
        max_attempts?: number;
    };
    questions?: Question[];
    marks_per_question?: number;
    negative_marks?: number;
    question_type?: string;
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
    enable_section_mode?: boolean;
    sections?: Section[];
    duration?: number;
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


import LatexRenderer from '@/components/ui/LatexRenderer';

// Helper component for markdown preview
const MarkdownPreview = ({ content }: { content: string }) => (
    <LatexRenderer className="text-sm">{content}</LatexRenderer>
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
    const { user } = useAuth();

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

    const [savingTest, setSavingTest] = useState(false);
    const [pendingParsedData, setPendingParsedData] = useState<ParseResponse | null>(null);
    const [timers, setTimers] = useState<{
        uploading: number;
        analyzing: number;
        extracting: number;
        finalizing: number;
    }>({ uploading: 0, analyzing: 0, extracting: 0, finalizing: 0 });

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

    // Fetch feature flags
    useEffect(() => {
        fetchFeatureFlags().then(data => setFeatureFlags(data));
    }, []);

    // Track active stage timers
    useEffect(() => {
        if (!isStreaming) return;

        const interval = setInterval(() => {
            const currentStage = streamProgress?.stage || 'uploading';
            let stageKey: 'uploading' | 'analyzing' | 'extracting' | 'finalizing' = 'uploading';

            if (currentStage === 'analyzing') {
                stageKey = 'analyzing';
            } else if (currentStage === 'processing' || currentStage === 'extracting') {
                stageKey = 'extracting';
            } else if (currentStage === 'finalizing' || currentStage === 'complete') {
                stageKey = 'finalizing';
            }

            setTimers(prev => ({
                ...prev,
                [stageKey]: Math.round((prev[stageKey] + 0.1) * 10) / 10
            }));
        }, 100);

        return () => clearInterval(interval);
    }, [isStreaming, streamProgress?.stage]);

    // Handle smooth transition from stream completion to preview stage
    useEffect(() => {
        if (pendingParsedData && streamProgress?.stage === 'complete') {
            const timer = setTimeout(() => {
                setParsedData(pendingParsedData);
                setPendingParsedData(null);
                setIsStreaming(false);
                setLoading(false);
                setStreamProgress(null);
                setAbortController(null);
            }, 1500); // 1.5s delay to review checkmarks/timers
            return () => clearTimeout(timer);
        }
    }, [pendingParsedData, streamProgress?.stage]);

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
        setTimers({ uploading: 0, analyzing: 0, extracting: 0, finalizing: 0 });
        
        // Initialize streamProgress with placeholder so we immediately enter the streaming UI
        setStreamProgress({
            stage: 'uploading',
            percent: 5,
            message: 'Uploading document to server...'
        });

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
            let currentEvent = '';
            let currentData = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) {
                        // Empty line means event completion: dispatch the collected payload
                        if (currentEvent && currentData) {
                            try {
                                const parsed = JSON.parse(currentData);

                                switch (currentEvent) {
                                    case 'progress':
                                        setStreamProgress({
                                            stage: parsed.stage,
                                            percent: parsed.percent,
                                            message: parsed.message,
                                            data: parsed.data
                                        });
                                        if (parsed.data && parsed.data.quality_tier) {
                                            setExtractionMeta({
                                                quality_tier: parsed.data.quality_tier,
                                                dpi: parsed.data.dpi,
                                                warning: parsed.data.warning
                                            });
                                        }
                                        break;

                                    case 'question':
                                        if (parsed.question) {
                                            setStreamingQuestions(prev => {
                                                // Avoid duplicate entries if any
                                                const exists = prev.some(q => q.id === parsed.question.id);
                                                if (exists) return prev;
                                                return [...prev, parsed.question];
                                            });
                                        }
                                        break;

                                    case 'complete': {
                                        const hasQuestions = parsed.questions && parsed.questions.length > 0;
                                        const hasSections = parsed.sections && parsed.sections.length > 0;
                                        if (!hasQuestions && !hasSections) {
                                            throw new Error('AI returned 0 questions. Please adjust your file or prompt.');
                                        }
                                        setPendingParsedData(parsed);
                                        setStreamProgress({
                                            stage: 'complete',
                                            percent: 100,
                                            message: 'All questions processed successfully!'
                                        });
                                        return;
                                    }

                                    case 'error':
                                        throw new Error(parsed.message);
                                }
                            } catch (e) {
                                console.error('Failed to parse SSE data:', e, currentData);
                            }
                            currentEvent = '';
                            currentData = '';
                        }
                        continue;
                    }

                    if (trimmedLine.startsWith('event:')) {
                        currentEvent = trimmedLine.slice(trimmedLine.indexOf(':') + 1).trim();
                    } else if (trimmedLine.startsWith('data:')) {
                        currentData = trimmedLine.slice(trimmedLine.indexOf(':') + 1).trim();
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
            setStreamProgress(null);
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

            const hasQuestionsLegacy = data.questions && data.questions.length > 0;
            const hasSectionsLegacy = data.sections && data.sections.length > 0;
            if (!hasQuestionsLegacy && !hasSectionsLegacy) {
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

    const handleImport = useCallback(() => {
        if (!parsedData || !onImport) return;

        // Helper to map option structure
        const mapOptions = (
            options: Question['options'] | undefined,
            optionImages: Question['optionImages'] | undefined,
            type: string
        ) => {
            const processedOptions: { [key: string]: { text: string; image: string | null } } = {};
            if (type !== 'numerical' && options && typeof options === 'object') {
                Object.entries(options).forEach(([key, val]) => {
                    if (val && typeof val === 'object' && 'text' in val) {
                        const optionObj = val as { text: string; image?: string | null };
                        processedOptions[key] = {
                            text: optionObj.text || '',
                            image: optionObj.image || null
                        };
                    } else {
                        processedOptions[key] = {
                            text: String(val || ''),
                            image: optionImages?.[key] || null
                        };
                    }
                });
            }
            return processedOptions;
        };

        // If section mode is enabled and sections are present, map them:
        if (parsedData.enable_section_mode && parsedData.sections && parsedData.sections.length > 0) {
            const sections = parsedData.sections.map((sec: Section) => {
                const mappedQuestions = (sec.questions || []).map((q: Question, index: number) => {
                    return {
                        id: q.id || index + 1,
                        type: q.type || 'single',
                        question: q.question,
                        questionText: q.question,
                        options: mapOptions(q.options, q.optionImages, q.type || 'single'),
                        correctAnswer: q.correctAnswer,
                        image: q.image,
                        marks: String(q.marks || 4),
                        negativeMarks: String(q.negativeMarks || 1),
                        explanation: "",
                        passageContent: q.passageContent || "",
                        typingMode: 'en' as const
                    };
                });
                return {
                    id: sec.id || `section-${Math.random().toString(36).substring(2, 9)}`,
                    name: sec.name || 'Untitled Section',
                    attempt_control: sec.attempt_control || { enabled: false },
                    questions: mappedQuestions,
                    marks_per_question: sec.marks_per_question || 4,
                    negative_marks: sec.negative_marks || 1,
                    question_type: sec.question_type || 'single'
                };
            });

            const importPayload = {
                title: parsedData.title,
                description: parsedData.description,
                revision_notes: parsedData.revision_notes,
                enable_section_mode: true,
                sections: sections,
                duration: parsedData.duration ? Number(parsedData.duration) : sections.reduce((sum: number, s) => sum + (s.questions?.length || 0), 0),
            };

            onImport(importPayload);
            return;
        }

        // Otherwise fallback to flat questions list
        const questions = (parsedData.questions || []).map((q, index) => {
            return {
                id: q.id || index + 1,
                type: q.type || 'single',
                question: q.question,
                questionText: q.question,
                options: mapOptions(q.options, q.optionImages, q.type || 'single'),
                correctAnswer: q.correctAnswer,
                image: q.image,
                marks: String(q.marks || 1),
                negativeMarks: String(q.negativeMarks || 0),
                explanation: "",
                passageContent: q.passageContent || "",
                typingMode: 'en' as const
            };
        });

        const importPayload = {
            title: parsedData.title,
            description: parsedData.description,
            revision_notes: parsedData.revision_notes,
            questions: questions,
            duration: parsedData.duration ? Number(parsedData.duration) : questions.length,
            marks_per_question: 1,
            negative_marks: 0,
        };

        onImport(importPayload);
    }, [parsedData, onImport]);

    const handleDirectSave = async () => {
        if (!parsedData) return;
        if (!user) {
            toast.error("Please login to save the test.");
            navigate('/login');
            return;
        }

        setSavingTest(true);
        try {
            const { getNextTestId, createTest } = await import('@/lib/testsApi');
            const customId = await getNextTestId('M');

            // Helper to map options for backend format
            const mapOptionsForBackend = (
                options: Question['options'] | undefined,
                optionImages: Question['optionImages'] | undefined,
                type: string
            ) => {
                const flatOptions: { [key: string]: string } = {};
                const flatOptionImages: { [key: string]: string } = {};

                if (type !== 'numerical' && options && typeof options === 'object') {
                    Object.entries(options).forEach(([key, val]) => {
                        if (val && typeof val === 'object' && 'text' in val) {
                            flatOptions[key] = val.text || '';
                            if (val.image) flatOptionImages[key] = val.image;
                        } else {
                            flatOptions[key] = String(val || '');
                            if (optionImages?.[key]) {
                                flatOptionImages[key] = optionImages[key] || '';
                            }
                        }
                    });
                }
                return { options: flatOptions, optionImages: flatOptionImages };
            };

            let sanitizedQuestions: any[] = [];
            let sanitizedSections: any[] = [];

            if (parsedData.enable_section_mode && parsedData.sections && parsedData.sections.length > 0) {
                sanitizedSections = parsedData.sections.map((sec, secIdx) => {
                    const mappedQuestions = (sec.questions || []).map((q, index) => {
                        const { options, optionImages } = mapOptionsForBackend(q.options, q.optionImages, q.type || 'single');
                        return {
                            id: q.id || index + 1,
                            type: q.type || 'single',
                            question: q.question,
                            options,
                            optionImages: Object.keys(optionImages).length > 0 ? optionImages : undefined,
                            correctAnswer: q.correctAnswer || 'A',
                            image: q.image || undefined,
                            marks: String(q.marks || sec.marks_per_question || 4),
                            negativeMarks: String(q.negativeMarks || sec.negative_marks || 1),
                            passageContent: q.passageContent || ""
                        };
                    });

                    return {
                        id: sec.id || `section-${Math.random().toString(36).substring(2, 9)}`,
                        name: sec.name || 'Untitled Section',
                        attempt_control: sec.attempt_control || { enabled: false },
                        questions: mappedQuestions,
                        marks_per_question: sec.marks_per_question || 4,
                        negative_marks: sec.negative_marks || 1,
                        question_type: sec.question_type || 'single'
                    };
                });
                sanitizedQuestions = sanitizedSections.flatMap(s => s.questions);
            } else {
                sanitizedQuestions = (parsedData.questions || []).map((q, index) => {
                    const { options, optionImages } = mapOptionsForBackend(q.options, q.optionImages, q.type || 'single');
                    return {
                        id: q.id || index + 1,
                        type: q.type || 'single',
                        question: q.question,
                        options,
                        optionImages: Object.keys(optionImages).length > 0 ? optionImages : undefined,
                        correctAnswer: q.correctAnswer || 'A',
                        image: q.image || undefined,
                        marks: String(q.marks || 1),
                        negativeMarks: String(q.negativeMarks || 0),
                        passageContent: q.passageContent || ""
                    };
                });
            }

            const payload = {
                title: parsedData.title || "AI Generated Test",
                description: parsedData.description || "",
                revision_notes: parsedData.revision_notes || "",
                duration: parsedData.duration ? Number(parsedData.duration) : sanitizedQuestions.length,
                is_public: false,
                questions: sanitizedQuestions,
                enable_section_mode: !!parsedData.enable_section_mode,
                sections: sanitizedSections.length > 0 ? sanitizedSections : undefined,
                created_by: user.id,
                custom_id: customId,
                creator_name: user.user_metadata?.full_name || 'Anonymous',
                creator_avatar: user.user_metadata?.avatar_url || '',
                created_at: new Date().toISOString()
            };

            const { data, error } = await createTest(payload);
            if (error) throw error;

            toast.success("Test saved successfully!");
            navigate('/creator/tests'); // Redirect to creator dashboard
        } catch (err: any) {
            console.error("Error direct saving test:", err);
            toast.error("Failed to save test: " + (err.message || String(err)));
        } finally {
            setSavingTest(false);
        }
    };

    // Scroll to bottom of streaming questions
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [streamingQuestions.length]);

    // Auto-navigate disabled to allow user review before importing
    // Keep it here as empty or commented out so we don't break logic references
    useEffect(() => {
        // Disabled for better UX and review flow
    }, [parsedData]);

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

    // Step 1: File Upload — unified Gemini-style drop zone + manual creation card
    if (files.length === 0 && !uploadType) {
        return (
            <div className="container mx-auto px-4 max-w-2xl py-10">
                <SEO
                    title="AI Test Generator - TestoZa"
                    description="Generate tests from PDF documents and images using AI. Extract exact questions or generate new ones."
                    keywords={["ai test generator", "pdf to quiz", "image to quiz", "exam maker ai"]}
                />

                {/* Header */}
                <div className="text-center mb-8 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">AI Powered</p>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
                        Create a Test in Minutes
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Upload any file — AI reads it and builds your test automatically
                    </p>
                </div>

                {/* ── Unified Upload Drop Zone ── */}
                <div
                    className="relative bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-200 cursor-pointer group shadow-sm mb-4"
                    onClick={() => documentInputRef.current?.click()}
                >
                    {/* Hidden file inputs */}
                    <Input
                        ref={documentInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
                        multiple
                        onChange={async (e) => {
                            const selectedFiles = Array.from(e.target.files || []);
                            if (!selectedFiles.length) return;
                            const newFiles: SelectedFile[] = [];
                            for (const file of selectedFiles) {
                                const preview = await createPreview(file);
                                newFiles.push({ file, id: generateId(), type: getFileType(file.name), preview });
                            }
                            const hasImages = newFiles.some(f => f.type === 'image');
                            setFiles(newFiles);
                            setUploadType(hasImages ? 'image' : 'document');
                            setError(null);
                            setParsedData(null);
                            setMode(null);
                        }}
                        className="hidden"
                    />
                    <Input
                        ref={imageInputRef}
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp"
                        multiple
                        onChange={handleImageChange}
                        className="hidden"
                    />

                    {/* Drop zone body */}
                    <div className="p-8 sm:p-10 flex flex-col items-center gap-4">
                        {/* Animated icon */}
                        <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                            <Sparkles className="w-8 h-8 text-indigo-500" />
                        </div>

                        <div className="text-center space-y-1">
                            <p className="font-semibold text-slate-700 dark:text-slate-200">
                                Drop your file here, or <span className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2">browse</span>
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                PDF · DOC · PPT · JPG · PNG · and more
                            </p>
                        </div>

                        {/* Upload type chips */}
                        <div className="flex flex-wrap justify-center gap-2 pt-1">
                            {/* PDF / Document */}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); documentInputRef.current?.click(); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all text-xs font-medium text-slate-600 dark:text-slate-300"
                            >
                                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                PDF / DOC / PPT
                            </button>

                            {/* Image */}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); imageInputRef.current?.click(); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all text-xs font-medium text-slate-600 dark:text-slate-300"
                            >
                                <ImageIcon className="w-3.5 h-3.5 text-green-500" />
                                Photo / Image
                            </button>

                            {/* Camera */}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openCamera(); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all text-xs font-medium text-slate-600 dark:text-slate-300"
                            >
                                <Camera className="w-3.5 h-3.5 text-rose-500" />
                                Camera
                            </button>
                        </div>
                    </div>
                </div>

                {/* Helper note */}
                <p className="text-center text-xs text-slate-400 dark:text-slate-500 mb-8">
                    AI will read your file and extract or generate questions automatically ✨
                </p>

                {/* ── Divider ── */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">or</span>
                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                </div>

                {/* ── Manual Creation Card ── */}
                <button
                    type="button"
                    onClick={() => { window.location.href = '/create-test'; }}
                    className="w-full text-left bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 rounded-2xl overflow-hidden flex items-stretch hover:shadow-xl hover:shadow-indigo-200 dark:hover:shadow-indigo-900/40 hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 group"
                    style={{ minHeight: '175px', maxHeight: '220px' }}
                >
                    {/* Left: scaled-down showcase preview (centered, organized, and larger) */}
                    <div
                        className="relative shrink-0 overflow-hidden bg-indigo-950/25 border-r border-white/10"
                        style={{ width: '200px' }}
                        aria-hidden="true"
                    >
                        {/* semi-transparent overlay so it blends with card */}
                        <div className="absolute inset-0 bg-indigo-600/10 z-10 pointer-events-none" />
                        {/* Showcase centered & scaled to fit nicely with padding */}
                        <div
                            className="absolute top-1/2 left-1/2"
                            style={{
                                transform: 'translate(-50%, -50%) scale(0.29)',
                                width: '640px',   /* original max-width */
                                height: '580px',  /* original height */
                                pointerEvents: 'none',
                                userSelect: 'none',
                            }}
                        >
                            <ManualEditorShowcase />
                        </div>
                    </div>

                    {/* Right: text + arrow */}
                    <div className="flex flex-1 items-center justify-between gap-3 px-5 py-5">
                        <div className="min-w-0">
                            <p className="font-bold text-white text-sm sm:text-base leading-snug">
                                ✏️ Build Your Own Test
                            </p>
                            <p className="text-xs text-indigo-100 mt-1 leading-relaxed">
                                Write questions yourself — set marks, sections &amp; rules. Full control, no AI needed.
                            </p>
                        </div>
                        <ArrowLeft className="w-5 h-5 text-white/70 rotate-180 shrink-0 group-hover:translate-x-1 transition-transform" />
                    </div>
                </button>

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
            <div className="container mx-auto p-4 max-w-2xl">
                <SEO
                    title="AI Test Generator - TestoZa"
                    description="Generate tests from PDF documents and images using AI."
                    keywords={["ai test generator", "pdf to quiz", "image to quiz"]}
                />

                {/* Hidden input to allow adding more files during Step 2 */}
                <Input
                    ref={documentInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
                    multiple
                    onChange={async (e) => {
                        const selectedFiles = Array.from(e.target.files || []);
                        if (!selectedFiles.length) return;
                        const newFiles: SelectedFile[] = [];
                        for (const file of selectedFiles) {
                            const preview = await createPreview(file);
                            newFiles.push({ file, id: generateId(), type: getFileType(file.name), preview });
                        }
                        setFiles(prev => [...prev, ...newFiles]);
                        setError(null);
                    }}
                    className="hidden"
                />

                <div className="space-y-4">
                    {/* Files Preview - Clean List View */}
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-500 hover:text-slate-700"
                                    onClick={() => {
                                        if (files.length === 0 || confirm("Going back will clear your selection. Continue?")) {
                                            clearAllFiles();
                                        }
                                    }}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                                <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                                    Selected {uploadType === 'document' ? 'Document' : 'Images'} ({files.length})
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => documentInputRef.current?.click()}
                                    className="h-8 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-semibold"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Add File
                                </Button>
                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={clearAllFiles} 
                                    className="h-8 text-xs text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5 mr-1" /> Clear All
                                </Button>
                            </div>
                        </div>
                        <div className="p-3">
                            <div className="space-y-1.5">
                                {files.map((fileObj) => (
                                    <div 
                                        key={fileObj.id} 
                                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {fileObj.preview ? (
                                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 shrink-0">
                                                    <img
                                                        src={fileObj.preview}
                                                        alt={fileObj.file.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-500 shrink-0">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[180px] sm:max-w-xs">
                                                    {fileObj.file.name}
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    {(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeFile(fileObj.id)}
                                            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Answer Key Upload - Reduced Inline Style */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500 shrink-0">
                                <Key className="w-4.5 h-4.5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Answer Key (Optional)</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[180px] sm:max-w-xs">
                                    {answerKeyFile ? answerKeyFile.name : "Upload key to auto-match correct answers"}
                                </p>
                            </div>
                        </div>
                        {answerKeyFile ? (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setAnswerKeyFile(null)} 
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => answerKeyInputRef.current?.click()}
                                className="text-[11px] h-8 px-3 shrink-0 border-dashed hover:border-solid"
                            >
                                Upload Key
                            </Button>
                        )}
                        <Input
                            ref={answerKeyInputRef}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={handleAnswerKeyChange}
                            className="hidden"
                        />
                    </div>

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
                                <div className="border-beam-container p-[1.5px] rounded-2xl bg-slate-200 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 hover:scale-[1.01] transition-all duration-200 group flex flex-col justify-between">
                                    <div className="border-beam-gradient-blue" />
                                    <Card
                                        className="cursor-pointer border-0 bg-white dark:bg-slate-950 relative z-10 w-full h-full flex flex-col justify-between rounded-[15px] hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                                        onClick={() => handleProcess('extract')}
                                    >
                                        <CardContent className="p-6 text-center flex flex-col justify-between h-full space-y-4">
                                            <div className="space-y-4 flex-1">
                                                <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <ClipboardList className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Extract Questions</h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                        Extract exact questions, options, and diagrams from the exam paper as-is
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 justify-center">
                                                    <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                        Best for: Exam papers, question banks
                                                    </Badge>
                                                    <Badge className="text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 py-0.5">
                                                        <Zap className="w-2.5 h-2.5 mr-0.5" />
                                                        ULTRA-FAST
                                                    </Badge>
                                                </div>
                                            </div>
                                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-2 mt-2 shadow-sm transition-all duration-200">
                                                Extract Questions →
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Generate Mode */}
                                <div className="border-beam-container p-[1.5px] rounded-2xl bg-slate-200 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 hover:scale-[1.01] transition-all duration-200 group flex flex-col justify-between">
                                    <div className="border-beam-gradient-purple" />
                                    <Card
                                        className="cursor-pointer border-0 bg-white dark:bg-slate-950 relative z-10 w-full h-full flex flex-col justify-between rounded-[15px] hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                                        onClick={() => handleProcess('generate')}
                                    >
                                        <CardContent className="p-6 text-center flex flex-col justify-between h-full space-y-4">
                                            <div className="space-y-4 flex-1">
                                                <div className="w-14 h-14 mx-auto rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Sparkles className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Generate New Questions</h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                        AI creates original questions based on the content and topics in the document
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 justify-center">
                                                    <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                        Best for: Textbooks, notes, study material
                                                    </Badge>
                                                    <Badge className="text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 py-0.5">
                                                        <Zap className="w-2.5 h-2.5 mr-0.5" />
                                                        ULTRA-FAST
                                                    </Badge>
                                                </div>
                                            </div>
                                            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-2 mt-2 shadow-sm transition-all duration-200">
                                                Generate Questions →
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
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
        if (isStreaming) {
            const currentStage = streamProgress?.stage || 'uploading';
            const currentPercent = streamProgress?.percent || 10;
            const currentMessage = streamProgress?.message || 'Connecting to AI model...';
            const pipelineType = streamProgress?.data?.pipeline || 'hybrid';

            return (
                <div className="container mx-auto p-4 max-w-6xl space-y-6">
                    <SEO
                        title="Extracting Exam Questions - TestoZa"
                        description="Extracting questions in real time using Hybrid OCR + Gemini."
                    />

                    {/* Inject custom styling for premium animations */}
                    <style dangerouslySetInnerHTML={{__html: `
                        @keyframes scan-line {
                            0% { top: 0%; }
                            50% { top: 100%; }
                            100% { top: 0%; }
                        }
                        @keyframes pulse-ring {
                            0% { transform: scale(0.95); opacity: 0.5; }
                            50% { transform: scale(1.05); opacity: 0.8; }
                            100% { transform: scale(0.95); opacity: 0.5; }
                        }
                        .animate-scan-line {
                            position: absolute;
                            left: 0;
                            width: 100%;
                            height: 3px;
                            background: linear-gradient(90deg, transparent, #3b82f6, #6366f1, transparent);
                            animation: scan-line 3.5s infinite linear;
                            box-shadow: 0 0 10px rgba(59, 130, 246, 0.7);
                        }
                        .animate-pulse-ring {
                            animation: pulse-ring 3.5s infinite ease-in-out;
                        }
                    `}} />

                    {/* Progress Overview Header */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        
                        {/* LEFT COLUMN: Pipeline Dashboard & Checkpoints (4 cols) */}
                        <div className="md:col-span-4 space-y-4">
                            <Card className="border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-card">
                                <div className="p-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 animate-pulse" />
                                <CardContent className="p-6 space-y-6">
                                    {/* App Info / Header */}
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border-0 flex items-center gap-1 font-semibold">
                                                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                                                Active Stream
                                            </Badge>
                                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                                        </div>
                                        <h3 className="text-xl font-bold tracking-tight">AI Engine Pipeline</h3>
                                        <p className="text-xs text-muted-foreground">Hybrid OCR & Vision architecture</p>
                                    </div>

                                    {/* Progress Meter */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-muted-foreground">Total Completion</span>
                                            <span className="text-primary">{currentPercent}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 transition-all duration-500 ease-out shadow-inner"
                                                style={{ width: `${currentPercent}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground italic text-center animate-pulse">
                                            "{currentMessage}"
                                        </p>
                                    </div>

                                    {/* Status Checkpoints */}
                                    <div className="space-y-4 pt-4 border-t text-sm">
                                        {/* Step 1: Upload */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                                                    currentStage !== 'uploading' 
                                                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' 
                                                        : 'bg-blue-100 text-blue-600 animate-pulse'
                                                }`}>
                                                    {currentStage !== 'uploading' ? <Check className="w-3.5 h-3.5" /> : '1'}
                                                </div>
                                                <span className={currentStage === 'uploading' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                                                    File Upload & Parse
                                                </span>
                                            </div>
                                            <span className="text-xs font-mono text-muted-foreground">
                                                {timers.uploading > 0 ? `${timers.uploading.toFixed(1)}s` : ''}
                                            </span>
                                        </div>

                                        {/* Step 2: Analyzer */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                                                    currentStage !== 'uploading' && currentStage !== 'analyzing'
                                                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                                                        : currentStage === 'analyzing'
                                                        ? 'bg-blue-100 text-blue-600 animate-pulse'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}>
                                                    {currentStage !== 'uploading' && currentStage !== 'analyzing' ? <Check className="w-3.5 h-3.5" /> : '2'}
                                                </div>
                                                <span className={currentStage === 'analyzing' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                                                    OCR Page Classification
                                                </span>
                                            </div>
                                            <span className="text-xs font-mono text-muted-foreground">
                                                {timers.analyzing > 0 ? `${timers.analyzing.toFixed(1)}s` : ''}
                                            </span>
                                        </div>

                                        {/* Step 3: Extraction */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                                                    currentStage === 'finalizing' || currentStage === 'complete'
                                                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                                                        : currentStage === 'processing' || currentStage === 'extracting'
                                                        ? 'bg-blue-100 text-blue-600 animate-pulse'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}>
                                                    {currentStage === 'finalizing' || currentStage === 'complete' ? <Check className="w-3.5 h-3.5" /> : '3'}
                                                </div>
                                                <span className={currentStage === 'processing' || currentStage === 'extracting' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                                                    AI Question Extraction
                                                </span>
                                            </div>
                                            <span className="text-xs font-mono text-muted-foreground">
                                                {timers.extracting > 0 ? `${timers.extracting.toFixed(1)}s` : ''}
                                            </span>
                                        </div>

                                        {/* Step 4: Finalizing */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                                                    currentStage === 'complete'
                                                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                                                        : currentStage === 'finalizing'
                                                        ? 'bg-blue-100 text-blue-600 animate-pulse'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}>
                                                    {currentStage === 'complete' ? <Check className="w-3.5 h-3.5" /> : '4'}
                                                </div>
                                                <span className={currentStage === 'finalizing' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                                                    Structure Finalization
                                                </span>
                                            </div>
                                            <span className="text-xs font-mono text-muted-foreground">
                                                {timers.finalizing > 0 ? `${timers.finalizing.toFixed(1)}s` : ''}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Live stats */}
                                    {extractionMeta && (
                                        <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-2 border border-slate-100 dark:border-slate-800">
                                            <p className="font-semibold text-muted-foreground">DOCUMENT METADATA</p>
                                            <div className="flex justify-between">
                                                <span>Scan Tier:</span>
                                                <span className="font-medium text-foreground">{extractionMeta.quality_tier?.toUpperCase()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>DPI setting:</span>
                                                <span className="font-medium text-foreground">{extractionMeta.dpi} DPI</span>
                                            </div>
                                            {extractionMeta.warning && (
                                                <p className="text-[10px] text-amber-500 font-medium leading-normal pt-1">
                                                    ⚠️ Image resolution is low. Results may need review.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCancelStream}
                                        className="w-full text-muted-foreground hover:text-destructive border-slate-200 dark:border-slate-800"
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Cancel Processing
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* RIGHT COLUMN: Stream Output Feed (8 cols) */}
                        <div className="md:col-span-8 space-y-4">
                            <Card className="border border-slate-200 dark:border-slate-800 shadow-xl bg-card min-h-[500px] flex flex-col">
                                <CardHeader className="py-4 border-b">
                                    <CardTitle className="text-lg">Extracted Questions</CardTitle>
                                </CardHeader>
                                
                                <div className="flex-1 flex flex-col p-4">
                                    {streamingQuestions.length > 0 ? (
                                        <ScrollArea className="h-[480px] w-full pr-2">
                                            <div className="space-y-4">
                                                {streamingQuestions.map((q, idx) => (
                                                    <Card
                                                        key={idx}
                                                        className="border-l-4 border-l-primary/60 hover:border-l-primary shadow-sm bg-slate-50/50 dark:bg-slate-900/50 transition-all duration-300 transform translate-y-0 animate-in fade-in-50 duration-500"
                                                    >
                                                        <CardContent className="p-4 space-y-3">
                                                            <div className="flex gap-2 justify-between">
                                                                <div className="flex gap-2">
                                                                    <span className="font-bold text-primary min-w-[20px]">
                                                                        Q{q.id}.
                                                                    </span>
                                                                    <div className="text-sm font-medium text-foreground">
                                                                        <MarkdownPreview content={q.question || 'No question text'} />
                                                                    </div>
                                                                </div>
                                                                <Badge variant="outline" className="text-xs self-start shrink-0 font-medium uppercase">
                                                                    {q.type || 'single'}
                                                                </Badge>
                                                            </div>
                                                            {q.options && Object.keys(q.options).length > 0 && (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7 pt-1">
                                                                    {Object.entries(q.options).slice(0, 4).map(([key, value]) => {
                                                                        const optionText = typeof value === 'object' && value !== null 
                                                                            ? (value as any).text 
                                                                            : String(value || '');
                                                                        return (
                                                                            <div
                                                                                key={key}
                                                                                className="text-xs text-muted-foreground bg-muted p-2 rounded border border-slate-100 dark:border-slate-800 flex gap-1.5 items-start"
                                                                            >
                                                                                <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0">{key}:</span>
                                                                                <span className="line-clamp-2">{optionText}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                                {/* Auto Scroll Target */}
                                                <div ref={scrollRef} />
                                            </div>
                                        </ScrollArea>
                                    ) : (
                                        /* Elegant Scanning / Document analyzing visualizer */
                                        <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-6">
                                            <div className="relative w-44 h-56 border-2 border-dashed border-primary/20 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center p-4 overflow-hidden shadow-inner">
                                                {/* Scanner scanning bar */}
                                                <div className="animate-scan-line" />
                                                
                                                {/* Pulsing glow orb */}
                                                <div className="absolute w-24 h-24 rounded-full bg-primary/20 animate-pulse-ring blur-xl" />
                                                
                                                {/* Mock doc details */}
                                                <FileText className="w-14 h-14 text-primary/40 mb-3" />
                                                <div className="w-full space-y-2">
                                                    <div className="h-2 bg-primary/10 rounded w-5/6 mx-auto animate-pulse" />
                                                    <div className="h-2 bg-primary/10 rounded w-4/6 mx-auto animate-pulse" />
                                                    <div className="h-2 bg-primary/10 rounded w-5/6 mx-auto animate-pulse" />
                                                </div>
                                            </div>
                                            
                                            <div className="text-center space-y-2 max-w-sm">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200">AI Reading Document</h4>
                                                <p className="text-xs text-muted-foreground leading-normal">
                                                    Using PyMuPDF native OCR. Examining page structure to extract bold text, symbols, formatting, and mathematical equations...
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </div>
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
                                        onClick={() => { setParsedData(null); setMode(null); }}
                                    >
                                        Try Again
                                    </Button>
                                    <Button
                                        onClick={handleImport}
                                        className="bg-blue-600 hover:bg-blue-700 font-bold gap-2 text-white"
                                    >
                                        <PenLine className="w-4 h-4" />
                                        Edit
                                    </Button>
                                    <Button
                                        onClick={handleDirectSave}
                                        disabled={savingTest}
                                        className="bg-green-600 hover:bg-green-700 font-bold gap-2 text-white"
                                    >
                                        {savingTest ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                                        ) : (
                                            <><Check className="w-4 h-4" /> Save & Continue</>
                                        )}
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
                                    <span>Review complete? Save directly or edit to customize.</span>
                                    
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                            <DropdownMenuItem onClick={handleDownloadJSON} className="gap-2">
                                                <Download className="w-4 h-4" />
                                                Download raw JSON
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={handleImport}
                                        size="lg"
                                        variant="outline"
                                        className="gap-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 font-medium px-8"
                                    >
                                        <PenLine className="w-5 h-5" />
                                        Edit
                                    </Button>
                                    <Button
                                        onClick={handleDirectSave}
                                        disabled={savingTest}
                                        size="lg"
                                        className="gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-md text-white font-medium px-8"
                                    >
                                        {savingTest ? (
                                            <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                                        ) : (
                                            <><Check className="w-5 h-5 text-emerald-200" /> Save & Continue</>
                                        )}
                                    </Button>
                                </div>
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
