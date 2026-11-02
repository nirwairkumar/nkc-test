import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Clock, Loader2, RefreshCw, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TestoZaLogo from '@/components/TestoZaLogo';
import PoweredByTestoZa from '@/components/PoweredByTestoZa';
import { GuestAttempt, joinApi, problemOf } from '@/lib/examSessionsApi';
import { resultStateFor } from '@/lib/resultIdentity';

/**
 * /join/result → "Use your Guest ID": every exam taken without a login under one Guest ID,
 * laid out like the logged-in Test History page (table on desktop, cards on phones).
 * No delete: results are the examiner's record.
 */
export default function GuestHistory({ guestId, attempts, loading, onRefresh, onBack }: {
    guestId: string;
    attempts: GuestAttempt[];
    loading: boolean;
    onRefresh: () => void;
    onBack: () => void;
}) {
    const navigate = useNavigate();
    const [opening, setOpening] = useState<string | null>(null);

    const open = async (a: GuestAttempt) => {
        if (!a.results_visible || opening) return;
        setOpening(a.attempt_id);
        try {
            const { attempt, test } = await joinApi.guestAttempt(guestId, a.attempt_id);
            navigate('/results', { state: resultStateFor(attempt, test, { candidateId: attempt.user_id }) });
        } catch (err) {
            toast.error(problemOf(err).message || 'Could not open this result.');
        } finally {
            setOpening(null);
        }
    };

    const when = (iso: string | null) => (iso ? format(new Date(iso), 'MMM d, yyyy • p') : '—');

    const score = (a: GuestAttempt) => (
        <Badge variant="secondary" className="font-bold w-fit">
            {Number(a.score ?? 0).toFixed(1)}
            {a.max_marks ? ` / ${a.max_marks}` : ' Marks'}
        </Badge>
    );

    const held = (
        <Badge variant="outline" className="w-fit gap-1 border-amber-300 bg-amber-50 text-amber-800 font-semibold">
            <Clock className="h-3 w-3" /> Result not out yet
        </Badge>
    );

    const resultButton = (a: GuestAttempt, mobile = false) => (
        <Button
            variant={mobile ? 'default' : 'ghost'}
            size="sm"
            className={mobile ? 'flex-1 h-8 text-xs bg-slate-900 hover:bg-primary' : 'h-8 hover:bg-primary/10 hover:text-primary transition-colors'}
            disabled={!a.results_visible || opening === a.attempt_id}
            onClick={() => open(a)}
        >
            {opening === a.attempt_id
                ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                : <Target className="h-4 w-4 mr-1" />}
            {mobile ? 'Full Result' : 'Result'}
        </Button>
    );

    return (
        <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
            <header className="flex h-14 items-center justify-center border-b bg-white">
                <TestoZaLogo size={26} />
            </header>
            <div className="container mx-auto max-w-5xl flex-1 py-3 px-3 sm:py-5 sm:px-4 space-y-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="min-w-0">
                        <p className="text-[12px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-1">
                            Guest ID <span className="font-mono normal-case tracking-normal text-slate-500">{guestId}</span>
                        </p>
                        <p className="text-[20px] font-semibold text-slate-800 tracking-tight leading-tight">Test History</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onBack}>
                            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Another ID
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onRefresh} disabled={loading}>
                            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                        </Button>
                    </div>
                </div>

                {/* Desktop table, like Test History */}
                <Card className="hidden md:block overflow-hidden border-slate-200 shadow-xl shadow-slate-200/50">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                    <TableHead className="w-[45%] font-bold text-foreground">Test Name</TableHead>
                                    <TableHead className="font-bold text-foreground">Date Taken</TableHead>
                                    <TableHead className="font-bold text-foreground">Score</TableHead>
                                    <TableHead className="text-right font-bold text-foreground">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attempts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic bg-slate-50/20">
                                            No tests found for this Guest ID.
                                        </TableCell>
                                    </TableRow>
                                ) : attempts.map(a => (
                                    <TableRow key={a.attempt_id} className="group hover:bg-slate-50/80">
                                        <TableCell className="font-medium">
                                            <span className="font-bold group-hover:text-primary transition-colors">{a.title || 'Test'}</span>
                                            {a.institution_name && <div className="text-[11px] text-slate-500 mt-0.5">{a.institution_name}</div>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center text-slate-500 text-sm">
                                                <Calendar className="mr-2 h-4 w-4 opacity-70" />
                                                {when(a.submitted_at)}
                                            </div>
                                        </TableCell>
                                        <TableCell>{a.results_visible ? score(a) : held}</TableCell>
                                        <TableCell className="text-right">{resultButton(a)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Phone cards, like Test History */}
                <div className="md:hidden space-y-3">
                    {attempts.length === 0 && (
                        <p className="py-16 text-center text-sm text-muted-foreground italic">No tests found for this Guest ID.</p>
                    )}
                    {attempts.map(a => (
                        <div key={a.attempt_id} className="relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-300" />
                            <div className="p-4">
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 text-sm truncate">{a.title || 'Test'}</h3>
                                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                                            <Calendar className="w-3 h-3" />
                                            {when(a.submitted_at)}
                                        </div>
                                    </div>
                                    {a.results_visible ? score(a) : held}
                                </div>
                                <div className="flex gap-2 mt-3">{resultButton(a, true)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <PoweredByTestoZa className="pb-4" />
        </div>
    );
}
