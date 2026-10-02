/**
 * A replica of testoza.com/join (src/pages/join/JoinPage.tsx and
 * components/exams/DigitBoxes.tsx) for the candidate's phone in the exam-day demo:
 * the code, check-in, lobby, submitted and result stages. (Copied from the Moodle
 * guide's replica so the two pages stay independent.)
 *
 * Class strings are copied from JoinPage, resolved for a phone: the real page's sm:
 * variants are left out because Tailwind's breakpoints follow the reader's window, not
 * this 393-point screen. Values that JoinPage reads from the server (the exam card,
 * counts, the result) come in as props. Always light, like a screenshot (.co-screen
 * resets the theme tokens); the logo is drawn without its dark-mode colours.
 */
import type { ComponentType, ReactNode } from 'react';
import { ArrowRight, BatteryCharging, Check, ChevronLeft, Clock, Eye, FileText, KeyRound, Loader2, RefreshCw, ShieldCheck, Smartphone, Trophy, Users } from 'lucide-react';

const PRIMARY =
    'inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[17px] font-semibold text-white ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_28px_-14px_rgba(2,132,199,0.9)] transition-[background-color,transform] ' +
    'disabled:opacity-45 disabled:pointer-events-none';
const CARD = 'rounded-[22px] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_32px_-20px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/[0.05]';
const FIELD = 'flex h-[52px] w-full items-center rounded-2xl bg-slate-100/80 px-4 text-[17px] text-slate-900 ring-1 ring-transparent transition';
const FIELD_FOCUS = 'bg-white ring-2 ring-sky-500/60';

/**
 * The page around every stage: JoinPage's background, logo header and footer. The
 * real page uses min-h-[100dvh] twice; here the outer box fills the phone's web view
 * and the inner one grows into it (flex-1), which centres the stage the same way.
 */
export function JoinPageFrame({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-full flex-col bg-[#f2f2f7] bg-[radial-gradient(1200px_420px_at_50%_-120px,rgba(14,165,233,0.14),transparent)]">
            <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col px-4 pb-10 pt-5">
                <header className="flex h-10 items-center justify-center">
                    <Logo size={30} />
                </header>
                <main className="flex flex-1 flex-col justify-center py-6">{children}</main>
                <footer className="text-center text-[12px] text-slate-400">Exams on TestoZa · Your answers are saved as you go</footer>
            </div>
        </div>
    );
}

/** components/TestoZaLogo.tsx, light colours only. */
function Logo({ size }: { size: number }) {
    return (
        <span className="inline-flex select-none items-baseline tracking-tight" style={{ fontFamily: "'Outfit', sans-serif", fontSize: `${size * 0.72}px`, fontWeight: 700, lineHeight: 1 }}>
            <span className="text-[#056eab]">Testo</span>
            <span
                className="inline-block bg-gradient-to-b from-[#FFE885] via-[#F4B838] to-[#9E6400] bg-clip-text text-transparent"
                style={{
                    fontSize: '1.26em',
                    fontWeight: 900,
                    marginRight: '0.02em',
                    marginLeft: '0.02em',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.15)) drop-shadow(0 0 6px rgba(244, 184, 56, 0.45))',
                }}
            >
                Z
            </span>
            <span className="text-[#056eab]">a</span>
        </span>
    );
}

