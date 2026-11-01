import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, ChevronLeft, Clock, Loader2, Mail, MousePointerClick, Phone, ShieldCheck, User } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import TestoZaLogo from '@/components/TestoZaLogo';
import { cn } from '@/lib/utils';
import {
    FINAL_STEP, SURVEY_Q, forgetSent, isAnswered, isEmailOk, isPhoneOk, loadDraft, newSurveyId, saveDraft, sendSurvey,
    stepsFor, wasSent, type SurveyAnswers, type SurveyQuestion,
} from '@/lib/surveyV1';

/**
 * app.testoza.com/survey/v1 — Survey 1.0, the link we email to educators who made a test.
 *
 *   welcome → what happened → one main reason → one follow-up → last thing → thanks
 *
 * The last screen is all optional: "anything else" and a small "get back to you" block
 * (name, email, phone) for the few who want a reply.
 *
 * One question per screen; a single-choice tap moves on by itself. The draft is kept in
 * localStorage, so a reload lands on the same screen. /survey (once a Google Form embed,
 * removed 2026-10-28) redirects here.
 */

type Phase = 'survey' | 'sending' | 'sent';

const LETTERS = 'ABCDEFGHIJ';
const ADVANCE_MS = 260;

/** How many screens are probably still to come when the path isn't known yet. */
const STILL_TO_COME: Record<string, number> = { status: 3, reason_not_sent: 2, reason_sent: 2 };

export default function SurveyV1Page() {
    const reduceMotion = useReducedMotion();
    const [initial] = useState(loadDraft);
    const [answers, setAnswers] = useState<SurveyAnswers>(initial?.answers ?? {});
    const [at, setAt] = useState<number>(initial?.at ?? -1);
    const [responseId, setResponseId] = useState<string | undefined>(initial?.id);
    const [dir, setDir] = useState<1 | -1>(1);
    // Sent on an earlier visit (and nothing new started): show the thanks, with "Answer again".
    const [returning, setReturning] = useState(() => !initial && wasSent());
    const [phase, setPhase] = useState<Phase>(returning ? 'sent' : 'survey');
    const [error, setError] = useState<string | null>(null);
    const advancing = useRef<number | null>(null);

    const steps = useMemo(() => stepsFor(answers), [answers]);
    const cur = Math.min(at, steps.length - 1);
    const step = cur >= 0 ? steps[cur] : null;

    useEffect(() => {
        if (phase !== 'survey') return;
        const empty = cur < 0 && Object.keys(answers).length === 0;
        saveDraft(empty ? null : { answers, at: cur, id: responseId });
    }, [answers, cur, responseId, phase]);

    useEffect(() => () => { if (advancing.current) window.clearTimeout(advancing.current); }, []);

    const go = useCallback((to: number) => {
        setDir(to > cur ? 1 : -1);
        setAt(to);
        setError(null);
        window.scrollTo({ top: 0 });
    }, [cur]);

    const setAnswer = (id: string, value: string | string[]) => setAnswers((a) => ({ ...a, [id]: value }));

    const choose = (q: SurveyQuestion, key: string) => {
        if (advancing.current) return;
        setAnswer(q.id, key);
        advancing.current = window.setTimeout(() => {
            advancing.current = null;
            go(cur + 1);
        }, reduceMotion ? 0 : ADVANCE_MS);
    };

    const toggle = (q: SurveyQuestion, key: string) => {
        const picked = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
        setAnswer(q.id, picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key]);
    };

    const send = async () => {
        const text = (id: string) => (typeof answers[id] === 'string' ? (answers[id] as string) : '');
        if (!isEmailOk(text('email'))) {
            setError('That email doesn’t look right. Check it, or leave it empty.');
            return;
        }
        if (!isPhoneOk(text('whatsapp'))) {
            setError('That phone number doesn’t look right. Check it, or leave it empty.');
            return;
        }
        const id = responseId || newSurveyId();
        setResponseId(id);
        setPhase('sending');
        setError(null);
        try {
            await sendSurvey(answers, id);
            setPhase('sent');
            window.scrollTo({ top: 0 });
        } catch (err) {
            const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : 'Couldn’t send. Check your internet and try again.');
            setPhase('survey');
        }
    };

    const startAgain = () => {
        forgetSent();
        setReturning(false);
        setAnswers({});
        setResponseId(undefined);
        setAt(-1);
        setPhase('survey');
    };

    const still = step && step !== FINAL_STEP && steps[steps.length - 1] !== FINAL_STEP
        ? STILL_TO_COME[steps[steps.length - 1]] ?? 1
        : 0;
    const progress = phase === 'sent' ? 1 : cur < 0 ? 0 : (cur + 1) / (steps.length + still + 1);

    const screenKey = phase === 'sent' ? 'sent' : step ?? 'welcome';
    const motionProps = reduceMotion
        ? {}
        : {
            initial: { opacity: 0, x: 28 * dir },
            animate: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: -28 * dir },
            transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
        };

    return (
        <div className="min-h-[100dvh] bg-white bg-[radial-gradient(900px_380px_at_50%_-160px,rgba(14,165,233,0.13),transparent)]">
            <Helmet>
                <title>Help us fix TestoZa</title>
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>
            <div className="mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col px-4">
                <header className="flex h-16 shrink-0 items-center gap-3">
                    {phase !== 'sent' && cur >= 0 ? (
                        <>
                            <button
                                type="button"
                                onClick={() => go(cur - 1)}
                                disabled={phase === 'sending'}
                                aria-label="Back"
                                className="-ml-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100" role="progressbar"
                                aria-label="Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                                <motion.div
                                    className="h-full rounded-full bg-sky-500"
                                    initial={false}
                                    animate={{ width: `${Math.max(6, progress * 100)}%` }}
                                    transition={{ type: 'spring', stiffness: 220, damping: 30 }}
                                />
                            </div>
                            <span className="w-10 shrink-0" aria-hidden="true" />
                        </>
                    ) : (
                        <div className="flex flex-1 justify-center"><TestoZaLogo size={28} /></div>
                    )}
                </header>

                <AnimatePresence mode="wait" initial={false}>
                    <motion.main key={screenKey} {...motionProps} className="flex flex-1 flex-col">
                        {phase === 'sent' ? (
                            <Thanks
                                reply={returning ? null
                                    : isAnswered(SURVEY_Q.whatsapp, answers.whatsapp) ? 'phone'
                                        : isAnswered(SURVEY_Q.email, answers.email) ? 'email' : null}
                                returning={returning}
                                onAgain={startAgain}
                            />
                        ) : step === null ? (
                            <Welcome onStart={() => go(0)} resume={Object.keys(answers).length > 0} />
                        ) : step === FINAL_STEP ? (
                            <FinalScreen
                                answers={answers}
                                onChange={setAnswer}
                                onSend={send}
                                sending={phase === 'sending'}
                                error={error}
                            />
                        ) : (
                            <QuestionScreen
                                q={SURVEY_Q[step]}
                                value={answers[step]}
                                onChoose={choose}
                                onToggle={toggle}
                                onText={(v) => setAnswer(step, v)}
                                onNext={() => go(cur + 1)}
                            />
                        )}
                    </motion.main>
                </AnimatePresence>
            </div>
        </div>
    );
}

