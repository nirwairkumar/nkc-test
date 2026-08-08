import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchFeatureFlags, FeatureFlags } from '@/lib/featuresApi';
import { getApiUrl } from '@/lib/getApiUrl';
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, FileText, Sparkles, ClipboardList, ArrowLeft, Check, ImageIcon, Download, Code, Eye, Plus, Calculator, CheckSquare, Camera, X, Key, Zap, CheckCircle2, MoreVertical, PenLine, PencilLine, History, Trash2, ChevronLeft, FileUp, HelpCircle, Upload, ArrowRight, ChevronRight } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ManualEditorShowcase from "@/components/landing/ManualEditorShowcase";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
    groupId?: string;
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

// Utility to recursively parse strings that might be JSON-encoded
const ensureParsedObject = (val: any): any => {
    if (typeof val === 'string') {
        try {
            return ensureParsedObject(JSON.parse(val));
        } catch {
            return val;
        }
    }
    return val;
};

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
    const [algorithm, setAlgorithm] = useState<'parallel' | 'stateful'>('stateful');
    const [abortController, setAbortController] = useState<AbortController | null>(null);

    // AI Generation Custom Parameters State
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['default']);
    const [difficulty, setDifficulty] = useState<'Easy' | 'Moderate' | 'Tough'>('Tough');
    const [customInstructions, setCustomInstructions] = useState<string>('');

    const handleLanguageToggle = (lang: string) => {
        if (lang === 'default') {
            setSelectedLanguages(['default']);
            return;
        }

        setSelectedLanguages(prev => {
            const withoutDefault = prev.filter(l => l !== 'default');
            if (withoutDefault.includes(lang)) {
                const next = withoutDefault.filter(l => l !== lang);
                return next.length === 0 ? ['default'] : next;
            } else {
                return [...withoutDefault, lang];
            }
        });
    };

    // AI Generation History State
    const [historyItems, setHistoryItems] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
    const [clearingAllHistory, setClearingAllHistory] = useState(false);

    // Apple HIG UI & Drag State
    const [isDragging, setIsDragging] = useState(false);
    const [showHelpDialog, setShowHelpDialog] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files || []);
        if (!droppedFiles.length) return;

        const newFiles: SelectedFile[] = [];
        for (const file of droppedFiles) {
            const preview = await createPreview(file);
            newFiles.push({ file, id: generateId(), type: getFileType(file.name), preview });
        }
        const hasImages = newFiles.some(f => f.type === 'image');
        setFiles(newFiles);
        setUploadType(hasImages ? 'image' : 'document');
        setError(null);
        setParsedData(null);
        setMode(null);
    };

    // Fetch feature flags
    useEffect(() => {
        fetchFeatureFlags().then(data => setFeatureFlags(data));
    }, []);

    // Sync guest history on login and load history
    useEffect(() => {
        const syncAndLoadHistory = async () => {
            setLoadingHistory(true);
            try {
                if (user) {
                    // Check local storage for guest history to migrate
                    const guestHistoryStr = localStorage.getItem('guest_ai_history');
                    if (guestHistoryStr) {
                        try {
                            const guestHistory = JSON.parse(guestHistoryStr);
                            if (Array.isArray(guestHistory) && guestHistory.length > 0) {
                                // Upload guest history items to database
                                const { saveAiHistory } = await import('@/lib/aiHistoryApi');
                                let syncedCount = 0;
                                const failedItems = [];
                                for (const item of guestHistory) {
                                    const { error } = await saveAiHistory({
                                        mode: item.mode,
                                        title: item.title,
                                        description: item.description,
                                        file_name: item.file_name,
                                        question_count: item.question_count,
                                        parsed_data: ensureParsedObject(item.parsed_data)
                                    });
                                    if (!error) {
                                        syncedCount++;
                                    } else {
                                        failedItems.push(item);
                                        console.error("Failed to sync history item to database:", error);
                                    }
                                }
                                if (syncedCount > 0) {
                                    toast.success(`Synced ${syncedCount} local AI generations to your account!`);
                                }
                                if (failedItems.length > 0) {
                                    localStorage.setItem('guest_ai_history', JSON.stringify(failedItems));
                                } else {
                                    localStorage.removeItem('guest_ai_history');
                                }
                            }
                        } catch (e) {
                            console.error("Error migrating guest AI history:", e);
                        }
                    }

                    // Fetch history from DB
                    const { fetchAiHistory } = await import('@/lib/aiHistoryApi');
                    const { data, error } = await fetchAiHistory();
                    if (error) {
                        const errorMsg = error.message || String(error);
                        if (errorMsg.includes('relation "ai_generation_history" does not exist') || errorMsg.includes('does not exist')) {
                            console.warn("Database table 'ai_generation_history' does not exist yet.");
                        } else {
                            throw error;
                        }
                    }
                    const parsedDataList = (data || []).map((item: any) => ({
                        ...item,
                        parsed_data: ensureParsedObject(item.parsed_data)
                    }));
                    setHistoryItems(parsedDataList);
                } else {
                    // Unauthenticated (Guest): Load from localStorage
                    const guestHistoryStr = localStorage.getItem('guest_ai_history');
                    if (guestHistoryStr) {
                        try {
                            const parsedList = JSON.parse(guestHistoryStr);
                            if (Array.isArray(parsedList)) {
                                setHistoryItems(parsedList.map((item: any) => ({
                                    ...item,
                                    parsed_data: ensureParsedObject(item.parsed_data)
                                })));
                            } else {
                                setHistoryItems([]);
                            }
                        } catch {
                            setHistoryItems([]);
                        }
                    } else {
                        setHistoryItems([]);
                    }
                }
            } catch (err) {
                console.error("Failed to load AI history:", err);
            } finally {
                setLoadingHistory(false);
            }
        };

        syncAndLoadHistory();
    }, [user]);

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
                saveToHistory(pendingParsedData);
                setPendingParsedData(null);
                setIsStreaming(false);
                setLoading(false);
                setStreamProgress(null);
                setAbortController(null);
            }, 1500); // 1.5s delay to review checkmarks/timers
            return () => clearTimeout(timer);
        }
    }, [pendingParsedData, streamProgress?.stage]);

    // Restore pending AI import after login redirection
    useEffect(() => {
        const pendingDataStr = localStorage.getItem('pending_ai_import_test');
        if (pendingDataStr) {
            try {
                const { parsedData: restoredParsedData, mode: restoredMode } = JSON.parse(pendingDataStr);
                if (restoredParsedData) {
                    setParsedData(ensureParsedObject(restoredParsedData));
                    if (restoredMode) setMode(restoredMode);
                    toast.success("Restored your AI-generated questions!");
                }
            } catch (e) {
                console.error("Failed to restore pending AI import:", e);
            } finally {
                localStorage.removeItem('pending_ai_import_test');
            }
        }
    }, []);

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

    const saveToHistory = async (data: ParseResponse) => {
        if (!data) return;
        const qCount = data.questions?.length || 0;
        if (qCount === 0) return;

        const totalExecTime = Math.round((timers.uploading + timers.analyzing + timers.extracting + timers.finalizing) * 10) / 10;
        const filesList = files.map(f => ({
            name: f.file.name,
            size_bytes: f.file.size,
            type: f.type
        }));

        const enrichedParsedData = {
            ...data,
            tool_type: 'generate_with_ai',
            timing_steps: timers,
            execution_time_seconds: totalExecTime > 0 ? totalExecTime : undefined,
            files_details: filesList.length > 0 ? filesList : undefined,
            upload_type: uploadType
        };

        const historyPayload = {
            mode: mode || 'extract',
            title: data.title || (mode === 'extract' ? 'Extracted Questions' : 'Generated Questions'),
            description: data.description || '',
            file_name: filesList.map(f => f.name).join(', ') || null,
            question_count: qCount,
            parsed_data: enrichedParsedData
        };

        if (user) {
            try {
                const { saveAiHistory } = await import('@/lib/aiHistoryApi');
                const { data: savedItem, error } = await saveAiHistory(historyPayload);
                if (error) {
                    console.error("Failed to save generation to database:", error);
                    toast.error(`Could not save generation to history: ${error.message || String(error)}`);
                } else if (savedItem) {
                    setHistoryItems(prev => [savedItem, ...prev]);
                    toast.success("Generation saved to your history!");
                }
            } catch (err: any) {
                console.error("Failed to save generation to database:", err);
                toast.error(`Could not save generation to history: ${err.message || String(err)}`);
            }
        } else {
            try {
                const guestHistoryStr = localStorage.getItem('guest_ai_history');
                let guestHistory = [];
                if (guestHistoryStr) {
                    try { guestHistory = JSON.parse(guestHistoryStr); } catch { guestHistory = []; }
                }
                const newLocalItem = {
                    ...historyPayload,
                    id: Math.random().toString(36).substring(2, 9),
                    created_at: new Date().toISOString()
                };
                guestHistory = [newLocalItem, ...guestHistory];
                localStorage.setItem('guest_ai_history', JSON.stringify(guestHistory));
                setHistoryItems(guestHistory);
            } catch (err) {
                console.warn("Failed to save generation to guest storage:", err);
            }
        }
    };

    const handleSelectHistoryItem = async (item: any) => {
        if (user && item.id && !item.parsed_data) {
            const loadToastId = toast.loading("Loading generation data...");
            try {
                const { fetchAiHistoryItemById } = await import('@/lib/aiHistoryApi');
                const { data, error } = await fetchAiHistoryItemById(item.id);
                if (error) throw error;
                if (data) {
                    const parsedItem = {
                        ...data,
                        parsed_data: ensureParsedObject(data.parsed_data)
                    };
                    // Cache the fetched full item in state
                    setHistoryItems(prev => prev.map(h => h.id === item.id ? parsedItem : h));
                    
                    setParsedData(parsedItem.parsed_data);
                    if (data.mode) setMode(data.mode);
                    toast.dismiss(loadToastId);
                    toast.success(`Loaded generation: ${data.title || 'Untitled'}`);
                } else {
                    toast.dismiss(loadToastId);
                    toast.error("Failed to load generation data.");
                }
            } catch (err) {
                console.error("Failed to load history item by id:", err);
                toast.dismiss(loadToastId);
                toast.error("Failed to load generation data.");
            }
        } else {
            setParsedData(ensureParsedObject(item.parsed_data));
            if (item.mode) setMode(item.mode);
            toast.info(`Loaded generation: ${item.title || 'Untitled'}`);
        }
    };

    const handleDeleteHistoryItem = async (e: React.MouseEvent, id: string, index: number) => {
        e.stopPropagation();
        if (user) {
            try {
                const { deleteAiHistory } = await import('@/lib/aiHistoryApi');
                const { error } = await deleteAiHistory(id);
                if (error) throw error;
                setHistoryItems(prev => prev.filter(item => item.id !== id));
                toast.success("History item deleted.");
            } catch (err) {
                console.error("Failed to delete history item:", err);
                toast.error("Failed to delete history item.");
            }
        } else {
            try {
                const guestHistoryStr = localStorage.getItem('guest_ai_history');
                if (guestHistoryStr) {
                    let guestHistory = JSON.parse(guestHistoryStr);
                    guestHistory = guestHistory.filter((_: any, idx: number) => idx !== index);
                    localStorage.setItem('guest_ai_history', JSON.stringify(guestHistory));
                    setHistoryItems(guestHistory);
                    toast.success("History item deleted.");
                }
            } catch (err) {
                console.error("Failed to delete guest history item:", err);
            }
        }
    };

    const handleClearAllHistory = async () => {
        setClearingAllHistory(true);
        try {
            if (user) {
                const { deleteAllAiHistory } = await import('@/lib/aiHistoryApi');
                const { error } = await deleteAllAiHistory();
                if (error) throw error;
                setHistoryItems([]);
                toast.success("All AI history cleared.");
            } else {
                localStorage.removeItem('guest_ai_history');
                setHistoryItems([]);
                toast.success("All AI history cleared.");
            }
        } catch (err: any) {
            console.error("Failed to clear all history:", err);
            toast.error("Failed to clear history.");
        } finally {
            setClearingAllHistory(false);
            setShowClearAllConfirm(false);
        }
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
            const API_BASE_URL = getApiUrl();
            const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

            const langParam = selectedLanguages.join(',');
            const diffParam = difficulty;
            const customInstParam = customInstructions.trim();

            let queryParams = `mode=${selectedMode}&algorithm=${algorithm}&languages=${encodeURIComponent(langParam)}&difficulty=${encodeURIComponent(diffParam)}`;
            if (customInstParam) {
                queryParams += `&user_instructions=${encodeURIComponent(customInstParam)}`;
            }

            // Use ULTRA-FAST streaming endpoint
            const response = await fetch(`${baseUrl}/ai/parse-stream?${queryParams}`, {
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

            const API_BASE_URL = getApiUrl();
            const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

            const langParam = selectedLanguages.join(',');
            const diffParam = difficulty;
            const customInstParam = customInstructions.trim();

            let queryParams = `mode=${selectedMode}&languages=${encodeURIComponent(langParam)}&difficulty=${encodeURIComponent(diffParam)}`;
            if (customInstParam) {
                queryParams += `&user_instructions=${encodeURIComponent(customInstParam)}`;
            }

            const response = await fetch(`${baseUrl}/ai/parse?${queryParams}`, {
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

                const combinedData = {
                    ...data,
                    questions: [...parsedData.questions, ...adjustedQuestions]
                };
                setParsedData(combinedData);
                saveToHistory(combinedData);
            } else {
                setParsedData(data);
                saveToHistory(data);
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
                        groupId: q.groupId || "",
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
                groupId: q.groupId || "",
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
            try {
                localStorage.setItem('pending_ai_import_test', JSON.stringify({
                    parsedData,
                    mode,
                }));
                localStorage.setItem('auth_redirect_intent', '/generate-with-ai');
            } catch (e) {
                console.warn("Could not save pending test to localStorage", e);
            }
            toast.error("Please login to save the test. Redirecting...");
            setTimeout(() => navigate('/login'), 1000);
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
                            passageContent: q.passageContent || "",
                            groupId: q.groupId || ""
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
                        passageContent: q.passageContent || "",
                        groupId: q.groupId || ""
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
            navigate('/my-tests'); // Redirect to creator dashboard
        } catch (err: any) {
            console.error("Error direct saving test:", err);
            toast.error("Failed to save test: " + (err.message || String(err)));
        } finally {
            setSavingTest(false);
        }
    };

    // Scroll to bottom of streaming questions
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollContainerRef.current) {
            const viewport = scrollContainerRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
            }
        }
    }, [streamingQuestions.length]);



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

    // Listen for AI history selection from sidebar
    useEffect(() => {
        const handleLoadHistoryItem = (e: Event) => {
            const customEv = e as CustomEvent;
            const item = customEv.detail;
            if (item) {
                handleSelectHistoryItem(item);
            }
        };

        window.addEventListener('load_ai_history_item', handleLoadHistoryItem);
        return () => window.removeEventListener('load_ai_history_item', handleLoadHistoryItem);
    }, [handleSelectHistoryItem]);

    // Step 1: File Upload — Apple HIG 2-choice layout with dominant CTA
    if (!parsedData && files.length === 0 && !uploadType) {
        return (
            <div className="min-h-[calc(100vh-4rem)] w-full bg-[#FBFBFD] dark:bg-[#0D0E12] py-8 md:py-12 px-4 md:px-8 flex flex-col justify-start items-center">
                <SEO
                    title="Create Online Test - TestoZa"
                    description="Upload your question paper PDF or photo and let AI turn it into an online test automatically."
                    keywords={["ai test generator", "pdf to quiz", "question paper parser", "exam maker for teachers"]}
                />

                {/* Single OS-native File Input */}
                <input
                    ref={documentInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,image/*"
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

                <div className="max-w-2xl w-full space-y-8">
                    {/* Header: Golden Spiral Peak */}
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Create Your Online Test
                        </h1>
                        <p className="text-base text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                            Turn your exam paper into an interactive online test in seconds.
                        </p>
                    </div>

                    {/* TWO CHOICE LAYOUT */}
                    <div className="space-y-6">
                        {/* CHOICE 1: PRIMARY UPLOAD CARD (Single Dominant CTA) */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => documentInputRef.current?.click()}
                            className={`group relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[32px] p-8 sm:p-10 border-2 transition-all duration-300 cursor-pointer shadow-[0_20px_50px_rgba(59,130,246,0.07)] hover:shadow-[0_25px_60px_rgba(59,130,246,0.15)] hover:-translate-y-0.5 ${
                                isDragging
                                    ? 'border-[#007AFF] bg-blue-50/50 dark:bg-blue-950/40 scale-[1.01]'
                                    : 'border-blue-100 dark:border-blue-900/40 hover:border-[#007AFF]/60'
                            }`}
                        >
                            {/* Recommended Badge */}
                            <div className="absolute top-6 right-6">
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 text-xs font-bold shadow-sm">
                                    ⭐ Recommended
                                </span>
                            </div>

                            <div className="flex flex-col items-center text-center space-y-5">
                                {/* Large SF Circular Icon */}
                                <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#007AFF] dark:text-blue-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-[#007AFF] group-hover:text-white transition-all duration-300 shadow-inner">
                                    <FileUp className="w-10 h-10 stroke-[1.75]" />
                                </div>

                                {/* Text content */}
                                <div className="space-y-2 max-w-md">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                        Upload Question Paper
                                    </h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Select a PDF, Word document, or photo of your exam paper. We'll automatically convert it into an online test.
                                    </p>
                                </div>

                                {/* Dominant Button */}
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        className="inline-flex items-center justify-center gap-2.5 bg-[#007AFF] hover:bg-[#0062CC] active:bg-[#0051B3] text-white font-semibold text-base px-8 py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all duration-200 group-hover:scale-[1.02]"
                                    >
                                        <Upload className="w-5 h-5" />
                                        <span>Choose File</span>
                                    </button>
                                </div>

                                {/* File Specs & Time Info */}
                                <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-400 dark:text-slate-500">
                                    <span>Supported: PDF, Word (.docx), or Photos (JPG, PNG)</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                    <span className="font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                        ⚡ Ready in ~2–3 minutes
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* CHOICE 2: SECONDARY MANUAL CREATION CARD */}
                        <div
                            onClick={() => { window.location.href = '/create-test'; }}
                            className="group bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg rounded-[28px] p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md flex items-center justify-between gap-4"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                                    <PencilLine className="w-6 h-6 stroke-[1.75]" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#007AFF] transition-colors">
                                        Create Test Manually
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                        Type or paste questions manually with full control over marks, options, and sections.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 text-xs font-semibold text-[#007AFF] shrink-0 group-hover:translate-x-1 transition-transform">
                                <span>Start Manually</span>
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* NEED HELP FOOTER SECTION */}
                    <div className="pt-4 flex flex-col items-center">
                        <button
                            type="button"
                            onClick={() => setShowHelpDialog(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                        >
                            <HelpCircle className="w-4 h-4 text-blue-500" />
                            <span>Need Help? How it works</span>
                        </button>
                    </div>

                    {/* HELP TUTORIAL DIALOG */}
                    <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
                        <DialogContent className="max-w-md rounded-[28px] p-6">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    <HelpCircle className="w-5 h-5 text-[#007AFF]" />
                                    How to Create a Test
                                </DialogTitle>
                                <DialogDescription className="text-sm text-slate-500 pt-1">
                                    Follow these 3 simple steps to generate an online test for your students.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0">1</div>
                                    <div>
                                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">Select Question Paper</p>
                                        <p className="text-xs text-slate-500">Click "Choose File" and upload your exam paper in PDF, Word, or photo format.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0">2</div>
                                    <div>
                                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">Automatic Question Reading</p>
                                        <p className="text-xs text-slate-500">The system automatically extracts all questions, multiple choice options, and diagrams.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0">3</div>
                                    <div>
                                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">Review &amp; Share with Students</p>
                                        <p className="text-xs text-slate-500">Review the extracted questions, make any quick adjustments, and publish your test!</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button className="bg-[#007AFF] hover:bg-[#0062CC] rounded-xl px-5 text-xs font-semibold" onClick={() => setShowHelpDialog(false)}>
                                    Got It!
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        );
    }


// Step 2: Mode Selection (after files are selected, before processing)
    if (!loading && !generatingMore && !parsedData) {
        const hasPDF = files.some(f => f.type === 'pdf');
        const hasImages = files.some(f => f.type === 'image');

        return (
            <div className="container mx-auto pt-2 md:pt-4 px-4 pb-8 max-w-2xl">
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
                        <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-100 dark:border-slate-800/80 flex flex-col xs:flex-row gap-2 items-stretch xs:items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
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
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs gap-1.5 font-semibold text-slate-650 dark:text-slate-305 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        >
                                            {algorithm === 'parallel' ? (
                                                <>
                                                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                                    <span>Fast Mode</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                                    <span>High Accuracy</span>
                                                </>
                                            )}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64 p-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                        <DropdownMenuItem
                                            onClick={() => setAlgorithm('parallel')}
                                            className={`flex flex-col items-start gap-1 p-2 rounded-lg cursor-pointer transition-colors ${
                                                algorithm === 'parallel' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-300' : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full font-bold text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                                    <span>Fast Mode (Parallel)</span>
                                                </div>
                                                {algorithm === 'parallel' && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                                            </div>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-normal">
                                                Splits pages into parallel chunks. Extremely fast (~15s) and streams questions instantly.
                                            </p>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setAlgorithm('stateful')}
                                            className={`flex flex-col items-start gap-1 p-2 rounded-lg cursor-pointer transition-colors ${
                                                algorithm === 'stateful' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-300' : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full font-bold text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                                    <span>High Accuracy (Stateful)</span>
                                                </div>
                                                {algorithm === 'stateful' && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                                            </div>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-normal">
                                                Page-by-page stateful chat. Slower, but preserves sequence and extracts multi-page questions seamlessly.
                                            </p>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />
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
                            {/* ── AI Advanced Settings Card ── */}
                            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-sm">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-indigo-500" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                            AI Settings &amp; Constraints
                                        </h3>
                                    </div>
                                    <span className="text-[10px] text-slate-400">Customizable</span>
                                </div>

                                {/* Row 1: Language & Difficulty */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Language Selection */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-650 dark:text-slate-300 flex items-center gap-1.5">
                                            <span>🌐 Language Output</span>
                                            {selectedLanguages.length > 1 && (
                                                <Badge className="text-[9px] h-4 px-1.5 bg-indigo-500 text-white font-medium">Bilingual</Badge>
                                            )}
                                        </label>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <button
                                                type="button"
                                                onClick={() => handleLanguageToggle('default')}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                                    selectedLanguages.includes('default')
                                                        ? 'bg-indigo-600 text-white shadow-sm'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                Same as Material
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleLanguageToggle('English')}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                                    selectedLanguages.includes('English')
                                                        ? 'bg-indigo-600 text-white shadow-sm'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                English
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleLanguageToggle('Hindi')}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                                    selectedLanguages.includes('Hindi')
                                                        ? 'bg-indigo-600 text-white shadow-sm'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                Hindi
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-tight">
                                            Select multiple (e.g. English + Hindi) for bilingual questions.
                                        </p>
                                    </div>

                                    {/* Difficulty Level */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-650 dark:text-slate-300">
                                            🎯 Target Difficulty
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            {(['Easy', 'Moderate', 'Tough'] as const).map((lvl) => (
                                                <button
                                                    key={lvl}
                                                    type="button"
                                                    onClick={() => setDifficulty(lvl)}
                                                    className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all ${
                                                        difficulty === lvl
                                                            ? lvl === 'Easy'
                                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                                : lvl === 'Moderate'
                                                                ? 'bg-amber-600 text-white shadow-sm'
                                                                : 'bg-rose-600 text-white shadow-sm'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                    }`}
                                                >
                                                    {lvl === 'Easy' ? '🟢 Easy' : lvl === 'Moderate' ? '🟡 Moderate' : '🔴 Tough'}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-tight">
                                            Controls question complexity &amp; reasoning depth.
                                        </p>
                                    </div>
                                </div>

                                {/* Custom Instructions Textarea */}
                                <div className="space-y-1.5 pt-1">
                                    <label className="text-xs font-semibold text-slate-650 dark:text-slate-300 flex items-center justify-between">
                                        <span>📝 Custom Instructions (Optional)</span>
                                        <span className="text-[10px] text-slate-400 font-normal">e.g. Marks, Negative marking, Count</span>
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={customInstructions}
                                        onChange={(e) => setCustomInstructions(e.target.value)}
                                        placeholder="e.g. Each question 2 marks, 0.5 negative. Generate minimum 30 questions with top conceptual focus..."
                                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="text-center space-y-2 mt-6">
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
                <div className="container mx-auto pt-2 md:pt-4 px-4 pb-8 max-w-6xl space-y-6">
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
                                        <ScrollArea ref={scrollContainerRef} className="h-[480px] w-full pr-2">
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
                                                                                <div className="line-clamp-2 text-xs overflow-hidden">
                                                                                    <MarkdownPreview content={optionText} />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                ))}
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
                <div className="container mx-auto pt-2 md:pt-4 px-4 pb-8 max-w-4xl">
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
                                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                    <Button
                                        variant="outline"
                                        onClick={() => { setParsedData(null); setMode(null); }}
                                        className="flex-1 sm:flex-initial text-xs sm:text-sm px-2.5 sm:px-4"
                                    >
                                        Try Again
                                    </Button>
                                    <Button
                                        onClick={handleImport}
                                        className="flex-1 sm:flex-initial text-xs sm:text-sm px-2.5 sm:px-4 bg-blue-600 hover:bg-blue-700 font-bold gap-2 text-white"
                                    >
                                        <PenLine className="w-4 h-4" />
                                        Edit
                                    </Button>
                                    <Button
                                        onClick={handleDirectSave}
                                        disabled={savingTest}
                                        className="w-full sm:w-auto text-xs sm:text-sm px-2.5 sm:px-4 bg-green-600 hover:bg-green-700 font-bold gap-2 text-white"
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
                                                <div className="space-y-2 ml-2 sm:ml-10 mt-2">
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
                                                <div className="ml-2 sm:ml-10 mt-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
                                                    <label className="text-xs font-semibold uppercase text-purple-600 dark:text-purple-400">Correct Answer (Numerical)</label>
                                                    <div className="text-lg font-mono mt-1 text-purple-800 dark:text-purple-200">
                                                        {formatCorrectAnswer(q)}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Unanswered Warning */}
                                            {!q.correctAnswer && (
                                                <div className="ml-2 sm:ml-10">
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
                            <div className="mt-8 mb-4 border-t pt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                    <span>Review complete? Save directly or edit to customize.</span>
                                    
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full shrink-0">
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
                                <div className="flex gap-3 w-full md:w-auto">
                                    <Button
                                        onClick={handleImport}
                                        size="lg"
                                        variant="outline"
                                        className="flex-1 md:flex-none gap-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 font-medium px-4 md:px-8 text-sm md:text-base h-10 md:h-12"
                                    >
                                        <PenLine className="w-4 h-4 md:w-5 md:h-5" />
                                        Edit
                                    </Button>
                                    <Button
                                        onClick={handleDirectSave}
                                        disabled={savingTest}
                                        size="lg"
                                        className="flex-1 md:flex-none gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-md text-white font-medium px-4 md:px-8 text-sm md:text-base h-10 md:h-12"
                                    >
                                        {savingTest ? (
                                            <><Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> Saving...</>
                                        ) : (
                                            <><Check className="w-4 h-4 md:w-5 md:h-5 text-emerald-200" /> Save & Continue</>
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
