import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import supabase from '@/lib/supabaseClient';
import { CheckCircle, Plus } from 'lucide-react';
import { allTests as mathTests } from '@/data/examples/math-test';
import { allTests as scienceTests } from '@/data/examples/science-test';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { fetchSections, createSection, assignSectionsToTest, Section } from '@/lib/sectionsApi';
import { Checkbox } from '@/components/ui/checkbox';

export default function AdminMigration() {
    const { user, loading: authLoading, isAdmin } = useAuth();
    const navigate = useNavigate();

    // Protect Route
    useEffect(() => {
        if (!authLoading) {
            if (!isAdmin) {
                navigate('/admin-login');
            }
        }
    }, [user, authLoading, isAdmin, navigate]);

    const [status, setStatus] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [fileStats, setFileStats] = useState<{ total: number, parsed: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Section States
    const [sections, setSections] = useState<Section[]>([]);
    const [selectedSections, setSelectedSections] = useState<string[]>([]);
    const [newSectionName, setNewSectionName] = useState('');

    // Test Settings State
    const [globalDescription, setGlobalDescription] = useState('');
    const [marksPerQuestion, setMarksPerQuestion] = useState<number>(4);
    const [negativeMarks, setNegativeMarks] = useState<number>(1);
    const [duration, setDuration] = useState<number>(180); // minutes

    useEffect(() => {
        loadSections();
    }, []);

    const loadSections = async () => {
        const { data } = await fetchSections();
        if (data) setSections(data);
    };

    const handleCreateSection = async () => {
        if (!newSectionName.trim()) return;
        const { data, error } = await createSection(newSectionName.trim());
        if (error) {
            log(`Error creating section: ${error.message}`, 'error');
        } else {
            log(`Section created: ${data.name}`, 'success');
            setNewSectionName('');
            loadSections();
        }
    };

    const toggleSection = (id: string) => {
        setSelectedSections(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    if (authLoading) return <div className="p-10 text-center">Checking permissions...</div>;
    // Extra safety: Don't render if not admin
    if (!authLoading && !isAdmin) return null;


    const log = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setStatus(prev => [...prev, `[${timestamp}] ${type.toUpperCase()}: ${message}`]);
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setStatus([]); // Clear previous logs
        setFileStats(null);
        setLoading(true);
        log(`Reading file: ${file.name}...`);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            // Extract filename without extension
            const filename = file.name.replace(/\.[^/.]+$/, "");
            await processFileContent(text, filename);
        };
        reader.onerror = () => {
            log('Error reading file', 'error');
            setLoading(false);
        };
        reader.readAsText(file);
    };

    const processFileContent = async (text: string, customId?: string) => {
        try {
            log('Parsing file content...');

            // Regex to find the start of the array
            const startRegex = /export\s+const\s+allTests\s*(?::\s*\w+(?:\[\])?)?\s*=\s*\[/s;
            const match = startRegex.exec(text);

            if (!match) {
                throw new Error("Could not find 'export const allTests = [' variable in the file.");
            }

            const startIndex = match.index + match[0].length - 1; // start at '['

            // Simple bracket counting to find the end of the array
            let bracketCount = 0;
            let endIndex = -1;
            let inString = false;
            let stringChar = '';

            for (let i = startIndex; i < text.length; i++) {
                const char = text[i];

                if (inString) {
                    if (char === stringChar && text[i - 1] !== '\\') {
                        inString = false;
                    }
                } else {
                    if (char === '"' || char === "'" || char === '`') {
                        inString = true;
                        stringChar = char;
                    } else if (char === '[') {
                        bracketCount++;
                    } else if (char === ']') {
                        bracketCount--;
                        if (bracketCount === 0) {
                            endIndex = i + 1;
                            break;
                        }
                    }
                }
            }

            if (endIndex === -1) {
                throw new Error("Could not find the closing bracket ']' for the allTests array.");
            }

            let arrayString = text.substring(startIndex, endIndex);

            // Use new Function to parse
            const parsedData = new Function(`return ${arrayString};`)();

            if (!Array.isArray(parsedData)) {
                throw new Error("Parsed data is not an array.");
            }

            log(`Successfully parsed ${parsedData.length} tests.`, 'success');
            setFileStats({ total: parsedData.length, parsed: parsedData.length });

            await uploadData(parsedData, customId);

        } catch (error: any) {
            log(`Parsing Error: ${error.message}`, 'error');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSeed = async () => {
        setLoading(true);
        setStatus([]);
        setFileStats(null);
        log("Starting Seed Process...", 'info');

        try {
            const examples = [...mathTests, ...scienceTests];
            log(`Found ${examples.length} example tests to seed.`, 'info');
            await uploadData(examples, "example-data");
        } catch (error: any) {
            log(`Seed Error: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const uploadData = async (tests: any[], customId?: string) => {
        log('Starting database upload...');
        let successCount = 0;
        let failCount = 0;

        for (const test of tests) {
            try {
                if (!test.title || !test.questions) {
                    log(`Skipping invalid test item (missing title or questions)`, 'error');
                    failCount++;
                    continue;
                }

                log(`Processing "${test.title}"...`);

                const { data: existing } = await supabase
                    .from('tests')
                    .select('id')
                    .eq('title', test.title)
                    .single();

                if (existing) {
                    log(`-> Skipped: Test "${test.title}" already exists.`, 'error');
                    failCount++;
                    continue;
                }

                const { data: insertedTest, error } = await supabase
                    .from('tests')
                    .insert({
                        title: test.title,
                        description: test.description || globalDescription || '',
                        questions: test.questions,
                        custom_id: customId || null,
                        marks_per_question: test.marks_per_question || marksPerQuestion,
                        negative_marks: test.negative_marks !== undefined ? test.negative_marks : negativeMarks,
                        duration: test.duration || duration
                    })
                    .select()
                    .single();

                if (error) {
                    log(`-> Error inserting: ${error.message}`, 'error');
                    failCount++;
                } else if (insertedTest) {
                    // Assign Sections
                    if (selectedSections.length > 0) {
                        const { error: sectionError } = await assignSectionsToTest(insertedTest.id, selectedSections);
                        if (sectionError) {
                            log(`-> Warning: Test created but section assignment failed: ${sectionError.message}`, 'error');
                        } else {
                            log(`-> Success: Uploaded "${test.title}" with sections.`);
                        }
                    } else {
                        log(`-> Success: Uploaded "${test.title}" (No sections).`);
                    }
                    successCount++;
                }

            } catch (err: any) {
                log(`-> Unexpected error for "${test.title}": ${err.message}`, 'error');
                failCount++;
            }
        }

        log('------------------------------------------------');
        log(`Migration Completed. Success: ${successCount}, Failed/Skipped: ${failCount}`, 'success');
    };

    return (
        <div className="container mx-auto max-w-4xl py-10 space-y-6">
            <BackButton />
            <h1 className="text-3xl font-bold">Admin Data Migration</h1>

            {/* Manage Sections */}
            <Card>
                <CardHeader>
                    <CardTitle>Manage Sections</CardTitle>
                    <CardDescription>Create sections to categorize tests.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="New Section Name"
                            value={newSectionName}
                            onChange={(e) => setNewSectionName(e.target.value)}
                        />
                        <Button onClick={handleCreateSection} disabled={!newSectionName.trim()}>
                            <Plus className="h-4 w-4 mr-2" /> Add
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Option 1: Seed Example Data</CardTitle>
                        <CardDescription>
                            Quickly load the example Math and Science tests into the database.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleSeed} disabled={loading} className="w-full">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Load Example Data
                        </Button>
                    </CardContent>
                </Card>

                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Option 2: Upload Test Data</CardTitle>
                        <CardDescription>
                            Upload a custom <code>questions.ts</code> file.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Default Test Settings</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">Marks/Q</Label>
                                    <Input
                                        type="number"
                                        value={marksPerQuestion}
                                        onChange={(e) => setMarksPerQuestion(parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Neg. Marks</Label>
                                    <Input
                                        type="number"
                                        value={negativeMarks}
                                        onChange={(e) => setNegativeMarks(parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Duration (mins)</Label>
                                    <Input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1 mt-2">
                                <Label className="text-xs">Default Description</Label>
                                <Input
                                    value={globalDescription}
                                    onChange={(e) => setGlobalDescription(e.target.value)}
                                    placeholder="Enter test description"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Assign Sections (Optional)</Label>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {sections.length === 0 && <span className="text-sm text-muted-foreground">No sections created yet.</span>}
                                {sections.map(section => (
                                    <div key={section.id} className="flex items-center space-x-2 border p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer" onClick={() => toggleSection(section.id)}>
                                        <Checkbox
                                            id={`section-${section.id}`}
                                            checked={selectedSections.includes(section.id)}
                                            onCheckedChange={() => toggleSection(section.id)}
                                        />
                                        <Label htmlFor={`section-${section.id}`} className="cursor-pointer">{section.name}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="file">Test Data File (.ts)</Label>
                            <Input
                                ref={fileInputRef}
                                id="file"
                                type="file"
                                accept=".ts,.js,.txt"
                                onChange={handleFileChange}
                                disabled={loading}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Status Log */}
            <Card className="bg-slate-950 text-slate-50 font-mono text-sm">
                <CardHeader>
                    <CardTitle className="text-slate-300 flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                        Migration Log
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[400px] overflow-auto space-y-1 p-2">
                        {status.length === 0 && <span className="text-slate-500 italic">Waiting for action...</span>}
                        {status.map((msg, idx) => {
                            const isError = msg.includes('ERROR');
                            const isSuccess = msg.includes('SUCCESS');
                            return (
                                <div key={idx} className={`${isError ? 'text-red-400' : isSuccess ? 'text-green-400' : 'text-slate-300'}`}>
                                    {msg}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
