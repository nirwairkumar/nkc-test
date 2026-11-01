/**
 * "Right now" — the operational half of Live Activity.
 * One row per live exam link, ordered by the last submission, so the exam that
 * is actually being sat sits at the top.
 */
import { useQueryClient } from '@tanstack/react-query';
import {
    ChevronDown, Clock3, Copy, ExternalLink, KeyRound, Radio, Square, Users,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { updateTest } from '@/lib/testsApi';
import { cn } from '@/lib/utils';
import { getUserAppUrl } from '@/utils/subdomain';
import { istDateTime, istTime, num, relative } from '../analytics/format';
import { CARD, Chip, Empty, PILL_BTN } from '../analytics/ui';
import type { CodeSitting, LiveExam } from './api';
import { strictness } from './proctoring';

const SIX_HOURS = 6 * 3600 * 1000;

/** A link counts as busy if a paper came in recently, or if it only just went live. */
function isBusy(exam: LiveExam, code?: CodeSitting): boolean {
    if (exam.is_example) return false; // seeded for every account; never an exam someone is running
    if (exam.submissions_60m > 0) return true;
    if (code && code.active_now > 0) return true;
    const fresh = (iso: string | null) => !!iso && Date.now() - new Date(iso).getTime() < SIX_HOURS;
    return fresh(exam.last_submission_at) || fresh(exam.made_live_at);
}

export default function LiveNow({
    live, codeSittings, onInspect, onResults,
}: {
    live: LiveExam[];
    codeSittings: CodeSitting[];
    onInspect: (exam: LiveExam) => void;
    onResults: (exam: LiveExam) => void;
}) {
    const { isAdmin } = useAuth();
    const qc = useQueryClient();
    const [stopping, setStopping] = useState<string | null>(null);
    const [showQuiet, setShowQuiet] = useState(false);

    const codeFor = (exam: LiveExam) => codeSittings.find((c) => c.test_id === exam.id && !c.ended_at);
    const busy = live.filter((e) => isBusy(e, codeFor(e)));
    const quiet = live.filter((e) => !isBusy(e, codeFor(e)));
    const examples = quiet.filter((e) => e.is_example).length;

    const stop = async (exam: LiveExam) => {
        const warning = exam.submissions_60m > 0
            ? `${exam.submissions_60m} paper${exam.submissions_60m === 1 ? ' was' : 's were'} submitted in the last hour — someone may be writing it right now.\n\n`
            : '';
        if (!window.confirm(`${warning}Take "${exam.title}" offline? The link stops working for every candidate immediately.`)) return;
        setStopping(exam.id);
        try {
            const settings = {
                ...(exam.settings || {}),
                conduct_exam: { ...((exam.settings || {}).conduct_exam || {}), enabled: false, ended_at: new Date().toISOString() },
            };
            const { error } = await updateTest(exam.id, { settings }, isAdmin);
            if (error) throw new Error(String(error));
            toast.success(`"${exam.title}" is offline.`);
            qc.invalidateQueries({ queryKey: ['exam-ops'] });
        } catch (err: any) {
            toast.error(`Could not stop the exam: ${err?.message || 'unknown error'}`);
        } finally {
            setStopping(null);
        }
    };

    const copy = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Exam link copied.');
        } catch {
            toast.error('Could not copy the link.');
        }
    };

    if (!live.length) {
        return (
            <div className={cn(CARD)}>
                <Empty icon={Radio} title="Nothing is live">
                    No exam link is open right now. When an educator makes a test live, it appears here within a minute —
                    with its candidate count, so you can tell a real exam from a trial run.
                </Empty>
            </div>
        );
    }

    const row = (exam: LiveExam) => {
        const code = codeFor(exam);
        const url = exam.slug ? getUserAppUrl(`/test/${exam.slug}`) : '';
        const hot = exam.submissions_60m > 0;
        const busyNow = isBusy(exam, code);
        const strict = strictness(exam.settings);
        return (
                    <li key={exam.id} className="px-4 py-3.5 sm:px-5">
                        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em]',
                                        busyNow ? 'text-emerald-700' : 'text-slate-400')}>
                                        <span className="relative flex h-1.5 w-1.5">
                                            {busyNow && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 motion-safe:animate-ping" />}
                                            <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', busyNow ? 'bg-emerald-500' : 'bg-slate-300')} />
                                        </span>
                                        {busyNow ? (exam.is_scheduled ? 'Scheduled · in use' : 'In use') : 'Open'}
                                    </span>
                                    {exam.custom_id && <Chip>#{exam.custom_id}</Chip>}
                                    {code?.join_code && (
                                        <Chip tone="violet" title={`Join code sitting · ${code.joined} joined`}>
                                            <KeyRound className="h-3 w-3" /> {code.join_code}
                                        </Chip>
                                    )}
                                    <Chip tone={strict.tone} title={`${strict.count} proctoring rules on`}>{strict.label}</Chip>
                                    {exam.is_example && <Chip title="The walkthrough test cloned into every new account">Example</Chip>}
                                    {exam.educator?.is_self && <Chip tone="sky">Yours</Chip>}
                                    {exam.educator?.is_team && !exam.educator?.is_self && <Chip tone="sky">Team</Chip>}
                                </div>
                                <p className="mt-1 truncate text-[15px] font-semibold tracking-[-0.01em] text-slate-900" title={exam.title}>
                                    {exam.title}
                                </p>
                                <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
                                    {exam.educator?.name || 'Unknown educator'}
                                    {exam.educator?.email ? ` · ${exam.educator.email}` : ''}
                                </p>
                            </div>

                            <div className="flex shrink-0 items-start gap-5">
                                <Metric label="Last hour" value={num(exam.submissions_60m)} hot={hot} />
                                <Metric label="Today" value={num(exam.submissions_today)} />
                                {code && <Metric label="In exam" value={num(code.active_now)} hot={code.active_now > 0} />}
                            </div>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
                            <span>
                                {exam.made_live_at ? <>Live since <b className="font-semibold text-slate-700">{istDateTime(exam.made_live_at)}</b> ({relative(exam.made_live_at)})</>
                                    : 'Live since an unknown time — the link predates this tracking'}
                            </span>
                            {exam.end_time && <span>Closes <b className="font-semibold text-slate-700">{istTime(exam.end_time)}</b></span>}
                            {exam.last_submission_at && <span>Last paper {relative(exam.last_submission_at)}</span>}
                            {exam.duration ? <span>{exam.duration} min · {exam.total_questions ?? '—'} questions</span> : null}
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => onResults(exam)} className={cn(PILL_BTN, 'h-8 text-[12.5px]')}>
                                <Users className="h-3.5 w-3.5" /> Live results
                            </button>
                            <button type="button" onClick={() => onInspect(exam)} className={cn(PILL_BTN, 'h-8 text-[12.5px]')}>
                                Exam rules
                            </button>
                            {url && (
                                <>
                                    <button type="button" onClick={() => copy(url)} className={cn(PILL_BTN, 'h-8 text-[12.5px]')}>
                                        <Copy className="h-3.5 w-3.5" /> Copy link
                                    </button>
                                    <a href={url} target="_blank" rel="noreferrer" className={cn(PILL_BTN, 'h-8 text-[12.5px]')}>
                                        <ExternalLink className="h-3.5 w-3.5" /> Open
                                    </a>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={() => stop(exam)}
                                disabled={stopping === exam.id}
                                className={cn(PILL_BTN, 'h-8 text-[12.5px] text-rose-700 ring-rose-600/20 hover:bg-rose-50')}
                            >
                                <Square className="h-3 w-3" /> {stopping === exam.id ? 'Stopping…' : 'Take offline'}
                            </button>
                        </div>
                    </li>
        );
    };

    return (
        <div className="space-y-3">
            {busy.length > 0 ? (
                <ul className={cn(CARD, 'divide-y divide-slate-100 overflow-hidden')}>{busy.map(row)}</ul>
            ) : (
                <div className={cn(CARD)}>
                    <Empty icon={Radio} title="No exam is being sat right now">
                        {quiet.length} link{quiet.length === 1 ? ' is' : 's are'} still open, but no paper has arrived in the last six hours.
                    </Empty>
                </div>
            )}

            {quiet.length > 0 && (
                <div className={cn(CARD, 'overflow-hidden')}>
                    <button
                        type="button"
                        onClick={() => setShowQuiet((v) => !v)}
                        aria-expanded={showQuiet}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 sm:px-5"
                    >
                        <Clock3 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-semibold text-slate-900">
                                {quiet.length} link{quiet.length === 1 ? '' : 's'} left open and quiet
                            </span>
                            <span className="block text-[12px] text-slate-500">
                                Still reachable by anyone who has the URL. Close the ones that are finished.
                                {examples > 0 && ` ${examples} ${examples === 1 ? 'is' : 'are'} the example test seeded into new accounts.`}
                            </span>
                        </span>
                        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', showQuiet && 'rotate-180')} aria-hidden="true" />
                    </button>
                    {showQuiet && <ul className="divide-y divide-slate-100 border-t border-slate-100">{quiet.map(row)}</ul>}
                </div>
            )}
        </div>
    );
}

function Metric({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
    return (
        <span className="text-right">
            <span className={cn('block text-[20px] font-semibold leading-none tabular-nums', hot ? 'text-emerald-700' : 'text-slate-900')}>{value}</span>
            <span className="mt-0.5 block whitespace-nowrap text-[11px] text-slate-500">{label}</span>
        </span>
    );
}
