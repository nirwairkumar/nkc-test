import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Maximize2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { MonitorData, examSessionsApi, formatCode, joinUrl, problemOf } from '@/lib/examSessionsApi';
import QrCode from '@/components/exams/QrCode';
import { clock, timeOnly, usePoll, useServerClock } from '@/components/exams/examFormat';

/**
 * /exams/:id/present — put this on the classroom projector. Big code, QR, who has
 * joined, and the countdown. Nothing on it is private: no scores, no answers.
 */
export default function ExamPresentPage() {
    const { id = '' } = useParams<{ id: string }>();
    const [data, setData] = useState<MonitorData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setData(await examSessionsApi.monitor(id));
        } catch (err) {
            setError(problemOf(err).message);
        }
    }, [id]);
    useEffect(() => { load(); }, [load]);
    usePoll(load, 3000, !!data && data.phase !== 'ended');
    const now = useServerClock(data?.server_time);

    if (error) return <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-[20px] text-white">{error}</div>;
    if (!data) return <div className="min-h-[100dvh] bg-slate-950" />;

    const live = data.phase === 'live';
    const people = data.participants.filter(p => p.status !== 'removed');
    const recent = [...people].sort((a, b) => b.joined_at.localeCompare(a.joined_at)).slice(0, 18);
    const toStart = Math.max(0, Math.round((new Date(data.opens_at).getTime() - now) / 1000));
    const toClose = Math.max(0, Math.round((new Date(data.closes_at).getTime() - now) / 1000));
    const site = joinUrl().replace(/^https?:\/\//, '');

    const start = async () => {
        try {
            await examSessionsApi.start(id);
            load();
        } catch (err) {
            toast.error(problemOf(err).message);
        }
    };

    return (
        <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white">
            <Helmet><title>{`${formatCode(data.join_code)} · ${data.test.title}`}</title></Helmet>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_15%_-10%,rgba(14,165,233,0.35),transparent),radial-gradient(800px_500px_at_110%_120%,rgba(16,185,129,0.22),transparent)]" />

            <button
                type="button"
                onClick={() => document.documentElement.requestFullscreen?.().catch(() => { })}
                className="absolute right-5 top-5 z-10 inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-[14px] font-medium text-white/80 backdrop-blur hover:bg-white/20 cursor-pointer"
            >
                <Maximize2 className="h-4 w-4" /> Full screen
            </button>

            <div className="relative mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col justify-center gap-10 px-8 py-12 lg:flex-row lg:items-center lg:gap-16 lg:px-16">
                <div className="min-w-0 flex-1">
                    <p className="text-[clamp(16px,1.6vw,24px)] font-medium text-white/70">{data.test.institution_name || data.batch || 'TestoZa'}</p>
                    <h1 className="mt-2 text-[clamp(28px,3.4vw,52px)] font-bold leading-tight tracking-[-0.02em]">{data.test.title}</h1>
                    <p className="mt-10 text-[clamp(18px,1.9vw,30px)] text-white/75">
                        Go to <span className="font-semibold text-white">{site}</span> and enter
                    </p>
                    <p className="mt-2 font-bold leading-none tracking-[0.08em] tabular-nums text-[clamp(88px,13vw,220px)]">
                        {formatCode(data.join_code)}
                    </p>
                    <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-[clamp(18px,1.8vw,28px)]">
                        <span><span className="font-bold tabular-nums">{people.length}</span>{data.roster.students ? <span className="text-white/60"> of {data.roster.students}</span> : null} joined</span>
                        {live ? (
                            <span className="inline-flex items-center gap-3 text-emerald-300">
                                <span className="h-3 w-3 rounded-full bg-emerald-400 motion-safe:animate-pulse" /> Exam is on · closes in {clock(toClose)}
                            </span>
                        ) : data.phase === 'ended' ? (
                            <span className="text-white/70">The exam has ended</span>
                        ) : data.start_mode === 'manual' && toStart === 0 ? (
                            <span className="text-sky-300">Starting soon</span>
                        ) : (
                            <span className="text-sky-300">Starts in <span className="font-bold tabular-nums">{clock(toStart)}</span> · {timeOnly(data.opens_at)}</span>
                        )}
                    </div>
                    {!live && data.phase !== 'ended' && data.start_mode === 'manual' && (
                        <button type="button" onClick={start} className="mt-8 inline-flex h-14 items-center gap-3 rounded-2xl bg-white px-7 text-[20px] font-semibold text-slate-900 hover:bg-white/90 cursor-pointer">
                            <Play className="h-5 w-5 fill-current" /> Start the exam
                        </button>
                    )}
                </div>

                <div className="shrink-0 lg:w-[380px]">
                    <div className="mx-auto w-fit rounded-[28px] bg-white p-4 shadow-2xl">
                        <QrCode value={joinUrl(data.join_code)} size={300} />
                    </div>
                    <p className="mt-4 text-center text-[16px] text-white/60">Or scan to join</p>
                    {recent.length > 0 && (
                        <ul className="mt-8 flex flex-wrap justify-center gap-2" aria-label="Recently joined">
                            {recent.map(p => (
                                <li key={p.id} className="rounded-full bg-white/10 px-3.5 py-1.5 text-[15px] text-white/90 backdrop-blur animate-in fade-in zoom-in-95 duration-300">
                                    {p.name.split(' ')[0]}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
