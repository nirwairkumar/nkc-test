/**
 * Hero for /how-to-conduct-online-exam: a teacher runs a whole exam from an iPhone.
 * Exams → New exam (paper, Now, batch 12-A, roll number + PIN, "I tap Start") → the
 * code 731 506 → the lobby fills → Start → the live list (Rohan without signal, Meera
 * with a warning) → the rank list. Every screen is a replica in this folder: sheet.tsx
 * (NewExamSheet over ExamsPage) and room.tsx (ExamSessionPage), in the product's phone
 * layout, driven by the same simulation as the exam-day demo, so the numbers match.
 *
 * Size: the phone is drawn at 393 × 852 points, scaled to the stage, and the stage
 * never makes the first screen scroll (see .co-stage). Plays only while visible;
 * reduced motion shows a still lobby.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Lock, RotateCw } from 'lucide-react';
import { EXAM } from '@/guides/conductData';
import { StatusIcons, useInert } from './replica';
import RoomPage, { type RoomControl } from './room';
import { ExamsBehind, ReadyView, SheetFooter, SheetForm, SheetHeader, localDate, localTime, nextHalfHour, sheetDerived, type SheetControl, type SheetValues } from './sheet';
import { INITIAL, LOBBY_SIZE, arrivalMs, finishedState, liveState, people, type SimState } from './examSim';

type Screen = 'exams' | 'sheet' | 'ready' | 'room';

interface Step {
    screen: Screen;
    ms: number;
    scene: 0 | 1 | 2 | 3;
    v?: Partial<SheetValues>;
    saving?: boolean;
    sheetScroll?: 'top' | 'more' | 'checkin';
    pressed?: SheetControl | RoomControl | 'new';
    st?: SimState;
    hint?: 'start' | null;
    roomScroll?: 'top' | 'code' | 'actions' | 'tabs';
}

const lobby = (joined: number): SimState => ({ ...INITIAL, lobbyMs: arrivalMs(joined - 1) + 10 });

const P: Partial<SheetValues> = { testId: 'phy' };
const N: Partial<SheetValues> = { ...P, when: 'now' };
const M: Partial<SheetValues> = { ...N, showMore: true };
const B: Partial<SheetValues> = { ...M, classId: '12a' };
const L: Partial<SheetValues> = { ...B, lateEntry: EXAM.lateEntry };
const S: Partial<SheetValues> = { ...L, startMode: 'manual' };
const R: Partial<SheetValues> = { ...S, identity: 'roll_pin' };

const SCRIPT: Step[] = [
    { screen: 'exams', scene: 0, ms: 1500 },
    { screen: 'exams', scene: 0, pressed: 'new', ms: 300 },
    { screen: 'sheet', scene: 0, ms: 1000 },
    { screen: 'sheet', scene: 0, pressed: 'paper', ms: 350 },
    { screen: 'sheet', scene: 0, v: P, ms: 900 },
    { screen: 'sheet', scene: 0, v: P, pressed: 'now', ms: 300 },
    { screen: 'sheet', scene: 0, v: N, ms: 800 },
    { screen: 'sheet', scene: 0, v: N, pressed: 'more', ms: 300 },
    { screen: 'sheet', scene: 0, v: M, sheetScroll: 'more', ms: 900 },
    { screen: 'sheet', scene: 0, v: M, sheetScroll: 'more', pressed: 'batch', ms: 300 },
    { screen: 'sheet', scene: 0, v: B, sheetScroll: 'more', ms: 700 },
    { screen: 'sheet', scene: 0, v: B, sheetScroll: 'more', pressed: 'late', ms: 300 },
    { screen: 'sheet', scene: 0, v: L, sheetScroll: 'more', ms: 600 },
    { screen: 'sheet', scene: 0, v: L, sheetScroll: 'more', pressed: 'manual', ms: 300 },
    { screen: 'sheet', scene: 0, v: S, sheetScroll: 'checkin', ms: 900 },
    { screen: 'sheet', scene: 0, v: S, sheetScroll: 'checkin', pressed: 'roll_pin', ms: 300 },
    { screen: 'sheet', scene: 0, v: R, sheetScroll: 'checkin', ms: 1000 },
    { screen: 'sheet', scene: 0, v: R, sheetScroll: 'checkin', pressed: 'create', ms: 300 },
    { screen: 'sheet', scene: 0, v: R, sheetScroll: 'checkin', saving: true, ms: 800 },
    { screen: 'ready', scene: 1, v: R, ms: 2600 },
    { screen: 'ready', scene: 1, v: R, pressed: 'open-room', ms: 300 },
    { screen: 'room', scene: 2, st: lobby(12), roomScroll: 'top', ms: 1100 },
    { screen: 'room', scene: 2, st: lobby(16), roomScroll: 'code', ms: 700 },
    { screen: 'room', scene: 2, st: lobby(19), roomScroll: 'code', ms: 700 },
    { screen: 'room', scene: 2, st: lobby(LOBBY_SIZE), roomScroll: 'actions', hint: 'start', ms: 1400 },
    { screen: 'room', scene: 2, st: lobby(LOBBY_SIZE), roomScroll: 'actions', hint: 'start', pressed: 'start', ms: 300 },
    { screen: 'room', scene: 2, st: liveState(0), roomScroll: 'actions', ms: 1000 },
    { screen: 'room', scene: 2, st: liveState(250), roomScroll: 'tabs', ms: 1300 },
    { screen: 'room', scene: 2, st: liveState(480), roomScroll: 'tabs', ms: 2400 },
    { screen: 'room', scene: 3, st: liveState(1500), roomScroll: 'tabs', ms: 1800 },
    { screen: 'room', scene: 3, st: finishedState(), roomScroll: 'tabs', ms: 3400 },
];

/** Reduced motion: the lobby, full, a moment before the start. */
const STILL_STEP = SCRIPT.findIndex((s) => s.hint === 'start');

