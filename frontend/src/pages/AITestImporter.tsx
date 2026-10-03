import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchFeatureFlags, FeatureFlags } from '@/lib/featuresApi';
import { getApiUrl } from '@/lib/getApiUrl';
import { Input } from "@/components/ui/input";
import { AlertCircle, FileText, Sparkles, ClipboardList, ArrowLeft, Check, Plus, Camera, X, Key, Zap, PencilLine, History, Trash2, ChevronLeft, FileUp, HelpCircle, Upload, ArrowRight, ChevronRight } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ManualEditorShowcase from "@/components/landing/ManualEditorShowcase";
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import type { ExtractionMeta, ParseResponse, ProcessMode, Question, Section, StageTimes, StreamProgress, StreamedQuestion } from '@/components/ai-import/types';
import {
    advanceStage,
    emptyPipelineInfo,
    questionFingerprint,
    reducePipelineInfo,
    stageKeyOf,
    stageSeconds,
    PipelineInfo,
} from '@/components/ai-import/progressModel';
import ProcessingView from '@/components/ai-import/ProcessingView';
import PreviewView from '@/components/ai-import/PreviewView';

type FileType = 'pdf' | 'image';
type UploadType = 'document' | 'image' | null;

interface SelectedFile {
    file: File;
    id: string;
    type: FileType;
    preview?: string;
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
    const { user, profile } = useAuth();
    const { openAuthModal } = useAuthModal();

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
    const [extractionMeta, setExtractionMeta] = useState<ExtractionMeta | null>(null);
    const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);

    const [savingTest, setSavingTest] = useState(false);
    const [pendingParsedData, setPendingParsedData] = useState<ParseResponse | null>(null);
    // Stage clock: wall-clock timestamps, not a counting interval, so a hidden
    // (timer-throttled) tab keeps correct time.
    const [runStartedAt, setRunStartedAt] = useState(0);
    const [stageTimes, setStageTimes] = useState<StageTimes>({});
    const stageTimesRef = useRef<StageTimes>({});
    stageTimesRef.current = stageTimes;
    const [pipelineInfo, setPipelineInfo] = useState<PipelineInfo>(emptyPipelineInfo);

    // ULTRA-FAST Streaming State
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamProgress, setStreamProgress] = useState<StreamProgress | null>(null);
    const [streamingQuestions, setStreamingQuestions] = useState<StreamedQuestion[]>([]);
    const seenQuestionsRef = useRef<Set<string>>(new Set());
    const streamSeqRef = useRef(0);
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

        const droppedFiles = keepReadableFiles(Array.from(e.dataTransfer.files || []));
        if (!droppedFiles.length) return;

        const newFiles: SelectedFile[] = [];
        for (const rawFile of droppedFiles) {
            const file = rawFile.type.startsWith('image/') ? await compressImageFile(rawFile, 1400, 0.8) : rawFile;
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

    // Handle smooth transition from stream completion to preview stage
    useEffect(() => {
        if (pendingParsedData && streamProgress?.stage === 'complete') {
            const timer = setTimeout(() => {
                const t = stageSeconds(stageTimesRef.current, Date.now());
                const total = Math.round((t.uploading + t.analyzing + t.extracting + t.finalizing) * 10) / 10;
                const finished = total > 0 ? { ...pendingParsedData, execution_time_seconds: total } : pendingParsedData;
                setParsedData(finished);
                saveToHistory(finished);
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

    /**
     * What the AI can read: PDFs and pictures (the server takes .pdf, .png, .jpg, .jpeg
     * and .webp; pictures are re-saved as JPG here). Anything else is left out with a
     * message now, rather than failing once processing starts.
     */
    const keepReadableFiles = (raw: File[]): File[] => {
        const readable = (f: File) => /\.(pdf|png|jpe?g|webp)$/i.test(f.name) || f.type === 'application/pdf' || f.type.startsWith('image/');
        const skipped = raw.filter(f => !readable(f));
        if (skipped.length) {
            const names = skipped.map(f => f.name).join(', ');
            toast.error(
                skipped.some(f => /\.(docx?|pptx?|odt|odp|rtf)$/i.test(f.name))
                    ? `${names}: Word and PowerPoint files can't be read yet. Open the file, choose File → Save As → PDF, and upload the PDF.`
                    : `${names}: only PDFs and photos (PNG, JPG, WEBP) can be read.`,
            );
        }
        return raw.filter(readable);
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

    const compressImageFile = async (file: File, maxDim = 1024, quality = 0.75): Promise<File> => {
        if (!file.type.startsWith('image/')) return file;
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file);
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolve(file);
                        } else {
                            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(file);
            };
            img.src = url;
        });
    };

    const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = keepReadableFiles(Array.from(e.target.files || []));
        if (selectedFiles.length === 0) return;

        const newFiles: SelectedFile[] = [];
        for (const rawFile of selectedFiles) {
            const file = rawFile.type.startsWith('image/') ? await compressImageFile(rawFile) : rawFile;
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
        const selectedFiles = keepReadableFiles(Array.from(e.target.files || []));
        if (selectedFiles.length === 0) return;

        const newFiles: SelectedFile[] = [];
        for (const rawFile of selectedFiles) {
            const file = rawFile.type.startsWith('image/') ? await compressImageFile(rawFile) : rawFile;
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

            let { videoWidth: width, videoHeight: height } = video;
            const maxDim = 1600;
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, width, height);

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
                }, 'image/jpeg', 0.85);
            }
        }
        closeCamera();
    };

    const saveToHistory = async (data: ParseResponse) => {
        if (!data) return;
        const qCount = data.questions?.length || 0;
        if (qCount === 0) return;

        const timers = stageSeconds(stageTimesRef.current, Date.now());
        const totalExecTime = data.execution_time_seconds ?? Math.round((timers.uploading + timers.analyzing + timers.extracting + timers.finalizing) * 10) / 10;
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
        const startedAt = Date.now();
        setIsStreaming(true);
        setStreamingQuestions([]);
        setPendingParsedData(null);
        seenQuestionsRef.current = new Set();
        streamSeqRef.current = 0;
        setRunStartedAt(startedAt);
        setStageTimes(advanceStage({}, 'upload', startedAt));
        setPipelineInfo(emptyPipelineInfo());

        // Initialize streamProgress with placeholder so we immediately enter the streaming UI
        setStreamProgress({
            stage: 'uploading',
            percent: 5,
            message: 'Uploading document to server...',
            at: startedAt
        });

        const formData = new FormData();

        // Add all files with client compression (ChatGPT/Gemini 1024px standard: 40MB -> ~600KB)
        let processedCount = 0;
        for (const fileObj of files) {
            processedCount++;
            if (files.length > 2) {
                setStreamProgress({
                    stage: 'uploading',
                    percent: Math.min(5 + Math.round((processedCount / files.length) * 5), 9),
                    message: `Optimizing image ${processedCount} of ${files.length} for fast AI extraction...`,
                    at: Date.now()
                });
            }
            const fileToSend = fileObj.file.type.startsWith('image/')
                ? await compressImageFile(fileObj.file, 1024, 0.75)
                : fileObj.file;
            formData.append('files', fileToSend);
        }

        // Add answer key if provided
        if (answerKeyFile) {
            formData.append('answer_key', answerKeyFile);
        }

        const abortCtrl = new AbortController();
        setAbortController(abortCtrl);

        // Applies one server-sent event. Throws on `error` so it reaches the user
        // (it used to be swallowed by the JSON-parse catch and the UI hung).
        const handleEvent = (event: string, parsed: any): boolean => {
            const at = Date.now();
            switch (event) {
                case 'progress': {
                    const sp: StreamProgress = {
                        stage: parsed.stage,
                        percent: parsed.percent,
                        message: parsed.message,
                        data: parsed.data,
                        at
                    };
                    setStreamProgress(sp);
                    setPipelineInfo(prev => reducePipelineInfo(prev, sp));
                    const key = stageKeyOf(sp.stage);
                    if (key) setStageTimes(prev => advanceStage(prev, key, at));
                    if (parsed.data && parsed.data.quality_tier) {
                        setExtractionMeta({
                            quality_tier: parsed.data.quality_tier,
                            dpi: parsed.data.dpi,
                            warning: parsed.data.warning
                        });
                    }
                    return false;
                }

                case 'question': {
                    const q = parsed.question;
                    if (!q) return false;
                    // Batches (and stateful steps) each number from 1, so ids collide;
                    // only drop a question whose content we've already shown.
                    const fp = questionFingerprint(q);
                    if (fp) {
                        if (seenQuestionsRef.current.has(fp)) return false;
                        seenQuestionsRef.current.add(fp);
                    }
                    const key = `sq-${streamSeqRef.current++}`;
                    setStreamingQuestions(prev => [...prev, { key, question: q, at }]);
                    return false;
                }

                case 'complete': {
                    const hasQuestions = parsed.questions && parsed.questions.length > 0;
                    const hasSections = parsed.sections && parsed.sections.length > 0;
                    if (!hasQuestions && !hasSections) {
                        throw new Error('AI returned 0 questions. Please adjust your file or prompt.');
                    }
                    setStageTimes(prev => advanceStage(prev, 'done', at));
                    setPendingParsedData(parsed);
                    setStreamProgress({
                        stage: 'complete',
                        percent: 100,
                        message: 'All questions processed successfully!',
                        at
                    });
                    return true;
                }

                case 'error':
                    throw new Error(parsed.message || 'Processing failed. Please try again.');

                default:
                    return false;
            }
        };

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
                // H2: /api/ai/* now requires a login (these calls burn Gemini budget).
                headers: {
                    ...(localStorage.getItem('testoza_token')
                        ? { Authorization: `Bearer ${localStorage.getItem('testoza_token')}` }
                        : {})
                },
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

            const dispatch = (): boolean => {
                const event = currentEvent || 'message';
                const payload = currentData;
                currentEvent = '';
                currentData = '';
                if (!payload) return false;
                let parsed: any;
                try {
                    parsed = JSON.parse(payload);
                } catch (e) {
                    console.error('Failed to parse SSE data:', e, payload);
                    return false;
                }
                return handleEvent(event, parsed);
            };

            while (true) {
                const { done, value } = await reader.read();
                if (value) buffer += decoder.decode(value, { stream: true });
                // Flush a final event the server didn't terminate with a blank line.
                if (done) buffer += decoder.decode() + '\n\n';

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) {
                        // Empty line means event completion: dispatch the collected payload
                        if (dispatch()) return;
                        continue;
                    }

                    if (trimmedLine.startsWith('event:')) {
                        currentEvent = trimmedLine.slice(trimmedLine.indexOf(':') + 1).trim();
                    } else if (trimmedLine.startsWith('data:')) {
                        const chunk = trimmedLine.slice(trimmedLine.indexOf(':') + 1).trim();
                        currentData = currentData ? `${currentData}\n${chunk}` : chunk;
                    }
                }

                if (done) break;
            }

            throw new Error('The connection closed before processing finished. Please try again.');

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
                // H2: /api/ai/* now requires a login (these calls burn Gemini budget).
                headers: {
                    ...(localStorage.getItem('testoza_token')
                        ? { Authorization: `Bearer ${localStorage.getItem('testoza_token')}` }
                        : {})
                },
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
            toast.info("Please sign in to save your test.");
            openAuthModal({
                view: 'login',
                redirectPath: '/generate-with-ai'
            });
            return;
        }

        const localDesignation = typeof window !== 'undefined' ? localStorage.getItem('user_designation') : null;
        const hasDesignation = user?.user_metadata?.designation || profile?.designation || localDesignation;

        if (!hasDesignation) {
            try {
                localStorage.setItem('pending_ai_import_test', JSON.stringify({
                    parsedData,
                    mode,
                }));
                localStorage.setItem('auth_redirect_intent', '/generate-with-ai');
            } catch (e) {
                console.warn("Could not save pending test to localStorage", e);
            }
            toast.info("Please set your designation to save your test.");
            navigate('/onboarding');
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

    // Step 1: File Upload — iOS-inspired card layout matching Profile/Support pages
    if (!parsedData && files.length === 0 && !uploadType) {
        return (
            <div className="min-h-[calc(100vh-4rem)] w-full bg-slate-50 dark:bg-slate-950">
                <SEO
                    title="Create Online Test - TestoZa"
                    description="Upload your question paper PDF or photo and let AI turn it into an online test automatically."
                    keywords={["ai test generator", "pdf to quiz", "question paper parser", "exam maker for teachers"]}
                />

                {/* Single OS-native File Input */}
                <input
                    ref={documentInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,image/*"
                    multiple
                    onChange={async (e) => {
                        const selectedFiles = keepReadableFiles(Array.from(e.target.files || []));
                        if (!selectedFiles.length) return;
                        const newFiles: SelectedFile[] = [];
                        for (const rawFile of selectedFiles) {
                            const file = rawFile.type.startsWith('image/') ? await compressImageFile(rawFile, 1400, 0.8) : rawFile;
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

                {/* Hero Header — matching Profile/Support pages */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 pt-6 sm:pt-8 pb-14 sm:pb-16">
                    <div className="max-w-2xl mx-auto">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">AI-Powered</p>
                        <p className="text-xl sm:text-2xl font-bold text-white">Create Your Online Test</p>
                        <p className="text-sm text-slate-400 mt-1">Turn your exam paper into an interactive online test in seconds.</p>
                    </div>
                </div>

                {/* Overlapping card stack */}
                <div className="px-4 -mt-8 sm:-mt-10 pb-8 max-w-2xl mx-auto space-y-3 sm:space-y-4">

                    {/* CARD 1: Primary Upload */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => documentInputRef.current?.click()}
                        className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border overflow-hidden cursor-pointer transition-all duration-200 active:scale-[0.99] ${
                            isDragging
                                ? 'border-indigo-400 ring-2 ring-indigo-100 dark:ring-indigo-900'
                                : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                    >
                        {/* Card header row */}
                        <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center shrink-0">
                                    <FileUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Upload Question Paper</p>
                                    <p className="text-[11px] text-slate-400">PDF or photos</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">⭐ Recommended</span>
                        </div>

                        {/* Card body */}
                        <div className="p-4 space-y-3.5">
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Select a PDF or photos of your exam paper. We'll automatically extract questions and convert it into an online test. Word or PowerPoint? Save it as PDF first.
                            </p>

                            {/* Primary CTA */}
                            <button
                                type="button"
                                className="w-full inline-flex items-center justify-center gap-2 bg-[#007AFF] hover:bg-[#0062CC] active:bg-[#0051B3] text-white font-semibold text-sm h-11 rounded-xl shadow-sm transition-colors"
                            >
                                <Upload className="w-4 h-4" />
                                <span>Choose File</span>
                            </button>

                            {/* Meta info */}
                            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                                <span>⚡ Ready in ~2–3 minutes</span>
                            </div>
                        </div>
                    </div>

                    {/* CARD 2: Manual Creation — iOS list row style */}
                    <div
                        onClick={() => { window.location.href = '/create-test'; }}
                        className="group bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors active:scale-[0.99]"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                                <PencilLine className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Create Test Manually</p>
                                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">Type or paste questions with full control.</p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-[#007AFF] transition-colors" />
                    </div>

                    {/* Help link */}
                    <div className="pt-1 flex justify-center">
                        <button
                            type="button"
                            onClick={() => setShowHelpDialog(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                            <span>How it works</span>
                        </button>
                    </div>
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
                                        <p className="text-xs text-slate-500">Click "Choose File" and upload your exam paper as a PDF or photos (save Word or PowerPoint files as PDF first).</p>
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
                    accept=".pdf,.png,.jpg,.jpeg,.webp,image/*"
                    multiple
                    onChange={async (e) => {
                        const selectedFiles = keepReadableFiles(Array.from(e.target.files || []));
                        if (!selectedFiles.length) return;
                        const newFiles: SelectedFile[] = [];
                        for (const rawFile of selectedFiles) {
                            const file = rawFile.type.startsWith('image/') ? await compressImageFile(rawFile, 1400, 0.8) : rawFile;
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
                                        <div className="flex items-center justify-between gap-1 flex-wrap">
                                            <label className="text-xs font-semibold text-slate-650 dark:text-slate-300">
                                                🎯 Target Difficulty
                                            </label>
                                            <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
                                                For generating questions only
                                            </span>
                                        </div>
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
                                            Controls question complexity &amp; reasoning depth for AI generated questions.
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

                            <div className="text-center space-y-1 mt-3 sm:mt-5 px-2">
                                <h2 className="text-xs sm:text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug tracking-tight">
                                    How do you want to process {hasImages && hasPDF ? 'these files' : 'this file'}?
                                </h2>
                                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                                    Choose a mode based on your goal
                                </p>
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

    // Step 3: Live processing — streamed questions with real progress
    if (loading || generatingMore) {
        if (isStreaming) {
            const finalCount = pendingParsedData
                ? (pendingParsedData.questions?.length
                    || (pendingParsedData.sections || []).reduce((sum, sec) => sum + (sec.questions?.length || 0), 0))
                : null;
            return (
                <ProcessingView
                    mode={mode}
                    files={files.map(f => ({ name: f.file.name, size: f.file.size, type: f.type }))}
                    progress={streamProgress}
                    info={pipelineInfo}
                    questions={streamingQuestions}
                    stageTimes={stageTimes}
                    startedAt={runStartedAt || Date.now()}
                    finalCount={finalCount}
                    extractionMeta={extractionMeta}
                    onCancel={handleCancelStream}
                />
            );
        }

        // "Generate more" still uses the one-shot endpoint
        return (
            <div className="aix aix-page">
                <div className="aix-center">
                    <div className="aix-card" role="status" aria-live="polite">
                        <div className={`aix-appicon aix-appicon--live ${mode === 'generate' ? 'aix-appicon--generate' : ''}`} aria-hidden="true">
                            {mode === 'extract' ? <ClipboardList /> : <Sparkles />}
                        </div>
                        <h2>{generatingMore ? 'Generating more questions' : (mode === 'extract' ? 'Extracting questions' : 'Generating questions')}</h2>
                        <p>{progress || 'AI is reading the rest of your document. This usually takes a minute or two.'}</p>
                        <div className="aix-bar aix-bar--live" style={{ marginTop: 22 }}>
                            <div className="aix-skel-bar" style={{ height: '100%' }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Step 4: Review & save
    if (parsedData) {
        return (
            <ErrorBoundary>
                <SEO title="Review your questions" description="Review AI-extracted questions before saving your test." noindex />
                <PreviewView
                    data={parsedData}
                    mode={mode}
                    extractionMeta={extractionMeta}
                    durationSeconds={parsedData.execution_time_seconds}
                    saving={savingTest}
                    canGenerateMore={files.length > 0 && !!mode}
                    generatingMore={generatingMore}
                    onTryAgain={() => { setParsedData(null); setMode(null); }}
                    onEdit={handleImport}
                    onSave={handleDirectSave}
                    onGenerateMore={() => mode && handleProcess(mode, true)}
                    onGenerateInstead={() => handleProcess('generate')}
                    onDownloadJSON={handleDownloadJSON}
                />
            </ErrorBoundary>
        );
    }

    return null;
}
