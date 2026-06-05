import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAttemptsForTest, deleteAttempt, deleteRegistration } from '@/lib/attemptsApi';
import { fetchUsersByIds } from '@/lib/usersApi';
import { fetchTestById } from '@/lib/testsApi';
import * as XLSX from 'xlsx';
import {
    Sheet,
    SheetContent,
} from "@/components/ui/sheet";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import {
    Trash2, Download, Loader2, Info, Users, Trophy, BarChart3,
    CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface TestResultsPanelProps {
    test: any;
    onClose: () => void;
}

export default function TestResultsPanel({ test, onClose }: TestResultsPanelProps) {
    const { isAdmin, isPremium } = useAuth();
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRank, setShowRank] = useState(false);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [fullTest, setFullTest] = useState<any>(null);

    // Fetch results and full test details on load
    useEffect(() => {
        if (test?.id) {
            setFullTest(null);
            fetchResultsAndTestDetails();
        }
    }, [test]);

    const fetchResultsAndTestDetails = async () => {
        setLoading(true);
        try {
            // Fetch attempts
            const { data: attemptsData, error: attemptsError } = await fetchAttemptsForTest(test.id);
            if (attemptsError) throw attemptsError;

            // Fetch full test details including questions and sections
            const { data: testData, error: testError } = await fetchTestById(test.id);
            if (testError) throw testError;
            if (testData) {
                setFullTest(testData);
            }

            const attempts = attemptsData || [];
            const userIds = Array.from(new Set(attempts.map((d: any) => d.user_id))) as string[];
            if (userIds.length > 0) {
                const { data: users } = await fetchUsersByIds(userIds);
                if (users) {
                    const userMap = new Map(users.map((u: any) => [u.id, u]));
                    attempts.forEach((d: any) => { d.user = userMap.get(d.user_id); });
                }
            }
            setResults(attempts);
        } catch (error) {
            console.error("Error fetching results or test details", error);
        } finally {
            setLoading(false);
        }
    };

    // Use fullTest if loaded, otherwise fall back to test prop
    const currentTest = fullTest || test;

    // Only show conduct-exam results if this test has conduct settings
    const isConductTest = !!(currentTest?.settings?.conduct_exam);

    // Calculate Total Marks
    let totalMaxMarks = currentTest?.total_max_marks || 0;
    if (currentTest && !totalMaxMarks) {
        if (currentTest.enable_section_mode && currentTest.sections) {
            currentTest.sections.forEach((sec: any) => {
                if (sec.questions) {
                    sec.questions.forEach((q: any) => {
                        const m = q.marks !== undefined ? parseFloat(q.marks) : (sec.marks_per_question ? parseFloat(sec.marks_per_question) : 4);
                        totalMaxMarks += isNaN(m) ? 0 : m;
                    });
                }
            });
        } else if (currentTest.questions) {
            currentTest.questions.forEach((q: any) => {
                const m = q.marks !== undefined ? parseFloat(q.marks) : (currentTest.marks_per_question ? parseFloat(currentTest.marks_per_question) : 4);
                totalMaxMarks += isNaN(m) ? 0 : m;
            });
        }
    }

    // For conduct-exam tests: only show attempts tagged with conduct_exam=true
    const filteredResults = isConductTest
        ? results.filter((r) => r.metadata?.conduct_exam === true)
        : results;

    const handleDelete = async (attemptId: string, userId: string) => {
        if (!confirm('Delete this result? The student will be able to re-attempt.')) return;
        try {
            const { error: attemptError } = await deleteAttempt(attemptId);
            if (attemptError) throw attemptError;
            await deleteRegistration(currentTest.id, userId).catch(() => { });
            setResults(prev => prev.filter(r => r.id !== attemptId));
            toast.success('Result deleted. Student can re-attempt.');
        } catch (error) {
            toast.error('Failed to delete result');
        }
    };

    const getSortedResults = (data: any[]) => {
        if (!showRank) {
            return [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        return [...data].sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            const sA = a.metadata?.stats || { wrongCount: 0, unattemptedCount: 0 };
            const sB = b.metadata?.stats || { wrongCount: 0, unattemptedCount: 0 };
            if (sA.wrongCount !== sB.wrongCount) return sA.wrongCount - sB.wrongCount;
            if (sA.unattemptedCount !== sB.unattemptedCount) return sA.unattemptedCount - sB.unattemptedCount;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
    };

    const displayedResults = getSortedResults(filteredResults);

    // Computed stats
    const avgScore = displayedResults.length > 0
        ? displayedResults.reduce((s, r) => s + (r.score || 0), 0) / displayedResults.length
        : 0;
    const topScore = displayedResults.length > 0
        ? Math.max(...displayedResults.map(r => r.score || 0))
        : 0;
    const isStartFormEnabled = !!currentTest?.settings?.start_form?.enabled;
    const configuredFormLabels = (currentTest?.settings?.start_form?.fields || []).map((f: any) => f?.label).filter(Boolean);

    const getDisplayName = (attempt: any) => {
        if (isStartFormEnabled && configuredFormLabels.length > 0) {
            const firstLabel = configuredFormLabels[0];
            if (attempt.metadata?.startFormData?.[firstLabel] !== undefined && attempt.metadata?.startFormData?.[firstLabel] !== null) {
                return String(attempt.metadata.startFormData[firstLabel]);
            }
        }
        const formData = attempt.metadata?.startFormData || {};
        const formKeys = Object.keys(formData);
        const pk = formKeys.find(k => k.toLowerCase().includes('name')) || (formKeys.length > 0 ? formKeys[0] : null);
        if (pk && formData[pk]) return String(formData[pk]);
        if (isAdmin && attempt.user?.full_name) return attempt.user.full_name;
        if (isAdmin && attempt.user?.email) return attempt.user.email;
        return 'Anonymous Candidate';
    };

    const getOtherDetails = (attempt: any) => {
        if (isStartFormEnabled) {
            const formData = attempt.metadata?.startFormData || {};
            return Object.entries(formData).filter(([k]) => !configuredFormLabels.includes(k));
        }
        const formData = attempt.metadata?.startFormData || {};
        const formKeys = Object.keys(formData);
        const pk = formKeys.find(k => k.toLowerCase().includes('name')) || (formKeys.length > 0 ? formKeys[0] : null);
        return Object.entries(formData).filter(([k]) => k !== pk);
    };

    const downloadExcel = () => {
        if (!isAdmin && !isPremium) {
            toast.error("Exporting results to Excel is a premium feature.");
            return;
        }

        const hasSections = !!(currentTest?.enable_section_mode && currentTest?.sections && currentTest?.sections.length > 0);

        // Define start form labels / dynamic headers
        const startFormKeys = new Set<string>();
        displayedResults.forEach(r => {
            if (r.metadata?.startFormData) {
                Object.keys(r.metadata.startFormData).forEach(k => startFormKeys.add(k));
            }
        });

        let dynamicHeaders = Array.from(startFormKeys);
        if (isStartFormEnabled && configuredFormLabels.length > 0) {
            dynamicHeaders = [...configuredFormLabels];
            startFormKeys.forEach(k => {
                if (!dynamicHeaders.includes(k)) dynamicHeaders.push(k);
            });
        } else {
            dynamicHeaders.sort((a, b) => {
                const al = a.toLowerCase(), bl = b.toLowerCase();
                if (al.includes('name') && !bl.includes('name')) return -1;
                if (!al.includes('name') && bl.includes('name')) return 1;
                if (al.includes('roll') && !bl.includes('roll')) return -1;
                if (!al.includes('roll') && bl.includes('roll')) return 1;
                return a.localeCompare(b);
            });
        }

        // Base Candidate details
        const baseHeaders: string[] = [];
        if (showRank) baseHeaders.push("Rank");
        if (isStartFormEnabled) {
            baseHeaders.push(...configuredFormLabels);
            if (isAdmin) baseHeaders.push("Email");
        } else {
            if (isAdmin) baseHeaders.push("Profile Name", "Email");
            baseHeaders.push(...dynamicHeaders);
        }
        baseHeaders.push("Date", "Time");

        let headerRow1: string[] = [];
        let headerRow2: string[] = [];
        let flatHeaders: string[] = [];

        const parseFractionOrFloat = (value: string | number | undefined | null, defaultVal: number = 0): number => {
            if (value === undefined || value === null || value === '') return defaultVal;
            if (typeof value === 'number') return value;
            try {
                const valStr = String(value).trim();
                if (valStr.includes('/')) {
                    const parts = valStr.split('/');
                    if (parts.length === 2) {
                        const numerator = parseFloat(parts[0]);
                        const denominator = parseFloat(parts[1]);
                        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
                            return numerator / denominator;
                        }
                    }
                }
                const parsed = parseFloat(valStr);
                return isNaN(parsed) ? defaultVal : parsed;
            } catch (e) {
                return defaultVal;
            }
        };

        // Helper to evaluate marks per question for correct / negative
        const testMarksPerQ = parseFractionOrFloat(currentTest?.marks_per_question, 4);
        const testNegativeMarks = parseFractionOrFloat(currentTest?.negative_marks, 1);

        const getCorrectAnswerDisplay = (q: any) => {
            if (q.correctAnswer === undefined || q.correctAnswer === null) return '';
            if (q.type === 'numerical' && typeof q.correctAnswer === 'object' && 'min' in q.correctAnswer && 'max' in q.correctAnswer) {
                return `[${q.correctAnswer.min}, ${q.correctAnswer.max}]`;
            }
            if (Array.isArray(q.correctAnswer)) {
                return q.correctAnswer.map(String).sort().join(",");
            }
            return String(q.correctAnswer);
        };

        const getQuestionResult = (q: any, userAns: any, defaultMarks: number, defaultNeg: number) => {
            const maxScore = parseFractionOrFloat(q.marks, defaultMarks);
            const negScore = parseFractionOrFloat(q.negativeMarks, defaultNeg);

            if (
                userAns === undefined ||
                userAns === null ||
                userAns === '' ||
                (Array.isArray(userAns) && userAns.length === 0)
            ) {
                return { status: "Unattempted", score: 0, userAnswer: "N/A", correctAnswer: getCorrectAnswerDisplay(q) };
            }

            const isMulti = q.type === 'multiple' || Array.isArray(q.correctAnswer);
            const userAnsStr = Array.isArray(userAns) ? userAns.map(String).sort().join(",") : String(userAns);
            const correctAnsStr = getCorrectAnswerDisplay(q);

            if (isMulti) {
                const correctSet = new Set((Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer]).map(String));
                const userList = Array.isArray(userAns) ? userAns.map(String) : [String(userAns)];
                const isCorrect = userList.length === correctSet.size && userList.every(v => correctSet.has(v));
                if (isCorrect) {
                    return { status: "Correct", score: maxScore, userAnswer: userAnsStr, correctAnswer: correctAnsStr };
                }
                const partialEnabled = !!q.enable_partial_marks;
                if (partialEnabled) {
                    const incorrectCount = userList.filter(v => !correctSet.has(v)).length;
                    if (incorrectCount === 0 && userList.length > 0) {
                        const correctCount = userList.length;
                        const partialMark = q.partial_marks_per_option !== undefined ? parseFloat(String(q.partial_marks_per_option)) : 1;
                        const earned = correctCount * partialMark;
                        return { status: "Partial", score: earned, userAnswer: userAnsStr, correctAnswer: correctAnsStr };
                    }
                }
                return { status: "Wrong", score: -negScore, userAnswer: userAnsStr, correctAnswer: correctAnsStr };
            } else if (q.type === 'numerical') {
                let isCorrect = false;
                const userNum = parseFloat(String(userAns));
                if (q.correctAnswer && typeof q.correctAnswer === 'object' && 'min' in q.correctAnswer && 'max' in q.correctAnswer) {
                    const minVal = parseFloat(String(q.correctAnswer.min));
                    const maxVal = parseFloat(String(q.correctAnswer.max));
                    if (!isNaN(userNum) && !isNaN(minVal) && !isNaN(maxVal)) {
                        isCorrect = userNum >= minVal && userNum <= maxVal;
                    }
                } else {
                    const corrNum = parseFloat(String(q.correctAnswer));
                    if (!isNaN(userNum) && !isNaN(corrNum)) {
                        isCorrect = userNum === corrNum;
                    } else {
                        isCorrect = String(userAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
                    }
                }
                if (isCorrect) {
                    return { status: "Correct", score: maxScore, userAnswer: userAnsStr, correctAnswer: correctAnsStr };
                }
                return { status: "Wrong", score: -negScore, userAnswer: userAnsStr, correctAnswer: correctAnsStr };
            } else {
                const isCorrect = String(userAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
                if (isCorrect) {
                    return { status: "Correct", score: maxScore, userAnswer: userAnsStr, correctAnswer: correctAnsStr };
                }
                return { status: "Wrong", score: -negScore, userAnswer: userAnsStr, correctAnswer: correctAnsStr };
            }
        };

        if (hasSections) {
            // Header Row 1: Merge labels
            headerRow1 = [...baseHeaders];
            // Header Row 2: Empty fillers for base columns
            headerRow2 = baseHeaders.map(() => "");

            // Sections loop
            (currentTest?.sections || []).forEach((sec: any) => {
                headerRow1.push(sec.name, "", "", "");
                headerRow2.push("Correct", "Wrong", "Marks (-ve)", "Marks (+ve)");
            });

            // Overall Summary merge headers
            headerRow1.push("Overall Summary", "", "", "", "", "", "", "");
            headerRow2.push(
                "Total Questions",
                "Total Correct",
                "Total Incorrect",
                "Total +ve Score",
                "Total -ve Score",
                "Total Partial Mark",
                "Final Score",
                "Percentage"
            );
        } else {
            flatHeaders = [...baseHeaders];
            flatHeaders.push(
                "Total Questions",
                "Total Correct",
                "Total Incorrect",
                "Total +ve Score",
                "Total -ve Score",
                "Total Partial Mark",
                "Final Score",
                "Percentage"
            );

            // Append per-question detail columns for flat tests
            const questions = currentTest?.questions || [];
            questions.forEach((q: any, qIdx: number) => {
                const label = q.title ? `Q${qIdx + 1}: ${q.title}` : `Q${qIdx + 1}`;
                flatHeaders.push(`${label} (Student Ans)`, `${label} (Correct Ans)`, `${label} (Status)`, `${label} (Score)`);
            });
        }

        const rows = displayedResults.map((attempt, index) => {
            const formData = attempt.metadata?.startFormData || {};
            const dateObj = new Date(attempt.created_at);
            const userAnswers = attempt.answers || {};

            const rowData: any[] = [];
            if (showRank) rowData.push(index + 1);

            if (isStartFormEnabled) {
                configuredFormLabels.forEach((label: string) => {
                    rowData.push(formData[label] !== undefined ? String(formData[label]) : 'N/A');
                });
                if (isAdmin) rowData.push(attempt.user?.email || 'N/A');
            } else {
                if (isAdmin) rowData.push(attempt.user?.full_name || 'N/A', attempt.user?.email || 'N/A');
                dynamicHeaders.forEach(k => {
                    rowData.push(formData[k] !== undefined ? String(formData[k]) : '');
                });
            }

            rowData.push(format(dateObj, 'yyyy-MM-dd'), format(dateObj, 'hh:mm:ss a'));

            let overallQuestions = 0;
            let overallCorrect = 0;
            let overallIncorrect = 0;
            let overallPositive = 0;
            let overallNegative = 0;
            let overallPartialMark = 0;

            if (hasSections) {
                (currentTest?.sections || []).forEach((sec: any) => {
                    let secCorrect = 0;
                    let secWrong = 0;
                    let secNegativeScore = 0;
                    let secPositiveScore = 0;
                    const secMarksPerQ = parseFractionOrFloat(sec.marks_per_question, testMarksPerQ);
                    const secNegativeMarks = parseFractionOrFloat(sec.negative_marks, testNegativeMarks);

                    const secQuestions = sec.questions || [];
                    secQuestions.forEach((q: any) => {
                        const userAns = userAnswers[q.id];
                        const res = getQuestionResult(q, userAns, secMarksPerQ, secNegativeMarks);

                        if (res.status === "Correct") {
                            secCorrect++;
                            secPositiveScore += res.score;
                            overallCorrect++;
                            overallPositive += res.score;
                        } else if (res.status === "Wrong") {
                            secWrong++;
                            secNegativeScore += Math.abs(res.score);
                            overallIncorrect++;
                            overallNegative += Math.abs(res.score);
                        } else if (res.status === "Partial") {
                            secCorrect++;
                            secPositiveScore += res.score;
                            overallCorrect++;
                            overallPartialMark += res.score;
                            overallPositive += res.score;
                        }
                        overallQuestions++;
                    });

                    rowData.push(
                        secCorrect,
                        secWrong,
                        parseFloat(secNegativeScore.toFixed(3)),
                        parseFloat(secPositiveScore.toFixed(3))
                    );
                });

                const finalScore = parseFloat((overallPositive - overallNegative).toFixed(3));
                const percentage = totalMaxMarks > 0 ? parseFloat(((finalScore / totalMaxMarks) * 100).toFixed(3)) : 0;

                rowData.push(
                    overallQuestions,
                    overallCorrect,
                    overallIncorrect,
                    parseFloat(overallPositive.toFixed(3)),
                    parseFloat(overallNegative.toFixed(3)),
                    parseFloat(overallPartialMark.toFixed(3)),
                    finalScore,
                    percentage
                );

            } else {
                const questions = currentTest?.questions || [];
                const questionDetailsList: any[] = [];

                questions.forEach((q: any) => {
                    const userAns = userAnswers[q.id];
                    const res = getQuestionResult(q, userAns, testMarksPerQ, testNegativeMarks);

                    if (res.status === "Correct") {
                        overallCorrect++;
                        overallPositive += res.score;
                    } else if (res.status === "Wrong") {
                        overallIncorrect++;
                        overallNegative += Math.abs(res.score);
                    } else if (res.status === "Partial") {
                        overallCorrect++;
                        overallPartialMark += res.score;
                        overallPositive += res.score;
                    }
                    overallQuestions++;

                    questionDetailsList.push(
                        res.userAnswer,
                        res.correctAnswer,
                        res.status,
                        parseFloat(res.score.toFixed(3))
                    );
                });

                const finalScore = parseFloat((overallPositive - overallNegative).toFixed(3));
                const percentage = totalMaxMarks > 0 ? parseFloat(((finalScore / totalMaxMarks) * 100).toFixed(3)) : 0;

                rowData.push(
                    overallQuestions,
                    overallCorrect,
                    overallIncorrect,
                    parseFloat(overallPositive.toFixed(3)),
                    parseFloat(overallNegative.toFixed(3)),
                    parseFloat(overallPartialMark.toFixed(3)),
                    finalScore,
                    percentage,
                    ...questionDetailsList
                );
            }

            return rowData;
        });

        // Create Excel Workbook
        const sheetData = [];
        if (hasSections) {
            sheetData.push(headerRow1);
            sheetData.push(headerRow2);
        } else {
            sheetData.push(flatHeaders);
        }
        rows.forEach(row => sheetData.push(row));

        const ws = XLSX.utils.aoa_to_sheet(sheetData);

        if (hasSections) {
            const merges: any[] = [];

            // Merge base columns vertically (from row 0 to row 1)
            for (let i = 0; i < baseHeaders.length; i++) {
                merges.push({
                    s: { r: 0, c: i },
                    e: { r: 1, c: i }
                });
            }

            // Merge section headers horizontally (across 4 columns)
            let currentCol = baseHeaders.length;
            (currentTest?.sections || []).forEach((sec: any) => {
                merges.push({
                    s: { r: 0, c: currentCol },
                    e: { r: 0, c: currentCol + 3 }
                });
                currentCol += 4;
            });

            // Merge Overall Summary header horizontally (across 8 columns)
            merges.push({
                s: { r: 0, c: currentCol },
                e: { r: 0, c: currentCol + 7 }
            });

            ws['!merges'] = merges;
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Test Results");
        XLSX.writeFile(wb, `${currentTest?.title || 'test'}_results${showRank ? '_ranked' : ''}.xlsx`);
    };

    return (
        <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-full sm:max-w-full md:max-w-4xl p-0 flex flex-col overflow-hidden">

                {/* ── Compact Header ── */}
                <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-4 pt-5 pb-4 flex-shrink-0">
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    {/* Title */}
                    <div className="pr-8">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">Test Results</p>
                        <h3 className="text-base font-bold text-white leading-tight line-clamp-2">
                            {currentTest.title}
                        </h3>
                    </div>

                    {/* Conduct badge */}
                    {isConductTest && (
                        <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full px-2.5 py-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wide">Conduct Exam Results</span>
                        </div>
                    )}

                    {/* Stats row */}
                    {!loading && (
                        <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="bg-white/10 rounded-lg px-2.5 py-2 text-center">
                                <div className="flex items-center justify-center gap-1 mb-0.5">
                                    <Users className="h-3 w-3 text-slate-300" />
                                </div>
                                <p className="text-lg font-black text-white leading-none">{displayedResults.length}</p>
                                <p className="text-[9px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">Submitted</p>
                            </div>
                            <div className="bg-white/10 rounded-lg px-2.5 py-2 text-center">
                                <div className="flex items-center justify-center gap-1 mb-0.5">
                                    <Trophy className="h-3 w-3 text-yellow-400" />
                                </div>
                                <p className="text-lg font-black text-yellow-300 leading-none">{topScore.toFixed(1)}</p>
                                <p className="text-[9px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">Top Score</p>
                            </div>
                            <div className="bg-white/10 rounded-lg px-2.5 py-2 text-center">
                                <div className="flex items-center justify-center gap-1 mb-0.5">
                                    <BarChart3 className="h-3 w-3 text-emerald-400" />
                                </div>
                                <p className="text-lg font-black text-emerald-300 leading-none">{avgScore.toFixed(1)}</p>
                                <p className="text-[9px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">Average</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Controls Bar ── */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b bg-slate-50/50 dark:bg-slate-900/30 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Switch id="rank-mode" checked={showRank} onCheckedChange={setShowRank} className="scale-90" />
                        <Label htmlFor="rank-mode" className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-none cursor-pointer">
                            Rank Mode
                        </Label>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-[260px] p-3">
                                    <p className="font-bold text-[11px] mb-1.5">Rank by Merit:</p>
                                    <ol className="list-decimal list-inside space-y-0.5 text-[10px] text-muted-foreground">
                                        <li>Score (highest first)</li>
                                        <li>Incorrect (fewest first)</li>
                                        <li>Skipped (fewest first)</li>
                                        <li>Submission time (earliest first)</li>
                                    </ol>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <Button
                        size="sm"
                        variant="outline"
                        onClick={downloadExcel}
                        disabled={displayedResults.length === 0}
                        className="h-7 text-[11px] px-2.5 gap-1.5 font-semibold"
                    >
                        <Download className="w-3 h-3" />
                        Excel
                    </Button>
                </div>

                {/* ── Results List ── */}
                <div className="flex-1 overflow-y-auto">
                    {loading || !fullTest ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
                            <p className="text-xs text-slate-400 font-medium">Fetching results...</p>
                        </div>
                    ) : displayedResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Users className="h-5 w-5 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No submissions yet</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {isConductTest ? 'No conduct-exam attempts recorded.' : 'Students haven\'t attempted this test yet.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card View */}
                            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                                {displayedResults.map((attempt, index) => {
                                    const name = getDisplayName(attempt);
                                    const others = getOtherDetails(attempt);
                                    const stats = attempt.metadata?.stats;
                                    const pct = totalMaxMarks > 0 ? ((attempt.score / totalMaxMarks) * 100).toFixed(0) : null;
                                    const isGood = attempt.score >= (totalMaxMarks * 0.4);
                                    const isExpanded = expandedCard === attempt.id;

                                    return (
                                        <div key={attempt.id} className="px-4 py-3 bg-white dark:bg-slate-900">
                                            <div className="flex items-start gap-3">
                                                {/* Rank / Avatar */}
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800 flex items-center justify-center">
                                                    {showRank ? (
                                                        <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300">#{index + 1}</span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                                                            {String(name || 'A').charAt(0).toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Main info */}
                                                <div className="flex-1 min-w-0 space-y-0.5">
                                                    {isStartFormEnabled ? (
                                                        configuredFormLabels.map((label: string) => {
                                                            const value = attempt.metadata?.startFormData?.[label] || 'N/A';
                                                            return (
                                                                <p key={label} className="text-xs text-slate-800 dark:text-slate-200">
                                                                    <span className="font-bold">{label}:</span> {String(value)}
                                                                </p>
                                                            );
                                                        })
                                                    ) : (
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{name}</p>
                                                    )}
                                                    {isAdmin && attempt.user?.email && (
                                                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{attempt.user.email}</p>
                                                    )}
                                                    {!isStartFormEnabled && others.length > 0 && (
                                                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                                            {others.map(([k, v]) => `${k}: ${v}`).join(' · ')}
                                                        </p>
                                                    )}
                                                </div>
                                                
                                                {/* Score badge */}
                                                <div className="flex-shrink-0 text-right">
                                                    <div className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black ${isGood ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                        {attempt.score}
                                                        {totalMaxMarks > 0 && <span className="opacity-60 font-normal ml-0.5">/{totalMaxMarks}</span>}
                                                    </div>
                                                    {pct && (
                                                        <p className="text-[9px] text-slate-400 text-right mt-0.5">{pct}%</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Stats pills row */}
                                            {stats && (
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                                                        <CheckCircle2 className="h-2.5 w-2.5" />{stats.correctCount ?? '-'}
                                                    </span>
                                                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-500">
                                                        <XCircle className="h-2.5 w-2.5" />{stats.wrongCount ?? '-'}
                                                    </span>
                                                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-slate-400">
                                                        <Clock className="h-2.5 w-2.5" />{stats.unattemptedCount ?? '-'}
                                                    </span>
                                                    <span className="ml-auto text-[10px] text-slate-400">
                                                        {format(new Date(attempt.created_at), 'MMM d, p')}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Action row */}
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                                                <button
                                                    className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                                                    onClick={() => setExpandedCard(isExpanded ? null : attempt.id)}
                                                >
                                                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                    {isExpanded ? 'Less' : 'Details'}
                                                </button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-slate-400 hover:text-red-500"
                                                    onClick={() => handleDelete(attempt.id, attempt.user_id)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>

                                            {/* Expanded details */}
                                            {isExpanded && stats && (
                                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg p-2 text-center">
                                                        <p className="text-base font-black text-emerald-600">+{(stats.positiveScore || 0).toFixed(1)}</p>
                                                        <p className="text-[9px] text-slate-500 uppercase tracking-wide">Positive</p>
                                                    </div>
                                                    <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-2 text-center">
                                                        <p className="text-base font-black text-red-500">-{(stats.negativeScore || 0).toFixed(1)}</p>
                                                        <p className="text-[9px] text-slate-500 uppercase tracking-wide">Negative</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table className="min-w-[600px]">
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/80 dark:bg-slate-900/50">
                                            {showRank && <TableHead className="w-[55px] font-bold text-xs">Rank</TableHead>}
                                            <TableHead className="font-bold text-xs">Student</TableHead>
                                            <TableHead className="font-bold text-xs">Score</TableHead>
                                            <TableHead className="font-bold text-xs">Stats</TableHead>
                                            <TableHead className="font-bold text-xs">Date</TableHead>
                                            <TableHead className="w-[44px]" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {displayedResults.map((attempt, index) => {
                                            const name = getDisplayName(attempt);
                                            const others = getOtherDetails(attempt);
                                            const stats = attempt.metadata?.stats;
                                            const isGood = attempt.score >= (totalMaxMarks * 0.4);

                                            return (
                                                <TableRow key={attempt.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                                                    {showRank && (
                                                        <TableCell className="font-bold text-sm text-muted-foreground">
                                                            #{index + 1}
                                                        </TableCell>
                                                    )}
                                                    <TableCell>
                                                        {isStartFormEnabled ? (
                                                            <div className="space-y-0.5">
                                                                {configuredFormLabels.map((label: string) => {
                                                                    const value = attempt.metadata?.startFormData?.[label] || 'N/A';
                                                                    return (
                                                                        <div key={label} className="text-sm">
                                                                            <span className="font-bold text-slate-800 dark:text-slate-100">{label}:</span>{' '}
                                                                            <span className="text-slate-600 dark:text-slate-300">{String(value)}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                                {isAdmin && attempt.user?.email && (
                                                                    <div className="text-xs text-slate-400 mt-1">{attempt.user.email}</div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                                                                    {name}
                                                                </div>
                                                                {isAdmin && attempt.user?.email && (
                                                                    <div className="text-xs text-slate-400">{attempt.user.email}</div>
                                                                )}
                                                                {others.length > 0 && (
                                                                    <div className="text-xs text-slate-400 space-y-0.5 mt-0.5">
                                                                        {others.map(([k, v]) => (
                                                                            <div key={k}><span className="opacity-60">{k}:</span> {String(v)}</div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={isGood ? "default" : "destructive"} className="font-bold text-xs">
                                                            {attempt.score} / {totalMaxMarks}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {stats ? (
                                                            <div className="space-y-0.5">
                                                                <div className="text-emerald-600 font-medium">✓ {stats.correctCount}</div>
                                                                <div className="text-red-500 font-medium">✗ {stats.wrongCount}</div>
                                                                <div className="text-slate-400">— {stats.unattemptedCount}</div>
                                                            </div>
                                                        ) : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {format(new Date(attempt.created_at), 'MMM d, p')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleDelete(attempt.id, attempt.user_id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
