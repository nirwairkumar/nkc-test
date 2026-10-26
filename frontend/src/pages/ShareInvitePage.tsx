import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Check, Copy, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { copyText } from '@/components/dashboard/format';
import { SHARE_APPS, type ShareApp, appShareHref, shareAppById, telegramText, withoutBold } from '@/components/exams/shareApps';
import { analytics } from '@/lib/analytics/tracker';
import { inviteEmail, inviteLink, inviteMessage } from '@/lib/referral';
import { referralsApi } from '@/lib/referralsApi';
import { GiftBadge, PINK_BTN, Sparkles, VIOLET_HERO, Z_CARD } from '@/components/referrals/referralUi';

/**
 * /share-invite/<CODE>?to=<wa|tg|em> — where the invite link's "Scan to share" QR lands,
 * on the educator's own phone. Apps that take a ready message open straight away (once
 * per visit); "any app" needs a tap, because a phone only shows its share sheet after one.
 */
export default function ShareInvitePage() {
    const { code: raw = '' } = useParams();
    const code = raw.replace(/[\s-]/g, '').toUpperCase();
    const [params] = useSearchParams();
    const picked = shareAppById(params.get('to'));
    const [name, setName] = useState<string | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [copied, setCopied] = useState(false);
    const canShareSheet = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

    useEffect(() => {
        document.title = 'Share your invite · TestoZa';
        let cancelled = false;
        referralsApi.info(code)
            .then(info => { if (!cancelled) { setName(info.name); setState('ready'); } })
            .catch(() => { if (!cancelled) setState('error'); });
        analytics.track('referral_qr_open', { via: picked.id });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    // Without the name the message is simply unsigned; the link still works.
    const link = inviteLink(code);
    const text = inviteMessage(name || '', link);
    const email = inviteEmail(name || '', link);

    const opened = useRef(false);
    useEffect(() => {
        if (state === 'loading' || opened.current) return;
        opened.current = true;
        const href = picked.id === 'email'
            ? `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`
            : appShareHref(picked.id, text, link, email.subject);
        if (!href) return;
        const flag = `share_invite_opened_${code}_${picked.id}`;
        try {
            if (sessionStorage.getItem(flag)) return;
            sessionStorage.setItem(flag, '1');
        } catch { /* private mode: open it anyway */ }
        window.location.href = href;
    }, [state, picked.id, text, link, email, code]);

    const copyMessage = async () => {
        if (!(await copyText(text))) {
            toast.error('Could not copy the message');
            return false;
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
        return true;
    };

    const send = async (app: ShareApp) => {
        analytics.track('referral_qr_send', { via: app.id });
        if (app.id === 'any') {
            if (!canShareSheet) {
                if (await copyMessage()) toast.success('Message copied. Paste it in any app.');
                return;
            }
            try {
                await navigator.share({ title: 'TestoZa', text: withoutBold(text) });
            } catch { /* closed the sheet */ }
            return;
        }
        const href = app.id === 'email'
            ? `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`
            : appShareHref(app.id, text, link, email.subject);
        if (href) window.location.href = href;
    };

    const primaryLabel: Record<string, string> = {
        any: canShareSheet ? 'Share invite' : 'Copy message',
        whatsapp: 'Open WhatsApp',
        telegram: 'Open Telegram',
        email: 'Open email',
    };
    const others = SHARE_APPS.filter(a => a.id !== picked.id && a.id !== 'any');
    const AnyIcon = SHARE_APPS[0].Icon;
    const lines = (picked.id === 'telegram' ? telegramText(text) : text).split('\n');

    return (
        <div className="min-h-[100svh] bg-[radial-gradient(120%_60%_at_50%_0%,#ede5ff_0%,#f8f6ff_55%,#ffffff_100%)] px-4 pb-10 pt-6">
            <div className="mx-auto w-full max-w-[420px]">
                <div className="flex justify-center">
                    <img src="/logo-testoza.svg" alt="TestoZa" className="h-7 w-auto" />
                </div>

                <section className={`relative mt-6 overflow-hidden rounded-[26px] px-5 py-6 text-center text-white ${VIOLET_HERO}`}>
                    <Sparkles className="right-0 top-0 h-[110px] w-[190px]" />
                    <GiftBadge size="lg" className="relative mx-auto" />
                    <h1 className="relative mt-4 text-[24px] font-black leading-tight tracking-[-0.02em]">Share your invite</h1>
                    <p className="relative mt-1 text-[14px] text-violet-100/90">
                        {picked.id === 'any' ? 'Send it to any chat or group.' : `Send it on ${picked.label}.`}
                    </p>
                </section>

                <div className={`${Z_CARD} mt-4 p-4`}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Your message</p>
                    {state === 'loading' ? (
                        <div className="flex items-center gap-2 py-6 text-[14px] text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Getting your invite…</div>
                    ) : (
                        <div className="mt-2.5 rounded-2xl rounded-tl-md bg-[#d9fdd3] px-3.5 py-3 text-[14px] leading-[1.5] text-slate-800">
                            {lines.map((line, i) => {
                                if (!line) return <div key={i} className="h-2" />;
                                if (/^https?:\/\//.test(line)) return <p key={i} className="break-all text-[#027eb5] underline">{line}</p>;
                                return <p key={i}>{withoutBold(line)}</p>;
                            })}
                        </div>
                    )}
                    {state === 'error' && <p className="mt-2 text-[12.5px] text-slate-500">Couldn’t load your name, so the message isn’t signed. The link still works.</p>}
                </div>

                <button
                    type="button"
                    disabled={state === 'loading'}
                    onClick={() => send(picked)}
                    className={`${PINK_BTN} mt-5 h-14 w-full text-[17px]`}
                >
                    <picked.Icon className="h-5 w-5" /> {primaryLabel[picked.id]}
                </button>

                <p className="mt-7 text-center text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500">Or send it with</p>
                <div className="mt-3 grid grid-cols-5 gap-1">
                    {others.map(a => (
                        <Tile key={a.id} label={a.label} color={a.color} onClick={() => send(a)} disabled={state === 'loading'}>
                            <a.Icon className="h-6 w-6" />
                        </Tile>
                    ))}
                    <Tile label="SMS" color="#16a34a" disabled={state === 'loading'} onClick={() => { window.location.href = `sms:?&body=${encodeURIComponent(withoutBold(text))}`; }}>
                        <MessageSquare className="h-6 w-6" />
                    </Tile>
                    {picked.id !== 'any' && canShareSheet && (
                        <Tile label="More" color="#5b21b6" onClick={() => send(SHARE_APPS[0])} disabled={state === 'loading'}>
                            <AnyIcon className="h-6 w-6" />
                        </Tile>
                    )}
                    <Tile label={copied ? 'Copied' : 'Copy'} color="#2e0a6b" onClick={() => copyMessage()} disabled={state === 'loading'}>
                        {copied ? <Check className="h-6 w-6" /> : <Copy className="h-6 w-6" />}
                    </Tile>
                </div>
            </div>
        </div>
    );
}

function Tile({ label, color, onClick, disabled, children }: {
    label: string; color: string; onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
    return (
        <button type="button" onClick={onClick} disabled={disabled} className="flex flex-col items-center gap-1.5 rounded-2xl py-2 transition-transform active:scale-95 disabled:opacity-50">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[17px] text-white shadow-[0_10px_22px_-12px_rgba(15,23,42,0.5)]" style={{ backgroundColor: color }}>
                {children}
            </span>
            <span className="text-[12px] font-semibold text-slate-700">{label}</span>
        </button>
    );
}
