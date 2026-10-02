/**
 * Exam rules, tried from the candidate's side. Left: the rules as TestoZa's test
 * settings show them (components/TestSettingsPanel.tsx, "Proctoring & Security");
 * right: a candidate's phone on the exam screen. The reader switches to WhatsApp,
 * leaves full screen, copies the question or presses Back, and sees what the product
 * does (pages/TestPage.tsx handleViolation and the copy, context-menu and back-button
 * guards), and what reaches the teacher's exam room with the next heartbeat.
 *
 * Two product details are drawn as they should read (both are flagged in the guide's
 * notes): the warning counter shows the chosen limit (the app always prints "/3"), and
 * "Strict (Instant Submit)" is left out, because the app reads a limit of 0 as "no
 * limit" (`violation_limit || null`).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, Copy, Maximize, MessageCircle, Minimize2, Smartphone } from 'lucide-react';
import { clock } from '@/components/exams/examFormat';
import { EXAM } from '@/guides/conductData';
import { CARD, Avatar, DemoFrame, Flag, Phone, Toasts, UiSwitch, useInView, useToasts, useWidth } from './replica';
import { DoneStage, JoinPageFrame } from './joinScreens';
import ExamScreen, { FullScreenDialog, SubmittingOverlay, ViolationDialog, type OptionKey } from './examScreen';

const NAME = 'Meera Joshi';
const ROLL = '12A-13';
/** Exam time on the phone when the demo starts: 27:40 left, 10:02 am. */
const START_LEFT = 27 * 60 + 40;

interface Rules {
    fullscreen: boolean;
    tabSwitch: boolean;
    /** null = warn only. */
    limit: number | null;
    copy: boolean;
    rightClick: boolean;
    back: boolean;
}

const DEFAULT_RULES: Rules = { fullscreen: true, tabSwitch: true, limit: 3, copy: true, rightClick: true, back: true };

type Dialog = { kind: 'violation'; title: string; message: string } | { kind: 'fullscreen' } | null;

const clockAt = (left: number) => {
    const elapsed = EXAM.minutes * 60 - left;
    const m = 10 * 60 + Math.floor(elapsed / 60);
    return `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, '0')}`;
};

function Rule({ label, hint, icon, checked, onChange }: { label: string; hint: string; icon?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
                <p className="text-base font-medium leading-none flex items-center gap-2">
                    {icon}
                    {label}
                </p>
                <p className="text-sm text-muted-foreground">{hint}</p>
            </div>
            <UiSwitch checked={checked} onChange={onChange} label={label} />
        </div>
    );
}

