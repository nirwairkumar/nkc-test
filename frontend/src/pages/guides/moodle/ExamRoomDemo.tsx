/**
 * The exam room on /moodle-alternative, playable: a replica of the teacher's live-exam
 * page (src/pages/exams/ExamSessionPage.tsx with components/exams/MonitorPanel.tsx and
 * ResultsPanel.tsx) and its projector view (pages/exams/ExamPresentPage.tsx).
 *
 * A batch of 32 joins while the reader watches; the reader starts the exam, gives
 * extra time, submits or removes a candidate, and ends it. Exam time runs 60× faster.
 * Nothing is sent anywhere. The story matches the hero phone: Riya Sharma (10B-17)
 * joins, submits at 10:41 and ranks 3rd of 30 with 26/30; the class averages 19.4.
 *
 * Class strings are the product's, resolved per layout like the NEET guide's exam
 * screen: `desktop` is drawn at 1024 px and scaled into a Mac window; `phone` is the
 * page's mobile layout at its natural size. Menus and dialogs render inside the
 * window instead of in portals. Always light (.ma-screen resets the theme tokens).
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ComponentType, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import {
    AlertTriangle,
    ChevronLeft,
    ClipboardCopy,
    Clock,
    Copy,
    Download,
    FileText,
    KeyRound,
    Lock,
    Maximize2,
    MonitorPlay,
    MoreHorizontal,
    Play,
    Plus,
    RotateCcw,
    Send,
    ShieldCheck,
    Smartphone,
    Square,
    UserX,
    Users,
    WifiOff,
} from 'lucide-react';
import QrCode from '@/components/exams/QrCode';
import { IDENTITY_LABEL, RELEASE_LABEL, clock, minutesText } from '@/components/exams/examFormat';

/* ── Product class strings (components/dashboard/dashboardUi.tsx, exams/ios.tsx) ── */

const CARD = 'rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)]';
const PRIMARY_BTN =
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary text-[15px] font-semibold text-white ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_24px_-12px_rgba(2,132,199,0.85)] ' +
    'transition-[background-color,transform] duration-150 hover:bg-[hsl(200,95%,30%)] motion-safe:active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:pointer-events-none';
const PILL_BTN =
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-[13px] font-semibold text-slate-700 ' +
    'transition-[background-color,transform] duration-150 hover:bg-slate-200/80 motion-safe:active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:pointer-events-none';
const MENU_TRIGGER =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer';
/** DropdownMenuContent merged with "w-56 rounded-xl p-1.5" (tailwind-merge drops rounded-md and p-1). */
const MENU = 'z-50 min-w-[8rem] overflow-hidden border bg-popover text-popover-foreground shadow-md w-56 rounded-xl p-1.5';
/** DropdownMenuItem merged with MENU_ITEM; Radix focuses items on hover, hence hover: here. */
const MENU_ITEM = 'relative flex w-full select-none items-center px-2 text-left text-sm outline-none transition-colors rounded-lg py-2 hover:bg-slate-100 hover:text-slate-900 cursor-pointer';

/* ── The exam ─────────────────────────────────────────────────────────────── */

/** Exam seconds per real second. */
const SPEED = 60;
const TICK_MS = 250;
const DURATION = 45 * 60;
const LATE = 10 * 60;
const CLOSE = DURATION + LATE;
const QUESTIONS = 30;
const CODE = '482913';
/** The desktop page is drawn at this size and scaled into the window. */
const ROOM_WIDTH = 1024;
const ROOM_HEIGHT = 660;
const SECTIONS = ['Physics', 'Chemistry', 'Biology'] as const;

interface Cand {
    id: string;
    name: string;
    roll: string;
    /** Order of joining the lobby (0 first); null = absent. */
    order: number | null;
    /** Joins after the start, in exam seconds. */
    late?: number;
    /** Exam seconds from the start before they tap Start. */
    delay: number;
    /** Exam seconds per question. */
    pace: number;
    /** Exam seconds spent reviewing before submitting. */
    review: number;
    c: number;
    w: number;
    s: number;
    parent: boolean;
}

// name, correct, wrong, skipped, pace, review, lobby order (null = absent, 'late:<s>' = joins late)
const ROWS: [string, number, number, number, number, number, number | null | string][] = [
    ['Aarav Gupta', 24, 4, 2, 70, 240, 3],
    ['Aditi Verma', 21, 7, 2, 66, 300, 9],
    ['Akash Yadav', 15, 10, 5, 84, 120, 21],
    ['Ananya Singh', 28, 2, 0, 62, 420, 1],
    ['Arjun Nair', 18, 9, 3, 74, 200, 'late:180'],
    ['Bhavya Joshi', 20, 6, 4, 80, 260, 14],
    ['Dev Patel', 0, 0, 0, 0, 0, null],
    ['Diya Kapoor', 23, 5, 2, 68, 330, 6],
    ['Fatima Shaikh', 17, 8, 5, 72, 150, 'late:390'],
    ['Gaurav Mishra', 12, 13, 5, 88, 400, 25],
    ['Harsh Agarwal', 19, 8, 3, 78, 210, 11],
    ['Ishita Rao', 0, 0, 0, 0, 0, null],
    ['Kabir Mehta', 22, 6, 2, 81, 180, 7],
    ['Kavya Reddy', 27, 2, 1, 64, 380, 0],
    ['Manav Chauhan', 16, 11, 3, 86, 300, 18],
    ['Meera Pillai', 25, 4, 1, 69, 260, 4],
    ['Riya Sharma', 26, 3, 1, 77, 187, 5],
    ['Rohan Das', 14, 12, 4, 58, 160, 22],
    ['Saanvi Kulkarni', 21, 6, 3, 75, 290, 10],
    ['Sahil Khan', 18, 10, 2, 60, 140, 16],
    ['Sneha Iyer', 20, 7, 3, 79, 230, 12],
    ['Tanvi Bose', 22, 5, 3, 73, 310, 8],
    ['Varun Saxena', 13, 11, 6, 87, 500, 24],
    ['Vihaan Malhotra', 19, 9, 2, 71, 280, 13],
    ['Yash Thakur', 11, 14, 5, 55, 120, 26],
    ['Zoya Ansari', 24, 4, 2, 67, 350, 2],
    ['Aryan Bhatt', 17, 9, 4, 83, 260, 20],
    ['Ira Menon', 20, 8, 2, 76, 240, 15],
    ['Kunal Sethi', 15, 9, 6, 85, 450, 23],
    ['Nisha Pandey', 23, 5, 2, 70, 300, 17],
    ['Om Prakash Jha', 15, 11, 4, 82, 220, 19],
    ['Pooja Rawat', 17, 10, 3, 77, 270, 27],
];

