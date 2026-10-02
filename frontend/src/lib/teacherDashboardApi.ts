import { supabase } from '@/integrations/supabase/client';
import { isProctoringEnabled } from '@/lib/conductExam';

/**
 * Data for the educator dashboard (/dashboard).
 *
 * Rules that keep the numbers honest:
 * - The creator's own attempts (testing their own paper) never count.
 * - For a conducted test only conduct attempts count, like the Results panel.
 * - Student names come from the start form; profiles are not readable by creators (RLS),
 *   so a name is whatever the student typed. Grouping students uses roll number first.
 * - A failed request is reported as an error, never shown as zeros.
 */

export function isSampleUser(email?: string | null): boolean {
    if (!email) return false;
    const lower = email.toLowerCase().trim();
    return (
        lower === 'student@testoza.com' ||
        lower === 'teacher@testoza.com' ||
        lower === 'institution@testoza.com' ||
        (lower.endsWith('@testoza.com') && lower !== 'support@testoza.com')
    );
}

/* ── Raw rows ─────────────────────────────────────────────────────────────── */

export interface AttemptRow {
    id: string;
    user_id: string | null;
    test_id: string;
    score: number | null;
    created_at: string;
    violation_count: number | null;
    sf: Record<string, unknown> | null;
    stats: { wrongCount?: number; unattemptedCount?: number; correctCount?: number; totalQuestions?: number } | null;
    conduct: boolean | null;
}

export interface RegistrationRow {
    test_id: string;
    user_id: string | null;
    status: string | null;
    started_at: string | null;
    last_active_at: string | null;
}

const ATTEMPT_COLUMNS =
    'id, user_id, test_id, score, created_at, violation_count, sf:metadata->startFormData, stats:metadata->stats, conduct:metadata->conduct_exam';
const ID_CHUNK = 80;
export const HISTORY_DAYS = 180;
/** A student counts as "writing now" if their exam pinged within this window (pings are every 60 s). */
const WRITING_WINDOW_MS = 3 * 60 * 1000;

function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

/** Submitted attempts on these tests since `sinceIso`, newest first. */
export async function fetchAttempts(testIds: string[], sinceIso: string): Promise<{ data: AttemptRow[]; error: unknown }> {
    if (testIds.length === 0) return { data: [], error: null };
    try {
        const pages = await Promise.all(chunk(testIds, ID_CHUNK).map(ids =>
            (supabase as any)
                .from('user_tests')
                .select(ATTEMPT_COLUMNS)
                .in('test_id', ids)
                .gte('created_at', sinceIso)
                .order('created_at', { ascending: false })
                .limit(3000)
        ));
        const failed = pages.find((p: any) => p.error);
        if (failed) return { data: [], error: failed.error };
        const rows = pages.flatMap((p: any) => (p.data || []) as AttemptRow[]);
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
        return { data: rows, error: null };
    } catch (error) {
        return { data: [], error };
    }
}

/** Unfinished exam sittings on the given (live) tests, touched in the last 15 minutes. */
export async function fetchActiveRegistrations(testIds: string[]): Promise<{ data: RegistrationRow[]; error: unknown }> {
    if (testIds.length === 0) return { data: [], error: null };
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    try {
        const { data, error } = await (supabase as any)
            .from('test_registrations')
            .select('test_id, user_id, status, started_at, last_active_at')
            .in('test_id', testIds)
            .eq('status', 'in_progress')
            .or(`last_active_at.gte.${since},started_at.gte.${since}`)
            .limit(2000);
        return { data: (data || []) as RegistrationRow[], error };
    } catch (error) {
        return { data: [], error };
    }
}


/* ── Students: who typed what ────────────────────────────────────────────── */

const NAME_KEYS = ['name', 'fullname', 'studentname', 'candidatename', 'yourname', 'studentsname'];
const NOT_A_STUDENT_NAME = ['father', 'mother', 'parent', 'guardian', 'school', 'institute', 'college', 'teacher', 'batch', 'class', 'exam', 'test'];
const ROLL_HINTS = ['roll', 'regno', 'register', 'registration', 'admission', 'enrol', 'enroll', 'studentid', 'applicationno', 'applicationnumber'];

const normKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
const cleanText = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\s+/g, ' ').trim() : '');

