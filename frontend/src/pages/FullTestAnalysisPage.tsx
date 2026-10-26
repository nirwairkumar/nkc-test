import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, ClipboardCopy, FileSpreadsheet, Printer, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTestById } from '@/lib/testsApi';
import { fetchAttemptsForTest } from '@/lib/attemptsApi';
import { Checklist, LiveExam, isLiveTest, rankListText } from '@/lib/teacherDashboardApi';
import { buildReport, durationText, marksText, ReportRow } from '@/lib/resultsReport';
import { CARD, LiveDot, PILL_BTN, Skeleton, TEXT_BTN, WhatsAppIcon } from '@/components/dashboard/dashboardUi';
import { copyText, plural } from '@/components/dashboard/format';
import WatchFilmCard from '@/components/dashboard/WatchFilmCard';
import NextStepCard from '@/components/dashboard/NextStepCard';
import WaysToRunCard from '@/components/dashboard/WaysToRunCard';
import ResultsPreview from '@/components/results/ResultsPreview';
import { useStartExam } from '@/components/results/useStartExam';
import { ClassSummaryCard, QuestionsCard, RankListCard, SectionsCard, TeachAgainCard } from '@/components/results/ReportCards';
import StudentDetailedResultModal from '@/components/StudentDetailedResultModal';

/** A live exam's report refreshes itself this often while the tab is visible. */
const LIVE_REFRESH_MS = 45_000;

const shortDate = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/**
 * The results report for one test (/analytics/full?testId=…, also /test-analysis/:testId).
 *
 * What an educator asks the morning after an exam, in that order: how did the class do,
 * who scored what, which questions do I teach again, how do I send the marks out. Every
 * number is real; the creator's own runs are left out. Before anyone has written the test
 * the page says so and shows the one step that gets results here: start it, send the link.
 */
