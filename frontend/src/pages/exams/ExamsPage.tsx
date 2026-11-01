import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, ChevronRight, GraduationCap, History, KeyRound, Plus, Radio, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ExamSession, examSessionsApi, formatCode, problemOf } from '@/lib/examSessionsApi';
import NewExamSheet from '@/components/exams/NewExamSheet';
import { PHASE_LABEL, dayTime, usePoll } from '@/components/exams/examFormat';
import { CARD, PRIMARY_BTN, Skeleton } from '@/components/dashboard/dashboardUi';

/**
 * /exams — every sitting the teacher has run or scheduled. One paper can be sat many
 * times (Batch A on Monday, Batch B on Thursday); each sitting has its own code.
 */
export default function ExamsPage() {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const asUser = isAdmin ? new URLSearchParams(window.location.search).get('userId') : null;
    const ownerId = asUser || user?.id;
    const [sessions, setSessions] = useState<ExamSession[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        try {
            setSessions(await examSessionsApi.list({ asUser }));
            setError(null);
        } catch (err) {
            setError(problemOf(err).message);
        }
    }, [asUser]);

    useEffect(() => { if (ownerId) load(); }, [ownerId, load]);
    usePoll(load, 15000, !!sessions?.some(s => s.phase === 'live' || s.phase === 'lobby'));

    const groups = useMemo(() => {
        const list = sessions || [];
        return {
            live: list.filter(s => s.phase === 'live' || s.phase === 'lobby'),
            upcoming: list.filter(s => s.phase === 'scheduled').sort((a, b) => a.opens_at.localeCompare(b.opens_at)),
            past: list.filter(s => s.phase === 'ended'),
        };
    }, [sessions]);

    return (
        <div className="mx-auto w-full max-w-5xl space-y-7 px-4 pb-16 pt-5 sm:px-6 sm:pt-8 lg:px-8">
            <header className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Exam room</p>
                    <h1 className="mt-1.5 text-[28px] font-bold leading-[1.1] tracking-[-0.025em] text-slate-900 sm:text-[34px]">Exams</h1>
                    <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-600">
                        Give a paper to a batch with a 6-digit code. Watch who is writing, then send the rank list.
                    </p>
                </div>
                <button type="button" onClick={() => setCreating(true)} className={`${PRIMARY_BTN} h-11 px-4 sm:px-5`}>
                    <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} /> <span>New exam</span>
                </button>
            </header>

            {error && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[14px] text-amber-900 ring-1 ring-inset ring-amber-600/20">{error}</p>}

            {sessions === null && !error ? (
                <div className={`${CARD} space-y-4 p-5`}>{[0, 1, 2].map(i => <Skeleton key={i} className="h-14" />)}</div>
            ) : sessions && sessions.length === 0 ? (
                <EmptyExams onCreate={() => setCreating(true)} />
            ) : (
                <>
                    <SessionGroup title="Live now" icon={Radio} sessions={groups.live} tone="live" onOpen={(id) => navigate(`/exams/${id}`)} />
                    <SessionGroup title="Coming up" icon={CalendarClock} sessions={groups.upcoming} tone="upcoming" onOpen={(id) => navigate(`/exams/${id}`)} />
                    <SessionGroup title="Earlier" icon={History} sessions={groups.past} tone="past" onOpen={(id) => navigate(`/exams/${id}`)} />
                </>
            )}

            <div className="flex flex-wrap items-center gap-2 text-[14px] text-slate-600">
                <GraduationCap className="h-4 w-4 text-slate-400" />
                Candidate lists and PINs live in <Link to="/batches" className="font-semibold text-sky-700 hover:underline">Batches</Link>.
            </div>

            <NewExamSheet
                open={creating}
                onOpenChange={setCreating}
                ownerId={ownerId}
                asUser={asUser}
                onCreated={() => load()}
            />
        </div>
    );
}

function SessionGroup({ title, icon: Icon, sessions: list, tone, onOpen }: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    sessions: ExamSession[];
    tone: 'live' | 'upcoming' | 'past';
    onOpen: (id: string) => void;
}) {
    if (!list.length) return null;
    return (
        <section>
            <h2 className="mb-3 flex items-center gap-2 px-1 text-lg font-semibold tracking-[-0.01em] text-slate-900">
                <Icon className={`h-[18px] w-[18px] ${tone === 'live' ? 'text-emerald-600' : 'text-slate-400'}`} /> {title}
                <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">{list.length}</span>
            </h2>
            <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden ${tone === 'live' ? 'ring-emerald-600/20' : ''}`}>
                {list.map(s => (
                    <li key={s.id}>
                        <button type="button" onClick={() => onOpen(s.id)} className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:px-5 cursor-pointer">
                            <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="truncate text-[16px] font-semibold text-slate-900">{s.name}</span>
                                    <PhaseBadge session={s} />
                                </div>
                                <p className="mt-0.5 truncate text-[13px] text-slate-600">
                                    {s.test.title} · {dayTime(s.opens_at)}
                                </p>
                                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-500">
                                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{s.counts.joined}{s.roster.students ? ` of ${s.roster.students}` : ''} joined</span>
                                    {s.counts.submitted > 0 && <span>{s.counts.submitted} submitted</span>}
                                    {s.retest_of && <span className="text-violet-700">Re-test</span>}
                                </p>
                            </div>
                            {tone !== 'past' && (
                                <span className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 font-semibold tabular-nums tracking-[0.08em] text-slate-900 sm:inline-flex">
                                    <KeyRound className="h-4 w-4 text-slate-400" /> {formatCode(s.join_code)}
                                </span>
                            )}
                            <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}

export function PhaseBadge({ session }: { session: Pick<ExamSession, 'phase' | 'start_mode'> }) {
    const styles: Record<string, string> = {
        live: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        lobby: 'bg-sky-50 text-sky-700 ring-sky-600/20',
        scheduled: 'bg-violet-50 text-violet-700 ring-violet-600/15',
        ended: 'bg-slate-100 text-slate-600 ring-slate-500/15',
    };
    return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none ring-1 ring-inset ${styles[session.phase]}`}>
            {session.phase === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />}
            {session.phase === 'lobby' && session.start_mode === 'manual' ? 'Waiting for you' : PHASE_LABEL[session.phase]}
        </span>
    );
}

function EmptyExams({ onCreate }: { onCreate: () => void }) {
    const steps = [
        { title: 'Pick a paper and a time', body: 'Any test you made. Choose how candidates check in.' },
        { title: 'Show the 6-digit code', body: 'Candidates open testoza.com/join on any phone and type it.' },
        { title: 'Watch and share results', body: 'See who is writing. Send the rank list when it ends.' },
    ];
    return (
        <div className={`${CARD} px-6 py-10 text-center`}>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/15 to-sky-500/5 text-sky-700 ring-1 ring-inset ring-sky-500/20">
                <KeyRound className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-slate-900">Run your first exam with a code</h2>
            <ol className="mx-auto mt-5 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
                {steps.map((s, i) => (
                    <li key={s.title} className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-[14px] font-semibold text-slate-900"><span className="text-sky-700">{i + 1}.</span> {s.title}</p>
                        <p className="mt-1 text-[13px] leading-snug text-slate-600">{s.body}</p>
                    </li>
                ))}
            </ol>
            <button type="button" onClick={onCreate} className={`${PRIMARY_BTN} mx-auto mt-6 h-11 px-5`}>
                <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} /> New exam
            </button>
        </div>
    );
}
