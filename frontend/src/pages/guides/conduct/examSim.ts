/**
 * The live exam behind the exam-day demo and the hero: batch 12-A sits "Unit Test 3"
 * (20 questions, 30 minutes, +4/−1) with roll number and PIN. One reducer drives both
 * the teacher's room and Aditi's phone, so whatever the reader does in the room shows
 * up on the phone. Exam time runs 60× faster than real time.
 *
 * Rules mirror the product (backend services/exam_sessions.py): each candidate's
 * deadline is the earlier of their own start + duration + extra and the closing time +
 * extra; late joiners may join until start + late entry; ending the exam files the
 * last saved answers of anyone still writing; results release when the exam ends.
 */
import { EXAM } from '@/guides/conductData';

export const SPEED = 60;
export const TICK_MS = 250;
export const DURATION = EXAM.minutes * 60;
export const LATE = EXAM.lateEntry * 60;
/** NewExamSheet: closes = start + duration + late entry + 10 minutes. */
export const CLOSE = DURATION + LATE + 10 * 60;
export const QUESTIONS = EXAM.questions;
export const MAX = EXAM.questions * EXAM.right;
/** Real milliseconds between lobby arrivals. */
export const JOIN_GAP = 220;

export interface Cand {
    id: string;
    name: string;
    roll: string;
    /** Order of joining the lobby (0 first); null = absent or late. */
    order: number | null;
    /** Joins after the start, in exam seconds. */
    late?: number;
    /** Exam seconds after the start before they tap Start. */
    delay: number;
    /** Exam seconds per question. */
    pace: number;
    /** Exam seconds spent checking before submitting. */
    review: number;
    c: number;
    w: number;
    s: number;
    parent: boolean;
}

// name, correct, wrong, skipped, pace, review, lobby slot (null = absent, 'late:<s>' = joins late)
const ROWS: [string, number, number, number, number, number, number | null | string][] = [
    ['Aarav Sharma', 16, 2, 2, 66, 200, 3],
    ['Aditi Rao', 17, 1, 2, 60, 150, 8],
    ['Ananya Gupta', 18, 1, 1, 58, 260, 1],
    ['Arjun Reddy', 12, 5, 3, 74, 120, 12],
    ['Bhavya Nair', 14, 4, 2, 70, 180, 6],
    ['Dev Malhotra', 10, 6, 4, 82, 90, 17],
    ['Diya Menon', 17, 2, 1, 63, 240, 2],
    ['Farhan Qureshi', 13, 5, 2, 76, 160, 10],
    ['Ishaan Verma', 0, 0, 0, 0, 0, null],
    ['Ira Kapoor', 11, 6, 3, 79, 110, 14],
    ['Karan Singh', 9, 8, 3, 55, 60, 19],
    ['Kunal Bose', 12, 4, 4, 72, 100, 'late:170'],
    ['Meera Joshi', 14, 3, 3, 71, 210, 7],
    ['Neha Pillai', 19, 1, 0, 61, 300, 0],
    ['Om Prakash', 8, 7, 5, 58, 60, 18],
    ['Pranav Iyer', 13, 4, 3, 77, 190, 11],
    ['Riya Desai', 16, 3, 1, 69, 220, 5],
    ['Rohan Mehta', 15, 4, 1, 80, 120, 9],
    ['Saanvi Kulkarni', 12, 6, 2, 73, 150, 13],
    ['Sana Khan', 11, 5, 4, 70, 90, 'late:260'],
    ['Tara Banerjee', 0, 0, 0, 0, 0, null],
    ['Vihaan Chopra', 10, 7, 3, 64, 80, 16],
    ['Yash Agarwal', 14, 5, 1, 75, 170, 15],
    ['Zoya Ansari', 17, 2, 1, 67, 230, 4],
];

export const ROSTER: Cand[] = ROWS.map(([name, c, w, s, pace, review, slot], i) => {
    const roll = `12A-${String(i + 1).padStart(2, '0')}`;
    return {
        id: roll,
        name,
        roll,
        order: typeof slot === 'number' ? slot : null,
        late: typeof slot === 'string' ? Number(slot.split(':')[1]) : undefined,
        delay: 20 + ((i * 29) % 60),
        pace,
        review,
        c,
        w,
        s,
        parent: i % 6 !== 4,
    };
});

export const ADITI = ROSTER[1];
ADITI.delay = 30;
export const ROHAN = 'Rohan Mehta';
export const MEERA = 'Meera Joshi';
/** Rohan's signal drops at 6:00 and he rejoins on another phone at 10:00. */
export const ROHAN_OFF = 360;
export const ROHAN_BACK = 600;
/** Meera switches apps at 4:00 and 13:00. */
export const MEERA_WARNINGS = [240, 780];

