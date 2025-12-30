import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
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
import { Trash2, Download, Loader2, ArrowUpDown, Info } from 'lucide-react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
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
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRank, setShowRank] = useState(false);

    useEffect(() => {
        if (test?.id) {
            fetchResults();
        }
    }, [test]);

    const fetchResults = async () => {
        setLoading(true);
        try {
            // Fetch attempts for this test
            // We join with user metadata ideally, but for now we might rely on ID or simple join
            const { data, error } = await supabase
                .from('user_tests')
                .select('*')
                .eq('test_id', test.id)
                .order('score', { ascending: false });

            if (error) throw error;

            // Should probably fetch user names if not included? 
            // For MVP assuming we might not have easy join access without View, 
            // let's try to fetch user profiles or just show IDs/Time.
            // Actually, let's fetch profiles if we can.
            const userIds = Array.from(new Set(data.map(d => d.user_id)));
            if (userIds.length > 0) {
                const { data: users } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
                if (users) {
                    const userMap = new Map(users.map(u => [u.id, u]));
                    data.forEach(d => {
                        d.user = userMap.get(d.user_id);
                    });
                }
            }

            setResults(data);
        } catch (error) {
            console.error("Error fetching results", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (attemptId: string) => {
        if (!confirm('Are you sure you want to delete this result? This action cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('user_tests')
                .delete()
                .eq('id', attemptId);

            if (error) throw error;

            setResults(prev => prev.filter(r => r.id !== attemptId));
            toast.success('Result deleted successfully');
        } catch (error) {
            console.error('Error deleting result:', error);
            toast.error('Failed to delete result');
        }
    };

    const getSortedResults = (data: any[]) => {
        if (!showRank) {
            // Default: Submission Time (Decreasing - Latest first)
            return [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        return [...data].sort((a, b) => {
            // 1. Score (Decreasing)
            if (b.score !== a.score) {
                return b.score - a.score;
            }

            const statsA = a.metadata?.stats || { wrongCount: 0, unattemptedCount: 0 };
            const statsB = b.metadata?.stats || { wrongCount: 0, unattemptedCount: 0 };

            // 2. Incorrect Questions (Increasing - fewer is better)
            if (statsA.wrongCount !== statsB.wrongCount) {
                return statsA.wrongCount - statsB.wrongCount;
            }

            // 3. Skipped Questions (Increasing - fewer is better)
            if (statsA.unattemptedCount !== statsB.unattemptedCount) {
                return statsA.unattemptedCount - statsB.unattemptedCount;
            }

            // 4. Submission Time (Increasing - earlier is better for Rank)
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            if (timeA !== timeB) {
                return timeA - timeB;
            }

            // 5. Name (Alphabetical)
            const getName = (obj: any) => {
                const fd = obj.metadata?.startFormData || {};
                const fk = Object.keys(fd);
                const pk = fk.find(k => k.toLowerCase().includes('name')) || fk[0];
                return pk ? (fd[pk] || '') : '';
            };

            const nameA = getName(a).toLowerCase();
            const nameB = getName(b).toLowerCase();
            return nameA.localeCompare(nameB);
        });
    };

    const displayedResults = getSortedResults(results);

    const downloadCSV = () => {
        // 1. Identify all unique Start Form Keys dynamically
        const startFormKeys = new Set<string>();
        displayedResults.forEach(r => {
            if (r.metadata?.startFormData) {
                Object.keys(r.metadata.startFormData).forEach(k => startFormKeys.add(k));
            }
        });

        let dynamicHeaders = Array.from(startFormKeys);

        // 2. Intelligence Sorting
        dynamicHeaders.sort((a, b) => {
            const aLower = a.toLowerCase();
            const bLower = b.toLowerCase();

            const aName = aLower.includes('name');
            const bName = bLower.includes('name');
            if (aName && !bName) return -1;
            if (!aName && bName) return 1;

            const aRoll = aLower.includes('roll');
            const bRoll = bLower.includes('roll');
            if (aRoll && !bRoll) return -1;
            if (!aRoll && bRoll) return 1;

            return a.localeCompare(b);
        });

        // 3. Define Final Headers
        const headers = [];
        if (showRank) headers.push("Rank");
        headers.push(...dynamicHeaders);
        headers.push(
            "Date",
            "Time",
            "Total Marks",
            "Correct",
            "Wrong",
            "Unattempted",
            "+ve Score",
            "-ve Score",
            "Final Score"
        );

        const rows = displayedResults.map((r, index) => {
            const stats = r.metadata?.stats || {};
            const formData = r.metadata?.startFormData || {};
            const dateObj = new Date(r.created_at);
            const formValues = dynamicHeaders.map(key => formData[key] || '');

            const rowData = [];
            if (showRank) rowData.push(index + 1);

            rowData.push(
                ...formValues,
                format(dateObj, 'yyyy-MM-dd'),
                format(dateObj, 'hh:mm:ss a'),
                test.questions.length * (test.marks_per_question || 4),
                stats.correctCount || 0,
                stats.wrongCount || 0,
                stats.unattemptedCount || 0,
                stats.positiveScore || 0,
                stats.negativeScore || 0,
                r.score
            );
            return rowData;
        });

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${test.title}_results${showRank ? '_ranked' : ''}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ... existing imports

    return (
        <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-[800px] sm:w-[640px] overflow-y-auto sm:max-w-xl">
                <SheetHeader className="mb-6">
                    <SheetTitle>Test Results: {test.title}</SheetTitle>
                    <SheetDescription>
                        View all submissions for this test.
                    </SheetDescription>
                    <div className="flex justify-end pt-2">
                        <Button size="sm" variant="outline" onClick={downloadCSV} disabled={results.length === 0}>
                            <Download className="w-4 h-4 mr-2" /> Export CSV
                        </Button>
                    </div>
                </SheetHeader>

                <div className="flex items-center space-x-2 px-1 mb-4">
                    <Switch
                        id="rank-mode"
                        checked={showRank}
                        onCheckedChange={setShowRank}
                    />
                    <Label htmlFor="rank-mode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Rank Mode (Sort by Merit)
                    </Label>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[300px] p-4">
                                <p className="font-semibold mb-2">Rank Logic:</p>
                                <ol className="list-decimal list-inside space-y-1 text-xs">
                                    <li>Score (Highest first)</li>
                                    <li>Incorrect Questions (Lowest first)</li>
                                    <li>Skipped Questions (Lowest first)</li>
                                    <li>Submission Time (Earliest first)</li>
                                    <li>Name (Alphabetical)</li>
                                </ol>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>



                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {showRank && <TableHead className="w-[60px]">Rank</TableHead>}
                                    <TableHead>Student</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Stats</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayedResults.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={showRank ? 6 : 5} className="text-center py-8 text-muted-foreground">
                                            No submissions yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    displayedResults.map((attempt, index) => (
                                        <TableRow key={attempt.id}>
                                            {showRank && (
                                                <TableCell className="font-bold text-muted-foreground">
                                                    #{index + 1}
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                {(() => {
                                                    // Determine Primary Display Name from Metadata
                                                    const formData = attempt.metadata?.startFormData || {};
                                                    const formKeys = Object.keys(formData);
                                                    const primaryKey = formKeys.find(k => k.toLowerCase().includes('name')) || formKeys[0];
                                                    const primaryValue = primaryKey ? formData[primaryKey] : 'Anonymous Candidate';

                                                    // Remaining details
                                                    const otherDetails = Object.entries(formData).filter(([k]) => k !== primaryKey);

                                                    return (
                                                        <div>
                                                            <div className="font-medium text-base">{primaryValue}</div>
                                                            {/* Hide Auth ID/Email and show only other form data */}
                                                            {otherDetails.length > 0 && (
                                                                <div className="mt-1 text-xs text-slate-500 space-y-0.5">
                                                                    {otherDetails.map(([k, v]) => (
                                                                        <div key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={attempt.score >= (test.questions.length * (test.marks_per_question || 4) * 0.4) ? "default" : "destructive"}>
                                                    {attempt.score} / {test.questions.length * (test.marks_per_question || 4)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {attempt.metadata?.stats ? (
                                                    <div className="space-y-0.5">
                                                        <div className="text-green-600">Correct: {attempt.metadata.stats.correctCount}</div>
                                                        <div className="text-red-600">Wrong: {attempt.metadata.stats.wrongCount}</div>
                                                        <div className="text-gray-500">Skip: {attempt.metadata.stats.unattemptedCount}</div>
                                                    </div>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {format(new Date(attempt.created_at), 'MMM d, p')}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDelete(attempt.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
