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
import { Plus, Trash2, Save, ArrowLeft, Loader2, Upload, CheckSquare, Square, Languages, X, Check, ChevronsUpDown, GripVertical, Cloud, CloudOff, FileText, Eraser, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { IMEInput } from '@/components/ui/IMEInput';
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
    marks: '4',
    negativeMarks: '1'
};

interface TestBuilderProps {
    initialData?: any;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function TestBuilder({ initialData, onSuccess, onCancel }: TestBuilderProps) {
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
    const [time, setTime] = useState<number>(30);
    const [marks, setMarks] = useState<number>(4);
    const [negativeMarks, setNegativeMarks] = useState<number>(1);
    const [isPublic, setIsPublic] = useState(true);

    // Category State
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);

    // Tags State
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
    type SectionState = TestSection & { questions: QuestionState[] };
    const [enableSectionMode, setEnableSectionMode] = useState(false);
    const [sectionMarkingModel, setSectionMarkingModel] = useState<'section-wise' | 'question-wise'>('section-wise');
    const [hasScientificCalculator, setHasScientificCalculator] = useState(false);
    const [sections, setSections] = useState<SectionState[]>([
        {
            id: 'section-1',
            name: 'Section A',
            questions: [DEFAULT_QUESTION],
            marks_per_question: 4,
            negative_marks: 1,
            question_type: 'single'
        }
    ]);

    // Auto Save State
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

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

    // Load Categories
    useEffect(() => {
        fetchCategories().then(({ data }) => {
            if (data) setCategories(data);
        });
    }, []);

    // Track loaded ID to prevent re-fetching/resetting on parent re-renders
    const loadedTestId = React.useRef<string | null>(null);

