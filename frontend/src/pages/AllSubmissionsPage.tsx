import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { AlertTriangle, ChevronRight, Clock, FileText, Play, RefreshCw, Search, Send, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTestsByUserId } from '@/lib/testsApi';
import { examWhatsAppUrl } from '@/lib/conductExam';
import {
    AttemptRow, TestResultSummary, WEAK_PCT, buildDashboardModel, fetchAttempts, isExampleTest, isLiveTest,
    isUpcomingTest, rankListText, summariseByTest,
} from '@/lib/teacherDashboardApi';
import SplashLoader from '@/components/ui/SplashLoader';
import { CARD, IconTile, LiveDot, Panel, Skeleton, TEXT_BTN, WhatsAppIcon } from '@/components/dashboard/dashboardUi';
import { dayAndTime, pctText, plural, timeAgo } from '@/components/dashboard/format';
import WatchFilmCard from '@/components/dashboard/WatchFilmCard';
import NextStepCard from '@/components/dashboard/NextStepCard';
import WaysToRunCard from '@/components/dashboard/WaysToRunCard';
import DoubtsCard from '@/components/dashboard/DoubtsCard';
import ResultsPreview from '@/components/results/ResultsPreview';
import { useStartExam } from '@/components/results/useStartExam';

/** Results from the very first one; the dashboard only looks back 180 days. */
const ALL_TIME = '2000-01-01T00:00:00Z';
const WAITING_SHOWN = 5;

/**
 * /all-submissions: every exam the educator's candidates have written, newest first, each
 * opening its results report. Tests nobody has written yet are listed under it with the one
 * thing to do (start the exam, or send the link), because most educators make a test and
 * never send it. Before any candidate has written, the page shows what it will look like
 * and how a class runs an online exam.
 *
 * Counts follow the dashboard's rules: the creator's own runs never count, conducted tests
 * only count exam attempts, and a failed load says so instead of showing zeros.
 */