export function readStudent(sf: Record<string, unknown> | null | undefined): { name: string | null; roll: string | null } {
    if (!sf || typeof sf !== 'object') return { name: null, roll: null };
    const entries = Object.entries(sf).map(([k, v]) => [normKey(k), cleanText(v)] as const).filter(([, v]) => v);

    const exact = entries.find(([k]) => NAME_KEYS.includes(k));
    const loose = entries.find(([k]) => k.includes('name') && !NOT_A_STUDENT_NAME.some(w => k.includes(w)));
    const roll = entries.find(([k]) => ROLL_HINTS.some(h => k.includes(h)));

    return {
        name: (exact || loose)?.[1] || null,
        roll: roll?.[1] || null,
    };
}

/* ── The dashboard model ─────────────────────────────────────────────────── */

export interface ScoredAttempt {
    id: string;
    testId: string;
    userId: string | null;
    createdAt: Date;
    score: number;
    maxMarks: number;
    /** Score as a percentage of the maximum, or null when the test has no maximum. */
    pct: number | null;
    name: string | null;
    roll: string | null;
    displayName: string;
    /** Groups one student's attempts: roll number, else typed name, else device id. */
    studentKey: string;
    wrong: number;
    unattempted: number;
    violations: number;
}

export interface TestResultSummary {
    test: any;
    /** Ranked best first (score, then fewer wrong, then fewer skipped, then earlier). */
    ranked: ScoredAttempt[];
    count: number;
    avgPct: number | null;
    highest: ScoredAttempt | null;
    lowest: ScoredAttempt | null;
    bands: { strong: number; average: number; weak: number };
    weak: ScoredAttempt[];
    lastAt: Date;
}

export interface LiveExam {
    test: any;
    writingNow: number;
    submitted: number;
    startedAt: Date | null;
    endsAt: Date | null;
    proctoringOff: boolean;
}

export interface UpcomingExam {
    test: any;
    startsAt: Date;
    endsAt: Date | null;
}

export interface StudentRow {
    key: string;
    displayName: string;
    roll: string | null;
    tests: number;
    avgPct: number;
    lastPct: number;
    trend: 'up' | 'down' | 'flat' | null;
}

export interface BatchRow {
    id: string;
    name: string;
    tests: number;
    results: number;
    students: number;
    avgPct: number | null;
}

export interface PeriodNumbers {
    examsGiven: number;
    results: number;
    resultsPrev: number;
    students: number;
    avgPct: number | null;
    /** Results per day for the last 14 days, oldest first. */
    daily: { date: Date; count: number }[];
}

export interface Checklist {
    hasTest: boolean;
    hasConducted: boolean;
    hasResult: boolean;
    /** The test step 2 should conduct: the newest real test that isn't live. */
    nextToConduct: any | null;
}

export interface DashboardModel {
    live: LiveExam[];
    upcoming: UpcomingExam[];
    latest: TestResultSummary | null;
    recent: TestResultSummary[];
    students: { needsHelp: StudentRow[]; top: StudentRow[]; total: number };
    batches: BatchRow[];
    numbers: PeriodNumbers;
    checklist: Checklist;
    /** Newest tests that aren't live, for "Continue working". */
    workingOn: any[];
}

export const WEAK_PCT = 40;
export const STRONG_PCT = 75;
const DAY = 24 * 60 * 60 * 1000;

export const isExampleTest = (t: any) => t?.settings?.is_user_example === true || t?.settings?.is_example_template === true;

export function isLiveTest(t: any, now: Date): boolean {
    if (!t?.settings?.conduct_exam?.enabled) return false;
    const s = t.settings.schedule;
    if (s?.enabled && s.end_time && new Date(s.end_time) < now) return false;
    if (s?.enabled && s.start_time && new Date(s.start_time) > now) return false;
    return true;
}

export function isUpcomingTest(t: any, now: Date): boolean {
    const s = t?.settings?.schedule;
    return !!(s?.enabled && s.start_time && new Date(s.start_time) > now);
}

const average = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function rankCompare(a: ScoredAttempt, b: ScoredAttempt) {
    if (b.score !== a.score) return b.score - a.score;
    if (a.wrong !== b.wrong) return a.wrong - b.wrong;
    if (a.unattempted !== b.unattempted) return a.unattempted - b.unattempted;
    return a.createdAt.getTime() - b.createdAt.getTime();
}

