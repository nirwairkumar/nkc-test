import { TestBuilderMinimap } from './TestBuilderMinimap';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useNavigate, useParams } from 'react-router-dom';
import { createTest, fetchTestById, updateTest, TestSection } from '@/lib/testsApi';
import { toast } from 'sonner';
import {
    Plus, Trash2, Save, ArrowLeft, Loader2, Upload, X, Check, ChevronsUpDown, Cloud, CloudOff, Info, PenLine,
    MoreHorizontal, Monitor, ChevronDown, ChevronUp, Grip, Type, Smartphone, ExternalLink, Sparkles, Calculator,
    WifiOff, Layers, Building2, Sigma, BookOpen, Eraser, FileQuestion, AlertTriangle, Lock, Globe, Clock,
    SlidersHorizontal, Copy, Combine,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { IMEInput, IMEInputHandle } from '@/components/ui/IMEInput';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import LatexRenderer from '@/components/ui/LatexRenderer';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from "@/lib/utils"
import { fetchCategories } from '@/lib/categoriesApi';
import slugify from 'slugify';

import { TestUploadFormatGuide } from '@/components/TestUploadFormatGuide';
import { SYPAD_INSERT_EVENT } from './math-keyboard/mathSyntax';
import { QuestionCard, PassageHeader, PassageFooter, InsertBetween, type PhotoBanner } from './test-builder/QuestionCard';
import {
    type QuestionState, DEFAULT_QUESTION, applyPhotoResult, questionIssue,
} from './test-builder/builderUtils';
import type { PhotoQuestion } from '@/lib/photoQuestionApi';
const JsonImporter = React.lazy(() => import('@/components/test-builder/JsonImporter'));
const ScreenshotCaptureModal = React.lazy(() => import('@/components/test-builder/ScreenshotCaptureModal'));
const PhotoFillSheet = React.lazy(() => import('@/components/test-builder/PhotoFillSheet'));
const MathKeyboard = React.lazy(() => import('./math-keyboard/MathKeyboard'));
const AiPromptGuide = React.lazy(() => import('./AiPromptGuide'));

interface TestBuilderProps {
    initialData?: any;
    onSuccess?: () => void;
    onCancel?: () => void;
    onAiImport?: () => void;
}

/* ── Visual language: same tokens as /my-tests and the landing page ─────────── */

const PRIMARY_BTN =
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary text-[15px] font-semibold text-white ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_24px_-12px_rgba(2,132,199,0.85)] ' +
    'transition-[background-color,transform] duration-150 hover:bg-[hsl(200,95%,30%)] motion-safe:active:scale-[0.97] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2 cursor-pointer disabled:opacity-60';
const PILL_BTN =
    'inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-900/[0.07] ' +
    'transition-[background-color,transform] duration-150 hover:bg-slate-50 motion-safe:active:scale-[0.97] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 cursor-pointer';
const GROUP =
    'overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)]';
const FIELD_LABEL = 'mb-1.5 block text-[13px] font-semibold text-slate-600';
const TEXT_FIELD =
    'h-12 w-full rounded-xl bg-slate-50 px-3.5 text-[16px] text-slate-900 ring-1 ring-inset ring-slate-900/[0.08] placeholder:text-slate-400 ' +
    'transition-[background-color,box-shadow] focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/45';

const SECTION_TONES = [
    { dot: 'bg-slate-500', head: 'bg-slate-50', ring: 'ring-slate-900/[0.07]' },
    { dot: 'bg-amber-500', head: 'bg-amber-50/80', ring: 'ring-amber-600/15' },
    { dot: 'bg-emerald-500', head: 'bg-emerald-50/80', ring: 'ring-emerald-600/15' },
    { dot: 'bg-sky-500', head: 'bg-sky-50/80', ring: 'ring-sky-600/15' },
    { dot: 'bg-violet-500', head: 'bg-violet-50/80', ring: 'ring-violet-600/15' },
    { dot: 'bg-rose-500', head: 'bg-rose-50/80', ring: 'ring-rose-600/15' },
];

const BASIC_FORMATS = [
    { cat: 'Energy–mass equivalence', raw: '$E = mc^2$' },
    { cat: 'Acceleration unit', raw: '$2.4\\,\\text{m/s}^2$' },
    { cat: 'Pythagorean theorem', raw: '$a^2 + b^2 = c^2$' },
    { cat: 'Square root', raw: '$\\sqrt{16} = 4$' },
    { cat: 'Simple fraction', raw: '$\\frac{1}{2}$' },
    { cat: 'Chemical — Water', raw: '$\\ce{H2O}$' },
    { cat: 'Chemical — Glucose', raw: '$\\ce{C6H12O6}$' },
    { cat: 'Speed of light', raw: '$c = 3\\times10^8\\,\\text{m/s}$' },
];
const ADVANCED_FORMATS = [
    { cat: 'Quadratic formula', raw: '$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$' },
    { cat: 'Definite integral', raw: '$\\int_0^\\infty e^{-x}\\,dx=1$' },
    { cat: 'Summation (sigma)', raw: '$\\sum_{n=1}^{\\infty}\\frac{1}{n^2}=\\frac{\\pi^2}{6}$' },
    { cat: 'Limit', raw: '$\\lim_{x\\to 0}\\frac{\\sin x}{x}=1$' },
    { cat: 'Greek letters', raw: '$\\alpha,\\beta,\\gamma,\\Delta,\\Omega$' },
    { cat: "Newton's 2nd law", raw: '$\\vec{F}=m\\vec{a}$' },
    { cat: "Ohm's law", raw: '$V=IR$' },
    { cat: 'Chemical rxn — CO₂', raw: '$\\ce{C + O2 -> CO2}$' },
    { cat: 'Chemical rxn — NaCl', raw: '$\\ce{Na + Cl -> NaCl}$' },
    { cat: 'Binomial probability', raw: '$P(X=k)=\\binom{n}{k}p^k(1-p)^{n-k}$' },
    { cat: 'Matrix (2×2)', raw: '$\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}$' },
    { cat: "Euler's identity", raw: '$e^{i\\pi}+1=0$' },
];

const TIME_PRESETS = [15, 30, 60, 90, 180];

/** iOS settings-style row: icon tile, title + one line of explanation, control on the right. */
function SettingRow({
    icon, tone = 'sky', title, detail, children, onClick, expanded,
}: {
    icon: React.ReactNode; tone?: 'sky' | 'amber' | 'violet' | 'emerald' | 'slate';
    title: React.ReactNode; detail: React.ReactNode; children?: React.ReactNode;
    onClick?: () => void; expanded?: boolean;
}) {
    const tones = {
        sky: 'bg-sky-100 text-sky-700', amber: 'bg-amber-100 text-amber-700', violet: 'bg-violet-100 text-violet-700',
        emerald: 'bg-emerald-100 text-emerald-700', slate: 'bg-slate-100 text-slate-600',
    };
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag
            {...(onClick ? { type: 'button' as const, onClick, 'aria-expanded': expanded } : {})}
            className={cn('flex w-full items-center gap-3.5 px-4 py-3.5 text-left sm:px-5', onClick && 'transition-colors hover:bg-slate-50 cursor-pointer')}
        >
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]', tones[tone])}>{icon}</span>
            <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-slate-900">{title}</span>
                <span className="block text-[13px] leading-snug text-slate-500">{detail}</span>
            </span>
            {children}
        </Tag>
    );
}

