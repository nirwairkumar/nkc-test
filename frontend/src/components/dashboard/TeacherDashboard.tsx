import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, BarChart3, Link as LinkIcon, Pencil, RefreshCw, Settings, Square, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTestsByUserId, updateTest, deleteTest } from '@/lib/testsApi';
import { fetchClasses, createClass } from '@/lib/classesApi';
import { fetchUserDetails } from '@/lib/usersApi';
import { fetchCreatorReports } from '@/lib/reportsApi';
import { toggleCreatorMode as apiToggleCreatorMode } from '@/lib/socialApi';
import { shareTest } from '@/utils/shareUtils';
import { buildStartConductPayload, buildStopConductPayload } from '@/lib/conductExam';
import {
    AttemptRow, HISTORY_DAYS, RegistrationRow, buildDashboardModel, buildSampleData, fetchActiveRegistrations,
    fetchAttempts, isSampleUser,
} from '@/lib/teacherDashboardApi';
import SplashLoader from '@/components/ui/SplashLoader';
import ConductExamDialog from '@/components/ConductExamDialog';
import TestSettingsPanel from '@/components/TestSettingsPanel';
import TestResultsPanel from '@/components/TestResultsPanel';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import DashboardHeader from './DashboardHeader';
import FirstExamChecklist from './FirstExamChecklist';
import LiveNowSection from './LiveNowSection';
import LatestResultCard from './LatestResultCard';
import RecentResultsCard from './RecentResultsCard';
import ContinueWorking from './ContinueWorking';
import CreateCard from './CreateCard';
import NumbersCard from './NumbersCard';
import StudentsCard from './StudentsCard';
import BatchesCard from './BatchesCard';
import GlobalSearchModal from './GlobalSearchModal';
import NotificationCenter from './NotificationCenter';
import ExamRoomsCard from './ExamRoomsCard';
import NewExamSheet from '@/components/exams/NewExamSheet';
import { ExamSession, examSessionsApi, problemOf } from '@/lib/examSessionsApi';
import { CARD, PRIMARY_BTN, Skeleton } from './dashboardUi';
import { dayAndTime, greeting, plural, timeAgo, untilText } from './format';

const LIVE_REFRESH_MS = 30_000;
const checklistKey = (userId?: string) => `testoza_dashboard_checklist_hidden_${userId || 'anon'}`;

/**
 * /dashboard for Teacher and Institution accounts.
 *
 * Built around what a teacher does on exam day and the morning after: is my exam running,
 * who is writing, who submitted, how did the class do, who needs help, and what do I send
 * to the batch group. Everything shown is real data; failures say so instead of showing 0.
 */