function scoreAttempt(row: AttemptRow, test: any): ScoredAttempt {
    const { name, roll } = readStudent(row.sf);
    const score = Number(row.score) || 0;
    const maxMarks = Number(test?.total_max_marks) || 0;
    const studentKey = roll
        ? `roll:${roll.toLowerCase().replace(/\s+/g, '')}`
        : name
            ? `name:${name.toLowerCase()}`
            : `user:${row.user_id || row.id}`;
    return {
        id: row.id,
        testId: row.test_id,
        userId: row.user_id,
        createdAt: new Date(row.created_at),
        score,
        maxMarks,
        pct: maxMarks > 0 ? (score / maxMarks) * 100 : null,
        name,
        roll,
        displayName: name || (roll ? `Roll no. ${roll}` : 'Unnamed candidate'),
        studentKey,
        wrong: Number(row.stats?.wrongCount) || 0,
        unattempted: Number(row.stats?.unattemptedCount) || 0,
        violations: Number(row.violation_count) || 0,
    };
}

function summarise(test: any, attempts: ScoredAttempt[]): TestResultSummary {
    const ranked = [...attempts].sort(rankCompare);
    const pcts = ranked.map(a => a.pct).filter((p): p is number => p !== null);
    const bands = { strong: 0, average: 0, weak: 0 };
    pcts.forEach(p => {
        if (p >= STRONG_PCT) bands.strong++;
        else if (p >= WEAK_PCT) bands.average++;
        else bands.weak++;
    });
    return {
        test,
        ranked,
        count: ranked.length,
        avgPct: average(pcts),
        highest: ranked[0] || null,
        lowest: ranked[ranked.length - 1] || null,
        bands,
        weak: ranked.filter(a => a.pct !== null && a.pct < WEAK_PCT).reverse(),
        lastAt: new Date(Math.max(...ranked.map(a => a.createdAt.getTime()))),
    };
}

