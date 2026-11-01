import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Mail, MessageSquare, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { copyText } from '@/components/dashboard/format';
import { TelegramGlyph, WhatsAppGlyph, appShareHref, withoutBold } from '@/components/exams/shareApps';
import { analytics } from '@/lib/analytics/tracker';
import {
    gmailComposeUrl, inviteEmail, inviteLink, inviteLinkLabel, inviteMessage, mailAppUrl, outlookComposeUrl, whatsappWebUrl,
} from '@/lib/referral';
import ReferralQrPanel from './ReferralQrPanel';
import { GiftBadge, InviteTicket, PINK_BTN, SOFT_BTN, Sparkles, VIOLET_HERO, Z_CARD } from './referralUi';

type Tab = 'whatsapp' | 'email';

/**
 * Everything needed to send the invite link.
 *
 * On a computer, most educators copy a message and paste it into WhatsApp (or mail it
 * from Gmail in the browser, where mailto: opens nothing), so the computer layout leads
 * with the message itself: Copy message, WhatsApp Web, Gmail / Outlook compose, and a
 * QR that hands the invite to their phone. On a phone: the share sheet and app buttons.
 */
export default function ReferralShareKit({ code, name, where }: {
    code: string;
    /** The sender's name, signed under the message. */
    name: string;
    /** For analytics: 'settings' | 'dashboard'. */
    where: string;
}) {
    const link = inviteLink(code);
    const message = inviteMessage(name, link);
    const email = inviteEmail(name, link);
    const [tab, setTab] = useState<Tab>('whatsapp');
    const [emailTo, setEmailTo] = useState('');
    const [copied, setCopied] = useState<'link' | 'message' | 'email' | null>(null);
    const canShareSheet = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

    const track = (via: string) => analytics.track('referral_share', { via, where });

    const copy = async (what: 'link' | 'message' | 'email') => {
        const text = what === 'link' ? link : what === 'message' ? message : `${email.subject}\n\n${email.body}`;
        if (!(await copyText(text))) {
            toast.error('Could not copy. Select the text and copy it instead.');
            return;
        }
        track(`copy_${what}`);
        setCopied(what);
        window.setTimeout(() => setCopied(c => (c === what ? null : c)), 2200);
        toast.success(
            what === 'link' ? 'Invite link copied'
                : what === 'message' ? 'Message copied. Paste it in a WhatsApp chat or group.'
                    : 'Email copied. Paste it into a new email.',
        );
    };

    const open = (via: string, href: string, newTab = true) => {
        track(via);
        if (newTab) window.open(href, '_blank', 'noopener,noreferrer');
        else window.location.href = href;
    };

    const shareSheet = async () => {
        if (!canShareSheet) {
            await copy('message');
            return;
        }
        track('share_sheet');
        try {
            await navigator.share({ title: 'TestoZa', text: withoutBold(message) });
        } catch { /* closed the sheet */ }
    };

    return (
        <div className="space-y-4">
            {/* The code, on the violet hero */}
            <section className={`relative overflow-hidden rounded-[26px] px-5 pb-5 pt-5 text-white sm:px-7 sm:pb-6 sm:pt-6 ${VIOLET_HERO}`}>
                <Sparkles className="right-0 top-0 h-[120px] w-[200px]" />
                <div className="relative flex items-start gap-3.5">
                    <GiftBadge size="lg" className="mt-0.5" />
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ffe066]">Invite &amp; grow</p>
                        <h2 className="mt-0.5 text-[22px] font-black leading-[1.12] tracking-[-0.02em] sm:text-[26px]">
                            Bring a fellow educator to TestoZa
                        </h2>
                        <p className="mt-1.5 max-w-[46ch] text-[13.5px] leading-relaxed text-violet-100/90">
                            Send your link to a teacher friend. When they sign up with it, you'll see them here, right up to their first exam's results.
                        </p>
                    </div>
                </div>
                <div className="relative mt-5 max-w-[470px]">
                    <InviteTicket code={code} linkLabel={inviteLinkLabel(code)} copied={copied === 'link'} onCopy={() => copy('link')} />
                </div>
                <div className="relative mt-4 flex gap-2 md:hidden">
                    <button type="button" onClick={shareSheet} className={`${PINK_BTN} h-12 flex-1 text-[16px]`}>
                        <Share2 className="h-5 w-5" /> Share invite
                    </button>
                </div>
            </section>

            {/* Phone: one tap per app */}
            <section className={`${Z_CARD} p-4 md:hidden`} aria-label="Send it with">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-500">Send it with</p>
                <div className="mt-3 grid grid-cols-5 gap-1">
                    <AppTile label="WhatsApp" color="#25D366" onClick={() => open('whatsapp', appShareHref('whatsapp', message, link, email.subject)!, false)}>
                        <WhatsAppGlyph className="h-6 w-6" />
                    </AppTile>
                    <AppTile label="Telegram" color="#229ED9" onClick={() => open('telegram', appShareHref('telegram', message, link, email.subject)!, false)}>
                        <TelegramGlyph className="h-6 w-6" />
                    </AppTile>
                    <AppTile label="Email" color="#475569" onClick={() => open('email', mailAppUrl('', email.subject, email.body), false)}>
                        <Mail className="h-6 w-6" />
                    </AppTile>
                    <AppTile label="SMS" color="#16a34a" onClick={() => open('sms', `sms:?&body=${encodeURIComponent(withoutBold(message))}`, false)}>
                        <MessageSquare className="h-6 w-6" />
                    </AppTile>
                    <AppTile label={copied === 'message' ? 'Copied' : 'Copy'} color="#2e0a6b" onClick={() => copy('message')}>
                        {copied === 'message' ? <Check className="h-6 w-6" /> : <Copy className="h-6 w-6" />}
                    </AppTile>
                </div>
            </section>

            {/* Computer: the message itself, and the QR for the phone */}
            <section className={`${Z_CARD} hidden overflow-hidden md:flex`} aria-label="Send your invite">
                <div className="min-w-0 flex-1 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-[16px] font-extrabold tracking-[-0.01em] text-[#2e0a6b]">Send it your way</h3>
                            <p className="text-[12.5px] text-slate-500">Copy the message, or open it ready to send.</p>
                        </div>
                        <div role="tablist" aria-label="Message for" className="inline-flex rounded-full bg-[#f3eeff] p-1">
                            {([['whatsapp', 'WhatsApp', WhatsAppGlyph], ['email', 'Email', Mail]] as const).map(([id, label, Icon]) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === id}
                                    onClick={() => setTab(id)}
                                    className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 cursor-pointer ${tab === id ? 'bg-white text-[#2e0a6b] shadow-[0_1px_3px_rgba(46,10,107,0.18)]' : 'text-[#5b21b6]/70 hover:text-[#2e0a6b]'}`}
                                >
                                    <Icon className="h-3.5 w-3.5" /> {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {tab === 'whatsapp' ? (
                        <>
                            <ChatBubble text={message} />
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <button type="button" onClick={() => copy('message')} className={`${PINK_BTN} h-11 px-5 text-[14.5px]`}>
                                    {copied === 'message' ? <Check className="h-4 w-4" strokeWidth={3} /> : <Copy className="h-4 w-4" />}
                                    {copied === 'message' ? 'Copied' : 'Copy message'}
                                </button>
                                <button type="button" onClick={() => open('whatsapp_web', whatsappWebUrl(message))} className={`${SOFT_BTN} h-11 px-4 text-[13.5px]`}>
                                    <WhatsAppGlyph className="h-4 w-4 text-[#25D366]" /> WhatsApp Web <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                                </button>
                            </div>
                            <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
                                Paste it in your staff group or send it to one teacher.
                                <span className="hidden lg:inline"> Want to send it from your phone? Scan the QR.</span>
                            </p>
                        </>
                    ) : (
                        <>
                            <label className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-3.5 ring-1 ring-inset ring-slate-900/[0.06] focus-within:ring-2 focus-within:ring-violet-400">
                                <span className="text-[12.5px] font-semibold text-slate-500">To</span>
                                <input
                                    type="email"
                                    inputMode="email"
                                    value={emailTo}
                                    onChange={e => setEmailTo(e.target.value.trim())}
                                    placeholder="colleague@school.in (optional)"
                                    className="h-11 min-w-0 flex-1 bg-transparent text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                                />
                            </label>
                            <div className="mt-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-900/[0.05]">
                                <p className="text-[13px] text-slate-500">Subject: <span className="font-semibold text-slate-900">{email.subject}</span></p>
                                <p className="mt-2.5 max-h-[188px] overflow-y-auto whitespace-pre-line text-[13.5px] leading-[1.55] text-slate-800">{email.body}</p>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <button type="button" onClick={() => open('gmail', gmailComposeUrl(emailTo, email.subject, email.body))} className={`${PINK_BTN} h-11 px-5 text-[14.5px]`}>
                                    <Mail className="h-4 w-4" /> Open in Gmail
                                </button>
                                <button type="button" onClick={() => open('outlook', outlookComposeUrl(emailTo, email.subject, email.body))} className={`${SOFT_BTN} h-11 px-4 text-[13.5px]`}>
                                    Outlook <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                                </button>
                                <button type="button" onClick={() => open('mail_app', mailAppUrl(emailTo, email.subject, email.body), false)} className={`${SOFT_BTN} h-11 px-4 text-[13.5px]`}>
                                    Mail app
                                </button>
                                <button type="button" onClick={() => copy('email')} className={`${SOFT_BTN} h-11 px-4 text-[13.5px]`}>
                                    {copied === 'email' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied === 'email' ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <p className="mt-3 text-[12px] leading-relaxed text-slate-500">It opens in your own email with everything filled in. You press Send.</p>
                        </>
                    )}
                </div>
                <div className="hidden w-[208px] shrink-0 border-l border-dashed border-violet-200/80 bg-[#faf7ff] lg:flex lg:items-center lg:justify-center">
                    <ReferralQrPanel code={code} />
                </div>
            </section>
        </div>
    );
}

/** The message as WhatsApp will show it: *bold* lines, the link in blue. */
function ChatBubble({ text }: { text: string }) {
    return (
        <div className="mt-4 rounded-2xl bg-[#efeae2] p-3">
            <div className="max-w-[540px] rounded-2xl rounded-tl-md bg-[#d9fdd3] px-3.5 py-3 text-[13.5px] leading-[1.5] text-slate-800 shadow-[0_1px_1px_rgba(0,0,0,0.08)]">
                {text.split('\n').map((line, i) => {
                    if (!line) return <div key={i} className="h-2" />;
                    if (/^https?:\/\//.test(line)) return <p key={i} className="break-all text-[#027eb5] underline">{line}</p>;
                    const parts = line.split(/(\*[^*]+\*)/g);
                    return (
                        <p key={i}>
                            {parts.map((p, j) => (/^\*[^*]+\*$/.test(p) ? <strong key={j} className="font-semibold text-slate-900">{p.slice(1, -1)}</strong> : p))}
                        </p>
                    );
                })}
            </div>
        </div>
    );
}

function AppTile({ label, color, onClick, children }: { label: string; color: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-2xl py-1.5 transition-transform active:scale-95 cursor-pointer">
            <span
                className="flex h-12 w-12 items-center justify-center rounded-[16px] text-white shadow-[0_10px_20px_-12px_rgba(15,23,42,0.6)]"
                style={{ backgroundColor: color }}
            >
                {children}
            </span>
            <span className="text-[11.5px] font-semibold text-slate-700">{label}</span>
        </button>
    );
}
