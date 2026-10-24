import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    fetchAttemptsForTest, deleteAttempt, deleteRegistration, fetchAttemptById,
    fetchStartedCandidates, StartedCandidate,
} from '@/lib/attemptsApi';
import { fetchUsersByIds } from '@/lib/usersApi';
import { fetchTestById } from '@/lib/testsApi';
import { inputsOn } from '@/lib/candidateInputs';
import { getExamUrl, examWhatsAppUrl } from '@/lib/conductExam';
import { isLiveTest, WRITING_WINDOW_MS } from '@/lib/teacherDashboardApi';
import StudentDetailedResultModal from './StudentDetailedResultModal';
import * as XLSX from 'xlsx';
import {
    Sheet,
    SheetContent,
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
import { Input } from '@/components/ui/input';
import { Switch } from "@/components/ui/switch";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Trash2, Download, Loader2, Info, Users, BarChart3, CheckCircle2, XCircle, Clock,
    ChevronDown, ChevronUp, X, PenLine, LogOut, RefreshCw, Search, ArrowRight, Copy, Send,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { isNumericalCorrect } from '@/utils/numericalAnswer';
import { multiPartialScore } from '@/utils/multiCorrect';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface TestResultsPanelProps {
    test: any;
    onClose: () => void;
}

/** The four counts double as tabs: who opened the exam, who is in it, who finished, who quit. */
type Tab = 'started' | 'writing' | 'submitted' | 'dropped';

/** What a candidate typed on the start form (Name, Roll No…). */
type FormFields = Record<string, unknown>;
/** A profile; only admins get names and emails back. */
type Person = { full_name?: string; email?: string };

/** While an exam is live the panel refreshes itself this often. */
const REFRESH_MS = 30_000;

const clock = (ms: number) => format(new Date(ms), isToday(ms) ? 'p' : 'MMM d, p');

/** How a result came in: the live exam, or the test's public / unlisted / private link. */
type Mode = 'conduct' | 'public' | 'unlisted' | 'private';
const MODES: Mode[] = ['conduct', 'public', 'unlisted', 'private'];
const MODE_LABEL: Record<Mode, string> = { conduct: 'Conduct', public: 'Public', unlisted: 'Unlisted', private: 'Private' };

/** The local calendar day a result was submitted on (yyyy-MM-dd), so one sitting stays together. */
const dayOf = (attempt: any) => format(new Date(attempt.created_at), 'yyyy-MM-dd');
const dayLabel = (day: string) => {
    const d = new Date(`${day}T00:00:00`);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, d.getFullYear() === new Date().getFullYear() ? 'EEE, MMM d' : 'MMM d, yyyy');
};

type FilterOption = { value: string; label: string; count: number };

/**
 * A column heading that is also its filter: "Mode  All ⌄". Reads as a heading until a
 * filter is set, then the chosen value turns indigo so a narrowed table is never mistaken
 * for the whole one.
 */