export function buildDashboardModel(input: {
    tests: any[];
    attempts: AttemptRow[];
    registrations: RegistrationRow[];
    classes: { id: string; name: string }[];
    creatorId: string | undefined;
    now?: Date;
}): DashboardModel {
    const now = input.now || new Date();
    const tests = input.tests || [];
    const testById = new Map(tests.map(t => [t.id, t]));

    // Attempts that count: not the creator's own, on a known test, conduct-only for conducted tests.
    const scored: ScoredAttempt[] = [];
    for (const row of input.attempts) {
        if (input.creatorId && row.user_id === input.creatorId) continue;
        const test = testById.get(row.test_id);
        if (!test) continue;
        if (test.settings?.conduct_exam && row.conduct !== true) continue;
        scored.push(scoreAttempt(row, test));
    }

    const byTest = new Map<string, ScoredAttempt[]>();
    scored.forEach(a => {
        const list = byTest.get(a.testId);
        if (list) list.push(a);
        else byTest.set(a.testId, [a]);
    });

    // Live now
    const live: LiveExam[] = tests.filter(t => isLiveTest(t, now)).map(t => {
        const startedAt = t.settings?.conduct_exam?.started_at ? new Date(t.settings.conduct_exam.started_at) : null;
        const endsAt = t.settings?.schedule?.enabled && t.settings.schedule.end_time ? new Date(t.settings.schedule.end_time) : null;
        const submitted = (byTest.get(t.id) || []).filter(a => !startedAt || a.createdAt >= startedAt).length;
        const writing = new Set<string>();
        input.registrations.forEach(r => {
            if (r.test_id !== t.id || r.status !== 'in_progress') return;
            if (input.creatorId && r.user_id === input.creatorId) return;
            const seen = new Date(r.last_active_at || r.started_at || 0).getTime();
            // Ignore future timestamps (old rows were stored with a +5:30 offset).
            if (seen > now.getTime() + 2 * 60 * 1000) return;
            if (now.getTime() - seen <= WRITING_WINDOW_MS) writing.add(r.user_id || `${r.started_at}`);
        });
        return {
            test: t,
            writingNow: writing.size,
            submitted,
            startedAt,
            endsAt,
            proctoringOff: !isProctoringEnabled(t),
        };
    }).sort((a, b) => (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0));

    const upcoming: UpcomingExam[] = tests
        .filter(t => isUpcomingTest(t, now))
        .map(t => ({
            test: t,
            startsAt: new Date(t.settings.schedule.start_time),
            endsAt: t.settings.schedule.end_time ? new Date(t.settings.schedule.end_time) : null,
        }))
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    // Results per test, newest first
    const liveIds = new Set(live.map(l => l.test.id));
    const summaries = [...byTest.entries()]
        .map(([id, list]) => summarise(testById.get(id), list))
        .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
    const latest = summaries.find(s => !liveIds.has(s.test.id)) || summaries[0] || null;
    // Live exams already show their counts in "Live now".
    const recent = summaries
        .filter(s => s !== latest && !liveIds.has(s.test.id) && now.getTime() - s.lastAt.getTime() <= 90 * DAY)
        .slice(0, 5);

    // Students over the last 60 days
    const since60 = now.getTime() - 60 * DAY;
    const byStudent = new Map<string, ScoredAttempt[]>();
    scored.forEach(a => {
        if (a.createdAt.getTime() < since60 || a.pct === null) return;
        const list = byStudent.get(a.studentKey);
        if (list) list.push(a);
        else byStudent.set(a.studentKey, [a]);
    });
    const studentRows: StudentRow[] = [...byStudent.entries()].map(([key, list]) => {
        const sorted = [...list].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const last = sorted[sorted.length - 1];
        const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
        const delta = prev ? (last.pct as number) - (prev.pct as number) : 0;
        return {
            key,
            displayName: last.displayName,
            roll: last.roll,
            tests: new Set(sorted.map(a => a.testId)).size,
            avgPct: average(sorted.map(a => a.pct as number)) as number,
            lastPct: last.pct as number,
            trend: prev ? (delta >= 5 ? 'up' : delta <= -5 ? 'down' : 'flat') : null,
        };
    });
    const needsHelp = studentRows.filter(s => s.avgPct < WEAK_PCT).sort((a, b) => a.avgPct - b.avgPct);
    const top = studentRows.filter(s => s.avgPct >= WEAK_PCT).sort((a, b) => b.avgPct - a.avgPct || b.tests - a.tests);

    // Batches (classes) over the last 60 days
    const batches: BatchRow[] = (input.classes || []).map(c => {
        const classTests = tests.filter(t => t.class_id === c.id);
        const results = classTests.flatMap(t => (byTest.get(t.id) || []).filter(a => a.createdAt.getTime() >= since60));
        const pcts = results.map(a => a.pct).filter((p): p is number => p !== null);
        return {
            id: c.id,
            name: c.name,
            tests: classTests.length,
            results: results.length,
            students: new Set(results.map(a => a.studentKey)).size,
            avgPct: average(pcts),
        };
    });

    // Last 30 days vs the 30 before
    const since30 = now.getTime() - 30 * DAY;
    const in30 = scored.filter(a => a.createdAt.getTime() >= since30);
    const prev30 = scored.filter(a => a.createdAt.getTime() >= since60 && a.createdAt.getTime() < since30);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const daily = Array.from({ length: 14 }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (13 - i));
        return { date, count: 0 };
    });
    scored.forEach(a => {
        const d = new Date(a.createdAt);
        d.setHours(0, 0, 0, 0);
        const idx = Math.round((d.getTime() - daily[0].date.getTime()) / DAY);
        if (idx >= 0 && idx < daily.length) daily[idx].count++;
    });
    const numbers: PeriodNumbers = {
        examsGiven: new Set(in30.map(a => a.testId)).size,
        results: in30.length,
        resultsPrev: prev30.length,
        students: new Set(in30.map(a => a.studentKey)).size,
        avgPct: average(in30.map(a => a.pct).filter((p): p is number => p !== null)),
        daily,
    };

    // First-exam checklist
    const realTests = tests.filter(t => !isExampleTest(t));
    const checklist: Checklist = {
        hasTest: realTests.length > 0,
        hasConducted: realTests.some(t => t.settings?.conduct_exam || t.settings?.schedule?.enabled),
        hasResult: scored.length > 0,
        nextToConduct: [...realTests]
            .filter(t => !isLiveTest(t, now))
            .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0] || null,
    };

    const workingOn = [...tests]
        .filter(t => !t.isSample && !liveIds.has(t.id) && !isUpcomingTest(t, now))
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        .slice(0, 4);

    return {
        live,
        upcoming,
        latest,
        recent,
        students: { needsHelp: needsHelp.slice(0, 5), top: top.slice(0, 5), total: studentRows.length },
        batches,
        numbers,
        checklist,
        workingOn,
    };
}

/* ── Rank list text for WhatsApp ─────────────────────────────────────────── */

const fmtScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

