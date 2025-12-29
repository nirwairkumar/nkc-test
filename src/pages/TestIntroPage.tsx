import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchTestById, Test } from '@/lib/testsApi';
import { Clock, HelpCircle, AlertTriangle, FileText, CheckCircle, ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TestIntroPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFullScreenDialog, setShowFullScreenDialog] = useState(false);

    const [hasAttempted, setHasAttempted] = useState(false);
    const [checklistDiff, setChecklistDiff] = useState(false); // User accepted checklist
    const [startFormValues, setStartFormValues] = useState<Record<string, string>>({});
    const [schedulingError, setSchedulingError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            loadTest(id);
        }
    }, [id]);

    // Check for attempt limit and schedule when test loads or user changes
    useEffect(() => {
        if (test && user) {
            checkPermissions();
        }
    }, [test, user]);

    const checkPermissions = async () => {
        if (!test || !user) return;

        // 1. Schedule Check
        if (test.settings?.schedule?.enabled) {
            const now = new Date();
            const start = test.settings.schedule.start_time ? new Date(test.settings.schedule.start_time) : null;
            const end = test.settings.schedule.end_time ? new Date(test.settings.schedule.end_time) : null;

            if (start && now < start) {
                setSchedulingError(`Test starts on ${start.toLocaleString()}`);
                return;
            }
            if (end && now > end) {
                setSchedulingError(`Test ended on ${end.toLocaleString()}`);
                return;
            }
        }

        // 2. Attempt Limit Check
        // console.log("Checking attempt limit:", test.settings?.attempt_limit);
        if (test.settings?.attempt_limit === 1) {
            try {
                const { checkUserTestAttempt } = await import('@/lib/attemptsApi');
                const { hasAttempted, error } = await checkUserTestAttempt(user.id, test.id);
                // console.log("Attempt Check Result:", { hasAttempted, error, userId: user.id, testId: test.id });

                if (error) {
                    console.error("Error checking attempts:", error);
                }

                if (hasAttempted) {
                    setHasAttempted(true);
                }
            } catch (err) {
                console.error("Failed to check attempts:", err);
            }
        }
    };

    const loadTest = async (testId: string) => {
        try {
            const { data, error } = await fetchTestById(testId);
            if (error) throw error;
            setTest(data);
        } catch (err: any) {
            console.error("Error loading test:", err);
            setError(err.message || "Failed to load test details.");
        } finally {
            setLoading(false);
        }
    };

    const handleStartTest = () => {
        if (hasAttempted) return;
        if (schedulingError) return;

        // If pre-test checklist is required but not confirmed?
        // Actually we show checklist inside a dialog or inline?
        // Let's show the Full Screen dialog which now acts as the "Pre-Flight" check
        setShowFullScreenDialog(true);
    };

    const confirmStartTest = async (enableFullScreen: boolean) => {
        // Validate Start Form if enabled
        if (test?.settings?.start_form?.enabled) {
            const missing = test.settings.start_form.fields.filter(f => f.required && !startFormValues[f.label]);
            if (missing.length > 0) {
                alert(`Please fill all required fields: ${missing.map(f => f.label).join(', ')}`);
                return;
            }
            // Save form values to sessionStorage to be picked up by TestPage or Attempts
            sessionStorage.setItem(`start_form_${test.id}`, JSON.stringify(startFormValues));
        }

        setShowFullScreenDialog(false);

        // Register the attempt if limited attempt is enabled (or always, for general tracking)
        // For now let's enforce it if attempt limit is on, or Schedule is strict?
        // Let's Just do it always to be safe and future proof
        if (user && test) {
            const { registerTestStart } = await import('@/lib/attemptsApi');
            await registerTestStart(user.id, test.id);
        }

        if (enableFullScreen || test?.settings?.force_fullscreen) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error("Error attempting to enable full-screen mode:", err);
            });
        }
        navigate(`/test/${id}`);
    };

    if (loading || authLoading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

    if (error || !test) return (
        <div className="container mx-auto py-10 text-center">
            <h2 className="text-xl text-red-500 mb-4">Error: {error || "Test not found"}</h2>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
    );

    return (
        <div className="container mx-auto max-w-3xl py-2 px-4 space-y-4 relative">
            <Button
                variant="ghost"
                className="fixed top-20 left-0 h-10 w-12 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-none rounded-r-lg shadow-md z-50 transition-transform hover:translate-x-1"
                onClick={() => navigate(-1)}
            >
                <ArrowLeft className="h-6 w-6" />
            </Button>

            <Card className="border-t-4 border-t-primary shadow-lg relative">
                <CardHeader className="text-center pb-2 pt-6 p-4">
                    <CardTitle className="text-2xl font-bold text-red-900">{test.title}</CardTitle>
                    <CardDescription className="text-sm mt-1">
                        {test.description || "No description provided."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-3 bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                        <div className="flex flex-col items-center justify-center text-center">
                            <HelpCircle className="h-6 w-6 text-blue-500 mb-2" />
                            <span className="text-sm text-muted-foreground">Questions</span>
                            <span className="font-bold text-lg">{test.questions?.length || 0}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center text-center">
                            <Clock className="h-6 w-6 text-orange-500 mb-2" />
                            <span className="text-sm text-muted-foreground">Duration</span>
                            <span className="font-bold text-lg">{test.duration || "N/A"} mins</span>
                        </div>
                        <div className="flex flex-col items-center justify-center text-center">
                            <CheckCircle className="h-6 w-6 text-green-500 mb-2" />
                            <span className="text-sm text-muted-foreground">Marks/Q</span>
                            <span className="font-bold text-lg">{test.marks_per_question || 4}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center text-center">
                            <AlertTriangle className="h-6 w-6 text-red-500 mb-2" />
                            <span className="text-sm text-muted-foreground">Negative</span>
                            <span className="font-bold text-lg">{test.negative_marks !== undefined ? test.negative_marks : 1}</span>
                        </div>
                    </div>

                    <div className="space-y-3 border p-3 rounded-md">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold text-base">Terms & Instructions</h3>
                        </div>
                        <Separator />
                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            <li>The test contains <strong>{test.questions?.length}</strong> questions.</li>
                            <li>Total duration of the test is <strong>{test.duration} minutes</strong>.</li>
                            <li>Each correct answer awards <strong>+{test.marks_per_question || 4} marks</strong>.</li>
                            <li>Each wrong answer deducts <strong>{test.negative_marks !== undefined ? test.negative_marks : 1} marks</strong>.</li>
                            <li>Once you start, the timer will begin and cannot be paused.</li>
                            {test.settings?.force_fullscreen && (
                                <li className="text-red-600 font-medium">Full Screen Mode is mandatory. Exiting may submit the test.</li>
                            )}
                            {test.settings?.tab_switch_mode !== 'off' && test.settings?.tab_switch_mode && (
                                <li className="text-red-600 font-medium">Switching tabs or minimizing window is PROHIBITED.</li>
                            )}
                        </ul>
                    </div>

                    {test.revision_notes && (
                        <div className="mt-4 border rounded-md">
                            <details className="group">
                                <summary className="cursor-pointer p-4 bg-muted/30 hover:bg-muted/50 font-medium flex items-center justify-center select-none">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        View Test Summary & Instructions
                                    </div>
                                    <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform ml-2">▼</span>
                                </summary>
                                <div className="p-4 bg-slate-50 dark:bg-slate-950/30 border-t max-h-[500px] overflow-y-auto">
                                    <article className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {test.revision_notes}
                                        </ReactMarkdown>
                                    </article>
                                </div>
                            </details>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="pt-0 pb-4 px-4 flex flex-col gap-3">
                    {schedulingError ? (
                        <div className="w-full p-4 bg-red-100 text-red-800 rounded-lg text-center font-bold">
                            {schedulingError}
                        </div>
                    ) : hasAttempted ? (
                        <div className="w-full p-4 bg-amber-100 text-amber-800 rounded-lg text-center font-bold">
                            You have already attempted this test.
                        </div>
                    ) : (
                        <Button size="lg" className="w-full text-lg h-10" onClick={handleStartTest}>
                            Start Test Now
                        </Button>
                    )}
                </CardFooter>
            </Card>

            <AlertDialog open={showFullScreenDialog} onOpenChange={setShowFullScreenDialog}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Pre-Exam Checklist</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <label className="flex items-start gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer">
                                    <input type="checkbox" className="mt-1" checked={checklistDiff} onChange={(e) => setChecklistDiff(e.target.checked)} />
                                    <span className="text-sm text-slate-800">
                                        I have closed all other tabs and applications. I enable "Do Not Disturb" mode on my device.
                                    </span>
                                </label>
                                {test.settings?.force_fullscreen && (
                                    <div className="text-xs text-amber-600 font-medium p-2 bg-amber-50 rounded">
                                        Note: This test requires Full Screen mode.
                                    </div>
                                )}
                            </div>

                            {test.settings?.start_form?.enabled && (
                                <div className="space-y-3 pt-2 border-t">
                                    <p className="text-sm font-bold text-slate-900">Candidate Details</p>
                                    {test.settings.start_form.fields.map((field, idx) => (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex justify-between">
                                                <label className="text-xs font-medium">{field.label}</label>
                                                {field.required && <span className="text-xs text-red-500">*</span>}
                                            </div>
                                            <input
                                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                placeholder={`Enter ${field.label}`}
                                                value={startFormValues[field.label] || ''}
                                                onChange={(e) => setStartFormValues(prev => ({ ...prev, [field.label]: e.target.value }))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-between items-center gap-2">
                        <AlertDialogCancel onClick={() => setShowFullScreenDialog(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                if (!checklistDiff) {
                                    e.preventDefault();
                                    alert("Please accept the checklist.");
                                    return;
                                }
                                confirmStartTest(true);
                            }}
                            disabled={!checklistDiff}
                            className={!checklistDiff ? "opacity-50 cursor-not-allowed" : ""}
                        >
                            {test.settings?.force_fullscreen ? "Enable Full Screen & Start" : "Start Test"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
