import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Question, createTest, fetchTestById, updateTest, TestSection } from '@/lib/testsApi';
import { toast } from 'sonner';
import { Plus, Trash2, Save, ArrowLeft, Loader2, Upload, CheckSquare, Square, Languages, X, Check, ChevronsUpDown, GripVertical, Cloud, CloudOff, FileText, Eraser, Info, ImageIcon, PenLine, MoreVertical, Settings, Monitor, ChevronDown, ChevronUp, Grip, Palette, Type, Smartphone, ExternalLink, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { IMEInput, IMEInputHandle } from '@/components/ui/IMEInput';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { AdvancedQuestionEditor } from '@/components/AdvancedQuestionEditor';
import { Calculator } from 'lucide-react';
import { Wifi, WifiOff } from 'lucide-react';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { fetchCategories } from '@/lib/categoriesApi';
import slugify from 'slugify';

import { TestUploadFormatGuide } from '@/components/TestUploadFormatGuide';
import PremiumGuard from '@/components/premium/PremiumGuard';
const JsonImporter = React.lazy(() => import('@/components/test-builder/JsonImporter').then(m => ({ default: m.JsonImporter })));
const ScreenshotCaptureModal = React.lazy(() => import('@/components/test-builder/ScreenshotCaptureModal').then(m => ({ default: m.ScreenshotCaptureModal })));
const MathKeyboard = React.lazy(() => import('./math-keyboard').then(m => ({ default: m.MathKeyboard })));
const AiPromptGuide = React.lazy(() => import('./AiPromptGuide').then(m => ({ default: m.AiPromptGuide })));

interface QuestionState extends Omit<Question, 'correctAnswer' | 'options'> {
    options: { [key: string]: string };
    correctAnswer: any;
    typingMode: 'en' | 'hi';
}

const DEFAULT_QUESTION: QuestionState = {
    id: 1,
    type: 'single',
    question: '',
    passageContent: '',
    groupId: '',
    options: { A: '', B: '', C: '', D: '' },
    correctAnswer: '',

    typingMode: 'en',
    marks: '1',
    negativeMarks: '0'
};

interface TestBuilderProps {
    initialData?: any;
    onSuccess?: () => void;
    onCancel?: () => void;
    onAiImport?: () => void;
}

export default function TestBuilder({ initialData, onSuccess, onCancel, onAiImport }: TestBuilderProps) {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Fallback to URL params if no initialData provided (for direct route access)
    const { id: paramId } = useParams();
    const testId = initialData?.id || paramId;
    const isEditMode = !!testId;

    const { isPremium, loading: premiumLoading } = usePremiumStatus();
    const [loading, setLoading] = useState(false);

    // Test Metadata State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [revisionNotes, setRevisionNotes] = useState('');
    const [institutionName, setInstitutionName] = useState('');
    const [institutionLogo, setInstitutionLogo] = useState('');
    const [institutionColor, setInstitutionColor] = useState('#475569');
    const [institutionFont, setInstitutionFont] = useState('inherit');
    const [showInstitutePreview, setShowInstitutePreview] = useState(false);
    const [previewImageIndex, setPreviewImageIndex] = useState(0);
    const [time, setTime] = useState<number>(30);
    const [marks, setMarks] = useState<number>(1);
    const [negativeMarks, setNegativeMarks] = useState<number>(0);
    const [isPublic, setIsPublic] = useState(false);

    // Category State
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);

    // Tags State
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");

    // Custom Category ("Other") State
    const [showOtherCategory, setShowOtherCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState("");

    // Questions State
    const [questions, setQuestions] = useState<QuestionState[]>([DEFAULT_QUESTION]);
    const [lastTypingMode, setLastTypingMode] = useState<'en' | 'hi'>('en');
    const [isDragging, setIsDragging] = useState(false);

    // Description typing mode
    const [descriptionLanguage, setDescriptionLanguage] = useState<'en' | 'hi'>('en');

    // Online/Offline State
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Section Mode & Calculator State
    type SectionState = TestSection & { questions: QuestionState[]; colorIndex?: number };
    const [enableSectionMode, setEnableSectionMode] = useState(false);
    const [sectionMarkingModel, setSectionMarkingModel] = useState<'section-wise' | 'question-wise'>('section-wise');
    const [hasScientificCalculator, setHasScientificCalculator] = useState(false);
    const [sections, setSections] = useState<SectionState[]>([
        {
            id: 'section-1',
            name: 'Section A',
            questions: [DEFAULT_QUESTION],
            marks_per_question: 1,
            negative_marks: 0,
            question_type: 'single',
            colorIndex: 0
        }
    ]);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
    const [swappedSections, setSwappedSections] = useState<Set<string>>(new Set());
    const [swapGlowSections, setSwapGlowSections] = useState<Set<string>>(new Set());
    const [showSupportedFormats, setShowSupportedFormats] = useState(false);
    const [showAdvancedFormats, setShowAdvancedFormats] = useState(false);
    const [showMathKeyboard, setShowMathKeyboard] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    // Merged Section Marks State
    const [mergedSections, setMergedSections] = useState<{ label: string; section_ids: string[] }[]>([]);

    // Helper to extract common prefix from section names
    const getCommonPrefix = (names: string[]): string => {
        if (names.length === 0) return '';
        const sorted = [...names].sort();
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        let i = 0;
        while (i < first.length && first[i] === last[i]) i++;
        let prefix = first.substring(0, i).replace(/[-_\s]+$/, '').trim();
        return prefix || names[0];
    };

    // Auto Save State
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // UX State for Image Inputs
    const [expandedImageInputs, setExpandedImageInputs] = useState<Record<string, boolean>>({});
    const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({});

    // Screenshot Capture State
    const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
    const [captureTarget, setCaptureTarget] = useState<{ type: 'question' | 'option', qIdx: number, optKey?: string } | null>(null);

    // --- Cloudinary Integration ---
    // --- Cloudinary Integration ---
    const imeRefs = React.useRef<Record<string, IMEInputHandle | null>>({});
    const [isCloudUploadOpen, setIsCloudUploadOpen] = useState(false);
    const [cloudUploadTarget, setCloudUploadTarget] = useState<string | null>(null);
    const cloudUploadBoxRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isCloudUploadOpen && cloudUploadBoxRef.current) {
            // Small timeout to ensure the DOM has painted before focusing
            setTimeout(() => cloudUploadBoxRef.current?.focus(), 50);
        }
    }, [isCloudUploadOpen]);

    const openCloudUploadModal = (e: React.MouseEvent, refId: string) => {
        e.preventDefault();
        setCloudUploadTarget(refId);
        setIsCloudUploadOpen(true);
    };

    const handleCloudinaryUpload = async (e: any, refId: string) => {
        const file = e.target?.files?.[0] || e.clipboardData?.files?.[0];
        if (!file || !file.type.startsWith('image/')) {
            if (e.target && e.target.value !== undefined) e.target.value = '';
            toast.error("Please provide a valid image file.");
            return;
        }

        const uploadPreset = "TestoZa_cloudinary";
        const cloudName = "dma0h19mk";

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        toast.info("Uploading image...");
        setIsCloudUploadOpen(false); // Optimistic close
        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (data.secure_url) {
                const markdownLink = `![image](${data.secure_url})`;
                imeRefs.current[refId]?.insertAtCursor(markdownLink);
            } else {
                toast.error("Cloudinary upload failed");
            }
        } catch (error) {
            console.error("Cloudinary error:", error);
            toast.error("Upload error");
        } finally {
            if (e.target && e.target.value !== undefined) e.target.value = ''; // Reset file input
        }
    };

    const openCaptureModal = (type: 'question' | 'option', qIdx: number, optKey?: string) => {
        setCaptureTarget({ type, qIdx, optKey });
        setIsCaptureModalOpen(true);
    };

    const handleScreenshotCapture = (base64: string) => {
        if (!captureTarget) return;

        if (captureTarget.type === 'question') {
            updateQuestion(captureTarget.qIdx, 'image', base64);
        } else if (captureTarget.type === 'option' && captureTarget.optKey) {
            const nq = [...questions];
            if (!nq[captureTarget.qIdx].optionImages) nq[captureTarget.qIdx].optionImages = {};
            nq[captureTarget.qIdx].optionImages![captureTarget.optKey] = base64;
            setQuestions(nq);
        }
        setIsCaptureModalOpen(false);
    };

    const toggleImageInput = (id: string | number) => {
        setExpandedImageInputs(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success("Back online!");
        };
        const handleOffline = () => {
            setIsOnline(false);
            toast.error("You are offline. Transliteration may not work.");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);



    // Scroll to top on page load and blur active elements to prevent autofocus issues
    useEffect(() => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);


    // Load Categories
    useEffect(() => {
        fetchCategories().then(({ data }) => {
            if (data) setCategories(data);
        });
    }, []);

    // Track loaded ID to prevent re-fetching/resetting on parent re-renders
    const loadedTestId = React.useRef<string | null>(null);
    const lastInitialDataRef = React.useRef<any>(null);

    // Load Existing Test Data
    useEffect(() => {

        const targetId = initialData?.id || (isEditMode ? testId : null);

        // If we already loaded this test ID, don't reload/reset state
        if (targetId && loadedTestId.current === targetId) {
            return;
        }

        // If initialData is provided directly, populate from it
        // Check if it's actually new data (not the same reference or deep equal)
        const isNewInitialData = initialData &&
            JSON.stringify(initialData) !== JSON.stringify(lastInitialDataRef.current);

        if (initialData && isNewInitialData) {
            populateData(initialData);
            loadedTestId.current = initialData.id || 'imported-data';
            lastInitialDataRef.current = initialData;
            // We also need to fetch categories for this test if not in initialData
            if (initialData.id) {
                fetchAndSetCategories(initialData.id);
            }
            if (initialData.tags) setTags(initialData.tags);
            return;
        } else if (initialData && !isNewInitialData) {
        }

        // Otherwise fetch from ID
        if (isEditMode && testId && user) {
            setLoading(true);
            fetchTestById(testId).then(async ({ data, error }) => {
                if (data) {
                    if (data.created_by !== user.id && !isAdmin) {
                        toast.error("You can only edit your own tests");
                        navigate('/my-tests');
                        return;
                    }
                    populateData(data);
                    loadedTestId.current = data.id;
                    await fetchAndSetCategories(data.id);
                    if (data.tags) setTags(data.tags);
                } else {
                    toast.error("Test not found");
                }
                setLoading(false);
            });
        }
    }, [testId, isEditMode, user, navigate, initialData]);

    // Load Draft on Mount
    useEffect(() => {
        // Only restore draft if creating a new test (no ID) and draft exists
        if (!testId && !initialData) {
            const draft = localStorage.getItem('create_test_draft');
            if (draft) {
                try {
                    const parsed = JSON.parse(draft);
                    populateData(parsed);
                    // If categories were saved, restore them too
                    if (parsed.selectedCategories) {
                        setSelectedCategories(parsed.selectedCategories);
                    }
                    if (parsed.tags) {
                        setTags(parsed.tags);
                    }
                    toast.success("Your test draft has been restored. You can continue editing.");
                } catch (e) {
                    console.error("Failed to parse draft", e);
                }
            }
        }
    }, [testId, initialData]);

    // Auto-Save Effect
    useEffect(() => {
        if (loading) return; // Don't save while initial loading

        // Don't auto-save if we are in "edit existing" mode -- that uses the API auto-save
        // We only want localStorage draft for NEW tests (unpersisted)
        if (isEditMode && testId) {
            const timer = setTimeout(() => {
                handleAutoSave();
            }, 2000); // 2 second debounce
            return () => clearTimeout(timer);
        }

        // For new tests (guest or user creating new), save to localStorage
        if (!isEditMode) {
            const timer = setTimeout(() => {
                // Prevent saving empty draft immediately on mount which could clobber loaded JSON
                if (!title && questions.length === 1 && questions[0].question === '') return;

                const draftData = {
                    title,
                    description,
                    revision_notes: revisionNotes,
                    institution_name: institutionName,
                    institution_logo: institutionLogo,
                    duration: time,
                    is_public: isPublic,
                    questions,
                    selectedCategories,
                    enable_section_mode: enableSectionMode,
                    sections
                };
                localStorage.setItem('create_test_draft', JSON.stringify(draftData));
            }, 1000);
            return () => clearTimeout(timer);
        }

    }, [questions, sections, enableSectionMode, title, description, revisionNotes, time, marks, negativeMarks, isPublic, selectedCategories, isEditMode, testId, institutionName, institutionLogo, mergedSections]);

    const handleAutoSave = async () => {
        if (!title.trim()) return; // Silent fail if no title

        if (saveStatus !== 'saving') setSaveStatus('saving');
        try {
            await performSave(true);
            setSaveStatus('saved');
            setLastSaved(new Date());
        } catch (error) {
            console.error("Auto-save failed", error);
            setSaveStatus('error');
        }
    };

    const fetchAndSetCategories = async (tid: string) => {
        if (!tid) return; // Skip if no test ID (e.g., imported data)
        const { fetchTestCategories } = await import('@/lib/categoriesApi');
        const { data: catData } = await fetchTestCategories(tid);
        if (catData) {
            setSelectedCategories(catData);
        }
    };

    const populateData = (data: any) => {

        if (!data) {
            console.error("[TestBuilder] populateData received null/undefined data");
            return;
        }

        let parsedQuestions = data.questions;
        if (typeof parsedQuestions === 'string') {
            try { parsedQuestions = JSON.parse(parsedQuestions); } catch (e) { parsedQuestions = []; }
        }

        let parsedSections = data.sections;
        if (typeof parsedSections === 'string') {
            try { parsedSections = JSON.parse(parsedSections); } catch (e) { parsedSections = []; }
        }

        const hasQuestions = parsedQuestions && Array.isArray(parsedQuestions);
        const hasSections = parsedSections && Array.isArray(parsedSections);

        if (!hasQuestions && !hasSections) {
            console.warn("[TestBuilder] populateData received data without valid questions or sections array or they are empty.");
        }
        setTitle(data.title || '');
        setDescription(data.description || '');
        setRevisionNotes(data.revision_notes || '');
        setInstitutionName(data.institution_name || '');
        setInstitutionLogo(data.institution_logo || '');
        setInstitutionColor(data.institution_color || '#475569');
        setInstitutionFont(data.institution_font || 'inherit');
        setTime(data.duration || 30);
        setMarks(data.marks_per_question || 4);
        setNegativeMarks(data.negative_marks || 1);
        setIsPublic(data.is_public ?? false);

        // CLEAR old data so React registers a sharp state transition
        setQuestions([]);
        setSections([]);

        const seenIds = new Set<string | number>();
        let highestId = 0;

        // Auto-scan to find highest existing ID across all incoming data for resilient increments
        const scanForHighId = (arr: any[]) => {
            arr.forEach(item => {
                if (item && typeof item.id === 'number' && item.id > highestId) {
                    highestId = item.id;
                }
            });
        };

        if (hasQuestions) scanForHighId(parsedQuestions as any[]);
        if (hasSections) {
            (parsedSections as any[]).forEach(s => {
                if (s.questions && Array.isArray(s.questions)) scanForHighId(s.questions);
            });
        }

        const mapQuestion = (q: any, index: number) => {
            let resolvedId = q.id || index + 1;

            // Seamlessly fix duplicate IDs: If we've already registered this ID, auto-increment it natively
            if (seenIds.has(resolvedId)) {
                highestId += 1;
                resolvedId = highestId;
            }
            seenIds.add(resolvedId);

            let mappedQ = {
                ...q,
                id: resolvedId,
                type: q.type || 'single',
                question: q.question || q.questionText || '',
                typingMode: 'en' as const,
                marks: q.marks !== undefined ? String(q.marks) : '4',
                negativeMarks: q.negativeMarks !== undefined ? String(q.negativeMarks) : '1',
            };

            let flatOptions: { [key: string]: string } = {};
            let flatOptionImages: { [key: string]: string } = q.optionImages || {};

            if (q.options && typeof q.options === 'object') {
                Object.keys(q.options).forEach(key => {
                    const val = q.options[key];
                    if (val && typeof val === 'object' && val.text !== undefined) {
                        flatOptions[key] = val.text || '';
                        if (val.image) flatOptionImages[key] = val.image;
                    } else {
                        flatOptions[key] = String(val || '');
                    }
                });
                if (Object.keys(flatOptionImages).length > 0) {
                    mappedQ.optionImages = flatOptionImages;
                }
            } else if (!q.options) {
                flatOptions = { A: '', B: '', C: '', D: '' };
            }

            // Fallback: If no correct answer is given but it's single choice, default to 'A'
            // If numerical, ensure the min/max keys exist
            if (mappedQ.type === 'single' && !mappedQ.correctAnswer) {
                mappedQ.correctAnswer = 'A';
            } else if (mappedQ.type === 'numerical') {
                if (!mappedQ.correctAnswer || typeof mappedQ.correctAnswer !== 'object') {
                    mappedQ.correctAnswer = { min: 0, max: 0 };
                }
            }

            mappedQ.options = flatOptions;
            return mappedQ;
        };

        // Defer actual population by 1 tick so React commits the empty arrays first
        setTimeout(() => {
            if (data.enable_section_mode && hasSections) {
                setEnableSectionMode(true);
                setSections(parsedSections.map((s: any, sIdx: number) => ({
                    ...s,
                    colorIndex: s.colorIndex !== undefined ? s.colorIndex : sIdx,
                    questions: (s.questions || []).map(mapQuestion)
                })));
            } else if (hasQuestions) {
                const mappedQuestions = (parsedQuestions as any[]).map(mapQuestion);
                setQuestions(mappedQuestions);
            } else {
                // Fallback to default if somehow completely empty
                setQuestions([{ ...DEFAULT_QUESTION }]);
            }
        }, 0);

        setHasScientificCalculator(data.has_scientific_calculator || false);
        setSectionMarkingModel(data.section_marking_model || 'section-wise');
        setMergedSections(data.merged_sections || []);

        if (data.custom_category) {
            setShowOtherCategory(true);
            setCustomCategory(data.custom_category);
        }

        // Show success message when importing data
        const count = (data.enable_section_mode && hasSections)
            ? data.sections.reduce((acc: number, s: any) => acc + (s.questions?.length || 0), 0)
            : (hasQuestions ? data.questions.length : 0);

        if (count > 0) {
            toast.success(`Successfully loaded ${count} question${count > 1 ? 's' : ''}!`);
        }
    };

    const handleAddQuestion = () => {
        const lastQ = questions.length > 0 ? questions[questions.length - 1] : null;
        setQuestions([
            ...questions,
            {
                ...DEFAULT_QUESTION,
                id: questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1,
                options: { ...DEFAULT_QUESTION.options },
                typingMode: lastTypingMode,
                marks: lastQ ? (lastQ.marks || '4') : '4',
                negativeMarks: lastQ ? (lastQ.negativeMarks || '1') : '1'
            }
        ]);
    };

    const handleRemoveQuestion = (index: number) => {
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        setQuestions(newQuestions);
    };

    const sanitizeNumericalMark = (val: string): string => {
        // Remove anything that isn't a digit or a decimal point
        let sanitized = val.replace(/[^0-9.]/g, '');
        // Ensure only one decimal point
        const parts = sanitized.split('.');
        if (parts.length > 2) {
            sanitized = parts[0] + '.' + parts.slice(1).join('');
        }
        return sanitized;
    };

    const updateQuestion = (index: number, field: keyof QuestionState, value: any) => {
        const newQuestions = [...questions];
        let finalValue = value;

        // Sanitize marks and negativeMarks to prevent negative inputs
        if ((field === 'marks' || field === 'negativeMarks') && typeof value === 'string') {
            finalValue = sanitizeNumericalMark(value);
        }

        newQuestions[index] = { ...newQuestions[index], [field]: finalValue };
        setQuestions(newQuestions);
    };

    const handleQuestionTypeChange = (index: number, type: string) => {
        const newQuestions = [...questions];
        const newQ = { ...newQuestions[index] }; // Create a copy of the question object

        if (type === 'comprehension') {
            // "Comprehension" selection acts as a "Create Passage" action
            // It sets the type to 'single' (default Inner type) but assigns a groupId
            newQ.type = 'single';
            newQ.correctAnswer = '';
            if (!newQ.groupId) newQ.groupId = Math.random().toString(36).substr(2, 9);
        } else {
            // Normal type change
            newQ.type = type as any;

            // Reset answers based on type
            if (type.startsWith('single')) newQ.correctAnswer = '';
            else if (type === 'multiple') newQ.correctAnswer = [];
            else if (type === 'numerical') newQ.correctAnswer = { min: 0, max: 0, exactMatch: false, exactAnswers: '' };
        }

        newQuestions[index] = newQ;
        setQuestions(newQuestions);
    };

    const updatePassageContent = (groupId: string, content: string) => {
        const newQuestions = questions.map(q =>
            q.groupId === groupId ? { ...q, passageContent: content } : q
        );
        setQuestions(newQuestions);
    };

    const handleAddSubQuestion = (index: number) => {
        const parentQ = questions[index];
        if (!parentQ.groupId) return;

        const newQ: QuestionState = {
            ...DEFAULT_QUESTION,
            id: Math.max(0, ...questions.map(q => q.id)) + 1,
            type: 'single', // Default to single
            groupId: parentQ.groupId,
            passageContent: parentQ.passageContent,
            options: { ...DEFAULT_QUESTION.options },
            typingMode: lastTypingMode,
            marks: parentQ.marks || '4',
            negativeMarks: parentQ.negativeMarks || '1'
        };

        const newQuestions = [...questions];
        // Insert after the last question of this group
        let insertIndex = index;
        for (let i = index + 1; i < questions.length; i++) {
            if (questions[i].groupId === parentQ.groupId) insertIndex = i;
            else break;
        }

        newQuestions.splice(insertIndex + 1, 0, newQ);
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, optKey: string, value: string) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options = { ...newQuestions[qIndex].options, [optKey]: value };
        setQuestions(newQuestions);
    };

    const processImageUrl = (url: string) => {
        if (!url) return url;
        const driveRegex = /drive\.google\.com\/file\/d\/([-_\w]+)/;
        const match = url.match(driveRegex);
        if (match && match[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        const openRegex = /drive\.google\.com\/open\?id=([-_\w]+)/;
        const openMatch = url.match(openRegex);
        if (openMatch && openMatch[1]) return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
        return url;
    };

    // Helper to get next option letter
    const getNextOptionLabel = (currentOptions: { [key: string]: string }) => {
        const keys = Object.keys(currentOptions).sort();
        if (keys.length === 0) return 'A';
        const lastKey = keys[keys.length - 1];
        return String.fromCharCode(lastKey.charCodeAt(0) + 1);
    };

    // Standard Mode Option Handlers
    const handleAddOption = (qIndex: number) => {
        const newQuestions = [...questions];
        const q = newQuestions[qIndex];
        const nextLabel = getNextOptionLabel(q.options);
        q.options = { ...q.options, [nextLabel]: '' };
        setQuestions(newQuestions);
    };

    const handleRemoveOption = (qIndex: number, optKey: string) => {
        const newQuestions = [...questions];
        const q = newQuestions[qIndex];

        // Remove from options
        const newOptions = { ...q.options };
        delete newOptions[optKey];
        q.options = newOptions;

        // Remove from images
        if (q.optionImages && q.optionImages[optKey]) {
            const newImages = { ...q.optionImages };
            delete newImages[optKey];
            q.optionImages = newImages;
        }

        // Remove from correct answer if selected
        if (q.type === 'multiple' && Array.isArray(q.correctAnswer)) {
            q.correctAnswer = q.correctAnswer.filter((k: string) => k !== optKey);
        } else if (q.correctAnswer === optKey) {
            q.correctAnswer = '';
        }

        setQuestions(newQuestions);
    };

    // Section Mode Option Handlers
    const handleAddOptionToSection = (sIdx: number, qIdx: number) => {
        const newSections = [...sections];
        const q = newSections[sIdx].questions[qIdx];
        const nextLabel = getNextOptionLabel(q.options);
        q.options = { ...q.options, [nextLabel]: '' };
        setSections(newSections);
    };

    const handleRemoveOptionFromSection = (sIdx: number, qIdx: number, optKey: string) => {
        const newSections = [...sections];
        const q = newSections[sIdx].questions[qIdx];

        // Remove from options
        const newOptions = { ...q.options };
        delete newOptions[optKey];
        q.options = newOptions;

        // Remove from images
        if (q.optionImages && q.optionImages[optKey]) {
            const newImages = { ...q.optionImages };
            delete newImages[optKey];
            q.optionImages = newImages;
        }

        // Remove from correct answer if selected
        if (q.type === 'multiple' && Array.isArray(q.correctAnswer)) {
            q.correctAnswer = q.correctAnswer.filter((k: string) => k !== optKey);
        } else if (q.correctAnswer === optKey) {
            q.correctAnswer = '';
        }

        setSections(newSections);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 50 * 1024) {
            toast.error("Image size must be less than 50KB");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => callback(reader.result as string);
        reader.readAsDataURL(file);
    };

    const performSave = async (isAuto: boolean) => {
        // Sanitize helper
        const sanitizeQ = (q: any) => {
            const { typingMode, ...rest } = q;
            return {
                ...rest,
                image: q.image ? q.image.trim() : q.image,
                optionImages: q.optionImages ? Object.fromEntries(
                    Object.entries(q.optionImages).map(([k, v]) => [k, v ? (v as string).trim() : v])
                ) : undefined
            };
        };

        const sanitizedQuestions = questions.map(sanitizeQ);

        const sanitizedSections = enableSectionMode ? sections.map(s => ({
            ...s,
            questions: s.questions.map(sanitizeQ)
        })) : undefined;

        const testDataPayload = {
            title,
            description,
            revision_notes: revisionNotes,
            duration: time,
            is_public: isPublic,
            // If section mode, we can either save empty questions or flat map them. 
            // Saving flat map ensures backward compatibility for some views (like listing count).
            questions: enableSectionMode
                ? sanitizedSections!.flatMap(s => s.questions)
                : sanitizedQuestions,
            institution_name: institutionName,
            institution_logo: institutionLogo,
            institution_color: institutionColor,
            institution_font: institutionFont,
            slug: title ? slugify(title, { lower: true, strict: true }) + '-' + Math.random().toString(36).substr(2, 4) : undefined,
            tags: tags,
            custom_category: showOtherCategory && customCategory.trim() ? customCategory.trim() : null,

            // New Fields
            enable_section_mode: enableSectionMode,
            section_marking_model: sectionMarkingModel,
            has_scientific_calculator: hasScientificCalculator,
            sections: sanitizedSections,
            // Only include merged_sections when there's actual data (column may not exist in DB)
            ...(enableSectionMode && mergedSections.length > 0 ? { merged_sections: mergedSections } : {})
        };

        if (isEditMode && testId) {
            const { error } = await updateTest(testId, testDataPayload, isAdmin);
            if (error) throw error;
            if (selectedCategories.length > 0) {
                const { assignCategoriesToTest } = await import('@/lib/categoriesApi');
                await assignCategoriesToTest(testId, selectedCategories, isAdmin);
            }
        } else {
            if (isAuto) throw new Error("Auto-save not supported for new unsaved tests yet");

            const { getNextTestId } = await import('@/lib/testsApi');
            const customId = await getNextTestId('M');
            const newTest = {
                ...testDataPayload,
                created_by: user.id,
                custom_id: customId,
                creator_name: user.user_metadata?.full_name || 'Anonymous',
                creator_avatar: user.user_metadata?.avatar_url || '',
                created_at: new Date().toISOString()
            };
            const { data, error } = await createTest(newTest);
            if (error) throw error;
            if (selectedCategories.length > 0) {
                const { assignCategoriesToTest } = await import('@/lib/categoriesApi');
                await assignCategoriesToTest(data.id, selectedCategories);
            }

            // --- NOTIFICATION LOGIC ---
            if (isPublic) {
                // Fire and forget notification process to avoid blocking UI
                (async () => {
                    try {
                        const { getFollowers, createNotification } = await import('@/lib/socialApi');
                        const { data: followers } = await getFollowers(user.id);
                        if (followers && followers.length > 0) {
                            const notifications = followers.map(f =>
                                createNotification(
                                    f.follower_id,
                                    `New Test: ${title}`,
                                    `${user.user_metadata?.full_name || 'A creator'} published a new test.`,
                                    `/test-intro/${data.id}`
                                )
                            );
                            await Promise.all(notifications);
                        }
                    } catch (notifError) {
                        console.error("Failed to send notifications:", notifError);
                    }
                })();
            }
        }
    };

    const handleSave = async () => {
        if (!user) {
            // Save current draft state before redirecting
            const draftData = {
                title, description, revision_notes: revisionNotes, institution_name: institutionName, institution_logo: institutionLogo, institution_color: institutionColor, institution_font: institutionFont,
                duration: time, is_public: isPublic,
                questions, selectedCategories,
                // Save new state too
                enable_section_mode: enableSectionMode,
                has_scientific_calculator: hasScientificCalculator,
                sections
            };
            localStorage.setItem('create_test_draft', JSON.stringify(draftData));
            localStorage.setItem('auth_redirect_intent', '/create-test');

            toast.error("Please login to save your test. Redirecting...");
            setTimeout(() => navigate('/login'), 1500);
            return;
        }
        if (!title.trim()) { toast.error("Test Title is required"); return; }

        // Validation Logic
        const validateQuestions = (list: any[], context = "Question") => {
            for (let i = 0; i < list.length; i++) {
                const q = list[i];
                const hasQuestionContent = q.question.trim() || q.image;
                if (!hasQuestionContent) return `${context} ${i + 1} must have either text or an image`;

                if (q.type === 'numerical') {
                    const ans = q.correctAnswer as any;
                    if (!ans || typeof ans !== 'object') {
                        return `${context} ${i + 1} (Numerical) has invalid config`;
                    }
                    if (ans.exactMatch) {
                        if (!ans.exactAnswers || !ans.exactAnswers.trim()) {
                            return `${context} ${i + 1} (Numerical) exact answers cannot be empty`;
                        }
                    } else {
                        if (ans.min === undefined || ans.max === undefined) {
                            return `${context} ${i + 1} (Numerical) must have a Min and Max value`;
                        }
                        if (Number(ans.min) > Number(ans.max)) {
                            return `${context} ${i + 1}: Min cannot be greater than Max`;
                        }
                    }
                } else {
                    for (const opt of Object.keys(q.options)) {
                        const hasOptionContent = q.options[opt].trim() || (q.optionImages && q.optionImages[opt]);
                        if (!hasOptionContent) return `Option ${opt} for ${context} ${i + 1} is required`;
                    }
                    if (!q.correctAnswer || (Array.isArray(q.correctAnswer) && q.correctAnswer.length === 0)) {
                        return `Please select a correct answer for ${context} ${i + 1}`;
                    }
                }
            }
            return null;
        };

        if (enableSectionMode) {
            if (sections.length === 0) { toast.error("At least one section is required"); return; }
            for (let sIdx = 0; sIdx < sections.length; sIdx++) {
                const section = sections[sIdx];
                if (!section.name.trim()) { toast.error(`Section ${sIdx + 1} name is required`); return; }
                if (section.questions.length === 0) { toast.error(`Section "${section.name}" must have at least one question`); return; }

                const error = validateQuestions(section.questions, `Section "${section.name}" Question`);
                if (error) { toast.error(error); return; }
            }
        } else {
            if (questions.length === 0) { toast.error("At least one question is required"); return; }
            const error = validateQuestions(questions);
            if (error) { toast.error(error); return; }
        }

        setLoading(true);
        try {
            await performSave(false);
            localStorage.removeItem('create_test_draft');
            toast.success(isEditMode ? "Test updated successfully!" : "Test created successfully!");
            if (onSuccess) onSuccess();
            else navigate('/my-tests');
        } catch (error: any) {
            console.error("Error saving test:", error);
            toast.error("Failed to save test: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleQuestionLanguage = (index: number, mode: 'en' | 'hi') => {
        const newQuestions = [...questions];
        newQuestions[index].typingMode = mode;
        setQuestions(newQuestions);
        setLastTypingMode(mode);
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        // Only allow drag if initiated from the grip handle
        const target = e.target as HTMLElement;
        if (!target.closest('.drag-handle')) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('questionIndex', index.toString());
        setIsDragging(true);
    };
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDropQuestion = (e: React.DragEvent, dropIndex: number) => {
        const dragIndex = parseInt(e.dataTransfer.getData('questionIndex'));
        if (!isNaN(dragIndex) && dragIndex !== dropIndex) {
            const newQuestions = [...questions];
            const [reorderedItem] = newQuestions.splice(dragIndex, 1);
            newQuestions.splice(dropIndex, 0, reorderedItem);
            setQuestions(newQuestions);
        }
        setIsDragging(false);
    };
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const processFile = (file: File, callback: (base64: string) => void) => {
        if (file.size > 200 * 1024) {
            toast.error("Image size must be less than 200KB");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => callback(reader.result as string);
        reader.readAsDataURL(file);
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file, setInstitutionLogo);
    };

    const handleClear = () => {
        if (confirm("Are you sure you want to clear all fields? This will erase all questions and settings.")) {
            setTitle('');
            setDescription('');
            setRevisionNotes('');
            setInstitutionName('');
            setInstitutionLogo('');
            setInstitutionColor('#475569');
            setInstitutionFont('inherit');
            setTime(30);
            setMarks(4);
            setNegativeMarks(1);
            setIsPublic(false);
            setQuestions([{ ...DEFAULT_QUESTION, id: 1, options: { ...DEFAULT_QUESTION.options } }]);
            setSelectedCategories([]);
            setTags([]);
            // Clear draft
            localStorage.removeItem('create_test_draft');
            toast.success("Form cleared");
        }
    };

    const handleDragStartSection = (e: React.DragEvent, sectionId: string) => {
        e.dataTransfer.setData('sectionId', sectionId);
    };

    const handleDropSection = (e: React.DragEvent, targetSectionId: string) => {
        e.preventDefault();
        const draggedSectionId = e.dataTransfer.getData('sectionId');
        if (!draggedSectionId || draggedSectionId === targetSectionId) return;

        const draggedIdx = sections.findIndex(s => s.id === draggedSectionId);
        const targetIdx = sections.findIndex(s => s.id === targetSectionId);

        if (draggedIdx === -1 || targetIdx === -1) return;

        const newSections = [...sections];
        const [draggedSection] = newSections.splice(draggedIdx, 1);
        newSections.splice(targetIdx, 0, draggedSection);
        setSections(newSections);
        // iOS-style swap animation: flash the swapped cards
        const swappedIds = new Set([draggedSectionId, targetSectionId]);
        setSwappedSections(swappedIds);
        setTimeout(() => setSwappedSections(new Set()), 600);
        // After 3s, trigger a left-to-right gradient glow to show color settled
        setTimeout(() => {
            setSwapGlowSections(swappedIds);
            setTimeout(() => setSwapGlowSections(new Set()), 1200);
        }, 3000);
    };

    // Section Helpers
    const toggleSectionMode = (checked: boolean) => {
        setEnableSectionMode(checked);
        if (checked) {
            // Flatten -> Sections
            if (questions.length > 0) {
                setSections([{
                    id: 'section-1',
                    name: 'Section A',
                    questions: [...questions],
                    marks_per_question: 1,
                    negative_marks: 0,
                    question_type: 'single',
                    colorIndex: 0
                } as SectionState]);
            }
        } else {
            // Sections -> Flat
            const flatQuestions = sections.flatMap(s => s.questions);
            if (flatQuestions.length > 0) {
                setQuestions(flatQuestions);
            }
        }
    };

    const handleAddSection = (insertAtIndex?: number) => {
        const nextLetter = String.fromCharCode(65 + sections.length);
        const newSection: SectionState = {
            id: `section-${Date.now()}`,
            name: `Section ${nextLetter}`,
            questions: [{ ...DEFAULT_QUESTION, id: Math.random() }],
            marks_per_question: 1,
            negative_marks: 0,
            question_type: 'single',
            colorIndex: sections.length
        };
        
        if (typeof insertAtIndex === 'number') {
            const newSections = [...sections];
            newSections.splice(insertAtIndex, 0, newSection);
            setSections(newSections);
        } else {
            setSections([...sections, newSection]);
        }
    };

    const handleRemoveSection = (index: number) => {
        if (sections.length <= 1) {
            toast.error("At least one section is required");
            return;
        }
        const newSections = [...sections];
        newSections.splice(index, 1);
        setSections(newSections);
    };

    const updateSection = (index: number, field: keyof TestSection, value: any) => {
        const newSections = [...sections];
        let finalValue = value;

        // Sanitize marks_per_question and negative_marks to prevent negative inputs
        if ((field === 'marks_per_question' || field === 'negative_marks') && typeof value === 'string') {
            finalValue = sanitizeNumericalMark(value);
        }

        newSections[index] = { ...newSections[index], [field]: finalValue };
        setSections(newSections);
    };

    const handleAddQuestionToSection = (sectionIndex: number) => {
        const newSections = [...sections];
        const section = newSections[sectionIndex];

        const lastQuestion = section.questions.length > 0 ? section.questions[section.questions.length - 1] : null;

        const newQ: QuestionState = {
            id: Math.max(0, ...section.questions.map(q => q.id), ...questions.map(q => q.id)) + Math.random(),
            type: section.question_type as any || 'single',
            question: '',
            passageContent: '',
            groupId: '',
            options: { A: '', B: '', C: '', D: '' },
            correctAnswer: '',
            typingMode: lastTypingMode,
            marks: lastQuestion ? lastQuestion.marks : (section.marks_per_question?.toString() || '1'),
            negativeMarks: lastQuestion ? lastQuestion.negativeMarks : (section.negative_marks?.toString() || '0')
        };
        section.questions.push(newQ);
        setSections(newSections);
    };

    const handleAddSubQuestionToSection = (sectionIndex: number, parentQuestionIndex: number) => {
        const newSections = [...sections];
        const section = newSections[sectionIndex];
        const parentQ = section.questions[parentQuestionIndex];

        if (!parentQ.groupId) return;

        const newQ: QuestionState = {
            id: Math.max(0, ...section.questions.map(q => q.id), ...questions.map(q => q.id)) + Math.random(),
            type: 'single', // Default to single
            question: '',
            groupId: parentQ.groupId,
            passageContent: parentQ.passageContent,
            options: { A: '', B: '', C: '', D: '' },
            correctAnswer: '',
            typingMode: lastTypingMode,
            marks: parentQ.marks || '1',
            negativeMarks: parentQ.negativeMarks || '0'
        };

        // Insert after the last question of this group
        let insertIndex = parentQuestionIndex;
        for (let i = parentQuestionIndex + 1; i < section.questions.length; i++) {
            if (section.questions[i].groupId === parentQ.groupId) insertIndex = i;
            else break;
        }

        section.questions.splice(insertIndex + 1, 0, newQ);
        setSections(newSections);
    };

    const handleRemoveQuestionFromSection = (sectionIndex: number, qIndex: number) => {
        const newSections = [...sections];
        newSections[sectionIndex].questions.splice(qIndex, 1);
        setSections(newSections);
    };

    const updateQuestionInSection = (sectionIndex: number, qIndex: number, field: keyof QuestionState, value: any) => {
        const newSections = [...sections];
        const q = newSections[sectionIndex].questions[qIndex] as QuestionState;

        let finalValue = value;
        // Sanitize marks and negativeMarks to prevent negative inputs
        if ((field === 'marks' || field === 'negativeMarks') && typeof value === 'string') {
            finalValue = sanitizeNumericalMark(value);
        }

        // @ts-ignore
        newSections[sectionIndex].questions[qIndex] = { ...q, [field]: finalValue };
        setSections(newSections);
    };

    const updatePassageContentInSection = (sectionIndex: number, groupId: string, content: string) => {
        const newSections = [...sections];
        const section = newSections[sectionIndex];
        const newQuestions = section.questions.map(q =>
            q.groupId === groupId ? { ...q, passageContent: content } : q
        );
        // @ts-ignore
        section.questions = newQuestions;
        setSections(newSections);
    };

    const updateQuestionTypeInSection = (secIdx: number, qIdx: number, type: string) => {
        const newSections = [...sections];
        const section = newSections[secIdx];
        const q = section.questions[qIdx] as QuestionState;

        const newQ = { ...q };

        if (type === 'comprehension') {
            newQ.type = 'single';
            newQ.correctAnswer = '';
            if (!newQ.groupId) newQ.groupId = Math.random().toString(36).substr(2, 9);
        } else {
            newQ.type = type as any;
            if (type.startsWith('single')) newQ.correctAnswer = '';
            else if (type === 'multiple') newQ.correctAnswer = [];
            else if (type === 'numerical') newQ.correctAnswer = { min: 0, max: 0, exactMatch: false, exactAnswers: '' };
        }

        section.questions[qIdx] = newQ;
        setSections(newSections);
    };

    // Category Helpers
    const toggleCategory = (catId: string) => {
        setSelectedCategories(prev =>
            prev.includes(catId)
                ? prev.filter(id => id !== catId)
                : [...prev, catId]
        );
    };

    // Tag Helpers
    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = tagInput.trim();
            if (val && !tags.includes(val)) {
                setTags([...tags, val]);
                setTagInput("");
            } else if (tags.includes(val)) {
                toast.error("Tag already exists");
            }
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    // Show loading screen while fetching test data
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="relative">
                        <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                            <PenLine className="w-10 h-10 text-blue-600 animate-pulse" />
                        </div>
                        <div className="absolute inset-0 w-20 h-20 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-slate-700">Loading your test...</h3>
                        <p className="text-sm text-slate-500">Please wait while we fetch your test data</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto pt-2 pb-4 sm:py-4 px-0 sm:px-6 w-full max-w-5xl" style={{ overflowAnchor: 'none' }}>
            <style>{`
                @keyframes iosInsert {
                    0% {
                        opacity: 0;
                        transform: scale(0.92) translateY(-20px);
                        filter: blur(4px);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                        filter: blur(0);
                    }
                }
                .animate-ios-insert {
                    animation: iosInsert 450ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                    transform-origin: center center;
                    will-change: transform, opacity;
                }
            `}</style>
            <div className="mb-2 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-0 gap-2 sm:gap-4">
                <div className="flex items-center gap-3">
                    {onCancel && (
                        <Button variant="ghost" size="icon" onClick={onCancel} className="h-9 w-9 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:text-indigo-600 transition-colors shrink-0">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    )}
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-extrabold text-slate-700 uppercase tracking-wider md:text-xl md:normal-case md:font-bold md:text-slate-800 md:tracking-tight md:leading-none">Test Builder</span>
                    </div>
                    {isEditMode && (
                        <div className="flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-right-4 duration-300 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm ml-2">
                            {saveStatus === 'saving' && (
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Saving...
                                </span>
                            )}
                            {saveStatus === 'saved' && (
                                <span className="text-emerald-600 flex items-center gap-1.5">
                                    <Cloud className="w-4 h-4" />
                                    Saved
                                </span>
                            )}
                            {saveStatus === 'error' && (
                                <span className="text-red-500 flex items-center gap-1.5">
                                    <CloudOff className="w-4 h-4" />
                                    Failed
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {onAiImport && !isEditMode && (
                        <Button onClick={onAiImport} variant="outline" className="h-9 gap-2 shrink-0 animate-google-border hover:bg-indigo-50 hover:text-indigo-700 transition-colors shadow-sm text-xs font-medium rounded-xl">
                            <FileText className="w-3.5 h-3.5" />
                            Import PDF
                        </Button>
                    )}
                    <div className="flex items-center h-9 shadow-sm rounded-xl border border-slate-200 overflow-hidden bg-white hover:border-indigo-200 transition-colors">
                        <div className="h-full [&>label]:h-full [&>label]:flex [&>label]:items-center [&>label]:px-3 [&>label]:bg-transparent [&>label]:hover:bg-indigo-50 [&>label]:text-indigo-600 [&>label]:text-xs [&>label]:font-semibold [&>label]:cursor-pointer [&>label]:border-none">
                            <React.Suspense fallback={null}>
                                <JsonImporter onImportSuccess={populateData} />
                            </React.Suspense>
                        </div>
                        <div className="w-px h-full bg-slate-200" />
                        <TestUploadFormatGuide trigger={
                            <button className="h-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer px-1.5 border-none outline-none focus:outline-none" title="Upload Format Guide">
                                <span className="text-[8px] font-bold uppercase tracking-wider [writing-mode:vertical-lr] rotate-180">Guide</span>
                            </button>
                        } />
                    </div>
                </div>
            </div>

            {!isOnline && (
                <div className="bg-red-500 text-white text-sm py-2 px-4 rounded mb-4 flex items-center justify-center gap-2">
                    <WifiOff className="w-4 h-4" />
                    <span>You are currently offline. Transliteration features require an internet connection.</span>
                </div>
            )}

            <div className="grid gap-6">
                <Card className="rounded-none sm:rounded-2xl border-x-0 sm:border-slate-200 shadow-sm overflow-hidden">
                    {/* --- Branding / Institution Header --- */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800/50 p-4 sm:p-6">
                        <div className="flex items-center justify-start sm:justify-center gap-4 sm:gap-6 max-w-2xl mx-auto pl-2 sm:pl-0">
                            <div className="relative group shrink-0">
                                {institutionLogo && isPremium && (
                                    <button
                                        onClick={(e) => { e.preventDefault(); setInstitutionLogo(''); }}
                                        className="absolute -top-2 -right-2 z-20 bg-destructive text-white rounded-full p-1 shadow-md hover:bg-destructive/90"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                                <label
                                    className={`block ${isPremium ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                                    onDragOver={isPremium ? handleDragOver : undefined}
                                    onDragLeave={isPremium ? handleDragLeave : undefined}
                                    onDrop={isPremium ? handleDrop : undefined}
                                    onClick={(e) => {
                                        if (!isPremium) {
                                            e.preventDefault();
                                            toast("Upgrade to Premium to add your logo", {
                                                action: { label: "View Plans", onClick: () => navigate('/pricing') }
                                            });
                                        }
                                    }}
                                >
                                    <input type="file" className="hidden" accept="image/*" disabled={!isPremium} onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f, setInstitutionLogo); }} />
                                    <div className={`w-16 h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all relative overflow-hidden bg-white shadow-sm ${isDragging ? 'border-indigo-400 bg-indigo-50/50' : institutionLogo ? 'border-slate-200' : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50'}`}>
                                        {institutionLogo ? (
                                            <img src={institutionLogo} alt="Logo" className="w-full h-full object-contain" />
                                        ) : (
                                            <>
                                                <Upload className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors mb-0.5" />
                                                <span className="text-[9px] text-slate-400 group-hover:text-indigo-400 font-bold uppercase tracking-wider">Logo</span>
                                            </>
                                        )}
                                        {!isPremium && !institutionLogo && (
                                            <div className="absolute inset-0 bg-slate-100/90 backdrop-blur-[1px] flex items-center justify-center">
                                                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Locked</span>
                                            </div>
                                        )}
                                    </div>
                                </label>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 relative group-input">
                                        <Input
                                            value={institutionName}
                                            onChange={(e) => setInstitutionName(e.target.value)}
                                            placeholder={isPremium ? "Institution Name" : "Institution Name (Premium)"}
                                            className="text-xl font-bold border-none shadow-none focus-visible:ring-0 placeholder:text-slate-300 px-0 disabled:opacity-100 disabled:cursor-not-allowed bg-transparent"
                                            style={{ color: institutionColor, fontFamily: institutionFont }}
                                            disabled={!isPremium}
                                            title={!isPremium ? "Upgrade to Premium to set Institution Name" : ""}
                                        />
                                        {!isPremium && (
                                            <div
                                                className="absolute inset-0 cursor-pointer"
                                                onClick={() => toast("Upgrade to Premium to set Institution Name", {
                                                    action: { label: "View Plans", onClick: () => navigate('/pricing') }
                                                })}
                                            />
                                        )}
                                        <div className="h-[1px] bg-gradient-to-r from-slate-200 to-transparent w-full" />
                                    </div>
                                    {/* Institution Name Preview Info Button */}
                                    <button
                                        type="button"
                                        onClick={() => { setPreviewImageIndex(0); setShowInstitutePreview(true); }}
                                        className="shrink-0 p-1 flex items-center justify-center transition-all duration-200 group text-amber-500 hover:text-amber-600 active:scale-95"
                                        title="Preview: how institution name appears on live test"
                                    >
                                        <Info className="w-5 h-5 text-amber-500 group-hover:text-amber-600 transition-colors" />
                                    </button>
                                    {/* Clear All Data Button */}
                                    <button
                                        type="button"
                                        onClick={handleClear}
                                        className="shrink-0 w-6 h-6 rounded-full bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 flex items-center justify-center transition-all duration-200 group shadow-sm hover:shadow-md ml-3"
                                        title="Clear All Data"
                                    >
                                        <Eraser className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 transition-colors" />
                                    </button>
                                </div>
                                {/* Color Swatches & Font Picker */}
                                {/* Color Swatches & Font Picker - Blurred preview for non-premium */}
                                <div className={`relative mt-2 ${!isPremium ? 'group/premium cursor-pointer' : ''}`}
                                    onClick={() => {
                                        if (!isPremium) {
                                            toast("Upgrade to Premium to customize branding", {
                                                action: { label: "View Plans", onClick: () => navigate('/pricing') }
                                            });
                                        }
                                    }}
                                >
                                    <div className={`flex items-center gap-3 flex-wrap transition-all duration-300 ${!isPremium ? 'blur-[2px] opacity-60 pointer-events-none' : ''}`}>
                                        <div className="flex items-center gap-1.5">
                                            <Palette className="w-3 h-3 text-slate-400" />
                                            {['#475569', '#2563eb', '#dc2626', '#059669', '#7c3aed', '#ea580c', '#0891b2'].map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setInstitutionColor(c)}
                                                    className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${institutionColor === c ? 'border-slate-800 scale-110 ring-1 ring-offset-1 ring-slate-400' : 'border-transparent'}`}
                                                    style={{ backgroundColor: c }}
                                                    title={c}
                                                />
                                            ))}
                                        </div>
                                        <div className="h-4 w-px bg-slate-200" />
                                        <div className="flex items-center gap-1.5">
                                            <Type className="w-3 h-3 text-slate-400" />
                                            <select
                                                value={institutionFont}
                                                onChange={(e) => setInstitutionFont(e.target.value)}
                                                className="text-xs bg-transparent border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-300"
                                            >
                                                <option value="inherit">Default</option>
                                                <option value="serif">Serif</option>
                                                <option value="'Courier New', monospace">Mono</option>
                                                <option value="'Georgia', serif">Georgia</option>
                                                <option value="'Trebuchet MS', sans-serif">Modern</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <CardHeader className="pb-4 pt-6 px-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold text-slate-800">Test Details</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column: Title & Description */}
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label className="text-slate-600 font-semibold">Test Title</Label>
                                    <Input placeholder="Enter test title..." value={title} onChange={e => setTitle(e.target.value)} className="text-slate-800 placeholder:text-slate-400" />
                                </div>

                                <div className="grid gap-2">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-slate-600 font-semibold">Description (Short)</Label>
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                                            <Languages className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-700" />
                                            <Select value={descriptionLanguage} onValueChange={(val: 'en' | 'hi') => setDescriptionLanguage(val)}>
                                                <SelectTrigger className="h-4 p-0 border-none bg-transparent focus:ring-0 focus:ring-offset-0 text-xs font-medium text-slate-700 dark:text-slate-300 w-auto gap-1">
                                                    <SelectValue placeholder="Language" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="en">English</SelectItem>
                                                    <SelectItem value="hi">Hindi</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <IMEInput
                                        ref={(el) => imeRefs.current['test-desc'] = el}
                                        typingMode={descriptionLanguage}
                                        value={description}
                                        onChange={setDescription}
                                        placeholder="Brief description of the test"
                                        className="text-slate-800 placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            {/* Right Column: Categories & Tags */}
                            <div className="space-y-4">
                                <div className="flex flex-col space-y-2">
                                    <Label className="text-slate-600 font-semibold">Categories</Label>
                                    <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openCategoryCombobox}
                                                className="w-full justify-between text-slate-700 border-slate-200"
                                            >
                                                {selectedCategories.length > 0
                                                    ? `${selectedCategories.length} selected`
                                                    : "Select categories..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-slate-400" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] sm:w-[400px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search category..." />
                                                <CommandEmpty>
                                                    <div className="p-2 text-sm text-muted-foreground text-center">
                                                        No category found. Select "Other" to add a custom one.
                                                    </div>
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {categories.map((category) => (
                                                        <CommandItem
                                                            key={category.id}
                                                            value={category.name}
                                                            onSelect={() => {
                                                                toggleCategory(category.id);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedCategories.includes(category.id) ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {category.name}
                                                        </CommandItem>
                                                    ))}
                                                    <CommandItem
                                                        value="Other"
                                                        onSelect={() => {
                                                            setShowOtherCategory(true);
                                                            setOpenCategoryCombobox(false);
                                                        }}
                                                        className="border-t mt-1 font-medium text-blue-600"
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        Other (Add Custom)
                                                    </CommandItem>
                                                </CommandGroup>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>

                                    {/* Selected Categories Badges */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {selectedCategories.map(catId => {
                                            const cat = categories.find(c => c.id === catId);
                                            if (!cat) return null;
                                            return (
                                                <Badge key={catId} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200">
                                                    {cat.name}
                                                    <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => toggleCategory(catId)} />
                                                </Badge>
                                            )
                                        })}
                                    </div>

                                    {/* OTHER / CUSTOM CATEGORY INPUT */}
                                    {showOtherCategory && (
                                        <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <Label className="text-blue-600">Custom Category Name</Label>
                                            <div className="flex gap-2 mt-1.5">
                                                <Textarea
                                                    value={customCategory}
                                                    onChange={(e) => setCustomCategory(e.target.value)}
                                                    placeholder="Enter your custom category name here..."
                                                    className="min-h-[60px] resize-none"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="mt-1 hover:bg-slate-100"
                                                    onClick={() => {
                                                        setShowOtherCategory(false);
                                                        setCustomCategory("");
                                                    }}
                                                    title="Remove Custom Category"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-1">
                                                * This will be saved as a searchable tag for this test.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-600 font-semibold">Tags (Press Enter to add)</Label>
                                    <Input
                                        placeholder="Add a tag..."
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleAddTag}
                                        className="text-slate-800 placeholder:text-slate-400"
                                    />
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {tags.map((tag, idx) => (
                                            <Badge key={idx} variant="outline" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-slate-50 text-slate-600 border-slate-200">
                                                #{tag}
                                                <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => removeTag(tag)} />
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-slate-600 font-semibold">Test Summary & Instructions (Rich Text)</Label>
                            <RichTextEditor
                                value={revisionNotes}
                                onChange={setRevisionNotes}
                                placeholder="Add detailed instructions, syllabus, or summary here..."
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div><Label className="text-slate-600 font-semibold">Time (mins)</Label><Input type="number" value={time} onChange={e => setTime(parseInt(e.target.value))} className="text-slate-800" /></div>
                            <div>
                                <Label className="text-slate-600 font-semibold">Visibility</Label>
                                <div className="flex items-center space-x-2 h-10 border rounded-md px-3 bg-white">
                                    <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                                    <Label className="cursor-pointer text-slate-700" onClick={() => setIsPublic(!isPublic)}>{isPublic ? 'Public' : 'Private'}</Label>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase">
                                    <Calculator className="w-3.5 h-3.5" />
                                    Calc
                                    <div className="group relative">
                                        <Info className="w-3 h-3 text-slate-400 cursor-help" />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                            Allow students to use scientific calculator
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                        </div>
                                    </div>
                                </Label>
                                <div className="flex items-center space-x-2 h-10 border rounded-md px-3 bg-white w-full">
                                    <Switch checked={hasScientificCalculator} onCheckedChange={setHasScientificCalculator} />
                                    <Label className="cursor-pointer text-sm font-medium text-slate-700" onClick={() => setHasScientificCalculator(!hasScientificCalculator)}>
                                        {hasScientificCalculator ? 'On' : 'Off'}
                                    </Label>
                                </div>
                            </div>
                            <div>
                                <Label className="text-slate-600 font-semibold">section-wise-questions</Label>
                                <div className="flex items-center space-x-2 h-10 border border-indigo-300 rounded-md px-3 bg-white">
                                    <Switch checked={enableSectionMode} onCheckedChange={toggleSectionMode} />
                                    <Label className="cursor-pointer text-slate-700" onClick={() => toggleSectionMode(!enableSectionMode)}>{enableSectionMode ? 'On' : 'Off'}</Label>
                                </div>
                            </div>
                        </div>

                        {/* Merge Section Marks Config */}
                        {enableSectionMode && sections.length >= 2 && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <Label className="text-slate-700 font-semibold text-sm">Merge Section Marks</Label>
                                        <p className="text-xs text-slate-500">Group sections to show combined subject marks on results page</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setMergedSections([...mergedSections, { label: '', section_ids: [] }])}
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Group
                                    </Button>
                                </div>
                                {mergedSections.length > 0 && (
                                    <div className="space-y-3">
                                        {mergedSections.map((group, gIdx) => (
                                            <div key={gIdx} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        placeholder="Subject label (e.g. Chemistry)"
                                                        value={group.label}
                                                        onChange={(e) => {
                                                            const updated = [...mergedSections];
                                                            updated[gIdx] = { ...updated[gIdx], label: e.target.value };
                                                            setMergedSections(updated);
                                                        }}
                                                        className="flex-1 h-8 text-sm"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                                                        onClick={() => setMergedSections(mergedSections.filter((_, i) => i !== gIdx))}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {sections.map((sec) => {
                                                        const isSelected = group.section_ids.includes(sec.id);
                                                        return (
                                                            <button
                                                                key={sec.id}
                                                                type="button"
                                                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${isSelected
                                                                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                                    }`}
                                                                onClick={() => {
                                                                    const updated = [...mergedSections];
                                                                    const ids = isSelected
                                                                        ? group.section_ids.filter(id => id !== sec.id)
                                                                        : [...group.section_ids, sec.id];
                                                                    updated[gIdx] = { ...updated[gIdx], section_ids: ids };
                                                                    // Auto-fill label from common prefix if label is empty or was auto-filled
                                                                    if (ids.length >= 2) {
                                                                        const selectedNames = sections.filter(s => ids.includes(s.id)).map(s => s.name);
                                                                        const prefix = getCommonPrefix(selectedNames);
                                                                        if (!updated[gIdx].label || updated[gIdx].label === getCommonPrefix(
                                                                            sections.filter(s => group.section_ids.includes(s.id)).map(s => s.name)
                                                                        )) {
                                                                            updated[gIdx] = { ...updated[gIdx], label: prefix };
                                                                        }
                                                                    }
                                                                    setMergedSections(updated);
                                                                }}
                                                            >
                                                                {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                                                                {sec.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Format Support Note */}
                <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-sm overflow-hidden transition-all duration-300">
                    <button
                        onClick={() => setShowSupportedFormats(!showSupportedFormats)}
                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-blue-100/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Info className="w-5 h-5 shrink-0 text-blue-600" />
                            <p className="font-semibold">Supported Formats</p>
                        </div>
                        {showSupportedFormats ? (
                            <ChevronUp className="w-4 h-4 text-blue-400" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-blue-400" />
                        )}
                    </button>

                    {showSupportedFormats && (
                        <div className="border-t border-blue-100 animate-in fade-in slide-in-from-top-2 duration-300">
                            {/* Subtitle */}
                            <p className="text-[11px] text-blue-600/80 px-4 pt-2 pb-1">
                                Use <code className="bg-blue-100 px-1 rounded font-mono">$...$</code> for inline math. Examples below show raw input → visual form.
                            </p>

                            {/* Examples table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-blue-100/60">
                                            <th className="px-3 py-1.5 text-left font-semibold text-blue-700 border-b border-blue-200 w-[36%]">Category</th>
                                            <th className="px-3 py-1.5 text-left font-semibold text-blue-700 border-b border-blue-200 w-[38%]">Raw Format ($...$)</th>
                                            <th className="px-3 py-1.5 text-left font-semibold text-blue-700 border-b border-blue-200">Visual Form</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Basic examples — always visible */}
                                        {([
                                            { cat: 'Energy–mass equivalence', raw: '$E = mc^2$', visual: 'E = mc²' },
                                            { cat: 'Acceleration unit', raw: '$2.4\\,\\text{m/s}^2$', visual: '2.4 m/s²' },
                                            { cat: 'Pythagorean theorem', raw: '$a^2 + b^2 = c^2$', visual: 'a² + b² = c²' },
                                            { cat: 'Square root', raw: '$\\sqrt{16} = 4$', visual: '√16 = 4' },
                                            { cat: 'Simple fraction', raw: '$\\frac{1}{2}$', visual: '½' },
                                            { cat: 'Chemical — Water', raw: '$\\ce{H2O}$', visual: 'H₂O' },
                                            { cat: 'Chemical — Glucose', raw: '$\\ce{C6H12O6}$', visual: 'C₆H₁₂O₆' },
                                            { cat: 'Speed of light', raw: '$c = 3\\times10^8\\,\\text{m/s}$', visual: 'c = 3×10⁸ m/s' },
                                        ] as { cat: string; raw: string; visual: string }[]).map((row, i) => (
                                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}>
                                                <td className="px-3 py-1.5 text-blue-800/70 border-b border-blue-100">{row.cat}</td>
                                                <td className="px-3 py-1.5 border-b border-blue-100">
                                                    <code className="font-mono text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded break-all">{row.raw}</code>
                                                </td>
                                                <td className="px-3 py-1.5 border-b border-blue-100 font-medium text-blue-900">{row.visual}</td>
                                            </tr>
                                        ))}

                                        {/* Advanced examples — shown when expanded */}
                                        {showAdvancedFormats && ([
                                            { cat: 'Quadratic formula', raw: '$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$', visual: 'x = (−b ± √(b²−4ac)) / 2a' },
                                            { cat: 'Definite integral', raw: '$\\int_0^\\infty e^{-x}\\,dx=1$', visual: '∫₀^∞ e⁻ˣ dx = 1' },
                                            { cat: 'Summation (sigma)', raw: '$\\sum_{n=1}^{\\infty}\\frac{1}{n^2}=\\frac{\\pi^2}{6}$', visual: 'Σ 1/n² = π²/6' },
                                            { cat: 'Limit', raw: '$\\lim_{x\\to 0}\\frac{\\sin x}{x}=1$', visual: 'lim(x→0) sinx/x = 1' },
                                            { cat: 'Greek letters', raw: '$\\alpha,\\beta,\\gamma,\\Delta,\\Omega$', visual: 'α, β, γ, Δ, Ω' },
                                            { cat: "Newton's 2nd law", raw: '$\\vec{F}=m\\vec{a}$', visual: 'F⃗ = ma⃗' },
                                            { cat: "Ohm's law", raw: '$V=IR$', visual: 'V = IR' },
                                            { cat: 'Chemical rxn — CO₂', raw: '$\\ce{C + O2 -> CO2}$', visual: 'C + O₂ → CO₂' },
                                            { cat: 'Chemical rxn — NaCl', raw: '$\\ce{Na + Cl -> NaCl}$', visual: 'Na + Cl → NaCl' },
                                            { cat: 'Binomial probability', raw: '$P(X=k)=\\binom{n}{k}p^k(1-p)^{n-k}$', visual: 'P(X=k) = C(n,k) pᵏ(1−p)ⁿ⁻ᵏ' },
                                            { cat: 'Matrix (2×2)', raw: '$\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}$', visual: '[[a b] [c d]]' },
                                            { cat: "Euler's identity", raw: '$e^{i\\pi}+1=0$', visual: 'eⁱᵖⁱ + 1 = 0' },
                                        ] as { cat: string; raw: string; visual: string }[]).map((row, i) => (
                                            <tr key={`adv-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}>
                                                <td className="px-3 py-1.5 text-blue-800/70 border-b border-blue-100">{row.cat}</td>
                                                <td className="px-3 py-1.5 border-b border-blue-100">
                                                    <code className="font-mono text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded break-all">{row.raw}</code>
                                                </td>
                                                <td className="px-3 py-1.5 border-b border-blue-100 font-medium text-blue-900">{row.visual}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Show advanced toggle */}
                            <button
                                onClick={() => setShowAdvancedFormats(v => !v)}
                                className="w-full flex items-center justify-center gap-1 py-2 text-[11px] font-semibold text-blue-600 hover:bg-blue-100/50 transition-colors border-t border-blue-100"
                            >
                                {showAdvancedFormats
                                    ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                                    : <><ChevronDown className="w-3.5 h-3.5" /> Show advanced examples</>}
                            </button>

                            {/* Read more */}
                            <div className="px-4 py-2 border-t border-blue-100">
                                <a
                                    href="/user-guide/chemistry-notation"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium underline decoration-blue-200 underline-offset-2 hover:decoration-blue-400 transition-all"
                                >
                                    Read more about supported formats
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* Question List */}
                <div className="space-y-4">
                    {enableSectionMode ? (
                        <>
                            <div className="space-y-8">
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <span className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider block">Sections ({sections.length})</span>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Manage your test sections below.</p>
                                    </div>
                                </div>

                                {sections.map((section, sIdx) => {
                                    const SECTION_STYLES = [
                                        { border: 'border-slate-200', header: 'bg-slate-100', bg: 'bg-slate-50/50' },
                                        { border: 'border-amber-200', header: 'bg-amber-100', bg: 'bg-amber-50/30' },
                                        { border: 'border-emerald-200', header: 'bg-emerald-100', bg: 'bg-emerald-50/30' },
                                        { border: 'border-blue-200', header: 'bg-blue-100', bg: 'bg-blue-50/30' },
                                        { border: 'border-purple-200', header: 'bg-purple-100', bg: 'bg-purple-50/30' },
                                        { border: 'border-rose-200', header: 'bg-rose-100', bg: 'bg-rose-50/30' },
                                    ];
                                    const colorIndex = section.colorIndex !== undefined ? section.colorIndex : sIdx;
                                    const style = SECTION_STYLES[colorIndex % SECTION_STYLES.length];
                                    
                                    const timestampStr = section.id.startsWith('section-') ? section.id.split('-')[1] : null;
                                    const timestamp = timestampStr ? parseInt(timestampStr, 10) : null;
                                    const isNew = timestamp ? (Date.now() - timestamp < 1500) : false;

                                    return (
                                        <div key={section.id} className={`relative ${isNew ? 'animate-ios-insert' : ''}`}>
                                            <Card
                                                draggable
                                                onDragStart={(e) => handleDragStartSection(e, section.id)}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => handleDropSection(e, section.id)}
                                            className={`shadow-md overflow-hidden ${style.border} rounded-none sm:rounded-xl border-x-0 sm:border-2 border-y-2 transition-all duration-300 ${swappedSections.has(section.id) ? 'scale-[1.01] shadow-lg brightness-105' : ''
                                                } ${swapGlowSections.has(section.id) ? 'section-swap-glow' : ''}`}
                                        >
                                            <div className={`${style.header} border-b flex items-center transition-colors duration-300 ${collapsedSections.has(section.id) ? 'px-3 py-2' : 'px-4 py-3 flex-wrap gap-4'}`}>
                                                {/* Collapsed: show only drag handle + section name chip + expand button */}
                                                {collapsedSections.has(section.id) ? (
                                                    <div className="flex items-center gap-2 w-full">
                                                        <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-black/5 rounded transition-colors">
                                                            <Grip className="w-4 h-4 text-slate-400" />
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-600 flex-1 truncate">{section.name || `Section ${sIdx + 1}`}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-slate-400 hover:text-blue-600 transition-colors h-7 w-7"
                                                            onClick={() => {
                                                                const newCollapsed = new Set(collapsedSections);
                                                                newCollapsed.delete(section.id);
                                                                setCollapsedSections(newCollapsed);
                                                            }}
                                                            title="Expand Section"
                                                        >
                                                            <ChevronDown className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    /* Expanded header */
                                                    <>
                                                        <div className="flex-1 space-y-1 flex items-center gap-3">
                                                            <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-black/5 rounded transition-colors mr-1">
                                                                <Grip className="w-4 h-4 text-slate-400" />
                                                            </div>
                                                            <div className="flex-1 space-y-0">
                                                                <Input
                                                                    value={section.name}
                                                                    onChange={(e) => updateSection(sIdx, 'name', e.target.value)}
                                                                    className="font-bold text-lg bg-white/60 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-slate-300 focus-visible:bg-white px-2 h-9"
                                                                    placeholder={`Section ${sIdx + 1}`}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1 self-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-slate-400 hover:text-blue-600 transition-colors h-8 w-8"
                                                                onClick={() => {
                                                                    const newCollapsed = new Set(collapsedSections);
                                                                    if (newCollapsed.has(section.id)) {
                                                                        newCollapsed.delete(section.id);
                                                                    } else {
                                                                        newCollapsed.add(section.id);
                                                                    }
                                                                    setCollapsedSections(newCollapsed);
                                                                }}
                                                                title="Collapse Section"
                                                            >
                                                                <ChevronUp className="w-4 h-4" />
                                                            </Button>

                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 h-8 w-8">
                                                                        <MoreVertical className="w-4 h-4" />
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-80 p-4" align="end">
                                                                    <div className="space-y-4">
                                                                        <div className="flex items-center justify-between">
                                                                            <h4 className="font-bold text-sm">Attempt Control</h4>
                                                                            <Switch
                                                                                checked={!!section.attempt_control}
                                                                                onCheckedChange={(checked) => {
                                                                                    if (checked) {
                                                                                        updateSection(sIdx, 'attempt_control', { enabled: true, max_attempts: 1, mode: 'hard', soft_type: 'first_n' });
                                                                                    } else {
                                                                                        updateSection(sIdx, 'attempt_control', undefined);
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </div>

                                                                        {section.attempt_control && (
                                                                            <>
                                                                                <div className="space-y-2">
                                                                                    <Label className="text-xs font-bold text-slate-500 uppercase">Max Attempts</Label>
                                                                                    <Input
                                                                                        type="number"
                                                                                        value={section.attempt_control?.max_attempts || 0}
                                                                                        onChange={(e) => updateSection(sIdx, 'attempt_control', { ...section.attempt_control, max_attempts: parseInt(e.target.value) })}
                                                                                        placeholder="e.g. 5"
                                                                                    />
                                                                                </div>

                                                                                <div className="space-y-2">
                                                                                    <Label className="text-xs font-bold text-slate-500 uppercase">Mode</Label>
                                                                                    <RadioGroup
                                                                                        value={section.attempt_control?.mode || 'hard'}
                                                                                        onValueChange={(val) => updateSection(sIdx, 'attempt_control', { ...section.attempt_control, mode: val })}
                                                                                        className="flex gap-4"
                                                                                    >
                                                                                        <div className="flex items-center space-x-2">
                                                                                            <RadioGroupItem value="hard" id={`hard-${sIdx}`} />
                                                                                            <Label htmlFor={`hard-${sIdx}`} className="text-sm">Hard</Label>
                                                                                        </div>
                                                                                        <div className="flex items-center space-x-2">
                                                                                            <RadioGroupItem value="soft" id={`soft-${sIdx}`} />
                                                                                            <Label htmlFor={`soft-${sIdx}`} className="text-sm">Soft</Label>
                                                                                        </div>
                                                                                    </RadioGroup>
                                                                                </div>

                                                                                {section.attempt_control?.mode === 'soft' && (
                                                                                    <div className="space-y-2">
                                                                                        <Label className="text-xs font-bold text-slate-500 uppercase">Soft Filter Type</Label>
                                                                                        <RadioGroup
                                                                                            value={section.attempt_control?.soft_type || 'first_n'}
                                                                                            onValueChange={(val) => updateSection(sIdx, 'attempt_control', { ...section.attempt_control, soft_type: val })}
                                                                                            className="flex flex-col gap-2"
                                                                                        >
                                                                                            <div className="flex items-center space-x-2">
                                                                                                <RadioGroupItem value="first_n" id={`first_n-${sIdx}`} />
                                                                                                <Label htmlFor={`first_n-${sIdx}`} className="text-sm">First N Questions</Label>
                                                                                            </div>
                                                                                            <div className="flex items-center space-x-2">
                                                                                                <RadioGroupItem value="best_n" id={`best_n-${sIdx}`} />
                                                                                                <Label htmlFor={`best_n-${sIdx}`} className="text-sm">Best N Questions</Label>
                                                                                            </div>
                                                                                        </RadioGroup>
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>

                                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveSection(sIdx)} className="text-slate-400 hover:text-red-500 h-8 w-8">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {!collapsedSections.has(section.id) && (
                                                <CardContent className={`p-4 ${style.bg} transition-colors`}>
                                                    <div className="space-y-4">
                                                        {section.questions.map((q, qIdx) => {
                                                            // VISUAL GROUPING LOGIC
                                                            const currentGroupId = q.groupId;
                                                            const prevGroupId = qIdx > 0 ? section.questions[qIdx - 1].groupId : undefined;
                                                            const nextGroupId = qIdx < section.questions.length - 1 ? section.questions[qIdx + 1].groupId : undefined;

                                                            const isStartOfGroup = !!currentGroupId && currentGroupId !== prevGroupId;
                                                            const isEndOfGroup = !!currentGroupId && currentGroupId !== nextGroupId;
                                                            const isInGroup = !!currentGroupId;

                                                            return (
                                                                <div key={q.id} className={isInGroup ? "mb-0" : "mb-6"}>
                                                                    {/* Passage Header - Renders only at the start of a group inside section */}
                                                                    {isStartOfGroup && (
                                                                        <div className="rounded-t-xl border border-b-0 border-indigo-200 bg-indigo-50/50 overflow-hidden mt-4">
                                                                            <div className="bg-indigo-100/50 px-6 py-4 border-b border-indigo-200 flex justify-between items-center">
                                                                                <h3 className="text-sm font-bold text-indigo-700 flex items-center gap-2 uppercase tracking-wide">
                                                                                    <FileText className="w-4 h-4" /> Comprehension Passage
                                                                                </h3>
                                                                            </div>
                                                                            <div className="p-6">
                                                                                <div className="relative p-1 rounded-xl bg-slate-50 border border-slate-200 focus-within:border-indigo-300 focus-within:bg-white focus-within:shadow-sm transition-all duration-300 group/editor">
                                                                                    <IMEInput
                                                                                        as="textarea"
                                                                                        typingMode={q.typingMode}
                                                                                        value={q.passageContent || ''}
                                                                                        onChange={(val: string) => updatePassageContentInSection(sIdx, q.groupId!, val)}
                                                                                        placeholder="Write or paste the passage text here... (Markdown & MathJax/KaTeX supported)"
                                                                                        className="text-base leading-relaxed min-h-[150px] p-4 bg-transparent border-0 focus:ring-0 placeholder:text-slate-300 font-medium w-full resize-none text-slate-800"
                                                                                    />
                                                                                    <div className="absolute bottom-2 right-2 opacity-0 group-hover/editor:opacity-100 group-focus-within/editor:opacity-100 transition-opacity z-20">
                                                                                        <div className="group/info relative cursor-help">
                                                                                            <Info className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                                                                                            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover/info:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                                                                                Markdown and MathJax/KaTeX support
                                                                                                <div className="absolute top-full right-1.5 border-4 border-transparent border-t-slate-800"></div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <Card className={`
                                                                        w-full min-w-0 overflow-hidden group relative shadow-sm hover:shadow-md transition-all duration-300 bg-white
                                                                        ${isInGroup ? 'border-2 border-indigo-200 border-t-0 rounded-none shadow-none bg-indigo-50/5' : 'rounded-none sm:rounded-xl border-x-0 border-y-2 sm:border-2 border-slate-300'}
                                                                        ${isEndOfGroup ? 'rounded-b-none sm:rounded-b-xl border-b mb-6' : ''}
                                                                    `}>

                                                                        {/* Header Bar */}
                                                                        <div className="bg-slate-50/40 border-b border-slate-100 px-4 py-3 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between">
                                                                            <div className="flex items-center justify-between w-full sm:w-auto">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="drag-handle cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1 rounded hover:bg-slate-200/50 transition-colors">
                                                                                        <GripVertical className="h-4 w-4" />
                                                                                    </div>
                                                                                    <span className="font-bold text-slate-400 text-sm">Q{qIdx + 1}</span>

                                                                                    <div onClick={(e) => e.stopPropagation()}>
                                                                                        <Select value={q.type || 'single'} onValueChange={(val: any) => updateQuestionTypeInSection(sIdx, qIdx, val)}>
                                                                                            <SelectTrigger className="h-7 w-auto min-w-[130px] text-xs font-semibold border-slate-200 bg-white shadow-sm rounded-full px-3">
                                                                                                <SelectValue placeholder="Type" />
                                                                                            </SelectTrigger>
                                                                                            <SelectContent>
                                                                                                <SelectItem value="single">Single Choice</SelectItem>
                                                                                                <SelectItem value="multiple">Multiple Choice</SelectItem>
                                                                                                <SelectItem value="numerical">Numerical</SelectItem>
                                                                                                {!isInGroup && <SelectItem value="comprehension">Passage / Case Study</SelectItem>}
                                                                                            </SelectContent>
                                                                                        </Select>
                                                                                    </div>

                                                                                    {isInGroup && (
                                                                                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200 text-[10px] uppercase hidden sm:inline-flex">
                                                                                            Passage Q
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>

                                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full sm:hidden ml-2 shrink-0" onClick={() => handleRemoveQuestionFromSection(sIdx, qIdx)} disabled={section.questions.length === 1}>
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </Button>
                                                                            </div>

                                                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                                                                <div className="flex items-center gap-2 bg-white rounded-full border border-slate-200 px-3 py-1 shadow-sm">
                                                                                    <div className="flex items-center gap-1.5 border-r border-slate-100 pr-2">
                                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marks</span>
                                                                                        <Input
                                                                                            type="text"
                                                                                            value={q.marks || ''}
                                                                                            onChange={(e) => updateQuestionInSection(sIdx, qIdx, 'marks', e.target.value)}
                                                                                            className="h-4 w-8 p-0 border-none bg-transparent shadow-none focus-visible:ring-0 text-xs font-bold text-slate-700 text-center"
                                                                                            placeholder="1"
                                                                                        />
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1.5 pl-1">
                                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Neg</span>
                                                                                        <Input
                                                                                            type="text"
                                                                                            value={q.negativeMarks || ''}
                                                                                            onChange={(e) => updateQuestionInSection(sIdx, qIdx, 'negativeMarks', e.target.value)}
                                                                                            className="h-4 w-8 p-0 border-none bg-transparent shadow-none focus-visible:ring-0 text-xs font-bold text-red-600 text-center"
                                                                                            placeholder="0"
                                                                                        />
                                                                                    </div>
                                                                                </div>

                                                                                <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                                                                                <div className="flex items-center gap-1.5 bg-white rounded-full border border-slate-200 pl-2 pr-1 py-1 shadow-sm hover:border-blue-300 transition-colors cursor-pointer group/lang">
                                                                                    <Languages className="w-3 h-3 text-slate-400 group-hover/lang:text-blue-500" />
                                                                                    <Select value={q.typingMode} onValueChange={(val: 'en' | 'hi') => updateQuestionInSection(sIdx, qIdx, 'typingMode', val)}>
                                                                                        <SelectTrigger className="h-4 p-0 border-none bg-transparent focus:ring-0 text-xs font-semibold text-slate-600 w-auto gap-1">
                                                                                            <SelectValue placeholder="Lang" />
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            <SelectItem value="en">English</SelectItem>
                                                                                            <SelectItem value="hi">Hindi</SelectItem>
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </div>

                                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full ml-1 hidden sm:flex" onClick={() => handleRemoveQuestionFromSection(sIdx, qIdx)} disabled={section.questions.length === 1}>
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>

                                                                        <div className="p-6 space-y-6 min-w-0">
                                                                            <div className="space-y-3 min-w-0">
                                                                                <div className="relative p-1 rounded-xl bg-slate-50 border border-slate-200 focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-sm transition-all duration-300 group/editor min-w-0">
                                                                                    <IMEInput as="textarea" ref={(el) => imeRefs.current[`sec-${sIdx}-q-${qIdx}`] = el} typingMode={q.typingMode} placeholder="Type question..." value={q.question} onChange={(val: string) => updateQuestionInSection(sIdx, qIdx, 'question', val)} className="text-lg leading-loose min-h-[120px] p-4 bg-transparent border-0 focus:ring-0 placeholder:text-slate-300 font-medium w-full resize-none text-slate-800" />
                                                                                    <div className="absolute bottom-2 right-2 opacity-0 group-hover/editor:opacity-100 group-focus-within/editor:opacity-100 transition-opacity z-20">
                                                                                        <div className="group/info relative cursor-help">
                                                                                            <Info className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                                                                                            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover/info:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                                                                                Markdown and MathJax/KaTeX support
                                                                                                <div className="absolute top-full right-1.5 border-4 border-transparent border-t-slate-800"></div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Image Section */}
                                                                                <div className="space-y-2">
                                                                                    {(q.image || expandedImageInputs[`sec-${sIdx}-q-${qIdx}`]) ? (
                                                                                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                                                            {q.image ? (
                                                                                                <div className="relative group/img w-fit mt-2">
                                                                                                    <img src={q.image} alt="Question" className="h-48 w-auto object-contain border rounded-lg bg-slate-50 p-2 shadow-sm" />
                                                                                                    <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-md opacity-0 group-hover/img:opacity-100 transition-all scale-90 group-hover/img:scale-100" onClick={() => updateQuestionInSection(sIdx, qIdx, 'image', '')}><X className="h-4 w-4" /></Button>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="flex flex-wrap items-center border border-dashed border-slate-300 rounded-lg bg-slate-50/50 p-1 mt-2 group/upload hover:bg-slate-50 hover:border-slate-400 transition-colors">
                                                                                                    <div className="flex-1 flex gap-2 items-center px-2">
                                                                                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                                                                                            <ImageIcon className="w-4 h-4 text-slate-500" />
                                                                                                        </div>
                                                                                                        <Input placeholder="Paste Image URL or Upload" value={q.image || ''} onChange={(e) => updateQuestionInSection(sIdx, qIdx, 'image', processImageUrl(e.target.value))} className="border-none shadow-none bg-transparent focus-visible:ring-0 text-sm" />
                                                                                                    </div>
                                                                                                    <div className="h-6 w-px bg-slate-300 mx-2"></div>
                                                                                                    <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border shadow-sm hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700 mr-1">
                                                                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (base64) => updateQuestionInSection(sIdx, qIdx, 'image', base64))} />
                                                                                                        <Upload className="w-3.5 h-3.5 mr-1" />Upload
                                                                                                    </label>
                                                                                                    <button type="button" className="cursor-pointer flex items-center justify-center h-9 w-9 mr-1 rounded-md border bg-white hover:bg-slate-50 text-indigo-600 outline-none" title="Cloudinary Inline Upload" onClick={(e) => openCloudUploadModal(e, `sec-${sIdx}-q-${qIdx}`)}>
                                                                                                        <Cloud className="w-4 h-4" />
                                                                                                    </button>
                                                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 ml-1" onClick={() => toggleImageInput(`sec-${sIdx}-q-${qIdx}`)}>
                                                                                                        <X className="w-4 h-4" />
                                                                                                    </Button>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <button
                                                                                            onClick={() => toggleImageInput(`sec-${sIdx}-q-${qIdx}`)}
                                                                                            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors px-1 py-0.5 rounded focus:outline-none focus:ring-0"
                                                                                        >
                                                                                            <ImageIcon className="w-3.5 h-3.5" />
                                                                                            Add diagram / image (optional)
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            <div className="h-px bg-slate-100 w-full my-2"></div>

                                                                            {/* Answers */}
                                                                            <div>
                                                                                <div className="flex items-center justify-between mb-3">
                                                                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Options</Label>
                                                                                    {q.type === 'multiple' && <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">Select all correct options</span>}
                                                                                </div>

                                                                                {q.type === 'numerical' ? (
                                                                                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200/60 flex flex-col items-center justify-center text-center gap-4">
                                                                                        <div className="flex bg-slate-200/50 p-1 rounded-full w-fit mx-auto mb-2">
                                                                                            <button
                                                                                                onClick={() => { const current = (q.correctAnswer as any) || { min: 0, max: 0, exactAnswers: '' }; updateQuestionInSection(sIdx, qIdx, 'correctAnswer', { ...current, exactMatch: false }); }}
                                                                                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${(q.correctAnswer as any)?.exactMatch ? 'text-slate-500 hover:text-slate-700' : 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'}`}
                                                                                            >
                                                                                                Min-Max Range
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => { const current = (q.correctAnswer as any) || { min: 0, max: 0, exactAnswers: '' }; updateQuestionInSection(sIdx, qIdx, 'correctAnswer', { ...current, exactMatch: true }); }}
                                                                                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${(q.correctAnswer as any)?.exactMatch ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                                                                            >
                                                                                                Exact Answers
                                                                                            </button>
                                                                                        </div>

                                                                                        {(q.correctAnswer as any)?.exactMatch ? (
                                                                                            <div className="flex flex-col gap-2 items-center w-full max-w-sm mt-2">
                                                                                                <Label className="text-xs text-slate-500">Correct Answers (comma separated)</Label>
                                                                                                <Input
                                                                                                    type="text"
                                                                                                    placeholder="e.g. 100, 150, 200"
                                                                                                    className="w-full text-center font-mono font-bold px-4"
                                                                                                    value={(q.correctAnswer as any)?.exactAnswers || ''}
                                                                                                    onChange={(e) => {
                                                                                                        const current = (q.correctAnswer as any) || { min: 0, max: 0 };
                                                                                                        updateQuestionInSection(sIdx, qIdx, 'correctAnswer', { ...current, exactAnswers: e.target.value });
                                                                                                    }}
                                                                                                />
                                                                                                <p className="text-[10px] text-slate-400 mt-1">If a student enters any of these values, it will be marked correct.</p>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="flex gap-4 items-center mt-2">
                                                                                                <div className="text-left">
                                                                                                    <Label className="text-xs text-slate-500 ml-1">Minimum</Label>
                                                                                                    <Input type="number" step="any" className="w-32 text-center font-mono font-bold" value={(q.correctAnswer as any)?.min ?? ''} onChange={(e) => { const val = parseFloat(e.target.value); const current = (q.correctAnswer as any) || { min: 0, max: 0 }; updateQuestionInSection(sIdx, qIdx, 'correctAnswer', { ...current, min: isNaN(val) ? 0 : val }); }} />
                                                                                                </div>
                                                                                                <div className="h-px w-8 bg-slate-300 mt-5"></div>
                                                                                                <div className="text-left">
                                                                                                    <Label className="text-xs text-slate-500 ml-1">Maximum</Label>
                                                                                                    <Input type="number" step="any" className="w-32 text-center font-mono font-bold" value={(q.correctAnswer as any)?.max ?? ''} onChange={(e) => { const val = parseFloat(e.target.value); const current = (q.correctAnswer as any) || { min: 0, max: 0 }; updateQuestionInSection(sIdx, qIdx, 'correctAnswer', { ...current, max: isNaN(val) ? 0 : val }); }} />
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="grid grid-cols-1 gap-3">
                                                                                        {(() => {
                                                                                            const sortedKeys = Object.keys(q.options).sort();
                                                                                            return sortedKeys.map((optKey, optIdx) => {
                                                                                                const isLastOption = optIdx === sortedKeys.length - 1;
                                                                                                const isSelected = q.type === 'multiple' ? Array.isArray(q.correctAnswer) && q.correctAnswer.includes(optKey) : q.correctAnswer === optKey;
                                                                                                const handleSelect = () => {
                                                                                                    if (q.type === 'multiple') {
                                                                                                        const current = Array.isArray(q.correctAnswer) ? [...q.correctAnswer] : [];
                                                                                                        const idx = current.indexOf(optKey);
                                                                                                        if (idx > -1) current.splice(idx, 1); else current.push(optKey);
                                                                                                        updateQuestionInSection(sIdx, qIdx, 'correctAnswer', current.sort());
                                                                                                    } else {
                                                                                                        updateQuestionInSection(sIdx, qIdx, 'correctAnswer', optKey);
                                                                                                    }
                                                                                                };
                                                                                                return (
                                                                                                    <div key={optKey} className={`
                                                                                                        group/option relative flex gap-3 items-start p-3 rounded-xl border transition-all duration-200
                                                                                                        ${isSelected ? 'bg-emerald-50/40 border-emerald-400 ring-1 ring-emerald-400/20' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}
                                                                                                        focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/20
                                                                                                        ${isLastOption ? 'mb-6' : ''}
                                                                                                    `}>
                                                                                                        <button onClick={handleSelect} className={`
                                                                                                            mt-1 w-8 h-8 shrink-0 flex items-center justify-center font-bold text-sm transition-all shadow-sm rounded-md
                                                                                                            ${isSelected ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-white border border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600'}
                                                                                                        `}>
                                                                                                            {isSelected ? (
                                                                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                                                                                </svg>
                                                                                                            ) : (
                                                                                                                optKey
                                                                                                            )}
                                                                                                        </button>

                                                                                                        <div className="flex-1 min-w-0 flex flex-col gap-2 relative group/input-container">
                                                                                                            <div className="relative">
                                                                                                                <IMEInput
                                                                                                                    ref={(el) => imeRefs.current[`sec-${sIdx}-q-${qIdx}-opt-${optKey}`] = el}
                                                                                                                    as="textarea"
                                                                                                                    typingMode={q.typingMode}
                                                                                                                    placeholder={`Option ${optKey}`}
                                                                                                                    value={q.options[optKey]}
                                                                                                                    onChange={(val: string) => { const newSections = [...sections]; newSections[sIdx].questions[qIdx].options[optKey] = val; setSections(newSections); }}
                                                                                                                    className="min-h-[56px] text-base leading-relaxed bg-transparent border-0 p-0 pr-16 focus:ring-0 w-full resize-none placeholder:text-slate-300"
                                                                                                                />

                                                                                                                {/* Right Side Actions - Overlay on Text Area */}
                                                                                                                <div className="absolute top-0 right-0 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/option:opacity-100 transition-opacity bg-white/80 backdrop-blur-[2px] rounded-lg pl-1 py-1 z-10">
                                                                                                                    <button type="button" className="cursor-pointer flex items-center justify-center h-6 w-6 text-indigo-500 hover:bg-indigo-50 transition-all rounded-md outline-none" title="Cloudinary Inline Upload" onClick={(e) => openCloudUploadModal(e, `sec-${sIdx}-q-${qIdx}-opt-${optKey}`)}>
                                                                                                                        <Cloud className="w-3.5 h-3.5" />
                                                                                                                    </button>
                                                                                                                    <Button
                                                                                                                        variant="ghost"
                                                                                                                        size="icon"
                                                                                                                        className={`h-6 w-6 text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all rounded-md ${expandedImageInputs[`sec-${sIdx}-q-${qIdx}-opt-${optKey}`] ? 'text-blue-500 bg-blue-50 opacity-100' : ''}`}
                                                                                                                        onClick={() => toggleImageInput(`sec-${sIdx}-q-${qIdx}-opt-${optKey}`)}
                                                                                                                        title="Add Image"
                                                                                                                    >
                                                                                                                        <ImageIcon className="w-3.5 h-3.5" />
                                                                                                                    </Button>
                                                                                                                    <Button
                                                                                                                        variant="ghost"
                                                                                                                        size="icon"
                                                                                                                        className="h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all rounded-md"
                                                                                                                        onClick={() => handleRemoveOptionFromSection(sIdx, qIdx, optKey)}
                                                                                                                        title="Remove Option"
                                                                                                                    >
                                                                                                                        <X className="w-3.5 h-3.5" />
                                                                                                                    </Button>
                                                                                                                </div>
                                                                                                            </div>

                                                                                                            {/* Option Image Section (Appears Below) */}
                                                                                                            {(q.optionImages?.[optKey] || expandedImageInputs[`sec-${sIdx}-q-${qIdx}-opt-${optKey}`]) && (
                                                                                                                <div className="relative group/optimg w-fit">
                                                                                                                    {q.optionImages?.[optKey] ? (
                                                                                                                        <div className="relative group/optimg w-fit">
                                                                                                                            <img src={q.optionImages[optKey]} alt={`Option ${optKey}`} className="h-20 w-auto object-contain border rounded-md bg-white shadow-sm" />
                                                                                                                            <button
                                                                                                                                onClick={() => { const newSections = [...sections]; const q = newSections[sIdx].questions[qIdx]; if (q.optionImages) delete q.optionImages[optKey]; setSections(newSections); }}
                                                                                                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover/optimg:opacity-100 transition-opacity scale-75 group-hover/optimg:scale-100"
                                                                                                                            >
                                                                                                                                <X className="w-3 h-3" />
                                                                                                                            </button>
                                                                                                                        </div>
                                                                                                                    ) : (
                                                                                                                        <div className="flex items-center gap-1">
                                                                                                                            <Input
                                                                                                                                placeholder="Image URL"
                                                                                                                                className="h-7 text-[10px] w-32 border-slate-200 bg-slate-50"
                                                                                                                                onChange={(e) => { const newSections = [...sections]; const q = newSections[sIdx].questions[qIdx]; if (!q.optionImages) q.optionImages = {}; q.optionImages[optKey] = processImageUrl(e.target.value); setSections(newSections); }}
                                                                                                                            />
                                                                                                                            <label className="cursor-pointer p-1.5 bg-slate-100 rounded hover:bg-slate-200 relative">
                                                                                                                                {uploadingImages[`sec-${sIdx}-q-${qIdx}-opt-${optKey}`] ? (
                                                                                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                                                                                ) : (
                                                                                                                                    <Upload className="w-3 h-3" />
                                                                                                                                )}
                                                                                                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                                                                                                                    const uploadKey = `sec-${sIdx}-q-${qIdx}-opt-${optKey}`;
                                                                                                                                    setUploadingImages(prev => ({ ...prev, [uploadKey]: true }));
                                                                                                                                    handleFileUpload(e, (base64) => {
                                                                                                                                        const newSections = [...sections];
                                                                                                                                        const q = newSections[sIdx].questions[qIdx];
                                                                                                                                        if (!q.optionImages) q.optionImages = {};
                                                                                                                                        q.optionImages[optKey] = base64;
                                                                                                                                        setSections(newSections);
                                                                                                                                        setUploadingImages(prev => ({ ...prev, [uploadKey]: false }));
                                                                                                                                    });
                                                                                                                                }} />
                                                                                                                            </label>
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>

                                                                                                        {isLastOption && (
                                                                                                            <div className="group/add-btn absolute left-0 right-0 -bottom-6 h-6 flex items-center pointer-events-none">
                                                                                                                {/* Left corner curve */}
                                                                                                                <svg className="w-4 h-3 shrink-0 text-slate-200/80 transition-colors duration-200 group-hover/add-btn:text-slate-400/80 overflow-visible" viewBox="0 0 16 12" fill="none">
                                                                                                                    <path d="M0,0 C8,0 8,12 16,12" stroke="currentColor" strokeWidth="1.5" />
                                                                                                                </svg>

                                                                                                                {/* Left horizontal line */}
                                                                                                                <div className="flex-1 h-[1px] bg-slate-200/80 transition-colors duration-200 group-hover/add-btn:bg-slate-400/80"></div>

                                                                                                                {/* Center U-pocket curve */}
                                                                                                                <div className="relative w-14 h-6 shrink-0 pointer-events-auto">
                                                                                                                    <svg 
                                                                                                                        className="absolute inset-0 w-full h-full text-slate-200/80 transition-colors duration-200 group-hover/add-btn:text-slate-400/80 overflow-visible"
                                                                                                                        viewBox="0 0 56 24"
                                                                                                                        fill="none"
                                                                                                                    >
                                                                                                                        <path 
                                                                                                                            d="M0,12 L16,12 C22,12 22,23 28,23 C34,23 34,12 40,12 L56,12" 
                                                                                                                            stroke="currentColor" 
                                                                                                                            strokeWidth="1.5" 
                                                                                                                        />
                                                                                                                    </svg>
                                                                                                                    <button
                                                                                                                        type="button"
                                                                                                                        onClick={() => handleAddOptionToSection(sIdx, qIdx)}
                                                                                                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-2 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:scale-125 transition-all duration-200 cursor-pointer"
                                                                                                                        title="Add Option"
                                                                                                                    >
                                                                                                                        <Plus className="w-4 h-4 stroke-[2.5]" />
                                                                                                                    </button>
                                                                                                                </div>

                                                                                                                {/* Right horizontal line */}
                                                                                                                <div className="flex-1 h-[1px] bg-slate-200/80 transition-colors duration-200 group-hover/add-btn:bg-slate-400/80"></div>

                                                                                                                {/* Right corner curve */}
                                                                                                                <svg className="w-4 h-3 shrink-0 text-slate-200/80 transition-colors duration-200 group-hover/add-btn:text-slate-400/80 overflow-visible" viewBox="0 0 16 12" fill="none">
                                                                                                                    <path d="M0,12 C8,12 8,0 16,0" stroke="currentColor" strokeWidth="1.5" />
                                                                                                                </svg>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                );
                                                                                            });
                                                                                        })()}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </Card>
                                                                    {isEndOfGroup && (
                                                                        <div className="flex justify-center -mt-6 relative z-0">
                                                                            <div className="h-6 w-px bg-indigo-200 absolute -top-6"></div>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="secondary"
                                                                                onClick={() => handleAddSubQuestionToSection(sIdx, qIdx)}
                                                                                className="gap-2 bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 shadow-sm rounded-full px-4 mt-2"
                                                                            >
                                                                                <Plus className="w-4 h-4" /> Add Question to Passage
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        <Button onClick={() => handleAddQuestionToSection(sIdx)} size="sm" variant="outline" className="w-full border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 mt-4"><Plus className="w-4 h-4 mr-2" /> Add Question to {section.name}</Button>
                                                    </div>
                                                </CardContent>
                                            )}
                                            </Card>
                                            {sIdx < sections.length - 1 && (
                                                <div className="absolute right-4 bottom-[-28px] z-30">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddSection(sIdx + 1)}
                                                        className="flex items-center justify-center w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:shadow-md hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer shadow-sm"
                                                        title="Insert Section Here"
                                                    >
                                                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <Button onClick={handleAddSection} variant="outline" className="w-full py-6 border-dashed border-2 border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 mt-4"><Plus className="w-5 h-5 mr-2" /> Add New Section</Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-end justify-between mb-2">
                                <span className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider block">Questions ({questions.length})</span>
                                <span className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider">Standard Mode</span>
                            </div>

                            {questions.map((q, index) => {
                                // VISUAL GROUPING LOGIC
                                const currentGroupId = q.groupId;
                                const prevGroupId = index > 0 ? questions[index - 1].groupId : undefined;
                                const nextGroupId = index < questions.length - 1 ? questions[index + 1].groupId : undefined;

                                const isStartOfGroup = !!currentGroupId && currentGroupId !== prevGroupId;
                                const isEndOfGroup = !!currentGroupId && currentGroupId !== nextGroupId;
                                const isInGroup = !!currentGroupId;

                                return (
                                    <div key={index} className={isInGroup ? "space-y-0" : "space-y-6"}>

                                        {/* Passage Header */}
                                        {isStartOfGroup && (
                                            <div className="rounded-t-xl border border-b-0 border-indigo-200 bg-indigo-50/50 overflow-hidden mt-6">
                                                <div className="bg-indigo-100/50 px-6 py-4 border-b border-indigo-200 flex justify-between items-center">
                                                    <h3 className="text-sm font-bold text-indigo-700 flex items-center gap-2 uppercase tracking-wide">
                                                        <FileText className="w-4 h-4" /> Comprehension Passage
                                                    </h3>
                                                </div>
                                                <div className="p-6">
                                                    <div className="relative p-1 rounded-xl bg-slate-50 border border-slate-200 focus-within:border-indigo-300 focus-within:bg-white focus-within:shadow-sm transition-all duration-300 group/editor">
                                                        <IMEInput
                                                            as="textarea"
                                                            typingMode={q.typingMode}
                                                            value={q.passageContent || ''}
                                                            onChange={(val: string) => updatePassageContent(q.groupId!, val)}
                                                            placeholder="Write or paste the passage text here... (Markdown & MathJax/KaTeX supported)"
                                                            className="text-base leading-relaxed min-h-[150px] p-4 bg-transparent border-0 focus:ring-0 placeholder:text-slate-300 font-medium w-full resize-none text-slate-800"
                                                        />
                                                        <div className="absolute bottom-2 right-2 opacity-0 group-hover/editor:opacity-100 group-focus-within/editor:opacity-100 transition-opacity z-20">
                                                            <div className="group/info relative cursor-help">
                                                                <Info className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                                                                <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover/info:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                                                    Markdown and MathJax/KaTeX support
                                                                    <div className="absolute top-full right-1.5 border-4 border-transparent border-t-slate-800"></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Question Card */}
                                        <Card
                                            data-question-card={index === 0 ? "true" : undefined}
                                            className={`
                                                w-full min-w-0 group relative shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 bg-white
                                                ${isInGroup ? 'border-2 border-indigo-200 border-t-0 rounded-none shadow-none bg-indigo-50/5' : 'rounded-none sm:rounded-xl border-x-0 border-y-2 sm:border-2 border-slate-300'}
                                                ${isEndOfGroup ? 'rounded-b-none sm:rounded-b-xl border-b mb-6' : ''}
                                                ${isDragging ? 'border-dashed border-primary/50 opacity-60' : ''}
                                            `}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => { e.stopPropagation(); handleDropQuestion(e, index); }}
                                        >

                                            {/* Header Bar: Metadata & Actions */}
                                            <div className="bg-slate-50/40 border-b border-slate-100 px-4 py-3 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between">
                                                <div className="flex items-center justify-between w-full sm:w-auto">
                                                    <div className="flex items-center gap-3">
                                                        <div className="drag-handle cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1 rounded hover:bg-slate-200/50 transition-colors">
                                                            <GripVertical className="h-4 w-4" />
                                                        </div>
                                                        <span className="font-bold text-slate-400 text-sm">#{index + 1}</span>

                                                        {/* Type Selector Pill */}
                                                        <div onClick={(e) => e.stopPropagation()}>
                                                            <Select value={q.type || 'single'} onValueChange={(val: any) => handleQuestionTypeChange(index, val)}>
                                                                <SelectTrigger className="h-7 w-auto min-w-[130px] text-xs font-semibold border-slate-200 bg-white shadow-sm rounded-full px-3">
                                                                    <SelectValue placeholder="Type" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="single">Single Choice</SelectItem>
                                                                    <SelectItem value="multiple">Multiple Choice</SelectItem>
                                                                    <SelectItem value="numerical">Numerical</SelectItem>
                                                                    {!isInGroup && <SelectItem value="comprehension">Passage / Case Study</SelectItem>}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        {isInGroup && (
                                                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200 text-[10px] uppercase hidden sm:inline-flex">
                                                                Passage Q
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {/* MOBILE Trash Icon */}
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full sm:hidden ml-2 shrink-0" onClick={() => handleRemoveQuestion(index)} disabled={questions.length === 1}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                                    {/* Quick Settings Pills */}
                                                    <div className="flex items-center gap-2 bg-white rounded-full border border-slate-200 px-3 py-1 shadow-sm">
                                                        <div className="flex items-center gap-1.5 border-r border-slate-100 pr-2">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marks</span>
                                                            <Input
                                                                type="text"
                                                                value={q.marks || ''}
                                                                onChange={(e) => updateQuestion(index, 'marks', e.target.value)}
                                                                className="h-4 w-8 p-0 border-none bg-transparent shadow-none focus-visible:ring-0 text-xs font-bold text-slate-700 text-center"
                                                                placeholder="1"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-1.5 pl-1">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Neg</span>
                                                            <Input
                                                                type="text"
                                                                value={q.negativeMarks || ''}
                                                                onChange={(e) => updateQuestion(index, 'negativeMarks', e.target.value)}
                                                                className="h-4 w-8 p-0 border-none bg-transparent shadow-none focus-visible:ring-0 text-xs font-bold text-red-600 text-center"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                                                    <div className="flex items-center gap-1.5 bg-white rounded-full border border-slate-200 pl-2 pr-1 py-1 shadow-sm hover:border-blue-300 transition-colors cursor-pointer group/lang">
                                                        <Languages className="w-3 h-3 text-slate-400 group-hover/lang:text-blue-500" />
                                                        <Select value={q.typingMode} onValueChange={(val: 'en' | 'hi') => toggleQuestionLanguage(index, val)}>
                                                            <SelectTrigger className="h-4 p-0 border-none bg-transparent focus:ring-0 text-xs font-semibold text-slate-600 w-auto gap-1">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="en">English</SelectItem>
                                                                <SelectItem value="hi">Hindi</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* DESKTOP Trash Icon */}
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full ml-1 hidden sm:flex" onClick={() => handleRemoveQuestion(index)} disabled={questions.length === 1}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="p-6 space-y-6 min-w-0">
                                                {/* Question Input Area */}
                                                <div className="space-y-3 min-w-0">
                                                    <div className="relative p-1 rounded-xl bg-slate-50 border border-slate-200 focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-sm transition-all duration-300 group/editor min-w-0">
                                                        <IMEInput
                                                            ref={(el) => imeRefs.current[`std-q-${index}`] = el}
                                                            as="textarea"
                                                            typingMode={q.typingMode}
                                                            placeholder="Type your question here..."
                                                            value={q.question}
                                                            onChange={(val: string) => updateQuestion(index, 'question', val)}
                                                            className="text-lg leading-loose min-h-[120px] p-4 bg-transparent border-0 focus:ring-0 placeholder:text-slate-300 font-medium w-full resize-none text-slate-800"
                                                        />
                                                        <div className="absolute bottom-2 right-2 opacity-0 group-hover/editor:opacity-100 group-focus-within/editor:opacity-100 transition-opacity z-20">
                                                            <div className="group/info relative cursor-help">
                                                                <Info className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                                                                <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover/info:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                                                    Markdown and MathJax/KaTeX support
                                                                    <div className="absolute top-full right-1.5 border-4 border-transparent border-t-slate-800"></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Image Section - Collapsible */}
                                                    <div>
                                                        {(q.image || expandedImageInputs[`q-${index}`]) ? (
                                                            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                                {q.image ? (
                                                                    <div className="relative group/img w-fit mt-2">
                                                                        <img src={q.image} alt="Question Diagram" className="h-48 w-auto object-contain border rounded-lg bg-slate-50 p-2 shadow-sm" />
                                                                        <Button
                                                                            variant="destructive"
                                                                            size="icon"
                                                                            className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-md opacity-0 group-hover/img:opacity-100 transition-all scale-90 group-hover/img:scale-100"
                                                                            onClick={() => updateQuestion(index, 'image', '')}
                                                                        >
                                                                            <X className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-wrap items-center border border-dashed border-slate-300 rounded-lg bg-slate-50/50 p-1 mt-2 group/upload hover:bg-slate-50 hover:border-slate-400 transition-colors">
                                                                        <div className="flex-1 flex gap-2 items-center px-2">
                                                                            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                                                                <ImageIcon className="w-4 h-4 text-slate-500" />
                                                                            </div>
                                                                            <Input
                                                                                placeholder="Paste image URL here..."
                                                                                value={q.image || ''}
                                                                                onChange={(e) => updateQuestion(index, 'image', processImageUrl(e.target.value))}
                                                                                className="border-none shadow-none bg-transparent focus-visible:ring-0 text-sm"
                                                                            />
                                                                        </div>
                                                                        <div className="h-6 w-px bg-slate-300 mx-2"></div>
                                                                        <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border shadow-sm hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700 mr-1">
                                                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (base64) => updateQuestion(index, 'image', base64))} />
                                                                            <Upload className="w-3.5 h-3.5" />
                                                                            Upload
                                                                        </label>
                                                                        <Button variant="outline" size="icon" type="button" className="h-9 w-9 mr-1" onClick={() => openCaptureModal('question', index)} title="Capture Snip">
                                                                            <Monitor className="w-4 h-4 text-blue-600" />
                                                                        </Button>
                                                                        <button type="button" className="cursor-pointer flex items-center justify-center h-9 w-9 mr-1 rounded-md border bg-white hover:bg-slate-50 text-indigo-600 shadow-sm outline-none" title="Cloudinary Inline Upload" onClick={(e) => openCloudUploadModal(e, `std-q-${index}`)}>
                                                                            <Cloud className="w-4 h-4" />
                                                                        </button>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 ml-1" onClick={() => toggleImageInput(`q-${index}`)}>
                                                                            <X className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => toggleImageInput(`q-${index}`)}
                                                                className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors px-1 py-0.5 rounded focus:outline-none focus:ring-0"
                                                            >
                                                                <ImageIcon className="w-3.5 h-3.5" />
                                                                Add diagram / image (optional)
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Separator */}
                                                <div className="h-px bg-slate-100 w-full my-2"></div>

                                                {/* Options Area */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Options</Label>
                                                        {q.type === 'multiple' && <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">Select all correct options</span>}
                                                    </div>

                                                    {q.type === 'numerical' ? (
                                                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200/60 flex flex-col items-center justify-center text-center gap-4">
                                                            <div className="flex bg-slate-200/50 p-1 rounded-full w-fit mx-auto mb-2">
                                                                <button
                                                                    onClick={() => { const current = (q.correctAnswer as any) || { min: 0, max: 0, exactAnswers: '' }; updateQuestion(index, 'correctAnswer', { ...current, exactMatch: false }); }}
                                                                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${(q.correctAnswer as any)?.exactMatch ? 'text-slate-500 hover:text-slate-700' : 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'}`}
                                                                >
                                                                    Min-Max Range
                                                                </button>
                                                                <button
                                                                    onClick={() => { const current = (q.correctAnswer as any) || { min: 0, max: 0, exactAnswers: '' }; updateQuestion(index, 'correctAnswer', { ...current, exactMatch: true }); }}
                                                                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${(q.correctAnswer as any)?.exactMatch ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                                                >
                                                                    Exact Answers
                                                                </button>
                                                            </div>

                                                            {(q.correctAnswer as any)?.exactMatch ? (
                                                                <div className="flex flex-col gap-2 items-center w-full max-w-sm mt-2">
                                                                    <Label className="text-xs text-slate-500">Correct Answers (comma separated)</Label>
                                                                    <Input
                                                                        type="text"
                                                                        placeholder="e.g. 100, 150, 200"
                                                                        className="w-full text-center font-mono font-bold px-4"
                                                                        value={(q.correctAnswer as any)?.exactAnswers || ''}
                                                                        onChange={(e) => {
                                                                            const current = (q.correctAnswer as any) || { min: 0, max: 0 };
                                                                            updateQuestion(index, 'correctAnswer', { ...current, exactAnswers: e.target.value });
                                                                        }}
                                                                    />
                                                                    <p className="text-[10px] text-slate-400 mt-1">If a student enters any of these values, it will be marked correct.</p>
                                                                </div>
                                                            ) : (
                                                                <div className="flex gap-4 items-center mt-2">
                                                                    <div className="text-left">
                                                                        <Label className="text-xs text-slate-500 ml-1">Minimum</Label>
                                                                        <Input type="number" step="any" className="w-32 text-center font-mono font-bold" value={(q.correctAnswer as any)?.min || ''} onChange={(e) => { const val = parseFloat(e.target.value); const current = (q.correctAnswer as any) || { min: 0, max: 0 }; updateQuestion(index, 'correctAnswer', { ...current, min: isNaN(val) ? 0 : val }); }} />
                                                                    </div>
                                                                    <div className="h-px w-8 bg-slate-300 mt-5"></div>
                                                                    <div className="text-left">
                                                                        <Label className="text-xs text-slate-500 ml-1">Maximum</Label>
                                                                        <Input type="number" step="any" className="w-32 text-center font-mono font-bold" value={(q.correctAnswer as any)?.max || ''} onChange={(e) => { const val = parseFloat(e.target.value); const current = (q.correctAnswer as any) || { min: 0, max: 0 }; updateQuestion(index, 'correctAnswer', { ...current, max: isNaN(val) ? 0 : val }); }} />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 gap-3">
                                                            {(() => {
                                                                const sortedKeys = Object.keys(q.options).sort();
                                                                return sortedKeys.map((optKey, optIdx) => {
                                                                    const isLastOption = optIdx === sortedKeys.length - 1;
                                                                    const isSelected = q.type === 'multiple' ? Array.isArray(q.correctAnswer) && q.correctAnswer.includes(optKey) : q.correctAnswer === optKey;
                                                                    const handleSelect = () => {
                                                                        if (q.type === 'multiple') {
                                                                            const current = Array.isArray(q.correctAnswer) ? [...q.correctAnswer] : [];
                                                                            const idx = current.indexOf(optKey);
                                                                            if (idx > -1) current.splice(idx, 1); else current.push(optKey);
                                                                            updateQuestion(index, 'correctAnswer', current.sort());
                                                                        } else {
                                                                            updateQuestion(index, 'correctAnswer', optKey);
                                                                        }
                                                                    };

                                                                    return (
                                                                        <div key={optKey}
                                                                            className={`
                                                                                group/option relative flex gap-3 items-start p-3 rounded-xl border transition-all duration-200
                                                                                ${isSelected ? 'bg-emerald-50/40 border-emerald-400 ring-1 ring-emerald-400/20' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}
                                                                                focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/20
                                                                                ${isLastOption ? 'mb-6' : ''}
                                                                             `}>

                                                                            {/* Option Label/Selector */}
                                                                            <button
                                                                                onClick={handleSelect}
                                                                                className={`
                                                                                    mt-1 w-8 h-8 shrink-0 flex items-center justify-center font-bold text-sm transition-all shadow-sm
                                                                                    ${q.type === 'single' ? 'rounded-full' : 'rounded-lg'}
                                                                                    ${isSelected
                                                                                        ? 'bg-emerald-500 text-white shadow-emerald-200'
                                                                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}
                                                                                `}
                                                                            >
                                                                                {q.type === 'multiple' && isSelected ? <Check className="w-5 h-5" /> : optKey}
                                                                            </button>

                                                                            <div className="flex-1 min-w-0 flex flex-col gap-2 relative group/input-container">
                                                                                {/* Option Text Input */}
                                                                                <div className="relative">
                                                                                    <IMEInput
                                                                                        ref={(el) => imeRefs.current[`std-q-${index}-opt-${optKey}`] = el}
                                                                                        as="textarea"
                                                                                        typingMode={q.typingMode}
                                                                                        placeholder={`Type option ${optKey}...`}
                                                                                        value={q.options[optKey]}
                                                                                        onChange={(val: string) => updateOption(index, optKey, val)}
                                                                                        className="min-h-[56px] text-base leading-relaxed bg-transparent border-0 p-0 pr-8 focus:ring-0 w-full resize-none placeholder:text-slate-300"
                                                                                        onKeyDown={(e: React.KeyboardEvent) => {
                                                                                            // Auto focus logic skipped for now
                                                                                        }}
                                                                                    />

                                                                                    {/* Right Side Actions - Overlay on Text Area */}
                                                                                    <div className="absolute top-0 right-0 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/option:opacity-100 transition-opacity bg-white/80 backdrop-blur-[2px] rounded-lg pl-1 py-1 z-10 pointer-events-auto">
                                                                                        <button type="button" className="cursor-pointer flex items-center justify-center h-6 w-6 text-indigo-500 hover:bg-indigo-50 transition-all rounded-md outline-none" title="Cloudinary Inline Upload" onClick={(e) => openCloudUploadModal(e, `std-q-${index}-opt-${optKey}`)}>
                                                                                            <Cloud className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className={`h-6 w-6 text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all rounded-md ${expandedImageInputs[`q-${index}-opt-${optKey}`] ? 'text-blue-500 bg-blue-50 opacity-100' : ''}`}
                                                                                            onClick={() => toggleImageInput(`q-${index}-opt-${optKey}`)}
                                                                                            title="Add Image"
                                                                                        >
                                                                                            <ImageIcon className="w-3.5 h-3.5" />
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all rounded-md"
                                                                                            onClick={() => handleRemoveOption(index, optKey)}
                                                                                            title="Remove Option"
                                                                                        >
                                                                                            <X className="w-3.5 h-3.5" />
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Option Image Section (Appears Below) */}
                                                                                {(q.optionImages?.[optKey] || expandedImageInputs[`q-${index}-opt-${optKey}`]) && (
                                                                                    <div className="relative group/optimg w-fit">
                                                                                        {q.optionImages?.[optKey] ? (
                                                                                            <>
                                                                                                <img src={q.optionImages[optKey]} alt="" className="h-20 w-auto object-contain border rounded-md bg-white shadow-sm" />
                                                                                                <button
                                                                                                    onClick={() => { const nq = [...questions]; if (nq[index].optionImages) delete nq[index].optionImages![optKey]; setQuestions(nq); }}
                                                                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover/optimg:opacity-100 transition-opacity scale-75 group-hover/optimg:scale-100"
                                                                                                >
                                                                                                    <X className="w-3 h-3" />
                                                                                                </button>
                                                                                            </>
                                                                                        ) : (
                                                                                            <div className="flex items-center gap-1 mt-1">
                                                                                                <Input
                                                                                                    placeholder="Image URL"
                                                                                                    className="h-7 text-[10px] w-32 border-slate-200 bg-slate-50"
                                                                                                    onChange={(e) => { const nq = [...questions]; if (!nq[index].optionImages) nq[index].optionImages = {}; nq[index].optionImages![optKey] = processImageUrl(e.target.value); setQuestions(nq); }}
                                                                                                />
                                                                                                <label className="cursor-pointer p-1.5 bg-slate-100 rounded hover:bg-slate-200 relative">
                                                                                                    {uploadingImages[`q-${index}-opt-${optKey}`] ? (
                                                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                                                    ) : (
                                                                                                        <Upload className="w-3 h-3" />
                                                                                                    )}
                                                                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                                                                                        const uploadKey = `q-${index}-opt-${optKey}`;
                                                                                                        setUploadingImages(prev => ({ ...prev, [uploadKey]: true }));
                                                                                                        handleFileUpload(e, (base64) => {
                                                                                                            const nq = [...questions];
                                                                                                            if (!nq[index].optionImages) nq[index].optionImages = {};
                                                                                                            nq[index].optionImages![optKey] = base64;
                                                                                                            setQuestions(nq);
                                                                                                            setUploadingImages(prev => ({ ...prev, [uploadKey]: false }));
                                                                                                        });
                                                                                                    }} />
                                                                                                </label>
                                                                                                <button type="button" className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" onClick={() => openCaptureModal('option', index, optKey)} title="Capture Snip">
                                                                                                    <Monitor className="w-3 h-3" />
                                                                                                </button>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {isLastOption && (
                                                                                <div className="group/add-btn absolute left-0 right-0 -bottom-6 h-6 flex items-center pointer-events-none">
                                                                                    {/* Left corner curve */}
                                                                                    <svg className="w-4 h-3 shrink-0 text-slate-200/80 transition-colors duration-200 group-hover/add-btn:text-slate-400/80 overflow-visible" viewBox="0 0 16 12" fill="none">
                                                                                        <path d="M0,0 C8,0 8,12 16,12" stroke="currentColor" strokeWidth="1.5" />
                                                                                    </svg>

                                                                                    {/* Left horizontal line */}
                                                                                    <div className="flex-1 h-[1px] bg-slate-200/80 transition-colors duration-200 group-hover/add-btn:bg-slate-400/80"></div>

                                                                                    {/* Center U-pocket curve */}
                                                                                    <div className="relative w-14 h-6 shrink-0 pointer-events-auto">
                                                                                        <svg 
                                                                                            className="absolute inset-0 w-full h-full text-slate-200/80 transition-colors duration-200 group-hover/add-btn:text-slate-400/80 overflow-visible"
                                                                                            viewBox="0 0 56 24"
                                                                                            fill="none"
                                                                                        >
                                                                                            <path 
                                                                                                d="M0,12 L16,12 C22,12 22,23 28,23 C34,23 34,12 40,12 L56,12" 
                                                                                                stroke="currentColor" 
                                                                                                strokeWidth="1.5" 
                                                                                            />
                                                                                        </svg>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => handleAddOption(index)}
                                                                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-2 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:scale-125 transition-all duration-200 cursor-pointer"
                                                                                            title="Add Option"
                                                                                        >
                                                                                            <Plus className="w-4 h-4 stroke-[2.5]" />
                                                                                        </button>
                                                                                    </div>

                                                                                    {/* Right horizontal line */}
                                                                                    <div className="flex-1 h-[1px] bg-slate-200/80 transition-colors duration-200 group-hover/add-btn:bg-slate-400/80"></div>

                                                                                    {/* Right corner curve */}
                                                                                    <svg className="w-4 h-3 shrink-0 text-slate-200/80 transition-colors duration-200 group-hover/add-btn:text-slate-400/80 overflow-visible" viewBox="0 0 16 12" fill="none">
                                                                                        <path d="M0,12 C8,12 8,0 16,0" stroke="currentColor" strokeWidth="1.5" />
                                                                                    </svg>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>

                                        {/* Add Sub-Question for Passage */}
                                        {isEndOfGroup && (
                                            <div className="flex justify-center -mt-6 relative z-0">
                                                <div className="h-6 w-px bg-indigo-200 absolute -top-6"></div>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleAddSubQuestion(index)}
                                                    className="gap-2 bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 shadow-sm rounded-full px-4 mt-2"
                                                >
                                                    <Plus className="w-4 h-4" /> Add Question to Passage
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            <Button
                                onClick={handleAddQuestion}
                                size="lg"
                                variant="outline"
                                className="w-full py-8 border-dashed border-2 border-slate-300 text-slate-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/30 transition-all duration-300 text-base font-semibold"
                            >
                                <Plus className="w-6 h-6 mr-2" /> Add New Question
                            </Button>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-4 pb-20">
                    {onCancel ? (
                        <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    ) : (
                        <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                    )}
                    <Button onClick={handleSave} disabled={loading} size="lg" className="min-w-[150px]">{loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Save Test</Button>
                </div>

                {/* Floating Navigation Arrows */}
                <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[9999]">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full shadow-lg border border-slate-200 bg-white/90 backdrop-blur-sm hover:bg-white hover:text-indigo-600 transition-all h-10 w-10 shrink-0 group/scroll"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        title="Scroll to Top"
                    >
                        <ChevronUp className="h-6 w-6 text-slate-500 group-hover/scroll:scale-110 transition-transform" />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full shadow-lg border border-slate-200 bg-white/90 backdrop-blur-sm hover:bg-white hover:text-indigo-600 transition-all h-10 w-10 shrink-0 group/scroll"
                        onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
                        title="Scroll to Bottom"
                    >
                        <ChevronDown className="h-6 w-6 text-slate-500 group-hover/scroll:scale-110 transition-transform" />
                    </Button>
                </div>
            </div>
            <React.Suspense fallback={null}>
                <ScreenshotCaptureModal
                    isOpen={isCaptureModalOpen}
                    onClose={() => setIsCaptureModalOpen(false)}
                    onCapture={handleScreenshotCapture}
                />
            </React.Suspense>

            {/* Cloudinary Upload Modal */}
            {isCloudUploadOpen && cloudUploadTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-left">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-800">Upload Image</h3>
                                <Button variant="ghost" size="icon" onClick={() => setIsCloudUploadOpen(false)} className="h-8 w-8 rounded-full">
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            <div
                                ref={cloudUploadBoxRef}
                                className="border-2 border-dashed border-slate-200 rounded-xl p-8 pb-6 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors cursor-pointer group outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-indigo-50/30"
                                tabIndex={0}
                                autoFocus
                                onPaste={(e) => handleCloudinaryUpload(e, cloudUploadTarget)}
                                onClick={() => document.getElementById('cloud-modal-upload')?.click()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        document.getElementById('cloud-modal-upload')?.click();
                                    }
                                }}
                            >
                                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <Cloud className="w-7 h-7" />
                                </div>
                                <p className="text-slate-600 font-medium mb-1">Upload from Device</p>
                                <p className="text-sm text-slate-400 mb-4 px-2">or press <kbd className="hidden sm:inline-block px-1.5 py-0.5 max-w-max mx-1 rounded border border-slate-200 bg-slate-50 text-[10px] font-mono text-slate-500 font-bold shadow-sm whitespace-nowrap">Ctrl+V</kbd> inside this box</p>
                                <input
                                    id="cloud-modal-upload"
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleCloudinaryUpload(e, cloudUploadTarget)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Institution Name Preview Lightbox */}
            {showInstitutePreview && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setShowInstitutePreview(false)}
                >
                    <div
                        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Institution Name — Live Preview</h3>
                                <p className="text-xs text-slate-500 mt-0.5">This is how your institution name will appear on the live test page.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowInstitutePreview(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex border-b border-slate-100 dark:border-slate-800 px-5 pt-3 gap-1">
                            <button
                                type="button"
                                onClick={() => setPreviewImageIndex(0)}
                                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all ${previewImageIndex === 0
                                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/60'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                <Monitor className="w-3.5 h-3.5" />
                                Desktop View
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewImageIndex(1)}
                                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all ${previewImageIndex === 1
                                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/60'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                <Smartphone className="w-3.5 h-3.5" />
                                Phone View
                            </button>
                        </div>

                        {/* Image Display */}
                        <div className="p-5 bg-slate-50 dark:bg-slate-950">
                            {previewImageIndex === 0 ? (
                                <div className="rounded-xl overflow-hidden border border-slate-200 shadow-md">
                                    <img
                                        src="/institute-name-showcase/testoza-live-test page-for institution-name-computer-view.png"
                                        alt="Institution name on desktop live test"
                                        className="w-full h-auto object-contain max-h-[55vh]"
                                    />
                                </div>
                            ) : (
                                <div className="flex justify-center">
                                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-md max-w-[280px] w-full">
                                        <img
                                            src="/institute-name-showcase/testoza-live-test page-for institution-name-phone-view.jpg"
                                            alt="Institution name on phone live test"
                                            className="w-full h-auto object-contain max-h-[55vh]"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer hint */}
                        <div className="px-5 pb-4 pt-0 text-center">
                            <p className="text-[11px] text-slate-400 italic">
                                The institution name appears prominently at the top of the test page for all students.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Triggers on Left Screen Edge */}
            <div className="fixed left-0 top-1/2 -translate-y-1/2 z-[9998] flex flex-col gap-2">
                <button
                    type="button"
                    onClick={() => setShowGuide(v => !v)}
                    className="ai-guide-trigger flex flex-col items-center justify-center gap-1.5 w-10 py-3 rounded-r-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg border border-l-0 border-indigo-400/30 transition-all group hover:w-11 animate-pulse"
                    title="How to write complex questions (AI Guide)"
                >
                    <Sparkles className="w-5 h-5 transition-transform group-hover:scale-110" />
                    <span className="text-[9px] font-bold tracking-wider uppercase [writing-mode:vertical-lr] select-none">AI Guide</span>
                </button>
                <button
                    type="button"
                    onClick={() => setShowMathKeyboard(v => !v)}
                    className="sy-pad-trigger flex flex-col items-center justify-center gap-1.5 w-10 py-3 rounded-r-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg border border-l-0 border-blue-400/30 transition-all group hover:w-11"
                    title="Open Virtual Sy Pad"
                >
                    <Calculator className="w-5 h-5 transition-transform group-hover:scale-110" />
                    <span className="text-[9px] font-bold tracking-wider [writing-mode:vertical-lr] select-none">Sy Pad</span>
                </button>
            </div>

            {/* Virtual Math Keyboard Overlay */}
            <React.Suspense fallback={null}>
                <MathKeyboard
                    isOpen={showMathKeyboard}
                    onClose={() => setShowMathKeyboard(false)}
                />
            </React.Suspense>

            {/* AI Prompt Guide Overlay */}
            <React.Suspense fallback={null}>
                <AiPromptGuide
                    isOpen={showGuide}
                    onClose={() => setShowGuide(false)}
                />
            </React.Suspense>
        </div >
    );
}