export function rankListText(summary: TestResultSummary): string {
    const lines = [`📊 *${summary.test.title}* — Results`];
    const avg = summary.avgPct !== null ? ` · Average ${Math.round(summary.avgPct)}%` : '';
    lines.push(`${summary.count} candidate${summary.count === 1 ? '' : 's'}${avg}`, '');
    const medals = ['🥇', '🥈', '🥉'];
    let rank = 0;
    let prevKey = '';
    summary.ranked.forEach((a, i) => {
        // Equal score, wrong and skipped answers share a rank.
        const key = `${a.score}|${a.wrong}|${a.unattempted}`;
        if (key !== prevKey) rank = i + 1;
        prevKey = key;
        const label = rank <= 3 ? medals[rank - 1] : `${rank}.`;
        const who = a.roll && a.name ? `${a.name} (${a.roll})` : a.displayName;
        const marks = a.maxMarks > 0 ? `${fmtScore(a.score)}/${fmtScore(a.maxMarks)}` : fmtScore(a.score);
        const pct = a.pct !== null ? ` (${Math.round(a.pct)}%)` : '';
        lines.push(`${label} ${who} — ${marks}${pct}`);
    });
    return lines.join('\n');
}

/* ── Sample data for the demo accounts (@testoza.com) ────────────────────── */

const SAMPLE_NAMES = [
    'Aarav Patel', 'Priya Sharma', 'Rohan Gupta', 'Ananya Verma', 'Ishaan Reddy', 'Kavya Nair', 'Arjun Singh',
    'Diya Mehta', 'Vihaan Joshi', 'Sara Khan', 'Kabir Das', 'Meera Iyer', 'Aditya Rao', 'Riya Kapoor',
];

/** Fake tests + results so a demo account shows what a busy week looks like. */
export function buildSampleData(now: Date = new Date()) {
    const ago = (days: number, hours = 0) => new Date(now.getTime() - days * DAY - hours * 3600 * 1000).toISOString();
    const tests = [
        { id: 'sample-physics', title: 'Physics Weekly Mock #4', total_questions: 25, duration: 60, total_max_marks: 100, created_at: ago(9), visibility: 'private', settings: { conduct_exam: { enabled: false, started_at: ago(2, 3) } }, class_id: 'sample-jee-a', isSample: true },
        { id: 'sample-chem', title: 'Chemistry Chapter 4 Practice', total_questions: 20, duration: 40, total_max_marks: 80, created_at: ago(14), visibility: 'private', settings: { conduct_exam: { enabled: false, started_at: ago(6) } }, class_id: 'sample-jee-b', isSample: true },
        { id: 'sample-maths', title: 'Mathematics Unit Test — Set B', total_questions: 30, duration: 90, total_max_marks: 120, created_at: ago(20), visibility: 'private', settings: { conduct_exam: { enabled: false, started_at: ago(12) } }, class_id: 'sample-jee-a', isSample: true },
    ];
    // Deterministic pseudo-random so the demo doesn't change on every refresh.
    let seed = 7;
    const rand = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
    const attempts: AttemptRow[] = [];
    const plan: [string, number, number][] = [['sample-physics', 2, 12], ['sample-chem', 6, 9], ['sample-maths', 12, 11]];
    plan.forEach(([testId, daysAgo, n]) => {
        const test = tests.find(t => t.id === testId)!;
        SAMPLE_NAMES.slice(0, n).forEach((name, i) => {
            const skill = 0.25 + ((i * 37) % 70) / 100;
            const pct = Math.min(0.98, Math.max(0.12, skill + (rand() - 0.5) * 0.2));
            attempts.push({
                id: `${testId}-${i}`,
                user_id: `sample-student-${i}`,
                test_id: testId,
                score: Math.round(pct * test.total_max_marks),
                created_at: ago(daysAgo, 1 + rand() * 3),
                violation_count: 0,
                sf: { Name: name, 'Roll Number': `26A${String(i + 1).padStart(3, '0')}` },
                stats: { wrongCount: Math.round((1 - pct) * test.total_questions * 0.6), unattemptedCount: Math.round((1 - pct) * test.total_questions * 0.4) },
                conduct: true,
            });
        });
    });
    const classes = [{ id: 'sample-jee-a', name: 'JEE 2027 — Morning' }, { id: 'sample-jee-b', name: 'JEE 2027 — Evening' }];
    return { tests, attempts, classes };
}
