import axios, { AxiosError } from 'axios';
import apiClient from '@/lib/apiClient';
import { getApiUrl } from '@/lib/getApiUrl';

/**
 * Exam sessions: one sitting of a paper with a 6-digit join code.
 * Backend: backend/app/routers/{exam_sessions,join,batches}.py
 *
 * Teacher calls use the normal apiClient (logged in). Student calls use `studentClient`,
 * which never sends a login token and never runs the 401 "refresh my session" logic —
 * a wrong PIN must not log a teacher out of a shared computer.
 */

const studentClient = axios.create({
    baseURL: getApiUrl().replace(/\/$/, '') + '/',
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

/* ── Types ─────────────────────────────────────────────────────────────────── */

export type Phase = 'scheduled' | 'lobby' | 'live' | 'ended';
export type IdentityMode = 'name' | 'roll' | 'roll_pin';
export type StartMode = 'auto' | 'manual';
export type ResultsRelease = 'on_end' | 'immediate' | 'manual';

export interface SessionTest {
    id?: string;
    title: string;
    duration: number | null;
    questions: number | null;
    max_marks: number | null;
    institution_name: string | null;
    institution_logo: string | null;
    proctoring: boolean;
}

export interface ExamSession {
    id: string;
    test_id: string;
    class_id: string | null;
    retest_of: string | null;
    name: string;
    join_code: string;
    opens_at: string;
    closes_at: string;
    late_entry_minutes: number;
    start_mode: StartMode;
    started_at: string | null;
    identity_mode: IdentityMode;
    allow_walk_in: boolean;
    results_release: ResultsRelease;
    results_released_at: string | null;
    ended_at: string | null;
    created_at: string;
    phase: Phase;
    late_entry_until: string | null;
    results_released: boolean;
    server_time: string;
    batch: string | null;
    test: SessionTest;
    counts: { joined: number; writing: number; submitted: number };
    roster: { students: number; with_pin: number };
}

export interface MonitorParticipant {
    id: string;
    name: string;
    roll_no: string | null;
    on_roster: boolean;
    roster_student_id: string | null;
    status: 'joined' | 'writing' | 'submitted' | 'removed';
    online: boolean;
    joined_at: string;
    started_at: string | null;
    last_seen_at: string | null;
    submitted_at: string | null;
    answered: number;
    progress: number;
    violations: number;
    device_changes: number;
    extra_minutes: number;
    force_submit_requested: boolean;
    deadline: string | null;
}

export interface MonitorData extends ExamSession {
    participants: MonitorParticipant[];
    not_joined: { id: string; name: string; roll_no: string; has_pin: boolean }[];
}

export interface Breakdown {
    name: string;
    score: number;
    max: number;
    correct: number;
    wrong: number;
    unattempted: number;
    total: number;
}

export interface ResultRow {
    rank: number;
    attempt_id: string;
    participant_id: string;
    name: string;
    roll_no: string | null;
    parent_phone: string | null;
    score: number;
    max_marks: number;
    percent: number | null;
    correct: number;
    wrong: number;
    partial: number;
    unattempted: number;
    time_taken_seconds: number | null;
    violations: number;
    submitted_at: string | null;
    late_seconds: number;
    collected: boolean;
    sections: Breakdown[];
    topics: Breakdown[];
}

export interface SessionResults extends ExamSession {
    max_marks: number;
    summary: { count: number; average: number | null; highest: number | null; lowest: number | null; median: number | null; max_marks: number };
    section_averages: { name: string; average: number | null; max: number | null }[];
    rows: ResultRow[];
    not_submitted: { id: string; name: string; roll_no: string | null; status: string }[];
    absent: { id: string; name: string; roll_no: string; parent_phone: string | null }[];
}

export interface Batch {
    id: string;
    name: string;
    created_at?: string;
    students: number;
    with_pin: number;
    sittings: number;
}

export interface RosterStudent {
    id: string;
    roll_no: string;
    full_name: string;
    parent_phone: string | null;
    has_pin: boolean;
    pin_set_at: string | null;
}

export interface NewPin {
    id: string;
    roll_no: string;
    full_name: string;
    pin: string;
}

/** What GET /join/code/{code} finds: a sitting, or a live exam link that has a code. */
export interface LinkLookup {
    kind: 'link';
    /** The exam link path, e.g. /test/physics-mock-3-k9x2m7qa */
    path: string;
    test: { title: string; duration: number | null; questions: number | null; institution_name: string | null };
}

export interface PublicSession {
    kind?: 'session';
    session_id: string;
    name: string;
    batch: string | null;
    test: SessionTest;
    opens_at: string;
    closes_at: string;
    start_mode: StartMode;
    identity_mode: IdentityMode;
    allow_walk_in: boolean;
    has_roster: boolean;
    results_release: ResultsRelease;
    phase: Phase;
    started_at: string | null;
    late_entry_until: string | null;
    server_time: string;
}

export interface Participant {
    id: string;
    name: string;
    roll_no: string | null;
    status: 'joined' | 'writing' | 'submitted' | 'removed';
    started_at: string | null;
    submitted_at: string | null;
}

export interface MeResponse {
    participant: Participant;
    session: PublicSession;
    joined: number;
    expected: number | null;
    deadline: string | null;
    results_released: boolean;
    results_release_at: string | null;
}

export interface StudentResult {
    released: boolean;
    release_at?: string | null;
    name?: string;
    roll_no?: string | null;
    exam?: string | null;
    test_title?: string;
    institution_name?: string | null;
    score?: number;
    max_marks?: number;
    percent?: number | null;
    rank?: number | null;
    of?: number;
    average?: number | null;
    highest?: number | null;
    stats?: Record<string, number>;
    sections?: Breakdown[];
    topics?: Breakdown[];
    submitted_at?: string | null;
}

/** GET /join/result/{code}: what "See your result" should ask for. */
export type ResultForm =
    | (PublicSession & { kind: 'session'; results_released: boolean; results_release_at: string | null })
    | {
        kind: 'link';
        test: { title: string; duration: number | null; questions: number | null; institution_name: string | null; institution_logo: string | null };
        results_visible: boolean;
        /** The exam's start-form fields, asked again exactly as at the start. */
        fields: { label: string; required: boolean }[];
    };

export interface ResultDetails {
    name?: string;
    roll_no?: string;
    pin?: string;
    fields?: Record<string, string>;
}

/* ── Errors ────────────────────────────────────────────────────────────────── */

export interface ApiProblem {
    status: number;
    code: string;
    message: string;
    extra: Record<string, any>;
}

/** Turn any request error into { status, code, message } with a message fit for users. */
export function problemOf(err: unknown): ApiProblem {
    const e = err as AxiosError<any>;
    const status = e?.response?.status ?? 0;
    const detail = e?.response?.data?.detail;
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
        const { code, message, ...extra } = detail;
        return { status, code: code || 'error', message: message || 'Something went wrong.', extra };
    }
    if (typeof detail === 'string') return { status, code: 'error', message: detail, extra: {} };
    if (!e?.response) return { status: 0, code: 'offline', message: "TestoZa didn't answer. Check your internet and try again in a minute.", extra: {} };
    if (status === 429) return { status, code: 'rate_limited', message: 'Too many tries. Wait a minute and try again.', extra: {} };
    return { status, code: 'error', message: 'Something went wrong. Please try again.', extra: {} };
}

/* ── Teacher: sittings ─────────────────────────────────────────────────────── */

export interface SessionInput {
    test_id: string;
    name?: string;
    class_id?: string | null;
    opens_at: string;
    closes_at?: string;
    late_entry_minutes: number;
    start_mode: StartMode;
    identity_mode: IdentityMode;
    allow_walk_in: boolean;
    results_release: ResultsRelease;
    as_user?: string;
}

const withAs = (asUser?: string | null) => (asUser ? { as_user: asUser } : {});

export const examSessionsApi = {
    list: (opts: { testId?: string; asUser?: string | null } = {}) =>
        apiClient.get<ExamSession[]>('exam-sessions', { params: { test_id: opts.testId, ...withAs(opts.asUser) } }).then(r => r.data),
    create: (input: SessionInput) => apiClient.post<ExamSession>('exam-sessions', input).then(r => r.data),
    get: (id: string) => apiClient.get<ExamSession>(`exam-sessions/${id}`).then(r => r.data),
    update: (id: string, patch: Partial<SessionInput>) => apiClient.patch<ExamSession>(`exam-sessions/${id}`, patch).then(r => r.data),
    remove: (id: string) => apiClient.delete(`exam-sessions/${id}`).then(r => r.data),
    start: (id: string) => apiClient.post<ExamSession>(`exam-sessions/${id}/start`).then(r => r.data),
    end: (id: string, collect = true) => apiClient.post<ExamSession & { collected: number }>(`exam-sessions/${id}/end`, { collect }).then(r => r.data),
    release: (id: string) => apiClient.post<ExamSession>(`exam-sessions/${id}/release`).then(r => r.data),
    collect: (id: string) => apiClient.post<{ collected: number }>(`exam-sessions/${id}/collect`).then(r => r.data),
    extraTimeAll: (id: string, minutes: number) => apiClient.post(`exam-sessions/${id}/extra-time`, { minutes }).then(r => r.data),
    monitor: (id: string) => apiClient.get<MonitorData>(`exam-sessions/${id}/monitor`).then(r => r.data),
    results: (id: string) => apiClient.get<SessionResults>(`exam-sessions/${id}/results`).then(r => r.data),
    participant: (id: string, participantId: string, action: 'extra-time' | 'force-submit' | 'allow-retake' | 'remove', minutes?: number) =>
        apiClient.post(`exam-sessions/${id}/participants/${participantId}/${action}`, action === 'extra-time' ? { minutes: minutes ?? 10 } : undefined).then(r => r.data),
    retest: (id: string, opensAt: string, closesAt?: string) =>
        apiClient.post<ExamSession>(`exam-sessions/${id}/retest`, { opens_at: opensAt, closes_at: closesAt }).then(r => r.data),
    /** A 6-digit code for an exam that is live through its Conduct link. Returns the test's new settings too. */
    linkCode: (testId: string) =>
        apiClient.post<{ join_code: string; settings: Record<string, any> }>('exam-sessions/link-code', { test_id: testId }).then(r => r.data),
};

/* ── Teacher: batches ──────────────────────────────────────────────────────── */

export const batchesApi = {
    list: (asUser?: string | null) => apiClient.get<Batch[]>('batches', { params: withAs(asUser) }).then(r => r.data),
    get: (classId: string) => apiClient.get<{ id: string; name: string; students: RosterStudent[] }>(`batches/${classId}`).then(r => r.data),
    rename: (classId: string, name: string) => apiClient.patch(`batches/${classId}`, { name }).then(r => r.data),
    importStudents: (classId: string, students: { roll_no: string; full_name: string; parent_phone?: string | null }[]) =>
        apiClient.post<{ added: number; updated: number; skipped: { row: number; reason: string }[] }>(`batches/${classId}/students`, { students }).then(r => r.data),
    editStudent: (classId: string, studentId: string, patch: Partial<Pick<RosterStudent, 'roll_no' | 'full_name' | 'parent_phone'>>) =>
        apiClient.patch<RosterStudent>(`batches/${classId}/students/${studentId}`, patch).then(r => r.data),
    removeStudent: (classId: string, studentId: string) => apiClient.delete(`batches/${classId}/students/${studentId}`).then(r => r.data),
    makePins: (classId: string, opts: { studentIds?: string[]; onlyMissing?: boolean }) =>
        apiClient.post<{ pins: NewPin[]; made_at: string }>(`batches/${classId}/pins`, { student_ids: opts.studentIds, only_missing: !!opts.onlyMissing }).then(r => r.data),
};

/* ── Student ───────────────────────────────────────────────────────────────── */

const tokenHeader = (token: string) => ({ headers: { 'X-Exam-Token': token } });

export const joinApi = {
    lookup: (code: string) => studentClient.get<PublicSession | LinkLookup>(`join/code/${code}`).then(r => r.data),
    enter: (code: string, body: { name?: string; roll_no?: string; pin?: string }, existingToken?: string | null) =>
        studentClient.post<{ token: string; participant: Participant; session: PublicSession }>(
            `join/code/${code}/enter`, body, existingToken ? tokenHeader(existingToken) : undefined,
        ).then(r => r.data),
    me: (token: string) => studentClient.get<MeResponse>('join/me', tokenHeader(token)).then(r => r.data),
    start: (token: string) =>
        studentClient.post<{ test: any; deadline: string | null; server_time: string; draft_answers: Record<string, any>; participant: Participant; session_name: string }>(
            'join/me/start', {}, tokenHeader(token),
        ).then(r => r.data),
    heartbeat: (token: string, body: { answers?: Record<string, any>; answered?: number; progress?: number; violations?: number }) =>
        studentClient.post<{ status: string; server_time: string; deadline?: string | null; extra_minutes?: number; force_submit?: boolean; ended?: boolean }>(
            'join/me/heartbeat', body, tokenHeader(token),
        ).then(r => r.data),
    result: (token: string) => studentClient.get<StudentResult>('join/me/result', tokenHeader(token)).then(r => r.data),
    /** "See your result" from any device: no token, just the code and the candidate's details. */
    resultForm: (code: string) => studentClient.get<ResultForm>(`join/result/${code}`).then(r => r.data),
    lookupResult: (code: string, details: ResultDetails) =>
        studentClient.post<StudentResult>(`join/result/${code}`, details).then(r => r.data),

    /** Final submission. Retries network/server errors only — never "time over" or "already submitted". */
    async submit(token: string, payload: Record<string, any>, onRetry?: (attempt: number) => void) {
        let lastError: unknown;
        for (let attempt = 1; attempt <= 6; attempt++) {
            try {
                const res = await studentClient.post('attempts/save', payload, tokenHeader(token));
                return { data: res.data?.data, error: null as unknown };
            } catch (err) {
                lastError = err;
                const status = (err as AxiosError)?.response?.status ?? 0;
                if (status && status < 500 && status !== 429) break;
                if (attempt < 6) {
                    onRetry?.(attempt);
                    await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** (attempt - 1), 15000)));
                }
            }
        }
        return { data: null, error: lastError };
    },
};

