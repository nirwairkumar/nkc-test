import React, { useState } from 'react';
import { ChevronRight, Copy, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { copyText, plural } from '@/components/dashboard/format';
import { withoutBold } from '@/components/exams/shareApps';
import { analytics } from '@/lib/analytics/tracker';
import { inviteLink, inviteLinkLabel, inviteMessage } from '@/lib/referral';
import { useMyReferrals } from '@/lib/referralsApi';
import InviteSheet from './InviteSheet';
import { GLASS_BTN, GiftBadge, InviteTicket, PINK_BTN, Sparkles, VIOLET_HERO } from './referralUi';

/**
 * /dashboard: "Invite educators". The code on a ticket, one tap to copy the WhatsApp
 * message (computer) or open the share sheet (phone), "More ways" for email and the QR,
 * and how many joined, which opens Settings → Invite educators.
 */
export default function InviteCard({ className = '' }: { className?: string }) {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const { data, error } = useMyReferrals(!!user);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const name = profile?.full_name || user?.user_metadata?.full_name || '';
    const onPhone = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches && typeof navigator.share === 'function';

    // Until the SQL is applied the backend answers 503: no card rather than a broken one.
    if (error) return null;

    const copyLink = async () => {
        if (!data) return;
        if (await copyText(inviteLink(data.code))) {
            analytics.track('referral_share', { via: 'copy_link', where: 'dashboard_card' });
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2200);
            toast.success('Invite link copied');
        }
    };

    const quickSend = async () => {
        if (!data) return;
        const message = inviteMessage(name, inviteLink(data.code));
        if (onPhone) {
            analytics.track('referral_share', { via: 'share_sheet', where: 'dashboard_card' });
            try {
                await navigator.share({ title: 'TestoZa', text: withoutBold(message) });
            } catch { /* closed */ }
            return;
        }
        if (await copyText(message)) {
            analytics.track('referral_share', { via: 'copy_message', where: 'dashboard_card' });
            toast.success('Invite copied. Paste it in a WhatsApp chat or group.');
        } else {
            setSheetOpen(true);
        }
    };

    const joined = data?.stats.joined ?? 0;
    const results = data?.stats.getting_results ?? 0;
    const progress = !data ? '' : joined > 0
        ? `${plural(joined, 'person', 'people')} joined with your link${results ? ` · ${results} getting results` : ''}`
        : data.stats.opened > 0
            ? `${plural(data.stats.opened, 'person', 'people')} opened your link`
            : 'See who joins with your link';

    return (
        <section
            aria-labelledby="invite-card-title"
            className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-[0_18px_40px_-24px_rgba(46,10,107,0.85)] ${VIOLET_HERO} ${className}`}
        >
            <Sparkles className="right-0 top-0 h-[66px] w-[110px]" />
            <div className="relative flex items-start gap-3">
                <GiftBadge />
                <div className="min-w-0">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#ffe066]">Invite &amp; grow</p>
                    <h2 id="invite-card-title" className="text-[18px] font-black leading-tight tracking-[-0.01em]">Bring a fellow educator</h2>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-violet-100/90">Know a teacher still making papers by hand? Send them your link.</p>
                </div>
            </div>

            <div className="relative mt-4">
                {data ? (
                    <InviteTicket compact code={data.code} linkLabel={inviteLinkLabel(data.code)} copied={copied} onCopy={copyLink} />
                ) : (
                    <div className="h-[72px] animate-pulse rounded-2xl bg-white/15" />
                )}
            </div>

            <div className="relative mt-3 flex gap-2">
                <button type="button" onClick={quickSend} disabled={!data} className={`${PINK_BTN} h-10 flex-1 text-[14px]`}>
                    {onPhone ? <Share2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {onPhone ? 'Share invite' : 'Copy invite'}
                </button>
                <button type="button" onClick={() => setSheetOpen(true)} disabled={!data} className={`${GLASS_BTN} h-10 px-4 text-[13.5px]`}>
                    More ways
                </button>
            </div>

            {data && (
                <button
                    type="button"
                    onClick={() => navigate('/settings?tab=referrals')}
                    className="relative mt-3 inline-flex items-center gap-0.5 rounded-full text-[12.5px] font-semibold text-violet-100 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 cursor-pointer"
                >
                    {progress} <ChevronRight className="h-3.5 w-3.5" />
                </button>
            )}

            {data && <InviteSheet open={sheetOpen} onOpenChange={setSheetOpen} code={data.code} name={name} />}
        </section>
    );
}
