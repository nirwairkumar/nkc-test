import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
    AlertCircle, ArrowRight, BatteryCharging, Check, ChevronLeft, Clock, Eye, FileText, KeyRound, Loader2,
    RefreshCw, ShieldCheck, Smartphone, Trophy, Users,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import TestoZaLogo from '@/components/TestoZaLogo';
import DigitBoxes from '@/components/exams/DigitBoxes';
import { clock, timeOnly, topicSplit, usePoll, useServerClock } from '@/components/exams/examFormat';
import {
    ApiProblem, MeResponse, PublicSession, StudentResult, joinApi, problemOf, seatStore,
} from '@/lib/examSessionsApi';

/**
 * testoza.com/join — how a student gets into an exam session.
 *
 *   code → check in (name / roll / roll + PIN) → lobby → exam (/join/:code/exam) → submitted → result
 *
 * The device token from check-in is kept per code in localStorage, so a refresh or a
 * reopened tab lands back in the right place. Joining again on another phone moves the
 * exam there (answers are saved on the server every 20 s).
 */

type Stage = 'loading' | 'code' | 'identity' | 'lobby' | 'done' | 'problem';

const PRIMARY =
    'inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[17px] font-semibold text-white ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_28px_-14px_rgba(2,132,199,0.9)] transition-[background-color,transform] ' +
    'hover:bg-[hsl(200,95%,30%)] motion-safe:active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none cursor-pointer';
const CARD = 'rounded-[22px] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_32px_-20px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/[0.05]';
const FIELD =
    'h-[52px] w-full rounded-2xl bg-slate-100/80 px-4 text-[17px] text-slate-900 placeholder:text-slate-400 outline-none ring-1 ring-transparent ' +
    'transition focus:bg-white focus:ring-2 focus:ring-sky-500/60';