export const LOBBY_SIZE = ROSTER.filter((c) => c.order !== null).length;

/* ── State ──────────────────────────────────────────────────────────────── */

export type Phase = 'lobby' | 'live' | 'ended';
export type Tab = 'students' | 'results';

export interface ExtraEvent {
    /** Candidate id, or null for everyone writing. */
    id: string | null;
    minutes: number;
    at: number;
}

export interface SimState {
    phase: Phase;
    /** Real ms since the lobby opened. */
    lobbyMs: number;
    /** Lobby ms when the teacher tapped Start. */
    startedLobbyMs: number | null;
    /** Exam seconds since the start. */
    t: number;
    endedAt: number | null;
    extras: ExtraEvent[];
    forced: Record<string, number>;
    removed: Record<string, number>;
    /** Released early by hand; otherwise results release when the exam ends. */
    released: boolean;
    tab: Tab;
}

export type SimAction =
    | { type: 'tick' }
    | { type: 'start' }
    | { type: 'extra'; id: string | null; minutes: number }
    | { type: 'force'; id: string }
    | { type: 'remove'; id: string }
    | { type: 'end' }
    | { type: 'release' }
    | { type: 'tab'; tab: Tab }
    | { type: 'reset' };

export const INITIAL: SimState = {
    phase: 'lobby',
    lobbyMs: 0,
    startedLobbyMs: null,
    t: 0,
    endedAt: null,
    extras: [],
    forced: {},
    removed: {},
    released: false,
    tab: 'students',
};

/** Minutes added for everyone writing, up to exam second `t`. */
const extraAllAt = (st: SimState, t = st.t) => st.extras.filter((e) => e.id === null && e.at <= t).reduce((s, e) => s + e.minutes, 0);

export const closesAt = (st: SimState) => CLOSE + extraAllAt(st) * 60;

export function simReducer(st: SimState, a: SimAction): SimState {
    switch (a.type) {
        case 'tick': {
            if (st.phase === 'lobby') return { ...st, lobbyMs: st.lobbyMs + TICK_MS };
            if (st.phase !== 'live') return st;
            const t = st.t + (TICK_MS / 1000) * SPEED;
            const closes = closesAt(st);
            if (t >= closes) return { ...st, t: closes, phase: 'ended', endedAt: closes };
            return { ...st, t };
        }
        case 'start':
            return st.phase === 'lobby' ? { ...st, phase: 'live', startedLobbyMs: st.lobbyMs, t: 0 } : st;
        case 'extra':
            return { ...st, extras: [...st.extras, { id: a.id, minutes: a.minutes, at: st.t }] };
        case 'force':
            return { ...st, forced: { ...st.forced, [a.id]: st.t } };
        case 'remove':
            return { ...st, removed: { ...st.removed, [a.id]: st.t } };
        case 'end':
            if (st.phase === 'lobby') return { ...st, phase: 'ended', startedLobbyMs: st.lobbyMs, t: 0, endedAt: 0 };
            return st.phase === 'live' ? { ...st, phase: 'ended', endedAt: st.t } : st;
        case 'release':
            return { ...st, released: true };
        case 'tab':
            return { ...st, tab: a.tab };
        case 'reset':
            return INITIAL;
    }
}

/* ── Who is where ───────────────────────────────────────────────────────── */

export type Status = 'joined' | 'writing' | 'submitted';

export interface Person {
    c: Cand;
    status: Status;
    joinedAt: number;
    start: number;
    deadline: number;
    submitAt: number | null;
    answered: number;
    progress: number;
    online: boolean;
    offlineFor: number;
    violations: number;
    deviceChanges: number;
    extra: number;
    forcing: boolean;
    collected: boolean;
    correct: number;
    wrong: number;
    skipped: number;
    marks: number;
}

/** Real ms at which a lobby slot arrives. */
export const arrivalMs = (order: number) => (order + 1) * JOIN_GAP;

