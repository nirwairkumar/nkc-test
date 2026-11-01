/**
 * Sends a campaign from the browser, a few emails per request, so nothing depends on a
 * server job surviving. Stops when the tab closes; History → Resume carries on from there.
 * The server enforces the hourly limit; here we only wait it out and show a countdown.
 */
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, Loader2, Pause, Play, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { num, istTime } from '../analytics/format';
import { emailApi, errorText } from './api';
import { PRIMARY_BTN, SOFT_BTN } from './parts';

export type SenderPhase = 'idle' | 'sending' | 'waiting' | 'paused' | 'done' | 'error';

export interface SenderState {
    phase: SenderPhase;
    sent: number;
    failed: number;
    remaining: number | null;
    errors: string[];
    resumeAt: string | null;
    message: string | null;
}

const IDLE: SenderState = { phase: 'idle', sent: 0, failed: 0, remaining: null, errors: [], resumeAt: null, message: null };

const sleep = (ms: number, stop: () => boolean) =>
    new Promise<void>((resolve) => {
        const end = Date.now() + ms;
        const tick = () => (stop() || Date.now() >= end ? resolve() : setTimeout(tick, 500));
        tick();
    });

export function useSender(campaignId: string | null) {
    const qc = useQueryClient();
    const [s, setS] = useState<SenderState>(IDLE);
    const stopRef = useRef(false);
    const running = useRef(false);

    useEffect(() => () => { stopRef.current = true; }, []);

    const refresh = useCallback(() => {
        qc.invalidateQueries({ queryKey: ['email'] });
    }, [qc]);

    const run = useCallback(async (id: string) => {
        if (running.current) return;
        running.current = true;
        stopRef.current = false;
        setS((p) => ({ ...p, phase: 'sending', message: null, resumeAt: null }));
        try {
            while (!stopRef.current) {
                const step = await emailApi.sendNext(id, 5);
                setS((p) => ({
                    ...p,
                    sent: p.sent + step.sent,
                    failed: p.failed + step.failed,
                    remaining: step.remaining ?? p.remaining,
                    errors: [...p.errors, ...(step.errors ?? [])].slice(-5),
                }));
                if (step.status === 'done') {
                    setS((p) => ({ ...p, phase: 'done', remaining: 0 }));
                    break;
                }
                if (step.status === 'paused') {
                    setS((p) => ({ ...p, phase: 'paused' }));
                    break;
                }
                if (step.status === 'waiting') {
                    const until = step.resume_at ? new Date(step.resume_at).getTime() : Date.now() + 60_000;
                    setS((p) => ({ ...p, phase: 'waiting', resumeAt: step.resume_at ?? null }));
                    await sleep(Math.max(5_000, until - Date.now() + 2_000), () => stopRef.current);
                    if (!stopRef.current) setS((p) => ({ ...p, phase: 'sending', resumeAt: null }));
                    continue;
                }
                await sleep(700, () => stopRef.current);
            }
        } catch (e) {
            setS((p) => ({ ...p, phase: 'error', message: errorText(e, 'Sending stopped. Check Settings, then Resume.') }));
        } finally {
            running.current = false;
            refresh();
        }
    }, [refresh]);

    const start = useCallback((id: string, planned?: number) => {
        setS({ ...IDLE, remaining: planned ?? null });
        void run(id);
    }, [run]);

    const pause = useCallback(async () => {
        stopRef.current = true;
        if (!campaignId) return;
        try {
            await emailApi.setCampaign(campaignId, 'paused');
            setS((p) => ({ ...p, phase: 'paused', resumeAt: null }));
        } catch (e) {
            toast.error(errorText(e));
        }
        refresh();
    }, [campaignId, refresh]);

    const resume = useCallback(async () => {
        if (!campaignId) return;
        try {
            await emailApi.setCampaign(campaignId, 'sending');
            void run(campaignId);
        } catch (e) {
            toast.error(errorText(e));
        }
    }, [campaignId, run]);

    return { state: s, start, pause, resume };
}

