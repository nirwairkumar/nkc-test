import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

// Type definitions matching backend
interface Question {
    id: number;
    type: string;
    question: string;
    image?: string | null;
    options: { [key: string]: string };
    optionImages: { [key: string]: string };
    correctAnswer?: string | null;
    needsAnswer?: boolean;
}

interface ParseResponse {
    questions: Question[];
}

export default function AITestImporter({ onImport }: { onImport?: (data: Question[]) => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<Question[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleProcess = async () => {
        if (!file) {
            setError("Please select a file first.");
            return;
        }

        setLoading(true);
        setError(null);
        const formData = new FormData();
        formData.append("file", file);

        try {
            // Direct call to Railway Backend
            const response = await fetch("https://nkc-test-production.up.railway.app/parse", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || "Failed to process file. Ensure Backend is running.");
            }

            const data: ParseResponse = await response.json();

            if (!data.questions || data.questions.length === 0) {
                throw new Error("AI returned 0 questions. Please check the backend logs or try a different file.");
            }

            setParsedData(data.questions);
        } catch (err: any) {
            console.error("Frontend Process Error:", err);
            setError(err.message || "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleImport = () => {
        console.log("Importing Data:", parsedData);
        if (onImport) {
            onImport(parsedData);
        } else {
            alert("Check console for imported JSON data! (See Developer Tools)");
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                    AI Test Importer
                </h1>
                <div className="text-sm text-muted-foreground">
                    Build 1.0.0
                </div>
            </div>

            <Card className="mb-6 border-2">
                <CardHeader>
                    <CardTitle>Upload Exam Paper (PDF)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            disabled={loading}
                            className="flex-1"
                        />
                        <Button onClick={handleProcess} disabled={!file || loading} className="min-w-[140px]">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "Processing..." : "Process with AI"}
                        </Button>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {parsedData.length > 0 && (
                <div className="space-y-6 slide-in-from-bottom-5 animate-in duration-500">
                    <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm sticky top-0 z-10">
                        <h2 className="text-xl font-semibold">Preview ({parsedData.length} Questions)</h2>
                        <Button onClick={handleImport} className="bg-green-600 hover:bg-green-700 font-bold">
                            Confirm & Import
                        </Button>
                    </div>

                    <ScrollArea className="h-[600px] border rounded-md p-4 bg-muted/20">
                        {parsedData.map((q, idx) => (
                            <Card key={idx} className="mb-4 hover:shadow-md transition-shadow">
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex gap-4">
                                        <div className="font-bold text-lg min-w-[30px] pt-1 text-primary">{q.id}.</div>
                                        <div className="flex-1 space-y-3">
                                            {/* Question Text */}
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold uppercase text-muted-foreground">Question</label>
                                                <Textarea
                                                    defaultValue={q.question}
                                                    className="font-medium min-h-[60px] text-lg"
                                                />
                                            </div>
                                            {/* Question Image */}
                                            {q.image && (
                                                <div className="mt-2 border rounded-lg p-2 bg-white inline-block shadow-sm">
                                                    <img src={q.image} alt="Question Diagram" className="max-h-60 object-contain" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Options */}
                                    <div className="space-y-2 ml-10 mt-2">
                                        <label className="text-xs font-semibold uppercase text-muted-foreground">Options</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {Object.entries(q.options).map(([key, text]) => (
                                                <div key={key} className="flex gap-3 items-start border p-3 rounded-md bg-card group hover:border-primary/50 transition-colors">
                                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm shrink-0 ${q.correctAnswer === key ? 'bg-green-100 border-green-600 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600 group-hover:border-primary/30'}`}>
                                                        {key}
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <Input defaultValue={text} className="h-9" placeholder="Option Text" />
                                                        {q.optionImages[key] && (
                                                            <div className="border rounded bg-white p-1">
                                                                <img src={q.optionImages[key]} alt={`Option ${key}`} className="h-24 object-contain" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </ScrollArea>
                </div>
            )}
        </div>
    );
}
