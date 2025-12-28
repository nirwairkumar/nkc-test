import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { SharedToolbar, SharedEditor } from '@/components/ui/SharedRichTextEditor';
import { CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical, CheckSquare, Square } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface AdvancedQuestionEditorProps {
    question: any;
    index: number;
    updateQuestion: (index: number, field: string, value: any) => void;
    updateOption: (index: number, optKey: string, value: string) => void;
    handleRemove: (index: number) => void;
    isDragging: boolean;
    handleDragStart: (e: React.DragEvent, index: number) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent, index: number) => void;
    toggleQuestionLanguage?: (index: number, mode: 'en' | 'hi') => void; // Optional if we move language state local
    handleTypeChange: (type: string) => void;
}

export function AdvancedQuestionEditor({
    question,
    index,
    updateQuestion,
    updateOption,
    handleRemove,
    isDragging,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleTypeChange
}: AdvancedQuestionEditorProps) {
    const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
    //We use local state for language for the toolbar, 
    // but initially sync from question.typingMode if helpful, or just default 'en'.
    // The user can toggle it via the shared toolbar.
    const [language, setLanguage] = useState<'en' | 'hi'>('en');

    // Helper to update typing mode if we want to persist it,
    // but for now local is enough for the session.

    return (
        <div
            className={`relative transition-all border rounded-lg bg-card text-card-foreground shadow-sm ${isDragging ? 'border-dashed border-primary/50' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => { e.stopPropagation(); handleDrop(e, index); }}
        >
            <div className="drag-handle absolute left-2 top-2 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 z-10 p-1">
                <GripVertical className="h-5 w-5" />
            </div>
            <div className="absolute right-0 top-0 z-10">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => handleRemove(index)}>
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            <CardContent className="pt-10 space-y-4">
                <div className="flex gap-2">
                    <span className="font-bold text-lg text-muted-foreground">Q{index + 1}.</span>
                    <div className="flex-1 space-y-4">
                        {/* Header Controls: Type Selector (Language is now in Toolbar) */}
                        <div className="flex justify-between items-center mb-2">
                            <div
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Select
                                    value={question.type}
                                    onValueChange={handleTypeChange}
                                >
                                    <SelectTrigger className="h-8 w-[180px] text-xs">
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="single">Single Choice</SelectItem>
                                        <SelectItem value="single-advance">Single Choice 2.0</SelectItem>
                                        <SelectItem value="multiple">Multiple Choice</SelectItem>
                                        <SelectItem value="numerical">Numerical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Shared Toolbar - Sticky or Top */}
                        <div className="sticky top-0 z-20 bg-background border rounded-md shadow-sm">
                            <SharedToolbar
                                editor={activeEditor}
                                language={language}
                                setLanguage={setLanguage}
                            />
                        </div>

                        {/* Question Editor */}
                        <div className={`border rounded-md bg-white dark:bg-slate-950 ${language === 'hi' ? 'border-orange-200 ring-1 ring-orange-200' : ''}`}>
                            <div className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-muted/20 border-b">
                                Question Text
                            </div>
                            <SharedEditor
                                value={question.question}
                                onChange={(val) => updateQuestion(index, 'question', val)}
                                onFocus={setActiveEditor}
                                language={language}
                                placeholder="Type your question here (supports images, math, hindi)..."
                                minHeight="120px"
                            />
                        </div>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {['A', 'B', 'C', 'D'].map(optKey => {
                                const isSelected = question.correctAnswer === optKey;
                                const handleSelect = () => {
                                    updateQuestion(index, 'correctAnswer', optKey);
                                };

                                return (
                                    <div key={optKey} className="flex gap-2 items-start">
                                        {/* Selection Circle */}
                                        <div
                                            onClick={handleSelect}
                                            className={`mt-1 flex-shrink-0 w-8 h-8 flex items-center justify-center border font-bold cursor-pointer transition-all rounded-full ${isSelected ? 'bg-green-100 border-green-500 text-green-700' : 'bg-slate-50 hover:bg-slate-100'}`}
                                        >
                                            {optKey}
                                        </div>

                                        {/* Option Editor */}
                                        <div className={`flex-1 border rounded-md bg-white dark:bg-slate-950 ${language === 'hi' ? 'border-orange-200 ring-1 ring-orange-200' : ''}`}>
                                            <div className="px-2 py-0.5 text-[10px] font-semibold text-muted-foreground bg-muted/20 border-b">
                                                Option {optKey}
                                            </div>
                                            <SharedEditor
                                                value={question.options[optKey]}
                                                onChange={(val) => updateOption(index, optKey, val)}
                                                onFocus={setActiveEditor}
                                                language={language}
                                                placeholder={`Option ${optKey}`}
                                                minHeight="60px"
                                                className="p-2"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                    </div>
                </div>
            </CardContent>
        </div>
    );
}