// ── Screens ───────────────────────────────────────────────────────────────────

function Welcome({ onStart, resume }: { onStart: () => void; resume: boolean }) {
    return (
        <>
            <div className="flex flex-1 flex-col justify-center pb-6 pt-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-sky-600">Survey 1.0</p>
                <h1 className="mt-3 text-[34px] font-extrabold leading-[1.08] tracking-[-0.03em] text-slate-900 sm:text-[40px]">
                    Help us fix TestoZa
                </h1>
                <p className="mt-4 text-[17px] leading-relaxed text-slate-600">
                    You made a test on TestoZa. Tell us honestly what got in the way.
                </p>
                <p className="mt-3 text-[17px] font-semibold leading-relaxed text-slate-900">
                    “It didn’t work for me” is the answer we need most.
                </p>
                <ul className="mt-7 flex flex-wrap gap-2">
                    <Fact icon={ShieldCheck}>No name needed</Fact>
                    <Fact icon={Clock}>1 minute</Fact>
                    <Fact icon={MousePointerClick}>3–5 taps</Fact>
                </ul>
            </div>
            <BottomBar>
                <PrimaryButton onClick={onStart}>
                    {resume ? 'Continue' : 'Start'} <ArrowRight className="h-5 w-5" />
                </PrimaryButton>
            </BottomBar>
        </>
    );
}