/** DigitBoxes (input-otp) as it renders: `focused` puts the ring and caret on the next empty box. */
export function DigitBoxes({
    length,
    value,
    focused,
    secret,
    grouped,
    size = 'lg',
    invalid,
}: {
    length: number;
    value: string;
    focused: boolean;
    secret?: boolean;
    grouped?: boolean;
    size?: 'md' | 'lg';
    invalid?: boolean;
}) {
    const box = size === 'lg' ? 'h-[60px] w-[46px] text-[28px] rounded-[14px]' : 'h-14 w-12 text-2xl rounded-[13px]';
    const activeIndex = focused ? Math.min(value.length, length - 1) : -1;
    return (
        <div className="flex items-center justify-center">
            <div className="flex items-center gap-2">
                {Array.from({ length }, (_, i) => {
                    const char = value[i] ?? null;
                    const active = i === activeIndex;
                    return (
                        <div key={i} className="contents">
                            {grouped && i === Math.floor(length / 2) && <span aria-hidden="true" className="mx-0.5 h-[3px] w-3 rounded-full bg-slate-300" />}
                            <div
                                className={[
                                    'relative flex items-center justify-center bg-white font-semibold tabular-nums text-slate-900 transition-all duration-150',
                                    box,
                                    'shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1',
                                    invalid ? 'ring-red-400/80 bg-red-50/60' : active ? 'ring-2 ring-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.15)]' : char ? 'ring-slate-300' : 'ring-slate-200',
                                ].join(' ')}
                            >
                                {char !== null && (secret ? <span className="h-3 w-3 rounded-full bg-slate-900" /> : <span className="co-digit">{char}</span>)}
                                {active && char === null && (
                                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                        <span className="h-7 w-[2px] animate-[tz-caret_1s_ease-in-out_infinite] rounded-full bg-sky-500" />
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ── 1. Code ─────────────────────────────────────────────────────────────── */

export function CodeStage({ code, busy, pressed }: { code: string; busy: boolean; pressed?: boolean }) {
    return (
        <div className="text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-[0_14px_30px_-14px_rgba(2,132,199,0.9)]">
                <KeyRound className="h-7 w-7" />
            </span>
            <p className="mt-5 text-[30px] font-bold leading-tight tracking-[-0.025em] text-slate-900">Join your exam</p>
            <p className="mx-auto mt-2 max-w-[300px] text-[16px] leading-relaxed text-slate-600">Type the 6-digit code your teacher gave you.</p>
            <div className="mt-8">
                <div className={busy ? 'opacity-60' : undefined}>
                    <DigitBoxes length={6} value={code} focused={!busy} grouped />
                </div>
                <div className="mt-4 min-h-[44px]" />
                <button type="button" tabIndex={-1} className={`${PRIMARY}${pressed ? ' is-pressed' : ''}`} disabled={code.length !== 6 || busy}>
                    {busy ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            Continue <ArrowRight className="h-5 w-5" />
                        </>
                    )}
                </button>
            </div>
            <p className="mt-6 text-[13px] text-slate-500">The code is on the board or in your class WhatsApp group.</p>
        </div>
    );
}

/* ── 2. Check in ─────────────────────────────────────────────────────────── */

export interface ExamInfo {
    institute: string;
    sitting: string;
    batch: string;
    title: string;
    minutes: number;
    questions: number;
    proctoring: boolean;
}

function Fact({ icon: Icon, children }: { icon: ComponentType<{ className?: string }>; children: ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
            <Icon className="h-3.5 w-3.5 text-slate-500" /> {children}
        </span>
    );
}

function ExamCard({ info, live }: { info: ExamInfo; live: boolean }) {
    return (
        <div className={`${CARD} p-5`}>
            <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-sky-500/15 to-sky-500/5 text-[18px] font-bold text-sky-700 ring-1 ring-inset ring-sky-500/20">
                    {info.institute.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">{info.institute}</p>
                    <p className="truncate text-[14px] text-slate-600">
                        {info.sitting} · {info.batch}
                    </p>
                </div>
            </div>
            <p className="mt-4 text-[22px] font-bold leading-tight tracking-[-0.02em] text-slate-900">{info.title}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[13px] font-medium">
                <Fact icon={Clock}>{info.minutes} min</Fact>
                <Fact icon={FileText}>{info.questions} questions</Fact>
                {live ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live now
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-violet-700 ring-1 ring-inset ring-violet-600/15">Lobby open</span>
                )}
            </div>
            {info.proctoring && (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[13px] leading-snug text-amber-900">
                    <Eye className="mt-0.5 h-4 w-4 shrink-0" />
                    This exam is watched: stay in full screen and don&apos;t switch apps.
                </p>
            )}
        </div>
    );
}

export function IdentityStage({ info, roll, pin, focus, busy, pressed }: { info: ExamInfo; roll: string; pin: string; focus: 'roll' | 'pin' | null; busy: boolean; pressed?: boolean }) {
    const ready = roll.trim().length > 0 && pin.length === 4;
    return (
        <div className="space-y-4">
            <span className="-ml-1 inline-flex h-9 items-center gap-0.5 rounded-full pr-3 text-[15px] font-medium text-sky-700">
                <ChevronLeft className="h-5 w-5" /> Another code
            </span>
            <ExamCard info={info} live={false} />

            <div className={`${CARD} space-y-3 p-5`}>
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">Your details</p>
                <div className={`${FIELD}${focus === 'roll' ? ` ${FIELD_FOCUS}` : ''}`}>
                    {roll ? <span>{roll}</span> : <span className="text-slate-400">Roll number</span>}
                    {focus === 'roll' && <span className="ml-px h-[22px] w-[2px] animate-[tz-caret_1s_ease-in-out_infinite] rounded-full bg-sky-500" />}
                </div>
                <div className="pt-1">
                    <p className="mb-2 text-center text-[14px] text-slate-600">4-digit PIN from your slip</p>
                    <DigitBoxes length={4} value={pin} focused={focus === 'pin'} secret size="md" />
                </div>
                <div className="min-h-[22px]" />
                <button type="button" tabIndex={-1} className={`${PRIMARY}${pressed ? ' is-pressed' : ''}`} disabled={!ready || busy}>
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Join exam'}
                </button>
            </div>
            <p className="px-2 text-center text-[13px] leading-relaxed text-slate-500">
                <ShieldCheck className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
                No account needed. Your teacher sees your name and marks only.
            </p>
        </div>
    );
}

/* ── 3. Lobby ────────────────────────────────────────────────────────────── */

function Tip({ icon: Icon, text }: { icon: ComponentType<{ className?: string }>; text: string }) {
    return (
        <li className="flex items-start gap-3 px-4 py-3.5 text-[14px] leading-snug text-slate-700">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-sky-50 text-sky-700">
                <Icon className="h-4 w-4" />
            </span>
            <span className="pt-1.5">{text}</span>
        </li>
    );
}

export function LobbyStage({
    name,
    title,
    minutes,
    live,
    joined,
    expected,
    proctoring,
    pressed,
}: {
    name: string;
    title: string;
    minutes: number;
    live: boolean;
    joined: number;
    expected: number;
    proctoring: boolean;
    pressed?: boolean;
}) {
    const firstName = name.split(' ')[0];
    return (
        <div className="space-y-4">
            <div className="text-center">
                <div className="relative mx-auto h-20 w-20">
                    {!live && <span className="absolute inset-0 rounded-full bg-sky-400 motion-safe:animate-[tz-breathe_2.4s_ease-in-out_infinite]" />}
                    <span
                        className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-[0_16px_34px_-16px_rgba(2,132,199,0.9)] ${live ? 'bg-emerald-500' : 'bg-gradient-to-br from-sky-500 to-sky-700'}`}
                    >
                        <Check className="h-9 w-9" strokeWidth={3} />
                    </span>
                </div>
                <p className="mt-5 text-[28px] font-bold tracking-[-0.025em] text-slate-900">You&apos;re in, {firstName}</p>
                <p className="mt-1 text-[15px] text-slate-600">{title}</p>
            </div>

            <div className={`${CARD} p-5 text-center`}>
                {live ? (
                    <div className="co-swap">
                        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-emerald-700">The exam has started</p>
                        <button type="button" tabIndex={-1} className={`${PRIMARY} mt-4${pressed ? ' is-pressed' : ''}`}>
                            Start exam <ArrowRight className="h-5 w-5" />
                        </button>
                        <p className="mt-3 text-[13px] leading-relaxed text-slate-500">You get {minutes} minutes from the moment you tap Start.</p>
                    </div>
                ) : (
                    <>
                        <p className="text-[17px] font-semibold text-slate-900">Waiting for your teacher to start</p>
                        <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
                            {[0, 1, 2].map((i) => (
                                <span key={i} className="h-2 w-2 rounded-full bg-sky-500 motion-safe:animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                            ))}
                        </div>
                        <p className="mt-3 text-[13px] text-slate-500">This page moves on by itself.</p>
                    </>
                )}
                <div className="mt-5 flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-[14px] text-slate-600">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span key={joined} className="co-count">
                        {joined} of {expected} joined
                    </span>
                </div>
            </div>

            {!live && (
                <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                    <Tip icon={Smartphone} text="Keep this page open. It moves on when the exam starts." />
                    <Tip icon={BatteryCharging} text="Charge your phone or plug it in now." />
                    {proctoring && <Tip icon={Eye} text="During the exam, switching apps or leaving full screen is recorded." />}
                    <Tip icon={RefreshCw} text="Phone died? Join again on any device with the same details. Your answers are saved." />
                </ul>
            )}

            <p className="text-center text-[13px] text-slate-500">
                Not {firstName}? <span className="font-semibold text-sky-700">Join as someone else</span>
            </p>
        </div>
    );
}

/* ── 4. Submitted / result ───────────────────────────────────────────────── */

export function DoneStage({ name, submittedAt, releaseAt }: { name: string; submittedAt: string; releaseAt: string }) {
    const firstName = name.split(' ')[0];
    return (
        <div className="space-y-4 text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_16px_34px_-16px_rgba(16,185,129,0.9)]">
                <Check className="h-9 w-9" strokeWidth={3} />
            </span>
            <p className="text-[28px] font-bold tracking-[-0.025em] text-slate-900">Submitted</p>
            <p className="mx-auto max-w-[320px] text-[15px] leading-relaxed text-slate-600">
                Well done, {firstName}. Your answers reached your teacher at {submittedAt}.
            </p>
            <div className={`${CARD} p-5`}>
                <Trophy className="mx-auto h-6 w-6 text-amber-500" />
                <p className="mt-2 text-[16px] font-semibold text-slate-900">Your result</p>
                <p className="mt-1 text-[14px] leading-relaxed text-slate-600">Shows here at {releaseAt}, when the exam ends for everyone. Come back to this page or open the same code again.</p>
            </div>
        </div>
    );
}

export interface ResultData {
    exam: string;
    title: string;
    score: number;
    max: number;
    rank: number;
    of: number;
    correct: number;
    wrong: number;
    skipped: number;
    average: number;
    highest: number;
    sections: { name: string; score: number; max: number }[];
    strong: string[];
    weak: string[];
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
                <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                    {shown} / {max}
                </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`co-bar h-full rounded-full ${accent ? 'bg-sky-500' : 'bg-slate-300'}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

export function ResultView({ result }: { result: ResultData }) {
    const pct = (result.score / result.max) * 100;
    const r = 54;
    const c = 2 * Math.PI * r;
    return (
        <div className="space-y-4">
            <div className="text-center">
                <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-500">{result.exam}</p>
                <p className="mt-1 text-[24px] font-bold tracking-[-0.02em] text-slate-900">{result.title}</p>
            </div>

            <div className={`${CARD} p-6`}>
                <div className="flex items-center gap-5">
                    <div className="relative h-[124px] w-[124px] shrink-0">
                        <svg viewBox="0 0 124 124" className="h-full w-full -rotate-90">
                            <circle cx="62" cy="62" r={r} fill="none" stroke="#e2e8f0" strokeWidth="11" />
                            <circle
                                cx="62"
                                cy="62"
                                r={r}
                                fill="none"
                                stroke="#0284c7"
                                strokeWidth="11"
                                strokeLinecap="round"
                                strokeDasharray={c}
                                strokeDashoffset={c * (1 - pct / 100)}
                                className="co-ring-fill"
                                style={{ ['--co-c' as string]: c }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[26px] font-bold leading-none tracking-[-0.02em] text-slate-900">{fmt(result.score)}</span>
                            <span className="mt-1 text-[13px] text-slate-500">of {fmt(result.max)}</span>
                        </div>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-500">Your rank</p>
                        <p className="text-[40px] font-bold leading-none tracking-[-0.03em] text-slate-900">#{result.rank}</p>
                        <p className="mt-1 text-[14px] text-slate-600">of {result.of} candidates</p>
                        <p className="mt-2 text-[14px] text-slate-600">{fmt(Math.round(pct * 100) / 100)}%</p>
                    </div>
                </div>
                <dl className="mt-5 grid grid-cols-3 gap-2">
                    <Tile label="Correct" value={result.correct} tone="text-emerald-700" />
                    <Tile label="Wrong" value={result.wrong} tone="text-rose-700" />
                    <Tile label="Skipped" value={result.skipped} tone="text-slate-700" />
                </dl>
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-[14px]">
                    <Compare label="You" value={result.score} max={result.max} accent />
                    <Compare label="Class average" value={result.average} max={result.max} />
                    <Compare label="Top score" value={result.highest} max={result.max} />
                </div>
            </div>

            {result.sections.length > 0 && (
                <div className={`${CARD} p-5`}>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">By section</p>
                    <div className="mt-3 space-y-3">
                        {result.sections.map((s) => (
                            <Compare key={s.name} label={s.name} value={s.score} max={s.max} accent />
                        ))}
                    </div>
                </div>
            )}

            <div className={`${CARD} grid grid-cols-2 gap-4 p-5 text-[14px]`}>
                <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Strong</p>
                    <ul className="mt-2 space-y-1 text-slate-700">
                        {result.strong.map((t) => (
                            <li key={t}>{t}</li>
                        ))}
                    </ul>
                </div>
                <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-rose-700">Practise more</p>
                    <ul className="mt-2 space-y-1 text-slate-700">
                        {result.weak.map((t) => (
                            <li key={t}>{t}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
