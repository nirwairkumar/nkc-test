/**
 * The teacher's exam room, replicated from pages/exams/ExamSessionPage.tsx with
 * components/exams/MonitorPanel.tsx and ResultsPanel.tsx. The exam-day demo plays it
 * (desktop or phone layout); the hero shows it on a phone, scripted, with `pressed`
 * marking the control a finger is on.
 *
 * Menus and dialogs open inside the replica: dialogs go into `overlay`, a layer above
 * the scrolling page (the product's portal).
 */
import { useCallback, useMemo, useState, type Ref } from 'react';
import { createPortal } from 'react-dom';
import {
    AlertTriangle,
    ChevronLeft,
    ClipboardCopy,
    Clock,
    Copy,
    Download,
    FileText,
    GraduationCap,
    KeyRound,
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
import { EXAM, spacedCode } from '@/guides/conductData';
import { CARD, MENU_ITEM, MENU_TRIGGER, PILL_BTN, PRIMARY_BTN, Avatar, Chip, Flag, Menu, PhaseBadge, Segmented } from './replica';
import { MAX, ROSTER, at, closesAt, fmt, needsAttention, rankList, type Person, type SimAction, type SimState, type Tab } from './examSim';

type Filter = 'all' | 'writing' | 'submitted' | 'attention' | 'absent';

/** Controls the hero can show mid-tap. */
export type RoomControl = 'start' | 'tab-results' | 'end' | null;

export interface RoomProps {
    /** Desktop layout (the product's sm: and lg: variants). */
    d: boolean;
    st: SimState;
    list: Person[];
    dispatch?: (a: SimAction) => void;
    toast?: (text: string, tone?: 'success' | 'info' | 'error') => void;
    onProjector?: () => void;
    /** The control the reader should try next. */
    hint?: 'start' | 'end' | null;
    overlay?: HTMLElement | null;
    pressed?: RoomControl;
    /** False for the scripted hero: nothing is focusable. */
    interactive?: boolean;
    actionsRef?: Ref<HTMLDivElement>;
    tabsRef?: Ref<HTMLDivElement>;
}

export default function RoomPage({ d, st, list, dispatch, toast, onProjector, hint, overlay, pressed = null, interactive = true, actionsRef, tabsRef }: RoomProps) {
    const [filter, setFilter] = useState<Filter>('all');
    const [menu, setMenu] = useState<string | null>(null);
    const [confirmEnd, setConfirmEnd] = useState(false);
    const [pin, setPin] = useState<{ name: string; roll: string; pin: string } | null>(null);
    const closeMenu = useCallback(() => setMenu(null), []);
    const tab = interactive ? undefined : -1;
    const send = (a: SimAction) => dispatch?.(a);
    const say = (text: string, tone?: 'success' | 'info' | 'error') => toast?.(text, tone);

    const writing = list.filter((p) => p.status === 'writing').length;
    const submitted = list.filter((p) => p.status === 'submitted').length;
    const lobby = list.filter((p) => p.status === 'joined').length;
    const attention = list.filter(needsAttention).length;
    const notJoined = ROSTER.filter((c) => st.removed[c.id] === undefined && !list.some((p) => p.c.id === c.id));
    const closes = closesAt(st);
    const ended = st.phase === 'ended';
    const waiting = st.phase === 'lobby';

    const shown = useMemo(() => {
        const order = { writing: 0, joined: 1, submitted: 2 } as const;
        const sorted = [...list].sort((a, b) => Number(needsAttention(b)) - Number(needsAttention(a)) || order[a.status] - order[b.status] || a.c.name.localeCompare(b.c.name));
        if (filter === 'writing') return sorted.filter((p) => p.status !== 'submitted');
        if (filter === 'submitted') return sorted.filter((p) => p.status === 'submitted');
        if (filter === 'attention') return sorted.filter(needsAttention);
        if (filter === 'absent') return [];
        return sorted;
    }, [list, filter]);

    const newPin = (name: string, roll: string) => setPin({ name, roll, pin: String(1000 + ((roll.charCodeAt(4) * 977 + roll.charCodeAt(5) * 131) % 9000)) });

    const act = (p: Person, action: 'extra' | 'force' | 'remove' | 'retake', minutes?: number) => {
        setMenu(null);
        if (action === 'extra' && minutes) {
            send({ type: 'extra', id: p.c.id, minutes });
            say(`${p.c.name} got ${minutes} more minutes.`);
        } else if (action === 'force') {
            send({ type: 'force', id: p.c.id });
            say(`${p.c.name}'s exam will submit within 20 seconds.`);
        } else if (action === 'remove') {
            send({ type: 'remove', id: p.c.id });
            say(`${p.c.name} was removed.`);
        } else {
            say(`${p.c.name} can take it again.`);
        }
    };

    const px = d ? 'px-5' : 'px-4';

    return (
        <div className={d ? 'mx-auto w-full max-w-5xl space-y-6 px-6 pb-16 pt-6' : 'mx-auto w-full max-w-5xl space-y-6 px-4 pb-16 pt-4'}>
            <div className="flex items-center justify-between gap-3">
                <button
                    type="button"
                    tabIndex={tab}
                    onClick={() => say('This copy has one exam. In the app, Exams lists them all.', 'info')}
                    className="-ml-2 inline-flex h-9 items-center rounded-full pr-3 text-[15px] font-medium text-sky-700 hover:bg-sky-50 cursor-pointer"
                >
                    <ChevronLeft className="h-5 w-5" /> Exams
                </button>
                <div className="relative">
                    <button type="button" tabIndex={tab} aria-label="More actions" aria-expanded={menu === 'page'} className={MENU_TRIGGER} onClick={() => setMenu(menu === 'page' ? null : 'page')}>
                        <MoreHorizontal className="h-[18px] w-[18px]" />
                    </button>
                    <Menu open={menu === 'page'} onClose={closeMenu} width="w-60">
                        <button type="button" className={MENU_ITEM} onClick={() => (setMenu(null), onProjector?.())}>
                            <MonitorPlay className="mr-2.5 h-4 w-4 text-slate-500" /> Show on projector
                        </button>
                        <button type="button" className={MENU_ITEM} onClick={() => (setMenu(null), say('Report cards open as printable A4 pages in the app.', 'info'))}>
                            <FileText className="mr-2.5 h-4 w-4 text-slate-500" /> Report cards
                        </button>
                        <button type="button" className={MENU_ITEM} onClick={() => (setMenu(null), say('In the app this sets up a re-test sitting for the absentees.', 'info'))}>
                            <RotateCcw className="mr-2.5 h-4 w-4 text-slate-500" /> Re-test for absentees
                        </button>
                        <button type="button" className={MENU_ITEM} onClick={() => (setMenu(null), say('The batch page holds the list and makes PINs.', 'info'))}>
                            <GraduationCap className="mr-2.5 h-4 w-4 text-slate-500" /> Batch and PINs
                        </button>
                    </Menu>
                </div>
            </div>

            <header>
                <div className="flex flex-wrap items-center gap-2">
                    <PhaseBadge phase={st.phase} />
                </div>
                <p className={`mt-2 font-bold leading-tight tracking-[-0.025em] text-slate-900 ${d ? 'text-[32px]' : 'text-[26px]'}`}>{EXAM.sitting}</p>
                <p className="mt-1.5 text-[15px] text-slate-600">
                    {EXAM.paper} · {EXAM.batch} · Today, 10:00 am to {at(closes)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[13px] text-slate-600">
                    <Chip icon={ShieldCheck}>{IDENTITY_LABEL.roll_pin}</Chip>
                    <Chip icon={Clock}>
                        {EXAM.minutes} min · late entry {EXAM.lateEntry} min
                    </Chip>
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
                            <p className={`mt-1 font-bold leading-none tracking-[0.06em] text-slate-900 tabular-nums ${d ? 'text-[64px]' : 'text-[56px]'}`}>{spacedCode()}</p>
                            <div className="mt-5 flex flex-wrap gap-2">
                                <button type="button" tabIndex={tab} className={PILL_BTN} onClick={() => say('Code copied')}>
                                    <Copy className="h-4 w-4 text-sky-600" /> Code
                                </button>
                                <button type="button" tabIndex={tab} className={PILL_BTN} onClick={() => say('Message copied')}>
                                    <Copy className="h-4 w-4 text-sky-600" /> Message
                                </button>
                                <button
                                    type="button"
                                    tabIndex={tab}
                                    onClick={() => say('In the app this opens WhatsApp with the invitation filled in.', 'info')}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 text-[13px] font-semibold text-white hover:brightness-95 cursor-pointer"
                                >
                                    WhatsApp
                                </button>
                                <button type="button" tabIndex={tab} className={PILL_BTN} onClick={() => onProjector?.()}>
                                    <MonitorPlay className="h-4 w-4 text-sky-600" /> Projector
                                </button>
                            </div>
                        </div>
                        <div className="shrink-0 self-center rounded-2xl bg-white p-2 ring-1 ring-slate-900/[0.06]">
                            <QrCode value={`https://testoza.com/join/${EXAM.code}`} size={132} />
                        </div>
                    </div>
                </section>
            )}

            <div ref={actionsRef}>
                {ended ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" tabIndex={tab} className={`${PILL_BTN} h-11 px-4`} onClick={() => say('Report cards open as printable A4 pages in the app.', 'info')}>
                            <FileText className="h-4 w-4 text-sky-600" /> Report cards
                        </button>
                        <button type="button" tabIndex={tab} className={`${PILL_BTN} h-11 px-4`} onClick={() => say('In the app this sets up a re-test sitting for the absentees.', 'info')}>
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
                                        <p className="text-[14px] text-slate-600">
                                            <span key={lobby} className="co-count">
                                                {lobby} of {EXAM.roster}
                                            </span>{' '}
                                            in the lobby · starts when you tap Start
                                        </p>
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
                                <button
                                    type="button"
                                    tabIndex={tab}
                                    className={`${PRIMARY_BTN} h-11 px-5${hint === 'start' ? ' co-nudge' : ''}${pressed === 'start' ? ' is-pressed' : ''}`}
                                    onClick={() => (send({ type: 'start' }), say('The exam has started. Candidates can begin.'))}
                                >
                                    <Play className="h-4 w-4 fill-current" /> Start exam now
                                </button>
                            )}
                            {!waiting && (
                                <div className="relative">
                                    <button type="button" tabIndex={tab} className={`${PILL_BTN} h-11 px-4`} aria-expanded={menu === 'more'} onClick={() => setMenu(menu === 'more' ? null : 'more')}>
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
                                                    send({ type: 'extra', id: null, minutes: m });
                                                    say(`Everyone still writing got ${m} more minutes.`);
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
                                tabIndex={tab}
                                className={`inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold text-red-600 hover:bg-red-50 cursor-pointer${hint === 'end' ? ' co-nudge co-nudge--red' : ''}${pressed === 'end' ? ' is-pressed' : ''}`}
                                onClick={() => setConfirmEnd(true)}
                            >
                                <Square className="h-3.5 w-3.5 fill-current" /> End exam
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="max-w-md" ref={tabsRef}>
                <Segmented<Tab | 'settings'>
                    value={st.tab}
                    tab={tab}
                    pressed={pressed === 'tab-results' ? 'results' : null}
                    onChange={(v) => (v === 'settings' ? say('Settings (times, check-in, results) open in the app.', 'info') : send({ type: 'tab', tab: v }))}
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
                                tab={tab}
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
                                    <li key={p.c.id} className={`flex items-center gap-3 ${px} py-3`}>
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
                                            <button
                                                type="button"
                                                tabIndex={tab}
                                                aria-label={`Actions for ${p.c.name}`}
                                                aria-expanded={menu === p.c.id}
                                                className={MENU_TRIGGER}
                                                onClick={() => setMenu(menu === p.c.id ? null : p.c.id)}
                                            >
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
                                                    <button type="button" className={MENU_ITEM} onClick={() => act(p, 'retake')}>
                                                        Let them take it again
                                                    </button>
                                                )}
                                                <button type="button" className={MENU_ITEM} onClick={() => (setMenu(null), newPin(p.c.name, p.c.roll))}>
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
                                    <li key={c.id} className={`flex items-center gap-3 ${px} py-3`}>
                                        <Avatar name={c.name} muted />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[15px] text-slate-700">{c.name}</p>
                                            <p className="text-[13px] text-slate-500">Roll {c.roll}</p>
                                        </div>
                                        <button
                                            type="button"
                                            tabIndex={tab}
                                            onClick={() => newPin(c.name, c.roll)}
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
                <Results d={d} st={st} list={list} notJoined={notJoined.length} say={say} interactive={interactive} release={() => send({ type: 'release' })} />
            )}

            {confirmEnd &&
                overlay &&
                createPortal(
                    <div className="co-modal">
                        <div className="co-modal-scrim bg-black/80" onClick={() => setConfirmEnd(false)} />
                        <div role="alertdialog" aria-label="End the exam now?" className="co-modal-card grid w-full max-w-[min(400px,calc(100%-32px))] gap-4 rounded-2xl border bg-background p-6 shadow-lg">
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
                                        send({ type: 'end' });
                                        send({ type: 'tab', tab: 'results' });
                                        say('Exam ended. Results are ready.');
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
                    <div className="co-modal">
                        <div className="co-modal-scrim bg-black/80" onClick={() => setPin(null)} />
                        <div
                            role="alertdialog"
                            aria-label={`New PIN for ${pin.name}`}
                            className="co-modal-card grid w-full max-w-[min(360px,calc(100%-32px))] gap-4 rounded-2xl border bg-background p-6 text-center shadow-lg"
                        >
                            <p className="text-lg font-semibold text-slate-900">New PIN for {pin.name}</p>
                            <p className="text-[14px] text-slate-600">Roll {pin.roll}. The old PIN no longer works. Tell the candidate now — it is not shown again.</p>
                            <p className="my-2 text-[48px] font-bold tracking-[0.3em] text-slate-900 tabular-nums">{pin.pin}</p>
                            <button
                                type="button"
                                onClick={() => setPin(null)}
                                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer"
                            >
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

/** ResultsPanel: summary tiles, sharing buttons, the rank list and who is missing. */
function Results({
    d,
    st,
    list,
    notJoined,
    say,
    interactive,
    release,
}: {
    d: boolean;
    st: SimState;
    list: Person[];
    notJoined: number;
    say: (t: string, tone?: 'success' | 'info' | 'error') => void;
    interactive: boolean;
    release: () => void;
}) {
    const tab = interactive ? undefined : -1;
    const ended = st.phase === 'ended';
    const rows = rankList(list);
    const notSubmitted = list.filter((p) => p.status !== 'submitted');
    const absent = ROSTER.filter((c) => st.removed[c.id] === undefined && !list.some((p) => p.c.id === c.id));
    const count = rows.length;
    const avg = count ? Math.round((rows.reduce((s, r) => s + r.p.marks, 0) / count) * 100) / 100 : 0;
    const px = d ? 'px-5' : 'px-4';

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
            {!ended && !st.released && (
                <div className={`flex gap-3 rounded-2xl bg-sky-50 px-4 py-3.5 ring-1 ring-inset ring-sky-600/15 ${d ? 'flex-row items-center justify-between' : 'flex-col'}`}>
                    <p className="text-[14px] text-sky-900">Candidates can&apos;t see their results yet. They appear when the exam ends.</p>
                    <button type="button" tabIndex={tab} onClick={() => (release(), say('Results released. Candidates can see them now.'))} className={`${PRIMARY_BTN} h-9 px-3.5 text-[13px]`}>
                        <Send className="h-4 w-4" /> Release now
                    </button>
                </div>
            )}
            <dl className={d ? 'grid grid-cols-4 gap-2.5' : 'grid grid-cols-2 gap-2.5'}>
                <Tile label="Submitted" value={`${count}${notJoined || notSubmitted.length ? ` of ${count + notJoined + notSubmitted.length}` : ''}`} />
                <Tile label="Average" value={`${fmt(avg)} / ${MAX}`} />
                <Tile label="Highest" value={fmt(rows[0].p.marks)} sub={rows[0].p.c.name} />
                <Tile label="Lowest" value={fmt(rows[rows.length - 1].p.marks)} sub={rows.length > 1 ? rows[rows.length - 1].p.c.name : undefined} />
            </dl>

            <div className="flex flex-wrap gap-2">
                <button type="button" tabIndex={tab} className={PILL_BTN} onClick={() => say('Rank list copied')}>
                    <ClipboardCopy className="h-4 w-4 text-sky-600" /> Copy rank list
                </button>
                <button
                    type="button"
                    tabIndex={tab}
                    onClick={() => say('In the app this opens WhatsApp with the rank list filled in.', 'info')}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366]/10 px-3.5 text-[13px] font-semibold text-[#128C7E] hover:bg-[#25D366]/20 cursor-pointer"
                >
                    Send rank list on WhatsApp
                </button>
                <button type="button" tabIndex={tab} className={PILL_BTN} onClick={() => say(`In the app this downloads ${EXAM.paper} - ${EXAM.sitting}.xlsx.`, 'info')}>
                    <Download className="h-4 w-4 text-sky-600" /> Excel
                </button>
                <button type="button" tabIndex={tab} className={PILL_BTN} onClick={() => say('Report cards open as printable A4 pages in the app.', 'info')}>
                    <FileText className="h-4 w-4 text-sky-600" /> Report cards
                </button>
            </div>

            <ol className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                {rows.map(({ p, rank, time }) => (
                    <li key={p.c.id} className={`flex items-center gap-3 ${px} py-3`}>
                        <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                                rank === 1 ? 'bg-amber-100 text-amber-800' : rank === 2 ? 'bg-slate-200 text-slate-700' : rank === 3 ? 'bg-orange-100 text-orange-800' : 'bg-slate-50 text-slate-500'
                            }`}
                        >
                            {rank}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold text-slate-900">
                                {p.c.name} <span className="font-normal text-slate-500">{p.c.roll}</span>
                            </p>
                            <p className="mt-0.5 flex flex-wrap gap-x-2.5 text-[13px] text-slate-500">
                                <span>
                                    {p.correct} right · {p.wrong} wrong · {p.skipped} skipped
                                </span>
                                <span>{minutesText(time)}</span>
                                {p.violations > 0 && (
                                    <span className="text-amber-700">
                                        {p.violations} warning{p.violations === 1 ? '' : 's'}
                                    </span>
                                )}
                                {p.collected && <span className="text-violet-700">answers filed by you</span>}
                            </p>
                        </div>
                        <div className="shrink-0 text-right">
                            <p className="text-[16px] font-bold tabular-nums text-slate-900">
                                {fmt(p.marks)}
                                <span className="text-[13px] font-normal text-slate-500"> / {MAX}</span>
                            </p>
                            <p className="text-[12px] text-slate-500">{Math.round((p.marks / MAX) * 100)}%</p>
                        </div>
                        {d && p.c.parent && (
                            <button
                                type="button"
                                tabIndex={tab}
                                title="Send to parent on WhatsApp"
                                onClick={() => say(`In the app this opens WhatsApp with ${p.c.name.split(' ')[0]}’s marks and rank for their parent.`, 'info')}
                                className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#25D366]/10 px-3 text-[12px] font-semibold text-[#128C7E] hover:bg-[#25D366]/20 cursor-pointer"
                            >
                                Parent
                            </button>
                        )}
                    </li>
                ))}
            </ol>

            {(absent.length > 0 || notSubmitted.length > 0) && (
                <div>
                    <p className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500">Didn&apos;t submit ({absent.length + notSubmitted.length})</p>
                    <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                        {notSubmitted.map((p) => (
                            <li key={p.c.id} className={`flex items-center justify-between gap-3 ${px} py-3 text-[14px]`}>
                                <span className="text-slate-800">
                                    {p.c.name} <span className="text-slate-500">{p.c.roll}</span>
                                </span>
                                <span className="text-slate-500">{p.status === 'writing' ? 'Started, not submitted' : 'Joined, never started'}</span>
                            </li>
                        ))}
                        {absent.map((c) => (
                            <li key={c.id} className={`flex items-center justify-between gap-3 ${px} py-3 text-[14px]`}>
                                <span className="text-slate-800">
                                    {c.name} <span className="text-slate-500">{c.roll}</span>
                                </span>
                                <span className="flex items-center gap-2 text-slate-500">
                                    Absent
                                    {c.parent && (
                                        <button
                                            type="button"
                                            tabIndex={tab}
                                            onClick={() => say(`In the app this opens WhatsApp to tell ${c.name.split(' ')[0]}’s parent they missed the test.`, 'info')}
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