const ROSTER: Cand[] = ROWS.map(([name, c, w, s, pace, review, slot], i) => {
    const roll = `10B-${String(i + 1).padStart(2, '0')}`;
    const late = typeof slot === 'string' ? Number(slot.split(':')[1]) : undefined;
    return {
        id: roll,
        name,
        roll,
        order: typeof slot === 'number' ? slot : null,
        late,
        delay: 25 + ((i * 37) % 70),
        pace,
        review,
        c,
        w,
        s,
        parent: i % 5 !== 3,
    };
});
// Riya taps Start 40 s in, so she submits at 10:41 as on the hero phone.
ROSTER[16].delay = 40;

const LOBBY_SIZE = ROSTER.filter((c) => c.order !== null).length;
/** Real milliseconds between lobby arrivals. */
const JOIN_GAP = 230;
const KABIR = 'Kabir Mehta';
const SNEHA = 'Sneha Iyer';

/** "10:41 am" for an exam second, the exam opening at 10:00 am. */
function at(examSeconds: number) {
    const total = 10 * 60 + Math.floor(examSeconds / 60);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

function sectionSplit(correct: number): number[] {
    const p = Math.round(correct / 3);
    const ch = Math.round((correct - p) / 2);
    return [Math.min(10, p), Math.min(10, ch), Math.min(10, correct - p - ch)];
}

/* ── Simulation state ─────────────────────────────────────────────────────── */

type Phase = 'lobby' | 'live' | 'ended';
type Tab = 'students' | 'results' | 'settings';
type Filter = 'all' | 'writing' | 'submitted' | 'attention' | 'absent';

interface State {
    phase: Phase;
    /** Real ms since the lobby opened. */
    lobbyMs: number;
    /** Lobby ms at the moment the teacher tapped Start. */
    startedLobbyMs: number | null;
    /** Exam seconds since the start. */
    t: number;
    endedAt: number | null;
    extraAll: number;
    extra: Record<string, number>;
    forced: Record<string, number>;
    removed: Record<string, true>;
    /** Released early by hand; otherwise results release when the exam ends. */
    released: boolean;
    tab: Tab;
}

type Action =
    | { type: 'tick' }
    | { type: 'start' }
    | { type: 'release' }
    | { type: 'extra-all'; minutes: number }
    | { type: 'extra'; id: string; minutes: number }
    | { type: 'force'; id: string }
    | { type: 'remove'; id: string }
    | { type: 'end' }
    | { type: 'tab'; tab: Tab }
    | { type: 'reset' };

const INITIAL: State = {
    phase: 'lobby',
    lobbyMs: 0,
    startedLobbyMs: null,
    t: 0,
    endedAt: null,
    extraAll: 0,
    extra: {},
    forced: {},
    removed: {},
    released: false,
    tab: 'students',
};

function reducer(st: State, a: Action): State {
    switch (a.type) {
        case 'tick': {
            if (st.phase === 'lobby') return { ...st, lobbyMs: st.lobbyMs + TICK_MS };
            if (st.phase !== 'live') return st;
            const t = st.t + (TICK_MS / 1000) * SPEED;
            const closes = CLOSE + st.extraAll * 60;
            if (t >= closes) return { ...st, t: closes, phase: 'ended', endedAt: closes };
            return { ...st, t };
        }
        case 'start':
            return st.phase === 'lobby' ? { ...st, phase: 'live', startedLobbyMs: st.lobbyMs, t: 0 } : st;
        case 'extra-all':
            return { ...st, extraAll: st.extraAll + a.minutes };
        case 'extra':
            return { ...st, extra: { ...st.extra, [a.id]: (st.extra[a.id] ?? 0) + a.minutes } };
        case 'force':
            return { ...st, forced: { ...st.forced, [a.id]: st.t } };
        case 'remove':
            return { ...st, removed: { ...st.removed, [a.id]: true } };
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

type Status = 'joined' | 'writing' | 'submitted';

interface Person {
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
}

/** Everyone who has joined so far, as the monitor would list them. */
function people(st: State): Person[] {
    const out: Person[] = [];
    for (const c of ROSTER) {
        if (st.removed[c.id]) continue;
        let joinedAt: number | null = null;
        if (c.order !== null) {
            const due = (c.order + 1) * JOIN_GAP;
            if (st.phase === 'lobby') joinedAt = due <= st.lobbyMs ? 0 : null;
            else if (st.startedLobbyMs !== null && due > st.startedLobbyMs) joinedAt = ((due - st.startedLobbyMs) / 1000) * SPEED;
            else joinedAt = 0;
        } else if (c.late !== undefined && st.phase !== 'lobby') joinedAt = c.late;
        if (joinedAt === null || (st.phase !== 'lobby' && joinedAt > st.t)) continue;

        const extra = st.extraAll + (st.extra[c.id] ?? 0);
        const start = joinedAt + (joinedAt > 0 ? 20 : c.delay);
        const deadline = Math.min(start + DURATION + extra * 60, CLOSE + extra * 60);
        const toAnswer = QUESTIONS - c.s;
        let submitAt = Math.min(start + toAnswer * c.pace + c.review, deadline);
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
        const isKabir = c.name === KABIR;
        const offline = isKabir && status === 'writing' && t >= 480 && t < 840;
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
            offlineFor: offline ? t - 480 : 0,
            violations: c.name === SNEHA && status !== 'joined' ? Number(t >= 660) + Number(t >= 1380) : 0,
            deviceChanges: isKabir && t >= 840 ? 1 : 0,
            extra,
            forcing: forcedAt !== undefined && status !== 'submitted',
            collected,
            correct,
            wrong,
            skipped: QUESTIONS - correct - wrong,
        });
    }
    return out;
}

const needsAttention = (p: Person) => (p.status === 'writing' && !p.online) || p.violations > 0 || p.deviceChanges > 0;

/* ── Small pieces ─────────────────────────────────────────────────────────── */

function Avatar({ name, muted }: { name: string; muted?: boolean }) {
    const parts = name.trim().split(/\s+/);
    const initials = ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
    return (
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${muted ? 'bg-slate-100 text-slate-400' : 'bg-sky-50 text-sky-700'}`}>
            {initials}
        </span>
    );
}

function Flag({ icon: Icon, tone, children }: { icon?: ComponentType<{ className?: string }>; tone: 'amber' | 'violet' | 'sky' | 'red'; children: ReactNode }) {
    const tones = {
        amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
        violet: 'bg-violet-50 text-violet-700 ring-violet-600/15',
        sky: 'bg-sky-50 text-sky-700 ring-sky-600/15',
        red: 'bg-red-50 text-red-700 ring-red-600/15',
    } as const;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset ${tones[tone]}`}>
            {Icon && <Icon className="h-3 w-3" />}
            {children}
        </span>
    );
}

