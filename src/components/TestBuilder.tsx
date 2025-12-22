import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Question, createTest, fetchTestById, updateTest } from '@/lib/testsApi';
import { toast } from 'sonner';
import { Plus, Trash2, Save, ArrowLeft, Loader2, Upload, CheckSquare, Square, Languages, X, Check, ChevronsUpDown, GripVertical } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { IMEInput } from '@/components/ui/IMEInput';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
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
    options: { [key: string]: string };
    correctAnswer: any;
    typingMode: 'en' | 'hi';
}

const DEFAULT_QUESTION: QuestionState = {
    id: 1,
    type: 'single',
    question: '',
    options: { A: '', B: '', C: '', D: '' },
    correctAnswer: '',
    typingMode: 'en'
};

interface TestBuilderProps {
    initialData?: any;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function TestBuilder({ initialData, onSuccess, onCancel }: TestBuilderProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Fallback to URL params if no initialData provided (for direct route access)
    const { id: paramId } = useParams();
    const testId = initialData?.id || paramId;
    const isEditMode = !!testId;

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

    // Section State
    const [sections, setSections] = useState<any[]>([]);
    const [selectedSections, setSelectedSections] = useState<string[]>([]);
    const [openSectionCombobox, setOpenSectionCombobox] = useState(false);

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

    // Load Existing Test Data
    useEffect(() => {
        // If initialData is provided directly, populate from it
        if (initialData) {
            populateData(initialData);
            // We also need to fetch sections for this test if not in initialData
            fetchAndSetSections(initialData.id);
            return;
        }

        // Otherwise fetch from ID
        if (isEditMode && testId && user) {
            setLoading(true);
            fetchTestById(testId).then(async ({ data, error }) => {
                if (data) {
                    if (data.created_by !== user.id) {
                        toast.error("You can only edit your own tests");
                        navigate('/my-tests');
                        return;
                    }
                    populateData(data);
                    await fetchAndSetSections(data.id);
                } else {
                    toast.error("Test not found");
                }
                setLoading(false);
            });
        }
    }, [testId, isEditMode, user, navigate, initialData]);

    const fetchAndSetSections = async (tid: string) => {
        const { fetchTestSections } = await import('@/lib/sectionsApi');
        const { data: sectionData } = await fetchTestSections(tid);
        if (sectionData) {
            setSelectedSections(sectionData);
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

        const mappedQuestions = (data.questions as any[]).map((q: any) => ({
            ...q,
            options: q.options || { A: '', B: '', C: '', D: '' },
            typingMode: 'en'
        }));
        setQuestions(mappedQuestions);
    };

    const handleAddQuestion = () => {
        setQuestions([
            ...questions,
            {
                ...DEFAULT_QUESTION,
                id: questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1,
                options: { ...DEFAULT_QUESTION.options },
                typingMode: lastTypingMode
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
        const driveRegex = /drive\.google\.com\/file\/d\/([-_\w]+)/;
        const match = url.match(driveRegex);
        if (match && match[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        const openRegex = /drive\.google\.com\/open\?id=([-_\w]+)/;
        const openMatch = url.match(openRegex);
        if (openMatch && openMatch[1]) return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
        return url;
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

    const handleSave = async () => {
        if (!user) {
            toast.error("You must be logged in.");
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

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const hasQuestionContent = q.question.trim() || q.image;
            if (!hasQuestionContent) {
                toast.error(`Question ${i + 1} must have either text or an image`);
                return;
            }
            if (q.type === 'numerical') {
                if (!q.correctAnswer || typeof q.correctAnswer !== 'object' || q.correctAnswer.min === undefined || q.correctAnswer.max === undefined) {
                    toast.error(`Question ${i + 1} (Numerical) must have a Min and Max value`);
                    return;
                }
                if (Number(q.correctAnswer.min) > Number(q.correctAnswer.max)) {
                    toast.error(`Question ${i + 1}: Min cannot be greater than Max`);
                    return;
                }
            } else {
                for (const opt of ['A', 'B', 'C', 'D']) {
                    const hasOptionContent = q.options[opt].trim() || (q.optionImages && q.optionImages[opt]);
                    if (!hasOptionContent) {
                        toast.error(`Option ${opt} for Question ${i + 1} is required`);
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
            const sanitizedQuestions = questions.map(q => ({
                ...q,
                image: q.image ? q.image.trim() : q.image,
                optionImages: q.optionImages ? Object.fromEntries(
                    Object.entries(q.optionImages).map(([k, v]) => [k, v ? v.trim() : v])
                ) : undefined
            }));

            const testDataPayload = {
                title,
                description,
                revision_notes: revisionNotes,
                duration: time,
                marks_per_question: marks,
                negative_marks: negativeMarks,
                is_public: isPublic,
                questions: sanitizedQuestions.map((q: any) => {
                    const { typingMode, ...rest } = q;
                    return rest;
                }),
                institution_name: institutionName,
                institution_logo: institutionLogo,
            };

            if (isEditMode && testId) {
                const { error } = await updateTest(testId, testDataPayload);
                if (error) throw error;
                const { assignSectionsToTest } = await import('@/lib/sectionsApi');
                await assignSectionsToTest(testId, selectedSections);
                toast.success("Test updated successfully!");
                if (onSuccess) onSuccess();
                else navigate('/my-tests');
            } else {
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
                if (selectedSections.length > 0) {
                    const { assignSectionsToTest } = await import('@/lib/sectionsApi');
                    await assignSectionsToTest(data.id, selectedSections);
                }
                toast.success("Test created successfully!");
                if (onSuccess) onSuccess();
                else navigate('/my-tests');
            }
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
            </div>

            <div className="grid gap-6">
                <Card>
                    <div className="flex items-center justify-center gap-6 p-6 pb-0">
                        <div className="relative group shrink-0">
                            {institutionLogo && (
                                <button
                                    onClick={(e) => { e.preventDefault(); setInstitutionLogo(''); }}
                                    className="absolute -top-2 -right-2 z-20 bg-destructive text-white rounded-full p-1 shadow-md hover:bg-destructive/90"
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
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f, setInstitutionLogo); }} />
                                <div className={`w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all relative overflow-hidden ${isDragging ? 'border-primary bg-primary/10' : institutionLogo ? 'border-primary/50' : 'border-slate-300'}`}>
                                    {institutionLogo ? <img src={institutionLogo} alt="Logo" className="w-full h-full object-contain" /> : <Upload className="w-5 h-5 text-slate-400" />}
                                </div>
                            </label>
                        </div>
                        <div className="w-full max-w-lg">
                            <Input value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} placeholder="Add Your Institution Name" className="text-xl font-bold border-none shadow-none focus-visible:ring-0 placeholder:text-slate-300 px-0" />
                            <div className="h-[1px] bg-gradient-to-r from-slate-200 to-transparent w-full" />
                        </div>
                    </div>

                    <CardHeader><CardTitle className="text-lg">Test Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Test Title</Label>
                            <Input placeholder="Enter test title..." value={title} onChange={e => setTitle(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Sections</Label>
                            <Popover open={openSectionCombobox} onOpenChange={setOpenSectionCombobox}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="w-full justify-between">
                                        {selectedSections.length > 0 ? `${selectedSections.length} selected` : "Select sections..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search section..." />
                                        <CommandList>
                                            <CommandEmpty>No section found.</CommandEmpty>
                                            <CommandGroup>
                                                {sections.map((section) => (
                                                    <CommandItem key={section.id} value={section.name} onSelect={() => setSelectedSections(prev => prev.includes(section.id) ? prev.filter(id => id !== section.id) : [...prev, section.id])}>
                                                        <Check className={cn("mr-2 h-4 w-4", selectedSections.includes(section.id) ? "opacity-100" : "opacity-0")} />
                                                        {section.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {selectedSections.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {selectedSections.map(sid => {
                                        const sec = sections.find(s => s.id === sid);
                                        return <Badge key={sid} variant="secondary">{sec?.name}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setSelectedSections(p => p.filter(id => id !== sid))} /></Badge>;
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label>Description (Short)</Label>
                            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of the test" />
                        </div>

                        <div className="grid gap-2">
                            <Label>Test Summary & Instructions (Rich Text)</Label>
                            <MarkdownEditor
                                value={revisionNotes}
                                onChange={setRevisionNotes}
                                placeholder="Add detailed instructions, syllabus, or summary here. Supports Markdown formatting."
                            />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><Label>Time (mins)</Label><Input type="number" value={time} onChange={e => setTime(parseInt(e.target.value))} /></div>
                            <div><Label>Marks/Q</Label><Input type="number" value={marks} onChange={e => setMarks(parseInt(e.target.value))} /></div>
                            <div><Label>Negative</Label><Input type="number" step="0.25" value={negativeMarks} onChange={e => setNegativeMarks(parseFloat(e.target.value))} /></div>
                            <div><Label>Visibility</Label><div className="flex items-center space-x-2 h-10"><Switch checked={isPublic} onCheckedChange={setIsPublic} /><Label>{isPublic ? 'Public' : 'Private'}</Label></div></div>
                        </div>
                    </CardContent>
                </Card>

                {/* Question List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Questions ({questions.length})</h2>
                    {questions.map((q, index) => (
                        <Card key={index} className={`relative transition-all ${isDragging ? 'border-dashed border-primary/50' : ''}`} draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={handleDragOver} onDrop={(e) => { e.stopPropagation(); handleDropQuestion(e, index); }}>
                            <div className="absolute left-2 top-2 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"><GripVertical className="h-5 w-5" /></div>
                            <div className="absolute right-0 top-0"><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => handleRemoveQuestion(index)} disabled={questions.length === 1}><Trash2 className="w-4 h-4" /></Button></div>
                            <CardContent className="pt-10 space-y-4">
                                <div className="flex gap-2">
                                    <span className="font-bold text-lg text-muted-foreground">Q{index + 1}.</span>
                                    <div className="flex-1 space-y-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <Select value={q.type || 'single'} onValueChange={(val: any) => { const newQ = { ...q, type: val }; if (val === 'single') newQ.correctAnswer = ''; if (val === 'multiple') newQ.correctAnswer = []; if (val === 'numerical') newQ.correctAnswer = { min: 0, max: 0 }; const nq = [...questions]; nq[index] = newQ; setQuestions(nq); }}>
                                                <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                                                <SelectContent><SelectItem value="single">Single Choice</SelectItem><SelectItem value="multiple">Multiple Choice</SelectItem><SelectItem value="numerical">Numerical</SelectItem></SelectContent>
                                            </Select>
                                            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 rounded-md p-1">
                                                <Languages className="w-3.5 h-3.5 ml-1" />
                                                <Select value={q.typingMode} onValueChange={(val: any) => toggleQuestionLanguage(index, val)}>
                                                    <SelectTrigger className="h-7 text-xs w-[90px] border-none bg-white shadow-sm"><SelectValue /></SelectTrigger>
                                                    <SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="hi">Hindi</SelectItem></SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <IMEInput typingMode={q.typingMode} placeholder="Type question..." value={q.question} onChange={(val: string) => updateQuestion(index, 'question', val)} className="min-h-[80px]" />

                                        {/* Image Upload for Question */}
                                        <div className="flex items-center border border-t-0 border-input rounded-b-md bg-slate-50/50 overflow-hidden h-8">
                                            <Input placeholder="Paste Image URL" value={q.image || ''} onChange={(e) => updateQuestion(index, 'image', processImageUrl(e.target.value))} className="flex-1 border-none shadow-none focus-visible:ring-0 h-full text-xs bg-transparent px-3 rounded-none" />
                                            <label className="cursor-pointer h-full border-l border-input">
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (base64) => updateQuestion(index, 'image', base64))} />
                                                <div className="flex items-center justify-center h-full px-3 bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-medium text-slate-700 w-[120px]"><Upload className="w-3 h-3 mr-2" />Upload</div>
                                            </label>
                                        </div>
                                        {q.image && <img src={q.image} alt="Preview" className="h-24 w-auto object-contain border rounded bg-white shadow-sm mt-2" />}

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
                                                {['A', 'B', 'C', 'D'].map(optKey => {
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
                                                        <div key={optKey} className="flex gap-2 items-start">
                                                            {q.type === 'multiple' && <div onClick={handleSelect} className="mt-2 cursor-pointer">{isSelected ? <CheckSquare className="w-6 h-6 text-primary" /> : <Square className="w-6 h-6 text-slate-400" />}</div>}
                                                            <div onClick={handleSelect} className={`mt-1 w-8 h-8 flex items-center justify-center border font-bold cursor-pointer transition-all ${isSelected ? 'bg-green-100 border-green-500 text-green-700' : 'bg-slate-50 hover:bg-slate-100'} ${q.type === 'multiple' ? 'rounded-md' : 'rounded-full'}`}>{optKey}</div>
                                                            <div className="flex-1 flex flex-col">
                                                                <IMEInput typingMode={q.typingMode} placeholder={`Option ${optKey}`} value={q.options[optKey]} onChange={(val: string) => updateOption(index, optKey, val)} className="h-9" />
                                                                <div className="flex items-center border border-t-0 border-input rounded-b-md bg-slate-50/50 overflow-hidden h-7">
                                                                    <Input placeholder="Image URL" value={q.optionImages?.[optKey] || ''} onChange={(e) => { const nq = [...questions]; if (!nq[index].optionImages) nq[index].optionImages = {}; nq[index].optionImages![optKey] = processImageUrl(e.target.value); setQuestions(nq); }} className="flex-1 border-none bg-transparent h-full text-[10px] px-2" />
                                                                    <label className="cursor-pointer h-full border-l border-input flex items-center px-2 bg-slate-100 hover:bg-slate-200 text-[10px]"><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, (base64) => { const nq = [...questions]; if (!nq[index].optionImages) nq[index].optionImages = {}; nq[index].optionImages![optKey] = base64; setQuestions(nq); })} /><Upload className="w-3 h-3 mr-1" />Upload</label>
                                                                </div>
                                                                {q.optionImages?.[optKey] && <img src={q.optionImages[optKey]} className="h-16 w-auto object-contain border rounded mt-1 bg-white" />}
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
                    <Button onClick={handleAddQuestion} size="sm" variant="outline" className="w-full"><Plus className="w-4 h-4 mr-2" /> Add Question</Button>
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
        </div>
    );
}
