
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
import { Plus, Trash2, Save, ArrowLeft, Loader2, GripVertical } from 'lucide-react';
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
            if (!questions[i].question.trim()) {
                toast.error(`Question ${i + 1} text is empty`);
                return;
            }
            if (Object.values(questions[i].options).some(o => !o.trim())) {
                toast.error(`All options for Question ${i + 1} must be filled`);
                return;
            }
        }

        setLoading(true);
        try {
            // Generate Custom ID
            const { getNextTestId } = await import('@/lib/testsApi');
            const customId = await getNextTestId('M');

            const newTest = {
                title,
                description,
                duration: time,
                marks_per_question: marks,
                negative_marks: negativeMarks,
                is_public: isPublic,
                questions: questions,
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
                            <div className="absolute right-2 top-2">
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveQuestion(index)} disabled={questions.length === 1}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex gap-2">
                                    <span className="font-bold text-lg text-muted-foreground">Q{index + 1}.</span>
                                    <div className="flex-1 space-y-4">
                                        <Textarea
                                            placeholder="Type your question here..."
                                            value={q.question}
                                            onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                                            className="min-h-[80px]"
                                        />
                                        <Input
                                            placeholder="Image URL (Optional)"
                                            value={q.image || ''}
                                            onChange={(e) => updateQuestion(index, 'image', e.target.value)}
                                            className="text-sm bg-slate-50 dark:bg-slate-900 h-9 md:w-[calc(50%-0.5rem)]"
                                        />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {['A', 'B', 'C', 'D'].map((optKey) => (
                                                <div key={optKey} className="flex flex-col gap-2">
                                                    <div className="flex gap-2 items-center">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold ${q.correctAnswer === optKey ? 'bg-green-100 border-green-500 text-green-700' : 'bg-slate-50'}`}>
                                                            {optKey}
                                                        </div>
                                                        <Input
                                                            placeholder={`Option ${optKey}`}
                                                            value={q.options[optKey]}
                                                            onChange={(e) => updateOption(index, optKey, e.target.value)}
                                                        />
                                                        <input
                                                            type="radio"
                                                            name={`correct-${index}`}
                                                            checked={q.correctAnswer === optKey}
                                                            onChange={() => updateQuestion(index, 'correctAnswer', optKey)}
                                                            className="w-4 h-4 cursor-pointer accent-green-600"
                                                            title="Mark as correct"
                                                        />
                                                    </div>
                                                    {/* Option Image Input */}
                                                    <Input
                                                        placeholder={`Image URL for Option ${optKey} (Optional)`}
                                                        value={q.optionImages?.[optKey] || ''}
                                                        onChange={(e) => {
                                                            const newQuestions = [...questions];
                                                            if (!newQuestions[index].optionImages) newQuestions[index].optionImages = {};
                                                            newQuestions[index].optionImages![optKey] = e.target.value;
                                                            setQuestions(newQuestions);
                                                        }}
                                                        className="ml-10 text-[10px] h-6 bg-slate-50/50 w-[calc(100%-2.5rem)]"
                                                    />
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