/* ── The student's device token, kept per exam code ────────────────────────── */

export interface StoredSeat {
    token: string;
    sessionId: string;
    participantId: string;
    name: string;
    code: string;
    testId?: string;
}

const seatKey = (code: string) => `tz_exam_seat_${code}`;

export const seatStore = {
    get(code: string): StoredSeat | null {
        try {
            const raw = localStorage.getItem(seatKey(code));
            return raw ? (JSON.parse(raw) as StoredSeat) : null;
        } catch {
            return null;
        }
    },
    set(seat: StoredSeat) {
        try {
            localStorage.setItem(seatKey(seat.code), JSON.stringify(seat));
        } catch { /* private mode: the student just re-enters their details on refresh */ }
    },
    clear(code: string) {
        try {
            localStorage.removeItem(seatKey(code));
        } catch { /* ignore */ }
    },
};

/** Public join links. testoza.com/join is the short address students type. */
export function joinUrl(code?: string) {
    const origin = typeof window !== 'undefined' && /(^|\.)testoza\.com$/.test(window.location.hostname)
        ? 'https://testoza.com'
        : (typeof window !== 'undefined' ? window.location.origin : 'https://testoza.com');
    return code ? `${origin}/join/${code}` : `${origin}/join`;
}

export const formatCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;
