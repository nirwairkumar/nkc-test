/**
 * "Try to cheat on this page": TestoZa's exam screen, watching the reader's own browser
 * the way a live exam watches a candidate's phone. Every signal is real:
 *
 *   - visibilitychange → hidden (another tab or app, the home screen, a locked phone):
 *     counted when app-switch detection is on (TestPage handleVisibilityChange);
 *   - fullscreenchange when the demo was in real full screen: counted when Force Full
 *     Screen is on (checkFullScreenState), with the "Full Screen Required" dialog; where
 *     the browser can't do full screen (iPhone), the rule is skipped, as in the product;
 *   - copy / cut / paste and contextmenu inside the exam screen: blocked when the rules
 *     are on (handleCopyPaste, handleContextMenu), allowed otherwise;
 *   - window blur without the page being hidden (another window, split screen, the
 *     address bar): reported by the browser but not counted, because TestoZa doesn't.
 *
 * The violation rule is TestPage's handleViolation: warn only (null), Strict (0, submit
 * at the first), or 2–5 warnings, then an automatic submit. Warnings reach the exam room
 * row with the next heartbeat. Signals count only while the demo is on screen (or in
 * full screen), so reading on further never submits anything. Nothing is sent anywhere.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Maximize, Play, Smartphone } from 'lucide-react';
import { clock } from '@/components/exams/examFormat';
import { EXAM, QUESTIONS, type OptionKey } from '@/guides/cheatingData';
import { Avatar, CARD, DemoFrame, Flag, Phone, Toasts, UiSwitch, useInView, useToasts, useWidth } from './replica';
import ExamScreen, { DoneScreen, FullScreenDialog, SubmittingOverlay, ViolationDialog } from './examScreen';

const ROLL = 'B-09';
/** Time left on the exam when the demo starts: 31:40. */
const START_LEFT = 31 * 60 + 40;

interface Rules {
    fullscreen: boolean;
    tabSwitch: boolean;
    /** null = warn only, 0 = Strict, 2–5 = warnings then submit. */
    limit: number | null;
    copy: boolean;
    rightClick: boolean;
}

const DEFAULT_RULES: Rules = { fullscreen: true, tabSwitch: true, limit: 3, copy: true, rightClick: true };

type Phase = 'ready' | 'writing' | 'submitting' | 'submitted';
type Verdict = 'counted' | 'blocked' | 'allowed' | 'ignored' | 'info';
interface Signal {
    id: number;
    at: string;
    title: string;
    code: string;
    verdict: Verdict;
}
type Dialog = { kind: 'violation'; title: string; message: string } | { kind: 'fullscreen' } | null;
type Pane = 'exam' | 'rules' | 'signals';

const VERDICT: Record<Verdict, string> = { counted: 'Counted', blocked: 'Blocked', allowed: 'Allowed', ignored: 'Not counted', info: 'Note' };

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const hhmm = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[ap]m$/i, '');

function fullScreenSupported() {
    if (typeof document === 'undefined') return false;
    const d = document as Document & { webkitFullscreenEnabled?: boolean };
    return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
}

function fullScreenElement() {
    const d = document as Document & { webkitFullscreenElement?: Element | null };
    return d.fullscreenElement || d.webkitFullscreenElement || null;
}

function requestFull(el: HTMLElement) {
    const e = el as HTMLElement & { webkitRequestFullscreen?: () => void };
    try {
        if (e.requestFullscreen) return e.requestFullscreen().catch(() => undefined);
        e.webkitRequestFullscreen?.();
    } catch {
        /* the browser said no; the rule is skipped */
    }
    return undefined;
}

function exitFull() {
    const d = document as Document & { webkitExitFullscreen?: () => void };
    if (!fullScreenElement()) return;
    try {
        if (d.exitFullscreen) d.exitFullscreen().catch(() => undefined);
        else d.webkitExitFullscreen?.();
    } catch {
        /* already out */
    }
}

