import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
    ChevronLeft, Clock, Copy, FileText, GraduationCap, Loader2, MonitorPlay, MoreHorizontal, Play, Plus, RotateCcw,
    Send, ShieldCheck, Square, Users,
} from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MonitorData, examSessionsApi, formatCode, joinUrl, problemOf } from '@/lib/examSessionsApi';
import { CARD, MENU_ITEM, MENU_TRIGGER, PILL_BTN, PRIMARY_BTN, Skeleton } from '@/components/dashboard/dashboardUi';
import { IDENTITY_LABEL, RELEASE_LABEL, clock, dayTime, timeOnly, usePoll, useServerClock } from '@/components/exams/examFormat';
import { inviteText, whatsappLink } from '@/components/exams/share';
import { Segmented } from '@/components/exams/ios';
import QrCode from '@/components/exams/QrCode';
import MonitorPanel from '@/components/exams/MonitorPanel';
import ResultsPanel from '@/components/exams/ResultsPanel';
import SessionSettingsPanel from '@/components/exams/SessionSettingsPanel';
import RetestSheet from '@/components/exams/RetestSheet';
import { PhaseBadge } from './ExamsPage';

type Tab = 'students' | 'results' | 'settings';

/** The exam room: the join code, live controls, the student monitor and the results. */
export default function ExamSessionPage() {
    const { id = '' } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<MonitorData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>('students');
    const [busy, setBusy] = useState<string | null>(null);
    const [confirmEnd, setConfirmEnd] = useState(false);
    const [retestOpen, setRetestOpen] = useState(false);
    const [resultsVersion, setResultsVersion] = useState(0);

    const load = useCallback(async () => {
        try {
            setData(await examSessionsApi.monitor(id));
            setError(null);
        } catch (err) {
            const p = problemOf(err);
            setError(p.status === 404 ? 'This exam does not exist, or it belongs to another account.' : p.message);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);
    const active = data?.phase === 'live' || data?.phase === 'lobby';
    usePoll(load, active ? 4000 : 20000, !!data);

    useEffect(() => {
        if (data?.phase === 'ended' && tab === 'students' && data.counts.submitted > 0 && !data.participants.some(p => p.status === 'writing')) {
            // Nothing left to watch: open on the results.
            setTab('results');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.phase]);

    const run = async (label: string, fn: () => Promise<unknown>, success?: string) => {
        setBusy(label);
        try {
            await fn();
            if (success) toast.success(success);
            await load();
            setResultsVersion(v => v + 1);
        } catch (err) {
            toast.error(problemOf(err).message);
        } finally {
            setBusy(null);
        }
    };

    if (error) {
        return (
            <div className="mx-auto max-w-xl px-4 py-16 text-center">
                <p className="text-[17px] font-semibold text-slate-900">{error}</p>
                <Link to="/exams" className="mt-4 inline-block text-[15px] font-semibold text-sky-700 hover:underline">Back to exams</Link>
            </div>
        );
    }
    if (!data) {
        return (
            <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pt-8 sm:px-6 lg:px-8">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        );
    }

    const writing = data.participants.filter(p => p.status === 'writing').length;

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-16 pt-4 sm:px-6 sm:pt-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => navigate('/exams')} className="-ml-2 inline-flex h-9 items-center rounded-full pr-3 text-[15px] font-medium text-sky-700 hover:bg-sky-50 cursor-pointer">
                    <ChevronLeft className="h-5 w-5" /> Exams
                </button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button type="button" aria-label="More actions" className={MENU_TRIGGER}><MoreHorizontal className="h-[18px] w-[18px]" /></button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5">
                        <DropdownMenuItem className={MENU_ITEM} onClick={() => window.open(`/exams/${id}/present`, '_blank')}>
                            <MonitorPlay className="mr-2.5 h-4 w-4 text-slate-500" /> Show on projector
                        </DropdownMenuItem>
                        <DropdownMenuItem className={MENU_ITEM} onClick={() => navigate(`/exams/${id}/report-cards`)}>
                            <FileText className="mr-2.5 h-4 w-4 text-slate-500" /> Report cards
                        </DropdownMenuItem>
                        <DropdownMenuItem className={MENU_ITEM} onClick={() => setRetestOpen(true)}>
                            <RotateCcw className="mr-2.5 h-4 w-4 text-slate-500" /> Re-test for absentees
                        </DropdownMenuItem>
                        {data.class_id && (
                            <DropdownMenuItem className={MENU_ITEM} onClick={() => navigate(`/batches/${data.class_id}`)}>
                                <GraduationCap className="mr-2.5 h-4 w-4 text-slate-500" /> Batch and PINs
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className={MENU_ITEM} onClick={() => setTab('settings')}>
                            Settings
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <header>
                <div className="flex flex-wrap items-center gap-2">
                    <PhaseBadge session={data} />
                    {data.retest_of && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-600/15">Re-test</span>}
                </div>
                <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-[-0.025em] text-slate-900 sm:text-[32px]">{data.name}</h1>
                <p className="mt-1.5 text-[15px] text-slate-600">
                    {data.test.title}{data.batch ? ` · ${data.batch}` : ''} · {dayTime(data.opens_at)} to {timeOnly(data.closes_at)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[13px] text-slate-600">
                    <Chip icon={ShieldCheck}>{IDENTITY_LABEL[data.identity_mode]}</Chip>
                    <Chip icon={Clock}>{data.test.duration || '—'} min · late entry {data.late_entry_minutes} min</Chip>
                    <Chip icon={Send}>Results: {RELEASE_LABEL[data.results_release].toLowerCase()}</Chip>
                    {!data.test.proctoring && <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">Anti-cheating is off for this paper</span>}
                </div>
            </header>

            {data.phase !== 'ended' && <JoinHero data={data} />}

            <PhaseActions
                data={data}
                writing={writing}
                busy={busy}
                onStart={() => run('start', () => examSessionsApi.start(id), 'The exam has started. Candidates can begin.')}
                onExtraAll={(m) => run('extra', () => examSessionsApi.extraTimeAll(id, m), `Everyone still writing got ${m} more minutes.`)}
                onEnd={() => setConfirmEnd(true)}
                onRelease={() => run('release', () => examSessionsApi.release(id), 'Results released. Candidates can see them now.')}
                onRetest={() => setRetestOpen(true)}
                onReports={() => navigate(`/exams/${id}/report-cards`)}
            />

            <div className="max-w-md">
                <Segmented<Tab>
                    value={tab}
                    onChange={setTab}
                    ariaLabel="Exam room view"
                    options={[
                        { value: 'students', label: `Candidates${data.counts.joined ? ` (${data.counts.joined})` : ''}` },
                        { value: 'results', label: `Results${data.counts.submitted ? ` (${data.counts.submitted})` : ''}` },
                        { value: 'settings', label: 'Settings' },
                    ]}
                />
            </div>

            {tab === 'students' && <MonitorPanel data={data} onChanged={load} />}
            {tab === 'results' && <ResultsPanel sessionId={id} version={resultsVersion} onChanged={load} />}
            {tab === 'settings' && <SessionSettingsPanel data={data} onChanged={load} onDeleted={() => navigate('/exams', { replace: true })} />}

            <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
                <AlertDialogContent className="max-w-[min(400px,calc(100vw-32px))] rounded-2xl">
                    <div className="text-center">
                        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-inset ring-red-600/15">
                            <Square className="h-4 w-4 fill-current" />
                        </span>
                        <AlertDialogTitle className="text-lg font-semibold text-slate-900">End the exam now?</AlertDialogTitle>
                        <AlertDialogDescription className="mt-2 text-[15px] leading-relaxed text-slate-600">
                            {writing > 0
                                ? `${writing} candidate${writing === 1 ? ' is' : 's are'} still writing. Their exam closes now and their last saved answers are submitted for them.`
                                : 'Nobody can join or write after this. The code stops working.'}
                        </AlertDialogDescription>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        <AlertDialogCancel className="m-0 h-11 rounded-xl border-0 bg-slate-100 text-[15px] font-semibold text-slate-700 hover:bg-slate-200">Keep going</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => run('end', () => examSessionsApi.end(id, true), 'Exam ended. Results are ready.').then(() => setTab('results'))}
                            className="h-11 rounded-xl bg-red-600 text-[15px] font-semibold text-white hover:bg-red-700"
                        >
                            End exam
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            <RetestSheet open={retestOpen} onOpenChange={setRetestOpen} session={data} />
        </div>
    );
}

function Chip({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-900/[0.06]">
            <Icon className="h-3.5 w-3.5 text-slate-400" /> {children}
        </span>
    );
}

/** The code students type, big enough to read from the back of a classroom. */
function JoinHero({ data }: { data: MonitorData }) {
    const link = joinUrl(data.join_code);
    const copy = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copied`);
        } catch {
            toast.error('Could not copy');
        }
    };
    return (
        <section className={`${CARD} overflow-hidden`}>
            <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6">
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-slate-500">
                        Candidates open <span className="font-semibold text-slate-800">{joinUrl().replace(/^https?:\/\//, '')}</span> and type
                    </p>
                    <p className="mt-1 text-[56px] font-bold leading-none tracking-[0.06em] text-slate-900 tabular-nums sm:text-[64px]">{formatCode(data.join_code)}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <button type="button" className={PILL_BTN} onClick={() => copy(data.join_code, 'Code')}>
                            <Copy className="h-4 w-4 text-sky-600" /> Code
                        </button>
                        <button type="button" className={PILL_BTN} onClick={() => copy(inviteText(data), 'Message')}>
                            <Copy className="h-4 w-4 text-sky-600" /> Message
                        </button>
                        <a href={whatsappLink(inviteText(data))} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 text-[13px] font-semibold text-white hover:brightness-95">
                            WhatsApp
                        </a>
                        <button type="button" className={PILL_BTN} onClick={() => window.open(`/exams/${data.id}/present`, '_blank')}>
                            <MonitorPlay className="h-4 w-4 text-sky-600" /> Projector
                        </button>
                    </div>
                </div>
                <div className="shrink-0 self-center rounded-2xl bg-white p-2 ring-1 ring-slate-900/[0.06]">
                    <QrCode value={link} size={132} />
                </div>
            </div>
        </section>
    );
}

function PhaseActions({ data, writing, busy, onStart, onExtraAll, onEnd, onRelease, onRetest, onReports }: {
    data: MonitorData;
    writing: number;
    busy: string | null;
    onStart: () => void;
    onExtraAll: (minutes: number) => void;
    onEnd: () => void;
    onRelease: () => void;
    onRetest: () => void;
    onReports: () => void;
}) {
    const now = useServerClock(data.server_time);
    const toStart = Math.max(0, Math.round((new Date(data.opens_at).getTime() - now) / 1000));
    const toClose = Math.max(0, Math.round((new Date(data.closes_at).getTime() - now) / 1000));
    const spinner = (key: string) => (busy === key ? <Loader2 className="h-4 w-4 animate-spin" /> : null);

    if (data.phase === 'ended') {
        return (
            <div className="flex flex-wrap items-center gap-2">
                {!data.results_released && (
                    <button type="button" className={`${PRIMARY_BTN} h-11 px-4`} onClick={onRelease} disabled={!!busy}>
                        {spinner('release') || <Send className="h-4 w-4" />} Release results to candidates
                    </button>
                )}
                <button type="button" className={`${PILL_BTN} h-11 px-4`} onClick={onReports}><FileText className="h-4 w-4 text-sky-600" /> Report cards</button>
                <button type="button" className={`${PILL_BTN} h-11 px-4`} onClick={onRetest}><RotateCcw className="h-4 w-4 text-sky-600" /> Re-test for absentees</button>
            </div>
        );
    }

    const waiting = data.phase !== 'live';
    return (
        <div className={`${CARD} flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5`}>
            <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-[12px] ${waiting ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {waiting ? <Users className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                </span>
                <div>
                    {waiting ? (
                        <>
                            <p className="text-[17px] font-semibold text-slate-900">
                                {data.start_mode === 'manual' && toStart === 0 ? 'Waiting for you to start' : `Starts in ${clock(toStart)}`}
                            </p>
                            <p className="text-[14px] text-slate-600">
                                {data.counts.joined}{data.roster.students ? ` of ${data.roster.students}` : ''} in the lobby
                                {data.start_mode === 'manual' ? ' · starts when you tap Start' : ` · at ${timeOnly(data.opens_at)}`}
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-[17px] font-semibold text-slate-900">{writing} writing · {data.counts.submitted} submitted</p>
                            <p className="text-[14px] text-slate-600">Closes in {clock(toClose)} (at {timeOnly(data.closes_at)})</p>
                        </>
                    )}
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {waiting && (
                    <button type="button" className={`${PRIMARY_BTN} h-11 px-5`} onClick={onStart} disabled={!!busy}>
                        {spinner('start') || <Play className="h-4 w-4 fill-current" />} Start exam now
                    </button>
                )}
                {!waiting && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button type="button" className={`${PILL_BTN} h-11 px-4`} disabled={!!busy}>
                                {spinner('extra') || <Plus className="h-4 w-4 text-sky-600" />} More time
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
                            {[5, 10, 15, 30].map(m => (
                                <DropdownMenuItem key={m} className={MENU_ITEM} onClick={() => onExtraAll(m)}>
                                    +{m} min for everyone writing
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                <button type="button" className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold text-red-600 hover:bg-red-50 cursor-pointer" onClick={onEnd} disabled={!!busy}>
                    {spinner('end') || <Square className="h-3.5 w-3.5 fill-current" />} End exam
                </button>
            </div>
        </div>
    );
}
