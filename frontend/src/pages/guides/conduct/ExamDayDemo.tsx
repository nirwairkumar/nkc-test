/**
 * The exam-day demo on /how-to-conduct-online-exam: both sides of a live exam at once.
 * Left, the teacher's exam room (room.tsx, the product's ExamSessionPage); right,
 * Aditi's phone (joinScreens.tsx and examScreen.tsx, the product's JoinPage and
 * TestPage). One simulation (examSim.ts) drives both, so Start, More time, Submit
 * their exam now, Remove and End exam show up on her phone the way the heartbeat
 * would deliver them. Exam time runs 60× faster; nothing is sent anywhere.
 *
 * Fits the window: the frame is --co-fit-h tall, the room scrolls inside it at its
 * natural size, and the room scrolls itself to what changed (the Start button, the
 * live list, the results). Narrow screens show one side at a time.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { Lock, Maximize2, MonitorPlay, Play } from 'lucide-react';
import QrCode from '@/components/exams/QrCode';
import { clock } from '@/components/exams/examFormat';
import { EXAM, spacedCode } from '@/guides/conductData';
import { DemoFrame, Phone, Toasts, useInView, useToasts, useWidth } from './replica';
import RoomPage from './room';
import { CodeStage, DoneStage, IdentityStage, JoinPageFrame, LobbyStage, ResultView, type ExamInfo } from './joinScreens';
import ExamScreen, { PausedDialog, SubmittingOverlay, type OptionKey } from './examScreen';
import { ADITI, INITIAL, JOIN_GAP, LOBBY_SIZE, MAX, TICK_MS, arrivalMs, at, closesAt, people, rankList, simReducer, type Person, type SimState } from './examSim';

const INFO: ExamInfo = {
    institute: EXAM.institute,
    sitting: EXAM.sitting,
    batch: EXAM.batch,
    title: EXAM.paper,
    minutes: EXAM.minutes,
    questions: EXAM.questions,
    proctoring: true,
};

/* ── Aditi's phone ─────────────────────────────────────────────────────── */

const ROLL = ADITI.roll;
const PIN = '5182';
const OPTIONS: OptionKey[] = ['A', 'B', 'C', 'D'];