export default function FullTestAnalysisPage() {
    const navigate = useNavigate();
    const { testId: paramId } = useParams<{ testId: string }>();
    const [searchParams] = useSearchParams();
    const { user, isAdmin, isPremium } = useAuth();
    const testId = paramId || searchParams.get('testId') || searchParams.get('id');

    const [test, setTest] = useState<any>(null);
    const [attempts, setAttempts] = useState<any[]>([]);
    const [state, setState] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading');
    const [refreshing, setRefreshing] = useState(false);
    const [sheet, setSheet] = useState<ReportRow | null>(null);
    const [openQ, setOpenQ] = useState<number | null>(null);

    const load = useCallback(async (quiet = false) => {
        if (!testId) return;
        if (quiet) setRefreshing(true);
        else setState('loading');
        const [testRes, attemptsRes] = await Promise.all([
            quiet ? Promise.resolve(null) : fetchTestById(testId),
            fetchAttemptsForTest(testId, false),
        ]);
        if (quiet) setRefreshing(false);
        if (testRes) {
            if (!testRes.data) {
                setState(testRes.error?.response?.status === 404 ? 'missing' : 'error');
                return;
            }
            setTest(testRes.data);
        }
        if (attemptsRes.error) {
            if (quiet) toast.error("Couldn't refresh. Check your connection.");
            else setState(attemptsRes.error?.response?.status === 403 ? 'missing' : 'error');
            return;
        }
        setAttempts(Array.isArray(attemptsRes.data) ? attemptsRes.data : []);
        setState('ready');
    }, [testId]);

    useEffect(() => {
        load();
    }, [load]);

    const live = !!test && isLiveTest(test, new Date());
    useEffect(() => {
        if (!live) return;
        const id = window.setInterval(() => {
            if (document.visibilityState === 'visible') load(true);
        }, LIVE_REFRESH_MS);
        return () => window.clearInterval(id);
    }, [live, load]);

    const report = useMemo(
        () => (test ? buildReport(test, attempts, test.created_by || user?.id) : null),
        [test, attempts, user?.id],
    );

    const { startExam, dialog } = useStartExam(started => setTest(started));

    if (!testId) return <Navigate to="/all-submissions" replace />;

    const back = (
        <button type="button" onClick={() => navigate('/all-submissions')} className={`${TEXT_BTN} -ml-3 print:hidden`}>
            <ArrowLeft className="h-4 w-4" /> All submissions
        </button>
    );

    if (state === 'missing' || state === 'error') {
        return (
            <div className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-16 pt-5 sm:px-6 sm:pt-7 lg:px-8">
                {back}
                <div className={`${CARD} mx-auto max-w-lg p-8 text-center`}>
                    <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-600/15">
                        <AlertTriangle className="h-5 w-5" />
                    </span>
                    <h1 className="text-[20px] font-bold tracking-[-0.02em] text-slate-900">
                        {state === 'missing' ? 'This report isn’t available' : 'The report could not be loaded'}
                    </h1>
                    <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                        {state === 'missing'
                            ? 'The test may have been deleted, or it belongs to another account.'
                            : 'Check your connection and try again.'}
                    </p>
                    {state === 'error' && (
                        <button type="button" onClick={() => load()} className={`${PILL_BTN} mt-5`}>
                            <RefreshCw className="h-4 w-4" /> Try again
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (state === 'loading' || !test || !report) {
        return (
            <div className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-16 pt-5 sm:px-6 sm:pt-7 lg:px-8">
                {back}
                <div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className={`${CARD} space-y-4 p-5`}>
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
                        <Skeleton className="h-32" />
                    </div>
                    <div className={`${CARD} space-y-3 p-5`}><Skeleton className="h-4 w-32" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
                </div>
            </div>
        );
    }

    const { rows, summary } = report;
    const hasResults = rows.length > 0;
    const questionsCount = report.questions.length || Number(test.total_questions) || 0;

    // When it was written: one day, or a range.
    const days = rows.map(r => r.createdAt.getTime());
    const first = days.length ? new Date(Math.min(...days)) : null;
    const last = days.length ? new Date(Math.max(...days)) : null;
    const written = first && last
        ? (shortDate(first) === shortDate(last) ? `Written ${shortDate(first)}` : `Written ${shortDate(first)} – ${shortDate(last)}`)
        : null;
    const meta = [
        hasResults ? plural(rows.length, 'candidate') : null,
        written,
        questionsCount ? plural(questionsCount, 'question') : null,
        report.maxMarks ? `${marksText(report.maxMarks)} marks` : null,
        test.duration ? `${test.duration} min` : null,
    ].filter(Boolean).join(' · ');

    const rankText = summary ? rankListText({ ...summary, ranked: rows }) : '';
    const copyRankList = async () => {
        if (await copyText(rankText)) toast.success('Rank list copied. Paste it in your class group.');
        else toast.error('Could not copy the rank list');
    };
    const downloadExcel = () => {
        if (!isAdmin && !isPremium) {
            toast.error('Exporting results to Excel is a premium feature.');
            return;
        }
        exportExcel(test, report).catch(err => {
            console.error('Excel export failed:', err);
            toast.error('Could not make the Excel file');
        });
    };

    const showQuestion = (n: number) => {
        setOpenQ(n);
        window.setTimeout(() => document.getElementById(`report-q-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    };

    const checklist: Checklist = {
        hasTest: true,
        hasConducted: !!(test.settings?.conduct_exam || test.settings?.schedule?.enabled),
        hasResult: false,
        resultCount: 0,
        selfTried: report.ownRuns > 0,
        nextToConduct: test,
    };
    const liveExam = live ? ({ test } as LiveExam) : null;

    return (
        <div className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-16 pt-5 sm:px-6 sm:pt-7 lg:px-8">
            <Helmet>
                <title>{`${test.title || 'Test'} · Results report | TestoZa`}</title>
            </Helmet>

            {back}

            {/* Header: which test, when, and what to do with the results */}
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                        Results report
                        {live && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                                <LiveDot /> Live, updates by itself
                            </span>
                        )}
                    </p>
                    <h1 className="mt-1 text-[24px] font-bold leading-tight tracking-[-0.025em] text-slate-900 sm:text-[28px]">{test.title}</h1>
                    <p className="mt-1.5 text-[14px] text-slate-600">
                        {meta}
                        {report.ownRuns > 0 && <span className="text-slate-500"> · your own {report.ownRuns === 1 ? 'try is' : `${report.ownRuns} tries are`} not counted</span>}
                    </p>
                </div>

                {hasResults && (
                    <div className="flex flex-wrap gap-2 print:hidden">
                        <a
                            href={`https://wa.me/?text=${encodeURIComponent(rankText)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-[14px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(18,140,126,0.9)] transition-[filter,transform] hover:brightness-95 motion-safe:active:scale-[0.97]"
                        >
                            <WhatsAppIcon /> Send rank list
                        </a>
                        <button type="button" onClick={copyRankList} className={`${PILL_BTN} h-10`}>
                            <ClipboardCopy className="h-4 w-4 text-sky-600" /> Copy
                        </button>
                        <button type="button" onClick={downloadExcel} className={`${PILL_BTN} h-10`}>
                            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel
                        </button>
                        <button type="button" onClick={() => window.print()} className={`${PILL_BTN} h-10`}>
                            <Printer className="h-4 w-4 text-slate-500" /> Print
                        </button>
                        {live && (
                            <button type="button" onClick={() => load(true)} disabled={refreshing} aria-label="Refresh" className={`${PILL_BTN} h-10 w-10 justify-center px-0`}>
                                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            </button>
                        )}
                    </div>
                )}
            </header>

            {hasResults ? (
                <>
                    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                        <div className="min-w-0 space-y-5">
                            <ClassSummaryCard report={report} />
                            <div className="lg:hidden"><TeachAgainCard report={report} onShow={showQuestion} /></div>
                            <RankListCard report={report} onOpen={setSheet} />
                            <QuestionsCard report={report} open={openQ} onToggle={n => setOpenQ(o => (o === n ? null : n))} />
                        </div>
                        <aside className="hidden min-w-0 space-y-5 lg:sticky lg:top-5 lg:block print:hidden" aria-label="More">
                            <TeachAgainCard report={report} onShow={showQuestion} />
                            <SectionsCard report={report} />
                            <WatchFilmCard where="results_report" />
                        </aside>
                    </div>
                    <div className="space-y-5 lg:hidden print:hidden">
                        <SectionsCard report={report} />
                        <WatchFilmCard where="results_report" />
                    </div>
                </>
            ) : (
                <>
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                        <NextStepCard
                            className="min-w-0"
                            checklist={checklist}
                            liveExam={liveExam}
                            onUploadPaper={() => navigate('/generate-with-ai')}
                            onTypeQuestions={() => navigate('/create-test')}
                            onConduct={startExam}
                        />
                        <WatchFilmCard where="results_report" />
                    </div>
                    <ResultsPreview
                        eyebrow="Nobody has written it yet"
                        title="This report fills in as your candidates submit"
                    />
                    <WaysToRunCard />
                </>
            )}

            {sheet && (
                <StudentDetailedResultModal
                    isOpen={!!sheet}
                    onClose={() => setSheet(null)}
                    attempt={sheet.raw}
                    test={test}
                    isAdmin={isAdmin}
                />
            )}
            {dialog}
        </div>
    );
}

/** Two sheets: the rank list with everything the candidate typed, and how each question went. */
async function exportExcel(test: any, report: ReturnType<typeof buildReport>) {
    const XLSX = await import('xlsx');
    const fieldNames: string[] = [];
    report.rows.forEach(r => {
        Object.keys(r.raw?.metadata?.startFormData || {}).forEach(k => {
            if (!fieldNames.includes(k)) fieldNames.push(k);
        });
    });
    const typed = fieldNames.length > 0;

    const ranks = [
        ['Rank', ...(typed ? fieldNames : ['Candidate']), 'Marks', 'Out of', 'Percentage', 'Right', 'Wrong', 'Left blank', 'Time taken', 'Submitted'],
        ...report.rows.map(r => {
            const sf = r.raw?.metadata?.startFormData || {};
            return [
                r.rank,
                ...(typed ? fieldNames.map(k => (sf[k] === undefined || sf[k] === null ? '' : String(sf[k]))) : [r.displayName]),
                r.score,
                report.maxMarks,
                r.pct === null ? '' : Math.round(r.pct * 10) / 10,
                r.correct,
                r.wrong,
                r.unattempted,
                durationText(r.seconds),
                r.createdAt.toLocaleString(),
            ];
        }),
    ];

    const questions = [
        ['Question', ...(report.sections.length ? ['Section'] : []), 'Answer', 'Right', 'Partly right', 'Wrong', 'Left blank', '% right', 'Most picked wrong option'],
        ...report.questions.map(q => [
            `Q${q.number}`,
            ...(report.sections.length ? [q.section || ''] : []),
            q.answerText,
            q.correct,
            q.partial,
            q.wrong,
            q.skipped,
            Math.round(q.pctCorrect),
            q.trap ? `${q.trap.key} (${q.trap.picked})` : '',
        ]),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ranks), 'Rank list');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(questions), 'Questions');
    const name = String(test.title || 'test').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'test';
    XLSX.writeFile(wb, `${name} - results.xlsx`);
}
