import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
    AlertTriangle, ArrowLeft, BarChart3, Check, Copy, KeyRound, Link2, Loader2,
    Pencil, QrCode as QrIcon, Radio, ShieldCheck, Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTestById } from '@/lib/testsApi';
import { copyText, needsSignIn, testInviteText, testLink, whatsappShareLink } from '@/utils/shareUtils';
import { markingSummary } from '@/components/test-builder/marking';
import { CARD, PILL_BTN, PRIMARY_BTN, WhatsAppIcon } from '@/components/dashboard/dashboardUi';
import QrCode from '@/components/exams/QrCode';
import { SEO } from '@/components/SEO';

/**
 * "Send it to your candidates" — the step that did not exist.
 *
 * Saving a paper used to end in `toast.success("Test created successfully!")` and a
 * redirect to a list of tests. The highest-intent moment in the business — the paper is
 * ready, a batch is waiting — was answered with a toast and a table, so in ten months
 * not one teacher ever got a test in front of ten people.
 *
 * This screen answers it with the four things a teacher needs before they press send:
 * the one link, the message their candidates will actually read, a QR code for the
 * classroom projector, and the marking the paper will apply — because the thing that
 * stopped them most often was discovering a negative total after they had shared.
 */
export default function SendTestPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [test, setTest] = useState<any>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

    useEffect(() => {
        if (!id) return;
        let alive = true;
        setState('loading');
        fetchTestById(id).then(({ data }) => {
            if (!alive) return;
            if (data) { setTest(data); setState('ready'); } else { setState('missing'); }
        });
        return () => { alive = false; };
    }, [id]);

    const questions: any[] = useMemo(() => {
        if (!test) return [];
        if (test.enable_section_mode && Array.isArray(test.sections)) {
            return test.sections.flatMap((s: any) => s.questions || []);
        }
        return Array.isArray(test.questions) ? test.questions : [];
    }, [test]);

    const marking = useMemo(() => markingSummary(questions), [questions]);
    const link = test ? testLink(test) : '';
    const message = test ? testInviteText(test) : '';
    const joinCode: string | null = test?.settings?.conduct_exam?.enabled
        ? (test.settings.conduct_exam.join_code || null)
        : null;

    if (state === 'loading') {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
        );
    }

    if (state === 'missing') {
        return (
            <div className="mx-auto max-w-lg px-4 py-20 text-center">
                <h1 className="text-xl font-semibold text-slate-900">We couldn't open that paper</h1>
                <p className="mt-2 text-[15px] text-slate-600">It may have been deleted, or it belongs to another account.</p>
                <Link to="/my-tests" className={`${PRIMARY_BTN} mt-6 h-11 px-5`}>Back to my tests</Link>
            </div>
        );
    }

    const isOwner = !user || !test.created_by || test.created_by === user.id;

    return (
        <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-5 sm:px-6">
            <SEO title="Send your test | TestoZa" description="Send your test to your candidates." noindex />

            <button
                type="button"
                onClick={() => navigate('/my-tests')}
                className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-sky-700 transition-colors hover:bg-sky-50 cursor-pointer"
            >
                <ArrowLeft className="h-4 w-4" /> My tests
            </button>

            <header className="mb-5">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700">
                    <Check className="h-4 w-4" strokeWidth={3} /> Saved
                </p>
                <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[30px]">
                    Send it to your candidates
                </h1>
                <p className="mt-1.5 text-[15px] leading-snug text-slate-600">
                    <span className="font-semibold text-slate-800">{test.title}</span>
                    {marking.count ? ` · ${marking.count} question${marking.count === 1 ? '' : 's'}` : ''}
                    {test.duration ? ` · ${test.duration} min` : ''}
                </p>
            </header>

            {!isOwner && (
                <p className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-[14px] text-amber-900 ring-1 ring-amber-500/20">
                    This paper was made by someone else. You can still share the link, but the marks come to its owner.
                </p>
            )}

            {/* The one thing they came for. */}
            <section className={`${CARD} mb-4 overflow-hidden`}>
                <div className="p-4 sm:p-5">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-slate-500">
                        <Link2 className="h-3.5 w-3.5" /> The link your candidates open
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1.5 pl-3">
                        <span className="min-w-0 flex-1 select-all break-all text-[14px] font-semibold text-slate-800 sm:text-[15px]">{link}</span>
                        <button
                            type="button"
                            onClick={() => copyText(link, 'Link')}
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold text-sky-700 shadow-sm ring-1 ring-slate-900/5 transition-colors hover:bg-sky-50 motion-safe:active:scale-[0.97] cursor-pointer"
                        >
                            <Copy className="h-3.5 w-3.5" /> Copy
                        </button>
                    </div>

                    {/* The single fact that decides whether a teacher presses send. */}
                    {needsSignIn(test) ? (
                        <p className="mt-3.5 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-3 text-[14px] font-medium leading-snug text-amber-900 ring-1 ring-amber-500/20">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <span>
                                <span className="font-bold">Candidates must sign in first.</span> You switched this on in the test's settings. Turn it off there if they should just type their name.
                            </span>
                        </p>
                    ) : (
                        <p className="mt-3.5 flex items-start gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-[14px] font-medium leading-snug text-emerald-900 ring-1 ring-emerald-500/20">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <span>
                                <span className="font-bold">No account and no app needed.</span> Your candidates open the link and type their name. Nothing to install, nothing to sign up for.
                            </span>
                        </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                        <a
                            href={whatsappShareLink(message)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-[15px] font-semibold text-white transition-[filter,transform] hover:brightness-95 motion-safe:active:scale-[0.97]"
                        >
                            <WhatsAppIcon className="h-[18px] w-[18px]" /> Send on WhatsApp
                        </a>
                        <button type="button" onClick={() => copyText(message, 'Message')} className={`${PILL_BTN} h-11 rounded-xl px-4 text-[14px]`}>
                            <Copy className="h-4 w-4 text-sky-600" /> Copy the message
                        </button>
                    </div>
                </div>

                {/* What the candidate actually reads. Shown, not guessed at. */}
                <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:px-5">
                    <p className="mb-2 text-[13px] font-semibold text-slate-500">What your candidates will see</p>
                    <pre className="whitespace-pre-wrap break-words rounded-xl bg-white p-3.5 text-[13.5px] leading-relaxed text-slate-700 ring-1 ring-slate-900/[0.06]">{message}</pre>
                </div>
            </section>

            {/* Marking, before they share rather than after. */}
            <section className={`${CARD} mb-4 p-4 sm:p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-slate-500">Marking</p>
                        {marking.penalised === 0 ? (
                            <p className="mt-1 text-[15px] leading-snug text-slate-800">
                                <span className="font-semibold">A wrong answer scores nothing.</span>{' '}
                                {marking.count} question{marking.count === 1 ? '' : 's'}, {marking.total} marks in total.
                            </p>
                        ) : (
                            <p className="mt-1 flex items-start gap-1.5 text-[15px] leading-snug text-slate-800">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                <span>
                                    <span className="font-semibold text-rose-700">
                                        {marking.uniformPenalty !== null
                                            ? `−${marking.uniformPenalty} for every wrong answer`
                                            : `${marking.penalised} of ${marking.count} questions deduct marks`}
                                    </span>
                                    , so a candidate can finish below zero. {marking.total} marks in total.
                                </span>
                            </p>
                        )}
                    </div>
                    <Link to={`/edit-test/${test.id}`} className={PILL_BTN}>
                        <Pencil className="h-4 w-4 text-sky-600" /> Change marking
                    </Link>
                </div>
            </section>

            <div className="mb-4 grid gap-4 sm:grid-cols-2">
                {/* For the classroom projector and printed slips. */}
                <section className={`${CARD} flex items-center gap-4 p-4`}>
                    <QrCode value={link} size={92} className="shrink-0 ring-1 ring-slate-900/[0.06]" />
                    <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[14px] font-semibold text-slate-900">
                            <QrIcon className="h-4 w-4 text-slate-400" /> QR code
                        </p>
                        <p className="mt-0.5 text-[13px] leading-snug text-slate-600">
                            Project it in class or print it on the slips. Candidates scan it and start.
                        </p>
                    </div>
                </section>

                {joinCode ? (
                    <section className={`${CARD} p-4`}>
                        <p className="flex items-center gap-1.5 text-[14px] font-semibold text-slate-900">
                            <KeyRound className="h-4 w-4 text-slate-400" /> Join code
                        </p>
                        <p className="mt-0.5 text-[13px] leading-snug text-slate-600">
                            For anyone who can't open the link: testoza.com/join
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                            <span className="select-all text-[22px] font-bold tracking-[0.12em] text-slate-900 tabular-nums">
                                {joinCode.slice(0, 3)} {joinCode.slice(3)}
                            </span>
                            <button type="button" onClick={() => copyText(joinCode, 'Code')} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 text-[13px] font-semibold text-sky-700 transition-colors hover:bg-slate-200/80 cursor-pointer">
                                <Copy className="h-3.5 w-3.5" /> Copy
                            </button>
                        </div>
                    </section>
                ) : (
                    <section className={`${CARD} p-4`}>
                        <p className="flex items-center gap-1.5 text-[14px] font-semibold text-slate-900">
                            <Radio className="h-4 w-4 text-slate-400" /> Running it at a fixed time?
                        </p>
                        <p className="mt-0.5 text-[13px] leading-snug text-slate-600">
                            Start an exam sitting instead: everyone enters one join code, you watch who is writing, and the rank list is ready when you end it.
                        </p>
                        <Link to="/exams" className={`${PILL_BTN} mt-2.5`}>Set up an exam sitting</Link>
                    </section>
                )}
            </div>

            <section className={`${CARD} divide-y divide-slate-100`}>
                <NextStep
                    to={`/test-analysis/${test.id}`}
                    icon={BarChart3}
                    title="See who has submitted"
                    body="Marks, accuracy and time per candidate, as soon as each one submits."
                />
                <NextStep
                    to="/batches"
                    icon={Users}
                    title="Keep this batch together"
                    body="Put your candidates in a batch once and the next paper goes out in one tap."
                />
            </section>

            <p className="mt-6 text-center text-[13px] text-slate-500">
                Sent it already?{' '}
                <button type="button" onClick={() => { copyText(link, 'Link'); toast.info('Paste it anywhere — the link never expires.'); }} className="font-semibold text-sky-700 hover:underline cursor-pointer">
                    Copy the link again
                </button>
            </p>
        </div>
    );
}

function NextStep({ to, icon: Icon, title, body }: { to: string; icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
    return (
        <Link to={to} className="flex items-start gap-3.5 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-slate-100 text-slate-500">
                <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-slate-900">{title}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-slate-600">{body}</span>
            </span>
        </Link>
    );
}
