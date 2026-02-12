import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { IMEInput } from '@/components/ui/IMEInput';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { GripVertical, X, Image as ImageIcon, Plus, Trash2, FileText, Upload, Loader2, type LucideIcon } from 'lucide-react';
import { QuestionState } from './types';
import { toast } from 'sonner';

interface QuestionEditorProps {
    question: QuestionState;
    index: number;
    onChange: (q: QuestionState) => void;
    onDelete: () => void;

    // Grouping / Passage Props
    isInGroup?: boolean;
    isStartOfGroup?: boolean;
    isEndOfGroup?: boolean;
    onPassageChange?: (content: string) => void;
    onAddSubQuestion?: () => void; // Only if IS End Of Group or similar? Or separate button?

    // Drag Props
    isDragging?: boolean;
    dragHandlers?: {
        onDragStart: (e: React.DragEvent) => void;
        onDragOver: (e: React.DragEvent) => void;
        onDrop: (e: React.DragEvent) => void;
    };
}

export function QuestionEditor({
    question,
    index,
    onChange,
    onDelete,
    isInGroup,
    isStartOfGroup,
    isEndOfGroup,
    onPassageChange,
    onAddSubQuestion,
    isDragging,
    dragHandlers
}: QuestionEditorProps) {
    // Local UI State for Image Toggles (replacing global expandedImageInputs)
    const [expandedImageInputs, setExpandedImageInputs] = useState<Record<string, boolean>>({});
    const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({});
    const [qImageUploading, setQImageUploading] = useState(false);

    const toggleImageInput = (key: string) => {
        setExpandedImageInputs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Helper: Process Image URL (Google Drive support)
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

    // Helper: Process File
    const processFile = (file: File, callback: (base64: string) => void) => {
        if (file.size > 200 * 1024) {
            toast.error("Image size must be less than 200KB");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => callback(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
        const file = e.target.files?.[0];
        if (file) processFile(file, callback);
    };

    // Update Helpers
    const updateField = (field: keyof QuestionState, value: any) => {
        onChange({ ...question, [field]: value });
    };

    const handleTypeChange = (type: string) => {
        const newQ = { ...question };
        if (type === 'comprehension') {
            newQ.type = 'single';
            newQ.correctAnswer = '';
            // Generate Group ID if not present
            if (!newQ.groupId) newQ.groupId = Math.random().toString(36).substr(2, 9);
        } else {
            newQ.type = type as any;
            if (type.startsWith('single')) newQ.correctAnswer = '';
            else if (type === 'multiple') newQ.correctAnswer = [];
            else if (type === 'numerical') newQ.correctAnswer = { min: 0, max: 0 };
        }
        onChange(newQ);
    };

    // Option Helpers
    const getNextOptionLabel = (currentOptions: { [key: string]: string }) => {
        const keys = Object.keys(currentOptions).sort();
        if (keys.length === 0) return 'A';
        const lastKey = keys[keys.length - 1];
        return String.fromCharCode(lastKey.charCodeAt(0) + 1);
    };

    const handleAddOption = () => {
        const nextLabel = getNextOptionLabel(question.options);
        const newOptions = { ...question.options, [nextLabel]: '' };
        onChange({ ...question, options: newOptions });
    };

    const handleRemoveOption = (key: string) => {
        const newOptions = { ...question.options };
        delete newOptions[key];

        // Also remove image if exists
        const newOptionImages = question.optionImages ? { ...question.optionImages } : undefined;
        if (newOptionImages && newOptionImages[key]) {
            delete newOptionImages[key];
            onChange({ ...question, options: newOptions, optionImages: newOptionImages });
        } else {
            onChange({ ...question, options: newOptions });
        }
    };

    const updateOptionText = (key: string, val: string) => {
        onChange({
            ...question,
            options: { ...question.options, [key]: val }
        });
    };

    const updateOptionImage = (key: string, val: string | null) => {
        const newOptionImages = { ...(question.optionImages || {}) };
        if (val === null) {
            delete newOptionImages[key];
        } else {
            newOptionImages[key] = val;
        }
        onChange({ ...question, optionImages: newOptionImages });
    };

    // Correct Answer Helpers
    const isCorrect = (key: string) => {
        if (Array.isArray(question.correctAnswer)) {
            return question.correctAnswer.includes(key);
        }
        return question.correctAnswer === key;
    };

    const toggleCorrectAnswer = (key: string) => {
        if (question.type === 'multiple') {
            let current = Array.isArray(question.correctAnswer) ? [...question.correctAnswer] : [];
            if (current.includes(key)) current = current.filter(k => k !== key);
            else current.push(key);
            updateField('correctAnswer', current);
        } else {
            updateField('correctAnswer', key);
        }
    };

    return (
        <div className={isInGroup ? "space-y-0" : "space-y-6"}>
            {/* Passage Header (Start of Group) */}
            {isStartOfGroup && onPassageChange && (
                <div className="rounded-t-xl border border-b-0 border-indigo-200 bg-indigo-50/50 overflow-hidden mt-6">
                    <div className="bg-indigo-100/50 px-6 py-4 border-b border-indigo-200 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-indigo-700 flex items-center gap-2 uppercase tracking-wide">
                            <FileText className="w-4 h-4" /> Comprehension Passage
                        </h3>
                    </div>
                    <div className="p-6">
                        <RichTextEditor
                            value={question.passageContent || ''}
                            onChange={onPassageChange}
                            placeholder="Write or paste the passage text here..."
                            className="min-h-[150px] bg-white border-indigo-100 shadow-sm rounded-lg"
                        />
                    </div>
                </div>
            )}

            <Card
                className={`
                    group relative shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 bg-white
                    ${isInGroup ? 'border-2 border-indigo-200 border-t-0 rounded-none shadow-none bg-indigo-50/5' : 'rounded-none sm:rounded-xl border-x-0 border-y-2 sm:border-2 border-slate-300'}
                    ${isEndOfGroup ? 'rounded-b-none sm:rounded-b-xl border-b mb-6' : ''}
                    ${isDragging ? 'border-dashed border-primary/50 opacity-60' : ''}
                `}
                draggable={!!dragHandlers}
                onDragStart={dragHandlers?.onDragStart}
                onDragOver={dragHandlers?.onDragOver}
                onDrop={dragHandlers?.onDrop}
            >
                {/* Header Bar */}
                <div className="bg-slate-50/40 border-b border-slate-100 px-4 py-3 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-3">
                        {dragHandlers && (
                            <div className="drag-handle cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1 rounded hover:bg-slate-200/50 transition-colors">
                                <GripVertical className="h-4 w-4" />
                            </div>
                        )}
                        <span className="font-bold text-slate-400 text-sm">#{index + 1}</span>

                        <div onClick={(e) => e.stopPropagation()}>
                            <Select value={question.type || 'single'} onValueChange={handleTypeChange}>
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
                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200 text-[10px] uppercase">
                                Passage Q
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white rounded-full border border-slate-200 px-3 py-1 shadow-sm">
                            <div className="flex items-center gap-1.5 border-r border-slate-100 pr-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marks</span>
                                <Input
                                    type="text"
                                    value={question.marks || ''}
                                    onChange={(e) => updateField('marks', e.target.value)}
                                    className="h-4 w-8 p-0 border-none bg-transparent shadow-none focus-visible:ring-0 text-xs font-bold text-slate-700 text-center"
                                    placeholder="4"
                                />
                            </div>
                            <div className="flex items-center gap-1.5 pl-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Neg</span>
                                <Input
                                    type="text"
                                    value={question.negativeMarks || ''}
                                    onChange={(e) => updateField('negativeMarks', e.target.value)}
                                    className="h-4 w-8 p-0 border-none bg-transparent shadow-none focus-visible:ring-0 text-xs font-bold text-red-600 text-center"
                                    placeholder="1"
                                />
                            </div>
                        </div>

                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={onDelete} title="Delete Question">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Question Text & Image */}
                    <div className="space-y-4">
                        <Label className="text-slate-600 font-semibold flex justify-between">
                            Question Text
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border cursor-pointer">
                                    <span className={`text-[10px] font-bold ${question.typingMode === 'en' ? 'text-blue-600' : 'text-slate-400'}`} onClick={() => updateField('typingMode', 'en')}>EN</span>
                                    <div className="w-px h-3 bg-slate-200"></div>
                                    <span className={`text-[10px] font-bold ${question.typingMode === 'hi' ? 'text-blue-600' : 'text-slate-400'}`} onClick={() => updateField('typingMode', 'hi')}>HI</span>
                                </div>
                                {!question.image && (
                                    <label className="cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border hover:bg-slate-100 text-[10px] font-bold text-slate-600 transition-colors">
                                        {qImageUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                                        ADD IMAGE
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                            setQImageUploading(true);
                                            handleFileUpload(e, (base64) => {
                                                updateField('image', base64);
                                                const img = new Image();
                                                img.src = base64; // Preload for size check? Unnecessary
                                                setQImageUploading(false);
                                            });
                                        }} />
                                    </label>
                                )}
                            </div>
                        </Label>

                        <IMEInput
                            typingMode={question.typingMode}
                            value={question.question}
                            onChange={(val) => updateField('question', val)}
                            placeholder={question.image ? "Optional question text..." : "Type your question here..."}
                            className="text-lg font-medium min-h-[80px]"
                        />

                        {question.image && (
                            <div className="relative inline-block border rounded-lg bg-slate-50 p-2">
                                <img src={question.image} alt="Question" className="max-h-[300px] w-auto rounded object-contain" />
                                <button
                                    onClick={() => updateField('image', null)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Options / Numerical Input */}
                    {question.type === 'numerical' ? (
                        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                            <Label className="block mb-4 text-slate-600 font-semibold">Correct Answer Range</Label>
                            <div className="flex items-center gap-4">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Minimum</Label>
                                    <Input
                                        type="number"
                                        value={typeof question.correctAnswer === 'object' ? question.correctAnswer.min : 0}
                                        onChange={(e) => updateField('correctAnswer', { ...question.correctAnswer, min: parseFloat(e.target.value) })}
                                        className="w-32 font-mono"
                                    />
                                </div>
                                <div className="h-px w-8 bg-slate-300 mt-6" />
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Maximum</Label>
                                    <Input
                                        type="number"
                                        value={typeof question.correctAnswer === 'object' ? question.correctAnswer.max : 0}
                                        onChange={(e) => updateField('correctAnswer', { ...question.correctAnswer, max: parseFloat(e.target.value) })}
                                        className="w-32 font-mono"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-4 flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">TIP</span>
                                For exact answers, set Min and Max to the same value.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Label className="text-slate-600 font-semibold">Options</Label>
                            <div className="grid grid-cols-1 gap-3">
                                {Object.keys(question.options).sort().map((optKey) => (
                                    <div key={optKey} className={`group/option relative flex flex-col gap-2 p-3 rounded-lg border-2 transition-all ${isCorrect(optKey) ? 'border-green-500 bg-green-50/30' : 'border-transparent bg-slate-50 hover:border-slate-200'}`}>
                                        <div className="flex items-start gap-3">
                                            {/* Correctness Toggle (Square Box) */}
                                            <div
                                                onClick={() => toggleCorrectAnswer(optKey)}
                                                className={`
                                                    w-8 h-8 shrink-0 flex items-center justify-center rounded-md cursor-pointer transition-all border-2
                                                    ${isCorrect(optKey) ? 'bg-green-500 border-green-500 text-white shadow-sm' : 'bg-white border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600'}
                                                `}
                                                title="Mark as Correct Answer"
                                            >
                                                {isCorrect(optKey) ? (
                                                    // Show Tick when selected
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                ) : (
                                                    <span className="font-bold text-sm">{optKey}</span>
                                                )}
                                            </div>

                                            {/* Option Input */}
                                            <div className="flex-1 relative">
                                                <IMEInput
                                                    typingMode={question.typingMode}
                                                    value={question.options[optKey]}
                                                    onChange={(val) => updateOptionText(optKey, val)}
                                                    placeholder={`Option ${optKey}`}
                                                    className="border-none bg-transparent shadow-none focus-visible:ring-0 px-0 py-1 h-auto min-h-[24px] text-slate-700 font-medium placeholder:text-slate-300 resize-none pr-16"
                                                />
                                                {/* Actions Overlay: Reversed Order (Image Left, Delete Right) */}
                                                <div className="absolute right-0 top-0 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/option:opacity-100 transition-opacity bg-white/80 backdrop-blur-[2px] rounded-lg pl-1">
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className={`h-6 w-6 text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all rounded-md ${expandedImageInputs[optKey] ? 'text-blue-500 bg-blue-50 opacity-100' : ''}`}
                                                        onClick={() => toggleImageInput(optKey)}
                                                        title="Add Image"
                                                    >
                                                        <ImageIcon className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all rounded-md"
                                                        onClick={() => handleRemoveOption(optKey)}
                                                        title="Remove Option"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Option Image */}
                                        {(question.optionImages?.[optKey] || expandedImageInputs[optKey]) && (
                                            <div className="ml-11">
                                                {question.optionImages?.[optKey] ? (
                                                    <div className="relative group/optimg w-fit">
                                                        <img src={question.optionImages[optKey]} alt={`Option ${optKey}`} className="h-20 w-auto object-contain border rounded-md bg-white shadow-sm" />
                                                        <button
                                                            onClick={() => updateOptionImage(optKey, null)}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover/optimg:opacity-100 transition-opacity scale-75 group-hover/optimg:scale-100"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <Input placeholder="Image URL" className="h-7 text-[10px] w-32 border-slate-200 bg-slate-50"
                                                            onChange={(e) => updateOptionImage(optKey, processImageUrl(e.target.value))}
                                                        />
                                                        <label className="cursor-pointer p-1.5 bg-slate-100 rounded hover:bg-slate-200 relative">
                                                            {uploadingImages[optKey] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                                                setUploadingImages(prev => ({ ...prev, [optKey]: true }));
                                                                handleFileUpload(e, (base64) => {
                                                                    updateOptionImage(optKey, base64);
                                                                    setUploadingImages(prev => ({ ...prev, [optKey]: false }));
                                                                });
                                                            }} />
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <div className="flex justify-center pt-2">
                                    <button
                                        onClick={handleAddOption}
                                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all text-xs font-semibold uppercase tracking-wide"
                                    >
                                        <Plus className="w-4 h-4" /> Add Option
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {isEndOfGroup && onAddSubQuestion && (
                <div className="flex justify-center -mt-6 relative z-0">
                    <div className="h-6 w-px bg-indigo-200 absolute -top-6"></div>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={onAddSubQuestion}
                        className="gap-2 bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 shadow-sm rounded-full px-4 mt-2"
                    >
                        <Plus className="w-4 h-4" /> Add Question to Passage
                    </Button>
                </div>
            )}
        </div>
    );
}
