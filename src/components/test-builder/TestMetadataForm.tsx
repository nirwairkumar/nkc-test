import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { IMEInput } from '@/components/ui/IMEInput';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Plus, X, Upload, Eraser, Info, Languages, Check, ChevronsUpDown, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface TestMetadataFormProps {
    isPremium: boolean;
    // Basic Info
    title: string;
    setTitle: (val: string) => void;
    description: string;
    setDescription: (val: string) => void;
    descriptionLanguage: 'en' | 'hi';
    setDescriptionLanguage: (val: 'en' | 'hi') => void;
    revisionNotes: string;
    setRevisionNotes: (val: string) => void;

    // Institution
    institutionName: string;
    setInstitutionName: (val: string) => void;
    institutionLogo: string;
    setInstitutionLogo: (val: string) => void;

    // Settings
    time: number;
    setTime: (val: number) => void;
    isPublic: boolean;
    setIsPublic: (val: boolean) => void;
    hasScientificCalculator: boolean;
    setHasScientificCalculator: (val: boolean) => void;
    enableSectionMode: boolean;
    toggleSectionMode: (val: boolean) => void;

    // Categories & Tags
    categories: any[];
    selectedCategories: string[];
    toggleCategory: (id: string) => void;
    tags: string[];
    setTags: (val: string[]) => void;

    // Custom Category
    showOtherCategory: boolean;
    setShowOtherCategory: (val: boolean) => void;
    customCategory: string;
    setCustomCategory: (val: string) => void;

    // Actions
    handleClear: () => void;
}

export function TestMetadataForm({
    isPremium,
    title, setTitle,
    description, setDescription,
    descriptionLanguage, setDescriptionLanguage,
    revisionNotes, setRevisionNotes,
    institutionName, setInstitutionName,
    institutionLogo, setInstitutionLogo,
    time, setTime,
    isPublic, setIsPublic,
    hasScientificCalculator, setHasScientificCalculator,
    enableSectionMode, toggleSectionMode,
    categories, selectedCategories, toggleCategory,
    tags, setTags,
    showOtherCategory, setShowOtherCategory,
    customCategory, setCustomCategory,
    handleClear
}: TestMetadataFormProps) {
    const navigate = useNavigate();
    const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);
    const [tagInput, setTagInput] = useState("");
    const [isDragging, setIsDragging] = useState(false);

    // Helper functions (duplicated from TestBuilder for now)
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
        if (file) processFile(file, setInstitutionLogo);
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

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = tagInput.trim();
            if (val && !tags.includes(val)) {
                setTags([...tags, val]);
                setTagInput('');
            }
        }
    };
    const removeTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    return (
        <div className="grid gap-6">
            <Card className="rounded-none sm:rounded-xl border-x-0 sm:border">
                {/* Institution & Logo Header */}
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
                                    <>
                                        <Upload className="w-5 h-5 text-slate-400" />
                                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Logo</span>
                                    </>
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

                <CardHeader className="pb-3"><CardTitle className="text-lg">Test Details</CardTitle></CardHeader>
                <CardContent className="space-y-4 px-6 pb-6 pt-0">
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

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-end">
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
                            <Label className="text-slate-600 font-semibold">Section Mode</Label>
                            <div className="flex items-center space-x-2 h-10 border rounded-md px-3 bg-white">
                                <Switch checked={enableSectionMode} onCheckedChange={toggleSectionMode} />
                                <Label className="cursor-pointer text-slate-700" onClick={() => toggleSectionMode(!enableSectionMode)}>{enableSectionMode ? 'On' : 'Off'}</Label>
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
        </div>
    );
}