function CandidatePhone({ st, list, toasts }: { st: SimState; list: Person[]; toasts: ReturnType<typeof useToasts>['items'] }) {
    const me = list.find((p) => p.c.id === ADITI.id);
    const removed = st.removed[ADITI.id] !== undefined;
    const joinAt = arrivalMs(ADITI.order ?? 0);
    const released = st.phase === 'ended' || st.released;
    const viewRef = useRef<HTMLDivElement>(null);

    let body: ReactNode;
    let overlay: ReactNode = null;
    let examScreen = false;

    if (st.phase === 'lobby' && !me) {
        // Typing the code, then checking in with roll number and PIN.
        const ms = st.lobbyMs;
        const codeEnd = joinAt * 0.45;
        if (ms < codeEnd) {
            const typed = EXAM.code.slice(0, Math.min(6, Math.floor((ms / codeEnd) * 7)));
            body = <CodeStage code={typed} busy={typed.length === 6} />;
        } else {
            const f = (ms - codeEnd) / (joinAt - codeEnd);
            const roll = ROLL.slice(0, Math.min(ROLL.length, Math.floor(f * 2.2 * ROLL.length)));
            const pin = f > 0.5 ? PIN.slice(0, Math.min(4, Math.floor((f - 0.5) * 2.4 * 4))) : '';
            body = <IdentityStage info={INFO} roll={roll} pin={pin} focus={f < 0.5 ? 'roll' : 'pin'} busy={f > 0.92} />;
        }
    } else if (removed || !me) {
        body = <ExamScreen index={0} seconds={EXAM.minutes * 60} warnings={0} />;
        overlay = <PausedDialog message="Your teacher removed you from this exam." />;
        examScreen = true;
    } else if (me.status === 'joined') {
        const joined = list.length;
        body = <LobbyStage name={ADITI.name} title={EXAM.paper} minutes={EXAM.minutes} live={st.phase === 'live'} joined={joined} expected={EXAM.roster} proctoring />;
    } else if (me.status === 'writing') {
        const into = st.t - me.start;
        const index = Math.min(EXAM.questions - 1, me.answered);
        const phase = (into % ADITI.pace) / ADITI.pace;
        const selected = phase > 0.55 ? OPTIONS[(index * 3 + 1) % 4] : null;
        body = <ExamScreen index={index} selected={selected} seconds={me.deadline - st.t} warnings={0} />;
        if (me.forcing) overlay = <SubmittingOverlay />;
        examScreen = true;
    } else {
        // Submitted: the overlay for a moment, then the submitted screen, then the result.
        const since = st.t - (me.submitAt ?? 0);
        if (st.phase !== 'ended' && since < 45) {
            body = <ExamScreen index={Math.min(EXAM.questions - 1, me.answered)} seconds={Math.max(0, me.deadline - (me.submitAt ?? 0))} warnings={0} />;
            overlay = <SubmittingOverlay />;
            examScreen = true;
        } else if (!released) {
            body = <DoneStage name={ADITI.name} submittedAt={at(me.submitAt ?? 0)} releaseAt={at(closesAt(st))} />;
        } else {
            const rows = rankList(list);
            const mine = rows.find((r) => r.p.c.id === ADITI.id);
            const average = rows.length ? Math.round((rows.reduce((s, r) => s + r.p.marks, 0) / rows.length) * 10) / 10 : 0;
            body = (
                <ResultView
                    result={{
                        exam: EXAM.sitting,
                        title: EXAM.paper,
                        score: me.marks,
                        max: MAX,
                        rank: mine?.rank ?? rows.length,
                        of: rows.length,
                        correct: me.correct,
                        wrong: me.wrong,
                        skipped: me.skipped,
                        average,
                        highest: rows[0]?.p.marks ?? me.marks,
                        sections: [],
                        strong: ['Ohm’s law', 'Kirchhoff’s laws'],
                        weak: ['Potentiometer'],
                    }}
                />
            );
        }
    }

    // A new screen starts at the top.
    const screenKey = examScreen ? 'exam' : st.phase === 'lobby' && !me ? (st.lobbyMs < joinAt * 0.45 ? 'code' : 'identity') : me?.status === 'submitted' ? (released ? 'result' : 'done') : 'lobby';
    useEffect(() => {
        viewRef.current?.scrollTo({ top: 0 });
    }, [screenKey]);

    const time = st.phase === 'lobby' ? '9:58' : at(st.t).replace(/ (am|pm)$/, '');
    return (
        <Phone
            label="Aditi’s phone"
            time={time}
            overlay={
                <>
                    {overlay}
                    <Toasts items={toasts} compact />
                </>
            }
        >
            {examScreen ? (
                <div className="h-full">{body}</div>
            ) : (
                <div ref={viewRef} className="co-phone-scroll">
                    <JoinPageFrame>
                        <div key={screenKey} className="co-stage-in">
                            {body}
                        </div>
                    </JoinPageFrame>
                </div>
            )}
        </Phone>
    );
}

/* ── The projector view (pages/exams/ExamPresentPage.tsx at 1280 px) ───── */