export default function AllSubmissionsPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [tests, setTests] = useState<any[]>([]);
    const [testsState, setTestsState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [attempts, setAttempts] = useState<AttemptRow[]>([]);
    const [attemptsState, setAttemptsState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [query, setQuery] = useState('');
    const [showAllWaiting, setShowAllWaiting] = useState(false);
    const now = useMemo(() => new Date(), []);

    const load = useCallback(async () => {
        if (!user?.id) return;
        setTestsState('loading');
        setAttemptsState('loading');
        let tourCompleted = false;
        try {
            tourCompleted = localStorage.getItem(`creator_dashboard_tour_completed_${user.id}`) === 'true';
        } catch { /* storage blocked */ }
        const { data, error } = await fetchTestsByUserId(user.id, { tourCompleted });
        if (error) {
            setTestsState('error');
            setAttemptsState('error');
            return;
        }
        const list = Array.isArray(data) ? data : [];
        setTests(list);
        setTestsState('ready');
        const res = await fetchAttempts(list.map(t => t.id), ALL_TIME);
        if (res.error) {
            console.error('Failed to load results:', res.error);
            setAttemptsState('error');
            return;
        }
        setAttempts(res.data);
        setAttemptsState('ready');
    }, [user?.id]);

    useEffect(() => {
        load();
    }, [load]);

    const { startExam, dialog } = useStartExam((started) => {
        setTests(prev => prev.map(t => (t.id === started.id ? started : t)));
    });

    const summaries = useMemo(() => {
        return [...summariseByTest(tests, attempts, user?.id).values()].sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
    }, [tests, attempts, user?.id]);

    // Real tests with no candidate result yet, newest first.
    const waiting = useMemo(() => {
        const written = new Set(summaries.map(s => s.test.id));
        const ownRuns = new Set(attempts.filter(a => a.user_id === user?.id).map(a => a.test_id));
        return tests
            .filter(t => !written.has(t.id) && !isExampleTest(t))
            .map(t => ({ test: t, selfTried: ownRuns.has(t.id) }))
            .sort((a, b) => {
                const live = Number(isLiveTest(b.test, now)) - Number(isLiveTest(a.test, now));
                return live || String(b.test.created_at || '').localeCompare(String(a.test.created_at || ''));
            });
    }, [tests, summaries, attempts, user?.id, now]);

    const model = useMemo(() => buildDashboardModel({
        tests, attempts, registrations: [], classes: [], creatorId: user?.id, now,
    }), [tests, attempts, user?.id, now]);

    if (authLoading) return <SplashLoader text="Loading results..." />;
    if (!user) return null;

    const loaded = testsState === 'ready' && attemptsState === 'ready';
    const failed = testsState === 'error' || attemptsState === 'error';
    const gettingStarted = loaded && summaries.length === 0;

    const q = query.trim().toLowerCase();
    const matches = (t: any) => !q || String(t.title || '').toLowerCase().includes(q) || String(t.custom_id || '').toLowerCase().includes(q);
    const shownSummaries = summaries.filter(s => matches(s.test));
    const shownWaiting = waiting.filter(w => matches(w.test));

    const totalResults = summaries.reduce((n, s) => n + s.count, 0);
    const allPcts = summaries.flatMap(s => s.ranked.map(a => a.pct).filter((p): p is number => p !== null));
    const overallAvg = allPcts.length ? allPcts.reduce((a, b) => a + b, 0) / allPcts.length : null;
    const latest = summaries[0];

    const openReport = (testId: string) => navigate(`/analytics/full?testId=${testId}`);
    const rowGrid = 'grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]';
    const fullName = profile?.full_name || user.user_metadata?.full_name || '';

    const summaryLine = (() => {
        if (!loaded) return failed ? 'Your results could not be loaded.' : 'Loading your results…';
        if (gettingStarted) {
            return waiting.length > 0
                ? 'Nobody has written one of your tests yet. When they do, every candidate’s marks land here.'
                : 'When your candidates write an exam, every result lands here.';
        }
        return (
            <>
                {plural(totalResults, 'answer sheet')} from {plural(summaries.length, 'exam')}. Latest: “
                <strong className="font-semibold text-slate-900">{latest.test.title}</strong>”, {timeAgo(latest.lastAt, now)}.
            </>
        );
    })();

    const waitingPanel = shownWaiting.length > 0 && (
        <Panel
            id="waiting-heading"
            title={gettingStarted ? 'Your tests' : 'Not written by anyone yet'}
            count={shownWaiting.length}
            note="Start one as an exam and send the link to your class"
        >
            <ul className="divide-y divide-slate-100">
                {(showAllWaiting ? shownWaiting : shownWaiting.slice(0, WAITING_SHOWN)).map(w => (
                    <WaitingRow key={w.test.id} test={w.test} selfTried={w.selfTried} now={now} onStart={() => startExam(w.test)} />
                ))}
            </ul>
            {shownWaiting.length > WAITING_SHOWN && (
                <div className="border-t border-slate-100 px-3 py-2">
                    <button type="button" onClick={() => setShowAllWaiting(v => !v)} className={TEXT_BTN}>
                        {showAllWaiting ? 'Show fewer' : `Show all ${shownWaiting.length}`}
                    </button>
                </div>
            )}
        </Panel>
    );

    return (
        <div className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-16 pt-5 sm:px-6 sm:pt-7 lg:px-8">
            <Helmet>
                <title>All submissions | TestoZa</title>
                <meta name="description" content="Every exam your candidates have written, with marks, ranks and a full report for each." />
            </Helmet>

            {/* Header: what this page is, in one line */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-sky-700">Results</p>
                    <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.025em] text-slate-900 sm:text-[30px]">All submissions</h1>
                    <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-slate-600">{summaryLine}</p>
                </div>
                {loaded && tests.length > 5 && (
                    <label className="relative block w-full shrink-0 sm:w-64">
                        <span className="sr-only">Search your tests</span>
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search your tests"
                            className="h-10 w-full rounded-full bg-white pl-9 pr-9 text-[14px] text-slate-900 ring-1 ring-slate-900/[0.08] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </label>
                )}
            </header>

            {failed && (
                <div className="flex flex-col gap-3 rounded-2xl bg-amber-50 px-4 py-3.5 text-[14px] text-amber-900 ring-1 ring-inset ring-amber-600/20 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /> Could not load your results. Check your connection.</span>
                    <button type="button" onClick={load} className="inline-flex h-9 items-center gap-1.5 self-start rounded-full bg-white px-3.5 text-[13px] font-semibold text-amber-900 ring-1 ring-amber-600/20 hover:bg-amber-100 sm:self-auto cursor-pointer">
                        <RefreshCw className="h-3.5 w-3.5" /> Try again
                    </button>
                </div>
            )}

            {!loaded && !failed && (
                <div className={rowGrid}>
                    <div className={`${CARD} space-y-4 p-5`}>
                        <Skeleton className="h-4 w-40" />
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="h-11 w-11 rounded-[12px]" />
                                <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
                            </div>
                        ))}
                    </div>
                    <WatchFilmCard where="all_results" />
                </div>
            )}

            {gettingStarted && (
                <>
                    <div className={rowGrid}>
                        <NextStepCard
                            className="min-w-0"
                            checklist={model.checklist}
                            liveExam={model.live[0] || null}
                            onUploadPaper={() => navigate('/generate-with-ai')}
                            onTypeQuestions={() => navigate('/create-test')}
                            onConduct={startExam}
                        />
                        <WatchFilmCard where="all_results" />
                    </div>
                    <ResultsPreview />
                    {waitingPanel}
                    <WaysToRunCard />
                    <DoubtsCard signedBy={fullName} />
                </>
            )}

            {loaded && !gettingStarted && (
                <div className={`${rowGrid} items-start`}>
                    <div className="min-w-0 space-y-5">
                        <Panel
                            id="written-heading"
                            title="Exams your candidates wrote"
                            count={shownSummaries.length}
                            note="Newest first. Tap one for its full report."
                        >
                            {shownSummaries.length === 0 ? (
                                <p className="px-5 py-8 text-center text-[14px] text-slate-500">No exam matches “{query}”.</p>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {shownSummaries.map(s => (
                                        <ResultRow key={s.test.id} summary={s} now={now} onOpen={() => openReport(s.test.id)} />
                                    ))}
                                </ul>
                            )}
                        </Panel>
                        {waitingPanel}
                    </div>

                    <aside className="min-w-0 space-y-5 lg:sticky lg:top-5" aria-label="Overview">
                        <section aria-labelledby="totals-heading" className={`${CARD} p-5`}>
                            <h2 id="totals-heading" className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">All your exams so far</h2>
                            <dl className="mt-3 grid grid-cols-2 gap-2.5">
                                <Tile label="Answer sheets" value={String(totalResults)} />
                                <Tile label="Exams written" value={String(summaries.length)} />
                                <Tile label="Average score" value={pctText(overallAvg)} />
                                <Tile label="Not sent yet" value={String(waiting.length)} />
                            </dl>
                            <p className="mt-3 text-[12px] leading-snug text-slate-500">Your own test runs are not counted.</p>
                        </section>
                        <WatchFilmCard where="all_results" />
                    </aside>
                </div>
            )}

            {dialog}
        </div>
    );
}