export default function RulesDemo() {
    const rootRef = useRef<HTMLElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const width = useWidth(bodyRef);
    const wide = width >= 880;
    const visible = useInView(rootRef, 0.2);
    const phone = useToasts(3200);

    const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
    const [warnings, setWarnings] = useState(0);
    const [synced, setSynced] = useState(0);
    const [dialog, setDialog] = useState<Dialog>(null);
    const [log, setLog] = useState<{ event: string; time: string }[]>([]);
    const [state, setState] = useState<'writing' | 'submitting' | 'submitted'>('writing');
    const [left, setLeft] = useState(START_LEFT);
    const [index, setIndex] = useState(6);
    const [answers, setAnswers] = useState<Record<number, OptionKey>>({});
    const [note, setNote] = useState<string | null>(null);
    const [submittedAt, setSubmittedAt] = useState('');

    // The exam clock runs in real time while the demo is on screen.
    useEffect(() => {
        if (!visible || state !== 'writing') return;
        const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
        return () => window.clearInterval(id);
    }, [visible, state]);

    // Warnings reach the exam room with the phone's next heartbeat.
    useEffect(() => {
        if (synced === warnings) return;
        const id = window.setTimeout(() => setSynced(warnings), 1200);
        return () => window.clearTimeout(id);
    }, [warnings, synced]);

    const stamp = () => {
        const elapsed = EXAM.minutes * 60 - left;
        const total = 10 * 3600 + elapsed;
        return `${String(Math.floor(total / 3600) % 12 || 12).padStart(2, '0')}:${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    };

    const submitNow = useCallback(() => {
        setState('submitting');
        window.setTimeout(() => {
            setState('submitted');
            setSubmittedAt(`${clockAt(left)} am`);
            setDialog(null);
        }, 1600);
    }, [left]);

    /** pages/TestPage.tsx handleViolation, with the limit the teacher chose. */
    const violation = (reason: string) => {
        const fs = reason === 'Exited Full Screen';
        const limit = rules.limit;
        if (limit === null) {
            setWarnings((w) => w + 1);
            if (!fs) setDialog({ kind: 'violation', title: '⚠️ Violation Detected', message: `${reason} is not allowed!` });
            else phone.push(`⚠️ Violation: ${reason} is not allowed!`, 'warning');
            return;
        }
        if (warnings >= limit) {
            if (!fs) setDialog({ kind: 'violation', title: 'Maximum Violations Reached', message: `You have reached the maximum limit of violations (${reason}). Test Auto-Submitting.` });
            phone.push(`Maximum violations reached (${reason}). Test Auto-Submitting.`, 'error');
            window.setTimeout(submitNow, fs ? 300 : 900);
            return;
        }
        setWarnings((w) => w + 1);
        if (!fs) setDialog({ kind: 'violation', title: '⚠️ Warning', message: `Warning ${warnings + 1}/${limit}: ${reason} is not allowed!` });
        else phone.push(`Warning ${warnings + 1}/${limit}: ${reason} is not allowed!`, 'warning');
    };

    const busy = state !== 'writing' || dialog !== null;

    const tryApp = () => {
        if (busy) return;
        if (!rules.tabSwitch) return setNote('Nothing is recorded: app-switch detection is off.');
        setNote(null);
        violation('Tab Switching / Navigation');
    };
    const tryFullscreen = () => {
        if (busy) return;
        if (!rules.fullscreen) return setNote('Full screen isn’t required, so leaving it changes nothing.');
        setNote(null);
        setLog((l) => [...l, { event: 'Exit Full Screen', time: stamp() }]);
        setDialog({ kind: 'fullscreen' });
        violation('Exited Full Screen');
    };
    const tryCopy = () => {
        if (busy) return;
        if (!rules.copy) return setNote('Copied. With the rule off, nothing stops it.');
        setNote(null);
        phone.push('Copy/Paste is disabled for this test.', 'error');
    };
    const tryBack = () => {
        if (busy) return;
        if (!rules.back) return setNote('With the rule off, Back would leave the exam page.');
        setNote(null);
        phone.push('Back navigation is disabled during the test.', 'warning');
    };

    const restart = () => {
        setRules(DEFAULT_RULES);
        setWarnings(0);
        setSynced(0);
        setDialog(null);
        setLog([]);
        setState('writing');
        setLeft(START_LEFT);
        setIndex(6);
        setAnswers({});
        setNote(null);
        phone.clear();
    };

    const set = (patch: Partial<Rules>) => setRules((r) => ({ ...r, ...patch }));
    const monitored = rules.fullscreen || rules.tabSwitch;

    const settings = (
        <div className="co-window co-rules-window">
            <div className="co-window-bar">
                <div className="co-window-lights" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                </div>
                <div className="co-window-url co-window-url--title">Test settings · Proctoring &amp; Security</div>
            </div>
            <div className="co-window-body co-screen bg-white">
                <div className="co-rules-scroll">
                    <div className="space-y-4 p-4">
                        <div className="flex flex-col gap-4 border p-4 rounded-lg bg-slate-50">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monitoring</p>
                            <Rule
                                label="Force Full Screen"
                                hint="User must enter full screen to start. Exiting counts as a violation."
                                icon={<Maximize className="w-4 h-4 text-blue-500" />}
                                checked={rules.fullscreen}
                                onChange={(v) => set({ fullscreen: v })}
                            />
                            <hr className="border-slate-200" />
                            <Rule
                                label="Tab/App Switch Detection"
                                hint="Detect if user switches tabs/apps or minimizes browser."
                                icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
                                checked={rules.tabSwitch}
                                onChange={(v) => set({ tabSwitch: v })}
                            />
                            {monitored && (
                                <>
                                    <hr className="border-slate-200" />
                                    <div className="space-y-3">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Violation Action</p>
                                        <div className="flex flex-col gap-2">
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input type="radio" name="co-vl" checked={rules.limit === null} onChange={() => set({ limit: null })} className="accent-primary" />
                                                <span className="text-sm font-normal leading-none">No limit (Warn only)</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input type="radio" name="co-vl" checked={rules.limit !== null} onChange={() => set({ limit: 3 })} className="accent-primary" />
                                                <span className="text-sm font-normal leading-none flex items-center gap-2">
                                                    <select
                                                        value={rules.limit ?? 3}
                                                        disabled={rules.limit === null}
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
                        <div className={wide ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'}>
                            {(
                                [
                                    ['copy', 'Disable Copy/Paste', 'Prevent clipboard actions'],
                                    ['rightClick', 'Disable Right Click', 'Prevent context menu'],
                                    ['back', 'Block Back Button', 'Prevent accidental navigation'],
                                ] as const
                            ).map(([key, label, hint]) => (
                                <div key={key} className="flex items-center justify-between gap-3 border p-4 rounded-lg">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium leading-none">{label}</p>
                                        <p className="text-xs text-muted-foreground">{hint}</p>
                                    </div>
                                    <UiSwitch checked={rules[key]} onChange={(v) => set({ [key]: v } as Partial<Rules>)} label={label} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // What the teacher's exam room shows for this candidate (MonitorPanel's row).
    const room = (
        <div className="co-rules-room">
            <p className="co-mini-label">In the exam room{synced !== warnings ? <span className="co-sync"> · syncing…</span> : null}</p>
            <div className={`${CARD} co-screen flex items-center gap-3 px-4 py-3`}>
                <Avatar name={NAME} />
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[15px] font-semibold text-slate-900">{NAME}</span>
                        <span className="shrink-0 text-[13px] text-slate-500">{ROLL}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
                        {state === 'submitted' ? <span className="text-slate-600">Submitted {submittedAt}</span> : <span className="text-emerald-700">Writing · {clock(left)} left</span>}
                        <span className="text-slate-500">{Object.keys(answers).length + 6} answered</span>
                        {synced > 0 && (
                            <span key={synced} className="co-pop">
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

    const tries = (
        <div className="co-try" role="group" aria-label="Try it as the candidate">
            <p className="co-mini-label">Try it as {NAME.split(' ')[0]}</p>
            <div className="co-try-buttons">
                <button type="button" onClick={tryApp} disabled={busy}>
                    <MessageCircle aria-hidden="true" /> Switch to WhatsApp
                </button>
                <button type="button" onClick={tryFullscreen} disabled={busy}>
                    <Minimize2 aria-hidden="true" /> Leave full screen
                </button>
                <button type="button" onClick={tryCopy} disabled={busy}>
                    <Copy aria-hidden="true" /> Copy the question
                </button>
                <button type="button" onClick={tryBack} disabled={busy}>
                    <ArrowLeft aria-hidden="true" /> Press Back
                </button>
            </div>
            <p className="co-try-note" aria-live="polite">
                {note ? <span key={note}>{note}</span> : state === 'submitted' ? <span>The paper submitted itself. Restart to try again.</span> : <span>&nbsp;</span>}
            </p>
        </div>
    );

    let overlay: ReactNode = null;
    if (state === 'submitting') overlay = <SubmittingOverlay />;
    else if (dialog?.kind === 'violation') overlay = <ViolationDialog live title={dialog.title} message={dialog.message} onClose={() => setDialog(null)} />;
    else if (dialog?.kind === 'fullscreen')
        overlay = (
            <FullScreenDialog
                live
                log={log}
                onReturn={() => {
                    setLog((l) => [...l, { event: 'Entered Full Screen', time: stamp() }]);
                    setDialog(null);
                }}
            />
        );

    const phoneEl = (
        <Phone
            label={`${NAME}’s phone`}
            time={clockAt(left)}
            overlay={
                <>
                    {overlay}
                    <Toasts items={phone.items} compact />
                </>
            }
        >
            {state === 'submitted' ? (
                <div className="co-phone-scroll">
                    <JoinPageFrame>
                        <div className="co-stage-in">
                            <DoneStage name={NAME} submittedAt={submittedAt} releaseAt="10:45 am" />
                        </div>
                    </JoinPageFrame>
                </div>
            ) : (
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
                    onNext={() => setIndex((i) => Math.min(EXAM.questions - 1, i + 1))}
                />
            )}
        </Phone>
    );

    return (
        <DemoFrame
            frameRef={rootRef}
            title="Exam rules, from the candidate’s side"
            tip={
                <span>
                    {monitored ? `Warnings so far: ${warnings}${rules.limit !== null ? ` of ${rules.limit} before the paper submits itself` : ' (warn only)'}.` : 'Monitoring is off: nothing a candidate does is counted.'}
                </span>
            }
            onRestart={restart}
            wide="lg"
            caption={
                <>
                    A copy of TestoZa’s exam rules and exam screen; nothing is sent anywhere. <Smartphone aria-hidden="true" className="co-inline-icon" /> On a real phone, the rules react to the actual app switch or exit
                    from full screen.
                </>
            }
        >
            <div ref={bodyRef} className={`co-rules${wide ? ' is-wide' : ''}`}>
                <div className="co-rules-main">
                    {settings}
                    {wide && tries}
                    {wide && room}
                </div>
                <div className="co-rules-side">
                    {phoneEl}
                    {!wide && tries}
                    {!wide && room}
                </div>
            </div>
        </DemoFrame>
    );
}