export default function JoinPage() {
    const { code: routeCode } = useParams<{ code?: string }>();
    const navigate = useNavigate();
    const reduceMotion = useReducedMotion();

    const [stage, setStage] = useState<Stage>(routeCode ? 'loading' : 'code');
    const [code, setCode] = useState(routeCode && /^\d{6}$/.test(routeCode) ? routeCode : '');
    const [codeError, setCodeError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [info, setInfo] = useState<PublicSession | null>(null);
    const [me, setMe] = useState<MeResponse | null>(null);
    const [result, setResult] = useState<StudentResult | null>(null);
    const [problem, setProblem] = useState<{ title: string; message: string; retry?: 'identity' | 'code' } | null>(null);

    /* ── Loading a code / a stored seat ─────────────────────────────────── */

    const lookup = useCallback(async (value: string) => {
        setBusy(true);
        setCodeError(null);
        try {
            const found = await joinApi.lookup(value);
            if (found.kind === 'link') {
                // The code belongs to a live exam link: open it, exactly as if the link had been shared.
                setStage('loading');
                navigate(found.path, { replace: true });
                return;
            }
            setInfo(found);
            setStage('identity');
            if (routeCode !== value) navigate(`/join/${value}`, { replace: true });
        } catch (err) {
            const p = problemOf(err);
            setCodeError(p.message);
            setStage('code');
        } finally {
            setBusy(false);
        }
    }, [navigate, routeCode]);

    const refreshMe = useCallback(async (): Promise<MeResponse | null> => {
        const seat = seatStore.get(code);
        if (!seat) return null;
        try {
            const data = await joinApi.me(seat.token);
            setMe(data);
            setInfo(data.session);
            setStage(data.participant.status === 'submitted' ? 'done' : 'lobby');
            return data;
        } catch (err) {
            const p = problemOf(err);
            if (p.code === 'device_replaced') {
                seatStore.clear(code);
                setProblem({ title: 'Your exam moved to another device', message: p.message, retry: 'identity' });
                setStage('problem');
            } else if (p.code === 'removed') {
                setProblem({ title: 'You were removed from this exam', message: 'Talk to your teacher if you think this is a mistake.' });
                setStage('problem');
            } else if (p.code === 'not_found' || p.code === 'no_token') {
                seatStore.clear(code);
                lookup(code);
            }
            // Network blips: keep showing what we have; the next poll retries.
            return null;
        }
    }, [code, lookup]);

    useEffect(() => {
        if (!code) return;
        if (seatStore.get(code)) refreshMe();
        else lookup(code);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Lobby: every 4 s. After submitting: every 20 s until results are released.
    usePoll(refreshMe, 4000, stage === 'lobby');
    usePoll(refreshMe, 20000, stage === 'done' && !result?.released);

    useEffect(() => {
        if (stage !== 'done' || !me?.results_released || result?.released) return;
        const seat = seatStore.get(code);
        if (seat) joinApi.result(seat.token).then(setResult).catch(() => { });
    }, [stage, me?.results_released, code, result?.released]);

    const leave = () => {
        seatStore.clear(code);
        setMe(null);
        setResult(null);
        setProblem(null);
        lookup(code);
    };

    /* ── Render ─────────────────────────────────────────────────────────── */

    const motionProps = reduceMotion
        ? {}
        : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } };

    return (
        <div className="min-h-[100dvh] bg-[#f2f2f7] bg-[radial-gradient(1200px_420px_at_50%_-120px,rgba(14,165,233,0.14),transparent)]">
            <Helmet>
                <title>Join your exam · TestoZa</title>
                <meta name="robots" content="noindex" />
            </Helmet>
            <div className="mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col px-4 pb-10 pt-5">
                <header className="flex h-10 items-center justify-center">
                    <TestoZaLogo size={30} />
                </header>

                <main className="flex flex-1 flex-col justify-center py-6">
                    <AnimatePresence mode="wait">
                        <motion.div key={stage} {...motionProps}>
                            {stage === 'loading' && (
                                <div className="flex flex-col items-center gap-3 py-24 text-slate-500">
                                    <Loader2 className="h-7 w-7 animate-spin text-sky-600" />
                                    <p className="text-[15px]">Finding your exam…</p>
                                </div>
                            )}

                            {stage === 'code' && (
                                <CodeStage
                                    code={code}
                                    setCode={(v) => { setCode(v); setCodeError(null); }}
                                    busy={busy}
                                    error={codeError}
                                    onSubmit={lookup}
                                />
                            )}

                            {stage === 'identity' && info && (
                                <IdentityStage
                                    code={code}
                                    info={info}
                                    onBack={() => { setInfo(null); setStage('code'); setCode(''); navigate('/join', { replace: true }); }}
                                    onJoined={() => refreshMe()}
                                />
                            )}

                            {stage === 'lobby' && me && (
                                <LobbyStage
                                    me={me}
                                    onStart={() => navigate(`/join/${code}/exam`)}
                                    onLeave={leave}
                                />
                            )}

                            {stage === 'done' && me && <DoneStage me={me} result={result} />}

                            {stage === 'problem' && problem && (
                                <div className={`${CARD} px-6 py-8 text-center`}>
                                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-500/20">
                                        <Smartphone className="h-6 w-6" />
                                    </span>
                                    <h1 className="mt-4 text-[22px] font-bold tracking-[-0.02em] text-slate-900">{problem.title}</h1>
                                    <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{problem.message}</p>
                                    {problem.retry && (
                                        <button type="button" className={`${PRIMARY} mt-6`} onClick={leave}>
                                            Use this device instead
                                        </button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </main>

                <footer className="text-center text-[12px] text-slate-400">
                    Exams on TestoZa · Your answers are saved as you go
                </footer>
            </div>
        </div>
    );
}

/* ── 1. Code ─────────────────────────────────────────────────────────────── */

function CodeStage({ code, setCode, busy, error, onSubmit }: {
    code: string;
    setCode: (v: string) => void;
    busy: boolean;
    error: string | null;
    onSubmit: (code: string) => void;
}) {
    return (
        <div className="text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-[0_14px_30px_-14px_rgba(2,132,199,0.9)]">
                <KeyRound className="h-7 w-7" />
            </span>
            <h1 className="mt-5 text-[30px] font-bold leading-tight tracking-[-0.025em] text-slate-900">Join your exam</h1>
            <p className="mx-auto mt-2 max-w-[300px] text-[16px] leading-relaxed text-slate-600">
                Type the 6-digit code your teacher gave you.
            </p>
            <form
                className="mt-8"
                onSubmit={(e) => { e.preventDefault(); if (code.length === 6) onSubmit(code); }}
            >
                <DigitBoxes
                    length={6}
                    value={code}
                    onChange={setCode}
                    onComplete={onSubmit}
                    autoFocus
                    grouped
                    invalid={!!error}
                    disabled={busy}
                    ariaLabel="Exam code"
                />
                <div className="mt-4 min-h-[44px]" aria-live="polite">
                    {error && (
                        <p className="mx-auto flex max-w-[320px] items-start justify-center gap-1.5 text-[14px] leading-snug text-red-600">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                        </p>
                    )}
                </div>
                <button type="submit" className={PRIMARY} disabled={code.length !== 6 || busy}>
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continue <ArrowRight className="h-5 w-5" /></>}
                </button>
            </form>
            <p className="mt-6 text-[13px] text-slate-500">The code is on the board or in your class WhatsApp group.</p>
        </div>
    );
}

/* ── 2. Check in ─────────────────────────────────────────────────────────── */

function ExamCard({ info }: { info: PublicSession }) {
    const live = info.phase === 'live';
    const initial = (info.test.institution_name || info.test.title || 'T').trim().charAt(0).toUpperCase();
    return (
        <div className={`${CARD} p-5`}>
            <div className="flex items-center gap-3">
                {info.test.institution_logo ? (
                    <img src={info.test.institution_logo} alt="" className="h-11 w-11 rounded-[12px] bg-white object-contain p-1 ring-1 ring-slate-900/[0.06]" />
                ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-sky-500/15 to-sky-500/5 text-[18px] font-bold text-sky-700 ring-1 ring-inset ring-sky-500/20">
                        {initial}
                    </span>
                )}
                <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {info.test.institution_name || 'Online exam'}
                    </p>
                    <p className="truncate text-[14px] text-slate-600">
                        {info.batch && !info.name.includes(info.batch) ? `${info.name} · ${info.batch}` : info.name}
                    </p>
                </div>
            </div>
            <h2 className="mt-4 text-[22px] font-bold leading-tight tracking-[-0.02em] text-slate-900">{info.test.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-[13px] font-medium">
                {info.test.duration ? <Fact icon={Clock}>{info.test.duration} min</Fact> : null}
                {info.test.questions ? <Fact icon={FileText}>{info.test.questions} questions</Fact> : null}
                {live ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live now
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-violet-700 ring-1 ring-inset ring-violet-600/15">
                        {info.start_mode === 'manual' && new Date(info.opens_at).getTime() <= new Date(info.server_time).getTime()
                            ? 'Lobby open'
                            : `Starts ${timeOnly(info.opens_at)}`}
                    </span>
                )}
            </div>
            {info.test.proctoring && (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[13px] leading-snug text-amber-900">
                    <Eye className="mt-0.5 h-4 w-4 shrink-0" />
                    This exam is watched: stay in full screen and don't switch apps.
                </p>
            )}
        </div>
    );
}

function Fact({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
            <Icon className="h-3.5 w-3.5 text-slate-500" /> {children}
        </span>
    );
}

function IdentityStage({ code, info, onBack, onJoined }: {
    code: string;
    info: PublicSession;
    onBack: () => void;
    onJoined: () => void;
}) {
    const mode = info.identity_mode;
    const [name, setName] = useState('');
    const [roll, setRoll] = useState('');
    const [pin, setPin] = useState('');
    const [needName, setNeedName] = useState(mode === 'name');
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState<ApiProblem | null>(null);
    const firstField = useRef<HTMLInputElement>(null);

    useEffect(() => { firstField.current?.focus(); }, []);

    const ready = mode === 'name'
        ? name.trim().length >= 2
        : roll.trim().length > 0 && (mode !== 'roll_pin' || pin.length === 4) && (!needName || name.trim().length >= 2);

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!ready || busy) return;
        setBusy(true);
        setProblem(null);
        try {
            const res = await joinApi.enter(code, {
                name: name.trim() || undefined,
                roll_no: roll.trim() || undefined,
                pin: mode === 'roll_pin' ? pin : undefined,
            }, seatStore.get(code)?.token);
            seatStore.set({
                token: res.token,
                sessionId: res.session.session_id,
                participantId: res.participant.id,
                name: res.participant.name,
                code,
            });
            onJoined();
        } catch (err) {
            const p = problemOf(err);
            if (p.code === 'name_required') setNeedName(true);
            if (p.code === 'wrong_pin') setPin('');
            setProblem(p);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <button type="button" onClick={onBack} className="-ml-1 inline-flex h-9 items-center gap-0.5 rounded-full pr-3 text-[15px] font-medium text-sky-700 hover:bg-sky-50 cursor-pointer">
                <ChevronLeft className="h-5 w-5" /> Another code
            </button>
            <ExamCard info={info} />

            <form onSubmit={submit} className={`${CARD} space-y-3 p-5`}>
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">Your details</p>
                {mode !== 'name' && (
                    <input
                        ref={firstField}
                        className={FIELD}
                        value={roll}
                        onChange={(e) => { setRoll(e.target.value); setProblem(null); }}
                        placeholder="Roll number"
                        autoComplete="off"
                        autoCapitalize="characters"
                        enterKeyHint={mode === 'roll_pin' ? 'next' : 'go'}
                        aria-label="Roll number"
                        maxLength={40}
                    />
                )}
                {needName && (
                    <input
                        ref={mode === 'name' ? firstField : undefined}
                        className={FIELD}
                        value={name}
                        onChange={(e) => { setName(e.target.value); setProblem(null); }}
                        placeholder="Your full name"
                        autoComplete="name"
                        autoCapitalize="words"
                        enterKeyHint="go"
                        aria-label="Your full name"
                        maxLength={120}
                    />
                )}
                {mode === 'roll_pin' && (
                    <div className="pt-1">
                        <p className="mb-2 text-center text-[14px] text-slate-600">4-digit PIN from your slip</p>
                        <DigitBoxes
                            length={4}
                            value={pin}
                            onChange={(v) => { setPin(v); setProblem(null); }}
                            secret
                            size="md"
                            invalid={problem?.code === 'wrong_pin'}
                            ariaLabel="PIN"
                        />
                    </div>
                )}

                <div className="min-h-[22px]" aria-live="polite">
                    {problem && (
                        <p className="flex items-start gap-1.5 text-[14px] leading-snug text-red-600">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                                {problem.message}
                                {problem.code === 'not_open' && problem.extra.opens_at && ` It opens 30 minutes before ${timeOnly(problem.extra.opens_at)}.`}
                            </span>
                        </p>
                    )}
                </div>

                <button type="submit" className={PRIMARY} disabled={!ready || busy}>
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Join exam'}
                </button>
            </form>
            <p className="px-2 text-center text-[13px] leading-relaxed text-slate-500">
                <ShieldCheck className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
                No account needed. Your teacher sees your name and marks only.
            </p>
        </div>
    );
}

/* ── 3. Lobby ────────────────────────────────────────────────────────────── */

function LobbyStage({ me, onStart, onLeave }: { me: MeResponse; onStart: () => void; onLeave: () => void }) {
    const { session, participant } = me;
    const now = useServerClock(session.server_time);
    const live = session.phase === 'live';
    const started = participant.status === 'writing' || !!participant.started_at;
    const opensAt = new Date(session.opens_at).getTime();
    const secondsToStart = Math.max(0, Math.round((opensAt - now) / 1000));
    const waitingForTeacher = session.start_mode === 'manual' && !live;
    const firstName = participant.name.split(' ')[0];

    return (
        <div className="space-y-4">
            <div className="text-center">
                <div className="relative mx-auto h-20 w-20">
                    {!live && <span className="absolute inset-0 rounded-full bg-sky-400 motion-safe:animate-[tz-breathe_2.4s_ease-in-out_infinite]" />}
                    <span className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-[0_16px_34px_-16px_rgba(2,132,199,0.9)] ${live ? 'bg-emerald-500' : 'bg-gradient-to-br from-sky-500 to-sky-700'}`}>
                        <Check className="h-9 w-9" strokeWidth={3} />
                    </span>
                </div>
                <h1 className="mt-5 text-[28px] font-bold tracking-[-0.025em] text-slate-900">You're in, {firstName}</h1>
                <p className="mt-1 text-[15px] text-slate-600">{session.test.title}</p>
            </div>

            <div className={`${CARD} p-5 text-center`}>
                {live ? (
                    <>
                        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                            {started ? 'Your exam is in progress' : 'The exam has started'}
                        </p>
                        <button type="button" onClick={onStart} className={`${PRIMARY} mt-4`}>
                            {started ? 'Continue exam' : 'Start exam'} <ArrowRight className="h-5 w-5" />
                        </button>
                        <p className="mt-3 text-[13px] leading-relaxed text-slate-500">
                            {started
                                ? 'Your answers are saved. The timer kept running while you were away.'
                                : `You get ${session.test.duration || '—'} minutes from the moment you tap Start.`}
                        </p>
                    </>
                ) : waitingForTeacher && secondsToStart === 0 ? (
                    <>
                        <p className="text-[17px] font-semibold text-slate-900">Waiting for your teacher to start</p>
                        <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
                            {[0, 1, 2].map(i => (
                                <span key={i} className="h-2 w-2 rounded-full bg-sky-500 motion-safe:animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                            ))}
                        </div>
                        <p className="mt-3 text-[13px] text-slate-500">This page moves on by itself.</p>
                    </>
                ) : (
                    <>
                        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-500">Starts in</p>
                        <p className="mt-1 text-[52px] font-bold leading-none tracking-[-0.03em] text-slate-900 tabular-nums">{clock(secondsToStart)}</p>
                        <p className="mt-2 text-[14px] text-slate-600">
                            at {timeOnly(session.opens_at)}{waitingForTeacher ? ', when your teacher starts it' : ''}
                        </p>
                    </>
                )}
                <div className="mt-5 flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-[14px] text-slate-600">
                    <Users className="h-4 w-4 text-slate-400" />
                    {me.expected ? `${me.joined} of ${me.expected} joined` : `${me.joined} joined`}
                </div>
            </div>

            {!live && (
                <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                    <Tip icon={Smartphone} text="Keep this page open. It moves on when the exam starts." />
                    <Tip icon={BatteryCharging} text="Charge your phone or plug it in now." />
                    {session.test.proctoring && <Tip icon={Eye} text="During the exam, switching apps or leaving full screen is recorded." />}
                    <Tip icon={RefreshCw} text="Phone died? Join again on any device with the same details. Your answers are saved." />
                </ul>
            )}

            <p className="text-center text-[13px] text-slate-500">
                Not {firstName}?{' '}
                <button type="button" onClick={onLeave} className="font-semibold text-sky-700 hover:underline cursor-pointer">Join as someone else</button>
            </p>
        </div>
    );
}

function Tip({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
    return (
        <li className="flex items-start gap-3 px-4 py-3.5 text-[14px] leading-snug text-slate-700">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-sky-50 text-sky-700">
                <Icon className="h-4 w-4" />
            </span>
            <span className="pt-1.5">{text}</span>
        </li>
    );
}

/* ── 4. Submitted / result ───────────────────────────────────────────────── */

function DoneStage({ me, result }: { me: MeResponse; result: StudentResult | null }) {
    const firstName = me.participant.name.split(' ')[0];
    if (result?.released) return <ResultView result={result} />;
    return (
        <div className="space-y-4 text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_16px_34px_-16px_rgba(16,185,129,0.9)]">
                <Check className="h-9 w-9" strokeWidth={3} />
            </span>
            <h1 className="text-[28px] font-bold tracking-[-0.025em] text-slate-900">Submitted</h1>
            <p className="mx-auto max-w-[320px] text-[15px] leading-relaxed text-slate-600">
                Well done, {firstName}. Your answers reached your teacher
                {me.participant.submitted_at ? ` at ${timeOnly(me.participant.submitted_at)}` : ''}.
            </p>
            <div className={`${CARD} p-5`}>
                <Trophy className="mx-auto h-6 w-6 text-amber-500" />
                <p className="mt-2 text-[16px] font-semibold text-slate-900">Your result</p>
                <p className="mt-1 text-[14px] leading-relaxed text-slate-600">
                    {me.results_release_at
                        ? `Shows here at ${timeOnly(me.results_release_at)}, when the exam ends for everyone.`
                        : 'Shows here when your teacher releases it.'}
                    {' '}Come back to this page or open the same code again.
                </p>
            </div>
        </div>
    );
}

function ResultView({ result }: { result: StudentResult }) {
    const pct = Math.max(0, Math.min(100, result.percent ?? 0));
    const r = 54;
    const c = 2 * Math.PI * r;
    const stats = result.stats || {};
    const { strong, weak } = topicSplit(result.topics || []);
    const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

    return (
        <div className="space-y-4">
            <div className="text-center">
                <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-500">{result.exam}</p>
                <h1 className="mt-1 text-[24px] font-bold tracking-[-0.02em] text-slate-900">{result.test_title}</h1>
            </div>

            <div className={`${CARD} p-6`}>
                <div className="flex items-center gap-5">
                    <div className="relative h-[124px] w-[124px] shrink-0">
                        <svg viewBox="0 0 124 124" className="h-full w-full -rotate-90">
                            <circle cx="62" cy="62" r={r} fill="none" stroke="#e2e8f0" strokeWidth="11" />
                            <circle cx="62" cy="62" r={r} fill="none" stroke="#0284c7" strokeWidth="11" strokeLinecap="round"
                                strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className="transition-[stroke-dashoffset] duration-700" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[26px] font-bold leading-none tracking-[-0.02em] text-slate-900">{fmt(result.score)}</span>
                            <span className="mt-1 text-[13px] text-slate-500">of {fmt(result.max_marks)}</span>
                        </div>
                    </div>
                    <div className="min-w-0">
                        {result.rank ? (
                            <>
                                <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-500">Your rank</p>
                                <p className="text-[40px] font-bold leading-none tracking-[-0.03em] text-slate-900">#{result.rank}</p>
                                <p className="mt-1 text-[14px] text-slate-600">of {result.of} candidates</p>
                            </>
                        ) : null}
                        <p className="mt-2 text-[14px] text-slate-600">{fmt(result.percent)}%</p>
                    </div>
                </div>
                <dl className="mt-5 grid grid-cols-3 gap-2">
                    <Tile label="Correct" value={stats.correctCount ?? 0} tone="text-emerald-700" />
                    <Tile label="Wrong" value={stats.wrongCount ?? 0} tone="text-rose-700" />
                    <Tile label="Skipped" value={stats.unattemptedCount ?? 0} tone="text-slate-700" />
                </dl>
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-[14px]">
                    <Compare label="You" value={result.score ?? 0} max={result.max_marks ?? 0} accent />
                    <Compare label="Class average" value={result.average ?? 0} max={result.max_marks ?? 0} />
                    <Compare label="Top score" value={result.highest ?? 0} max={result.max_marks ?? 0} />
                </div>
            </div>

            {!!result.sections?.length && (
                <div className={`${CARD} p-5`}>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">By section</p>
                    <div className="mt-3 space-y-3">
                        {result.sections.map(s => <Compare key={s.name} label={s.name} value={s.score} max={s.max} accent />)}
                    </div>
                </div>
            )}

            {(strong.length > 0 || weak.length > 0) && (
                <div className={`${CARD} grid grid-cols-2 gap-4 p-5 text-[14px]`}>
                    <div>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Strong</p>
                        {strong.length
                            ? <ul className="mt-2 space-y-1 text-slate-700">{strong.map(t => <li key={t.name}>{t.name}</li>)}</ul>
                            : <p className="mt-2 text-slate-500">Not yet — keep going.</p>}
                    </div>
                    <div>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-rose-700">Practise more</p>
                        {weak.length
                            ? <ul className="mt-2 space-y-1 text-slate-700">{weak.map(t => <li key={t.name}>{t.name}</li>)}</ul>
                            : <p className="mt-2 text-slate-500">Nothing below 50%.</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: string }) {
    return (
        <div className="rounded-2xl bg-slate-50 px-3 py-2.5 text-center ring-1 ring-inset ring-slate-900/[0.04]">
            <dd className={`text-[22px] font-bold leading-tight ${tone}`}>{value}</dd>
            <dt className="text-[12px] text-slate-500">{label}</dt>
        </div>
    );
}

function Compare({ label, value, max, accent }: { label: string; value: number; max: number; accent?: boolean }) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    const shown = Number.isInteger(value) ? value : Math.round(value * 10) / 10;
    return (
        <div>
            <div className="flex justify-between gap-3">
                <span className="truncate text-slate-700">{label}</span>
                <span className="shrink-0 font-semibold tabular-nums text-slate-900">{shown}{max ? ` / ${max}` : ''}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${accent ? 'bg-sky-500' : 'bg-slate-300'}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}