function Segmented<T extends string>({ value, onChange, options, label }: {
    value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; label: string;
}) {
    return (
        <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-slate-200/60 p-1">
            {options.map(o => (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={value === o.value}
                    onClick={() => onChange(o.value)}
                    className={cn(
                        'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[9px] px-3 text-[14px] font-semibold transition-all',
                        value === o.value ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.12),0_1px_1px_rgba(15,23,42,0.04)]' : 'text-slate-600 hover:text-slate-900',
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

type PhotoTarget = { id: number; label: string; expectedType?: 'single' | 'multiple' | 'numerical' };
type PhotoFill = { previous: QuestionState; banner: PhotoBanner };

export default function TestBuilder({ initialData, onSuccess, onCancel, onAiImport }: TestBuilderProps) {
    const { user, profile, isAdmin } = useAuth();
    const { openAuthModal } = useAuthModal();
    const navigate = useNavigate();

    // Fallback to URL params if no initialData provided (for direct route access)
    const { id: paramId } = useParams();
    const testId = initialData?.id || paramId;
    const isEditMode = !!testId;

    const { isPremium } = usePremiumStatus();
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
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [logoDragOver, setLogoDragOver] = useState(false);

    // Description typing mode
    const [descriptionLanguage, setDescriptionLanguage] = useState<'en' | 'hi'>('en');

    // Online/Offline State
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Section Mode & Calculator State
    type SectionState = Omit<TestSection, 'questions'> & { questions: QuestionState[]; colorIndex?: number };
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
    const [deletingSections, setDeletingSections] = useState<Set<string>>(new Set());
    const [deletingQuestions, setDeletingQuestions] = useState<Set<string | number>>(new Set());
    const [newlyAddedQuestionIds, setNewlyAddedQuestionIds] = useState<Set<string | number>>(new Set());
    const [showSupportedFormats, setShowSupportedFormats] = useState(false);
    const [showAdvancedFormats, setShowAdvancedFormats] = useState(false);
    const [showMathKeyboard, setShowMathKeyboard] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showFormatGuide, setShowFormatGuide] = useState(false);

    // Page layout state
    const [instructionsOpen, setInstructionsOpen] = useState<boolean | null>(null);
    const [brandingOpen, setBrandingOpen] = useState(false);
    const [flashId, setFlashId] = useState<string | null>(null);
    const [showJumpButtons, setShowJumpButtons] = useState(false);

    // Fill-from-photo
    const [photoTarget, setPhotoTarget] = useState<PhotoTarget | null>(null);
    const [photoFills, setPhotoFills] = useState<Record<string, PhotoFill>>({});

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
        const prefix = first.substring(0, i).replace(/[-_\s]+$/, '').trim();
        return prefix || names[0];
    };

    // Auto Save State
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Screenshot Capture State — the snip is applied by whoever opened it (question or option)
    const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
    const [captureApply, setCaptureApply] = useState<((base64: string) => void) | null>(null);

    // --- Cloudinary Integration ---
    const imeRefs = React.useRef<Record<string, IMEInputHandle | null>>({});
    const [isCloudUploadOpen, setIsCloudUploadOpen] = useState(false);
    const [cloudUploadTarget, setCloudUploadTarget] = useState<string | null>(null);
    const cloudUploadBoxRef = React.useRef<HTMLDivElement>(null);

    const registerRef = useCallback((key: string, el: IMEInputHandle | null) => {
        imeRefs.current[key] = el;
    }, []);

    useEffect(() => {
        if (isCloudUploadOpen && cloudUploadBoxRef.current) {
            // Small timeout to ensure the DOM has painted before focusing
            setTimeout(() => cloudUploadBoxRef.current?.focus(), 50);
        }
    }, [isCloudUploadOpen]);

    useEffect(() => {
        const handleToggleGuide = () => setShowGuide(prev => !prev);
        const handleToggleSyPad = () => setShowMathKeyboard(prev => !prev);
        // The Sy Pad asks us to insert when its target box has switched to preview mode
        const handleSyPadInsert = (e: Event) => {
            const { target, text } = (e as CustomEvent<{ target: string; text: string }>).detail || {};
            if (target && text) imeRefs.current[target]?.insertAtCursor(text);
        };

        window.addEventListener('toggle_ai_guide', handleToggleGuide);
        window.addEventListener('toggle_sy_pad', handleToggleSyPad);
        window.addEventListener(SYPAD_INSERT_EVENT, handleSyPadInsert);

        return () => {
            window.removeEventListener('toggle_ai_guide', handleToggleGuide);
            window.removeEventListener('toggle_sy_pad', handleToggleSyPad);
            window.removeEventListener(SYPAD_INSERT_EVENT, handleSyPadInsert);
        };
    }, []);

    // Phone jump buttons only once the page is long enough to need them
    useEffect(() => {
        const onScroll = () => setShowJumpButtons(window.scrollY > 700);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // A drag that ends outside a drop target must still clear the "dragging" look
    useEffect(() => {
        const clear = () => setDraggingIndex(null);
        window.addEventListener('dragend', clear);
        return () => window.removeEventListener('dragend', clear);
    }, []);

    const openSyPad = useCallback((refKey?: string) => {
        if (refKey) imeRefs.current[refKey]?.focus();
        setShowMathKeyboard(true);
    }, []);

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

    const openSnip = useCallback((apply: (base64: string) => void) => {
        setCaptureApply(() => apply);
        setIsCaptureModalOpen(true);
    }, []);

    const handleScreenshotCapture = (base64: string) => {
        captureApply?.(base64);
        setCaptureApply(null);
        setIsCaptureModalOpen(false);
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
        }

        // Otherwise fetch from ID
        if (isEditMode && testId && user) {
            setLoading(true);
            fetchTestById(testId, undefined, false, true).then(async ({ data }) => {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setPhotoFills({});

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

            const mappedQ = {
                ...q,
                id: resolvedId,
                type: q.type || 'single',
                question: q.question || q.questionText || '',
                typingMode: 'en' as const,
                marks: q.marks !== undefined ? String(q.marks) : '4',
                negativeMarks: q.negativeMarks !== undefined ? String(q.negativeMarks) : '1',
            };

            let flatOptions: { [key: string]: string } = {};
            const flatOptionImages: { [key: string]: string } = q.optionImages || {};

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

    const flashNew = (id: string | number) => {
        setNewlyAddedQuestionIds(prev => new Set(prev).add(id));
        setTimeout(() => {
            setNewlyAddedQuestionIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }, 1500);
    };

    const handleAddQuestion = (insertAtIndex?: number | React.MouseEvent) => {
        const lastQ = questions.length > 0 ? questions[questions.length - 1] : null;
        const newQ: QuestionState = {
            ...DEFAULT_QUESTION,
            id: questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1,
            options: { ...DEFAULT_QUESTION.options },
            typingMode: lastTypingMode,
            marks: lastQ ? (lastQ.marks || '4') : '4',
            negativeMarks: lastQ ? (lastQ.negativeMarks || '1') : '1'
        };

        flashNew(newQ.id);

        if (typeof insertAtIndex === 'number') {
            const prevQ = questions[insertAtIndex - 1];
            const nextQ = questions[insertAtIndex];
            if (prevQ?.groupId && nextQ?.groupId && prevQ.groupId === nextQ.groupId) {
                newQ.groupId = prevQ.groupId;
                newQ.passageContent = prevQ.passageContent;
            }
            const newQuestions = [...questions];
            newQuestions.splice(insertAtIndex, 0, newQ);
            setQuestions(newQuestions);
        } else {
            setQuestions([...questions, newQ]);
        }
    };

    const handleRemoveQuestion = (index: number) => {
        if (questions.length <= 1) {
            toast.error("Test must have at least one question");
            return;
        }
        const questionId = questions[index].id;
        setDeletingQuestions(prev => new Set(prev).add(questionId));

        setTimeout(() => {
            setQuestions(prevQuestions => prevQuestions.filter(q => q.id !== questionId));
            setDeletingQuestions(prev => {
                const next = new Set(prev);
                next.delete(questionId);
                return next;
            });
        }, 400);
    };

    /** Functional update of one question, so late async edits (Hindi typing, uploads) never overwrite newer ones. */
    const updateQuestionAt = (index: number, fn: (q: QuestionState) => QuestionState) =>
        setQuestions(prev => prev.map((q, i) => (i === index ? fn(q) : q)));

    const updatePassageContent = (groupId: string, content: string) => {
        setQuestions(prev => prev.map(q =>
            q.groupId === groupId ? { ...q, passageContent: content } : q
        ));
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
        flashNew(newQ.id);
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

        const totalQs = enableSectionMode
            ? (sanitizedSections || []).reduce((acc, s) => acc + (s.questions?.length || 0), 0)
            : sanitizedQuestions.length;

        const testDataPayload: any = {
            title,
            description,
            revision_notes: revisionNotes,
            duration: time,
            is_public: isPublic,
            total_questions: totalQs,
            // If section mode, we can either save empty questions or flat map them.
            // Saving flat map ensures backward compatibility for some views (like listing count).
            questions: enableSectionMode
                ? sanitizedSections!.flatMap(s => s.questions)
                : sanitizedQuestions,
            institution_name: institutionName,
            institution_logo: institutionLogo,
            institution_color: institutionColor,
            institution_font: institutionFont,
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

        if (!isEditMode && title) {
            testDataPayload.slug = slugify(title, { lower: true, strict: true }) + '-' + Math.random().toString(36).substr(2, 4);
        }

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
        const returnUrl = isEditMode && testId ? `/edit-test/${testId}` : '/create-test';
        const draftData = {
            title, description, revision_notes: revisionNotes, institution_name: institutionName, institution_logo: institutionLogo, institution_color: institutionColor, institution_font: institutionFont,
            duration: time, is_public: isPublic,
            questions, selectedCategories,
            enable_section_mode: enableSectionMode,
            has_scientific_calculator: hasScientificCalculator,
            sections,
            tags
        };

        if (!user) {
            // Save current draft state before redirecting
            localStorage.setItem('create_test_draft', JSON.stringify(draftData));
            localStorage.setItem('auth_redirect_intent', returnUrl);

            toast.error("Please sign in to save your test.");
            openAuthModal({ view: 'login', redirectPath: returnUrl });
            return;
        }

        const localDesignation = typeof window !== 'undefined' ? localStorage.getItem('user_designation') : null;
        const hasDesignation = user?.user_metadata?.designation || profile?.designation || localDesignation;

        if (!hasDesignation) {
            localStorage.setItem('create_test_draft', JSON.stringify(draftData));
            localStorage.setItem('auth_redirect_intent', returnUrl);

            toast.info("Please set your designation to save your test.");
            navigate('/onboarding');
            return;
        }

        if (!title.trim()) {
            toast.error("Test Title is required");
            document.getElementById('test-title')?.focus();
            return;
        }

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
                if (error) { toast.error(error); jumpToFirstIssue(); return; }
            }
        } else {
            if (questions.length === 0) { toast.error("At least one question is required"); return; }
            const error = validateQuestions(questions);
            if (error) { toast.error(error); jumpToFirstIssue(); return; }
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

    const handleDropQuestion = (e: React.DragEvent, dropIndex: number) => {
        const dragIndex = parseInt(e.dataTransfer.getData('questionIndex'));
        if (!isNaN(dragIndex) && dragIndex !== dropIndex) {
            const newQuestions = [...questions];
            const [reorderedItem] = newQuestions.splice(dragIndex, 1);
            newQuestions.splice(dropIndex, 0, reorderedItem);
            setQuestions(newQuestions);
        }
        setDraggingIndex(null);
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

    const handleLogoDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setLogoDragOver(false);
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
            setEnableSectionMode(false);
            setSections([{ id: 'section-1', name: 'Section A', questions: [{ ...DEFAULT_QUESTION }], marks_per_question: 1, negative_marks: 0, question_type: 'single', colorIndex: 0 }]);
            setMergedSections([]);
            setHasScientificCalculator(false);
            setSelectedCategories([]);
            setShowOtherCategory(false);
            setCustomCategory('');
            setTags([]);
            setPhotoFills({});
            // Clear draft
            localStorage.removeItem('create_test_draft');
            toast.success("Form cleared");
        }
    };

    const handleDragStartSection = (e: React.DragEvent, sectionId: string) => {
        if (!(e.target as HTMLElement).closest('.section-drag-handle')) {
            e.preventDefault();
            return;
        }
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
        // Find the first unused letter from A to Z for the section name
        let nextLetter = 'A';
        for (let i = 0; i < 26; i++) {
            const letter = String.fromCharCode(65 + i);
            const isUsed = sections.some(s => s.name === `Section ${letter}`);
            if (!isUsed) {
                nextLetter = letter;
                break;
            }
        }

        // Find the first unused color index
        let nextColorIndex = 0;
        const usedColors = new Set(sections.map(s => s.colorIndex).filter(c => typeof c === 'number'));
        while (usedColors.has(nextColorIndex)) {
            nextColorIndex++;
        }

        const newSection: SectionState = {
            id: `section-${Date.now()}`,
            name: `Section ${nextLetter}`,
            questions: [{ ...DEFAULT_QUESTION, id: Math.random() }],
            marks_per_question: 1,
            negative_marks: 0,
            question_type: 'single',
            colorIndex: nextColorIndex
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
        const sectionId = sections[index].id;
        setDeletingSections(prev => new Set(prev).add(sectionId));

        setTimeout(() => {
            setSections(prevSections => prevSections.filter(s => s.id !== sectionId));
            setDeletingSections(prev => {
                const next = new Set(prev);
                next.delete(sectionId);
                return next;
            });
        }, 400);
    };

    const updateSection = (index: number, field: keyof TestSection, value: any) => {
        setSections(prev => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
    };

    const handleAddQuestionToSection = (sectionIndex: number, insertAtIndex?: number | React.MouseEvent) => {
        const section = sections[sectionIndex];
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

        flashNew(newQ.id);

        const nextQuestions = [...section.questions];
        if (typeof insertAtIndex === 'number') {
            const prevQ = nextQuestions[insertAtIndex - 1];
            const nextQ = nextQuestions[insertAtIndex];
            if (prevQ?.groupId && nextQ?.groupId && prevQ.groupId === nextQ.groupId) {
                newQ.groupId = prevQ.groupId;
                newQ.passageContent = prevQ.passageContent;
            }
            nextQuestions.splice(insertAtIndex, 0, newQ);
        } else {
            nextQuestions.push(newQ);
        }
        setSections(prev => prev.map((s, i) => (i === sectionIndex ? { ...s, questions: nextQuestions } : s)));
    };

    const handleAddSubQuestionToSection = (sectionIndex: number, parentQuestionIndex: number) => {
        const section = sections[sectionIndex];
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

        const nextQuestions = [...section.questions];
        nextQuestions.splice(insertIndex + 1, 0, newQ);
        setSections(prev => prev.map((s, i) => (i === sectionIndex ? { ...s, questions: nextQuestions } : s)));
        flashNew(newQ.id);
    };

    const handleRemoveQuestionFromSection = (sectionIndex: number, qIndex: number) => {
        const sec = sections[sectionIndex];
        if (sec.questions.length <= 1) {
            toast.error("Section must have at least one question");
            return;
        }
        const questionId = sec.questions[qIndex].id;
        setDeletingQuestions(prev => new Set(prev).add(questionId));

        setTimeout(() => {
            setSections(prevSections => {
                return prevSections.map((s, idx) => {
                    if (idx === sectionIndex) {
                        return {
                            ...s,
                            questions: s.questions.filter(q => q.id !== questionId)
                        } as SectionState;
                    }
                    return s;
                });
            });
            setDeletingQuestions(prev => {
                const next = new Set(prev);
                next.delete(questionId);
                return next;
            });
        }, 400);
    };

    const updateSectionQuestionAt = (sectionIndex: number, qIndex: number, fn: (q: QuestionState) => QuestionState) =>
        setSections(prev => prev.map((s, i) => (i !== sectionIndex ? s : {
            ...s,
            questions: s.questions.map((q, j) => (j === qIndex ? fn(q) : q)),
        })));

    const updatePassageContentInSection = (sectionIndex: number, groupId: string, content: string) => {
        setSections(prev => prev.map((s, i) => (i !== sectionIndex ? s : {
            ...s,
            questions: s.questions.map(q => (q.groupId === groupId ? { ...q, passageContent: content } : q)),
        })));
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
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = tagInput.trim().replace(/^#/, '');
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

    /* ── Fill from photo ───────────────────────────────────────────────────── */

    /** Applies `fn` to the question with this id, wherever it lives (flat list or a section). */
    const updateQuestionById = useCallback((id: number, fn: (q: QuestionState) => QuestionState) => {
        if (enableSectionMode) {
            setSections(prev => prev.map(s => ({ ...s, questions: s.questions.map(q => (q.id === id ? fn(q) : q)) })));
        } else {
            setQuestions(prev => prev.map(q => (q.id === id ? fn(q) : q)));
        }
    }, [enableSectionMode]);

    const findQuestion = (id: number) =>
        (enableSectionMode ? sections.flatMap(s => s.questions) : questions).find(q => q.id === id);

    const handlePhotoFilled = (result: PhotoQuestion) => {
        const target = photoTarget;
        setPhotoTarget(null);
        if (!target) return;
        const previous = findQuestion(target.id);
        if (!previous) return;

        const answer = result.correctAnswer;
        const answerLabel = Array.isArray(answer)
            ? answer.join(' and ')
            : answer && typeof answer === 'object'
                ? (answer.min === answer.max ? String(answer.min) : `${answer.min} to ${answer.max}`)
                : String(answer ?? '');

        updateQuestionById(target.id, q => applyPhotoResult(q, result));
        setPhotoFills(prev => ({
            ...prev,
            [String(target.id)]: { previous, banner: { answerSource: result.answerSource, answerLabel, others: result.otherQuestionsInPhoto } },
        }));
        if (result.language === 'hi') setLastTypingMode('hi');
    };

    const undoPhotoFill = (id: number) => {
        const fill = photoFills[String(id)];
        if (!fill) return;
        updateQuestionById(id, () => fill.previous);
        dismissPhotoFill(id);
        toast.success('Question restored');
    };

    const dismissPhotoFill = (id: number) =>
        setPhotoFills(prev => {
            const next = { ...prev };
            delete next[String(id)];
            return next;
        });

    /* ── Readiness: what still blocks saving ───────────────────────────────── */

    const allQuestions = enableSectionMode ? sections.flatMap(s => s.questions) : questions;

    const issues = useMemo(() => {
        const list: { id: string; where: string; issue: string }[] = [];
        if (enableSectionMode) {
            sections.forEach(s => s.questions.forEach((q, i) => {
                const issue = questionIssue(q);
                if (issue) list.push({ id: String(q.id), where: `${s.name || 'Section'} · Question ${i + 1}`, issue });
            }));
        } else {
            questions.forEach((q, i) => {
                const issue = questionIssue(q);
                if (issue) list.push({ id: String(q.id), where: `Question ${i + 1}`, issue });
            });
        }
        return list;
    }, [enableSectionMode, sections, questions]);

    const issueIds = useMemo(() => new Set(issues.map(i => i.id)), [issues]);
    const hasAnyContent = !!title.trim() || allQuestions.some(q => q.question?.trim() || q.image);
    const totalMarks = allQuestions.reduce((sum, q) => sum + (parseFloat(String(q.marks ?? 0)) || 0), 0);

    function jumpToFirstIssue() {
        const first = issues[0];
        if (!first) return;
        const el = document.querySelector(`[data-minimap-id="${CSS.escape(first.id)}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setFlashId(first.id);
        setTimeout(() => setFlashId(null), 1800);
    }

    // Show loading screen while fetching test data
    if (loading && isEditMode && !title) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center">
                <div className="space-y-5 text-center animate-in fade-in zoom-in-95 duration-500">
                    <div className="relative mx-auto h-16 w-16">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100">
                            <PenLine className="h-7 w-7 text-sky-700 motion-safe:animate-pulse" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-[19px] font-semibold text-slate-900">Opening your test…</h3>
                        <p className="text-[15px] text-slate-500">Loading questions and settings</p>
                    </div>
                </div>
            </div>
        );
    }

    const sypadTargetLabel = photoTarget?.label ?? '';
    const showInstructions = instructionsOpen ?? !!revisionNotes;

    /* ── Renders one question with its passage framing (both modes) ─────────── */
    const renderQuestion = (
        q: QuestionState,
        list: QuestionState[],
        index: number,
        opts: {
            number: number;
            refPrefix: string;
            update: (fn: (q: QuestionState) => QuestionState) => void;
            onRemove: () => void;
            canRemove: boolean;
            onPassageChange: (content: string) => void;
            onAddToPassage: () => void;
            drag?: React.ComponentProps<typeof QuestionCard>['drag'];
        },
    ) => {
        const prevGroupId = index > 0 ? list[index - 1].groupId : undefined;
        const nextGroupId = index < list.length - 1 ? list[index + 1].groupId : undefined;
        const isInGroup = !!q.groupId;
        const isStartOfGroup = isInGroup && q.groupId !== prevGroupId;
        const isEndOfGroup = isInGroup && q.groupId !== nextGroupId;
        const fill = photoFills[String(q.id)];
        const refKey = `${opts.refPrefix}-${q.id}`;

        return (
            <div
                data-minimap-id={q.id}
                className={cn(
                    'scroll-mt-24 transition-shadow duration-500',
                    deletingQuestions.has(q.id) && 'animate-ios-delete',
                    newlyAddedQuestionIds.has(q.id) && 'animate-ios-insert',
                    flashId === String(q.id) && 'rounded-2xl ring-2 ring-amber-400 ring-offset-4 ring-offset-slate-50',
                )}
            >
                {isStartOfGroup && (
                    <PassageHeader
                        value={q.passageContent || ''}
                        typingMode={q.typingMode}
                        onChange={opts.onPassageChange}
                        registerRef={registerRef}
                        refKey={`${refKey}-passage`}
                    />
                )}
                <QuestionCard
                    q={q}
                    number={opts.number}
                    refKey={refKey}
                    update={opts.update}
                    onRemove={opts.onRemove}
                    canRemove={opts.canRemove}
                    isInGroup={isInGroup}
                    isEndOfGroup={isEndOfGroup}
                    registerRef={registerRef}
                    onOpenSyPad={openSyPad}
                    onCloudUpload={openCloudUploadModal}
                    onSnip={openSnip}
                    onFillFromPhoto={() => setPhotoTarget({
                        id: q.id,
                        label: `Question ${opts.number}`,
                        expectedType: q.type === 'multiple' || q.type === 'numerical' ? q.type : undefined,
                    })}
                    onTypingModeUsed={setLastTypingMode}
                    photoBanner={fill?.banner}
                    onUndoPhoto={fill ? () => undoPhotoFill(q.id) : undefined}
                    onDismissPhotoBanner={fill ? () => dismissPhotoFill(q.id) : undefined}
                    drag={opts.drag}
                />
                {isEndOfGroup && <PassageFooter onAdd={opts.onAddToPassage} />}
            </div>
        );
    };

    return (
        <div className="mx-auto w-full max-w-4xl px-3 pb-6 pt-5 sm:px-6 sm:pt-8 lg:pr-[132px] xl:max-w-5xl" style={{ overflowAnchor: 'none' }}>
            <style>{`
                @keyframes iosInsert {
                    0% { opacity: 0; transform: scale(0.96) translateY(-12px); filter: blur(3px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
                }
                .animate-ios-insert {
                    animation: iosInsert 420ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    transform-origin: center center;
                    will-change: transform, opacity;
                }
                .ios-collapse-transition {
                    display: grid;
                    grid-template-rows: 0fr;
                    opacity: 0;
                    transition: grid-template-rows 450ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms cubic-bezier(0.16, 1, 0.3, 1);
                    will-change: grid-template-rows, opacity;
                }
                .ios-collapse-transition.collapsed { grid-template-rows: 0fr; opacity: 0; pointer-events: none; }
                .ios-collapse-transition.expanded { grid-template-rows: 1fr; opacity: 1; }
                @keyframes iosDelete {
                    0% { opacity: 1; transform: scale(1) translateX(0); max-height: 1200px; }
                    30% { opacity: 0.3; transform: scale(0.97) translateX(-20px); }
                    100% { opacity: 0; transform: scale(0.9) translateX(-100%); max-height: 0; margin-top: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0; border-width: 0; overflow: hidden; }
                }
                .animate-ios-delete {
                    animation: iosDelete 400ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
                    transform-origin: center center;
                    overflow: hidden;
                }
                @media (prefers-reduced-motion: reduce) {
                    .animate-ios-insert, .animate-ios-delete { animation-duration: 1ms; }
                }
            `}</style>

            {/* ── Large title + ways to add questions ── */}
            <header className="mb-6 flex flex-col gap-4 px-1 sm:mb-8 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        {onCancel && (
                            <button type="button" onClick={onCancel} aria-label="Back" className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200/60 hover:text-slate-900">
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                        )}
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Creator studio</p>
                        {isEditMode && (
                            <span className={cn(
                                'ml-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold',
                                saveStatus === 'error' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600',
                            )}>
                                {saveStatus === 'saving' && <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>}
                                {saveStatus === 'saved' && <><Cloud className="h-3.5 w-3.5 text-emerald-600" /> Saved{lastSaved ? ` ${lastSaved.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</>}
                                {saveStatus === 'error' && <><CloudOff className="h-3.5 w-3.5" /> Not saved — check internet</>}
                                {saveStatus === 'idle' && <><Cloud className="h-3.5 w-3.5" /> Saves automatically</>}
                            </span>
                        )}
                    </div>
                    <h1 className="mt-1.5 text-[28px] font-bold leading-[1.1] tracking-[-0.025em] text-slate-900 sm:text-[34px]">
                        {isEditMode ? 'Edit test' : 'Create a test'}
                    </h1>
                    <p className="mt-2 text-[15px] text-slate-600">
                        Type your questions, fill them from a photo, or import a whole paper.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {onAiImport && !isEditMode && (
                        <button type="button" onClick={onAiImport} className={cn(PRIMARY_BTN, 'h-10 px-4 text-[14px]')}>
                            <Sparkles className="h-4 w-4" />
                            <span className="sm:hidden">Import paper</span>
                            <span className="hidden sm:inline">Import from PDF or photos</span>
                        </button>
                    )}
                    <div className="[&_button]:h-10 [&_button]:rounded-full [&_button]:border-0 [&_button]:bg-white [&_button]:px-4 [&_button]:text-[14px] [&_button]:font-semibold [&_button]:text-slate-700 [&_button]:shadow-sm [&_button]:ring-1 [&_button]:ring-slate-900/[0.07] [&_button:hover]:bg-slate-50">
                        <React.Suspense fallback={null}>
                            <JsonImporter onImportSuccess={populateData} buttonVariant="ghost" />
                        </React.Suspense>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button type="button" aria-label="More" className={cn(PILL_BTN, 'w-10 justify-center px-0')}>
                                <MoreHorizontal className="h-5 w-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 rounded-xl p-1.5">
                            <DropdownMenuItem className="gap-2.5 rounded-lg py-2 text-[14px]" onSelect={() => { setShowSupportedFormats(true); setTimeout(() => document.getElementById('format-help')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}>
                                <BookOpen className="h-4 w-4 text-sky-600" /> How to write maths &amp; chemistry
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2.5 rounded-lg py-2 text-[14px]" onSelect={() => setShowMathKeyboard(true)}>
                                <Sigma className="h-4 w-4 text-sky-600" /> Open Sy Pad
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2.5 rounded-lg py-2 text-[14px]" onSelect={() => setShowGuide(true)}>
                                <Sparkles className="h-4 w-4 text-violet-600" /> AI prompt guide
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2.5 rounded-lg py-2 text-[14px]" onSelect={() => setShowFormatGuide(true)}>
                                <FileQuestion className="h-4 w-4 text-slate-500" /> JSON file format guide
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2.5 rounded-lg py-2 text-[14px] text-red-600 focus:bg-red-50 focus:text-red-700" onSelect={handleClear}>
                                <Eraser className="h-4 w-4" /> Clear everything
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <TestUploadFormatGuide open={showFormatGuide} onOpenChange={setShowFormatGuide} trigger={<span className="hidden" />} />
            </header>

            {!isOnline && (
                <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-red-50 px-4 py-3 text-[14px] text-red-800 ring-1 ring-inset ring-red-600/15">
                    <WifiOff className="h-4 w-4 shrink-0" />
                    <span>You are offline. Your work is kept on this device; Hindi typing needs the internet.</span>
                </div>
            )}

            <div className="space-y-6">
                {/* ── 1. Test details ── */}
                <section aria-labelledby="details-heading">
                    <h2 id="details-heading" className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-500">Test details</h2>
                    <div className={cn(GROUP, 'space-y-5 p-4 sm:p-6')}>
                        <div>
                            <label htmlFor="test-title" className={FIELD_LABEL}>Test name</label>
                            <input
                                id="test-title"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. Class 10 Science — Chapter 3 test"
                                className={cn(TEXT_FIELD, 'h-14 text-[19px] font-semibold')}
                            />
                        </div>

                        <div>
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                <span className={cn(FIELD_LABEL, 'mb-0')}>Short description <span className="font-normal text-slate-400">(optional)</span></span>
                                <div className="flex h-7 items-center rounded-full bg-slate-100 p-0.5 text-[12px] font-semibold">
                                    {([['en', 'English'], ['hi', 'हिंदी']] as const).map(([v, l]) => (
                                        <button key={v} type="button" onClick={() => setDescriptionLanguage(v)} aria-pressed={descriptionLanguage === v}
                                            className={cn('h-6 rounded-full px-2.5', descriptionLanguage === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <IMEInput
                                ref={(el: IMEInputHandle | null) => registerRef('test-desc', el)}
                                typingMode={descriptionLanguage}
                                value={description}
                                onChange={setDescription}
                                placeholder="One line students see before they start"
                                className={cn(TEXT_FIELD, 'border-0 shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-0')}
                            />
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <span className={FIELD_LABEL}>Time limit</span>
                                <div className="flex items-center gap-2">
                                    <div className="relative w-32 shrink-0">
                                        <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="number"
                                            min={1}
                                            inputMode="numeric"
                                            aria-label="Time limit in minutes"
                                            value={Number.isFinite(time) ? time : ''}
                                            onChange={e => setTime(parseInt(e.target.value))}
                                            className={cn(TEXT_FIELD, 'pl-9 pr-12 font-semibold tabular-nums')}
                                        />
                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-500">min</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {TIME_PRESETS.map(m => (
                                            <button key={m} type="button" onClick={() => setTime(m)}
                                                className={cn('h-9 rounded-full px-3 text-[13px] font-semibold tabular-nums transition-colors', time === m ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                                                {m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <span className={FIELD_LABEL}>Who can find this test</span>
                                <Segmented
                                    label="Visibility"
                                    value={isPublic ? 'public' : 'private'}
                                    onChange={v => setIsPublic(v === 'public')}
                                    options={[
                                        { value: 'private', label: <><Lock className="h-3.5 w-3.5" /> Only my students</> },
                                        { value: 'public', label: <><Globe className="h-3.5 w-3.5" /> Everyone</> },
                                    ]}
                                />
                                <p className="mt-1.5 text-[13px] text-slate-500">
                                    {isPublic ? 'Listed on TestoZa — anyone can find and take it.' : 'Hidden — only people you send the link to can take it.'}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <span className={FIELD_LABEL}>Subject / category</span>
                                <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            role="combobox"
                                            aria-expanded={openCategoryCombobox}
                                            className={cn(TEXT_FIELD, 'flex items-center justify-between text-left')}
                                        >
                                            <span className={selectedCategories.length ? 'text-slate-900' : 'text-slate-400'}>
                                                {selectedCategories.length > 0 ? `${selectedCategories.length} selected` : 'Choose categories'}
                                            </span>
                                            <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0 sm:w-[400px]">
                                        <Command>
                                            <CommandInput placeholder="Search category..." />
                                            <CommandEmpty>
                                                <div className="p-2 text-center text-sm text-muted-foreground">
                                                    No category found. Select "Other" to add a custom one.
                                                </div>
                                            </CommandEmpty>
                                            <CommandGroup className="max-h-72 overflow-y-auto">
                                                {categories.map((category) => (
                                                    <CommandItem key={category.id} value={category.name} onSelect={() => toggleCategory(category.id)}>
                                                        <Check className={cn("mr-2 h-4 w-4", selectedCategories.includes(category.id) ? "opacity-100" : "opacity-0")} />
                                                        {category.name}
                                                    </CommandItem>
                                                ))}
                                                <CommandItem
                                                    value="Other"
                                                    onSelect={() => { setShowOtherCategory(true); setOpenCategoryCombobox(false); }}
                                                    className="mt-1 border-t font-medium text-sky-700"
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Other (Add Custom)
                                                </CommandItem>
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                {selectedCategories.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {selectedCategories.map(catId => {
                                            const cat = categories.find(c => c.id === catId);
                                            if (!cat) return null;
                                            return (
                                                <span key={catId} className="inline-flex items-center gap-1 rounded-full bg-sky-50 py-1 pl-3 pr-1 text-[13px] font-medium text-sky-800 ring-1 ring-inset ring-sky-600/15">
                                                    {cat.name}
                                                    <button type="button" onClick={() => toggleCategory(catId)} aria-label={`Remove ${cat.name}`} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-sky-100">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                                {showOtherCategory && (
                                    <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="flex items-start gap-2">
                                            <input
                                                value={customCategory}
                                                onChange={(e) => setCustomCategory(e.target.value)}
                                                placeholder="Your own category name"
                                                aria-label="Custom category name"
                                                className={TEXT_FIELD}
                                            />
                                            <button type="button" onClick={() => { setShowOtherCategory(false); setCustomCategory(""); }} title="Remove custom category" aria-label="Remove custom category"
                                                className="mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <p className="mt-1 text-[12px] text-slate-500">Saved as a searchable tag for this test.</p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label htmlFor="tag-input" className={FIELD_LABEL}>Tags <span className="font-normal text-slate-400">(press Enter after each)</span></label>
                                <input
                                    id="tag-input"
                                    placeholder="e.g. NEET, algebra, weekly"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleAddTag}
                                    className={TEXT_FIELD}
                                />
                                {tags.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {tags.map((tag, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-[13px] font-medium text-slate-700">
                                                #{tag}
                                                <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-slate-200">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 2. Instructions (collapsible) ── */}
                <section className={GROUP}>
                    <SettingRow
                        icon={<BookOpen className="h-[18px] w-[18px]" />}
                        tone="emerald"
                        title={<>Instructions for students <span className="font-normal text-slate-400">(optional)</span></>}
                        detail={revisionNotes ? 'Students read this before they start.' : 'Syllabus, exam rules, or anything to read before starting.'}
                        onClick={() => setInstructionsOpen(!showInstructions)}
                        expanded={showInstructions}
                    >
                        <ChevronDown className={cn('h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200', showInstructions && 'rotate-180')} />
                    </SettingRow>
                    {showInstructions && (
                        <div className="border-t border-slate-100 p-4 sm:p-5">
                            <RichTextEditor
                                value={revisionNotes}
                                onChange={setRevisionNotes}
                                placeholder="Add detailed instructions, syllabus, or summary here..."
                            />
                        </div>
                    )}
                </section>

                {/* ── 3. Exam options ── */}
                <section aria-labelledby="options-heading">
                    <h2 id="options-heading" className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-500">Exam options</h2>
                    <div className={cn(GROUP, 'divide-y divide-slate-100')}>
                        <SettingRow
                            icon={<Calculator className="h-[18px] w-[18px]" />}
                            title="Scientific calculator"
                            detail="Students get an on-screen calculator during the test."
                        >
                            <Switch checked={hasScientificCalculator} onCheckedChange={setHasScientificCalculator} aria-label="Scientific calculator" />
                        </SettingRow>
                        <SettingRow
                            icon={<Layers className="h-[18px] w-[18px]" />}
                            tone="amber"
                            title="Split into sections"
                            detail="e.g. Physics, Chemistry, Maths — each with its own questions and rules."
                        >
                            <Switch checked={enableSectionMode} onCheckedChange={toggleSectionMode} aria-label="Split into sections" />
                        </SettingRow>

                        {/* Merge Section Marks Config */}
                        {enableSectionMode && sections.length >= 2 && (
                            <div className="px-4 py-3.5 sm:px-5">
                                <div className="flex items-center gap-3.5">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-violet-100 text-violet-700"><Combine className="h-[18px] w-[18px]" /></span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[15px] font-semibold text-slate-900">Combine section marks</p>
                                        <p className="text-[13px] leading-snug text-slate-500">Show one subject total on the result, e.g. Chemistry = Section A + Section B.</p>
                                    </div>
                                    <button type="button" onClick={() => setMergedSections([...mergedSections, { label: '', section_ids: [] }])}
                                        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-slate-100 px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-200">
                                        <Plus className="h-3.5 w-3.5" /> Add group
                                    </button>
                                </div>
                                {mergedSections.length > 0 && (
                                    <div className="mt-3 space-y-2.5 pl-0 sm:pl-[50px]">
                                        {mergedSections.map((group, gIdx) => (
                                            <div key={gIdx} className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-900/[0.06]">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        placeholder="Subject name (e.g. Chemistry)"
                                                        value={group.label}
                                                        onChange={(e) => {
                                                            const updated = [...mergedSections];
                                                            updated[gIdx] = { ...updated[gIdx], label: e.target.value };
                                                            setMergedSections(updated);
                                                        }}
                                                        className="h-9 flex-1 rounded-lg bg-white px-3 text-[14px] ring-1 ring-slate-900/10 focus:outline-none focus:ring-2 focus:ring-sky-500/45"
                                                    />
                                                    <button type="button" aria-label="Remove group" onClick={() => setMergedSections(mergedSections.filter((_, i) => i !== gIdx))}
                                                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {sections.map((sec) => {
                                                        const isSelected = group.section_ids.includes(sec.id);
                                                        return (
                                                            <button
                                                                key={sec.id}
                                                                type="button"
                                                                aria-pressed={isSelected}
                                                                className={cn('inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-medium transition-colors',
                                                                    isSelected ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-900/10 hover:bg-slate-100')}
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
                                                                {isSelected && <Check className="h-3.5 w-3.5" />}
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

                        {/* Institution branding */}
                        <div>
                            <SettingRow
                                icon={institutionLogo
                                    ? <img src={institutionLogo} alt="" className="h-9 w-9 rounded-[10px] object-contain" />
                                    : <Building2 className="h-[18px] w-[18px]" />}
                                tone="violet"
                                title={<span className="flex items-center gap-2">Institution branding {!isPremium && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800"><Lock className="h-3 w-3" /> Premium</span>}</span>}
                                detail={institutionName ? <span style={{ color: institutionColor, fontFamily: institutionFont }} className="font-semibold">{institutionName}</span> : 'Your logo and institute name at the top of the test.'}
                                onClick={() => setBrandingOpen(v => !v)}
                                expanded={brandingOpen}
                            >
                                <ChevronDown className={cn('h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200', brandingOpen && 'rotate-180')} />
                            </SettingRow>
                            {brandingOpen && (
                                <div className="border-t border-slate-100 p-4 sm:p-5">
                                    <div
                                        className={cn('relative', !isPremium && 'cursor-pointer')}
                                        onClick={() => {
                                            if (!isPremium) {
                                                toast("Upgrade to Premium to customize branding", {
                                                    action: { label: "View Plans", onClick: () => navigate('/pricing') }
                                                });
                                            }
                                        }}
                                    >
                                        <div className={cn('flex flex-col gap-5 sm:flex-row sm:items-start', !isPremium && 'pointer-events-none select-none opacity-60 blur-[1.5px]')}>
                                            <div className="relative shrink-0">
                                                {institutionLogo && (
                                                    <button type="button" onClick={(e) => { e.preventDefault(); setInstitutionLogo(''); }} aria-label="Remove logo"
                                                        className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-600 shadow ring-1 ring-slate-900/10 hover:text-red-600">
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                                <label
                                                    className="block cursor-pointer"
                                                    onDragOver={(e) => { e.preventDefault(); setLogoDragOver(true); }}
                                                    onDragLeave={(e) => { e.preventDefault(); setLogoDragOver(false); }}
                                                    onDrop={handleLogoDrop}
                                                >
                                                    <input type="file" className="hidden" accept="image/*" disabled={!isPremium} onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f, setInstitutionLogo); }} />
                                                    <div className={cn('flex h-20 w-20 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-white transition-colors',
                                                        logoDragOver ? 'border-sky-400 bg-sky-50' : institutionLogo ? 'border-slate-200' : 'border-slate-300 hover:border-sky-300')}>
                                                        {institutionLogo ? (
                                                            <img src={institutionLogo} alt="Logo" className="h-full w-full object-contain" />
                                                        ) : (
                                                            <>
                                                                <Upload className="mb-1 h-5 w-5 text-slate-400" />
                                                                <span className="text-[11px] font-semibold text-slate-500">Logo</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </label>
                                                <p className="mt-1 text-center text-[11px] text-slate-400">Max 200 KB</p>
                                            </div>
                                            <div className="min-w-0 flex-1 space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        value={institutionName}
                                                        onChange={(e) => setInstitutionName(e.target.value)}
                                                        placeholder="Institution name"
                                                        aria-label="Institution name"
                                                        disabled={!isPremium}
                                                        className={cn(TEXT_FIELD, 'text-[18px] font-bold')}
                                                        style={{ color: institutionColor, fontFamily: institutionFont }}
                                                    />
                                                </div>
                                                <div className="flex flex-wrap items-center gap-4">
                                                    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Name colour">
                                                        {['#475569', '#2563eb', '#dc2626', '#059669', '#7c3aed', '#ea580c', '#0891b2'].map(c => (
                                                            <button
                                                                key={c}
                                                                type="button"
                                                                role="radio"
                                                                aria-checked={institutionColor === c}
                                                                aria-label={`Colour ${c}`}
                                                                onClick={() => setInstitutionColor(c)}
                                                                className={cn('h-7 w-7 rounded-full transition-transform hover:scale-110', institutionColor === c && 'ring-2 ring-slate-900 ring-offset-2')}
                                                                style={{ backgroundColor: c }}
                                                            />
                                                        ))}
                                                    </div>
                                                    <label className="flex items-center gap-2 text-[13px] text-slate-600">
                                                        <Type className="h-4 w-4 text-slate-400" />
                                                        <select
                                                            value={institutionFont}
                                                            onChange={(e) => setInstitutionFont(e.target.value)}
                                                            className="h-9 rounded-lg bg-slate-50 px-2 text-[14px] text-slate-800 ring-1 ring-slate-900/10 focus:outline-none focus:ring-2 focus:ring-sky-500/45"
                                                        >
                                                            <option value="inherit">Default</option>
                                                            <option value="serif">Serif</option>
                                                            <option value="'Courier New', monospace">Mono</option>
                                                            <option value="'Georgia', serif">Georgia</option>
                                                            <option value="'Trebuchet MS', sans-serif">Modern</option>
                                                        </select>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setPreviewImageIndex(0); setShowInstitutePreview(true); }}
                                        className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-sky-700 hover:text-sky-800"
                                    >
                                        <Info className="h-4 w-4" /> See where this appears on the test
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ── 4. Questions ── */}
                <section aria-labelledby="questions-heading" className="pt-2">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
                        <div>
                            <h2 id="questions-heading" className="text-[22px] font-bold tracking-[-0.02em] text-slate-900">
                                {enableSectionMode ? 'Sections & questions' : 'Questions'}
                            </h2>
                            <p className="text-[14px] text-slate-500 tabular-nums">
                                {allQuestions.length} question{allQuestions.length === 1 ? '' : 's'} · {totalMarks} mark{totalMarks === 1 ? '' : 's'}
                                {enableSectionMode && ` · ${sections.length} section${sections.length === 1 ? '' : 's'}`}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowSupportedFormats(v => !v)}
                            aria-expanded={showSupportedFormats}
                            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-sky-700 hover:bg-sky-50"
                        >
                            <Sigma className="h-4 w-4" /> Maths &amp; chemistry help
                            <ChevronDown className={cn('h-4 w-4 transition-transform', showSupportedFormats && 'rotate-180')} />
                        </button>
                    </div>

                    {showSupportedFormats && (
                        <div id="format-help" className={cn(GROUP, 'mb-5 scroll-mt-24 animate-in fade-in slide-in-from-top-2 duration-200')}>
                            <div className="flex flex-wrap items-start gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
                                <p className="min-w-0 flex-1 text-[14px] leading-relaxed text-slate-600">
                                    The easiest way: tap <button type="button" onClick={() => openSyPad()} className="font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2">Maths &amp; symbols</button> under
                                    any question. If you prefer typing, put maths between <code className="rounded bg-slate-100 px-1 font-mono text-[13px]">$ … $</code> — tap a line below to copy it.
                                </p>
                                <button type="button" onClick={() => setShowSupportedFormats(false)} aria-label="Close help" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <ul className="divide-y divide-slate-100">
                                {[...BASIC_FORMATS, ...(showAdvancedFormats ? ADVANCED_FORMATS : [])].map(row => (
                                    <li key={row.cat}>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                try { await navigator.clipboard.writeText(row.raw); toast.success('Copied — paste it into a question'); }
                                                catch { toast.error('Could not copy'); }
                                            }}
                                            className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 sm:grid-cols-[180px_1fr_auto] sm:px-5"
                                        >
                                            <span className="text-[13px] text-slate-500">{row.cat}</span>
                                            <span className="col-span-2 row-start-2 font-mono text-[13px] text-slate-700 sm:col-span-1 sm:row-start-1 sm:col-start-2 break-all">{row.raw}</span>
                                            <span className="col-start-2 row-start-1 flex items-center gap-2 text-[16px] text-slate-900 sm:col-start-3">
                                                <LatexRenderer>{row.raw}</LatexRenderer>
                                                <Copy className="h-3.5 w-3.5 text-slate-300" />
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 sm:px-5">
                                <button type="button" onClick={() => setShowAdvancedFormats(v => !v)} className="inline-flex items-center gap-1 text-[13px] font-semibold text-sky-700">
                                    {showAdvancedFormats ? <><ChevronUp className="h-4 w-4" /> Fewer examples</> : <><ChevronDown className="h-4 w-4" /> More examples</>}
                                </button>
                                <a href="/user-guide/chemistry-notation" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 hover:text-sky-700">
                                    Full guide <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            </div>
                        </div>
                    )}

                    {enableSectionMode ? (
                        <div className="space-y-8">
                            {sections.map((section, sIdx) => {
                                const colorIndex = section.colorIndex !== undefined ? section.colorIndex : sIdx;
                                const tone = SECTION_TONES[colorIndex % SECTION_TONES.length];
                                const timestampStr = section.id.startsWith('section-') ? section.id.split('-')[1] : null;
                                const timestamp = timestampStr ? parseInt(timestampStr, 10) : null;
                                const isNew = timestamp ? (Date.now() - timestamp < 1500) : false;
                                const isCollapsed = collapsedSections.has(section.id);
                                const sectionMarks = section.questions.reduce((sum, q) => sum + (parseFloat(String(q.marks ?? 0)) || 0), 0);

                                return (
                                    <div key={section.id} className={cn('relative', isNew && 'animate-ios-insert', deletingSections.has(section.id) && 'animate-ios-delete')}>
                                        <div
                                            draggable
                                            onDragStart={(e) => handleDragStartSection(e, section.id)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => handleDropSection(e, section.id)}
                                            className={cn(
                                                'overflow-hidden rounded-3xl bg-slate-100/70 ring-1 transition-all duration-300',
                                                tone.ring,
                                                swappedSections.has(section.id) && 'scale-[1.01] shadow-lg brightness-105',
                                                swapGlowSections.has(section.id) && 'section-swap-glow',
                                            )}
                                        >
                                            <div className={cn('flex flex-wrap items-center gap-2 px-3 py-3 sm:flex-nowrap sm:px-4', tone.head)}>
                                                <span className="section-drag-handle flex h-8 w-6 cursor-grab items-center justify-center rounded-md text-slate-400 hover:bg-black/5 active:cursor-grabbing" title="Drag to move this section">
                                                    <Grip className="h-4 w-4" />
                                                </span>
                                                <span className={cn('h-3 w-3 shrink-0 rounded-full', tone.dot)} />
                                                <input
                                                    value={section.name}
                                                    onChange={(e) => updateSection(sIdx, 'name', e.target.value)}
                                                    placeholder={`Section ${sIdx + 1}`}
                                                    aria-label="Section name"
                                                    className="h-10 min-w-0 flex-1 rounded-xl bg-white/60 px-3 text-[18px] font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                                                />
                                                <span className="hidden shrink-0 rounded-full bg-white/80 px-3 py-1 text-[13px] font-semibold tabular-nums text-slate-600 sm:inline">
                                                    {section.questions.length} Q · {sectionMarks} marks
                                                </span>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <button type="button" className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors',
                                                            section.attempt_control ? 'bg-sky-600 text-white' : 'bg-white/80 text-slate-600 hover:bg-white')}
                                                            title="Limit how many questions students may answer">
                                                            <SlidersHorizontal className="h-4 w-4" /> <span className="hidden md:inline">Attempt limit</span>
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80 rounded-2xl p-4" align="end">
                                                        <div className="space-y-4">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <h4 className="text-[15px] font-semibold text-slate-900">Attempt limit</h4>
                                                                    <p className="text-[13px] text-slate-500">e.g. “Answer any 5 of these 8 questions”.</p>
                                                                </div>
                                                                <Switch
                                                                    checked={!!section.attempt_control}
                                                                    onCheckedChange={(checked) => {
                                                                        if (checked) {
                                                                            updateSection(sIdx, 'attempt_control', { enabled: true, max_attempts: section.questions.length || 1, mode: 'hard', soft_type: 'first_n' });
                                                                        } else {
                                                                            updateSection(sIdx, 'attempt_control', undefined);
                                                                        }
                                                                    }}
                                                                    aria-label="Attempt limit"
                                                                />
                                                            </div>

                                                            {section.attempt_control && (
                                                                <>
                                                                    <label className="block">
                                                                        <span className="mb-1 block text-[13px] font-semibold text-slate-600">Students may answer at most</span>
                                                                        <input
                                                                            type="number"
                                                                            value={section.attempt_control?.max_attempts ?? (section.questions.length || 1)}
                                                                            onChange={(e) => updateSection(sIdx, 'attempt_control', { ...section.attempt_control, max_attempts: parseInt(e.target.value) || 0 })}
                                                                            placeholder={`e.g. ${section.questions.length || 1}`}
                                                                            className="h-10 w-full rounded-lg bg-slate-50 px-3 text-[15px] ring-1 ring-slate-900/10 focus:outline-none focus:ring-2 focus:ring-sky-500/45"
                                                                        />
                                                                    </label>

                                                                    <div className="space-y-2">
                                                                        <span className="block text-[13px] font-semibold text-slate-600">When they reach the limit</span>
                                                                        <RadioGroup
                                                                            value={section.attempt_control?.mode || 'hard'}
                                                                            onValueChange={(val) => updateSection(sIdx, 'attempt_control', { ...section.attempt_control, mode: val })}
                                                                            className="space-y-2"
                                                                        >
                                                                            <label htmlFor={`hard-${sIdx}`} className="flex cursor-pointer items-start gap-2.5">
                                                                                <RadioGroupItem value="hard" id={`hard-${sIdx}`} className="mt-0.5" />
                                                                                <span className="text-[14px] text-slate-800"><strong>Hard</strong> — stop them answering more</span>
                                                                            </label>
                                                                            <label htmlFor={`soft-${sIdx}`} className="flex cursor-pointer items-start gap-2.5">
                                                                                <RadioGroupItem value="soft" id={`soft-${sIdx}`} className="mt-0.5" />
                                                                                <span className="text-[14px] text-slate-800"><strong>Soft</strong> — they can answer more, only some count</span>
                                                                            </label>
                                                                        </RadioGroup>
                                                                    </div>

                                                                    {section.attempt_control?.mode === 'soft' && (
                                                                        <div className="space-y-2">
                                                                            <span className="block text-[13px] font-semibold text-slate-600">Which answers count</span>
                                                                            <RadioGroup
                                                                                value={section.attempt_control?.soft_type || 'first_n'}
                                                                                onValueChange={(val) => updateSection(sIdx, 'attempt_control', { ...section.attempt_control, soft_type: val })}
                                                                                className="space-y-2"
                                                                            >
                                                                                <label htmlFor={`first_n-${sIdx}`} className="flex cursor-pointer items-center gap-2.5 text-[14px] text-slate-800">
                                                                                    <RadioGroupItem value="first_n" id={`first_n-${sIdx}`} /> The first ones they answered
                                                                                </label>
                                                                                <label htmlFor={`best_n-${sIdx}`} className="flex cursor-pointer items-center gap-2.5 text-[14px] text-slate-800">
                                                                                    <RadioGroupItem value="best_n" id={`best_n-${sIdx}`} /> Their best-scoring ones
                                                                                </label>
                                                                            </RadioGroup>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                                <button type="button" onClick={() => handleRemoveSection(sIdx)} aria-label="Delete section" title="Delete section"
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-white/80"
                                                    onClick={() => {
                                                        const next = new Set(collapsedSections);
                                                        if (next.has(section.id)) next.delete(section.id); else next.add(section.id);
                                                        setCollapsedSections(next);
                                                    }}
                                                    aria-expanded={!isCollapsed}
                                                    title={isCollapsed ? "Show questions" : "Hide questions"}
                                                >
                                                    <ChevronDown className={cn('h-5 w-5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]', !isCollapsed && 'rotate-180')} />
                                                </button>
                                            </div>

                                            <div className={`ios-collapse-transition ${isCollapsed ? 'collapsed' : 'expanded'}`}>
                                                <div className="overflow-hidden">
                                                    <div className="space-y-0 p-2 sm:p-3">
                                                        {section.questions.map((q, qIdx) => (
                                                            <React.Fragment key={q.id}>
                                                                {renderQuestion(q, section.questions, qIdx, {
                                                                    number: qIdx + 1,
                                                                    refPrefix: 'sq',
                                                                    update: fn => updateSectionQuestionAt(sIdx, qIdx, fn),
                                                                    onRemove: () => handleRemoveQuestionFromSection(sIdx, qIdx),
                                                                    canRemove: section.questions.length > 1,
                                                                    onPassageChange: content => updatePassageContentInSection(sIdx, q.groupId!, content),
                                                                    onAddToPassage: () => handleAddSubQuestionToSection(sIdx, qIdx),
                                                                })}
                                                                {qIdx < section.questions.length - 1
                                                                    ? <InsertBetween onInsert={() => handleAddQuestionToSection(sIdx, qIdx + 1)} />
                                                                    : <div className="h-3" />}
                                                            </React.Fragment>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddQuestionToSection(sIdx)}
                                                            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 text-[15px] font-semibold text-sky-700 transition-colors hover:border-sky-400 hover:bg-sky-50"
                                                        >
                                                            <Plus className="h-5 w-5" /> Add question to {section.name?.trim() || `Section ${sIdx + 1}`}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {sIdx < sections.length - 1 && (
                                            <div className="absolute -bottom-7 right-4 z-10">
                                                <button type="button" onClick={() => handleAddSection(sIdx + 1)} title="Insert a section here" aria-label="Insert a section here"
                                                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-900/[0.08] transition-[color,transform] hover:scale-110 hover:text-sky-700">
                                                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => handleAddSection()}
                                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-[15px] font-semibold text-slate-700 transition-colors hover:border-amber-400 hover:bg-amber-50"
                            >
                                <Layers className="h-5 w-5 text-amber-600" /> Add a new section
                            </button>
                        </div>
                    ) : (
                        <div>
                            {questions.map((q, index) => (
                                <React.Fragment key={q.id}>
                                    {renderQuestion(q, questions, index, {
                                        number: index + 1,
                                        refPrefix: 'q',
                                        update: fn => updateQuestionAt(index, fn),
                                        onRemove: () => handleRemoveQuestion(index),
                                        canRemove: questions.length > 1,
                                        onPassageChange: content => updatePassageContent(q.groupId!, content),
                                        onAddToPassage: () => handleAddSubQuestion(index),
                                        drag: {
                                            onDragStart: e => { e.dataTransfer.setData('questionIndex', index.toString()); setDraggingIndex(index); },
                                            onDragOver: e => e.preventDefault(),
                                            onDrop: e => handleDropQuestion(e, index),
                                            isDragging: draggingIndex !== null && draggingIndex !== index,
                                        },
                                    })}
                                    {index < questions.length - 1
                                        ? <InsertBetween onInsert={() => handleAddQuestion(index + 1)} />
                                        : <div className="h-4" />}
                                </React.Fragment>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddQuestion}
                                className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white/40 text-[16px] font-semibold text-sky-700 transition-colors hover:border-sky-400 hover:bg-sky-50"
                            >
                                <Plus className="h-5 w-5" /> Add question
                            </button>
                        </div>
                    )}
                </section>

                {/* ── Save bar: always in reach ── */}
                <div className="sticky bottom-3 z-30 pt-4 [body[data-sypad-open]_&]:invisible">
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/90 p-2 pl-4 shadow-[0_12px_36px_-14px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/[0.08] backdrop-blur-xl sm:flex-nowrap">
                        <p className="min-w-0 flex-1 truncate text-[14px] text-slate-600 tabular-nums">
                            <span className="font-semibold text-slate-900">{allQuestions.length}</span> Q · <span className="font-semibold text-slate-900">{totalMarks}</span> mark{totalMarks === 1 ? '' : 's'} · <span className="font-semibold text-slate-900">{Number.isFinite(time) ? time : 0}</span> min
                        </p>
                        {hasAnyContent && issues.length > 0 && (
                            <button
                                type="button"
                                onClick={jumpToFirstIssue}
                                title={`${issues[0].where}: ${issues[0].issue}`}
                                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-3 text-[13px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20 hover:bg-amber-100"
                            >
                                <AlertTriangle className="h-4 w-4" /> {issues.length} need{issues.length === 1 ? 's' : ''} attention
                            </button>
                        )}
                        <div className="flex shrink-0 items-center gap-1.5">
                            <button type="button" onClick={onCancel || (() => navigate(-1))} className="h-11 rounded-xl px-3.5 text-[15px] font-semibold text-slate-600 hover:bg-slate-100">
                                Cancel
                            </button>
                            <button type="button" onClick={handleSave} disabled={loading} className={cn(PRIMARY_BTN, 'h-11 min-w-[128px] px-5')}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {isEditMode ? 'Save changes' : 'Save test'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Jump arrows for phones and tablets (the question map does this on large screens) */}
            <div className={cn('fixed bottom-24 right-3 z-20 flex-col gap-2 lg:hidden [body[data-sypad-open]_&]:hidden', showJumpButtons ? 'flex' : 'hidden')}>
                <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Scroll to top"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-lg ring-1 ring-slate-900/10 backdrop-blur hover:text-sky-700">
                    <ChevronUp className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })} aria-label="Scroll to bottom"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-lg ring-1 ring-slate-900/10 backdrop-blur hover:text-sky-700">
                    <ChevronDown className="h-5 w-5" />
                </button>
            </div>

            <React.Suspense fallback={null}>
                <ScreenshotCaptureModal
                    isOpen={isCaptureModalOpen}
                    onClose={() => { setIsCaptureModalOpen(false); setCaptureApply(null); }}
                    onCapture={handleScreenshotCapture}
                />
            </React.Suspense>

            <React.Suspense fallback={null}>
                {photoTarget && (
                    <PhotoFillSheet
                        open={!!photoTarget}
                        targetLabel={sypadTargetLabel}
                        expectedType={photoTarget.expectedType}
                        isSignedIn={!!user}
                        onRequestSignIn={() => {
                            setPhotoTarget(null);
                            const returnUrl = isEditMode && testId ? `/edit-test/${testId}` : '/create-test';
                            openAuthModal({ view: 'login', redirectPath: returnUrl });
                        }}
                        onClose={() => setPhotoTarget(null)}
                        onFilled={handlePhotoFilled}
                    />
                )}
            </React.Suspense>

            {/* Cloudinary Upload Modal */}
            {isCloudUploadOpen && cloudUploadTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 text-left backdrop-blur-sm" onClick={() => setIsCloudUploadOpen(false)}>
                    <div className="w-full max-w-sm overflow-hidden rounded-[22px] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-5">
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-[19px] font-bold text-slate-900">Put a picture in the text</h3>
                                    <p className="mt-0.5 text-[13px] text-slate-500">It is uploaded and placed where your cursor was.</p>
                                </div>
                                <button type="button" onClick={() => setIsCloudUploadOpen(false)} aria-label="Close" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div
                                ref={cloudUploadBoxRef}
                                className="group cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 p-7 text-center outline-none transition-colors hover:border-sky-400 hover:bg-sky-50/60 focus:border-sky-500 focus:bg-sky-50/40"
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
                                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-700 transition-transform group-hover:scale-105">
                                    <Cloud className="h-6 w-6" />
                                </div>
                                <p className="text-[15px] font-semibold text-slate-800">Choose a picture</p>
                                <p className="mt-1 text-[13px] text-slate-500">or press <kbd className="mx-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-600">Ctrl+V</kbd> here to paste one</p>
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
                        className="relative mx-4 w-full max-w-3xl overflow-hidden rounded-[22px] bg-white shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <div>
                                <h3 className="text-[17px] font-semibold text-slate-900">Where your institution name appears</h3>
                                <p className="mt-0.5 text-[13px] text-slate-500">At the top of the test page, for every student.</p>
                            </div>
                            <button type="button" onClick={() => setShowInstitutePreview(false)} aria-label="Close"
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="px-5 pt-3">
                            <Segmented
                                label="Preview device"
                                value={previewImageIndex === 0 ? 'desktop' : 'phone'}
                                onChange={v => setPreviewImageIndex(v === 'desktop' ? 0 : 1)}
                                options={[
                                    { value: 'desktop', label: <><Monitor className="h-4 w-4" /> Computer</> },
                                    { value: 'phone', label: <><Smartphone className="h-4 w-4" /> Phone</> },
                                ]}
                            />
                        </div>

                        <div className="p-5">
                            {previewImageIndex === 0 ? (
                                <div className="overflow-hidden rounded-xl ring-1 ring-slate-900/10">
                                    <img
                                        src="/institute-name-showcase/testoza-live-test page-for institution-name-computer-view.png"
                                        alt="Institution name on desktop live test"
                                        className="h-auto max-h-[55vh] w-full object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="flex justify-center">
                                    <div className="w-full max-w-[280px] overflow-hidden rounded-xl ring-1 ring-slate-900/10">
                                        <img
                                            src="/institute-name-showcase/testoza-live-test page-for institution-name-phone-view.jpg"
                                            alt="Institution name on phone live test"
                                            className="h-auto max-h-[55vh] w-full object-contain"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Virtual Math Keyboard (docks to the bottom like a phone keyboard) */}
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

            {/* VS Code style question map */}
            <TestBuilderMinimap
                mode={enableSectionMode ? 'section' : 'standard'}
                sections={sections}
                questions={questions}
                issueIds={hasAnyContent ? issueIds : undefined}
            />
        </div>
    );
}
