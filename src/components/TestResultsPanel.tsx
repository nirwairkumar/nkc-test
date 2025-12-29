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
import { Loader2, Download } from 'lucide-react';
import { format } from 'date-fns';

interface TestResultsPanelProps {
    test: any;
    onClose: () => void;
}

export default function TestResultsPanel({ test, onClose }: TestResultsPanelProps) {
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    const downloadCSV = () => {
        // 1. Identify all unique Start Form Keys dynamically
        const startFormKeys = new Set<string>();
        results.forEach(r => {
            if (r.metadata?.startFormData) {
                Object.keys(r.metadata.startFormData).forEach(k => startFormKeys.add(k));
            }
        });

        let dynamicHeaders = Array.from(startFormKeys);

        // 2. Intelligence Sorting: Name first, then Roll/Id, then others alphabetical
        dynamicHeaders.sort((a, b) => {
            const aLower = a.toLowerCase();
            const bLower = b.toLowerCase();

            // Priority 1: Name contains "name"
            const aName = aLower.includes('name');
            const bName = bLower.includes('name');
            if (aName && !bName) return -1;
            if (!aName && bName) return 1;

            // Priority 2: Roll contains "roll"
            const aRoll = aLower.includes('roll');
            const bRoll = bLower.includes('roll');
            if (aRoll && !bRoll) return -1;
            if (!aRoll && bRoll) return 1;

            return a.localeCompare(b);
        });

        // 3. Define Final Headers Order
        // User Request: Form Input -> Date -> Time -> Total Marks -> Correct -> Wrong -> Unattempted -> +ve -> -ve -> Final Score
        const headers = [
            ...dynamicHeaders,
            "Date",
            "Time",
            "Total Marks",
            "Correct",
            "Wrong",
            "Unattempted",
            "+ve Score",
            "-ve Score",
            "Final Score"
        ];

        const rows = results.map(r => {
            const stats = r.metadata?.stats || {};
            const formData = r.metadata?.startFormData || {};
            const dateObj = new Date(r.created_at);

            // Dynamic Form Data Values
            const formValues = dynamicHeaders.map(key => formData[key] || '');

            return [
                ...formValues,
                format(dateObj, 'yyyy-MM-dd'),          // Date
                format(dateObj, 'hh:mm:ss a'),          // Time
                test.questions.length * (test.marks_per_question || 4), // Total Marks
                stats.correctCount || 0,
                stats.wrongCount || 0,
                stats.unattemptedCount || 0,
                stats.positiveScore || 0,
                stats.negativeScore || 0,
                r.score                                 // Final Score
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${test.title}_results.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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

                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Stats</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No submissions yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    results.map((attempt) => (
                                        <TableRow key={attempt.id}>
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
