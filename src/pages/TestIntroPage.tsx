import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchTestById, Test } from '@/lib/testsApi';
import { Clock, HelpCircle, AlertTriangle, FileText, CheckCircle, ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
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

export default function TestIntroPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { loading: authLoading } = useAuth();

    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFullScreenDialog, setShowFullScreenDialog] = useState(false);

    useEffect(() => {
        if (id) {
            loadTest(id);
        }
    }, [id]);

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
        setShowFullScreenDialog(true);
    };

    const confirmStartTest = (enableFullScreen: boolean) => {
        setShowFullScreenDialog(false);
        if (enableFullScreen) {
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
                            <li>Ensure you have a stable internet connection before starting.</li>
                            <li>Click "Submit" to finish the test manually, or it will auto-submit when time runs out.</li>
                        </ul>
                    </div>
                </CardContent>
                <CardFooter className="pt-0 pb-4 px-4">
                    <Button size="lg" className="w-full text-lg h-10" onClick={handleStartTest}>
                        Start Test Now
                    </Button>
                </CardFooter>
            </Card>

            <AlertDialog open={showFullScreenDialog} onOpenChange={setShowFullScreenDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Enable Full Screen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            For the best test-taking experience, we recommend enabling full screen mode.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => confirmStartTest(false)}>No, Continue</AlertDialogCancel>
                        <AlertDialogAction onClick={() => confirmStartTest(true)}>Yes, Enable Full Screen</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