function Fact({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
    return (
        <li className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-semibold text-slate-700">
            <Icon className="h-4 w-4 text-sky-600" aria-hidden="true" />
            {children}
        </li>
    );
}

function QuestionScreen({ q, value, onChoose, onToggle, onText, onNext }: {
    q: SurveyQuestion;
    value: string | string[] | undefined;
    onChoose: (q: SurveyQuestion, key: string) => void;
    onToggle: (q: SurveyQuestion, key: string) => void;
    onText: (v: string) => void;
    onNext: () => void;
}) {
    const options = useMemo(() => q.options ?? [], [q]);
    const multi = q.kind === 'multi';
    const picked = multi ? (Array.isArray(value) ? value : []) : [];
    const answered = isAnswered(q, value);

    // A, B, C… picks an answer from the keyboard; Enter moves on when that's allowed.
    useEffect(() => {
        if (!options.length) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const tag = (e.target as HTMLElement | null)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            const i = LETTERS.indexOf(e.key.toUpperCase());
            if (e.key.length === 1 && i >= 0 && i < options.length) {
                e.preventDefault();
                if (multi) onToggle(q, options[i].key);
                else onChoose(q, options[i].key);
            } else if (e.key === 'Enter' && multi && answered) {
                e.preventDefault();
                onNext();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [q, options, multi, answered, onChoose, onToggle, onNext]);

    const hint = multi ? 'Tick all that apply' : q.kind === 'single' ? (q.required ? 'Pick one' : 'Optional · pick one') : 'Optional';

    return (
        <>
            <div className="flex-1 pb-6 pt-2">
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-sky-600">{hint}</p>
                <h1 className="mt-2.5 text-[26px] font-extrabold leading-[1.15] tracking-[-0.025em] text-slate-900 sm:text-[30px]">
                    {q.title}
                </h1>

                {options.length > 0 ? (
                    <div role={multi ? 'group' : 'radiogroup'} aria-label={q.title} className="mt-6 space-y-2.5">
                        {options.map((opt, i) => {
                            const selected = multi ? picked.includes(opt.key) : value === opt.key;
                            return (
                                <OptionCard
                                    key={opt.key}
                                    letter={LETTERS[i]}
                                    label={opt.label}
                                    selected={selected}
                                    multi={multi}
                                    onClick={() => (multi ? onToggle(q, opt.key) : onChoose(q, opt.key))}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <TextBox value={typeof value === 'string' ? value : ''} onChange={onText} placeholder={q.placeholder} label={q.title} className="mt-6" />
                )}

                {q.kind === 'single' && !q.required && (
                    <button type="button" onClick={onNext}
                        className="mt-5 w-full rounded-xl py-2.5 text-[15px] font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700">
                        Skip
                    </button>
                )}
            </div>

            {(multi || q.kind === 'text') && (
                <BottomBar>
                    <PrimaryButton onClick={onNext} disabled={multi && !answered}>
                        {q.kind === 'text' && !answered ? 'Skip' : 'Next'} <ArrowRight className="h-5 w-5" />
                    </PrimaryButton>
                </BottomBar>
            )}
        </>
    );
}

function FinalScreen({ answers, onChange, onSend, sending, error }: {
    answers: SurveyAnswers;
    onChange: (id: string, v: string) => void;
    onSend: () => void;
    sending: boolean;
    error: string | null;
}) {
    const text = (id: string) => (typeof answers[id] === 'string' ? (answers[id] as string) : '');

    return (
        <>
            <div className="flex-1 pb-6 pt-2">
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-sky-600">Last thing · all optional</p>
                <h1 className="mt-2.5 text-[26px] font-extrabold leading-[1.15] tracking-[-0.025em] text-slate-900 sm:text-[30px]">
                    Anything else to tell us?
                </h1>

                <TextBox
                    value={text('anything')}
                    onChange={(v) => onChange('anything', v)}
                    placeholder="Tell us what happened, in your own words"
                    label={SURVEY_Q.anything.title}
                    className="mt-5"
                />

                {/* Small on purpose: only people who want a reply fill it in. */}
                <section aria-labelledby="survey-contact" className="mt-6 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-inset ring-slate-900/[0.05]">
                    <p id="survey-contact" className="text-[14px] font-semibold text-slate-800">Want us to get back to you?</p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500">
                        Optional. Only if you’d like a reply or help with your next test. We won’t share it.
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <SmallInput
                            icon={User}
                            type="text"
                            autoComplete="name"
                            maxLength={120}
                            placeholder={SURVEY_Q.name.placeholder}
                            value={text('name')}
                            onChange={(e) => onChange('name', e.target.value)}
                        />
                        <SmallInput
                            icon={Mail}
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            maxLength={200}
                            placeholder={SURVEY_Q.email.placeholder}
                            value={text('email')}
                            onChange={(e) => onChange('email', e.target.value)}
                            invalid={!isEmailOk(text('email'))}
                        />
                        <SmallInput
                            icon={Phone}
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            maxLength={20}
                            placeholder={SURVEY_Q.whatsapp.placeholder}
                            value={text('whatsapp')}
                            onChange={(e) => onChange('whatsapp', e.target.value)}
                            invalid={!isPhoneOk(text('whatsapp'))}
                            className="sm:col-span-2"
                        />
                    </div>
                </section>
            </div>

            <BottomBar>
                {error && (
                    <p role="alert" className="mb-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[14px] leading-snug text-rose-700">{error}</p>
                )}
                <PrimaryButton onClick={onSend} disabled={sending}>
                    {sending ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending…</> : <>Send answers <ArrowRight className="h-5 w-5" /></>}
                </PrimaryButton>
            </BottomBar>
        </>
    );
}

function Thanks({ reply, returning, onAgain }: { reply: 'phone' | 'email' | null; returning: boolean; onAgain: () => void }) {
    const reduceMotion = useReducedMotion();
    return (
        <>
            <div className="flex flex-1 flex-col items-center justify-center pb-6 text-center">
                <motion.div
                    initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.05 }}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_14px_36px_-10px_rgba(16,185,129,0.65)]"
                >
                    <Check className="h-10 w-10" strokeWidth={3} />
                </motion.div>
                <h1 className="mt-7 text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-slate-900">Thank you!</h1>
                <p className="mt-3 max-w-[340px] text-[17px] leading-relaxed text-slate-600">
                    {returning ? 'You’ve already answered. It helps us decide what to fix first.' : 'This helps us decide what to fix first.'}
                </p>
                {reply && (
                    <p className="mt-2 max-w-[340px] text-[15px] leading-relaxed text-slate-500">
                        {reply === 'phone' ? 'We’ll get back to you on WhatsApp.' : 'We’ll get back to you by email.'}
                    </p>
                )}
                {returning && (
                    <button type="button" onClick={onAgain}
                        className="mt-5 rounded-full px-4 py-2 text-[14px] font-semibold text-sky-700 transition-colors hover:bg-sky-50">
                        Answer again
                    </button>
                )}
            </div>
            <BottomBar>
                <Link to="/" className={PRIMARY}>Go to TestoZa <ArrowRight className="h-5 w-5" /></Link>
            </BottomBar>
        </>
    );
}

// ── Pieces ────────────────────────────────────────────────────────────────────

function OptionCard({ letter, label, selected, multi, onClick }: {
    letter: string;
    label: string;
    selected: boolean;
    multi: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={selected}
            onClick={onClick}
            className={cn(
                'flex min-h-[60px] w-full items-center gap-3.5 rounded-2xl bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)] ring-1 ring-slate-200 transition-[box-shadow,background-color,transform] duration-150',
                'hover:ring-slate-300 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
                selected && 'bg-sky-50/70 ring-2 ring-sky-500 hover:ring-sky-500',
            )}
        >
            <span
                aria-hidden="true"
                className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-bold transition-colors',
                    selected ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500',
                )}
            >
                {selected && multi ? <Check className="h-4 w-4" strokeWidth={3} /> : letter}
            </span>
            <span className={cn('flex-1 text-[16px] font-semibold leading-snug', selected ? 'text-slate-900' : 'text-slate-800')}>
                {label}
            </span>
            {selected && !multi && <Check className="h-5 w-5 shrink-0 text-sky-600" strokeWidth={3} aria-hidden="true" />}
        </button>
    );
}

function TextBox({ value, onChange, placeholder, label, className }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
}) {
    return (
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-label={label}
            rows={4}
            maxLength={2000}
            className={cn(
                'block w-full resize-none rounded-2xl bg-slate-50 px-4 py-3.5 text-[16px] leading-relaxed text-slate-900 outline-none ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500',
                className,
            )}
        />
    );
}

function SmallInput({ icon: Icon, invalid, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & {
    icon: React.ElementType;
    invalid?: boolean;
}) {
    // Red only after leaving the box, not while someone is still typing their email.
    const [left, setLeft] = useState(false);
    const bad = !!invalid && left;
    return (
        <label className={cn('relative block', className)}>
            <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
                {...props}
                onFocus={(e) => { setLeft(false); props.onFocus?.(e); }}
                onBlur={(e) => { setLeft(true); props.onBlur?.(e); }}
                aria-label={props.placeholder}
                aria-invalid={bad}
                className={cn(
                    // 16px on phones stops iOS zooming in; smaller on wider screens.
                    'h-11 w-full rounded-xl bg-white pl-9 pr-3 text-[16px] text-slate-900 outline-none ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 sm:text-[14px]',
                    bad && 'ring-2 ring-rose-400 focus:ring-rose-500',
                )}
            />
        </label>
    );
}

const PRIMARY =
    'flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[16px] font-bold text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.55)] transition-[transform,background-color] hover:bg-slate-800 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none';

function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button type="button" {...props} className={PRIMARY}>{children}</button>;
}

function BottomBar({ children }: { children: React.ReactNode }) {
    return (
        <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-white via-white to-white/0 px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-5">
            {children}
        </div>
    );
}