function Tile({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-900/[0.04]">
            <dt className="truncate text-[12px] font-medium text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-[22px] font-bold leading-tight tracking-[-0.02em] text-slate-900 tabular-nums">{value}</dd>
        </div>
    );
}

/** One written exam: class average, how many wrote, who needs help, and the rank list to send. */
function ResultRow({ summary, now, onOpen }: { summary: TestResultSummary; now: Date; onOpen: () => void }) {
    const { test, count, avgPct, weak, bands, lastAt } = summary;
    const live = isLiveTest(test, now);
    const banded = bands.strong + bands.average + bands.weak;
    return (
        <li className="group flex items-center gap-1 pr-3 transition-colors hover:bg-slate-50">
            <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3.5 py-3.5 pl-5 text-left cursor-pointer">
                <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[13px] bg-slate-100 ring-1 ring-inset ring-slate-900/[0.04]">
                    <span className="text-[15px] font-bold leading-none text-slate-900 tabular-nums">{pctText(avgPct)}</span>
                    <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">avg</span>
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[15px] font-semibold text-slate-900 group-hover:text-sky-800" title={test.title}>{test.title}</span>
                        {live && (
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                                <LiveDot /> Live
                            </span>
                        )}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-slate-600">
                        {plural(count, 'candidate')}
                        {weak.length > 0 && <> · <span className="text-rose-700">{weak.length} below {WEAK_PCT}%</span></>}
                        {' · '}last {timeAgo(lastAt, now)}
                    </span>
                    {banded > 1 && (
                        <span className="mt-2 flex h-1.5 w-full max-w-[220px] gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
                            <span className="h-full bg-emerald-500" style={{ width: `${(bands.strong / banded) * 100}%` }} />
                            <span className="h-full bg-amber-400" style={{ width: `${(bands.average / banded) * 100}%` }} />
                            <span className="h-full bg-rose-500" style={{ width: `${(bands.weak / banded) * 100}%` }} />
                        </span>
                    )}
                </span>
            </button>
            <a
                href={`https://wa.me/?text=${encodeURIComponent(rankListText(summary))}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Send the rank list on WhatsApp"
                aria-label={`Send the rank list for ${test.title} on WhatsApp`}
                className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#128C7E] transition-colors hover:bg-[#25D366]/15 sm:flex"
            >
                <WhatsAppIcon />
            </a>
            <button type="button" onClick={onOpen} aria-label={`Open the report for ${test.title}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 group-hover:text-slate-500 cursor-pointer">
                <ChevronRight className="h-5 w-5" />
            </button>
        </li>
    );
}

/** A test nobody has written: what state it is in, and the one thing to do about it. */
function WaitingRow({ test, selfTried, now, onStart }: {
    test: any; selfTried: boolean; now: Date; onStart: () => void;
}) {
    const live = isLiveTest(test, now);
    const upcoming = isUpcomingTest(test, now);
    const wasRun = !!test.settings?.conduct_exam;
    const status = live
        ? 'Live. Nobody has the link yet.'
        : upcoming
            ? `Starts ${dayAndTime(new Date(test.settings.schedule.start_time), now)}`
            : selfTried
                ? 'Only you have tried it'
                : wasRun
                    ? 'Ended with no candidates'
                    : 'Not started as an exam';
    const send = live || upcoming;

    return (
        <li className="flex items-center gap-3 px-5 py-3">
            <IconTile icon={live ? Send : upcoming ? Clock : FileText} tone={live ? 'emerald' : upcoming ? 'violet' : 'slate'} size="sm" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-slate-900" title={test.title}>{test.title}</p>
                <p className={`mt-0.5 truncate text-[12.5px] ${live ? 'text-emerald-700' : 'text-slate-500'}`}>{status}</p>
            </div>
            {send ? (
                <a
                    href={examWhatsAppUrl(test)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => toast.success('Post it in your class group. Results show here as they submit.')}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[#25D366] px-3 text-[12.5px] font-semibold text-white transition-[filter] hover:brightness-95"
                >
                    <WhatsAppIcon className="h-3.5 w-3.5" /> Send
                </a>
            ) : (
                <button
                    type="button"
                    onClick={onStart}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-sky-50 px-3 text-[12.5px] font-semibold text-sky-800 ring-1 ring-inset ring-sky-600/15 transition-colors hover:bg-sky-100 cursor-pointer"
                >
                    <Play className="h-3 w-3 fill-current" /> {wasRun ? 'Start again' : 'Start exam'}
                </button>
            )}
        </li>
    );
}