/** The progress card: a ring, plain numbers, and what to do next. */
export function SendProgress({
    state, planned, onPause, onResume, onClose, hourlyLimit = 40,
}: {
    state: SenderState;
    planned: number;
    hourlyLimit?: number;
    onPause: () => void;
    onResume: () => void;
    onClose?: () => void;
}) {
    const total = Math.max(planned, state.sent + state.failed + (state.remaining ?? 0), 1);
    const doneShare = Math.min(1, (state.sent + state.failed) / total);
    const R = 34, C = 2 * Math.PI * R;
    const title = {
        idle: 'Getting ready…',
        sending: 'Sending…',
        waiting: 'Taking a break',
        paused: 'Paused',
        done: 'All sent',
        error: 'Sending stopped',
    }[state.phase];

    return (
        <div className="flex flex-col items-center gap-4 px-2 py-6 text-center sm:flex-row sm:items-center sm:text-left">
            <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90" aria-hidden="true">
                    <circle cx="40" cy="40" r={R} fill="none" stroke="#e2e8f0" strokeWidth="7" />
                    <motion.circle cx="40" cy="40" r={R} fill="none" strokeWidth="7" strokeLinecap="round"
                        stroke={state.phase === 'error' ? '#e11d48' : state.phase === 'done' ? '#059669' : '#0284c7'}
                        strokeDasharray={C} initial={false} animate={{ strokeDashoffset: C * (1 - doneShare) }}
                        transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center">
                    {state.phase === 'done' ? <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                        : state.phase === 'error' ? <XCircle className="h-9 w-9 text-rose-600" />
                            : state.phase === 'waiting' ? <Clock className="h-8 w-8 text-sky-600" />
                                : state.phase === 'paused' ? <Pause className="h-8 w-8 text-slate-500" />
                                    : <span className="text-[22px] font-semibold tabular-nums text-slate-900">{num(state.sent)}</span>}
                </span>
            </div>
            <div className="min-w-0 flex-1" aria-live="polite">
                <p className="text-[20px] font-semibold tracking-[-0.01em] text-slate-900">{title}</p>
                <p className="mt-0.5 text-[14px] text-slate-600">
                    <span className="font-semibold text-slate-900">{num(state.sent)}</span> sent
                    {state.failed > 0 && <> · <span className="font-semibold text-rose-600">{num(state.failed)}</span> failed</>}
                    {state.remaining !== null && state.phase !== 'done' && <> · {num(state.remaining)} to go</>}
                </p>
                {state.phase === 'waiting' && (
                    <p className="mt-1 text-[13px] text-slate-500">
                        The {num(hourlyLimit)}-an-hour limit is reached, to keep our mailbox in good standing.
                        {state.resumeAt ? ` Carries on by itself at ${istTime(state.resumeAt)} if this window stays open.` : ''}
                    </p>
                )}
                {state.phase === 'paused' && <p className="mt-1 text-[13px] text-slate-500">Nobody else gets it until you resume. You can close this and resume from History.</p>}
                {state.phase === 'done' && <p className="mt-1 text-[13px] text-slate-500">Results build up in History over the next 7 days: who came back, who made a test.</p>}
                {state.message && <p className="mt-1 text-[13px] font-medium text-rose-700">{state.message}</p>}
                {state.errors.length > 0 && (
                    <details className="mt-2 text-[12px] text-slate-500">
                        <summary className="cursor-pointer font-medium text-slate-600">Why some failed</summary>
                        <ul className="mt-1 space-y-0.5">{state.errors.map((e, i) => <li key={i} className="break-all">{e}</li>)}</ul>
                    </details>
                )}
                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                    {(state.phase === 'sending' || state.phase === 'waiting') && (
                        <button type="button" className={SOFT_BTN} onClick={onPause}><Pause className="h-4 w-4" /> Pause</button>
                    )}
                    {(state.phase === 'paused' || state.phase === 'error') && (
                        <button type="button" className={PRIMARY_BTN} onClick={onResume}><Play className="h-4 w-4" /> Resume</button>
                    )}
                    {state.phase === 'sending' && (
                        <span className="inline-flex h-11 items-center gap-2 px-2 text-[13px] text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" /> Keep this window open
                        </span>
                    )}
                    {onClose && state.phase !== 'sending' && (
                        <button type="button" className={cn(state.phase === 'done' ? PRIMARY_BTN : SOFT_BTN)} onClick={onClose}>Done</button>
                    )}
                </div>
            </div>
        </div>
    );
}
