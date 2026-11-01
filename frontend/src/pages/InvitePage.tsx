import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart3, CheckCircle2, FileUp, Loader2, PartyPopper, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { analytics } from '@/lib/analytics/tracker';
import { referralVisitorId, rememberReferral } from '@/lib/referral';
import { referralsApi, type ReferrerInfo } from '@/lib/referralsApi';
import { roleLabel } from '@/lib/roleLabel';
import { GiftBadge, PINK_BTN, PersonAvatar, SOFT_BTN, Sparkles, VIOLET_HERO, Z_CARD } from '@/components/referrals/referralUi';

const CODE_RE = /^[A-Z0-9]{6,12}$/;

/**
 * /invite/<CODE> — where an educator's invite link lands. Greets the visitor with who
 * invited them, keeps the code in this browser (lib/referral) and opens sign-up. The
 * first sign-in afterwards credits the inviter (hooks/useReferralClaim, in Layout).
 * Link previews for this URL come from functions/invite/[[code]].js.
 */
export default function InvitePage() {
    const { code: raw = '' } = useParams();
    const code = raw.replace(/[\s-]/g, '').toUpperCase();
    const { user, profile, loading } = useAuth();
    const { openAuthModal } = useAuthModal();
    const navigate = useNavigate();
    const [referrer, setReferrer] = useState<ReferrerInfo | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'offline'>(CODE_RE.test(code) ? 'loading' : 'invalid');
    // Signed in before the page loaded = an existing account, which an invite can't credit.
    const arrivedSignedIn = useRef<boolean | null>(null);
    if (!loading && arrivedSignedIn.current === null) arrivedSignedIn.current = !!user;

    useEffect(() => {
        document.title = 'You’re invited to TestoZa';
        if (!CODE_RE.test(code)) return;
        let cancelled = false;
        referralsApi.open(code, referralVisitorId())
            .then(info => {
                if (cancelled) return;
                setReferrer(info);
                setState('ready');
            })
            .catch(err => {
                if (!cancelled) setState(err?.response?.status === 404 ? 'invalid' : 'offline');
            });
        return () => { cancelled = true; };
    }, [code]);

    // Keep the code for sign-up. Offline still keeps it: the backend checks it at claim time.
    useEffect(() => {
        if (loading || arrivedSignedIn.current || (state !== 'ready' && state !== 'offline')) return;
        if (!user) rememberReferral(referrer?.code || code, referrer?.name);
    }, [loading, user, state, referrer, code]);

    useEffect(() => {
        if (state !== 'loading') analytics.track('referral_invite_view', { state, signed_in: !!user });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state]);

    const signUp = () => {
        analytics.track('referral_signup_click', { state });
        openAuthModal({ view: 'signup' });
    };

    const first = referrer?.first_name || 'An educator';
    const designation = profile?.designation || user?.user_metadata?.designation;
    const justJoined = !!user && arrivedSignedIn.current === false;

    return (
        <div className="min-h-[100svh] bg-[radial-gradient(120%_60%_at_50%_0%,#ede5ff_0%,#f8f6ff_55%,#ffffff_100%)] px-4 pb-10 pt-6">
            <div className="mx-auto w-full max-w-[440px]">
                <a href="/" className="mx-auto flex w-fit items-center" aria-label="TestoZa home">
                    <img src="/logo-testoza.svg" alt="TestoZa" className="h-7 w-auto" />
                </a>

                {/* Who invited you */}
                <section className={`relative mt-6 overflow-hidden rounded-[28px] px-6 pb-6 pt-7 text-center text-white shadow-[0_30px_60px_-30px_rgba(46,10,107,0.8)] ${VIOLET_HERO}`}>
                    <Sparkles className="right-0 top-0 h-[120px] w-[200px]" />
                    {state === 'loading' ? (
                        <div className="flex h-[188px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-violet-200" /></div>
                    ) : (
                        <>
                            <div className="relative mx-auto w-fit">
                                {referrer
                                    ? <PersonAvatar name={referrer.name} url={referrer.avatar_url} size={76} />
                                    : <GiftBadge size="lg" />}
                                {referrer && <GiftBadge size="sm" className="absolute -bottom-1 -right-3" />}
                            </div>
                            <p className="relative mt-4 text-[11.5px] font-bold uppercase tracking-[0.18em] text-[#ffe066]">
                                {justJoined ? 'You’re in' : state === 'invalid' ? 'Invite link' : 'You’re invited'}
                            </p>
                            <h1 className="relative mt-1 text-[26px] font-black leading-[1.12] tracking-[-0.02em]">
                                {justJoined
                                    ? `Welcome to TestoZa${user?.user_metadata?.full_name ? `, ${String(user.user_metadata.full_name).split(' ')[0]}` : ''}!`
                                    : state === 'invalid'
                                        ? 'This invite link doesn’t work'
                                        : referrer ? `${first} invited you to TestoZa` : 'You’re invited to TestoZa'}
                            </h1>
                            <p className="relative mx-auto mt-2 max-w-[32ch] text-[14.5px] leading-relaxed text-violet-100/90">
                                {justJoined
                                    ? `${referrer ? first : 'Your colleague'} will see that you joined. Let’s get your first test ready.`
                                    : state === 'invalid'
                                        ? 'It may have been typed wrong. You can still make your account below.'
                                        : 'Make online tests and exams for your students, and get every result on its own.'}
                            </p>
                            {referrer && !justJoined && (
                                <span className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/[0.14] px-3 py-1.5 text-[12.5px] font-semibold ring-1 ring-inset ring-white/25">
                                    <CheckCircle2 className="h-4 w-4 text-[#7dffb2]" />
                                    Invite code <span className="font-black tracking-[0.08em]">{referrer.code}</span> applied
                                </span>
                            )}
                            {referrer?.designation && !justJoined && (
                                <p className="relative mt-2 text-[12px] text-violet-200/80">{referrer.name} · {roleLabel(referrer.designation)} on TestoZa</p>
                            )}
                        </>
                    )}
                </section>

                {justJoined ? (
                    <div className="mt-5 space-y-3">
                        <div className={`${Z_CARD} flex items-start gap-3 p-4`}>
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><PartyPopper className="h-5 w-5" /></span>
                            <p className="text-[14px] leading-relaxed text-slate-700">
                                Next: upload a question paper, or type your first few questions. Your test will be ready to send in minutes.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (designation) {
                                    navigate('/dashboard');
                                    return;
                                }
                                try { localStorage.setItem('auth_redirect_intent', '/dashboard'); } catch { /* storage blocked */ }
                                navigate('/onboarding');
                            }}
                            className={`${PINK_BTN} h-14 w-full text-[17px]`}
                        >
                            {designation ? 'Go to your dashboard' : 'Finish setting up'}
                        </button>
                    </div>
                ) : user ? (
                    <div className="mt-5 space-y-3">
                        <p className={`${Z_CARD} p-4 text-center text-[14px] leading-relaxed text-slate-700`}>
                            You already have a TestoZa account{user.email ? ` (${user.email})` : ''}, so this invite is meant for someone new.
                            Pass it on, or send colleagues your own link.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => navigate('/dashboard')} className={`${PINK_BTN} h-12 text-[15px]`}>Dashboard</button>
                            <button type="button" onClick={() => navigate('/settings?tab=referrals')} className={`${SOFT_BTN} h-12 text-[15px]`}>My invite link</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Why it's worth a minute */}
                        <ul className={`${Z_CARD} mt-5 divide-y divide-slate-100`}>
                            <Benefit icon={FileUp} tone="bg-violet-50 text-violet-600" title="A question paper becomes an online test" text="Upload a PDF, Word file or a photo. It's ready in about a minute." />
                            <Benefit icon={Smartphone} tone="bg-pink-50 text-[#e11d58]" title="Students write it on their phones" text="No app to install. Full screen, tab-switch and copy-paste checks built in." />
                            <Benefit icon={BarChart3} tone="bg-emerald-50 text-emerald-600" title="Marks, ranks and Excel on their own" text="Every answer is checked the moment a student submits." />
                        </ul>

                        <button type="button" onClick={signUp} disabled={state === 'loading'} className={`${PINK_BTN} mt-5 h-14 w-full text-[17px]`}>
                            Create your account
                        </button>
                        <p className="mt-3 text-center text-[13.5px] text-slate-600">
                            Already on TestoZa?{' '}
                            <button type="button" onClick={() => openAuthModal({ view: 'login' })} className="font-bold text-[#5b21b6] hover:underline cursor-pointer">Sign in</button>
                        </p>
                        {referrer && (
                            <p className="mt-6 text-center text-[12px] leading-relaxed text-slate-400">
                                Your invite from {referrer.name} is saved in this browser. Sign up here and it’s linked to you.
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function Benefit({ icon: Icon, tone, title, text }: { icon: React.ComponentType<{ className?: string }>; tone: string; title: string; text: string }) {
    return (
        <li className="flex items-start gap-3.5 px-4 py-3.5">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></span>
            <span>
                <span className="block text-[15px] font-extrabold leading-snug text-[#2e0a6b]">{title}</span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-slate-500">{text}</span>
            </span>
        </li>
    );
}