/** components/TestSettingsPanel.tsx, "Proctoring & Security", with this demo's state. */
function RulesPanel({ rules, set, fsOk }: { rules: Rules; set: (patch: Partial<Rules>) => void; fsOk: boolean }) {
    const monitored = rules.fullscreen || rules.tabSwitch;
    const counting = typeof rules.limit === 'number' && rules.limit > 0;
    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-4 border p-4 rounded-lg bg-slate-50">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monitoring</p>
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                        <p className="text-base font-medium leading-none flex items-center gap-2">
                            <Maximize className="w-4 h-4 text-blue-500" /> Force Full Screen
                        </p>
                        <p className="text-sm text-muted-foreground">User must enter full screen to start. Exiting counts as a violation.</p>
                        {!fsOk && <p className="pt-1 text-xs text-amber-700">This browser can’t go full screen (as on iPhones), so the rule is skipped.</p>}
                    </div>
                    <UiSwitch checked={rules.fullscreen} onChange={(v) => set({ fullscreen: v })} label="Force Full Screen" />
                </div>
                <hr className="border-slate-200" />
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                        <p className="text-base font-medium leading-none flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" /> Tab/App Switch Detection
                        </p>
                        <p className="text-sm text-muted-foreground">Detect if user switches tabs/apps or minimizes browser.</p>
                    </div>
                    <UiSwitch checked={rules.tabSwitch} onChange={(v) => set({ tabSwitch: v })} label="Tab/App Switch Detection" />
                </div>
                {monitored && (
                    <>
                        <hr className="border-slate-200" />
                        <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Violation Action</p>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" name="pc-vl" checked={rules.limit === null} onChange={() => set({ limit: null })} className="accent-primary" />
                                    <span className="text-sm font-normal leading-none">No limit (Warn only)</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" name="pc-vl" checked={rules.limit === 0} onChange={() => set({ limit: 0 })} className="accent-red-500" />
                                    <span className="text-sm font-normal leading-none text-red-600">Strict (Instant Submit)</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" name="pc-vl" checked={counting} onChange={() => set({ limit: counting ? rules.limit : 2 })} className="accent-primary" />
                                    <span className="text-sm font-normal leading-none flex items-center gap-2">
                                        <select
                                            value={counting ? String(rules.limit) : '2'}
                                            disabled={!counting}
                                            onChange={(e) => set({ limit: Number(e.target.value) })}
                                            aria-label="Warnings before the paper submits"
                                            className="flex h-8 w-16 items-center justify-between rounded-md border border-input bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {[2, 3, 4, 5].map((n) => (
                                                <option key={n} value={n}>
                                                    {n}
                                                </option>
                                            ))}
                                        </select>
                                        <span>warnings then Submit</span>
                                    </span>
                                </label>
                            </div>
                            <p className="text-xs text-muted-foreground italic">Both fullscreen exits and tab/app switches count toward this limit.</p>
                        </div>
                    </>
                )}
            </div>
            {(
                [
                    ['copy', 'Disable Copy/Paste', 'Prevent clipboard actions'],
                    ['rightClick', 'Disable Right Click', 'Prevent context menu'],
                ] as const
            ).map(([key, label, hint]) => (
                <div key={key} className="flex items-center justify-between gap-3 border p-4 rounded-lg bg-white">
                    <div className="space-y-0.5">
                        <p className="text-sm font-medium leading-none">{label}</p>
                        <p className="text-xs text-muted-foreground">{hint}</p>
                    </div>
                    <UiSwitch checked={rules[key]} onChange={(v) => set({ [key]: v } as Partial<Rules>)} label={label} />
                </div>
            ))}
        </div>
    );
}

