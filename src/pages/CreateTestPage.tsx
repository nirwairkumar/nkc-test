
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Question, createTest } from '@/lib/testsApi';
import { toast } from 'sonner';
import { Plus, Trash2, Save, ArrowLeft, Loader2, Upload } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { BackButton } from '@/components/ui/BackButton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { fetchSections } from '@/lib/sectionsApi';

const DEFAULT_QUESTION: Question = {
    id: 1,
    question: '',
    options: {
        A: '',
        B: '',
        C: '',
        D: ''
    },
    correctAnswer: 'A'
};

export default function CreateTestPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);

    // Test Metadata State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [time, setTime] = useState<number>(30);
    const [marks, setMarks] = useState<number>(4);
    const [negativeMarks, setNegativeMarks] = useState<number>(1);
    const [isPublic, setIsPublic] = useState(true); // Default Public

    // Questions State
    const [questions, setQuestions] = useState<Question[]>([DEFAULT_QUESTION]);

    // Section State
    const [sections, setSections] = useState<any[]>([]); // Should load sections
    const [selectedSection, setSelectedSection] = useState<string>("none");

    React.useEffect(() => {
        // Load sections
        fetchSections().then(({ data }) => {
            if (data) setSections(data);
        });
    }, []);

    const handleAddQuestion = () => {
        setQuestions([
            ...questions,
            { ...DEFAULT_QUESTION, id: questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1, options: { ...DEFAULT_QUESTION.options } }
        ]);
    };

    const handleRemoveQuestion = (index: number) => {
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        setQuestions(newQuestions);
    };

    const updateQuestion = (index: number, field: keyof Question, value: any) => {
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

        // Validate Questions (Relaxed: Text OR Image required)
        for (let i = 0; i < questions.length; i++) {
            const hasQuestionContent = questions[i].question.trim() || questions[i].image;
            if (!hasQuestionContent) {
                toast.error(`Question ${i + 1} must have either text or an image`);
                return;
            }

            // Check options
            const options = ['A', 'B', 'C', 'D'];
            for (const opt of options) {
                const hasOptionContent = questions[i].options[opt].trim() || questions[i].optionImages?.[opt];
                if (!hasOptionContent) {
                    toast.error(`Option ${opt} for Question ${i + 1} is required (Text or Image)`);
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
                questions: sanitizedQuestions,
                created_by: user.id,
                custom_id: customId,
                creator_name: user.user_metadata?.full_name || 'Anonymous',
                creator_avatar: user.user_metadata?.avatar_url || '',
                created_at: new Date().toISOString()
            };

            const { data, error } = await createTest(newTest);

            if (error) throw error;

            // Assign Section if selected
            if (selectedSection && selectedSection !== "none") {
                const { assignSectionsToTest } = await import('@/lib/sectionsApi');
                await assignSectionsToTest(data.id, [selectedSection]);
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

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <h1 className="text-3xl font-bold">Create New Test</h1>
                </div>
            </div>

            <div className="grid gap-6">
                {/* Test Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Test Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Test Title</Label>
                            <Input placeholder="Enter test title..." value={title} onChange={e => setTitle(e.target.value)} />
                        </div>

                        <div className="grid gap-2">
                            <Label>Section</Label>
                            <Select value={selectedSection} onValueChange={setSelectedSection}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a section" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Section</SelectItem>
                                    {sections.map((sec: any) => (
                                        <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                            <Textarea
                                                placeholder="Type your question here..."
                                                value={q.question}
                                                onChange={(e) => updateQuestion(index, 'question', e.target.value)}
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

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {['A', 'B', 'C', 'D'].map((optKey) => (
                                                <div key={optKey} className="flex gap-2 items-start">
                                                    <div
                                                        onClick={() => updateQuestion(index, 'correctAnswer', optKey)}
                                                        className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border font-bold cursor-pointer transition-all ${q.correctAnswer === optKey ? 'bg-green-100 border-green-500 text-green-700 ring-2 ring-green-500/20' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}
                                                        title="Click to mark as correct"
                                                    >
                                                        {optKey}
                                                    </div>

                                                    <div className="flex-1 flex flex-col">
                                                        <div className="relative group">
                                                            <Input
                                                                placeholder={`Option ${optKey}`}
                                                                value={q.options[optKey]}
                                                                onChange={(e) => updateOption(index, optKey, e.target.value)}
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
                                            ))}
                                        </div>
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