function ColumnFilter({ label, value, total, options, onChange }: {
    label: string;
    value: string;
    total: number;
    options: FilterOption[];
    onChange: (value: string) => void;
}) {
    const active = value !== 'all';
    const current = options.find(o => o.value === value);
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={`Filter by ${label.toLowerCase()}`}
                    className="-ml-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap transition-colors hover:bg-slate-200/60 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 data-[state=open]:bg-slate-200/60 dark:data-[state=open]:bg-slate-800"
                >
                    {label}
                    <span className={active ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'font-medium text-slate-400'}>
                        {active ? current?.label : 'All'}
                    </span>
                    <ChevronDown className={`h-3 w-3 ${active ? 'text-indigo-500' : 'text-slate-400'}`} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[170px]">
                <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
                    {[{ value: 'all', label: 'All', count: total }, ...options].map(o => (
                        <DropdownMenuRadioItem key={o.value} value={o.value} className="text-xs">
                            <span className="flex-1">{o.label}</span>
                            <span className="ml-4 tabular-nums text-slate-400">{o.count}</span>
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function StatTile({ label, value, icon, tone, active, pulse, onClick }: {
    label: string;
    value: React.ReactNode;
    icon: React.ReactNode;
    tone: string;
    active: boolean;
    pulse?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={`rounded-lg px-1.5 py-2 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${active ? 'bg-white/20 ring-1 ring-white/40' : 'bg-white/10 hover:bg-white/15'}`}
        >
            <div className="flex items-center justify-center gap-1 mb-0.5">
                {icon}
                {pulse && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </div>
            <p className={`text-lg font-black leading-none ${tone}`}>{value}</p>
            <p className={`text-[9px] font-medium mt-0.5 uppercase tracking-wide truncate ${active ? 'text-white' : 'text-slate-400'}`}>{label}</p>
        </button>
    );
}

function Initial({ name, rank }: { name: string; rank?: number }) {
    return (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800 flex items-center justify-center">
            <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300">
                {rank ? `#${rank}` : String(name || 'A').charAt(0).toUpperCase()}
            </span>
        </div>
    );
}

export default function TestResultsPanel({ test, onClose }: TestResultsPanelProps) {
    const { isAdmin, isPremium } = useAuth();
    const navigate = useNavigate();
    const [results, setResults] = useState<any[]>([]);
    // Started but not submitted; null when the server could not say.
    const [started, setStarted] = useState<StartedCandidate[] | null>([]);
    const [clockSkew, setClockSkew] = useState(0); // server clock minus this device's
    const [updatedAt, setUpdatedAt] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [nowTick, setNowTick] = useState(() => Date.now());
    const [tab, setTab] = useState<Tab>('submitted');
    const [query, setQuery] = useState('');
    const usersRef = useRef(new Map<string, Person | undefined>());
    const refreshingRef = useRef(false);

    const calculateDuration = (startedAt?: string, createdAt?: string) => {
        if (!startedAt || !createdAt) return '—';
        const start = new Date(startedAt).getTime();
        const end = new Date(createdAt).getTime();
        const diffMs = end - start;
        if (isNaN(diffMs) || diffMs < 0) return '—';
        
        const diffSecs = Math.floor(diffMs / 1000);
        const mins = Math.floor(diffSecs / 60);
        const secs = diffSecs % 60;
        
        if (mins > 0) {
            return `${mins}m ${secs}s`;
        }
        return `${secs}s`;
    };
    const [loading, setLoading] = useState(true);
    const [loadingAnalysisId, setLoadingAnalysisId] = useState<string | null>(null);
    // Off until the creator asks for it: newest submissions first.
    const [showRank, setShowRank] = useState(false);
    const [modeFilter, setModeFilter] = useState<Mode | 'all'>('all');
    const [dayFilter, setDayFilter] = useState<string>('all');
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [fullTest, setFullTest] = useState<any>(null);
    const [selectedAttemptForAnalysis, setSelectedAttemptForAnalysis] = useState<any | null>(null);

    // Fetch results, who started, and test details on load
    useEffect(() => {
        if (test?.id) {
            setFullTest(null);
            setResults([]);
            setStarted([]);
            setQuery('');
            usersRef.current = new Map();
            load(false);
        }
    }, [test]);

    /** Attaches profiles (names for admins); each id is looked up once per panel. */
    const withUsers = async <T extends { user_id?: string; user?: Person }>(attempts: T[]) => {
        const missing = Array.from(new Set(attempts.map(d => d.user_id)))
            .filter(id => id && !usersRef.current.has(id)) as string[];
        if (missing.length > 0) {
            const { data: users } = await fetchUsersByIds(missing);
            missing.forEach(id => usersRef.current.set(id, undefined));
            ((users || []) as (Person & { id: string })[]).forEach(u => usersRef.current.set(u.id, u));
        }
        attempts.forEach(d => { d.user = d.user_id ? usersRef.current.get(d.user_id) : undefined; });
        return attempts;
    };

    /**
     * `quiet` refreshes show no spinner and keep answer sheets already loaded.
     * Only a refresh the examiner asked for reports a failure.
     */
    const load = async (quiet: boolean, asked = false) => {
        if (quiet) {
            if (refreshingRef.current) return;
            refreshingRef.current = true;
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        try {
            // Attempts, starts and test details in parallel to eliminate waterfall latency
            const [attemptsRes, startedRes, testRes] = await Promise.all([
                fetchAttemptsForTest(test.id, true),
                fetchStartedCandidates(test.id),
                quiet ? Promise.resolve(null) : fetchTestById(test.id, undefined, true),
            ]);

            if (startedRes.data) {
                const serverNow = Date.parse(startedRes.data.now);
                if (!isNaN(serverNow)) setClockSkew(serverNow - Date.now());
                setStarted(startedRes.data.candidates || []);
            } else if (!quiet) {
                setStarted(null);
            }

            if (attemptsRes.error) throw attemptsRes.error;
            const attempts = await withUsers<(typeof results)[number]>(attemptsRes.data || []);
            setResults(prev => {
                if (!quiet) return attempts;
                const loaded = new Map(prev.filter(r => r.answers).map(r => [r.id, r.answers]));
                return attempts.map(a => loaded.has(a.id) ? { ...a, answers: loaded.get(a.id) } : a);
            });

            const loadedTest = testRes?.data;
            if (loadedTest) {
                setFullTest(loadedTest);
                // Open where the news is: submissions, else who has started.
                const conduct = !!loadedTest.settings?.conduct_exam;
                const submittedCount = conduct
                    ? attempts.filter(r => r.metadata?.conduct_exam === true).length
                    : attempts.length;
                const startedCount = startedRes.data?.candidates?.length || 0;
                setTab(submittedCount === 0 && startedCount > 0 ? 'started' : 'submitted');
            }
            setUpdatedAt(Date.now());
        } catch (error) {
            console.error("Error fetching results or test details", error);
            if (asked) toast.error("Couldn't refresh. Check your connection.");
        } finally {
            if (quiet) {
                refreshingRef.current = false;
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    };

    const handleOpenAnalysis = async (attempt: any) => {
        setLoadingAnalysisId(attempt.id);
        try {
            const needsQuestions = !fullTest || (!fullTest.questions && (!fullTest.sections || fullTest.sections.length === 0 || !fullTest.sections[0].questions));
            const needsAnswers = !attempt.answers;

            const [testRes, attemptRes] = await Promise.all([
                needsQuestions ? fetchTestById(test.id, undefined, false) : Promise.resolve({ data: null, error: null }),
                needsAnswers ? fetchAttemptById(attempt.id) : Promise.resolve({ data: null, error: null })
            ]);

            if (testRes.data) {
                setFullTest(testRes.data);
            }

            let fullAttempt = attempt;
            if (attemptRes.data) {
                fullAttempt = {
                    ...attempt,
                    ...attemptRes.data
                };
                setResults(prev => prev.map(r => r.id === attempt.id ? fullAttempt : r));
            } else if (needsAnswers && attemptRes.error) {
                toast.error("Failed to load detailed candidate answers");
            }

            setSelectedAttemptForAnalysis(fullAttempt);
        } catch (err) {
            console.error("Error fetching detailed result data", err);
            toast.error("Failed to load details");
        } finally {
            setLoadingAnalysisId(null);
        }
    };

    // Use fullTest if loaded, otherwise fall back to test prop
    const currentTest = fullTest || test;

    const modeOf = (attempt: any): Mode => {
        const visibility = attempt.metadata?.visibility || attempt.metadata?.test_visibility || (attempt.metadata?.conduct_exam ? 'conduct' : (currentTest?.visibility || (currentTest?.is_public ? 'public' : 'private')));
        if (visibility === 'conduct' || attempt.metadata?.conduct_exam) return 'conduct';
        if (visibility === 'public' || visibility === 'unlisted') return visibility;
        return 'private';
    };

    const getSubmissionModeBadge = (attempt: any) => {
        const visibility = modeOf(attempt);
        if (visibility === 'conduct') {
            return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 text-[10px] py-0.5 px-1.5 font-bold uppercase tracking-wider">Conduct</Badge>;
        }
        if (visibility === 'public') {
            return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 text-[10px] py-0.5 px-1.5 font-bold uppercase tracking-wider">Public</Badge>;
        }
        if (visibility === 'unlisted') {
            return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 text-[10px] py-0.5 px-1.5 font-bold uppercase tracking-wider">Unlisted</Badge>;
        }
        return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 text-[10px] py-0.5 px-1.5 font-bold uppercase tracking-wider">Private</Badge>;
    };

    // Only show conduct-exam results if this test has conduct settings
    const isConductTest = !!(currentTest?.settings?.conduct_exam);

    // Calculate Total Marks
    let totalMaxMarks = currentTest?.total_max_marks || 0;
    if (currentTest && !totalMaxMarks) {
        if (currentTest.enable_section_mode && currentTest.sections) {
            currentTest.sections.forEach((sec: any) => {
                if (sec.questions) {
                    sec.questions.forEach((q: any) => {
                        const m = q.marks !== undefined ? parseFloat(q.marks) : (sec.marks_per_question ? parseFloat(sec.marks_per_question) : 4);
                        totalMaxMarks += isNaN(m) ? 0 : m;
                    });
                }
            });
        } else if (currentTest.questions) {
            currentTest.questions.forEach((q: any) => {
                const m = q.marks !== undefined ? parseFloat(q.marks) : (currentTest.marks_per_question ? parseFloat(currentTest.marks_per_question) : 4);
                totalMaxMarks += isNaN(m) ? 0 : m;
            });
        }
    }

    // For conduct-exam tests: only show attempts tagged with conduct_exam=true
    const filteredResults = isConductTest
        ? results.filter((r) => r.metadata?.conduct_exam === true)
        : results;

    const handleDelete = async (attemptId: string, userId: string) => {
        if (!confirm('Delete this result? The candidate will be able to attempt again.')) return;
        try {
            const { error: attemptError } = await deleteAttempt(attemptId);
            if (attemptError) throw attemptError;
            await deleteRegistration(currentTest.id, userId).catch(() => { });
            setResults(prev => prev.filter(r => r.id !== attemptId));
            toast.success('Result deleted. The candidate can attempt again.');
        } catch (error) {
            toast.error('Failed to delete result');
        }
    };

    const getSortedResults = (data: any[]) => {
        if (!showRank) {
            return [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        return [...data].sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            const sA = a.metadata?.stats || { wrongCount: 0, unattemptedCount: 0 };
            const sB = b.metadata?.stats || { wrongCount: 0, unattemptedCount: 0 };
            if (sA.wrongCount !== sB.wrongCount) return sA.wrongCount - sB.wrongCount;
            if (sA.unattemptedCount !== sB.unattemptedCount) return sA.unattemptedCount - sB.unattemptedCount;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
    };

    const displayedResults = getSortedResults(filteredResults);

    // ── Mode / Submitted filters ──
    // A live exam only lists its own results, so there is nothing to filter by mode.
    const showModeColumn = !isConductTest;
    const countBy = (rows: any[], key: (r: any) => string) => {
        const counts = new Map<string, number>();
        rows.forEach(r => counts.set(key(r), (counts.get(key(r)) || 0) + 1));
        return counts;
    };
    // Each list counts what the other filter leaves, so the numbers match what a click shows.
    const modeCounts = countBy(displayedResults.filter(r => dayFilter === 'all' || dayOf(r) === dayFilter), modeOf);
    const modeOptions: FilterOption[] = MODES
        .filter(m => modeCounts.has(m) || m === modeFilter)
        .map(m => ({ value: m, label: MODE_LABEL[m], count: modeCounts.get(m) || 0 }));
    const dayCounts = countBy(displayedResults.filter(r => !showModeColumn || modeFilter === 'all' || modeOf(r) === modeFilter), dayOf);
    const dayOptions: FilterOption[] = Array.from(new Set([...dayCounts.keys(), ...(dayFilter === 'all' ? [] : [dayFilter])]))
        .sort((a, b) => b.localeCompare(a))
        .map(d => ({ value: d, label: dayLabel(d), count: dayCounts.get(d) || 0 }));
    const inCohort = (r: any) =>
        (!showModeColumn || modeFilter === 'all' || modeOf(r) === modeFilter) &&
        (dayFilter === 'all' || dayOf(r) === dayFilter);
    const isFiltered = (showModeColumn && modeFilter !== 'all') || dayFilter !== 'all';
    const clearFilters = () => { setModeFilter('all'); setDayFilter('all'); };
    // Stats, ranks and the Excel file all follow the filters; the tiles above count everyone.
    const cohortResults = displayedResults.filter(inCohort);
    const modeFilterControl = (
        <ColumnFilter
            label="Mode"
            value={modeFilter}
            total={Array.from(modeCounts.values()).reduce((s, v) => s + v, 0)}
            options={modeOptions}
            onChange={v => setModeFilter(v as Mode | 'all')}
        />
    );
    const dayFilterControl = (
        <ColumnFilter
            label="Submitted"
            value={dayFilter}
            total={Array.from(dayCounts.values()).reduce((s, v) => s + v, 0)}
            options={dayOptions}
            onChange={setDayFilter}
        />
    );

    // Computed stats
    const scores = cohortResults.map(r => r.score || 0);
    const avgScore = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
    const topScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowScore = scores.length > 0 ? Math.min(...scores) : 0;
    const isStartFormEnabled = inputsOn(currentTest?.settings);
    const fields = currentTest?.settings?.start_form?.fields && currentTest.settings.start_form.fields.length > 0
        ? currentTest.settings.start_form.fields
        : (isStartFormEnabled ? [{ label: 'Name', required: true }] : []);
    const configuredFormLabels = fields.map((f: any) => f?.label).filter(Boolean);

    /** The name to show for what a candidate typed on the start form. */
    const nameOf = (formData: FormFields = {}, user?: Person) => {
        if (isStartFormEnabled && configuredFormLabels.length > 0) {
            const firstLabel = configuredFormLabels[0];
            if (formData[firstLabel] !== undefined && formData[firstLabel] !== null && formData[firstLabel] !== '') {
                return String(formData[firstLabel]);
            }
        }
        const formKeys = Object.keys(formData);
        const pk = formKeys.find(k => k.toLowerCase().includes('name')) || (formKeys.length > 0 ? formKeys[0] : null);
        if (pk && formData[pk]) return String(formData[pk]);
        if (isAdmin && user?.full_name) return user.full_name;
        if (isAdmin && user?.email) return user.email;
        return 'Anonymous Candidate';
    };

    /** Everything else they typed (roll no, batch…) as one quiet line. */
    const detailsOf = (formData: FormFields = {}) => {
        const name = nameOf(formData);
        return Object.entries(formData)
            .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '' && String(v) !== name)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' · ');
    };

    // ── Who is in the exam ──
    const serverNow = nowTick + clockSkew;
    const totalQuestions = currentTest?.total_questions || currentTest?.questions?.length || 0;
    const lastSeen = (c: StartedCandidate) => Date.parse(c.last_active_at || c.started_at || '') || 0;
    const isWriting = (c: StartedCandidate) => {
        const seen = lastSeen(c);
        // A timestamp in the future is an old row stored with the wrong offset, not activity.
        return c.status === 'in_progress' && serverNow - seen <= WRITING_WINDOW_MS && seen <= serverNow + 2 * 60 * 1000;
    };
    const writing = (started || []).filter(isWriting);
    const dropped = (started || []).filter(c => !isWriting(c));
    const answeredOf = (c: StartedCandidate) => c.answered ?? (totalQuestions ? Math.round((c.completion || 0) * totalQuestions / 100) : 0);
    const startedCount = started ? displayedResults.length + started.length : null;
    const isLive = !!currentTest && isLiveTest(currentTest, new Date(nowTick));
    const hiddenPractice = isConductTest ? results.length - filteredResults.length : 0;

    // Search narrows what is on screen; ranks and the Excel file stay whole.
    const q = query.trim().toLowerCase();
    const matches = (formData: FormFields = {}, user?: Person) =>
        !q || [nameOf(formData, user), ...Object.values(formData)].join(' ').toLowerCase().includes(q);
    const rankOf = new Map(cohortResults.map((r, i) => [r.id, i + 1]));
    const shownResults = cohortResults.filter(r => matches(r.metadata?.startFormData, r.user));
    const shownWriting = writing
        .filter(c => matches(c.startFormData))
        .sort((a, b) => answeredOf(b) - answeredOf(a));
    const shownDropped = dropped
        .filter(c => matches(c.startFormData))
        .sort((a, b) => lastSeen(b) - lastSeen(a));
    // Everyone who opened the exam, newest start first.
    const shownStarted = [
        ...displayedResults.map(r => ({
            key: r.id,
            formData: r.metadata?.startFormData || {},
            user: r.user,
            startedMs: Date.parse(r.metadata?.startedAt || r.created_at) || 0,
            attempt: r,
            candidate: null as StartedCandidate | null,
        })),
        ...(started || []).map(c => ({
            key: c.id,
            formData: c.startFormData || {},
            user: undefined,
            startedMs: Date.parse(c.started_at || '') || 0,
            attempt: null as (typeof displayedResults)[number] | null,
            candidate: c,
        })),
    ].filter(row => matches(row.formData, row.user)).sort((a, b) => b.startedMs - a.startedMs);
    const showSearch = (startedCount ?? displayedResults.length) > 8;

    // Keep "3 min ago" and "writing now" honest between refreshes.
    useEffect(() => {
        const id = setInterval(() => setNowTick(Date.now()), 15_000);
        return () => clearInterval(id);
    }, []);

    // A live exam refreshes itself while the panel is open and on screen.
    useEffect(() => {
        if (!isLive) return;
        const id = setInterval(() => {
            if (document.visibilityState === 'visible') load(true);
        }, REFRESH_MS);
        return () => clearInterval(id);
    }, [isLive, test?.id]);

    const copyExamLink = async () => {
        try {
            await navigator.clipboard.writeText(getExamUrl(currentTest));
            toast.success('Exam link copied');
        } catch {
            toast.error("Couldn't copy. Copy the link from My Tests.");
        }
    };

    const openFullReport = () => {
        onClose();
        navigate(`/analytics/full?testId=${currentTest.id || test.id}`);
    };

    const downloadExcel = async () => {
        if (!isAdmin && !isPremium) {
            toast.error("Exporting results to Excel is a premium feature.");
            return;
        }

        // The file holds what the table shows: same Mode and Submitted filters.
        let currentResults = cohortResults;
        let activeTest = currentTest;

        const needsAnswers = cohortResults.some(r => !r.answers);
        const needsQuestions = !currentTest || (!currentTest.questions && (!currentTest.sections || currentTest.sections.length === 0 || !currentTest.sections[0].questions));

        if (needsAnswers || needsQuestions) {
            setLoading(true);
            try {
                if (needsQuestions) {
                    const { data: testData } = await fetchTestById(test.id, undefined, false);
                    if (testData) {
                        setFullTest(testData);
                        activeTest = testData;
                    }
                }
                if (needsAnswers) {
                    toast.info("Downloading detailed candidate responses for export...");
                    const { data: attemptsData } = await fetchAttemptsForTest(test.id, false);
                    if (attemptsData) {
                        // Re-enrich with user data
                        const userIds = Array.from(new Set(attemptsData.map((d: any) => d.user_id))) as string[];
                        if (userIds.length > 0) {
                            const { data: users } = await fetchUsersByIds(userIds);
                            if (users) {
                                const userMap = new Map(users.map((u: any) => [u.id, u]));
                                attemptsData.forEach((d: any) => { d.user = userMap.get(d.user_id); });
                            }
                        }
                        setResults(attemptsData);
                        currentResults = getSortedResults(
                            isConductTest
                                ? attemptsData.filter((r: any) => r.metadata?.conduct_exam === true)
                                : attemptsData
                        ).filter(inCohort);
                    }
                }
            } catch (err) {
                console.error("Error preparing data for export", err);
                toast.error("Failed to prepare detailed data for export.");
                setLoading(false);
                return;
            } finally {
                setLoading(false);
            }
        }

        const hasSections = !!(activeTest?.enable_section_mode && activeTest?.sections && activeTest?.sections.length > 0);

        // Define start form labels / dynamic headers
        const startFormKeys = new Set<string>();
        currentResults.forEach(r => {
            if (r.metadata?.startFormData) {
                Object.keys(r.metadata.startFormData).forEach(k => startFormKeys.add(k));
            }
        });

        let dynamicHeaders = Array.from(startFormKeys);
        if (isStartFormEnabled && configuredFormLabels.length > 0) {
            dynamicHeaders = [...configuredFormLabels];
            startFormKeys.forEach(k => {
                if (!dynamicHeaders.includes(k)) dynamicHeaders.push(k);
            });
        } else {
            dynamicHeaders.sort((a, b) => {
                const al = a.toLowerCase(), bl = b.toLowerCase();
                if (al.includes('name') && !bl.includes('name')) return -1;
                if (!al.includes('name') && bl.includes('name')) return 1;
                if (al.includes('roll') && !bl.includes('roll')) return -1;
                if (!al.includes('roll') && bl.includes('roll')) return 1;
                return a.localeCompare(b);
            });
        }

        // Base Candidate details
        const baseHeaders: string[] = [];
        if (showRank) baseHeaders.push("Rank");
        if (isStartFormEnabled) {
            baseHeaders.push(...configuredFormLabels);
            if (isAdmin) baseHeaders.push("Email");
        } else {
            if (isAdmin) baseHeaders.push("Profile Name", "Email");
            baseHeaders.push(...dynamicHeaders);
        }
        baseHeaders.push("Date", "Time", "Time Taken");

        let headerRow1: string[] = [];
        let headerRow2: string[] = [];
        let flatHeaders: string[] = [];

        const parseFractionOrFloat = (value: string | number | undefined | null, defaultVal: number = 0): number => {
            if (value === undefined || value === null || value === '') return defaultVal;
            if (typeof value === 'number') return value;
            try {
                const valStr = String(value).trim();
                if (valStr.includes('/')) {
                    const parts = valStr.split('/');
                    if (parts.length === 2) {
                        const numerator = parseFloat(parts[0]);
                        const denominator = parseFloat(parts[1]);
                        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
                            return numerator / denominator;
                        }
                    }
                }
                const parsed = parseFloat(valStr);
                return isNaN(parsed) ? defaultVal : parsed;
            } catch (e) {
                return defaultVal;
            }
        };

        // Helper to evaluate marks per question for correct / negative
        const testMarksPerQ = parseFractionOrFloat(activeTest?.marks_per_question, 4);
        const testNegativeMarks = parseFractionOrFloat(activeTest?.negative_marks, 0);

        const getCorrectAnswerDisplay = (q: any) => {
            if (q.correctAnswer === undefined || q.correctAnswer === null) return '';
            if (q.type === 'numerical' && typeof q.correctAnswer === 'object' && q.correctAnswer.exactMatch) {
                return String(q.correctAnswer.exactAnswers ?? '');
            }
            if (q.type === 'numerical' && typeof q.correctAnswer === 'object' && 'min' in q.correctAnswer && 'max' in q.correctAnswer) {
                return `[${q.correctAnswer.min}, ${q.correctAnswer.max}]`;
            }
            if (Array.isArray(q.correctAnswer)) {
                return q.correctAnswer.map(String).sort().join(",");
            }
            return String(q.correctAnswer);
        };

        const getQuestionResult = (q: any, userAns: any, defaultMarks: number, defaultNeg: number) => {
            const maxScore = parseFractionOrFloat(q.marks, defaultMarks);
            const negScore = parseFractionOrFloat(q.negativeMarks, defaultNeg);

            if (
                userAns === undefined ||
                userAns === null ||
                userAns === '' ||
                (Array.isArray(userAns) && userAns.length === 0)
            ) {
                return { status: "Unattempted", score: 0, userAnswer: "N/A", correctAnswer: getCorrectAnswerDisplay(q) };
            }

            const isMulti = q.type === 'multiple' || Array.isArray(q.correctAnswer);
            const userAnsStr = Array.isArray(userAns) ? userAns.map(String).sort().join(",") : String(userAns);
            const correctAnsStr = getCorrectAnswerDisplay(q);

            if (isMulti) {
                const correctSet = new Set((Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer]).map(String));
                const userList = Array.isArray(userAns) ? userAns.map(String) : [String(userAns)];
                const isCorrect = userList.length === correctSet.size && userList.every(v => correctSet.has(v));
                if (isCorrect) {
                    return { status: "Correct", score: maxScore, userAnswer: userAnsStr, correctAnswer: correctAnsStr };
                }
                // Same rule as the server (scoring.py): some correct options and no wrong one
                // earn partial marks, proportional or JEE Advanced's +1 per option.
                const incorrectCount = userList.filter(v => !correctSet.has(v)).length;
                if (incorrectCount === 0 && userList.length > 0) {
                    const earned = multiPartialScore(q, userList.length, correctSet.size, maxScore);
                    return { status: "Partial", score: earned, userAnswer: userAnsStr, correctAnswer: correctAnsStr };
                }
                return { status: "Wrong", score: -negScore, userAnswer: userAnsStr, correctAnswer: correctAnsStr };
            } else if (q.type === 'numerical') {
                let isCorrect = false;
                const userNum = parseFloat(String(userAns));
                if (q.correctAnswer && typeof q.correctAnswer === 'object') {
                    // A range, or "Exact value(s)" (exactMatch), as the server marks it.
                    isCorrect = isNumericalCorrect(q.correctAnswer, userAns);
                } else {
                    const corrNum = parseFloat(String(q.correctAnswer));
                    if (!isNaN(userNum) && !isNaN(corrNum)) {
                        isCorrect = userNum === corrNum;
                    } else {
                        isCorrect = String(userAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
                    }
                }
                if (isCorrect) {
                    return { status: "Correct", score: maxScore, userAnswer: userAnsStr, correctAnswer: correctAnsStr };
                }
                return { status: "Wrong", score: -negScore, userAnswer: userAnsStr, correctAnswer: correctAnsStr };
            } else {
                const isCorrect = String(userAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
                if (isCorrect) {
                    return { status: "Correct", score: maxScore, userAnswer: userAnsStr, correctAnswer: correctAnsStr };
                }
                return { status: "Wrong", score: -negScore, userAnswer: userAnsStr, correctAnswer: correctAnsStr };
            }
        };

        if (hasSections) {
            // Header Row 1: Merge labels
            headerRow1 = [...baseHeaders];
            // Header Row 2: Empty fillers for base columns
            headerRow2 = baseHeaders.map(() => "");

            // Sections loop
            (activeTest?.sections || []).forEach((sec: any) => {
                headerRow1.push(sec.name, "", "", "");
                headerRow2.push("Correct", "Wrong", "Marks (-ve)", "Marks (+ve)");
            });

            // Overall Summary merge headers
            headerRow1.push("Overall Summary", "", "", "", "", "", "", "");
            headerRow2.push(
                "Total Questions",
                "Total Correct",
                "Total Incorrect",
                "Total +ve Score",
                "Total -ve Score",
                "Total Partial Mark",
                "Final Score",
                "Percentage"
            );
        } else {
            flatHeaders = [...baseHeaders];
            flatHeaders.push(
                "Total Questions",
                "Total Correct",
                "Total Incorrect",
                "Total +ve Score",
                "Total -ve Score",
                "Total Partial Mark",
                "Final Score",
                "Percentage"
            );

            // Append per-question detail columns for flat tests
            const questions = activeTest?.questions || [];
            questions.forEach((q: any, qIdx: number) => {
                const label = q.title ? `Q${qIdx + 1}: ${q.title}` : `Q${qIdx + 1}`;
                flatHeaders.push(`${label} (Student Ans)`, `${label} (Correct Ans)`, `${label} (Status)`, `${label} (Score)`);
            });
        }

        const rows = currentResults.map((attempt, index) => {
            const formData = attempt.metadata?.startFormData || {};
            const dateObj = new Date(attempt.created_at);
            const userAnswers = attempt.answers || {};

            const rowData: any[] = [];
            if (showRank) rowData.push(index + 1);

            if (isStartFormEnabled) {
                configuredFormLabels.forEach((label: string) => {
                    rowData.push(formData[label] !== undefined ? String(formData[label]) : 'N/A');
                });
                if (isAdmin) rowData.push(attempt.user?.email || 'N/A');
            } else {
                if (isAdmin) rowData.push(attempt.user?.full_name || 'N/A', attempt.user?.email || 'N/A');
                dynamicHeaders.forEach(k => {
                    rowData.push(formData[k] !== undefined ? String(formData[k]) : '');
                });
            }

            rowData.push(
                format(dateObj, 'yyyy-MM-dd'),
                format(dateObj, 'hh:mm:ss a'),
                calculateDuration(attempt.metadata?.startedAt, attempt.created_at)
            );

            let overallQuestions = 0;
            let overallCorrect = 0;
            let overallIncorrect = 0;
            let overallPositive = 0;
            let overallNegative = 0;
            let overallPartialMark = 0;

            if (hasSections) {
                (activeTest?.sections || []).forEach((sec: any) => {
                    let secCorrect = 0;
                    let secWrong = 0;
                    let secNegativeScore = 0;
                    let secPositiveScore = 0;
                    const secMarksPerQ = parseFractionOrFloat(sec.marks_per_question, testMarksPerQ);
                    const secNegativeMarks = parseFractionOrFloat(sec.negative_marks, testNegativeMarks);

                    const secQuestions = sec.questions || [];
                    secQuestions.forEach((q: any) => {
                        const userAns = userAnswers[q.id];
                        const res = getQuestionResult(q, userAns, secMarksPerQ, secNegativeMarks);

                        if (res.status === "Correct") {
                            secCorrect++;
                            secPositiveScore += res.score;
                            overallCorrect++;
                            overallPositive += res.score;
                        } else if (res.status === "Wrong") {
                            secWrong++;
                            secNegativeScore += Math.abs(res.score);
                            overallIncorrect++;
                            overallNegative += Math.abs(res.score);
                        } else if (res.status === "Partial") {
                            secCorrect++;
                            secPositiveScore += res.score;
                            overallCorrect++;
                            overallPartialMark += res.score;
                            overallPositive += res.score;
                        }
                        overallQuestions++;
                    });

                    rowData.push(
                        secCorrect,
                        secWrong,
                        parseFloat(secNegativeScore.toFixed(3)),
                        parseFloat(secPositiveScore.toFixed(3))
                    );
                });

                const finalScore = parseFloat((overallPositive - overallNegative).toFixed(3));
                const percentage = totalMaxMarks > 0 ? parseFloat(((finalScore / totalMaxMarks) * 100).toFixed(3)) : 0;

                rowData.push(
                    overallQuestions,
                    overallCorrect,
                    overallIncorrect,
                    parseFloat(overallPositive.toFixed(3)),
                    parseFloat(overallNegative.toFixed(3)),
                    parseFloat(overallPartialMark.toFixed(3)),
                    finalScore,
                    percentage
                );

            } else {
                const questions = activeTest?.questions || [];
                const questionDetailsList: any[] = [];

                questions.forEach((q: any) => {
                    const userAns = userAnswers[q.id];
                    const res = getQuestionResult(q, userAns, testMarksPerQ, testNegativeMarks);

                    if (res.status === "Correct") {
                        overallCorrect++;
                        overallPositive += res.score;
                    } else if (res.status === "Wrong") {
                        overallIncorrect++;
                        overallNegative += Math.abs(res.score);
                    } else if (res.status === "Partial") {
                        overallCorrect++;
                        overallPartialMark += res.score;
                        overallPositive += res.score;
                    }
                    overallQuestions++;

                    questionDetailsList.push(
                        res.userAnswer,
                        res.correctAnswer,
                        res.status,
                        parseFloat(res.score.toFixed(3))
                    );
                });

                const finalScore = parseFloat((overallPositive - overallNegative).toFixed(3));
                const percentage = totalMaxMarks > 0 ? parseFloat(((finalScore / totalMaxMarks) * 100).toFixed(3)) : 0;

                rowData.push(
                    overallQuestions,
                    overallCorrect,
                    overallIncorrect,
                    parseFloat(overallPositive.toFixed(3)),
                    parseFloat(overallNegative.toFixed(3)),
                    parseFloat(overallPartialMark.toFixed(3)),
                    finalScore,
                    percentage,
                    ...questionDetailsList
                );
            }

            return rowData;
        });

        // Create Excel Workbook
        const sheetData = [];
        if (hasSections) {
            sheetData.push(headerRow1);
            sheetData.push(headerRow2);
        } else {
            sheetData.push(flatHeaders);
        }
        rows.forEach(row => sheetData.push(row));

        const ws = XLSX.utils.aoa_to_sheet(sheetData);

        if (hasSections) {
            const merges: any[] = [];

            // Merge base columns vertically (from row 0 to row 1)
            for (let i = 0; i < baseHeaders.length; i++) {
                merges.push({
                    s: { r: 0, c: i },
                    e: { r: 1, c: i }
                });
            }

            // Merge section headers horizontally (across 4 columns)
            let currentCol = baseHeaders.length;
            (currentTest?.sections || []).forEach((sec: any) => {
                merges.push({
                    s: { r: 0, c: currentCol },
                    e: { r: 0, c: currentCol + 3 }
                });
                currentCol += 4;
            });

            // Merge Overall Summary header horizontally (across 8 columns)
            merges.push({
                s: { r: 0, c: currentCol },
                e: { r: 0, c: currentCol + 7 }
            });

            ws['!merges'] = merges;
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Test Results");
        // Name a filtered file after its filter so it isn't mistaken for the full list.
        const fileTags = [
            showModeColumn && modeFilter !== 'all' ? MODE_LABEL[modeFilter].toLowerCase() : '',
            dayFilter !== 'all' ? dayFilter : '',
            showRank ? 'ranked' : '',
        ].filter(Boolean).map(t => `_${t}`).join('');
        XLSX.writeFile(wb, `${currentTest?.title || 'test'}_results${fileTags}.xlsx`);
    };

    // ── View ──
    const conduct = currentTest?.settings?.conduct_exam;
    const schedule = currentTest?.settings?.schedule;
    const joinCode: string | null = conduct?.enabled ? (conduct.join_code || null) : null;
    const opensAt = conduct?.enabled && schedule?.enabled && schedule.start_time && new Date(schedule.start_time).getTime() > nowTick
        ? new Date(schedule.start_time).getTime()
        : null;
    const status = isLive
        ? { text: 'Live now', pill: 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300', dot: 'bg-emerald-400 animate-pulse' }
        : opensAt
            ? { text: `Opens ${clock(opensAt)}`, pill: 'bg-sky-500/20 border-sky-400/30 text-sky-300', dot: 'bg-sky-400' }
            : conduct
                ? { text: 'Exam ended', pill: 'bg-white/10 border-white/15 text-slate-300', dot: 'bg-slate-400' }
                : null;
    const facts = [
        totalQuestions ? `${totalQuestions} questions` : '',
        totalMaxMarks ? `${totalMaxMarks} marks` : '',
        currentTest?.duration ? `${currentTest.duration} min` : '',
    ].filter(Boolean).join(' · ');
    const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

    const tiles: { id: Tab; label: string; value: React.ReactNode; icon: React.ReactNode; tone: string; pulse?: boolean }[] = [
        { id: 'started', label: 'Started', value: startedCount ?? '—', icon: <Users className="h-3 w-3 text-slate-300" />, tone: 'text-white' },
        { id: 'writing', label: 'Writing now', value: started ? writing.length : '—', icon: <PenLine className="h-3 w-3 text-emerald-400" />, tone: 'text-emerald-300', pulse: writing.length > 0 },
        { id: 'submitted', label: 'Submitted', value: displayedResults.length, icon: <CheckCircle2 className="h-3 w-3 text-indigo-300" />, tone: 'text-indigo-200' },
        { id: 'dropped', label: 'Dropped', value: started ? dropped.length : '—', icon: <LogOut className="h-3 w-3 text-amber-400" />, tone: dropped.length > 0 ? 'text-amber-300' : 'text-white' },
    ];
    const hints: Record<Exclude<Tab, 'submitted'>, string> = {
        started: 'Everyone who opened the exam',
        writing: 'Active in the last 3 minutes',
        dropped: "Started but didn't submit",
    };

    const emptyState = (icon: React.ReactNode, title: string, text: string, extra?: React.ReactNode) => (
        <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {icon}
            </div>
            <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{title}</p>
                <p className="text-xs text-slate-400 mt-0.5 max-w-xs">{text}</p>
            </div>
            {extra}
        </div>
    );
    const noMatch = () => emptyState(<Search className="h-5 w-5 text-slate-400" />, 'No one matches', `Nobody here matches "${query.trim()}".`);
    // Live and nobody in yet: the one thing to do is send the link.
    const nobodyYet = () => emptyState(
        <Send className="h-5 w-5 text-slate-400" />,
        'Nobody has opened the exam yet',
        'Send the link to your candidates. Each one appears here the moment they start.',
        <div className="flex flex-col items-center gap-2">
            <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" variant="outline" onClick={copyExamLink} className="h-8 text-xs gap-1.5 font-semibold">
                    <Copy className="h-3.5 w-3.5" /> Copy exam link
                </Button>
                <Button size="sm" asChild className="h-8 text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                    <a href={examWhatsAppUrl(currentTest)} target="_blank" rel="noopener noreferrer">
                        <Send className="h-3.5 w-3.5" /> Send on WhatsApp
                    </a>
                </Button>
            </div>
            {joinCode && (
                <p className="text-[11px] text-slate-400">
                    Or code <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{joinCode.slice(0, 3)} {joinCode.slice(3)}</span> at testoza.com/join
                </p>
            )}
        </div>,
    );
    const startsUnknown = () => emptyState(
        <Info className="h-5 w-5 text-slate-400" />,
        "Couldn't load who's writing",
        'Submitted results still show. Try again in a moment.',
        <Button size="sm" variant="outline" onClick={() => load(true, true)} className="h-8 text-xs gap-1.5 font-semibold">
            <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>,
    );
    const progressBar = (answered: number, tone: string) => {
        const pct = totalQuestions > 0 ? Math.min(100, Math.round((answered / totalQuestions) * 100)) : 0;
        return (
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${tone}`} style={{ width: `${pct}%` }} />
            </div>
        );
    };
    const answeredText = (answered: number) => (
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 shrink-0 tabular-nums">
            {answered}{totalQuestions ? `/${totalQuestions}` : ''}
            <span className="font-medium text-slate-400"> answered</span>
        </span>
    );
    const ago = (ms: number) => {
        const s = Math.max(0, Math.round((serverNow - ms) / 1000));
        if (s < 60) return 'just now';
        const m = Math.floor(s / 60);
        return m < 60 ? `${m} min ago` : clock(ms);
    };

    const renderSubmitted = () => {
        const footnote = hiddenPractice > 0 && (
            <p className="px-4 py-3 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0" />
                {hiddenPractice} practice {hiddenPractice === 1 ? 'attempt' : 'attempts'} from outside the live exam {hiddenPractice === 1 ? 'is' : 'are'} not counted here.
            </p>
        );
        if (displayedResults.length === 0) {
            let empty: React.ReactNode;
            if (started && started.length > 0) {
                empty = emptyState(
                    <Users className="h-5 w-5 text-slate-400" />,
                    'No one has submitted yet',
                    writing.length > 0
                        ? `${writing.length} ${writing.length === 1 ? 'candidate is' : 'candidates are'} writing now. Results appear here as each one submits.`
                        : 'Results appear here as each candidate submits.',
                    <Button size="sm" variant="outline" onClick={() => setTab(writing.length > 0 ? 'writing' : 'started')} className="h-8 text-xs gap-1.5 font-semibold">
                        {writing.length > 0 ? "See who's writing" : 'See who started'} <ArrowRight className="h-3.5 w-3.5" />
                    </Button>,
                );
            } else if (isLive) {
                empty = nobodyYet();
            } else {
                empty = emptyState(
                    <Users className="h-5 w-5 text-slate-400" />,
                    'No submissions yet',
                    isConductTest ? 'Results appear here as soon as candidates submit the exam.' : "Candidates haven't attempted this test yet.",
                );
            }
            return <>{empty}{footnote}</>;
        }
        // Phones show cards, not the table, so the column filters sit in a row of their own.
        const mobileFilters = ((showModeColumn && modeOptions.length > 1) || dayOptions.length > 1 || isFiltered) && (
            <div className="flex md:hidden items-center gap-3 px-4 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                {dayFilterControl}
                {showModeColumn && modeFilterControl}
            </div>
        );
        if (cohortResults.length === 0) {
            return (
                <>
                    {mobileFilters}
                    {emptyState(
                        <Search className="h-5 w-5 text-slate-400" />,
                        'No results for this filter',
                        'None of the submitted results match the Mode and Submitted filters.',
                        <Button size="sm" variant="outline" onClick={clearFilters} className="h-8 text-xs gap-1.5 font-semibold">
                            Show all results
                        </Button>,
                    )}
                    {footnote}
                </>
            );
        }
        return (
            <>
                {mobileFilters}
                {/* Score summary */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    {([['Average', avgScore], ['Highest', topScore], ['Lowest', lowScore]] as [string, number][]).map(([label, v]) => (
                        <div key={label} className="px-2 py-2.5 text-center">
                            <p className="text-sm font-black text-slate-800 dark:text-slate-100 tabular-nums">
                                {fmt(v)}
                                {totalMaxMarks > 0 && <span className="text-[10px] font-medium text-slate-400"> / {totalMaxMarks}</span>}
                            </p>
                            <p className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>

                {shownResults.length === 0 ? noMatch() : (
                    <>
                        {/* Mobile Card View */}
                        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                            {shownResults.map((attempt) => {
                                const formData = attempt.metadata?.startFormData || {};
                                const name = nameOf(formData, attempt.user);
                                const details = detailsOf(formData);
                                const stats = attempt.metadata?.stats;
                                const pct = totalMaxMarks > 0 ? ((attempt.score / totalMaxMarks) * 100).toFixed(0) : null;
                                const isGood = attempt.score >= (totalMaxMarks * 0.4);
                                const isExpanded = expandedCard === attempt.id;

                                return (
                                    <div key={attempt.id} className="px-4 py-3 bg-white dark:bg-slate-900">
                                        <div className="flex items-start gap-3">
                                            <Initial name={name} rank={showRank ? rankOf.get(attempt.id) : undefined} />

                                            {/* Main info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{name}</p>
                                                {details && <p className="text-[10px] text-slate-400 truncate mt-0.5">{details}</p>}
                                                {isAdmin && attempt.user?.email && (
                                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{attempt.user.email}</p>
                                                )}
                                            </div>

                                            {/* Score badge */}
                                            <div className="flex-shrink-0 text-right">
                                                <div className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black ${isGood ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                    {attempt.score}
                                                    {totalMaxMarks > 0 && <span className="opacity-60 font-normal ml-0.5">/{totalMaxMarks}</span>}
                                                </div>
                                                {pct && (
                                                    <p className="text-[9px] text-slate-400 text-right mt-0.5">{pct}%</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stats pills row */}
                                        {stats && (
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                                                    <CheckCircle2 className="h-2.5 w-2.5" />{stats.correctCount ?? '-'}
                                                </span>
                                                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-500">
                                                    <XCircle className="h-2.5 w-2.5" />{stats.wrongCount ?? '-'}
                                                </span>
                                                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-slate-400">
                                                    — {stats.unattemptedCount ?? '-'}
                                                </span>
                                                <span className="ml-auto text-[10px] text-slate-400 flex items-center gap-1.5">
                                                    <span className="inline-flex items-center gap-0.5 font-medium text-slate-500">
                                                        <Clock className="h-2.5 w-2.5 text-indigo-500" />
                                                        {calculateDuration(attempt.metadata?.startedAt, attempt.created_at)}
                                                    </span>
                                                    <span>·</span>
                                                    {clock(Date.parse(attempt.created_at))}
                                                </span>
                                            </div>
                                        )}

                                        {/* Action row */}
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                                            <button
                                                className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                                                onClick={() => setExpandedCard(isExpanded ? null : attempt.id)}
                                            >
                                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                {isExpanded ? 'Less' : 'Marks'}
                                            </button>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={loadingAnalysisId === attempt.id}
                                                    className="h-6 px-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                                                    onClick={() => handleOpenAnalysis(attempt)}
                                                >
                                                    {loadingAnalysisId === attempt.id ? (
                                                        <Loader2 className="w-3 h-3 mr-1 animate-spin text-indigo-600" />
                                                    ) : (
                                                        <BarChart3 className="w-3 h-3 mr-1" />
                                                    )}
                                                    View result
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Delete result"
                                                    className="h-6 w-6 text-slate-400 hover:text-red-500"
                                                    onClick={() => handleDelete(attempt.id, attempt.user_id)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Expanded details */}
                                        {isExpanded && stats && (
                                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                                                <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg p-2 text-center">
                                                    <p className="text-base font-black text-emerald-600">+{(stats.positiveScore || 0).toFixed(1)}</p>
                                                    <p className="text-[9px] text-slate-500 uppercase tracking-wide">Positive</p>
                                                </div>
                                                <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-2 text-center">
                                                    <p className="text-base font-black text-red-500">-{(stats.negativeScore || 0).toFixed(1)}</p>
                                                    <p className="text-[9px] text-slate-500 uppercase tracking-wide">Negative</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <Table className="min-w-[600px]">
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 dark:bg-slate-900/50">
                                        {showRank && <TableHead className="w-[55px] font-bold text-xs">Rank</TableHead>}
                                        <TableHead className="font-bold text-xs">Candidate</TableHead>
                                        <TableHead className="font-bold text-xs">Score</TableHead>
                                        <TableHead className="font-bold text-xs">
                                            <span title="Correct · Wrong · Skipped">Answers</span>
                                        </TableHead>
                                        <TableHead className="font-bold text-xs">Time taken</TableHead>
                                        <TableHead className="font-bold text-xs">{dayFilterControl}</TableHead>
                                        {showModeColumn && <TableHead className="font-bold text-xs">{modeFilterControl}</TableHead>}
                                        <TableHead className="w-[80px]" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shownResults.map((attempt) => {
                                        const formData = attempt.metadata?.startFormData || {};
                                        const name = nameOf(formData, attempt.user);
                                        const details = detailsOf(formData);
                                        const stats = attempt.metadata?.stats;
                                        const isGood = attempt.score >= (totalMaxMarks * 0.4);
                                        const pct = totalMaxMarks > 0 ? Math.round((attempt.score / totalMaxMarks) * 100) : null;

                                        return (
                                            <TableRow key={attempt.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                                                {showRank && (
                                                    <TableCell className="font-bold text-sm text-muted-foreground">
                                                        #{rankOf.get(attempt.id)}
                                                    </TableCell>
                                                )}
                                                <TableCell>
                                                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">{name}</div>
                                                    {details && <div className="text-xs text-slate-400 mt-0.5">{details}</div>}
                                                    {isAdmin && attempt.user?.email && (
                                                        <div className="text-xs text-slate-400">{attempt.user.email}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={isGood ? "default" : "destructive"} className="font-bold text-xs">
                                                        {attempt.score} / {totalMaxMarks}
                                                    </Badge>
                                                    {pct !== null && <div className="text-[10px] text-slate-400 mt-0.5 pl-0.5">{pct}%</div>}
                                                </TableCell>
                                                <TableCell className="text-xs whitespace-nowrap">
                                                    {stats ? (
                                                        <div className="flex items-center gap-2 font-semibold" title="Correct · Wrong · Skipped">
                                                            <span className="text-emerald-600">✓ {stats.correctCount}</span>
                                                            <span className="text-red-500">✗ {stats.wrongCount}</span>
                                                            <span className="text-slate-400">— {stats.unattemptedCount}</span>
                                                        </div>
                                                    ) : '—'}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                                                    {calculateDuration(attempt.metadata?.startedAt, attempt.created_at)}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {clock(Date.parse(attempt.created_at))}
                                                </TableCell>
                                                {showModeColumn && (
                                                    <TableCell>
                                                        {getSubmissionModeBadge(attempt)}
                                                    </TableCell>
                                                )}
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        aria-label="View result"
                                                                        disabled={loadingAnalysisId === attempt.id}
                                                                        className="h-8 w-8 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                                                                        onClick={() => handleOpenAnalysis(attempt)}
                                                                    >
                                                                        {loadingAnalysisId === attempt.id ? (
                                                                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                                                        ) : (
                                                                            <BarChart3 className="w-4 h-4" />
                                                                        )}
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="text-xs font-semibold">View result and answers</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label="Delete result"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleDelete(attempt.id, attempt.user_id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
                {footnote}
            </>
        );
    };

    const renderWriting = () => {
        if (!started) return startsUnknown();
        if (writing.length === 0) {
            if (isLive && displayedResults.length === 0 && started.length === 0) return nobodyYet();
            return emptyState(
                <PenLine className="h-5 w-5 text-slate-400" />,
                'No one is writing right now',
                isLive ? 'Everyone who started has submitted or stopped.' : "This exam isn't live right now.",
            );
        }
        if (shownWriting.length === 0) return noMatch();
        return (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {shownWriting.map(c => {
                    const name = nameOf(c.startFormData);
                    const details = detailsOf(c.startFormData);
                    const answered = answeredOf(c);
                    const startedMs = Date.parse(c.started_at || '') || 0;
                    const minutesIn = Math.max(0, Math.floor((serverNow - startedMs) / 60000));
                    return (
                        <div key={c.id} className="px-4 py-3 bg-white dark:bg-slate-900 flex items-start gap-3">
                            <Initial name={name} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{name}</p>
                                    {answeredText(answered)}
                                </div>
                                {details && <p className="text-[10px] text-slate-400 truncate">{details}</p>}
                                <div className="mt-1.5">{progressBar(answered, 'bg-emerald-500')}</div>
                                <p className="mt-1 text-[10px] text-slate-400 flex flex-wrap items-center gap-x-1.5">
                                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Active {ago(lastSeen(c))}
                                    </span>
                                    {startedMs > 0 && <span>· Started {clock(startedMs)} · {minutesIn} min in</span>}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDropped = () => {
        if (!started) return startsUnknown();
        if (dropped.length === 0) {
            return emptyState(
                <LogOut className="h-5 w-5 text-slate-400" />,
                'No one dropped out',
                'Everyone who started is still writing or has submitted.',
            );
        }
        if (shownDropped.length === 0) return noMatch();
        return (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {shownDropped.map(c => {
                    const name = nameOf(c.startFormData);
                    const details = detailsOf(c.startFormData);
                    const answered = answeredOf(c);
                    const seen = lastSeen(c);
                    const startedMs = Date.parse(c.started_at || '') || 0;
                    const why = c.status === 'abandoned' ? `Closed the exam at ${clock(seen)}` : `No activity since ${clock(seen)}`;
                    return (
                        <div key={c.id} className="px-4 py-3 bg-white dark:bg-slate-900 flex items-start gap-3">
                            <Initial name={name} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{name}</p>
                                    {answeredText(answered)}
                                </div>
                                {details && <p className="text-[10px] text-slate-400 truncate">{details}</p>}
                                <div className="mt-1.5">{progressBar(answered, 'bg-amber-400')}</div>
                                <p className="mt-1 text-[10px] text-slate-400">
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">{why}</span>
                                    {startedMs > 0 && <span> · Started {clock(startedMs)}</span>}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderStarted = () => {
        if (shownStarted.length === 0) {
            if (q && (displayedResults.length > 0 || (started || []).length > 0)) return noMatch();
            if (!started) return startsUnknown();
            if (isLive) return nobodyYet();
            return emptyState(<Users className="h-5 w-5 text-slate-400" />, 'No one has started', 'Candidates appear here as soon as they open the exam.');
        }
        return (
            <>
                {!started && (
                    <p className="px-4 py-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/30">
                        Showing submitted candidates only. Couldn't load who is still writing.
                    </p>
                )}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {shownStarted.map(row => {
                        const name = nameOf(row.formData, row.user);
                        const details = detailsOf(row.formData);
                        let chip: React.ReactNode;
                        if (row.attempt) {
                            chip = (
                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-[10px] font-bold">
                                    <CheckCircle2 className="h-3 w-3" /> Submitted · {row.attempt.score}{totalMaxMarks > 0 ? `/${totalMaxMarks}` : ''}
                                </span>
                            );
                        } else if (row.candidate && isWriting(row.candidate)) {
                            chip = (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Writing · {answeredOf(row.candidate)}{totalQuestions ? `/${totalQuestions}` : ''}
                                </span>
                            );
                        } else if (row.candidate) {
                            chip = (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                                    <LogOut className="h-3 w-3" /> Dropped · {answeredOf(row.candidate)}{totalQuestions ? `/${totalQuestions}` : ''}
                                </span>
                            );
                        }
                        return (
                            <div key={row.key} className="px-4 py-3 bg-white dark:bg-slate-900 flex items-center gap-3">
                                <Initial name={name} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{name}</p>
                                    <p className="text-[10px] text-slate-400 truncate">
                                        {[details, row.startedMs ? `Started ${clock(row.startedMs)}` : ''].filter(Boolean).join(' · ')}
                                    </p>
                                </div>
                                <div className="shrink-0">{chip}</div>
                            </div>
                        );
                    })}
                </div>
            </>
        );
    };

    return (
        <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
            {/* gap-0: the sheet's default gap left grey strips between header, controls and list.
                [&>button]:hidden: the sheet's own close button sat under the header's X. */}
            <SheetContent className="w-full sm:max-w-full md:max-w-4xl p-0 gap-0 flex flex-col overflow-hidden [&>button]:hidden">

                {/* ── Header: what this exam is, and where it stands ── */}
                <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-4 pt-5 pb-4 flex-shrink-0">
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    {/* Title */}
                    <div className="pr-8">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">Test Results</p>
                        <h3 className="text-base font-bold text-white leading-tight line-clamp-2">
                            {currentTest.title}
                        </h3>
                    </div>

                    {/* Status, facts, and the way to the full report */}
                    <div className="mt-2 flex items-center gap-x-2 gap-y-1.5 flex-wrap">
                        {status && (
                            <span className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 ${status.pill}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                <span className="text-[10px] font-bold uppercase tracking-wide">{status.text}</span>
                            </span>
                        )}
                        {facts && <span className="text-[11px] text-slate-400">{facts}</span>}
                        {displayedResults.length > 0 && (
                            <button
                                type="button"
                                onClick={openFullReport}
                                title="Question-wise analysis, toppers and weak areas"
                                className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-1 text-[11px] font-bold text-white transition-colors"
                            >
                                Full report <ArrowRight className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    {/* The four counts, which are also the tabs */}
                    <div role="tablist" aria-label="Candidates" className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
                        {tiles.map(t => (
                            <StatTile
                                key={t.id}
                                label={t.label}
                                value={loading ? '…' : t.value}
                                icon={t.icon}
                                tone={t.tone}
                                pulse={t.pulse}
                                active={tab === t.id}
                                onClick={() => setTab(t.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* ── Controls Bar ── */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-slate-50/50 dark:bg-slate-900/30 flex-shrink-0">
                    {tab === 'submitted' ? (
                        <div className="flex items-center gap-2 shrink-0">
                            <Switch id="rank-mode" checked={showRank} onCheckedChange={setShowRank} className="scale-90" />
                            <Label htmlFor="rank-mode" className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-none cursor-pointer">
                                Rank
                            </Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-3.5 w-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-[260px] p-3">
                                        <p className="font-bold text-[11px] mb-1.5">Rank by Merit:</p>
                                        <ol className="list-decimal list-inside space-y-0.5 text-[10px] text-muted-foreground">
                                            <li>Score (highest first)</li>
                                            <li>Incorrect (fewest first)</li>
                                            <li>Skipped (fewest first)</li>
                                            <li>Submission time (earliest first)</li>
                                        </ol>
                                        <p className="text-[10px] text-muted-foreground mt-1.5">Off: newest submission first.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    ) : (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate min-w-0">{hints[tab]}</p>
                    )}

                    <div className="ml-auto flex items-center gap-1.5">
                        {showSearch && (
                            <div className="relative w-28 sm:w-48">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                                <Input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search name"
                                    aria-label="Search candidates"
                                    className="h-7 pl-7 text-[11px]"
                                />
                            </div>
                        )}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        aria-label="Refresh"
                                        onClick={() => load(true, true)}
                                        disabled={loading || refreshing}
                                        className="h-7 w-7 text-slate-500"
                                    >
                                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p className="text-xs">
                                        {updatedAt ? `Updated ${format(updatedAt, 'pp')}` : 'Refresh'}
                                        {isLive ? ' · refreshes every 30 s' : ''}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        {tab === 'submitted' && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={downloadExcel}
                                disabled={cohortResults.length === 0}
                                className="h-7 text-[11px] px-2.5 gap-1.5 font-semibold"
                            >
                                <Download className="w-3 h-3" />
                                Excel
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── List ── */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
                            <p className="text-xs text-slate-400 font-medium">Fetching results...</p>
                        </div>
                    ) : tab === 'submitted' ? renderSubmitted()
                        : tab === 'writing' ? renderWriting()
                            : tab === 'dropped' ? renderDropped()
                                : renderStarted()}
                </div>
            </SheetContent>
            {selectedAttemptForAnalysis && (
                <StudentDetailedResultModal
                    isOpen={!!selectedAttemptForAnalysis}
                    onClose={() => setSelectedAttemptForAnalysis(null)}
                    attempt={selectedAttemptForAnalysis}
                    test={currentTest}
                    isAdmin={isAdmin}
                />
            )}
        </Sheet>
    );
}
