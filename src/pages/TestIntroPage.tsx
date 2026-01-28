import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Clock, HelpCircle, Trophy, BookOpen, AlertTriangle, PlayCircle, FileText, CheckCircle, ArrowLeft, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { fetchTestById, fetchTestBySlug, Test } from '@/lib/testsApi';
// import { Helmet } from 'react-helmet-async'; // Replaced by SEO component
import { SEO } from '@/components/SEO';
import { SEOContent } from '@/components/SEOContent';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function TestIntroPage() {
    const { id, slug } = useParams<{ id: string; slug: string }>();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Logic State
    const [showFullScreenDialog, setShowFullScreenDialog] = useState(false);
    const [hasAttempted, setHasAttempted] = useState(false);
    const [checklistDiff, setChecklistDiff] = useState(false);
    const [startFormValues, setStartFormValues] = useState<Record<string, string>>({});
    const [schedulingError, setSchedulingError] = useState<string | null>(null);

    // 1. Authentication Check
    useEffect(() => {
        if (!authLoading && !user) {
            // Optional: Redirect to login logic if required
        }
    }, [user, authLoading]);

    // 2. Load Test Data
    useEffect(() => {
        if (slug) {
            loadTestBySlug(slug);
        } else if (id) {
            loadTestById(id);
        }
    }, [id, slug]);

    // 3. Check Permissions (Schedule & Attempts)
    useEffect(() => {
        if (test && user) {
            checkPermissions();
        }
    }, [test, user]);

    const loadTestBySlug = async (testSlug: string) => {
        setLoading(true);
        try {
            const { data, error } = await fetchTestBySlug(testSlug);
            if (error) throw error;
            if (!data) throw new Error("Test not found");
            setTest(data);
        } catch (err: any) {
            console.error("Error loading test by slug:", err);
            setError(err.message || "Failed to load test details.");
        } finally {
            setLoading(false);
        }
    };

    const loadTestById = async (testId: string) => {
        setLoading(true);
        try {
            // Check if testId is a UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testId);

            let data, error;

            if (isUUID) {
                const res = await fetchTestById(testId);
                data = res.data;
                error = res.error;
            } else {
                // Try Custom ID
                const { fetchTestByCustomId } = await import('@/lib/testsApi');
                const res = await fetchTestByCustomId(testId);
                data = res.data;
                error = res.error;
            }

            if (error) {
                // If invalid UUID but wasn't found as custom ID, it might still return error.
                throw error;
            }
            if (!data) throw new Error("Test not found");

            // SEO Redirect: If test has a slug, redirect to it
            // Only redirect if we loaded by ID (UUID), to keep URLs clean. 
            // If we loaded by Custom ID, we might also want to redirect to slug OR keep custom ID url.
            // Let's redirect to slug if it exists for canonical reasons.
            if (data.slug) {
                navigate(`/test/${data.slug}`, { replace: true });
                return;
            }

            setTest(data);
        } catch (err: any) {
            console.error("Error loading test:", err);
            setError(err.message || "Failed to load test details.");
        } finally {
            setLoading(false);
        }
    };

    const checkPermissions = async () => {
        if (!test || !user) return;

        // Schedule Check
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

        // Attempt Limit Check
        if (test.settings?.attempt_limit === 1) {
            try {
                const { checkUserTestAttempt } = await import('@/lib/attemptsApi');
                const { hasAttempted, error } = await checkUserTestAttempt(user.id, test.id);
                if (hasAttempted) setHasAttempted(true);
            } catch (err) {
                console.error("Failed to check attempts:", err);
            }
        }
    };

    const handleStartTest = () => {
        if (hasAttempted) return;
        if (schedulingError) return;

        // Show Checklist / Fullscreen Dialog
        setShowFullScreenDialog(true);
    };

    const confirmStartTest = async (enableFullScreen: boolean) => {
        if (!test) return;

        // Validate Start Form
        if (test.settings?.start_form?.enabled) {
            const missing = test.settings.start_form.fields.filter((f: any) => f.required && !startFormValues[f.label]);
            if (missing.length > 0) {
                alert(`Please fill all required fields: ${missing.map((f: any) => f.label).join(', ')}`);
                return;
            }
            sessionStorage.setItem(`start_form_${test.id}`, JSON.stringify(startFormValues));
        }

        setShowFullScreenDialog(false);

        // Register Attempt
        if (user) {
            try {
                const { registerTestStart } = await import('@/lib/attemptsApi');
                await registerTestStart(user.id, test.id);
            } catch (err) {
                console.error("Error registering start:", err);
            }
        }

        // Request Fullscreen
        if (enableFullScreen || test.settings?.force_fullscreen) {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch((err) => {
                    console.log("Fullscreen request denied:", err);
                });
            }
        }

        // Navigate to Live Test
        navigate(`/live/${test.id}`);
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
    if (error) return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
    if (!test) return <div className="flex justify-center items-center h-screen">Test not found.</div>;

    const questionCount = test.questions?.length || 0;

    // Calculate Total Marks
    let totalMaxMarks = 0;
    if (test.enable_section_mode && test.sections) {
        test.sections.forEach((sec: any) => {
            if (sec.questions) {
                sec.questions.forEach((q: any) => {
                    const m = q.marks !== undefined ? parseFloat(String(q.marks)) : (sec.marks_per_question ? parseFloat(String(sec.marks_per_question)) : 4);
                    totalMaxMarks += isNaN(m) ? 0 : m;
                });
            }
        });
    } else if (test.questions) {
        test.questions.forEach((q: any) => {
            const m = q.marks !== undefined ? parseFloat(String(q.marks)) : (test.marks_per_question ? parseFloat(String(test.marks_per_question)) : 4);
            totalMaxMarks += isNaN(m) ? 0 : m;
        });
    }

    return (
        <div className="container mx-auto max-w-3xl py-2 px-4 space-y-4 relative">
            <SEO
                title={test.title}
                description={test.description}
                image={test.og_image} // Fallback handled in component
                url={`${window.location.origin}${test.slug ? `/test/${test.slug}` : `/test-intro/${test.id}`}`}
                categories={[...(test.tags || []), ...(test.custom_category ? [test.custom_category] : [])]}
            />
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
                            <Trophy className="h-6 w-6 text-emerald-600 mb-2" />
                            <span className="text-sm text-muted-foreground">Total Marks</span>
                            <span className="font-bold text-lg">{totalMaxMarks}</span>
                        </div>

                        {test.enable_section_mode && (
                            <div className="flex flex-col items-center justify-center text-center col-span-2 md:col-span-2 bg-white dark:bg-slate-800 rounded border border-dashed">
                                <BookOpen className="h-6 w-6 text-purple-500 mb-1" />
                                <span className="text-sm font-medium">Section-wise Pattern</span>
                                <span className="text-xs text-muted-foreground">{test.sections?.length || 0} Sections</span>
                            </div>
                        )}
                    </div>

                    {test.enable_section_mode && test.sections && test.sections.length > 0 && (
                        <div className="border rounded-md overflow-hidden my-4">
                            <table className="w-full text-sm text-left bg-white dark:bg-slate-950">
                                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="p-3">Section</th>
                                        <th className="p-3 text-center">Qs</th>
                                        <th className="p-3 text-center">Total Marks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-slate-800">
                                    {test.sections.map((sec: any) => {
                                        // Calculate total marks for this section
                                        let sectionTotal = 0;
                                        if (sec.questions) {
                                            sec.questions.forEach((q: any) => {
                                                const m = q.marks !== undefined ? parseFloat(String(q.marks)) : (sec.marks_per_question ? parseFloat(String(sec.marks_per_question)) : 4);
                                                sectionTotal += isNaN(m) ? 0 : m;
                                            });
                                        }

                                        return (
                                            <tr key={sec.id}>
                                                <td className="p-3 font-medium">{sec.name}</td>
                                                <td className="p-3 text-center">{sec.questions?.length || 0}</td>
                                                <td className="p-3 text-center text-emerald-600 font-bold">{sectionTotal}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="space-y-3 border p-3 rounded-md">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold text-base">Terms & Instructions</h3>
                        </div>
                        <Separator />
                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            <li>The test contains <strong>{test.questions?.length}</strong> questions.</li>
                            <li>Total duration of the test is <strong>{test.duration} minutes</strong>.</li>
                            <li>Total Marks: <strong>{totalMaxMarks}</strong></li>
                            <li>Once you start, the timer will begin and cannot be paused.</li>

                        </ul>

                        {/* Advance Rules Section */}
                        {(test.settings && (
                            (test.settings.attempt_limit && test.settings.attempt_limit > 0) ||
                            test.settings.start_form?.enabled ||
                            test.settings.schedule?.enabled ||
                            (test.settings.tab_switch_mode && test.settings.tab_switch_mode !== 'off') ||
                            test.settings.show_results_immediate === false ||
                            test.settings.strict_timer ||
                            test.settings.shuffle_questions ||
                            test.settings.force_fullscreen
                        )) && (
                                <>
                                    <Separator className="my-3" />
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                                        <h4 className="font-semibold text-sm text-amber-700">Advance Rules</h4>
                                    </div>
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground mt-2">
                                        {test.settings.attempt_limit && test.settings.attempt_limit > 0 && (
                                            <li><strong>Attempt Limit:</strong> Only {test.settings.attempt_limit} attempt(s) allowed.</li>
                                        )}

                                        {test.settings.start_form?.enabled && (
                                            <li>
                                                <strong>Candidate Details:</strong> You must fill {test.settings.start_form.fields.map(f => `<${f.label}>`).join(' and ')} before starting.
                                            </li>
                                        )}

                                        {test.settings.schedule?.enabled && (
                                            <li>
                                                <strong>Scheduled:</strong> Test is live from {new Date(test.settings.schedule.start_time!).toLocaleString()} to {new Date(test.settings.schedule.end_time!).toLocaleString()}.
                                            </li>
                                        )}

                                        {test.settings.tab_switch_mode === 'strict' && (
                                            <li className="text-red-600 font-medium">
                                                <strong>Tab Switching:</strong> Strictly PROHIBITED. Test will auto-submit if you switch tabs.
                                            </li>
                                        )}
                                        {test.settings.tab_switch_mode === 'warming' && (
                                            <li className="text-amber-600 font-medium">
                                                <strong>Tab Switching:</strong> Strictly PROHIBITED. Test may auto-submit if you switch tabs.
                                            </li>
                                        )}

                                        {test.settings.force_fullscreen && (
                                            <li className="text-red-600 font-medium">
                                                <strong>Full Screen:</strong> Mandatory. Exiting full screen may submit the test.
                                            </li>
                                        )}

                                        {test.settings.show_results_immediate === false && (
                                            <li><strong>Result Visibility:</strong> Score/Result will NOT be shown immediately after submission.</li>
                                        )}

                                        {test.settings.strict_timer && (
                                            <li><strong>Timer:</strong> Synchronized with Server Time.</li>
                                        )}

                                        {test.settings.shuffle_questions && (
                                            <li><strong>Randomization:</strong> Questions are randomized for each candidate.</li>
                                        )}
                                    </ul>
                                </>
                            )}
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
                                    {test.settings.start_form.fields.map((field: any, idx: number) => (
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