/** Everyone who has joined so far, as the room would list them. */
export function people(st: SimState): Person[] {
    const out: Person[] = [];
    for (const c of ROSTER) {
        if (st.removed[c.id] !== undefined) continue;
        let joinedAt: number | null = null;
        if (c.order !== null) {
            const due = arrivalMs(c.order);
            if (st.phase === 'lobby') joinedAt = due <= st.lobbyMs ? 0 : null;
            else if (st.startedLobbyMs !== null && due > st.startedLobbyMs) joinedAt = Math.min(LATE - 10, ((due - st.startedLobbyMs) / 1000) * SPEED);
            else joinedAt = 0;
        } else if (c.late !== undefined && st.phase !== 'lobby') joinedAt = c.late;
        if (joinedAt === null || (st.phase !== 'lobby' && joinedAt > st.t)) continue;
        // Ended before they arrived.
        if (st.endedAt !== null && st.phase === 'ended' && joinedAt > st.endedAt) continue;

        const start = joinedAt + (joinedAt > 0 ? 20 : c.delay);
        const toAnswer = QUESTIONS - c.s;
        const natural = start + toAnswer * c.pace + c.review;
        // Extra time counts only for candidates still writing when it was given.
        const limit = (minutes: number) => Math.min(start + DURATION + minutes * 60, CLOSE + minutes * 60);
        let extra = 0;
        let deadline = limit(0);
        for (const e of st.extras) {
            if ((e.id === null || e.id === c.id) && e.at < Math.min(natural, deadline)) {
                extra += e.minutes;
                deadline = limit(extra);
            }
        }
        let submitAt = Math.min(natural, deadline);
        const forcedAt = st.forced[c.id];
        if (forcedAt !== undefined) submitAt = Math.min(submitAt, forcedAt + 20);
        let collected = false;
        let neverStarted = false;
        if (st.endedAt !== null && submitAt > st.endedAt) {
            if (st.endedAt >= start) {
                submitAt = st.endedAt;
                collected = true;
            } else neverStarted = true;
        }

        const t = st.phase === 'lobby' ? -1 : st.t;
        const status: Status = neverStarted || t < start ? 'joined' : t >= submitAt ? 'submitted' : 'writing';
        const until = Math.min(t, submitAt);
        const answered = status === 'joined' ? 0 : Math.max(0, Math.min(toAnswer, Math.floor((until - start) / c.pace)));
        const isRohan = c.name === ROHAN;
        const offline = isRohan && status === 'writing' && t >= ROHAN_OFF && t < ROHAN_BACK;
        const full = answered >= toAnswer;
        const ratio = full ? 1 : answered / toAnswer;
        const correct = full ? c.c : Math.round(c.c * ratio);
        const wrong = full ? c.w : Math.min(answered - correct, Math.round(c.w * ratio));

        out.push({
            c,
            status,
            joinedAt,
            start,
            deadline,
            submitAt: status === 'submitted' ? submitAt : null,
            answered,
            progress: status === 'writing' ? Math.min(99, Math.round(((answered + 1) / QUESTIONS) * 100)) : 100,
            online: !offline,
            offlineFor: offline ? t - ROHAN_OFF : 0,
            violations: c.name === MEERA && status !== 'joined' ? MEERA_WARNINGS.filter((w) => Math.min(t, submitAt) >= w).length : 0,
            deviceChanges: isRohan && t >= ROHAN_BACK ? 1 : 0,
            extra,
            forcing: forcedAt !== undefined && status !== 'submitted',
            collected,
            correct,
            wrong,
            skipped: QUESTIONS - correct - wrong,
            marks: correct * EXAM.right - wrong * EXAM.wrong,
        });
    }
    return out;
}

export const needsAttention = (p: Person) => (p.status === 'writing' && !p.online) || p.violations > 0 || p.deviceChanges > 0;

export interface Ranked {
    p: Person;
    rank: number;
    time: number;
}

/** Submitted papers, best first; ties go to the quicker candidate. */
export function rankList(list: Person[]): Ranked[] {
    return list
        .filter((p) => p.status === 'submitted')
        .map((p) => ({ p, time: (p.submitAt ?? 0) - p.start }))
        .sort((a, b) => b.p.marks - a.p.marks || a.time - b.time)
        .map((r, i) => ({ ...r, rank: i + 1 }));
}

/** "10:21 am" for an exam second; the exam starts at 10:00 am. */
export function at(examSeconds: number) {
    const total = 10 * 60 + Math.floor(examSeconds / 60);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

/** The state after the exam has run to its end untouched (the hero's results). */
export function finishedState(): SimState {
    let st: SimState = { ...INITIAL, lobbyMs: arrivalMs(LOBBY_SIZE) + 400 };
    st = simReducer(st, { type: 'start' });
    return { ...st, t: CLOSE, phase: 'ended', endedAt: CLOSE, tab: 'results' };
}

/** A snapshot `t` exam seconds into an untouched exam. */
export function liveState(t: number): SimState {
    const st = simReducer({ ...INITIAL, lobbyMs: arrivalMs(LOBBY_SIZE) + 400 }, { type: 'start' });
    return { ...st, t };
}