export default function SandboxDemo() {
    const frameRef = useRef<HTMLElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const examRef = useRef<HTMLDivElement>(null);
    const width = useWidth(bodyRef);
    const wide = width >= 820;
    const inView = useInView(frameRef, 0.25);
    const toasts = useToasts(3200);

    const [fsOk] = useState(fullScreenSupported);
    const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
    const [phase, setPhase] = useState<Phase>('ready');
    const [warnings, setWarnings] = useState(0);
    const [synced, setSynced] = useState(0);
    const [dialog, setDialog] = useState<Dialog>(null);
    const [fsLog, setFsLog] = useState<{ event: string; time: string }[]>([]);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [left, setLeft] = useState(START_LEFT);
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, OptionKey>>({});
    const [inFs, setInFs] = useState(false);
    const [pane, setPane] = useState<Pane>('exam');
    const [side, setSide] = useState<'rules' | 'signals'>('rules');
    const [submittedAt, setSubmittedAt] = useState('');
    const [unread, setUnread] = useState(0);

    // Live values for the event listeners, which are attached once per phase.
    const live = useRef({ rules, phase, warnings, inView, inFs });
    live.current = { rules, phase, warnings, inView, inFs };
    const nextId = useRef(1);

    const log = useCallback((title: string, code: string, verdict: Verdict) => {
        const id = nextId.current++;
        setSignals((list) => [{ id, at: now(), title, code, verdict }, ...list].slice(0, 40));
        setUnread((n) => n + 1);
    }, []);

    // The exam clock runs while the demo is watched.
    useEffect(() => {
        if (phase !== 'writing' || !(inView || inFs)) return;
        const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
        return () => window.clearInterval(id);
    }, [phase, inView, inFs]);

    // Warnings reach the exam room with the phone's next heartbeat.
    useEffect(() => {
        if (synced === warnings) return;
        const id = window.setTimeout(() => setSynced(warnings), 1200);
        return () => window.clearTimeout(id);
    }, [warnings, synced]);

    const submit = useCallback(() => {
        setPhase('submitting');
        window.setTimeout(() => {
            setPhase('submitted');
            setSubmittedAt(hhmm());
            setDialog(null);
            exitFull();
        }, 1600);
    }, []);

    /** pages/TestPage.tsx handleViolation, with the limit set on the paper. */
    const violation = useCallback(
        (reason: string) => {
            const { rules: r, warnings: w } = live.current;
            const fs = reason === 'Exited Full Screen';
            if (r.limit === null) {
                setWarnings((n) => n + 1);
                if (!fs) setDialog({ kind: 'violation', title: '⚠️ Violation Detected', message: `${reason} is not allowed!` });
                else toasts.push(`⚠️ Violation: ${reason} is not allowed!`, 'warning');
                return;
            }
            if (r.limit === 0) {
                if (!fs) setDialog({ kind: 'violation', title: 'Strict Mode Violation', message: `${reason} is not allowed. Test Auto-Submitting.` });
                toasts.push(`Strict Mode Violation: ${reason}. Test Auto-Submitting.`, 'error');
                submit();
                return;
            }
            if (w >= r.limit) {
                if (!fs) setDialog({ kind: 'violation', title: 'Maximum Violations Reached', message: `You have reached the maximum limit of violations (${reason}). Test Auto-Submitting.` });
                toasts.push(`Maximum violations reached (${reason}). Test Auto-Submitting.`, 'error');
                submit();
                return;
            }
            setWarnings(w + 1);
            if (!fs) setDialog({ kind: 'violation', title: '⚠️ Warning', message: `Warning ${w + 1}/${r.limit}: ${reason} is not allowed!` });
            else toasts.push(`Warning ${w + 1}/${r.limit}: ${reason} is not allowed!`, 'warning');
        },
        [submit, toasts],
    );

    const watching = () => {
        const s = live.current;
        return s.phase === 'writing' && (s.inView || s.inFs);
    };

    /** The page was hidden: another tab or app, the home screen, a locked phone. */
    const onHidden = useCallback(
        (simulated = false) => {
            if (!watching()) return;
            const counted = live.current.rules.tabSwitch;
            log(simulated ? 'Switched apps (simulated)' : 'Page hidden: you left this tab', 'visibilitychange → hidden', counted ? 'counted' : 'ignored');
            if (counted) violation('Tab Switching / Navigation');
        },
        [log, violation],
    );

    // Real browser signals, while the exam is running.
    useEffect(() => {
        if (phase !== 'writing') return;
        let blurTimer = 0;
        const onVisibility = () => {
            if (document.hidden) onHidden();
            else if (watching()) log('Page visible again', 'visibilitychange → visible', 'info');
        };
        const onBlur = () => {
            // A tab switch blurs the window first; wait to see whether the page was hidden.
            window.clearTimeout(blurTimer);
            blurTimer = window.setTimeout(() => {
                if (!document.hidden && watching()) log('Window lost focus (another window, split screen or the address bar)', 'blur', 'ignored');
            }, 250);
        };
        // Counting only; whether the demo is in full screen is tracked by the effect below.
        const onFullscreen = () => {
            const el = fullScreenElement();
            if (el && el === frameRef.current) {
                setFsLog((l) => [...l, { event: 'Entered Full Screen', time: now() }]);
                return;
            }
            if (!live.current.inFs) return;
            const counted = live.current.rules.fullscreen;
            log('Left full screen', 'fullscreenchange', counted ? 'counted' : 'ignored');
            if (counted) {
                setFsLog((l) => [...l, { event: 'Exit Full Screen', time: now() }]);
                setDialog({ kind: 'fullscreen' });
                violation('Exited Full Screen');
            }
        };
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('blur', onBlur);
        document.addEventListener('fullscreenchange', onFullscreen);
        document.addEventListener('webkitfullscreenchange', onFullscreen);
        return () => {
            window.clearTimeout(blurTimer);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('blur', onBlur);
            document.removeEventListener('fullscreenchange', onFullscreen);
            document.removeEventListener('webkitfullscreenchange', onFullscreen);
        };
    }, [phase, log, onHidden, violation]);

    // Copy, cut, paste and right-click inside the exam screen.
    useEffect(() => {
        const el = examRef.current;
        if (!el || phase !== 'writing') return;
        const onClip = (e: ClipboardEvent) => {
            const blocked = live.current.rules.copy;
            const what = e.type === 'paste' ? 'Paste' : e.type === 'cut' ? 'Cut' : 'Copy';
            if (blocked) {
                e.preventDefault();
                toasts.push('Copy/Paste is disabled for this test.', 'error');
            }
            log(blocked ? `${what} blocked` : `${what}: the text went to your clipboard`, e.type, blocked ? 'blocked' : 'allowed');
        };
        const onMenu = (e: MouseEvent) => {
            const blocked = live.current.rules.rightClick;
            if (blocked) e.preventDefault();
            log(blocked ? 'Right-click blocked: no menu, no “Search Google for…”' : 'Right-click: the menu opened', 'contextmenu', blocked ? 'blocked' : 'allowed');
        };
        el.addEventListener('copy', onClip);
        el.addEventListener('cut', onClip);
        el.addEventListener('paste', onClip);
        el.addEventListener('contextmenu', onMenu);
        return () => {
            el.removeEventListener('copy', onClip);
            el.removeEventListener('cut', onClip);
            el.removeEventListener('paste', onClip);
            el.removeEventListener('contextmenu', onMenu);
        };
    }, [phase, log, toasts]);

    // Whether the demo is in full screen, whatever the phase (the paper can submit itself
    // and leave full screen after the counting listeners are gone).
    useEffect(() => {
        const sync = () => setInFs(!!frameRef.current && fullScreenElement() === frameRef.current);
        document.addEventListener('fullscreenchange', sync);
        document.addEventListener('webkitfullscreenchange', sync);
        return () => {
            document.removeEventListener('fullscreenchange', sync);
            document.removeEventListener('webkitfullscreenchange', sync);
            // Leaving the page (or the demo being removed) never leaves the reader in full screen.
            exitFull();
        };
    }, []);

    const start = () => {
        setPhase('writing');
        setUnread(0);
        if (rules.fullscreen && fsOk && frameRef.current) {
            requestFull(frameRef.current);
            log('Asked the browser for full screen', 'requestFullscreen()', 'info');
        } else if (rules.fullscreen && !fsOk) {
            log('This browser can’t go full screen, so the rule is skipped', 'fullscreenEnabled = false', 'info');
        }
    };

    const returnToFull = () => {
        setDialog(null);
        if (frameRef.current && live.current.phase === 'writing') requestFull(frameRef.current);
    };

    const restart = () => {
        exitFull();
        setRules(DEFAULT_RULES);
        setPhase('ready');
        setWarnings(0);
        setSynced(0);
        setDialog(null);
        setFsLog([]);
        setSignals([]);
        setLeft(START_LEFT);
        setIndex(0);
        setAnswers({});
        setInFs(false);
        setPane('exam');
        setSide('rules');
        setUnread(0);
        toasts.clear();
    };

    // Starting switches the side panel to the signals, where the action is.
    useEffect(() => {
        if (phase === 'writing') setSide('signals');
    }, [phase]);
    useEffect(() => {
        if ((wide && side === 'signals') || (!wide && pane === 'signals')) setUnread(0);
    }, [wide, side, pane, signals.length]);

    const set = (patch: Partial<Rules>) => setRules((r) => ({ ...r, ...patch }));
    const monitored = rules.fullscreen || rules.tabSwitch;
    const busy = phase !== 'writing' || dialog !== null;
    const answered = Object.keys(answers).length;

    /* ── Tip ── */
    let tip: ReactNode;
    if (phase === 'ready') tip = <span key="ready">Choose the rules, then press Start. From then on this page watches like a live exam.</span>;
    else if (phase === 'submitted') tip = <span key="done">The paper submitted itself after {warnings} warning{warnings === 1 ? '' : 's'}. Restart to try other rules.</span>;
    else if (phase === 'submitting') tip = <span key="sub">Limit reached: submitting the paper…</span>;
    else if (signals.length === 0)
        tip = (
            <span key="try">
                Now cheat: switch to another tab or app and come back, copy the question, or right-click it{inFs ? ', or press Esc' : ''}.
            </span>
        );
    else if (!monitored) tip = <span key="off">Monitoring is off: leaving the exam isn’t counted.</span>;
    else tip = <span key={`w${warnings}`}>{rules.limit === null ? `Warnings so far: ${warnings} (warn only).` : rules.limit === 0 ? 'Strict: the first violation submits the paper.' : `Warnings so far: ${warnings} of ${rules.limit} before the paper submits itself.`}</span>;

    /* ── Pieces ── */
    let overlay: ReactNode = null;
    if (phase === 'submitting') overlay = <SubmittingOverlay />;
    else if (dialog?.kind === 'violation') overlay = <ViolationDialog live title={dialog.title} message={dialog.message} onClose={() => setDialog(null)} />;
    else if (dialog?.kind === 'fullscreen') overlay = <FullScreenDialog live log={fsLog} onReturn={returnToFull} />;

    const startCard =
        phase === 'ready' ? (
            <div className="pc-modal-scrim absolute inset-0 z-50 flex items-end bg-slate-900/40 p-3 backdrop-blur-[2px]">
                <div className="pc-stage-in w-full rounded-2xl bg-white p-5 shadow-2xl">
                    <p className="text-[18px] font-bold text-slate-900">Ready to start?</p>
                    <p className="mt-1 text-[14px] leading-snug text-slate-600">
                        {EXAM.paper} · {EXAM.questions} questions · {EXAM.minutes} min
                    </p>
                    <ul className="mt-3 space-y-1.5 text-[13.5px] text-slate-700">
                        {rules.fullscreen && <li>• The exam opens in full screen{fsOk ? '' : ' (not on this browser)'}.</li>}
                        {rules.tabSwitch && <li>• Leaving the exam counts as a violation.</li>}
                        {monitored && <li>• {rules.limit === null ? 'Violations give a warning only.' : rules.limit === 0 ? 'The first violation submits the paper.' : `After ${rules.limit} warnings the paper submits itself.`}</li>}
                        {rules.copy && <li>• Copy and paste are turned off.</li>}
                        {!monitored && !rules.copy && <li>• No exam rules are on.</li>}
                    </ul>
                    <button type="button" onClick={start} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-[0.99]">
                        <Play className="h-5 w-5" /> Start Examination Now
                    </button>
                </div>
            </div>
        ) : null;

    const phone = (
        <div className="pc-sb-phone">
            <Phone
                label="The candidate’s phone"
                time={hhmm()}
                overlay={
                    <>
                        {startCard}
                        {overlay}
                        <Toasts items={toasts.items} />
                    </>
                }
            >
                {phase === 'submitted' ? (
                    <DoneScreen submittedAt={submittedAt} releaseAt="the end of the exam" />
                ) : (
                    <div ref={examRef} className="pc-sb-exam">
                        <ExamScreen
                            live={!busy}
                            index={index}
                            selected={answers[index] ?? null}
                            seconds={left}
                            warnings={monitored ? warnings : null}
                            limit={rules.limit}
                            onSelect={(k) => setAnswers((a) => ({ ...a, [index]: k }))}
                            onClear={() =>
                                setAnswers((a) => {
                                    const next = { ...a };
                                    delete next[index];
                                    return next;
                                })
                            }
                            onNext={() => setIndex((i) => (i + 1) % QUESTIONS.length)}
                        />
                    </div>
                )}
            </Phone>
        </div>
    );

    // What the examiner's exam room shows for this candidate (MonitorPanel's row).
    const room = (
        <div className="pc-sb-room">
            <p className="pc-mini-label">
                In the examiner’s exam room{synced !== warnings ? <span className="pc-sync"> · syncing…</span> : null}
            </p>
            <div className={`${CARD} pc-screen flex items-center gap-3 px-4 py-3`}>
                <Avatar name="You" />
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[15px] font-semibold text-slate-900">You</span>
                        <span className="shrink-0 text-[13px] text-slate-500">{ROLL}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
                        {phase === 'submitted' ? (
                            <span className="text-slate-600">Submitted {submittedAt}</span>
                        ) : phase === 'ready' ? (
                            <span className="text-slate-500">In the lobby</span>
                        ) : (
                            <span className="text-emerald-700">Writing · {clock(left)} left</span>
                        )}
                        <span className="text-slate-500">{answered} answered</span>
                        {synced > 0 && (
                            <span key={synced} className="pc-pop">
                                <Flag icon={AlertTriangle} tone="amber">
                                    {synced} warning{synced === 1 ? '' : 's'}
                                </Flag>
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const signalList = (
        <div className="pc-sb-signals">
            {signals.length === 0 ? (
                <p className="pc-sb-empty">
                    {phase === 'ready' ? 'Nothing yet. Press Start on the exam screen, then try to cheat.' : 'Watching. Switch tabs, copy the question or right-click it.'}
                </p>
            ) : (
                <ol className="pc-sb-log" role="log" aria-live="polite" aria-label="Signals your browser gave this page">
                    {signals.map((s) => (
                        <li key={s.id} className="pc-rise">
                            <span className="pc-sb-time">{s.at}</span>
                            <span className="pc-sb-what">
                                {s.title}
                                <code>{s.code}</code>
                            </span>
                            <span className="pc-sb-verdict" data-v={s.verdict}>
                                {VERDICT[s.verdict]}
                            </span>
                        </li>
                    ))}
                </ol>
            )}
            <div className="pc-sb-sim">
                <button type="button" className="pc-restart" onClick={() => onHidden(true)} disabled={phase !== 'writing'}>
                    <Smartphone aria-hidden="true" /> <span>Can’t switch apps? Simulate it</span>
                </button>
            </div>
        </div>
    );

    const rulesPane = (
        <div className="pc-sb-scroll pc-screen">
            <RulesPanel rules={rules} set={set} fsOk={fsOk} />
        </div>
    );

    return (
        <DemoFrame
            title="Try to cheat on this page"
            tip={tip}
            onRestart={restart}
            wide="lg"
            frameRef={frameRef}
            fullscreen={inFs}
            caption={
                <>
                    A copy of TestoZa’s exam screen and rules, reacting to your own browser. Nothing is sent anywhere, and nothing is counted while the demo is off screen.
                </>
            }
        >
            <div ref={bodyRef} className={`pc-sb${wide ? ' is-wide' : ''}`}>
                {wide ? (
                    <>
                        {phone}
                        <div className="pc-sb-side">
                            <div className="pc-seg pc-seg--full" style={{ ['--n' as string]: 2, ['--i' as string]: side === 'rules' ? 0 : 1 }} role="group" aria-label="Show">
                                <button type="button" aria-pressed={side === 'rules'} onClick={() => setSide('rules')}>
                                    Exam rules
                                </button>
                                <button type="button" aria-pressed={side === 'signals'} onClick={() => setSide('signals')}>
                                    Browser signals{unread > 0 && side !== 'signals' ? ` · ${unread}` : ''}
                                </button>
                            </div>
                            <div className="pc-sb-pane">{side === 'rules' ? rulesPane : signalList}</div>
                            {room}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="pc-seg pc-seg--full" style={{ ['--n' as string]: 3, ['--i' as string]: pane === 'exam' ? 0 : pane === 'rules' ? 1 : 2 }} role="group" aria-label="Show">
                            <button type="button" aria-pressed={pane === 'exam'} onClick={() => setPane('exam')}>
                                Exam
                            </button>
                            <button type="button" aria-pressed={pane === 'rules'} onClick={() => setPane('rules')}>
                                Rules
                            </button>
                            <button type="button" aria-pressed={pane === 'signals'} onClick={() => setPane('signals')}>
                                Signals{unread > 0 && pane !== 'signals' ? ` · ${unread}` : ''}
                            </button>
                        </div>
                        <div className="pc-sb-pane">
                            <div className="pc-sb-card" hidden={pane !== 'exam'}>
                                {phone}
                            </div>
                            {pane === 'rules' && rulesPane}
                            {pane === 'signals' && (
                                <div className="pc-sb-stack">
                                    {room}
                                    {signalList}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </DemoFrame>
    );
}