    // Load Existing Test Data
    useEffect(() => {
        const targetId = initialData?.id || (isEditMode ? testId : null);

        // If we already loaded this test ID, don't reload/reset state
        if (targetId && loadedTestId.current === targetId) {
            return;
        }

        // If initialData is provided directly, populate from it
        if (initialData) {
            populateData(initialData);
            loadedTestId.current = initialData.id;
            // We also need to fetch categories for this test if not in initialData
            fetchAndSetCategories(initialData.id);
            if (initialData.tags) setTags(initialData.tags);
            return;
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
                const draftData = {
                    title,
                    description,
                    revision_notes: revisionNotes,
                    institution_name: institutionName,
                    institution_logo: institutionLogo,
                    duration: time,
                    is_public: isPublic,
                    questions,
                    selectedCategories
                };
                localStorage.setItem('create_test_draft', JSON.stringify(draftData));
            }, 1000);
            return () => clearTimeout(timer);
        }

    }, [questions, title, description, revisionNotes, time, marks, negativeMarks, isPublic, selectedCategories, isEditMode, testId, institutionName, institutionLogo]);

    const handleAutoSave = async () => {
        if (!title.trim()) return; // Silent fail if no title

        setSaveStatus('saving');
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
        const { fetchTestCategories } = await import('@/lib/categoriesApi');
        const { data: catData } = await fetchTestCategories(tid);
        if (catData) {
            setSelectedCategories(catData);
        }
    };

    const populateData = (data: any) => {
        setTitle(data.title);
        setDescription(data.description || '');
        setRevisionNotes(data.revision_notes || '');
        setInstitutionName(data.institution_name || '');
        setInstitutionLogo(data.institution_logo || '');
        setTime(data.duration || 30);
        setMarks(data.marks_per_question || 4);
        setNegativeMarks(data.negative_marks || 1);
        setIsPublic(data.is_public ?? true);

        if (data.enable_section_mode && data.sections) {
            setEnableSectionMode(true);
            setSections(data.sections.map((s: any) => ({
                ...s,
                questions: s.questions.map((q: any) => ({
                    ...q,
                    options: q.options || { A: '', B: '', C: '', D: '' },
                    typingMode: 'en'
                }))
            })));
        } else {
            const mappedQuestions = (data.questions as any[]).map((q: any) => {
                // Handle basic mapping (questionText -> question)
                let mappedQ = {
                    ...q,
                    question: q.question || q.questionText || '',
                    typingMode: 'en'
                };

                // Handle Options Conversion (Nested AI Object -> Flat Frontend Structure)
                // AI Schema: options: { A: { text: "...", image: "..." } }
                // Frontend Schema: options: { A: "..." }, optionImages: { A: "..." }

                let flatOptions: { [key: string]: string } = {};
                let flatOptionImages: { [key: string]: string } = q.optionImages || {};

                if (q.options && typeof q.options === 'object') {
                    Object.keys(q.options).forEach(key => {
                        const val = q.options[key];
                        if (val && typeof val === 'object' && val.text !== undefined) {
                            // It's the AI nested format
                            flatOptions[key] = val.text || '';
                            if (val.image) {
                                flatOptionImages[key] = val.image;
                            }
                        } else {
                            // It's already flat or something else
                            flatOptions[key] = String(val || '');
                        }
                    });

                    // If flatOptionImages has content, attach it
                    if (Object.keys(flatOptionImages).length > 0) {
                        mappedQ.optionImages = flatOptionImages;
                    }
                } else if (!q.options) {
                    flatOptions = { A: '', B: '', C: '', D: '' };
                }

                mappedQ.options = flatOptions;
                return mappedQ;
            });
            setQuestions(mappedQuestions);
        }

        setHasScientificCalculator(data.has_scientific_calculator || false);
        setEnableSectionMode(data.enable_section_mode || false);
        setSectionMarkingModel(data.section_marking_model || 'section-wise');

        if (data.custom_category) {
            setShowOtherCategory(true);
            setCustomCategory(data.custom_category);
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

    const updateQuestion = (index: number, field: keyof QuestionState, value: any) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
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
            else if (type === 'numerical') newQ.correctAnswer = { min: 0, max: 0 };
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

    const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const json = JSON.parse(text);
                const hasQuestions = json.questions && Array.isArray(json.questions) && json.questions.length > 0;
                const hasSections = json.sections && Array.isArray(json.sections) && json.sections.length > 0;

                if (!json.title || (!hasQuestions && !hasSections)) throw new Error("Invalid JSON format: Must have title and either questions or sections");

                // Use existing populate logic
                populateData(json);
                toast.success("Test imported successfully");
            } catch (err: any) {
                console.error(err);
                toast.error("Failed to import: " + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
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
            slug: title ? slugify(title, { lower: true, strict: true }) + '-' + Math.random().toString(36).substr(2, 4) : undefined,
            tags: tags,
            custom_category: showOtherCategory && customCategory.trim() ? customCategory.trim() : null,

            // New Fields
            enable_section_mode: enableSectionMode,
            section_marking_model: sectionMarkingModel,
            has_scientific_calculator: hasScientificCalculator,
            sections: sanitizedSections
        };

        if (isEditMode && testId) {
            const { error } = await updateTest(testId, testDataPayload);
            if (error) throw error;
            if (selectedCategories.length > 0) {
                const { assignCategoriesToTest } = await import('@/lib/categoriesApi');
                await assignCategoriesToTest(testId, selectedCategories);
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
                            console.log(`Sent notifications to ${followers.length} followers.`);
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
                title, description, revision_notes: revisionNotes, institution_name: institutionName, institution_logo: institutionLogo,
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
                    if (!q.correctAnswer || typeof q.correctAnswer !== 'object' || q.correctAnswer.min === undefined || q.correctAnswer.max === undefined) {
                        return `${context} ${i + 1} (Numerical) must have a Min and Max value`;
                    }
                    if (Number(q.correctAnswer.min) > Number(q.correctAnswer.max)) {
                        return `${context} ${i + 1}: Min cannot be greater than Max`;
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
            setTime(30);
            setMarks(4);
            setNegativeMarks(1);
            setIsPublic(true);
            setQuestions([{ ...DEFAULT_QUESTION, id: 1, options: { ...DEFAULT_QUESTION.options } }]);
            setSelectedCategories([]);
            setTags([]);
            // Clear draft
            localStorage.removeItem('create_test_draft');
            toast.success("Form cleared");
        }
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
                    marks_per_question: 4,
                    negative_marks: 1,
                    question_type: 'single'
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

    const handleAddSection = () => {
        const nextId = sections.length + 1;
        const nextLetter = String.fromCharCode(65 + sections.length);
        const newSection: SectionState = {
            id: `section-${Date.now()}`,
            name: `Section ${nextLetter}`,
            questions: [{ ...DEFAULT_QUESTION, id: Math.random() }],
            marks_per_question: 4,
            negative_marks: 1,
            question_type: 'single'
        };
        setSections([...sections, newSection]);
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
        newSections[index] = { ...newSections[index], [field]: value };
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
            marks: lastQuestion ? lastQuestion.marks : (section.marks_per_question?.toString() || '4'),
            negativeMarks: lastQuestion ? lastQuestion.negativeMarks : (section.negative_marks?.toString() || '1')
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
            marks: parentQ.marks || '4',
            negativeMarks: parentQ.negativeMarks || '1'
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
        // @ts-ignore
        newSections[sectionIndex].questions[qIndex] = { ...q, [field]: value };
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
            else if (type === 'numerical') newQ.correctAnswer = { min: 0, max: 0 };
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

    return (
        <div className="container mx-auto py-8">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {onCancel && (
                        <Button variant="ghost" size="icon" onClick={onCancel}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    )}
                    <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Test' : 'Create New Test'}</h1>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end gap-1">
                        <label className="cursor-pointer">
                            <input type="file" accept=".json" className="hidden" onChange={handleJsonImport} />
                            <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 py-2 cursor-pointer">
                                <Upload className="w-4 h-4 mr-2" />
                                Import JSON
                            </div>
                        </label>
                        <TestUploadFormatGuide />
                    </div>

                    {isEditMode && (
                        <div className="flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-right-4 duration-300">
                            {saveStatus === 'saving' && (
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Saving...
                                </span>
                            )}
                            {saveStatus === 'saved' && (
                                <span className="text-emerald-600 flex items-center gap-1.5">
                                    <Cloud className="w-4 h-4" />
                                    All changes saved
                                </span>
                            )}
                            {saveStatus === 'error' && (
                                <span className="text-red-500 flex items-center gap-1.5">
                                    <CloudOff className="w-4 h-4" />
                                    Save failed
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {!isOnline && (
                <div className="bg-red-500 text-white text-sm py-2 px-4 rounded mb-4 flex items-center justify-center gap-2">
                    <WifiOff className="w-4 h-4" />
                    <span>You are currently offline. Transliteration features require an internet connection.</span>
                </div>
            )}

            <div className="grid gap-6">
                <Card>
                    <div className="flex items-center justify-center gap-6 p-6 pb-0">
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
                                <div className={`w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all relative overflow-hidden ${isDragging ? 'border-primary bg-primary/10' : institutionLogo ? 'border-primary/50' : 'border-slate-300'}`}>
                                    {institutionLogo ? (
                                        <img src={institutionLogo} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <Upload className="w-5 h-5 text-slate-400" />
                                    )}
                                    {!isPremium && !institutionLogo && (
                                        <div className="absolute inset-0 bg-slate-100/80 flex items-center justify-center">
                                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Locked</span>
                                        </div>
                                    )}
                                </div>
                            </label>
                        </div>
                        <div className="w-full max-w-lg flex items-start gap-4">
                            <div className="flex-1 mr-2 relative group-input">
                                <Input
                                    value={institutionName}
                                    onChange={(e) => setInstitutionName(e.target.value)}
                                    placeholder={isPremium ? "Add Your Institution Name" : "Add Institution Name (Premium)"}
                                    className="text-xl font-bold border-none shadow-none focus-visible:ring-0 placeholder:text-slate-300 px-0 disabled:opacity-100 disabled:cursor-not-allowed"
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
                            <div className="flex flex-col justify-start h-full pt-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClear}
                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                                    title="Clear All Data"
                                >
                                    <Eraser className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <CardHeader><CardTitle className="text-lg">Test Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Test Title</Label>
                            <Input placeholder="Enter test title..." value={title} onChange={e => setTitle(e.target.value)} />
                        </div>


                        <div className="flex flex-col space-y-2">
                            <Label>Categories</Label>
                            <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
                                {/* ... Existing Popover code ... */}
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openCategoryCombobox}
                                        className="w-full justify-between"
                                    >
                                        {selectedCategories.length > 0
                                            ? `${selectedCategories.length} selected`
                                            : "Select categories..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0">
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
                                        <Badge key={catId} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
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

                        {/* TAGS INPUT SECTION */}
                        <div className="space-y-2">
                            <Label>Tags (Press Enter to add)</Label>
                            <Input
                                placeholder="Add a tag..."
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleAddTag}
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                                {tags.map((tag, idx) => (
                                    <Badge key={idx} variant="outline" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-slate-50">
                                        #{tag}
                                        <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => removeTag(tag)} />
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <div className="flex justify-between items-center">
                                <Label>Description (Short)</Label>
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
                                as="textarea"
                                typingMode={descriptionLanguage}
                                value={description}
                                onChange={setDescription}
                                placeholder="Brief description of the test"
                                className="min-h-[80px]"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Test Summary & Instructions (Rich Text)</Label>
                            <RichTextEditor
                                value={revisionNotes}
                                onChange={setRevisionNotes}
                                placeholder="Add detailed instructions, syllabus, or summary here..."
                            />
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div><Label>Time (mins)</Label><Input type="number" value={time} onChange={e => setTime(parseInt(e.target.value))} /></div>
                            <div>
                                <Label>Visibility</Label>
                                <div className="flex items-center space-x-2 h-10 border rounded-md px-3 bg-white">
                                    <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                                    <Label className="cursor-pointer" onClick={() => setIsPublic(!isPublic)}>{isPublic ? 'Public' : 'Private'}</Label>
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
                                    <Label className="cursor-pointer text-sm font-medium" onClick={() => setHasScientificCalculator(!hasScientificCalculator)}>
                                        {hasScientificCalculator ? 'On' : 'Off'}
                                    </Label>
                                </div>
                            </div>
                            <div>
                                <Label>section-wise-questions</Label>
                                <div className="flex items-center space-x-2 h-10 border rounded-md px-3 bg-white">
                                    <Switch checked={enableSectionMode} onCheckedChange={toggleSectionMode} />
                                    <Label className="cursor-pointer" onClick={() => toggleSectionMode(!enableSectionMode)}>{enableSectionMode ? 'On' : 'Off'}</Label>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Format Support Note */}
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md text-sm flex items-start gap-3">
                    <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
                    <div>
                        <p className="font-semibold mb-1">Supported Formats</p>
                        <p className="text-blue-700/80">
                            You can use <strong>LaTeX</strong> for mathematical equations (e.g., <code className="bg-blue-100 px-1 rounded">\( E = mc^2 \)</code>).
                            Markdown formatting is also supported for bold, italics, and lists to help you create the best test experience.
                        </p>
                    </div>
                </div>

                {/* Question List */}
                <div className="space-y-4">
                    {enableSectionMode ? (
                        <>
                            <div className="space-y-8">
                                <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                    <div>
                                        <h2 className="text-xl font-bold text-blue-900">Sections ({sections.length})</h2>
                                        <p className="text-sm text-blue-700">Manage your test sections below. Each section can have its own marking scheme.</p>
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
                                    const style = SECTION_STYLES[sIdx % SECTION_STYLES.length];

                                    return (
                                        <Card key={section.id} className={`border-2 shadow-md overflow-hidden ${style.border}`}>
                                            <div className={`${style.header} px-4 py-3 border-b flex flex-wrap gap-4 items-end transition-colors`}>
                                                <div className="flex-1 space-y-1">
                                                    <Label className="text-xs font-bold text-slate-500 uppercase">Section Name</Label>
                                                    <Input
                                                        value={section.name}
                                                        onChange={(e) => updateSection(sIdx, 'name', e.target.value)}
                                                        className="font-bold text-lg bg-white"
                                                        placeholder="e.g. Physics"
                                                    />
                                                </div>

                                                {sectionMarkingModel === 'section-wise' && (
                                                    <>
                                                        <div className="w-24 space-y-1">
                                                            <Label className="text-xs font-bold text-slate-500 uppercase">Marks/Q</Label>
                                                            <Input
                                                                type="text"
                                                                value={section.marks_per_question || ''}
                                                                onChange={(e) => updateSection(sIdx, 'marks_per_question', e.target.value)}
                                                                className="bg-white"
                                                                placeholder={marks.toString()}
                                                            />
                                                        </div>
                                                        <div className="w-24 space-y-1">
                                                            <Label className="text-xs font-bold text-slate-500 uppercase">Negative</Label>
                                                            <Input
                                                                type="text"
                                                                value={section.negative_marks || ''}
                                                                onChange={(e) => updateSection(sIdx, 'negative_marks', e.target.value)}
                                                                className="bg-white"
                                                                placeholder={negativeMarks.toString()}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveSection(sIdx)} className="mb-0.5 text-slate-400 hover:text-red-500"><Trash2 className="w-5 h-5" /></Button>
                                            </div>

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
                                                            <div key={q.id} className={isInGroup ? "mb-0" : "mb-4"}>
                                                                {/* Passage Header - Renders only at the start of a group inside section */}
                                                                {isStartOfGroup && (
                                                                    <div className="rounded-t-lg border-2 border-b-0 border-blue-500 bg-blue-50/30 overflow-hidden mt-4">
                                                                        <div className="bg-blue-100/80 px-4 py-3 border-b-2 border-blue-500 flex justify-between items-center">
                                                                            <h3 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                                                                                <FileText className="w-4 h-4" /> Passage Reference
                                                                            </h3>
                                                                        </div>
                                                                        <div className="p-4">
                                                                            <RichTextEditor
                                                                                value={q.passageContent || ''}
                                                                                onChange={(val) => updatePassageContentInSection(sIdx, q.groupId!, val)}
                                                                                placeholder="Enter the passage, story, or comprehension text here..."
                                                                                className="min-h-[150px] bg-white border-blue-100 shadow-sm"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <Card className={`
                                                                relative transition-all 
                                                                ${isInGroup ? 'border-2 border-blue-500 border-t-0 rounded-none shadow-none bg-blue-50/5' : 'shadow-sm border border-slate-200'}
                                                                ${isStartOfGroup ? '' : 'border-t-0'}
                                                                ${isEndOfGroup ? 'rounded-b-lg border-b-2 mb-4' : ''}
                                                            `}>
                                                                    <div className="absolute right-0 top-0"><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => handleRemoveQuestionFromSection(sIdx, qIdx)} disabled={section.questions.length === 1}><Trash2 className="w-4 h-4" /></Button></div>
                                                                    <CardContent className="pt-10 space-y-4">
                                                                        <div className="flex gap-2">
                                                                            <span className="font-bold text-lg text-muted-foreground">Q{qIdx + 1}.</span>
                                                                            <div className="flex-1 space-y-4">
                                                                                <div className="flex justify-between items-center mb-2 relative">
                                                                                    {isInGroup && (
                                                                                        <span className="absolute -top-5 left-0 text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 rounded-full uppercase tracking-wider border border-blue-200">
                                                                                            Passage Related
                                                                                        </span>
                                                                                    )}
                                                                                    <div onClick={(e) => e.stopPropagation()}>
                                                                                        <Select value={q.type || 'single'} onValueChange={(val: any) => updateQuestionTypeInSection(sIdx, qIdx, val)}>
                                                                                            <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                                                                                            <SelectContent>
                                                                                                <SelectItem value="single">Single Choice</SelectItem>
                                                                                                <SelectItem value="single-advance">Single Choice 2.0</SelectItem>
                                                                                                <SelectItem value="multiple">Multiple Choice</SelectItem>
                                                                                                <SelectItem value="numerical">Numerical</SelectItem>
                                                                                                {!isInGroup && <SelectItem value="comprehension">Passage/Comprehension</SelectItem>}
                                                                                            </SelectContent>
                                                                                        </Select>
                                                                                    </div>
                                                                                    {sectionMarkingModel === 'question-wise' && (
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-slate-50 hover:bg-slate-100 transition-colors">
                                                                                                <span className="text-[10px] font-bold text-slate-500 uppercase">M:</span>
                                                                                                <Input
                                                                                                    type="text"
                                                                                                    value={q.marks || ''}
                                                                                                    onChange={(e) => updateQuestionInSection(sIdx, qIdx, 'marks', e.target.value)}
                                                                                                    className="h-5 w-10 min-w-0 p-0 border-none bg-transparent shadow-none focus-visible:ring-0 text-xs font-medium text-center"
                                                                                                    placeholder="4"
                                                                                                />
                                                                                            </div>
                                                                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-slate-50 hover:bg-slate-100 transition-colors">
                                                                                                <span className="text-[10px] font-bold text-slate-500 uppercase">N:</span>
                                                                                                <Input
                                                                                                    type="text"
                                                                                                    value={q.negativeMarks || ''}
                                                                                                    onChange={(e) => updateQuestionInSection(sIdx, qIdx, 'negativeMarks', e.target.value)}
                                                                                                    className="h-5 w-10 min-w-0 p-0 border-none bg-transparent shadow-none focus-visible:ring-0 text-xs font-medium text-center"
                                                                                                    placeholder="1"
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-slate-50 hover:bg-slate-100 transition-colors">
                                                                                        <Languages className="w-3.5 h-3.5 text-slate-500" />
                                                                                        <Select value={q.typingMode} onValueChange={(val: 'en' | 'hi') => updateQuestionInSection(sIdx, qIdx, 'typingMode', val)}>
                                                                                            <SelectTrigger className="h-4 p-0 border-none bg-transparent focus:ring-0 text-xs font-medium w-auto gap-1"><SelectValue placeholder="Lang" /></SelectTrigger>
                                                                                            <SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="hi">Hindi</SelectItem></SelectContent>
                                                                                        </Select>
                                                                                    </div>
                                                                                </div>

                                                                                <div></div>
                                                                                <IMEInput as="textarea" typingMode={q.typingMode} placeholder="Type question..." value={q.question} onChange={(val: string) => updateQuestionInSection(sIdx, qIdx, 'question', val)} className="min-h-[80px]" />

                                                                                <div className="space-y-2">
                                                                                    {q.image ? (
                                                                                        <div className="relative group w-fit">
                                                                                            <img src={q.image} alt="Question" className="h-40 w-auto object-contain border rounded-lg bg-white" />
                                                                                            <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100" onClick={() => updateQuestionInSection(sIdx, qIdx, 'image', '')}><X className="h-3 w-3" /></Button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="flex items-center border border-t-0 border-input rounded-b-md bg-slate-50/50 overflow-hidden h-9">
                                                                                            <Input placeholder="Paste Image URL or Upload" value={q.image || ''} onChange={(e) => updateQuestionInSection(sIdx, qIdx, 'image', processImageUrl(e.target.value))} className="flex-1 border-none shadow-none text-xs bg-transparent px-3" />
                                                                                            <label className="cursor-pointer h-full border-l border-input">
                                                                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (base64) => updateQuestionInSection(sIdx, qIdx, 'image', base64))} />
                                                                                                <div className="flex items-center justify-center h-full px-4 bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-medium text-slate-700 whitespace-nowrap">
                                                                                                    <Upload className="w-3.5 h-3.5 mr-2" />
                                                                                                    Upload
                                                                                                </div>
                                                                                            </label>
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {/* Answers */}
                                                                                {q.type === 'numerical' ? (
                                                                                    <div className="p-4 bg-slate-50 rounded-lg">
                                                                                        <div className="flex gap-4">
                                                                                            <div><Label className="text-xs">Min</Label><Input type="number" step="any" value={(q.correctAnswer as any)?.min || ''} onChange={(e) => { const val = parseFloat(e.target.value); const current = (q.correctAnswer as any) || { min: 0, max: 0 }; updateQuestionInSection(sIdx, qIdx, 'correctAnswer', { ...current, min: isNaN(val) ? 0 : val }); }} /></div>
                                                                                            <div><Label className="text-xs">Max</Label><Input type="number" step="any" value={(q.correctAnswer as any)?.max || ''} onChange={(e) => { const val = parseFloat(e.target.value); const current = (q.correctAnswer as any) || { min: 0, max: 0 }; updateQuestionInSection(sIdx, qIdx, 'correctAnswer', { ...current, max: isNaN(val) ? 0 : val }); }} /></div>
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                        {Object.keys(q.options).sort().map(optKey => {
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
                                                                                                <div key={optKey} className="flex gap-2 items-start relative group/option">
                                                                                                    {q.type === 'multiple' && <div onClick={handleSelect} className="mt-2 cursor-pointer">{isSelected ? <CheckSquare className="w-6 h-6 text-primary" /> : <Square className="w-6 h-6 text-slate-400" />}</div>}
                                                                                                    <div onClick={handleSelect} className={`mt-1 w-8 h-8 flex items-center justify-center border font-bold cursor-pointer transition-all ${isSelected ? 'bg-green-100 border-green-500 text-green-700' : 'bg-slate-50 hover:bg-slate-100'} ${q.type === 'multiple' ? 'rounded-md' : 'rounded-full'}`}>{optKey}</div>
                                                                                                    <div className="flex-1 flex flex-col">
                                                                                                        <div className="relative">
                                                                                                            <IMEInput as="textarea" typingMode={q.typingMode} placeholder={`Option ${optKey}`} value={q.options[optKey]} onChange={(val: string) => { const newSections = [...sections]; newSections[sIdx].questions[qIdx].options[optKey] = val; setSections(newSections); }} className="min-h-[60px] resize-y pr-8" />
                                                                                                            <Button
                                                                                                                variant="ghost"
                                                                                                                size="icon"
                                                                                                                className="absolute top-1 right-1 h-6 w-6 text-slate-400 hover:text-red-500 opacity-0 group-hover/option:opacity-100 transition-opacity"
                                                                                                                onClick={() => handleRemoveOptionFromSection(sIdx, qIdx, optKey)}
                                                                                                                title="Remove Option"
                                                                                                            >
                                                                                                                <X className="w-3.5 h-3.5" />
                                                                                                            </Button>
                                                                                                        </div>
                                                                                                        {q.optionImages?.[optKey] ? (
                                                                                                            <div className="relative group mt-1 w-fit">
                                                                                                                <img src={q.optionImages[optKey]} alt={`Option ${optKey}`} className="h-20 w-auto object-contain border rounded bg-white" />
                                                                                                                <button
                                                                                                                    onClick={() => { const newSections = [...sections]; const q = newSections[sIdx].questions[qIdx]; if (q.optionImages) delete q.optionImages[optKey]; setSections(newSections); }}
                                                                                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                                                >
                                                                                                                    <X className="w-3 h-3" />
                                                                                                                </button>
                                                                                                            </div>
                                                                                                        ) : (
                                                                                                            <div className="flex items-center border border-t-0 border-input rounded-b-md bg-slate-50/50 overflow-hidden h-7 mt-1">
                                                                                                                <Input placeholder="Image URL" value="" onChange={(e) => { const newSections = [...sections]; const q = newSections[sIdx].questions[qIdx]; if (!q.optionImages) q.optionImages = {}; q.optionImages[optKey] = processImageUrl(e.target.value); setSections(newSections); }} className="flex-1 border-none bg-transparent h-full text-[10px] px-2 shadow-none focus-visible:ring-0" />
                                                                                                                <label className="cursor-pointer h-full border-l border-input flex items-center px-2 bg-slate-100 hover:bg-slate-200 text-[10px] whitespace-nowrap"><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, (base64) => { const newSections = [...sections]; const q = newSections[sIdx].questions[qIdx]; if (!q.optionImages) q.optionImages = {}; q.optionImages[optKey] = base64; setSections(newSections); })} /><Upload className="w-3 h-3 mr-1" />Upload</label>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                        <Button variant="outline" size="sm" className="h-full min-h-[60px] border-dashed text-muted-foreground hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/30 transition-colors" onClick={() => handleAddOptionToSection(sIdx, qIdx)}>
                                                                                            <Plus className="w-4 h-4" />
                                                                                        </Button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                                {isEndOfGroup && (
                                                                    <div className="flex justify-center -mt-2 pb-6 pt-2 bg-blue-50/20 border-x border-b border-blue-200 rounded-b-lg mb-4">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="secondary"
                                                                            onClick={() => handleAddSubQuestionToSection(sIdx, qIdx)}
                                                                            className="gap-2 bg-white text-blue-600 hover:bg-blue-50 border border-blue-200 shadow-sm"
                                                                        >
                                                                            <Plus className="w-4 h-4" /> Add Question to Passage
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    <Button onClick={() => handleAddQuestionToSection(sIdx)} size="sm" variant="outline" className="w-full border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"><Plus className="w-4 h-4 mr-2" /> Add Question to {section.name}</Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                            <Button onClick={handleAddSection} variant="outline" className="w-full py-6 border-dashed border-2 border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 mt-4"><Plus className="w-5 h-5 mr-2" /> Add New Section</Button>
                        </>
                    ) : (
                        <>
                            <h2 className="text-xl font-semibold">Questions ({questions.length})</h2>
                            {questions.map((q, index) => {
                                // VISUAL GROUPING LOGIC
                                const currentGroupId = q.groupId;
                                const prevGroupId = index > 0 ? questions[index - 1].groupId : undefined;
                                const nextGroupId = index < questions.length - 1 ? questions[index + 1].groupId : undefined;

                                const isStartOfGroup = !!currentGroupId && currentGroupId !== prevGroupId;
                                const isEndOfGroup = !!currentGroupId && currentGroupId !== nextGroupId;
                                const isInGroup = !!currentGroupId;

                                return (
                                    <div key={index} className={isInGroup ? "space-y-0" : "space-y-4"}>

                                        {/* Passage Header - Renders only at the start of a group */}
                                        {isStartOfGroup && (
                                            <div className="rounded-t-lg border-2 border-b-0 border-blue-500 bg-blue-50/30 overflow-hidden mt-4">
                                                <div className="bg-blue-100/80 px-4 py-3 border-b-2 border-blue-500 flex justify-between items-center">
                                                    <h3 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                                                        <FileText className="w-4 h-4" /> Passage Reference
                                                    </h3>
                                                </div>
                                                <div className="p-4">
                                                    <RichTextEditor
                                                        value={q.passageContent || ''}
                                                        onChange={(val) => updatePassageContent(q.groupId!, val)}
                                                        placeholder="Enter the passage, story, or comprehension text here..."
                                                        className="min-h-[150px] bg-white border-blue-100 shadow-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Question Card */}
                                        <Card
                                            className={`
                                                relative transition-all 
                                                ${isDragging ? 'border-dashed border-primary/50' : ''}
                                                ${isInGroup ? 'border-2 border-blue-500 border-t-0 rounded-none shadow-none bg-blue-50/5' : 'shadow-sm'}
                                                ${isStartOfGroup ? '' : ''}
                                                ${isEndOfGroup ? 'rounded-b-lg border-b-2' : ''}
                                            `}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => { e.stopPropagation(); handleDropQuestion(e, index); }}
                                        >
                                            <div className="drag-handle absolute left-2 top-2 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 z-10 p-1"><GripVertical className="h-5 w-5" /></div>
                                            <div className="absolute right-0 top-0"><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => handleRemoveQuestion(index)} disabled={questions.length === 1}><Trash2 className="w-4 h-4" /></Button></div>
                                            <CardContent className="p-4 space-y-4">


                                                <div className="flex gap-2">
                                                    <span className="font-bold text-lg text-muted-foreground">Q{index + 1}.</span>
                                                    <div className="flex-1 space-y-4">
                                                        <div className="flex justify-between items-center mb-2 relative">
                                                            {isInGroup && (
                                                                <span className="absolute -top-5 left-0 text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 rounded-full uppercase tracking-wider border border-blue-200">
                                                                    Passage Related
                                                                </span>
                                                            )}

                                                            {/* Question Type Selector */}
                                                            <div
                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <Select value={q.type || 'single'} onValueChange={(val: any) => handleQuestionTypeChange(index, val)}>
                                                                    <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="single">Single Choice</SelectItem>
                                                                        <SelectItem value="single-advance">Single Choice 2.0</SelectItem>
                                                                        <SelectItem value="multiple">Multiple Choice</SelectItem>
                                                                        <SelectItem value="numerical">Numerical</SelectItem>
                                                                        {/* Hide Comprehension option if already inside a group */}
                                                                        {!isInGroup && <SelectItem value="comprehension">Passage/Comprehension</SelectItem>}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>


                                                            <div className="flex items-center gap-2">
                                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors group">
                                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Marks:</span>
                                                                    <Input
                                                                        type="text"
                                                                        value={q.marks || ''}
                                                                        onChange={(e) => updateQuestion(index, 'marks', e.target.value)}
                                                                        className="h-5 w-10 min-w-0 p-0 border-none bg-transparent shadow-none focus-visible:ring-0 text-xs font-medium text-center"
                                                                        placeholder="4"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors group">
                                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Neg:</span>
                                                                    <Input
                                                                        type="text"
                                                                        value={q.negativeMarks || ''}
                                                                        onChange={(e) => updateQuestion(index, 'negativeMarks', e.target.value)}
                                                                        className="h-5 w-10 min-w-0 p-0 border-none bg-transparent shadow-none focus-visible:ring-0 text-xs font-medium text-center"
                                                                        placeholder="1"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                                                                    <Languages className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-700" />
                                                                    <Select value={q.typingMode} onValueChange={(val: 'en' | 'hi') => toggleQuestionLanguage(index, val)}>
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
                                                        </div>
                                                        <IMEInput as="textarea" typingMode={q.typingMode} placeholder="Type question..." value={q.question} onChange={(val: string) => updateQuestion(index, 'question', val)} className="min-h-[80px]" />

                                                        {/* Image Upload for Question */}
                                                        <div className="space-y-2">
                                                            {q.image ? (
                                                                <div className="relative group w-fit">
                                                                    <img src={q.image} alt="Question" className="h-40 w-auto object-contain border rounded-lg bg-white shadow-sm" />
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="icon"
                                                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        onClick={() => updateQuestion(index, 'image', '')}
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center border border-t-0 border-input rounded-b-md bg-slate-50/50 overflow-hidden h-9">
                                                                    <Input
                                                                        placeholder="Paste Image URL or Upload"
                                                                        value={q.image || ''}
                                                                        onChange={(e) => updateQuestion(index, 'image', processImageUrl(e.target.value))}
                                                                        className="flex-1 border-none shadow-none focus-visible:ring-0 h-full text-xs bg-transparent px-3 rounded-none"
                                                                    />
                                                                    <label className="cursor-pointer h-full border-l border-input">
                                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (base64) => updateQuestion(index, 'image', base64))} />
                                                                        <div className="flex items-center justify-center h-full px-4 bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-medium text-slate-700 whitespace-nowrap">
                                                                            <Upload className="w-3.5 h-3.5 mr-2" />
                                                                            Upload
                                                                        </div>
                                                                    </label>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Answers */}
                                                        {q.type === 'numerical' ? (
                                                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                                                <Label className="text-xs font-semibold uppercase text-slate-500 mb-2 block">Correct Numerical Range</Label>
                                                                <div className="flex gap-4">
                                                                    <div><Label className="text-xs">Min</Label><Input type="number" step="any" value={(q.correctAnswer as any)?.min || ''} onChange={(e) => { const val = parseFloat(e.target.value); const current = (q.correctAnswer as any) || { min: 0, max: 0 }; updateQuestion(index, 'correctAnswer', { ...current, min: isNaN(val) ? 0 : val }); }} /></div>
                                                                    <div><Label className="text-xs">Max</Label><Input type="number" step="any" value={(q.correctAnswer as any)?.max || ''} onChange={(e) => { const val = parseFloat(e.target.value); const current = (q.correctAnswer as any) || { min: 0, max: 0 }; updateQuestion(index, 'correctAnswer', { ...current, max: isNaN(val) ? 0 : val }); }} /></div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {Object.keys(q.options).sort().map(optKey => {
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
                                                                        <div key={optKey} className="flex gap-2 items-start relative group/option">
                                                                            {q.type === 'multiple' && <div onClick={handleSelect} className="mt-2 cursor-pointer">{isSelected ? <CheckSquare className="w-6 h-6 text-primary" /> : <Square className="w-6 h-6 text-slate-400" />}</div>}
                                                                            <div onClick={handleSelect} className={`mt-1 w-8 h-8 flex items-center justify-center border font-bold cursor-pointer transition-all ${isSelected ? 'bg-green-100 border-green-500 text-green-700' : 'bg-slate-50 hover:bg-slate-100'} ${q.type === 'multiple' ? 'rounded-md' : 'rounded-full'}`}>{optKey}</div>
                                                                            <div className="flex-1 flex flex-col">
                                                                                <div className="relative">
                                                                                    <IMEInput as="textarea" typingMode={q.typingMode} placeholder={`Option ${optKey}`} value={q.options[optKey]} onChange={(val: string) => updateOption(index, optKey, val)} className="min-h-[60px] resize-y pr-8" />
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="absolute top-1 right-1 h-6 w-6 text-slate-400 hover:text-red-500 opacity-0 group-hover/option:opacity-100 transition-opacity"
                                                                                        onClick={() => handleRemoveOption(index, optKey)}
                                                                                        title="Remove Option"
                                                                                    >
                                                                                        <X className="w-3.5 h-3.5" />
                                                                                    </Button>
                                                                                </div>
                                                                                {q.optionImages?.[optKey] ? (
                                                                                    <div className="relative group mt-1 w-fit">
                                                                                        <img src={q.optionImages[optKey]} alt={`Option ${optKey}`} className="h-20 w-auto object-contain border rounded bg-white" />
                                                                                        <button
                                                                                            onClick={() => { const nq = [...questions]; if (nq[index].optionImages) delete nq[index].optionImages![optKey]; setQuestions(nq); }}
                                                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                        >
                                                                                            <X className="w-3 h-3" />
                                                                                        </button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="flex items-center border border-t-0 border-input rounded-b-md bg-slate-50/50 overflow-hidden h-7 mt-1">
                                                                                        <Input placeholder="Image URL" value="" onChange={(e) => { const nq = [...questions]; if (!nq[index].optionImages) nq[index].optionImages = {}; nq[index].optionImages![optKey] = processImageUrl(e.target.value); setQuestions(nq); }} className="flex-1 border-none bg-transparent h-full text-[10px] px-2 shadow-none focus-visible:ring-0" />
                                                                                        <label className="cursor-pointer h-full border-l border-input flex items-center px-2 bg-slate-100 hover:bg-slate-200 text-[10px] whitespace-nowrap"><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, (base64) => { const nq = [...questions]; if (!nq[index].optionImages) nq[index].optionImages = {}; nq[index].optionImages![optKey] = base64; setQuestions(nq); })} /><Upload className="w-3 h-3 mr-1" />Upload</label>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                                <Button variant="outline" size="sm" className="h-full min-h-[60px] border-dashed text-muted-foreground hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/30 transition-colors" onClick={() => handleAddOption(index)}>
                                                                    <Plus className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        {
                                            isEndOfGroup && (
                                                <div className="flex justify-center -mt-2 pb-6 pt-2 bg-blue-50/20 border-x border-b border-blue-200 rounded-b-lg mb-4">
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => handleAddSubQuestion(index)}
                                                        className="gap-2 bg-white text-blue-600 hover:bg-blue-50 border border-blue-200 shadow-sm"
                                                    >
                                                        <Plus className="w-4 h-4" /> Add Question to Passage
                                                    </Button>
                                                </div>
                                            )
                                        }
                                    </div>
                                );
                            })}
                            <Button onClick={handleAddQuestion} size="sm" variant="outline" className="w-full"><Plus className="w-4 h-4 mr-2" /> Add Question</Button>
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
            </div>
        </div >
    );
}
