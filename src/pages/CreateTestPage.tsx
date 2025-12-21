import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Question, createTest } from '@/lib/testsApi';
import { toast } from 'sonner';
import { Plus, Trash2, Save, ArrowLeft, Loader2, Upload, CheckSquare, Square, Languages, X, Check, ChevronsUpDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { IMEInput } from '@/components/ui/IMEInput';
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
import { fetchSections } from '@/lib/sectionsApi';

interface QuestionState extends Omit<Question, 'correctAnswer' | 'options'> {
    options: { [key: string]: string }; // Keep options required in state for easy switching
    correctAnswer: any; // Allow dynamic type in state
    typingMode: 'en' | 'hi';
}

const DEFAULT_QUESTION: QuestionState = {
    id: 1,
    type: 'single',
    question: '',
    options: {
        A: '',
        B: '',
        C: '',
        D: ''
    },
    correctAnswer: '',
    typingMode: 'en'
};

export default function CreateTestPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);

    // Test Metadata State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [institutionName, setInstitutionName] = useState('');
    const [institutionLogo, setInstitutionLogo] = useState('');
    const [time, setTime] = useState<number>(30);
    const [marks, setMarks] = useState<number>(4);
    const [negativeMarks, setNegativeMarks] = useState<number>(1);
    const [isPublic, setIsPublic] = useState(true);

    // Section State
    const [sections, setSections] = useState<any[]>([]);
    const [selectedSections, setSelectedSections] = useState<string[]>([]);
    const [openSectionCombobox, setOpenSectionCombobox] = useState(false);
    const [selectedSection, setSelectedSection] = useState<string>("none"); // Remove this later if unused, but user code might still reference it in other parts? No, I replaced usage. Safest to remove if I'm sure. I'll remove it.

    // Questions State
    const [questions, setQuestions] = useState<QuestionState[]>([DEFAULT_QUESTION]);
    const [lastTypingMode, setLastTypingMode] = useState<'en' | 'hi'>('en');
    const [isDragging, setIsDragging] = useState(false);

    // Load Sections
    useEffect(() => {
        fetchSections().then(({ data }) => {
            if (data) setSections(data);
        });
    }, []);

    const handleAddQuestion = () => {
        setQuestions([
            ...questions,
            {
                ...DEFAULT_QUESTION,
                id: questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1,
                options: { ...DEFAULT_QUESTION.options },
                typingMode: lastTypingMode // Auto-carry logic
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

    const updateOption = (qIndex: number, optKey: string, value: string) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options = { ...newQuestions[qIndex].options, [optKey]: value };
        setQuestions(newQuestions);
    };

    const processImageUrl = (url: string) => {
        if (!url) return url;

        // Handle Google Drive File Links (convert view link to direct image link)
        const driveRegex = /drive\.google\.com\/file\/d\/([-_\w]+)/;
        const match = url.match(driveRegex);
        if (match && match[1]) {
            return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }

        // Handle Google Drive Open Links
        const openRegex = /drive\.google\.com\/open\?id=([-_\w]+)/;
        const openMatch = url.match(openRegex);
        if (openMatch && openMatch[1]) {
            return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
        }

        return url;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 50 * 1024) { // 50KB limit
            toast.error("Image size must be less than 50KB");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            callback(base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!user) {
            toast.error("You must be logged in to create a test.");
            navigate('/login', { state: { from: location } });
            return;
        }

        if (!title.trim()) {
            toast.error("Test Title is required");
            return;
        }

        if (questions.length === 0) {
            toast.error("At least one question is required");
            return;
        }

        // Validate Questions
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const hasQuestionContent = q.question.trim() || q.image;
            if (!hasQuestionContent) {
                toast.error(`Question ${i + 1} must have either text or an image`);
                return;
            }

            if (q.type === 'numerical') {
                if (!q.correctAnswer || typeof q.correctAnswer !== 'object' ||
                    q.correctAnswer.min === undefined || q.correctAnswer.max === undefined) {
                    toast.error(`Question ${i + 1} (Numerical) must have a Min and Max value`);
                    return;
                }
                if (Number(q.correctAnswer.min) > Number(q.correctAnswer.max)) {
                    toast.error(`Question ${i + 1}: Min value cannot be greater than Max value`);
                    return;
                }
            } else {
                // Single or Multiple Choice
                // Check options
                const options = ['A', 'B', 'C', 'D'];
                for (const opt of options) {
                    const hasOptionContent = q.options[opt].trim() || (q.optionImages && q.optionImages[opt]);
                    if (!hasOptionContent) {
                        toast.error(`Option ${opt} for Question ${i + 1} is required (Text or Image)`);
                        return;
                    }
                }

                if (!q.correctAnswer || (Array.isArray(q.correctAnswer) && q.correctAnswer.length === 0)) {
                    toast.error(`Please select a correct answer for Question ${i + 1}`);
                    return;
                }
            }
        }

        setLoading(true);
        try {
            // Generate Custom ID
            const { getNextTestId } = await import('@/lib/testsApi');
            const customId = await getNextTestId('M');

            // Sanitize Questions (Trim URLs)
            const sanitizedQuestions = questions.map(q => ({
                ...q,
                image: q.image ? q.image.trim() : q.image,
                optionImages: q.optionImages ? Object.fromEntries(
                    Object.entries(q.optionImages).map(([k, v]) => [k, v ? v.trim() : v])
                ) : undefined
            }));

            const newTest = {
                title,
                description,
                duration: time,
                marks_per_question: marks,
                negative_marks: negativeMarks,
                is_public: isPublic,
                questions: sanitizedQuestions.map((q: any) => {
                    // Remove typingMode before saving
                    const { typingMode, ...rest } = q;
                    return rest;
                }),
                created_by: user.id,
                custom_id: customId,
                creator_name: user.user_metadata?.full_name || 'Anonymous',
                creator_avatar: user.user_metadata?.avatar_url || '',
                institution_name: institutionName,
                institution_logo: institutionLogo,
                created_at: new Date().toISOString()
            };

            const { data, error } = await createTest(newTest);

            if (error) throw error;

            // Assign Sections if selected
            if (selectedSections.length > 0) {
                const { assignSectionsToTest } = await import('@/lib/sectionsApi');
                await assignSectionsToTest(data.id, selectedSections);
            }

            toast.success("Test created successfully!");
            navigate('/my-tests');
        } catch (error: any) {
            console.error("Error creating test:", error);
            toast.error("Failed to create test: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleQuestionLanguage = (index: number, mode: 'en' | 'hi') => {
        const newQuestions = [...questions];
        newQuestions[index].typingMode = mode;
        setQuestions(newQuestions);
        setLastTypingMode(mode); // Update for auto-carry
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file, setInstitutionLogo);
        }
    };

    const processFile = (file: File, callback: (base64: string) => void) => {
        if (file.size > 200 * 1024) { // Increased to 200KB for logos
            toast.error("Image size must be less than 200KB");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            callback(base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setInstitutionLogo('');
    };

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <div className="mb-6 flex items-center justify-center">
                <h1 className="text-3xl font-bold">Create New Test</h1>
            </div>

            <div className="grid gap-6">
                {/* Branding Section */}
                {/* Branding Section */}
                {/* Test Details Card */}
                <Card>
                    <div className="flex items-center justify-center gap-6 p-6 pb-0">
                        {/* Logo Upload */}
                        <div className="relative group shrink-0">
                            {institutionLogo && (
                                <button
                                    onClick={handleRemoveLogo}
                                    className="absolute -top-2 -right-2 z-20 bg-destructive text-white rounded-full p-1 shadow-md hover:bg-destructive/90 transition-colors"
                                    title="Remove Logo"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                            <label
                                className="cursor-pointer block"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) processFile(file, setInstitutionLogo);
                                    }}
                                />
                                <div className={`w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all relative overflow-hidden
                                    ${isDragging
                                        ? 'border-primary bg-primary/10 scale-105'
                                        : institutionLogo ? 'border-primary/50 bg-primary/5' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}
                                `}>
                                    {institutionLogo ? (
                                        <img src={institutionLogo} alt="Logo" className="w-full h-full object-contain p-1 rounded-lg" />
                                    ) : (
                                        <Upload className={`w-5 h-5 ${isDragging ? 'text-primary' : 'text-slate-400'}`} />
                                    )}

                                    {/* Hover overlay for replace (only when not dragging) */}
                                    {institutionLogo && !isDragging && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white text-[8px] font-medium">Edit</span>
                                        </div>
                                    )}
                                </div>
                            </label>
                        </div>

                        {/* Institution Name */}
                        <div className="w-full max-w-lg">
                            <Input
                                value={institutionName}
                                onChange={(e) => setInstitutionName(e.target.value)}
                                placeholder="Add Your Institution Name"
                                className="text-left text-xl md:text-2xl font-bold border-none shadow-none focus-visible:ring-0 placeholder:text-slate-300 h-auto py-1 bg-transparent px-0"
                            />
                            <div className="h-[1px] bg-gradient-to-r from-slate-200 to-transparent w-full" />
                        </div>
                    </div>

                    <CardHeader>
                        <CardTitle className="text-lg">Test Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">


                        <div className="grid gap-2">
                            <Label htmlFor="title">Test Title</Label>
                            <Input placeholder="Enter test title..." value={title} onChange={e => setTitle(e.target.value)} />
                        </div>

                        <div className="grid gap-2">
                            <Label>Sections</Label>
                            <Popover open={openSectionCombobox} onOpenChange={setOpenSectionCombobox}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openSectionCombobox}
                                        className="w-full justify-between"
                                    >
                                        {selectedSections.length > 0
                                            ? `${selectedSections.length} selected`
                                            : "Select sections..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search section..." />
                                        <CommandList>
                                            <CommandEmpty>No section found.</CommandEmpty>
                                            <CommandGroup>
                                                {sections.map((section) => (
                                                    <CommandItem
                                                        key={section.id}
                                                        value={section.name}
                                                        onSelect={() => {
                                                            setSelectedSections(prev =>
                                                                prev.includes(section.id)
                                                                    ? prev.filter(id => id !== section.id)
                                                                    : [...prev, section.id]
                                                            );
                                                            // Keep open for multiple selection
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedSections.includes(section.id) ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {section.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>

                            {/* Selected Tags */}
                            {selectedSections.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {selectedSections.map(sectionId => {
                                        const sec = sections.find(s => s.id === sectionId);
                                        return (
                                            <Badge key={sectionId} variant="secondary" className="pl-2 pr-1 h-7">
                                                {sec?.name}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 ml-1 hover:bg-transparent text-muted-foreground hover:text-foreground"
                                                    onClick={() => setSelectedSections(prev => prev.filter(id => id !== sectionId))}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </Badge>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea placeholder="What is this test about?" value={description} onChange={e => setDescription(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="grid gap-2">
                                <Label>Time (mins)</Label>
                                <Input type="number" value={time} onChange={e => setTime(parseInt(e.target.value))} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Marks/Q</Label>
                                <Input type="number" value={marks} onChange={e => setMarks(parseInt(e.target.value))} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Negative Marks</Label>
                                <Input type="number" value={negativeMarks} onChange={e => setNegativeMarks(parseInt(e.target.value))} step="0.25" />
                            </div>
                            <div className="grid gap-2 col-span-1">
                                <Label>Visibility</Label>
                                <div className="flex items-center space-x-2 h-10">
                                    <Switch id="public-mode" checked={isPublic} onCheckedChange={setIsPublic} />
                                    <Label htmlFor="public-mode">{isPublic ? 'Public' : 'Private'}</Label>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Questions Builder */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Questions ({questions.length})</h2>
                    </div>

                    {questions.map((q, index) => (
                        <Card key={index} className="relative">
                            <div className="absolute right-0 top-0">
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveQuestion(index)} disabled={questions.length === 1}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                            <CardContent className="pt-10 space-y-4">
                                <div className="flex gap-2">
                                    <span className="font-bold text-lg text-muted-foreground">Q{index + 1}.</span>
                                    <div className="flex-1 space-y-4">
                                        <div className="flex flex-col">
                                            {/* Type Selector & Language Selector */}
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Select
                                                        value={q.type || 'single'}
                                                        onValueChange={(val: 'single' | 'multiple' | 'numerical') => {
                                                            const newQ = { ...q, type: val };
                                                            // Reset answer when type changes
                                                            if (val === 'single') newQ.correctAnswer = '';
                                                            if (val === 'multiple') newQ.correctAnswer = [];
                                                            if (val === 'numerical') newQ.correctAnswer = { min: 0, max: 0 };

                                                            const newQuestions = [...questions];
                                                            newQuestions[index] = newQ;
                                                            setQuestions(newQuestions);
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-8 w-[140px] text-xs">
                                                            <SelectValue placeholder="Type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="single">Single Choice</SelectItem>
                                                            <SelectItem value="multiple">Multiple Choice</SelectItem>
                                                            <SelectItem value="numerical">Numerical</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 rounded-md p-1">
                                                    <div className="flex items-center px-1 text-xs font-medium text-slate-500">
                                                        <Languages className="w-3.5 h-3.5 mr-0" /></div>
                                                    <Select
                                                        value={q.typingMode}
                                                        onValueChange={(val: 'en' | 'hi') => toggleQuestionLanguage(index, val)}
                                                    >
                                                        <SelectTrigger className="h-7 text-xs w-[90px] border-none bg-white shadow-sm">
                                                            <SelectValue />
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
                                                typingMode={q.typingMode}
                                                placeholder="Type your question here..."
                                                value={q.question}
                                                onChange={(val: string) => updateQuestion(index, 'question', val)}
                                                className="min-h-[80px] rounded-b-none border-b-0 resize-y focus-visible:ring-0 focus-visible:border-slate-400 z-10 relative"
                                            />
                                            <div className="flex items-center border border-t-0 border-input rounded-b-md bg-slate-50/50 overflow-hidden h-8">
                                                <Input
                                                    placeholder="Paste Image URL"
                                                    value={q.image || ''}
                                                    onChange={(e) => updateQuestion(index, 'image', processImageUrl(e.target.value))}
                                                    className="flex-1 border-none shadow-none focus-visible:ring-0 h-full text-xs bg-transparent px-3 rounded-none"
                                                />
                                                <label className="cursor-pointer h-full border-l border-input">
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={(e) => handleFileUpload(e, (base64) => updateQuestion(index, 'image', base64))}
                                                    />
                                                    <div className="flex items-center justify-center h-full px-3 bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-medium text-slate-700 w-[120px]">
                                                        <Upload className="w-3 h-3 mr-2" />
                                                        Upload Image
                                                    </div>
                                                </label>
                                            </div>

                                            {q.image && (
                                                <div className="mt-2 relative group w-fit">
                                                    <img
                                                        src={q.image}
                                                        alt="Question Preview"
                                                        className="h-24 w-auto object-contain border rounded bg-white shadow-sm"
                                                        referrerPolicy="no-referrer"
                                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x200?text=Invalid+Image+URL'; }}
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs rounded pointer-events-none">
                                                        Preview
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Answer Section */}
                                        {q.type === 'numerical' ? (
                                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                                <Label className="text-xs font-semibold uppercase text-slate-500 mb-2 block">Correct Numerical Range</Label>
                                                <div className="flex items-center gap-4">
                                                    <div className="grid gap-1.5 flex-1">
                                                        <Label className="text-xs">Min Value</Label>
                                                        <Input
                                                            type="number"
                                                            step="any"
                                                            placeholder="e.g. 1.5"
                                                            value={(q.correctAnswer as any)?.min || ''}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                const current = (q.correctAnswer as any) || { min: 0, max: 0 };
                                                                updateQuestion(index, 'correctAnswer', { ...current, min: isNaN(val) ? 0 : val });
                                                            }}
                                                            className={Number((q.correctAnswer as any)?.min) > Number((q.correctAnswer as any)?.max) ? "border-red-500 bg-red-50" : ""}
                                                        />
                                                    </div>
                                                    <div className="grid gap-1.5 flex-1">
                                                        <Label className="text-xs">Max Value</Label>
                                                        <Input
                                                            type="number"
                                                            step="any"
                                                            placeholder="e.g. 1.6"
                                                            value={(q.correctAnswer as any)?.max || ''}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                const current = (q.correctAnswer as any) || { min: 0, max: 0 };
                                                                updateQuestion(index, 'correctAnswer', { ...current, max: isNaN(val) ? 0 : val });
                                                            }}
                                                            className={Number((q.correctAnswer as any)?.max) < Number((q.correctAnswer as any)?.min) ? "border-red-500 bg-red-50" : ""}
                                                        />
                                                    </div>
                                                </div>
                                                {Number((q.correctAnswer as any)?.min) > Number((q.correctAnswer as any)?.max) && (
                                                    <p className="text-[10px] text-red-600 font-medium mt-2 flex items-center">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1.5" />
                                                        Min value cannot be greater than Max value
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-muted-foreground mt-2">
                                                    Students will be marked correct if their answer is between Min and Max (inclusive). For exact answers, set Min and Max to the same value.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {['A', 'B', 'C', 'D'].map((optKey) => {
                                                    const isSelected = q.type === 'multiple'
                                                        ? Array.isArray(q.correctAnswer) && q.correctAnswer.includes(optKey)
                                                        : q.correctAnswer === optKey;

                                                    const handleSelect = () => {
                                                        if (q.type === 'multiple') {
                                                            // Toggle selection for multiple choice
                                                            const current = Array.isArray(q.correctAnswer) ? [...q.correctAnswer] : [];
                                                            const idx = current.indexOf(optKey);
                                                            if (idx > -1) current.splice(idx, 1);
                                                            else current.push(optKey);
                                                            updateQuestion(index, 'correctAnswer', current.sort());
                                                        } else {
                                                            // Single choice
                                                            updateQuestion(index, 'correctAnswer', optKey);
                                                        }
                                                    };

                                                    return (
                                                        <div key={optKey} className="flex gap-2 items-start">
                                                            {/* Checkbox for Multiple Choice */}
                                                            {q.type === 'multiple' && (
                                                                <div
                                                                    onClick={handleSelect}
                                                                    className="mt-2 cursor-pointer text-slate-400 hover:text-primary transition-colors"
                                                                >
                                                                    {isSelected
                                                                        ? <CheckSquare className="w-6 h-6 text-primary" />
                                                                        : <Square className="w-6 h-6" />}
                                                                </div>
                                                            )}

                                                            <div
                                                                onClick={handleSelect}
                                                                className={`mt-1 flex-shrink-0 w-8 h-8 flex items-center justify-center border font-bold cursor-pointer transition-all 
                                                                ${isSelected
                                                                        ? 'bg-green-100 border-green-500 text-green-700 ring-2 ring-green-500/20'
                                                                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}
                                                                ${q.type === 'multiple' ? 'rounded-md' : 'rounded-full'}
                                                            `}
                                                                title="Click to mark as correct"
                                                            >
                                                                {isSelected && q.type === 'multiple' ? <div className="absolute w-2 h-2 bg-green-500 rounded-sm" /> : null}
                                                                {optKey}
                                                            </div>

                                                            <div className="flex-1 flex flex-col">
                                                                <div className="relative group">
                                                                    <IMEInput
                                                                        typingMode={q.typingMode}
                                                                        placeholder={`Option ${optKey}`}
                                                                        value={q.options[optKey]}
                                                                        onChange={(val: string) => updateOption(index, optKey, val)}
                                                                        className="rounded-b-none border-b-0 h-9 focus-visible:ring-0 focus-visible:border-slate-400 z-10"
                                                                    />
                                                                    <div className="flex items-center border border-t-0 border-input rounded-b-md bg-slate-50/50 overflow-hidden h-7">
                                                                        <Input
                                                                            placeholder="Paste Image URL"
                                                                            value={q.optionImages?.[optKey] || ''}
                                                                            onChange={(e) => {
                                                                                const newQuestions = [...questions];
                                                                                if (!newQuestions[index].optionImages) newQuestions[index].optionImages = {};
                                                                                newQuestions[index].optionImages![optKey] = processImageUrl(e.target.value);
                                                                                setQuestions(newQuestions);
                                                                            }}
                                                                            className="flex-1 border-none shadow-none focus-visible:ring-0 h-full text-[10px] bg-transparent px-2 rounded-none"
                                                                        />
                                                                        <label className="cursor-pointer h-full border-l border-input">
                                                                            <input
                                                                                type="file"
                                                                                className="hidden"
                                                                                accept="image/*"
                                                                                onChange={(e) => handleFileUpload(e, (base64) => {
                                                                                    const newQuestions = [...questions];
                                                                                    if (!newQuestions[index].optionImages) newQuestions[index].optionImages = {};
                                                                                    newQuestions[index].optionImages![optKey] = base64;
                                                                                    setQuestions(newQuestions);
                                                                                })}
                                                                            />
                                                                            <div className="flex items-center justify-center h-full px-2 bg-slate-100 hover:bg-slate-200 transition-colors text-[10px] font-medium text-slate-700 w-[100px]">
                                                                                <Upload className="w-3 h-3 mr-1" />
                                                                                Upload Image
                                                                            </div>
                                                                        </label>
                                                                    </div>
                                                                </div>

                                                                {q.optionImages?.[optKey] && (
                                                                    <div className="mt-1 relative w-fit">
                                                                        <img
                                                                            src={q.optionImages[optKey]}
                                                                            alt={`Option ${optKey} Preview`}
                                                                            className="h-16 w-auto object-contain border rounded bg-white shadow-sm"
                                                                            referrerPolicy="no-referrer"
                                                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=Invalid+URL'; }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <Button onClick={handleAddQuestion} size="sm" variant="outline" className="w-full md:w-auto">
                        <Plus className="w-4 h-4 mr-2" /> Add Question
                    </Button>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-4 pb-20">
                    <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading} size="lg" className="min-w-[150px]">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Test
                    </Button>
                </div>
            </div>
        </div>
    );
}