export default function TeacherDashboard() {
    const { user, profile, isAdmin, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Admins can open anyone's dashboard with ?userId=
    const impersonateUserId = new URLSearchParams(window.location.search).get('userId');
    const isImpersonating = !!(isAdmin && impersonateUserId);
    const targetUserId = isImpersonating ? impersonateUserId! : user?.id;

    const [targetProfile, setTargetProfile] = useState<any>(null);
    const [tests, setTests] = useState<any[]>([]);
    const [testsLoading, setTestsLoading] = useState(true);
    const [attempts, setAttempts] = useState<AttemptRow[]>([]);
    const [attemptsState, setAttemptsState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
    const [openReports, setOpenReports] = useState(0);
    const [now, setNow] = useState(() => new Date());
    const [liveUpdatedAt, setLiveUpdatedAt] = useState<Date | null>(null);

    // Sheets & dialogs
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [conductTarget, setConductTarget] = useState<any>(null);
    const [conductLoading, setConductLoading] = useState(false);
    const [settingsTarget, setSettingsTarget] = useState<any>(null);
    const [resultsTarget, setResultsTarget] = useState<any>(null);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [stopTarget, setStopTarget] = useState<any>(null);
    // Exam sittings with a join code (null until loaded; stays null if the API is unavailable)
    const [examSessions, setExamSessions] = useState<ExamSession[] | null>(null);
    const [newExam, setNewExam] = useState<{ testId?: string } | null>(null);

    const [checklistHidden, setChecklistHidden] = useState(() => {
        try {
            return localStorage.getItem(checklistKey(user?.id)) === 'true';
        } catch {
            return false;
        }
    });

    const profileForRole = isImpersonating ? targetProfile : profile;
    const designation = profileForRole?.designation || (!isImpersonating ? user?.user_metadata?.designation : undefined);
    const isInstitution = designation === 'Institution';
    const isCreator = isImpersonating ? true : !!(profile?.is_creator || isAdmin);
    const isDemo = isSampleUser(isImpersonating ? targetProfile?.email : user?.email);

    /* ── Loading ─────────────────────────────────────────────────────────── */

    useEffect(() => {
        if (!isImpersonating) {
            setTargetProfile(profile);
            return;
        }
        fetchUserDetails(impersonateUserId!)
            .then(res => setTargetProfile(res?.data ?? res))
            .catch(err => console.error('Failed to load impersonated profile:', err));
    }, [isImpersonating, impersonateUserId, profile]);

    const loadTests = useCallback(async () => {
        if (!targetUserId) return;
        setTestsLoading(true);
        let tourCompleted = false;
        try {
            tourCompleted = localStorage.getItem(`creator_dashboard_tour_completed_${targetUserId}`) === 'true';
        } catch { /* storage blocked */ }
        const { data, error } = await fetchTestsByUserId(targetUserId, { tourCompleted });
        if (error) {
            console.error('Failed to fetch tests:', error);
            toast.error('Could not load your tests. Check your connection and refresh.');
        } else {
            setTests(Array.isArray(data) ? data : []);
        }
        setTestsLoading(false);
    }, [targetUserId]);

    const loadClasses = useCallback(async () => {
        if (!targetUserId) return;
        const { data } = await fetchClasses(targetUserId);
        setClasses(Array.isArray(data) ? data : []);
    }, [targetUserId]);

    const loadExamSessions = useCallback(async () => {
        try {
            setExamSessions(await examSessionsApi.list({ asUser: isImpersonating ? impersonateUserId : null }));
        } catch {
            // Older backend without exam sessions: the card simply stays hidden.
        }
    }, [isImpersonating, impersonateUserId]);

    useEffect(() => {
        if (targetUserId) loadExamSessions();
    }, [targetUserId, loadExamSessions]);

    useEffect(() => {
        if (!examSessions?.some(s => s.phase === 'live' || s.phase === 'lobby')) return;
        const id = window.setInterval(() => {
            if (document.visibilityState === 'visible') loadExamSessions();
        }, 20_000);
        return () => window.clearInterval(id);
    }, [examSessions, loadExamSessions]);

    useEffect(() => {
        if (!targetUserId) return;
        loadTests();
        loadClasses();
        fetchCreatorReports(targetUserId).then(({ data }) => {
            setOpenReports((data || []).filter(r => r.status === 'open').length);
        });
    }, [targetUserId, loadTests, loadClasses]);

    // Results: refetch only when the set of tests changes, not on every optimistic edit.
    const testIdsKey = useMemo(() => tests.map(t => t.id).sort().join(','), [tests]);
    const loadAttempts = useCallback(async () => {
        const ids = testIdsKey ? testIdsKey.split(',') : [];
        setAttemptsState('loading');
        const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await fetchAttempts(ids, since);
        if (error) {
            console.error('Failed to load results for dashboard:', error);
            setAttemptsState('error');
            return;
        }
        setAttempts(data);
        setAttemptsState('ready');
    }, [testIdsKey]);

    useEffect(() => {
        if (testsLoading) return;
        loadAttempts();
    }, [testsLoading, loadAttempts]);

    // Clock for countdowns and "writing now"
    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), LIVE_REFRESH_MS);
        return () => window.clearInterval(id);
    }, []);

    const sample = useMemo(() => (isDemo ? buildSampleData() : null), [isDemo]);

    const model = useMemo(() => buildDashboardModel({
        tests: sample ? [...tests, ...sample.tests] : tests,
        attempts: sample ? [...attempts, ...sample.attempts] : attempts,
        registrations,
        classes: sample ? [...classes, ...sample.classes] : classes,
        creatorId: targetUserId,
        now,
    }), [tests, attempts, registrations, classes, targetUserId, now, sample]);

    // While an exam is live: refresh who is writing and who submitted every 30 s (tab visible only).
    const liveKey = model.live.map(l => l.test.id).join(',');
    const liveStartRef = useRef<string | null>(null);
    liveStartRef.current = model.live.reduce<string | null>((min, l) => {
        const s = l.startedAt?.toISOString() || null;
        return !min || (s && s < min) ? s : min;
    }, null);

    const refreshLive = useCallback(async () => {
        const ids = liveKey ? liveKey.split(',') : [];
        if (ids.length === 0) {
            setRegistrations([]);
            return;
        }
        const since = liveStartRef.current || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const [regs, fresh] = await Promise.all([fetchActiveRegistrations(ids), fetchAttempts(ids, since)]);
        if (!regs.error) setRegistrations(regs.data);
        if (!fresh.error && fresh.data.length) {
            setAttempts(prev => {
                const known = new Set(prev.map(a => a.id));
                const added = fresh.data.filter(a => !known.has(a.id));
                return added.length ? [...added, ...prev] : prev;
            });
        }
        if (!regs.error) setLiveUpdatedAt(new Date());
    }, [liveKey]);

    useEffect(() => {
        if (!liveKey) {
            setRegistrations([]);
            return;
        }
        refreshLive();
        const tick = () => {
            if (document.visibilityState === 'visible') refreshLive();
        };
        const id = window.setInterval(tick, LIVE_REFRESH_MS);
        document.addEventListener('visibilitychange', tick);
        return () => {
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [liveKey, refreshLive]);

    /* ── Actions ─────────────────────────────────────────────────────────── */

    const withUser = (path: string) => (isImpersonating ? `${path}${path.includes('?') ? '&' : '?'}userId=${impersonateUserId}` : path);
    const isSampleTest = (test: any) => {
        if (!test?.isSample) return false;
        toast.info('This is sample data on the demo account.');
        return true;
    };

    const goCreate = () => navigate(withUser('/create-test'));
    const goUpload = () => navigate('/generate-with-ai');
    const goCombine = () => navigate('/create-combined-test');
    const openEditor = (test: any) => !isSampleTest(test) && navigate(withUser(`/edit-test/${test.id}`));
    const openSolutions = (test: any) => !isSampleTest(test) && navigate(withUser(`/solutions-editor/${test.id}`));
    const openResults = (test: any) => !isSampleTest(test) && setResultsTarget(test);
    const openAnalysis = (test: any) => !isSampleTest(test) && navigate(`/test-analysis/${test.id}`);
    const openSettings = (test: any) => !isSampleTest(test) && setSettingsTarget(test);

    const replaceTest = (id: string, patch: any) => setTests(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));

    const confirmConduct = async (conductSlug: string) => {
        const test = conductTarget;
        if (!test) return;
        setConductLoading(true);
        const payload = buildStartConductPayload(test, conductSlug);
        replaceTest(test.id, payload);
        const { error } = await updateTest(test.id, payload, isAdmin);
        setConductLoading(false);
        if (error) {
            replaceTest(test.id, test);
            toast.error(`Could not start the exam: ${error.message || 'please try again'}`);
            return;
        }
        setConductTarget(null);
        toast.success('Exam is live. Send the link to your candidates.');
        window.setTimeout(() => document.getElementById('live-now-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    };

    const confirmStop = async () => {
        const test = stopTarget;
        setStopTarget(null);
        if (!test) return;
        const payload = buildStopConductPayload(test);
        replaceTest(test.id, payload);
        const { error } = await updateTest(test.id, payload, isAdmin);
        if (error) {
            replaceTest(test.id, test);
            toast.error(`Could not stop the exam: ${error.message || 'please try again'}`);
            return;
        }
        toast.success('Exam stopped. Its results stay saved.');
    };

    const confirmDelete = async () => {
        const test = deleteTarget;
        setDeleteTarget(null);
        if (!test) return;
        const { error } = await deleteTest(test.id, isAdmin);
        if (error) {
            toast.error(`Could not delete the test: ${error.message || 'please try again'}`);
            return;
        }
        setTests(prev => prev.filter(t => t.id !== test.id));
        toast.success(`"${test.title}" deleted`);
    };

    const changeBatch = async (test: any, classId: string | null) => {
        const old = test.class_id ?? null;
        replaceTest(test.id, { class_id: classId });
        const { error } = await updateTest(test.id, { class_id: classId } as any, isAdmin);
        if (error) {
            replaceTest(test.id, { class_id: old });
            toast.error('Could not change the batch');
            return;
        }
        toast.success(classId ? `Added to ${classes.find(c => c.id === classId)?.name || 'batch'}` : 'Removed from batch');
    };

    const createBatch = async (name: string) => {
        if (!targetUserId) return false;
        const { error } = await createClass(name, targetUserId);
        if (error) {
            toast.error('Could not create the batch');
            return false;
        }
        toast.success(`Batch "${name}" created`);
        loadClasses();
        return true;
    };

    const getJoinCode = async (test: any) => {
        try {
            const { join_code, settings } = await examSessionsApi.linkCode(test.id);
            replaceTest(test.id, { settings });
            toast.success(`Join code ${join_code.slice(0, 3)} ${join_code.slice(3)} is ready. Candidates enter it at testoza.com/join.`);
        } catch (err) {
            toast.error(problemOf(err).message);
        }
    };

    const hideChecklist = () => {
        setChecklistHidden(true);
        try {
            localStorage.setItem(checklistKey(user?.id), 'true');
        } catch { /* hiding for this visit is enough */ }
    };

    /* ── Render ──────────────────────────────────────────────────────────── */

    if (authLoading) return <SplashLoader text="Loading your dashboard..." />;

    if (!isCreator) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center px-4">
                <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/[0.06]">
                    <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/15 to-sky-500/5 text-sky-700 ring-1 ring-inset ring-sky-500/20">
                        <Pencil className="h-6 w-6" />
                    </span>
                    <h1 className="text-2xl font-bold tracking-[-0.02em] text-slate-900">Turn on your teacher tools</h1>
                    <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                        Make tests, run them as online exams and see every candidate's marks.
                    </p>
                    <button
                        type="button"
                        className={`${PRIMARY_BTN} mt-6 h-12 w-full`}
                        onClick={async () => {
                            if (!user?.id) return;
                            const { error } = await apiToggleCreatorMode(user.id, true);
                            if (error) {
                                toast.error('Could not turn on teacher tools. Please try again.');
                                return;
                            }
                            window.location.reload();
                        }}
                    >
                        Turn on
                    </button>
                </div>
            </div>
        );
    }

    const fullName = profileForRole?.full_name || (!isImpersonating ? user?.user_metadata?.full_name : '') || '';
    const callName = isInstitution ? fullName : fullName.split(' ')[0];
    const eyebrow = isInstitution ? 'Institute dashboard' : 'Teacher dashboard';
    const { live, upcoming, latest } = model;
    // A sitting with a join code counts as running an exam, and its submissions as results.
    const checklist = {
        ...model.checklist,
        hasConducted: model.checklist.hasConducted || !!examSessions?.length,
        hasResult: model.checklist.hasResult || !!examSessions?.some(s => s.counts.submitted > 0),
    };
    const showChecklist = !isDemo && !checklistHidden && !testsLoading && attemptsState === 'ready'
        && !(checklist.hasTest && checklist.hasConducted && checklist.hasResult);

    const liveSitting = examSessions?.find(s => s.phase === 'live');
    const summary = (() => {
        if (testsLoading) return 'Loading your workspace…';
        if (liveSitting && live.length === 0) {
            return <>“<strong className="font-semibold text-slate-900">{liveSitting.test.title}</strong>” is live for {liveSitting.name} — <strong className="font-semibold text-emerald-700">{liveSitting.counts.writing} writing</strong>, {liveSitting.counts.submitted} submitted.</>;
        }
        if (live.length > 0) {
            const writing = live.reduce((s, l) => s + l.writingNow, 0);
            const submitted = live.reduce((s, l) => s + l.submitted, 0);
            const what = live.length === 1 ? <>“<strong className="font-semibold text-slate-900">{live[0].test.title}</strong>” is live</> : <>{live.length} exams are live</>;
            return <>{what} — <strong className="font-semibold text-emerald-700">{writing} writing now</strong>, {submitted} submitted.</>;
        }
        const soon = upcoming[0];
        if (soon && soon.startsAt.getTime() - now.getTime() < 48 * 3600 * 1000) {
            return <>“<strong className="font-semibold text-slate-900">{soon.test.title}</strong>” starts {dayAndTime(soon.startsAt, now)} ({untilText(soon.startsAt, now)}).</>;
        }
        if (latest && now.getTime() - latest.lastAt.getTime() < 7 * 24 * 3600 * 1000) {
            return <>{plural(latest.count, 'candidate')} took “<strong className="font-semibold text-slate-900">{latest.test.title}</strong>” — last result {timeAgo(latest.lastAt, now)}.</>;
        }
        if (!checklist.hasTest) return "Let's get your first online exam running.";
        return 'No exam is running right now.';
    })();

    const resultsLoading = attemptsState === 'loading' && attempts.length === 0;
    const hasNumbers = model.numbers.results + model.numbers.resultsPrev > 0;
    const showStudents = model.students.total >= 3;
    const showBatches = isInstitution || model.batches.length > 0;

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-16 pt-5 sm:px-6 sm:pt-8 lg:px-8">
            {isImpersonating && (
                <div className="flex items-center gap-2.5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/20">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500 motion-safe:animate-pulse" />
                    <span>Viewing the dashboard of <strong>{targetProfile?.full_name || targetProfile?.email || 'this user'}</strong></span>
                </div>
            )}

            <DashboardHeader
                eyebrow={eyebrow}
                title={callName ? `${greeting(now)}, ${callName}` : greeting(now)}
                summary={summary}
                avatarUrl={profileForRole?.avatar_url || (!isImpersonating ? user?.user_metadata?.avatar_url : null)}
                displayName={fullName}
                isInstitution={isInstitution}
                openReports={openReports}
                onOpenReports={() => navigate(withUser('/my-tests?tab=reports'))}
                onOpenSearch={() => setIsSearchOpen(true)}
                onOpenNotifications={() => setIsNotificationsOpen(true)}
                onCreate={goCreate}
            />

            {showChecklist && (
                <FirstExamChecklist
                    checklist={checklist}
                    liveExam={live[0] || null}
                    onUploadPaper={goUpload}
                    onTypeQuestions={goCreate}
                    onConduct={setConductTarget}
                    onHide={hideChecklist}
                />
            )}

            <LiveNowSection
                live={live}
                upcoming={upcoming}
                updatedAt={liveUpdatedAt}
                now={now}
                onResults={openResults}
                onSettings={openSettings}
                onEdit={openEditor}
                onSolutions={openSolutions}
                onShare={shareTest}
                onStop={setStopTarget}
                onGetCode={getJoinCode}
            />

            {examSessions && (checklist.hasTest || examSessions.length > 0) && (
                <ExamRoomsCard
                    sessions={examSessions}
                    onOpen={(sid) => navigate(`/exams/${sid}`)}
                    onNew={() => setNewExam({})}
                    onAll={() => navigate('/exams')}
                />
            )}

            {attemptsState === 'error' && (
                <div className="flex flex-col gap-3 rounded-2xl bg-amber-50 px-4 py-3.5 text-[14px] text-amber-900 ring-1 ring-inset ring-amber-600/20 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /> Could not load your candidates' results, so they are not shown below.</span>
                    <button type="button" onClick={loadAttempts} className="inline-flex h-9 items-center gap-1.5 self-start rounded-full bg-white px-3.5 text-[13px] font-semibold text-amber-900 ring-1 ring-amber-600/20 hover:bg-amber-100 sm:self-auto cursor-pointer">
                        <RefreshCw className="h-3.5 w-3.5" /> Try again
                    </button>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0 space-y-6">
                    {resultsLoading ? (
                        <div className={`${CARD} space-y-4 p-5`}>
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-6 w-2/3" />
                            <div className="grid grid-cols-3 gap-2.5">
                                <Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" />
                            </div>
                            <Skeleton className="h-3 w-full" />
                        </div>
                    ) : latest ? (
                        <LatestResultCard summary={latest} now={now} onOpenResults={openResults} onOpenAnalysis={openAnalysis} />
                    ) : null}

                    <RecentResultsCard summaries={model.recent} now={now} onOpen={openResults} onSeeAll={() => navigate('/all-submissions')} />

                    <ContinueWorking
                        tests={model.workingOn}
                        loading={testsLoading}
                        classes={classes}
                        now={now}
                        onEdit={openEditor}
                        onConduct={setConductTarget}
                        onSettings={openSettings}
                        onResults={openResults}
                        onShare={shareTest}
                        onSolutions={openSolutions}
                        onDelete={setDeleteTarget}
                        onBatchChange={changeBatch}
                        onSchedule={(test) => setNewExam({ testId: test.id })}
                        onViewAll={() => navigate(withUser('/my-tests'))}
                    />
                </div>

                <aside className="min-w-0 space-y-6" aria-label="Overview">
                    <CreateCard onUploadPaper={goUpload} onTypeQuestions={goCreate} onCombine={goCombine} />
                    {hasNumbers && <NumbersCard numbers={model.numbers} />}
                    {showStudents && <StudentsCard {...model.students} />}
                    {showBatches && (
                        <BatchesCard
                            batches={model.batches}
                            isInstitution={isInstitution}
                            onCreate={createBatch}
                            onAssignTests={() => navigate(withUser('/my-tests'))}
                            onOpen={(batchId) => navigate(batchId.startsWith('sample-') ? '/batches' : `/batches/${batchId}`)}
                        />
                    )}
                </aside>
            </div>

            <GlobalSearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} userTests={tests} />
            <NewExamSheet
                open={!!newExam}
                onOpenChange={(open) => { if (!open) setNewExam(null); }}
                ownerId={targetUserId}
                asUser={isImpersonating ? impersonateUserId : null}
                presetTestId={newExam?.testId}
                onCreated={() => loadExamSessions()}
            />
            <NotificationCenter open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen} />

            {conductTarget && (
                <ConductExamDialog
                    open={!!conductTarget}
                    test={conductTarget}
                    loading={conductLoading}
                    onClose={() => setConductTarget(null)}
                    onConfirm={confirmConduct}
                />
            )}

            {settingsTarget && (
                <TestSettingsPanel
                    test={settingsTarget}
                    onClose={() => setSettingsTarget(null)}
                    onUpdate={(updated) => {
                        if (updated) replaceTest(updated.id, updated);
                        else loadTests();
                    }}
                    onSettingsChange={(settings) => setSettingsTarget((prev: any) => (prev ? { ...prev, settings } : prev))}
                    onViewResults={() => setResultsTarget(settingsTarget)}
                    onRequestConductExam={(t) => {
                        setSettingsTarget(null);
                        setConductTarget(t);
                    }}
                />
            )}

            {resultsTarget && <TestResultsPanel test={resultsTarget} onClose={() => setResultsTarget(null)} />}

            {/* Stop a live exam — never one tap, it cuts the link mid-exam */}
            <AlertDialog open={!!stopTarget} onOpenChange={(open) => { if (!open) setStopTarget(null); }}>
                <AlertDialogContent className="max-w-[min(400px,calc(100vw-32px))] gap-0 overflow-hidden rounded-2xl p-0">
                    <div className="px-6 pt-6 text-center">
                        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-inset ring-red-600/15">
                            <Square className="h-4 w-4 fill-current" />
                        </span>
                        <AlertDialogTitle className="text-lg font-semibold tracking-[-0.01em] text-slate-900">Stop this exam?</AlertDialogTitle>
                        <AlertDialogDescription className="mt-1 line-clamp-2 text-[15px] font-medium text-slate-700">{stopTarget?.title}</AlertDialogDescription>
                    </div>
                    <ul className="mx-6 mt-4 space-y-2.5 rounded-xl bg-slate-50 p-4 text-left text-[13px] leading-snug text-slate-700">
                        <li className="flex gap-2.5"><LinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>The exam link stops working, so no new candidate can start.</span></li>
                        <li className="flex gap-2.5">
                            <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            <span>
                                {(() => {
                                    const w = live.find(l => l.test.id === stopTarget?.id)?.writingNow || 0;
                                    return w > 0 ? `${plural(w, 'candidate is', 'candidates are')} still writing. Ask them to submit first.` : 'Ask anyone still writing to submit before you stop.';
                                })()}
                            </span>
                        </li>
                        <li className="flex gap-2.5"><BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>Results already submitted stay saved under Ended exams.</span></li>
                        <li className="flex gap-2.5"><Settings className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>Exam settings like anti-cheating go back to default.</span></li>
                    </ul>
                    <div className="grid grid-cols-2 gap-2 p-6 pt-5">
                        <AlertDialogCancel className="m-0 h-11 rounded-xl border-0 bg-slate-100 text-[15px] font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer">Keep it live</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmStop} className="h-11 rounded-xl bg-red-600 text-[15px] font-semibold text-white hover:bg-red-700 cursor-pointer">Stop exam</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <AlertDialogContent className="max-w-[min(420px,calc(100vw-32px))] rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this test?</AlertDialogTitle>
                        <AlertDialogDescription>
                            "{deleteTarget?.title}" and every candidate result for it will be deleted. This can't be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="rounded-xl bg-red-600 hover:bg-red-700">Delete permanently</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