const CAPTIONS = [
    ['Pick a paper and a time', 'More options hold the batch, check-in and results'],
    ['Get a six-digit code', 'Candidates type it at testoza.com/join'],
    ['Start when the room is ready', 'Then watch who is writing, offline or warned'],
    ['The rank list when it ends', 'Marks, ranks, Excel and WhatsApp for parents'],
] as const;

export default function ConductHero() {
    const rootRef = useRef<HTMLDivElement>(null);
    const screenRef = useRef<HTMLDivElement>(null);
    const deviceRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const sheetBodyRef = useRef<HTMLDivElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);
    const tabsRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.65);
    const [step, setStep] = useState(0);
    const [running, setRunning] = useState(false);
    const start = useMemo(nextHalfHour, []);
    useInert(deviceRef, true);

    // Play only while visible; reduced motion gets a still frame.
    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
            setStep(STILL_STEP);
            return;
        }
        const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.25 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    // The web view is drawn at 393 × 852 points and scaled to the screen.
    useEffect(() => {
        const el = screenRef.current;
        if (!el) return;
        const fit = () => setScale(el.clientWidth / 393);
        fit();
        if (!('ResizeObserver' in window)) return;
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!running) return;
        const id = window.setTimeout(() => setStep((s) => (s + 1) % SCRIPT.length), SCRIPT[step].ms);
        return () => window.clearTimeout(id);
    }, [running, step]);

    const frame = SCRIPT[step];
    const v: SheetValues = {
        testId: '',
        classId: '',
        when: 'later',
        date: localDate(start),
        time: localTime(start),
        lateEntry: 15,
        startMode: 'auto',
        identity: 'name',
        walkIn: true,
        release: 'on_end',
        name: '',
        showMore: false,
        ...frame.v,
    };
    const { problems } = sheetDerived(v);
    const st = frame.st ?? INITIAL;
    const list = useMemo(() => people(st), [st]);

    // The sheet scrolls as the teacher moves down it.
    useEffect(() => {
        const sc = sheetBodyRef.current;
        if (!sc) return;
        const more = sc.querySelector<HTMLElement>('[data-more]');
        const top = frame.sheetScroll === 'more' && more ? more.offsetTop - 8 : frame.sheetScroll === 'checkin' && more ? more.offsetTop + 250 : 0;
        sc.scrollTo({ top, behavior: top ? 'smooth' : 'auto' });
    }, [frame.sheetScroll, frame.screen]);

    // The room page scrolls to what the step is about.
    useEffect(() => {
        const vp = viewportRef.current;
        if (!vp) return;
        if (frame.screen !== 'room') {
            vp.scrollTo({ top: 0 });
            return;
        }
        const target = frame.roomScroll === 'actions' ? actionsRef.current : frame.roomScroll === 'tabs' ? tabsRef.current : null;
        let top = 0;
        if (target) top = target.getBoundingClientRect().top / scale - vp.getBoundingClientRect().top / scale + vp.scrollTop - 16;
        else if (frame.roomScroll === 'code') top = 120;
        vp.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }, [frame.roomScroll, frame.screen, scale]);

    const created = { title: EXAM.paper, name: `${EXAM.batch} · ${new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`, opensAt: new Date().toISOString(), now: true };
    const sheetOpen = frame.screen === 'sheet' || frame.screen === 'ready';

    return (
        <div className="co-stage-wrap" ref={rootRef}>
            <div
                className="co-stage"
                role="img"
                aria-label={`Animation: a teacher on a phone opens Exams, taps New exam, chooses the paper “${EXAM.paper}”, starts now, picks batch ${EXAM.batch}, five minutes of late entry, “I tap Start” and check-in by roll number and PIN, and gets the join code ${EXAM.code.slice(0, 3)} ${EXAM.code.slice(3)}. The exam room fills to ${LOBBY_SIZE} of ${EXAM.roster} candidates; the teacher taps Start, watches the live list with one candidate out of signal and one with a warning, and ends on the rank list.`}
            >
                <div className="co-iphone" aria-hidden="true" ref={deviceRef}>
                    <i className="co-iphone-key co-iphone-key--action" />
                    <i className="co-iphone-key co-iphone-key--up" />
                    <i className="co-iphone-key co-iphone-key--down" />
                    <i className="co-iphone-key co-iphone-key--power" />
                    <div className="co-iphone-screen" ref={screenRef}>
                        <div className="co-canvas co-screen" style={{ transform: `scale(${scale})` }}>
                            <div className="co-island" />
                            <div className="co-statusbar">
                                <span>9:41</span>
                                <StatusIcons />
                            </div>
                            <div className="co-viewport" ref={viewportRef}>
                                <div className="bg-slate-50">
                                    {frame.screen === 'room' ? (
                                        <div key="room" className="co-stage-in">
                                            <RoomPage d={false} st={st} list={list} interactive={false} hint={frame.hint ?? null} pressed={frame.pressed as RoomControl} actionsRef={actionsRef} tabsRef={tabsRef} />
                                        </div>
                                    ) : (
                                        <ExamsBehind d={false} created={frame.screen === 'ready' ? created : null} pressed={frame.pressed === 'new'} tab={-1} />
                                    )}
                                </div>
                            </div>
                            {sheetOpen && (
                                <div className="co-hero-sheet">
                                    <div className="co-modal-scrim absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />
                                    <div
                                        key={frame.screen === 'ready' ? 'ready' : 'sheet'}
                                        className={`co-sheet co-sheet--bottom co-hero-sheet-card flex w-full flex-col overflow-hidden rounded-t-[22px] bg-[#f2f2f7] shadow-2xl${step === 2 ? ' is-entering' : ''}`}
                                    >
                                        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-300" />
                                        {frame.screen === 'ready' ? (
                                            <>
                                                <SheetHeader
                                                    d={false}
                                                    title="Exam ready"
                                                    leading={<span />}
                                                    trailing={<span className="inline-flex h-9 items-center px-2 text-[17px] font-semibold text-sky-700">Done</span>}
                                                />
                                                <ReadyView created={created} pressed={frame.pressed === 'open-room'} tab={-1} />
                                            </>
                                        ) : (
                                            <>
                                                <SheetHeader
                                                    d={false}
                                                    title="New exam"
                                                    leading={<span className="inline-flex h-9 items-center px-2 text-[17px] text-sky-700">Cancel</span>}
                                                    trailing={<span className={`inline-flex h-9 items-center px-2 text-[17px] font-semibold text-sky-700${problems.length ? ' opacity-40' : ''}`}>Create</span>}
                                                />
                                                <SheetForm v={v} pressed={frame.pressed as SheetControl} tab={-1} bodyRef={sheetBodyRef} />
                                                <SheetFooter problems={problems} saving={!!frame.saving} pressed={frame.pressed === 'create'} tab={-1} />
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="co-safari">
                                <div className="co-safari-bar">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m15 18-6-6 6-6" />
                                    </svg>
                                    <span>
                                        <Lock style={{ width: 12, height: 12 }} /> app.testoza.com
                                    </span>
                                    <RotateCw />
                                </div>
                                <div className="co-safari-home" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="co-stage-caption" aria-hidden="true">
                <p key={frame.scene} className="is-swap">
                    <b>{CAPTIONS[frame.scene][0]}</b>
                    {CAPTIONS[frame.scene][1]}
                </p>
                <div className="co-dots">
                    {CAPTIONS.map((_, i) => (
                        <i key={i} className={i === frame.scene ? 'is-on' : undefined} />
                    ))}
                </div>
            </div>
        </div>
    );
}