function Projector({ st, list, onStart, width }: { st: SimState; list: Person[]; onStart: () => void; width: number }) {
    const scale = Math.min(1, width / 1280);
    const live = st.phase === 'live';
    const recent = [...list].sort((a, b) => b.joinedAt - a.joinedAt || (b.c.order ?? 0) - (a.c.order ?? 0)).slice(0, 18);
    return (
        <div className="co-fit" style={{ height: 720 * scale }}>
            <div className="co-screen co-projector-canvas" style={{ transform: `scale(${scale})` }}>
                <div className="relative h-[720px] w-[1280px] overflow-hidden bg-slate-950 text-white">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_15%_-10%,rgba(14,165,233,0.35),transparent),radial-gradient(800px_500px_at_110%_120%,rgba(16,185,129,0.22),transparent)]"
                    />
                    <span className="absolute right-5 top-5 z-10 inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-[14px] font-medium text-white/80 backdrop-blur">
                        <Maximize2 className="h-4 w-4" /> Full screen
                    </span>
                    <div className="relative mx-auto flex h-full max-w-[1400px] flex-row items-center justify-center gap-16 px-16 py-12">
                        <div className="min-w-0 flex-1">
                            <p className="text-[20.5px] font-medium text-white/70">{EXAM.institute}</p>
                            <p className="mt-2 text-[43.5px] font-bold leading-tight tracking-[-0.02em]">{EXAM.paper}</p>
                            <p className="mt-10 text-[24.3px] text-white/75">
                                Go to <span className="font-semibold text-white">testoza.com/join</span> and enter
                            </p>
                            <p className="mt-2 text-[166.4px] font-bold leading-none tracking-[0.08em] tabular-nums">{spacedCode()}</p>
                            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-[23px]">
                                <span>
                                    <span className="font-bold tabular-nums">{list.length}</span>
                                    <span className="text-white/60"> of {EXAM.roster}</span> joined
                                </span>
                                {live ? (
                                    <span className="inline-flex items-center gap-3 text-emerald-300">
                                        <span className="h-3 w-3 rounded-full bg-emerald-400 motion-safe:animate-pulse" /> Exam is on · closes in {clock(closesAt(st) - st.t)}
                                    </span>
                                ) : st.phase === 'ended' ? (
                                    <span className="text-white/70">The exam has ended</span>
                                ) : (
                                    <span className="text-sky-300">Starting soon</span>
                                )}
                            </div>
                            {st.phase === 'lobby' && (
                                <button
                                    type="button"
                                    onClick={onStart}
                                    className="mt-8 inline-flex h-14 items-center gap-3 rounded-2xl bg-white px-7 text-[20px] font-semibold text-slate-900 hover:bg-white/90 cursor-pointer"
                                >
                                    <Play className="h-5 w-5 fill-current" /> Start the exam
                                </button>
                            )}
                        </div>
                        <div className="w-[380px] shrink-0">
                            <div className="mx-auto w-fit rounded-[28px] bg-white p-4 shadow-2xl">
                                <QrCode value={`https://testoza.com/join/${EXAM.code}`} size={300} />
                            </div>
                            <p className="mt-4 text-center text-[16px] text-white/60">Or scan to join</p>
                            {recent.length > 0 && (
                                <ul className="mt-8 flex flex-wrap justify-center gap-2" aria-label="Recently joined">
                                    {recent.map((p) => (
                                        <li key={p.c.id} className="co-chip-in rounded-full bg-white/10 px-3.5 py-1.5 text-[15px] text-white/90 backdrop-blur">
                                            {p.c.name.split(' ')[0]}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── The widget ────────────────────────────────────────────────────────── */

export default function ExamDayDemo() {
    const [st, dispatch] = useReducer(simReducer, INITIAL);
    const [side, setSide] = useState<'teacher' | 'phone'>('teacher');
    const [projector, setProjector] = useState(false);
    const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
    const [phoneNews, setPhoneNews] = useState(false);
    const rootRef = useRef<HTMLElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const windowRef = useRef<HTMLDivElement>(null);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);
    const tabsRef = useRef<HTMLDivElement>(null);
    const room = useToasts();
    const phone = useToasts(3800);
    const visible = useInView(rootRef, 0.1);
    const bodyWidth = useWidth(bodyRef);
    const windowWidth = useWidth(windowRef);
    const duo = bodyWidth >= 900;
    const d = windowWidth >= 640;

    // The clock runs only while the demo is on screen.
    useEffect(() => {
        if (!visible || st.phase === 'ended') return;
        const id = window.setInterval(() => dispatch({ type: 'tick' }), TICK_MS);
        return () => window.clearInterval(id);
    }, [visible, st.phase]);

    const list = useMemo(() => people(st), [st]);
    const writing = list.filter((p) => p.status === 'writing').length;
    const submitted = list.filter((p) => p.status === 'submitted').length;
    const me = list.find((p) => p.c.id === ADITI.id);

    // What reaches Aditi's phone, a moment later (the product's 20-second heartbeat).
    const seen = useRef({ extra: 0, forcing: false, phase: st.phase, removed: false });
    const pushPhone = phone.push;
    const notifyPhone = useCallback(
        (text: string, tone: 'success' | 'info') => {
            window.setTimeout(() => pushPhone(text, tone), 700);
            if (!duo) setPhoneNews(true);
        },
        [pushPhone, duo],
    );
    useEffect(() => {
        const s = seen.current;
        const extra = me?.extra ?? 0;
        if (me && extra > s.extra && me.status !== 'submitted') notifyPhone(`Your teacher gave you ${extra - s.extra} more minute${extra - s.extra === 1 ? '' : 's'}.`, 'success');
        if (me?.forcing && !s.forcing) notifyPhone('Your teacher asked everyone to submit. Submitting your answers…', 'info');
        if (st.phase === 'ended' && s.phase === 'live' && me?.collected) notifyPhone('Your teacher ended the exam. Submitting your answers…', 'info');
        if (st.removed[ADITI.id] !== undefined && !s.removed && !duo) setPhoneNews(true);
        seen.current = { extra, forcing: !!me?.forcing, phase: st.phase, removed: st.removed[ADITI.id] !== undefined };
    }, [me, st.phase, st.removed, notifyPhone, duo]);

    // When the exam ends with results in, the room opens on them (as the product does).
    useEffect(() => {
        if (st.phase === 'ended' && submitted > 0) dispatch({ type: 'tab', tab: 'results' });
    }, [st.phase, submitted]);

    const lobbyFull = st.phase === 'lobby' && list.length >= LOBBY_SIZE;
    const hint: 'start' | 'end' | null = lobbyFull && st.lobbyMs > (LOBBY_SIZE + 5) * JOIN_GAP ? 'start' : st.phase === 'live' && writing === 0 && submitted > 0 ? 'end' : null;

    // Keep what changed in view inside the room: the Start button, the live list, the results.
    const reveal = useCallback((el: HTMLElement | null, always = false) => {
        const sc = scrollerRef.current;
        if (!sc || !el) return;
        const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 12;
        const bottom = top + el.offsetHeight + 24;
        if (always || top < sc.scrollTop || bottom > sc.scrollTop + sc.clientHeight) {
            sc.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        }
    }, []);
    useEffect(() => {
        if (hint === 'start') reveal(actionsRef.current);
    }, [hint, reveal]);
    useEffect(() => {
        if (st.phase === 'live') reveal(actionsRef.current, true);
    }, [st.phase, reveal]);
    useEffect(() => {
        if (st.phase === 'ended' || st.tab === 'results') reveal(tabsRef.current, true);
    }, [st.phase, st.tab, reveal]);

    let tip: string;
    if (st.phase === 'lobby') tip = lobbyFull ? 'Everyone who’s coming is in. Tap Start exam now.' : 'Candidates are joining with the code. Aditi is checking in with her roll number and PIN.';
    else if (st.phase === 'live') {
        if (writing === 0 && submitted > 0) tip = 'Everyone has submitted. End the exam to see the rank list.';
        else if (submitted > 0) tip = 'Papers are coming in. End the exam when you’re ready: it files everyone’s saved answers.';
        else if (st.t < 240) tip = 'Try More time and watch Aditi’s timer, or open a candidate’s ⋯ menu.';
        else if (st.t < 360) tip = 'Meera switched apps, so she has a warning. Rohan’s signal drops at minute 6.';
        else if (st.t < 600) tip = 'Rohan has no signal. His answers are safe on his phone.';
        else tip = 'Rohan rejoined on another phone. Papers start coming in around minute 18.';
    } else tip = me?.status === 'submitted' ? 'Results are in, and Aditi’s phone shows hers.' : 'The exam has ended. The rank list is ready.';

    const restart = () => {
        dispatch({ type: 'reset' });
        setProjector(false);
        room.clear();
        phone.clear();
        setPhoneNews(false);
        seen.current = { extra: 0, forcing: false, phase: 'lobby', removed: false };
        scrollerRef.current?.scrollTo({ top: 0 });
    };

    const start = () => {
        dispatch({ type: 'start' });
        room.push('The exam has started. Candidates can begin.');
    };

    const teacher = (
        <div className="co-window co-room" ref={windowRef}>
            <div className="co-window-bar">
                <div className="co-window-lights" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                </div>
                <div className="co-window-url">
                    <Lock aria-hidden="true" /> {projector ? 'app.testoza.com/exams/present' : 'app.testoza.com/exams'}
                </div>
                {projector && (
                    <button type="button" className="co-window-back" onClick={() => setProjector(false)}>
                        Back to the room
                    </button>
                )}
            </div>
            <div className="co-window-body">
                {projector ? (
                    <div className="co-projector-wrap">
                        <Projector st={st} list={list} onStart={start} width={windowWidth} />
                        <p className="co-projector-note">
                            <MonitorPlay aria-hidden="true" /> What the class sees on the wall. Nothing on it is private.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="co-room-scroller co-screen bg-slate-50" ref={scrollerRef}>
                            <RoomPage d={d} st={st} list={list} dispatch={dispatch} toast={room.push} onProjector={() => setProjector(true)} hint={hint} overlay={overlay} actionsRef={actionsRef} tabsRef={tabsRef} />
                        </div>
                        <div className="co-room-overlay co-screen" ref={setOverlay} />
                    </>
                )}
                <Toasts items={room.items} />
            </div>
        </div>
    );

    return (
        <DemoFrame
            id="exam-room"
            frameRef={rootRef}
            wide="xl"
            title="You’re the teacher"
            tip={<span key={tip}>{tip}</span>}
            onRestart={restart}
            controls={
                !duo && (
                    <div className="co-seg co-seg--side" role="group" aria-label="Show" style={{ ['--n' as string]: 2, ['--i' as string]: side === 'teacher' ? 0 : 1 }}>
                        <button type="button" aria-pressed={side === 'teacher'} onClick={() => setSide('teacher')}>
                            Exam room
                        </button>
                        <button
                            type="button"
                            aria-pressed={side === 'phone'}
                            onClick={() => {
                                setSide('phone');
                                setPhoneNews(false);
                            }}
                        >
                            Aditi’s phone{phoneNews && side !== 'phone' && <i className="co-badge" aria-label="(new)" />}
                        </button>
                    </div>
                )
            }
            caption={`A copy of TestoZa’s exam room and a candidate’s phone, with an example batch of ${EXAM.roster}. Exam time runs 60× faster; the buttons work, and nothing is sent anywhere.`}
        >
            <div ref={bodyRef} className={`co-duo${duo ? '' : ' is-single'}`}>
                {(duo || side === 'teacher') && teacher}
                {(duo || side === 'phone') && (
                    <div className="co-duo-phone">
                        <CandidatePhone st={st} list={list} toasts={phone.items} />
                        {duo && <p className="co-duo-label">Aditi Rao · {ROLL} · her phone follows on its own</p>}
                    </div>
                )}
            </div>
        </DemoFrame>
    );
}
