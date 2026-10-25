import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Check, Copy, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { fetchTestById } from '@/lib/testsApi';
import { examInviteText, getExamUrl } from '@/lib/conductExam';
import { shareLink } from '@/utils/canonicalUrl';
import { analytics } from '@/lib/analytics/tracker';
import { copyText } from '@/components/dashboard/format';
import {
    SHARE_APPS, type ShareApp, appShareHref, shareAppById, withoutBold,
} from '@/components/exams/shareApps';

/**
 * /share-exam/<exam>?to=<wa|tg|em> — where the "Scan to share" QR on a live exam card lands,
 * on the examiner's own phone. Apps that take a ready message (WhatsApp, Telegram, email)
 * open straight away; "any app" needs one tap, because a phone only shows its share
 * sheet after a tap.
 */
export default function ShareExamPage() {
    const { key = '' } = useParams();
    const [params] = useSearchParams();
    const picked = shareAppById(params.get('to') || params.get('via'));
    const [test, setTest] = useState<any>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [copied, setCopied] = useState(false);
    const canShareSheet = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

    useEffect(() => {
        document.title = 'Share your exam · TestoZa';
        let cancelled = false;
        fetchTestById(key, undefined, true).then(({ data, error }) => {
            if (cancelled) return;
            if (error || !data) setState('error');
            else {
                setTest(data);
                setState('ready');
            }
        });
        analytics.track('exam_share_qr_open', { via: picked.id });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    // Without the exam's details the message is just the link, which still works.
    const link = test ? getExamUrl(test) : shareLink(`/test/${key}`);
    const title = test?.title || 'Exam';
    const text = test ? examInviteText(test) : `Exam link:\n${link}`;

    // Go straight to the picked app, once per visit, so a reload doesn't bounce there again.
    const opened = useRef(false);
    useEffect(() => {
        if (state === 'loading' || opened.current) return;
        opened.current = true;
        const href = appShareHref(picked.id, text, link, title);
        if (!href) return;
        const flag = `share_exam_opened_${key}_${picked.id}`;
        try {
            if (sessionStorage.getItem(flag)) return;
            sessionStorage.setItem(flag, '1');
        } catch { /* private mode: open it anyway */ }
        window.location.href = href;
    }, [state, picked.id, text, link, title, key]);

    const copyMessage = async () => {
        const ok = await copyText(text);
        if (!ok) {
            toast.error('Could not copy the message');
            return false;
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
        return true;
    };

    const send = async (app: ShareApp) => {
        analytics.track('exam_share_qr_send', { via: app.id });
        if (app.id === 'any') {
            if (!canShareSheet) {
                if (await copyMessage()) toast.success('Message copied. Paste it in any app.');
                return;
            }
            try {
                await navigator.share({ title, text: withoutBold(text) });
            } catch { /* closed the sheet */ }
            return;
        }
        const href = appShareHref(app.id, text, link, title);
        if (href) window.location.href = href;
    };

    const primaryLabel: Record<string, string> = {
        any: canShareSheet ? 'Share' : 'Copy message',
        whatsapp: 'Open WhatsApp',
        telegram: 'Open Telegram',
        email: 'Open email',
    };
    const others = SHARE_APPS.filter(a => a.id !== picked.id && a.id !== 'any');
    const AnyAppIcon = SHARE_APPS[0].Icon;
    const lines = text.split('\n');

    return (
        <div className="min-h-[100svh] bg-[radial-gradient(120%_60%_at_50%_0%,#e0f2fe_0%,#f8fafc_55%,#ffffff_100%)] px-4 pb-10 pt-6">
            <div className="mx-auto w-full max-w-[420px]">
                <div className="flex items-center justify-center">
                    <img src="/logo-testoza.svg" alt="TestoZa" className="h-7 w-auto" />
                </div>

                <div className="mt-6 text-center">
                    <span
                        className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] text-white shadow-[0_14px_30px_-12px_rgba(15,23,42,0.45)]"
                        style={{ backgroundColor: picked.color }}
                    >
                        <picked.Icon className="h-7 w-7" />
                    </span>
                    <h1 className="mt-4 text-[24px] font-bold leading-tight tracking-[-0.02em] text-slate-900">Share your exam</h1>
                    <p className="mt-1 text-[14px] text-slate-600">
                        {picked.id === 'any' ? 'Send it to any chat, group or channel.' : `Send it on ${picked.label}.`}
                    </p>
                </div>

                {/* The message, as the group will read it */}
                <div className="mt-6 overflow-hidden rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_20px_44px_-28px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/[0.06]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Your message</p>
                    {state === 'loading' ? (
                        <div className="flex items-center gap-2 py-6 text-[14px] text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" /> Getting your exam…
                        </div>
                    ) : (
                        <div className="mt-2.5 rounded-2xl rounded-tl-md bg-[#e7fbe3] px-3.5 py-3 text-[14px] leading-[1.5] text-slate-800">
                            {lines.map((line, i) => {
                                if (!line) return <div key={i} className="h-2" />;
                                const bold = line.match(/^\*(.+)\*$/);
                                if (bold) return <p key={i} className="font-semibold text-slate-900">{bold[1]}</p>;
                                if (/^https?:\/\//.test(line)) return <p key={i} className="break-all text-[#027eb5] underline">{line}</p>;
                                return <p key={i}>{line}</p>;
                            })}
                        </div>
                    )}
                    {state === 'error' && (
                        <p className="mt-2 text-[12.5px] text-slate-500">Couldn’t load the exam’s details, so the message is just its link. It still works.</p>
                    )}
                </div>

                <button
                    type="button"
                    disabled={state === 'loading'}
                    onClick={() => send(picked)}
                    className="mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl text-[17px] font-semibold text-white shadow-[0_16px_30px_-14px_rgba(15,23,42,0.55)] transition-[filter,transform] active:scale-[0.98] disabled:opacity-60"
                    style={{ backgroundColor: picked.color }}
                >
                    <picked.Icon className="h-5 w-5" />
                    {primaryLabel[picked.id]}
                </button>

                {/* Every other way, like a share sheet */}
                <p className="mt-7 text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">Or send it with</p>
                <div className="mt-3 grid grid-cols-4 gap-2">
                    {others.map(a => (
                        <AppTile key={a.id} label={a.label} color={a.color} onClick={() => send(a)} disabled={state === 'loading'}>
                            <a.Icon className="h-6 w-6" />
                        </AppTile>
                    ))}
                    <AppTile
                        label="SMS"
                        color="#16a34a"
                        disabled={state === 'loading'}
                        onClick={() => { window.location.href = `sms:?&body=${encodeURIComponent(withoutBold(text))}`; }}
                    >
                        <MessageSquare className="h-6 w-6" />
                    </AppTile>
                    {picked.id !== 'any' && canShareSheet && (
                        <AppTile label="More" color="#0284c7" onClick={() => send(SHARE_APPS[0])} disabled={state === 'loading'}>
                            <AnyAppIcon className="h-6 w-6" />
                        </AppTile>
                    )}
                    <AppTile label={copied ? 'Copied' : 'Copy'} color="#0f172a" onClick={() => copyMessage()} disabled={state === 'loading'}>
                        {copied ? <Check className="h-6 w-6" /> : <Copy className="h-6 w-6" />}
                    </AppTile>
                </div>

                <p className="mt-8 text-center text-[12.5px] leading-relaxed text-slate-500">
                    Candidates tap the link and start. No app to install.
                </p>
            </div>
        </div>
    );
}

function AppTile({ label, color, onClick, disabled, children }: {
    label: string; color: string; onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex flex-col items-center gap-1.5 rounded-2xl py-2 transition-transform active:scale-95 disabled:opacity-50"
        >
            <span
                className="flex h-14 w-14 items-center justify-center rounded-[18px] text-white shadow-[0_10px_22px_-12px_rgba(15,23,42,0.5)]"
                style={{ backgroundColor: color }}
            >
                {children}
            </span>
            <span className="text-[12px] font-medium text-slate-700">{label}</span>
        </button>
    );
}