function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string }) {
    return (
        <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col rounded-[10px] bg-slate-200/70 p-0.5">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={value === o.value}
                    onClick={() => onChange(o.value)}
                    className={`h-8 whitespace-nowrap rounded-[8px] px-3 text-[13px] font-semibold transition-all cursor-pointer ${
                        value === o.value ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.14),0_1px_1px_rgba(15,23,42,0.04)]' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

function Chip({ icon: Icon, children }: { icon: ComponentType<{ className?: string }>; children: ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-900/[0.06]">
            <Icon className="h-3.5 w-3.5 text-slate-400" /> {children}
        </span>
    );
}

function PhaseBadge({ phase }: { phase: Phase }) {
    const styles: Record<Phase, string> = {
        live: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        lobby: 'bg-sky-50 text-sky-700 ring-sky-600/20',
        ended: 'bg-slate-100 text-slate-600 ring-slate-500/15',
    };
    return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none ring-1 ring-inset ${styles[phase]}`}>
            {phase === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />}
            {phase === 'lobby' ? 'Waiting for you' : phase === 'live' ? 'Live' : 'Ended'}
        </span>
    );
}

/** A dropdown that opens inside the window (the product's opens in a portal). */
function Menu({ open, onClose, children, up }: { open: boolean; onClose: () => void; children: ReactNode; up?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            if (!ref.current?.parentElement?.contains(e.target as Node)) onClose();
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, onClose]);
    if (!open) return null;
    return (
        <div ref={ref} role="menu" className={`${MENU} ma-menu-pop absolute right-0 ${up ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
            {children}
        </div>
    );
}

/* ── The page ─────────────────────────────────────────────────────────────── */

interface Toast {
    id: number;
    text: string;
}

function RoomPage({
    d,
    st,
    list,
    dispatch,
    toast,
    onProjector,
    hint,
    overlay,
}: {
    d: boolean;
    st: State;
    list: Person[];
    dispatch: (a: Action) => void;
    toast: (text: string) => void;
    onProjector: () => void;
    hint: string | null;
    /** Layer above the scrolling page, where dialogs open (the product's portal). */
    overlay: HTMLElement | null;
}) {
    const [filter, setFilter] = useState<Filter>('all');
    const [menu, setMenu] = useState<string | null>(null);
    const [confirmEnd, setConfirmEnd] = useState(false);
    const [pin, setPin] = useState<{ name: string; roll: string; pin: string } | null>(null);
    const closeMenu = useCallback(() => setMenu(null), []);

    const writing = list.filter((p) => p.status === 'writing').length;
    const submitted = list.filter((p) => p.status === 'submitted').length;
    const lobby = list.filter((p) => p.status === 'joined').length;
    const attention = list.filter(needsAttention).length;
    const notJoined = ROSTER.filter((c) => !st.removed[c.id] && !list.some((p) => p.c.id === c.id));
    const closes = CLOSE + st.extraAll * 60;

    const shown = useMemo(() => {
        const order = { writing: 0, joined: 1, submitted: 2 } as const;
        const sorted = [...list].sort((a, b) => Number(needsAttention(b)) - Number(needsAttention(a)) || order[a.status] - order[b.status] || a.c.name.localeCompare(b.c.name));
        if (filter === 'writing') return sorted.filter((p) => p.status !== 'submitted');
        if (filter === 'submitted') return sorted.filter((p) => p.status === 'submitted');
        if (filter === 'attention') return sorted.filter(needsAttention);
        if (filter === 'absent') return [];
        return sorted;
    }, [list, filter]);

    const act = (p: Person, action: 'extra' | 'force' | 'remove', minutes?: number) => {
        setMenu(null);
        if (action === 'extra' && minutes) {
            dispatch({ type: 'extra', id: p.c.id, minutes });
            toast(`${p.c.name} got ${minutes} more minutes.`);
        } else if (action === 'force') {
            dispatch({ type: 'force', id: p.c.id });
            toast(`${p.c.name}'s exam will submit within 20 seconds.`);
        } else if (action === 'remove') {
            dispatch({ type: 'remove', id: p.c.id });
            toast(`${p.c.name} was removed.`);
        }
    };

    const ended = st.phase === 'ended';
    const waiting = st.phase === 'lobby';
    const row = d ? 'flex items-center gap-3 px-5 py-3' : 'flex items-center gap-3 px-4 py-3';

    return (
        <div className={d ? 'mx-auto w-full max-w-5xl space-y-6 px-8 pb-16 pt-6' : 'mx-auto w-full max-w-5xl space-y-6 px-4 pb-16 pt-4'}>
            <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => toast('This copy has one exam. In the app, Exams lists all of them.')} className="-ml-2 inline-flex h-9 items-center rounded-full pr-3 text-[15px] font-medium text-sky-700 hover:bg-sky-50 cursor-pointer">
                    <ChevronLeft className="h-5 w-5" /> Exams
                </button>
                <div className="relative">
                    <button type="button" aria-label="More actions" aria-expanded={menu === 'page'} className={MENU_TRIGGER} onClick={() => setMenu(menu === 'page' ? null : 'page')}>
                        <MoreHorizontal className="h-[18px] w-[18px]" />
                    </button>
                    <Menu open={menu === 'page'} onClose={closeMenu}>
                        <button type="button" className={MENU_ITEM} onClick={() => (setMenu(null), onProjector())}>
                            <MonitorPlay className="mr-2.5 h-4 w-4 text-slate-500" /> Show on projector
                        </button>
                        <button type="button" className={MENU_ITEM} onClick={() => (setMenu(null), toast('Report cards open as printable A4 pages in the app.'))}>
                            <FileText className="mr-2.5 h-4 w-4 text-slate-500" /> Report cards
                        </button>
                        <button type="button" className={MENU_ITEM} onClick={() => (setMenu(null), toast('In the app this sets up a re-test for the absentees.'))}>
                            <RotateCcw className="mr-2.5 h-4 w-4 text-slate-500" /> Re-test for absentees
                        </button>
                    </Menu>
                </div>
            </div>

            <header>
                <div className="flex flex-wrap items-center gap-2">
                    <PhaseBadge phase={st.phase} />
                </div>
                <p className={`mt-2 font-bold leading-tight tracking-[-0.025em] text-slate-900 ${d ? 'text-[32px]' : 'text-[26px]'}`}>Science Test 14</p>
                <p className="mt-1.5 text-[15px] text-slate-600">Class 10 Science: Term 1 Practice Paper · 10-B · Today, 10:00 am to {at(closes)}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[13px] text-slate-600">
                    <Chip icon={ShieldCheck}>{IDENTITY_LABEL.roll_pin}</Chip>
                    <Chip icon={Clock}>45 min · late entry 10 min</Chip>
                    <Chip icon={Send}>Results: {RELEASE_LABEL.on_end.toLowerCase()}</Chip>
                </div>
            </header>

            {!ended && (
                <section className={`${CARD} overflow-hidden`}>
                    <div className={d ? 'flex flex-row items-center gap-6 p-6' : 'flex flex-col gap-6 p-5'}>
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] text-slate-500">
                                Candidates open <span className="font-semibold text-slate-800">testoza.com/join</span> and type
                            </p>
                            <p className={`mt-1 font-bold leading-none tracking-[0.06em] text-slate-900 tabular-nums ${d ? 'text-[64px]' : 'text-[56px]'}`}>
                                {CODE.slice(0, 3)} {CODE.slice(3)}
                            </p>
                            <div className="mt-5 flex flex-wrap gap-2">
                                <button type="button" className={PILL_BTN} onClick={() => toast('Code copied')}>
                                    <Copy className="h-4 w-4 text-sky-600" /> Code
                                </button>
                                <button type="button" className={PILL_BTN} onClick={() => toast('Message copied')}>
                                    <Copy className="h-4 w-4 text-sky-600" /> Message
                                </button>
                                <button type="button" onClick={() => toast('In the app this opens WhatsApp with the invite filled in.')} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 text-[13px] font-semibold text-white hover:brightness-95 cursor-pointer">
                                    WhatsApp
                                </button>
                                <button type="button" className={PILL_BTN} onClick={onProjector}>
                                    <MonitorPlay className="h-4 w-4 text-sky-600" /> Projector
                                </button>
                            </div>
                        </div>
                        <div className="shrink-0 self-center rounded-2xl bg-white p-2 ring-1 ring-slate-900/[0.06]">
                            <QrCode value={`https://testoza.com/join/${CODE}`} size={132} />
                        </div>
                    </div>
                </section>
            )}

            {ended ? (
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className={`${PILL_BTN} h-11 px-4`} onClick={() => toast('Report cards open as printable A4 pages in the app.')}>
                        <FileText className="h-4 w-4 text-sky-600" /> Report cards
                    </button>
                    <button type="button" className={`${PILL_BTN} h-11 px-4`} onClick={() => toast('In the app this sets up a re-test for the absentees.')}>
                        <RotateCcw className="h-4 w-4 text-sky-600" /> Re-test for absentees
                    </button>
                </div>
            ) : (
                <div className={`${CARD} flex gap-4 ${d ? 'flex-row items-center justify-between p-5' : 'flex-col p-4'}`}>
                    <div className="flex items-center gap-3">
                        <span className={`flex h-11 w-11 items-center justify-center rounded-[12px] ${waiting ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {waiting ? <Users className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                        </span>
                        <div>
                            {waiting ? (
                                <>
                                    <p className="text-[17px] font-semibold text-slate-900">Waiting for you to start</p>
                                    <p className="text-[14px] text-slate-600">{lobby} of 32 in the lobby · starts when you tap Start</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-[17px] font-semibold text-slate-900">
                                        {writing} writing · {submitted} submitted
                                    </p>
                                    <p className="text-[14px] text-slate-600">
                                        Closes in {clock(closes - st.t)} (at {at(closes)})
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {waiting && (
                            <button type="button" className={`${PRIMARY_BTN} h-11 px-5${hint === 'start' ? ' ma-nudge' : ''}`} onClick={() => (dispatch({ type: 'start' }), toast('The exam has started. Candidates can begin.'))}>
                                <Play className="h-4 w-4 fill-current" /> Start exam now
                            </button>
                        )}
                        {!waiting && (
                            <div className="relative">
                                <button type="button" className={`${PILL_BTN} h-11 px-4`} aria-expanded={menu === 'more'} onClick={() => setMenu(menu === 'more' ? null : 'more')}>
                                    <Plus className="h-4 w-4 text-sky-600" /> More time
                                </button>
                                <Menu open={menu === 'more'} onClose={closeMenu}>
                                    {[5, 10, 15, 30].map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            className={MENU_ITEM}
                                            onClick={() => {
                                                setMenu(null);
                                                dispatch({ type: 'extra-all', minutes: m });
                                                toast(`Everyone still writing got ${m} more minutes.`);
                                            }}
                                        >
                                            +{m} min for everyone writing
                                        </button>
                                    ))}
                                </Menu>
                            </div>
                        )}
                        <button
                            type="button"
                            className={`inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold text-red-600 hover:bg-red-50 cursor-pointer${hint === 'end' ? ' ma-nudge ma-nudge--red' : ''}`}
                            onClick={() => setConfirmEnd(true)}
                        >
                            <Square className="h-3.5 w-3.5 fill-current" /> End exam
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-md">
                <Segmented<Tab>
                    value={st.tab}
                    onChange={(tab) => (tab === 'settings' ? toast('Settings (times, check-in, results) open in the app.') : dispatch({ type: 'tab', tab }))}
                    label="Exam room view"
                    options={[
                        { value: 'students', label: `Candidates${list.length ? ` (${list.length})` : ''}` },
                        { value: 'results', label: `Results${submitted ? ` (${submitted})` : ''}` },
                        { value: 'settings', label: 'Settings' },
                    ]}
                />
            </div>

            {st.tab === 'students' ? (
                <section className="space-y-4">
                    <div className={d ? 'grid grid-cols-4 gap-2.5' : 'grid grid-cols-2 gap-2.5'}>
                        <Stat label={st.phase === 'live' ? 'Writing' : 'In lobby'} value={st.phase === 'live' ? writing : lobby} tone="text-emerald-700" live={st.phase === 'live' && writing > 0} />
                        <Stat label="Submitted" value={submitted} tone="text-slate-900" />
                        <Stat label="Need a look" value={attention} tone={attention ? 'text-amber-700' : 'text-slate-900'} />
                        <Stat label="Not joined" value={notJoined.length} tone="text-slate-900" />
                    </div>

                    <div className="overflow-x-auto pb-1">
                        <div className={d ? 'w-auto' : 'w-max min-w-full'}>
                            <Segmented<Filter>
                                value={filter}
                                onChange={setFilter}
                                label="Show candidates"
                                options={[
                                    { value: 'all', label: `All ${list.length}` },
                                    { value: 'writing', label: 'Not done' },
                                    { value: 'submitted', label: 'Submitted' },
                                    { value: 'attention', label: `Need a look${attention ? ` ${attention}` : ''}` },
                                    { value: 'absent', label: `Not joined ${notJoined.length}` },
                                ]}
                            />
                        </div>
                    </div>

                    {filter !== 'absent' &&
                        (shown.length === 0 ? (
                            <div className={`${CARD} px-6 py-10 text-center`}>
                                <p className="text-[16px] font-semibold text-slate-900">{list.length === 0 ? 'Nobody has joined yet' : 'Nobody here'}</p>
                                <p className="mt-1 text-[14px] text-slate-600">{list.length === 0 ? 'Names appear here the moment candidates enter the code.' : 'Try another filter.'}</p>
                            </div>
                        ) : (
                            <ul className={`${CARD} divide-y divide-slate-100`}>
                                {shown.map((p, index) => (
                                    <li key={p.c.id} className={`${row} ma-row`}>
                                        <Avatar name={p.c.name} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span className="truncate text-[15px] font-semibold text-slate-900">{p.c.name}</span>
                                                <span className="shrink-0 text-[13px] text-slate-500">{p.c.roll}</span>
                                            </div>
                                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
                                                {p.status === 'submitted' ? (
                                                    <span className="text-slate-600">Submitted {at(p.submitAt ?? 0)}</span>
                                                ) : p.status === 'writing' ? (
                                                    p.online ? (
                                                        <span className="text-emerald-700">Writing · {clock(p.deadline - st.t)} left</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-amber-700">
                                                            <WifiOff className="h-3.5 w-3.5" /> No signal for {clock(p.offlineFor)}
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-sky-700">In the lobby</span>
                                                )}
                                                {p.status !== 'joined' && <span className="text-slate-500">{p.answered} answered</span>}
                                                {p.violations > 0 && (
                                                    <Flag icon={AlertTriangle} tone="amber">
                                                        {p.violations} warning{p.violations === 1 ? '' : 's'}
                                                    </Flag>
                                                )}
                                                {p.deviceChanges > 0 && (
                                                    <Flag icon={Smartphone} tone="violet">
                                                        Changed device
                                                    </Flag>
                                                )}
                                                {p.extra > 0 && <Flag tone="sky">+{p.extra} min</Flag>}
                                                {p.forcing && <Flag tone="red">Submitting…</Flag>}
                                            </div>
                                            {p.status === 'writing' && (
                                                <div className="mt-1.5 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-slate-100">
                                                    <div className="h-full rounded-full bg-sky-500 transition-[width] duration-500" style={{ width: `${Math.min(100, p.progress)}%` }} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <button type="button" aria-label={`Actions for ${p.c.name}`} aria-expanded={menu === p.c.id} className={MENU_TRIGGER} onClick={() => setMenu(menu === p.c.id ? null : p.c.id)}>
                                                <MoreHorizontal className="h-[18px] w-[18px]" />
                                            </button>
                                            <Menu open={menu === p.c.id} onClose={closeMenu} up={index > 1 && index >= shown.length - 3}>
                                                {p.status !== 'submitted' && (
                                                    <>
                                                        <button type="button" className={MENU_ITEM} onClick={() => act(p, 'extra', 5)}>
                                                            +5 minutes
                                                        </button>
                                                        <button type="button" className={MENU_ITEM} onClick={() => act(p, 'extra', 10)}>
                                                            +10 minutes
                                                        </button>
                                                        {p.status === 'writing' && (
                                                            <button type="button" className={MENU_ITEM} onClick={() => act(p, 'force')}>
                                                                Submit their exam now
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                                {p.status === 'submitted' && (
                                                    <button type="button" className={MENU_ITEM} onClick={() => (setMenu(null), toast(`In the app, ${p.c.name} could now take it again.`))}>
                                                        Let them take it again
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className={MENU_ITEM}
                                                    onClick={() => {
                                                        setMenu(null);
                                                        setPin({ name: p.c.name, roll: p.c.roll, pin: String(1000 + ((p.c.roll.charCodeAt(5) * 977) % 9000)) });
                                                    }}
                                                >
                                                    <KeyRound className="mr-2.5 h-4 w-4 text-slate-500" />
                                                    New PIN
                                                </button>
                                                <div className="-mx-1 my-1 h-px bg-muted" />
                                                <button type="button" className={`${MENU_ITEM} text-red-600 hover:bg-red-50 hover:text-red-600`} onClick={() => act(p, 'remove')}>
                                                    <UserX className="mr-2.5 h-4 w-4" /> Remove from exam
                                                </button>
                                            </Menu>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ))}

                    {(filter === 'absent' || filter === 'all') && notJoined.length > 0 && (
                        <div>
                            <p className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500">Not joined ({notJoined.length})</p>
                            <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                                {notJoined.map((c) => (
                                    <li key={c.id} className={row}>
                                        <Avatar name={c.name} muted />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[15px] text-slate-700">{c.name}</p>
                                            <p className="text-[13px] text-slate-500">Roll {c.roll}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPin({ name: c.name, roll: c.roll, pin: String(1000 + ((c.roll.charCodeAt(5) * 977) % 9000)) })}
                                            className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-sky-700 hover:bg-sky-50 cursor-pointer"
                                        >
                                            <KeyRound className="h-3.5 w-3.5" /> New PIN
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>
            ) : (
                <Results d={d} st={st} list={list} notJoined={notJoined} toast={toast} dispatch={dispatch} />
            )}

            {confirmEnd &&
                overlay &&
                createPortal(
                <div className="ma-modal">
                    <div className="ma-modal-scrim bg-black/80" onClick={() => setConfirmEnd(false)} />
                    <div role="alertdialog" aria-label="End the exam now?" className="ma-modal-card grid w-full max-w-[min(400px,calc(100%-32px))] gap-4 rounded-2xl border bg-background p-6 shadow-lg">
                        <div className="text-center">
                            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-inset ring-red-600/15">
                                <Square className="h-4 w-4 fill-current" />
                            </span>
                            <p className="text-lg font-semibold text-slate-900">End the exam now?</p>
                            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                                {writing > 0
                                    ? `${writing} candidate${writing === 1 ? ' is' : 's are'} still writing. Their exam closes now and their last saved answers are submitted for them.`
                                    : 'Nobody can join or write after this. The code stops working.'}
                            </p>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setConfirmEnd(false)} className="m-0 h-11 rounded-xl border-0 bg-slate-100 text-[15px] font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer">
                                Keep going
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setConfirmEnd(false);
                                    dispatch({ type: 'end' });
                                    dispatch({ type: 'tab', tab: 'results' });
                                    toast('Exam ended. Results are ready.');
                                }}
                                className="h-11 rounded-xl bg-red-600 text-[15px] font-semibold text-white hover:bg-red-700 cursor-pointer"
                            >
                                End exam
                            </button>
                        </div>
                    </div>
                </div>,
                overlay,
            )}

            {pin &&
                overlay &&
                createPortal(
                <div className="ma-modal">
                    <div className="ma-modal-scrim bg-black/80" onClick={() => setPin(null)} />
                    <div role="alertdialog" aria-label={`New PIN for ${pin.name}`} className="ma-modal-card grid w-full max-w-[min(360px,calc(100%-32px))] gap-4 rounded-2xl border bg-background p-6 text-center shadow-lg">
                        <p className="text-lg font-semibold text-slate-900">New PIN for {pin.name}</p>
                        <p className="text-[14px] text-slate-600">Roll {pin.roll}. The old PIN no longer works. Tell the candidate now — it is not shown again.</p>
                        <p className="my-2 text-[48px] font-bold tracking-[0.3em] text-slate-900 tabular-nums">{pin.pin}</p>
                        <button type="button" onClick={() => setPin(null)} className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
                            Done
                        </button>
                    </div>
                </div>,
                overlay,
            )}
        </div>
    );
}

function Stat({ label, value, tone, live }: { label: string; value: number; tone: string; live?: boolean }) {
    return (
        <div className={`${CARD} px-4 py-3`}>
            <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
                {live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />}
                {label}
            </p>
            <p className={`mt-0.5 text-[28px] font-bold leading-tight tracking-[-0.02em] ${tone}`}>{value}</p>
        </div>
    );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className={`${CARD} min-w-0 px-4 py-3`}>
            <dt className="text-[13px] text-slate-500">{label}</dt>
            <dd className="mt-0.5 truncate text-[22px] font-bold leading-tight tracking-[-0.02em] text-slate-900">{value}</dd>
            {sub && <dd className="truncate text-[12px] text-slate-500">{sub}</dd>}
        </div>
    );
}

/** ResultsPanel: summary tiles, class average by section, the rank list and who is missing. */
function Results({
    d,
    st,
    list,
    notJoined,
    toast,
    dispatch,
}: {
    d: boolean;
    st: State;
    list: Person[];
    notJoined: Cand[];
    toast: (t: string) => void;
    dispatch: (a: Action) => void;
}) {
    const ended = st.phase === 'ended';
    const released = ended || st.released;
    const rows = list
        .filter((p) => p.status === 'submitted')
        .map((p) => ({ p, score: p.correct, time: (p.submitAt ?? 0) - p.start, split: sectionSplit(p.correct) }))
        .sort((a, b) => b.score - a.score || a.time - b.time);
    const notSubmitted = list.filter((p) => p.status !== 'submitted');
    const count = rows.length;
    const avg = count ? Math.round((rows.reduce((s, r) => s + r.score, 0) / count) * 100) / 100 : 0;
    const secAvg = SECTIONS.map((name, i) => ({ name, avg: count ? Math.round((rows.reduce((s, r) => s + r.split[i], 0) / count) * 100) / 100 : 0 }));

    if (!count) {
        return (
            <section className="space-y-5">
                <div className={`${CARD} px-6 py-12 text-center`}>
                    <p className="text-[16px] font-semibold text-slate-900">No results yet</p>
                    <p className="mt-1 text-[14px] text-slate-600">Each candidate&apos;s marks appear here the moment they submit.</p>
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-5">
            {!released && (
                <div className={`flex gap-3 rounded-2xl bg-sky-50 px-4 py-3.5 ring-1 ring-inset ring-sky-600/15 ${d ? 'flex-row items-center justify-between' : 'flex-col'}`}>
                    <p className="text-[14px] text-sky-900">Candidates can&apos;t see their results yet. They appear when the exam ends.</p>
                    <button
                        type="button"
                        onClick={() => (dispatch({ type: 'release' }), toast('Results released. Candidates can see them now.'))}
                        className={`${PRIMARY_BTN} h-9 px-3.5 text-[13px]`}
                    >
                        <Send className="h-4 w-4" /> Release now
                    </button>
                </div>
            )}
            <dl className={d ? 'grid grid-cols-4 gap-2.5' : 'grid grid-cols-2 gap-2.5'}>
                <Tile label="Submitted" value={`${count}${notJoined.length || notSubmitted.length ? ` of ${count + notJoined.length + notSubmitted.length}` : ''}`} />
                <Tile label="Average" value={`${fmt(avg)} / ${QUESTIONS}`} />
                <Tile label="Highest" value={fmt(rows[0].score)} sub={rows[0].p.c.name} />
                <Tile label="Lowest" value={fmt(rows[rows.length - 1].score)} sub={rows.length > 1 ? rows[rows.length - 1].p.c.name : undefined} />
            </dl>

            <div className={`${CARD} p-5`}>
                <p className="text-[15px] font-semibold text-slate-900">Class average by section</p>
                <div className="mt-3 space-y-3">
                    {secAvg.map((s) => {
                        const pct = Math.max(0, Math.min(100, (s.avg / 10) * 100));
                        return (
                            <div key={s.name}>
                                <div className="flex justify-between text-[14px]">
                                    <span className="text-slate-700">{s.name}</span>
                                    <span className="font-semibold tabular-nums text-slate-900">{fmt(s.avg)} / 10</span>
                                </div>
                                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div className={`h-full rounded-full ${pct < 40 ? 'bg-rose-400' : pct < 75 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <button type="button" className={PILL_BTN} onClick={() => toast('Rank list copied')}>
                    <ClipboardCopy className="h-4 w-4 text-sky-600" /> Copy rank list
                </button>
                <button type="button" onClick={() => toast('In the app this opens WhatsApp with the rank list filled in.')} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366]/10 px-3.5 text-[13px] font-semibold text-[#128C7E] hover:bg-[#25D366]/20 cursor-pointer">
                    Send rank list on WhatsApp
                </button>
                <button type="button" className={PILL_BTN} onClick={() => toast('In the app this downloads Science Test 14.xlsx.')}>
                    <Download className="h-4 w-4 text-sky-600" /> Excel
                </button>
                <button type="button" className={PILL_BTN} onClick={() => toast('Report cards open as printable A4 pages in the app.')}>
                    <FileText className="h-4 w-4 text-sky-600" /> Report cards
                </button>
            </div>

            <ol className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                {rows.map((r, i) => {
                    const rank = i + 1;
                    return (
                        <li key={r.p.c.id} className={d ? 'flex items-center gap-3 px-5 py-3' : 'flex items-center gap-3 px-4 py-3'}>
                            <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                                    rank === 1 ? 'bg-amber-100 text-amber-800' : rank === 2 ? 'bg-slate-200 text-slate-700' : rank === 3 ? 'bg-orange-100 text-orange-800' : 'bg-slate-50 text-slate-500'
                                }`}
                            >
                                {rank}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[15px] font-semibold text-slate-900">
                                    {r.p.c.name} <span className="font-normal text-slate-500">{r.p.c.roll}</span>
                                </p>
                                <p className="mt-0.5 flex flex-wrap gap-x-2.5 text-[13px] text-slate-500">
                                    <span>
                                        {r.p.correct} right · {r.p.wrong} wrong · {r.p.skipped} skipped
                                    </span>
                                    <span>{minutesText(r.time)}</span>
                                    {d && <span>{SECTIONS.map((s, k) => `${s.slice(0, 4)} ${r.split[k]}`).join(' · ')}</span>}
                                    {r.p.violations > 0 && (
                                        <span className="text-amber-700">
                                            {r.p.violations} warning{r.p.violations === 1 ? '' : 's'}
                                        </span>
                                    )}
                                    {r.p.collected && <span className="text-violet-700">answers filed by you</span>}
                                </p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-[16px] font-bold tabular-nums text-slate-900">
                                    {fmt(r.score)}
                                    <span className="text-[13px] font-normal text-slate-500"> / {QUESTIONS}</span>
                                </p>
                                <p className="text-[12px] text-slate-500">{Math.round((r.score / QUESTIONS) * 100)}%</p>
                            </div>
                            {d && r.p.c.parent && (
                                <button
                                    type="button"
                                    title="Send to parent on WhatsApp"
                                    onClick={() => toast(`In the app this opens WhatsApp with ${r.p.c.name.split(' ')[0]}’s marks and rank for their parent.`)}
                                    className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#25D366]/10 px-3 text-[12px] font-semibold text-[#128C7E] hover:bg-[#25D366]/20 cursor-pointer"
                                >
                                    Parent
                                </button>
                            )}
                        </li>
                    );
                })}
            </ol>

            {(notJoined.length > 0 || notSubmitted.length > 0) && (
                <div>
                    <p className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500">Didn&apos;t submit ({notJoined.length + notSubmitted.length})</p>
                    <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                        {notSubmitted.map((p) => (
                            <li key={p.c.id} className={`flex items-center justify-between gap-3 py-3 text-[14px] ${d ? 'px-5' : 'px-4'}`}>
                                <span className="text-slate-800">
                                    {p.c.name} <span className="text-slate-500">{p.c.roll}</span>
                                </span>
                                <span className="text-slate-500">{p.status === 'writing' ? 'Started, not submitted' : 'Joined, never started'}</span>
                            </li>
                        ))}
                        {notJoined.map((c) => (
                            <li key={c.id} className={`flex items-center justify-between gap-3 py-3 text-[14px] ${d ? 'px-5' : 'px-4'}`}>
                                <span className="text-slate-800">
                                    {c.name} <span className="text-slate-500">{c.roll}</span>
                                </span>
                                <span className="flex items-center gap-2 text-slate-500">
                                    Absent
                                    {c.parent && (
                                        <button
                                            type="button"
                                            onClick={() => toast(`In the app this opens WhatsApp to tell ${c.name.split(' ')[0]}’s parent they missed the test.`)}
                                            className="inline-flex h-7 items-center rounded-full bg-[#25D366]/10 px-2.5 text-[12px] font-semibold text-[#128C7E] hover:bg-[#25D366]/20 cursor-pointer"
                                        >
                                            Tell parent
                                        </button>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}

/** ExamPresentPage at 1280 × 720, its lg: layout and clamp() sizes resolved for that width. */
function Projector({ st, list, onStart }: { st: State; list: Person[]; onStart: () => void }) {
    const live = st.phase === 'live';
    const recent = [...list].sort((a, b) => b.joinedAt - a.joinedAt || (b.c.order ?? 0) - (a.c.order ?? 0)).slice(0, 18);
    const closes = CLOSE + st.extraAll * 60;
    return (
        <div className="relative h-[720px] w-[1280px] overflow-hidden bg-slate-950 text-white">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_15%_-10%,rgba(14,165,233,0.35),transparent),radial-gradient(800px_500px_at_110%_120%,rgba(16,185,129,0.22),transparent)]" />
            <span className="absolute right-5 top-5 z-10 inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-[14px] font-medium text-white/80 backdrop-blur">
                <Maximize2 className="h-4 w-4" /> Full screen
            </span>
            <div className="relative mx-auto flex h-full max-w-[1400px] flex-row items-center justify-center gap-16 px-16 py-12">
                <div className="min-w-0 flex-1">
                    <p className="text-[20.5px] font-medium text-white/70">Sunrise Academy</p>
                    <p className="mt-2 text-[43.5px] font-bold leading-tight tracking-[-0.02em]">Class 10 Science: Term 1 Practice Paper</p>
                    <p className="mt-10 text-[24.3px] text-white/75">
                        Go to <span className="font-semibold text-white">testoza.com/join</span> and enter
                    </p>
                    <p className="mt-2 text-[166.4px] font-bold leading-none tracking-[0.08em] tabular-nums">
                        {CODE.slice(0, 3)} {CODE.slice(3)}
                    </p>
                    <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-[23px]">
                        <span>
                            <span className="font-bold tabular-nums">{list.length}</span>
                            <span className="text-white/60"> of 32</span> joined
                        </span>
                        {live ? (
                            <span className="inline-flex items-center gap-3 text-emerald-300">
                                <span className="h-3 w-3 rounded-full bg-emerald-400 motion-safe:animate-pulse" /> Exam is on · closes in {clock(closes - st.t)}
                            </span>
                        ) : st.phase === 'ended' ? (
                            <span className="text-white/70">The exam has ended</span>
                        ) : (
                            <span className="text-sky-300">Starting soon</span>
                        )}
                    </div>
                    {st.phase === 'lobby' && (
                        <button type="button" onClick={onStart} className="mt-8 inline-flex h-14 items-center gap-3 rounded-2xl bg-white px-7 text-[20px] font-semibold text-slate-900 hover:bg-white/90 cursor-pointer">
                            <Play className="h-5 w-5 fill-current" /> Start the exam
                        </button>
                    )}
                </div>
                <div className="w-[380px] shrink-0">
                    <div className="mx-auto w-fit rounded-[28px] bg-white p-4 shadow-2xl">
                        <QrCode value={`https://testoza.com/join/${CODE}`} size={300} />
                    </div>
                    <p className="mt-4 text-center text-[16px] text-white/60">Or scan to join</p>
                    {recent.length > 0 && (
                        <ul className="mt-8 flex flex-wrap justify-center gap-2" aria-label="Recently joined">
                            {recent.map((p) => (
                                <li key={p.c.id} className="ma-chip-in rounded-full bg-white/10 px-3.5 py-1.5 text-[15px] text-white/90 backdrop-blur">
                                    {p.c.name.split(' ')[0]}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── The widget ───────────────────────────────────────────────────────────── */

function useWide() {
    const query = '(min-width: 760px)';
    const [wide, setWide] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
    useEffect(() => {
        const mq = window.matchMedia?.(query);
        if (!mq) return;
        const on = () => setWide(mq.matches);
        on();
        mq.addEventListener('change', on);
        return () => mq.removeEventListener('change', on);
    }, []);
    return wide;
}

/** Fits a fixed-width canvas into its frame; returns the scale. */
function useFit(ref: RefObject<HTMLElement>, width: number) {
    const [scale, setScale] = useState(1);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const fit = () => setScale(Math.min(1, el.clientWidth / width));
        fit();
        if (!('ResizeObserver' in window)) return;
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref, width]);
    return scale;
}

export default function ExamRoomDemo() {
    const wide = useWide();
    const [st, dispatch] = useReducer(reducer, INITIAL);
    const [view, setView] = useState<'room' | 'projector'>('room');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [visible, setVisible] = useState(false);
    const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
    const rootRef = useRef<HTMLElement>(null);
    const frameRef = useRef<HTMLDivElement>(null);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const nextToast = useRef(1);
    const roomScale = useFit(frameRef, ROOM_WIDTH);
    const projectorScale = useFit(frameRef, 1280);

    // The clock runs only while the room is on screen.
    useEffect(() => {
        const el = rootRef.current;
        if (!el || !('IntersectionObserver' in window)) {
            setVisible(true);
            return;
        }
        const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        if (!visible || st.phase === 'ended') return;
        const id = window.setInterval(() => dispatch({ type: 'tick' }), TICK_MS);
        return () => window.clearInterval(id);
    }, [visible, st.phase]);

    const toast = useCallback((text: string) => {
        const id = nextToast.current++;
        setToasts((list) => [...list.slice(-2), { id, text }]);
        window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3400);
    }, []);

    const list = useMemo(() => people(st), [st]);
    const writing = list.filter((p) => p.status === 'writing').length;
    const submitted = list.filter((p) => p.status === 'submitted').length;

    // When the exam ends with results in, the room opens on them (as in the product).
    useEffect(() => {
        if (st.phase === 'ended' && submitted > 0) dispatch({ type: 'tab', tab: 'results' });
    }, [st.phase, submitted]);

    // A new tab starts at the top of the page.
    useEffect(() => {
        scrollerRef.current?.scrollTo({ top: 0 });
    }, [st.tab]);

    const lobbyFull = st.phase === 'lobby' && list.length >= LOBBY_SIZE;
    const hint: 'start' | 'end' | null = lobbyFull && st.lobbyMs > (LOBBY_SIZE + 6) * JOIN_GAP ? 'start' : st.phase === 'live' && writing === 0 && submitted > 0 ? 'end' : null;

    let tip: string;
    if (st.phase === 'lobby') tip = lobbyFull ? 'Everyone who’s coming is in. Tap Start exam now.' : 'Candidates are joining with the code. Their names appear as they check in.';
    else if (st.phase === 'live')
        tip =
            writing === 0 && submitted > 0
                ? 'Everyone has submitted. End the exam to see the rank list.'
                : st.t < 480
                  ? 'Try More time, or a candidate’s ⋯ menu. Watch Kabir at the 8-minute mark.'
                  : st.t < 840
                    ? 'Kabir’s phone lost signal. His answers are safe on the phone.'
                    : 'Kabir rejoined on another phone. Submissions start around 30 minutes.';
    else tip = 'Results are in. Scroll the rank list, or switch to the projector.';

    const reset = () => {
        dispatch({ type: 'reset' });
        setView('room');
        setToasts([]);
    };

    const page = (
        <>
            <div className="ma-room-scroller bg-slate-50" ref={scrollerRef}>
                <RoomPage d={wide} st={st} list={list} dispatch={dispatch} toast={toast} onProjector={() => setView('projector')} hint={hint} overlay={overlay} />
            </div>
            <div className="ma-room-overlay" ref={setOverlay} />
        </>
    );

    return (
        <figure className="ma-widget ma-wide ma-room" id="exam-room" ref={rootRef}>
            <div className="ma-demo-bar">
                <div>
                    <p className="ma-demo-title">You’re the teacher</p>
                    <p className="ma-demo-tip" aria-live="polite">
                        <span key={tip}>{tip}</span>
                    </p>
                </div>
                <div className="ma-demo-controls">
                    <div className="ma-seg" role="group" aria-label="View" style={{ ['--n' as string]: 2, ['--i' as string]: view === 'room' ? 0 : 1 }}>
                        <button type="button" aria-pressed={view === 'room'} onClick={() => setView('room')}>
                            Exam room
                        </button>
                        <button type="button" aria-pressed={view === 'projector'} onClick={() => setView('projector')}>
                            Projector
                        </button>
                    </div>
                    <button type="button" className="ma-restart" onClick={reset}>
                        <RotateCcw aria-hidden="true" /> Restart
                    </button>
                </div>
            </div>

            <div className={`ma-window${wide ? '' : ' ma-window--phone'}`}>
                <div className="ma-window-bar">
                    <div className="ma-window-lights" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                    </div>
                    <div className="ma-window-url">
                        <Lock aria-hidden="true" /> {view === 'room' ? 'app.testoza.com/exams' : 'app.testoza.com/exams/present'}
                    </div>
                </div>
                <div className="ma-window-body" ref={frameRef}>
                    {view === 'room' ? (
                        wide ? (
                            <div className="ma-fit" style={{ height: ROOM_HEIGHT * roomScale }}>
                                <div className="ma-screen ma-room-canvas" style={{ width: ROOM_WIDTH, height: ROOM_HEIGHT, transform: `scale(${roomScale})` }}>
                                    {page}
                                </div>
                            </div>
                        ) : (
                            <div className="ma-screen ma-room-canvas ma-room-canvas--phone">{page}</div>
                        )
                    ) : (
                        <div className="ma-fit" style={{ height: 720 * projectorScale }}>
                            <div className="ma-screen ma-projector-canvas" style={{ transform: `scale(${projectorScale})` }}>
                                <Projector st={st} list={list} onStart={() => (dispatch({ type: 'start' }), toast('The exam has started. Candidates can begin.'))} />
                            </div>
                        </div>
                    )}
                    <div className="ma-toasts" aria-live="polite">
                        {toasts.map((t) => (
                            <div key={t.id} className="ma-toast">
                                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                                </svg>
                                {t.text}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <figcaption>
                A copy of TestoZa’s exam room with an example batch of 32. Exam time runs 60× faster; the buttons work, and nothing is sent anywhere.
            </figcaption>
        </figure>
    );
}
