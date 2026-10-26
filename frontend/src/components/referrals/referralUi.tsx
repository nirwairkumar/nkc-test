import React from 'react';
import { Check, Copy, Gift } from 'lucide-react';
import type { ReferralStage } from '@/lib/referralsApi';

/*
 * The invite feature's own look, after Zepto's refer-a-friend screens: a deep violet
 * hero, one hot-pink pill for the main action, a coupon-style ticket for the code and
 * chunky numbers. Used only by components/referrals and the invite pages; the rest of
 * the app keeps the sky iOS look (dashboard/dashboardUi.tsx).
 */

export const VIOLET_HERO =
    'bg-[radial-gradient(130%_140%_at_0%_0%,#8b5cf6_0%,#5b21b6_42%,#2e0a6b_100%)]';

export const PINK = '#ff3269';

export const PINK_BTN =
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#ff3269] font-bold text-white ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_12px_24px_-12px_rgba(255,50,105,0.95)] ' +
    'transition-[background-color,transform] duration-150 hover:bg-[#f2205a] motion-safe:active:scale-[0.97] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff3269]/50 focus-visible:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none';

/** A secondary pill on the violet hero. */
export const GLASS_BTN =
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white/[0.12] font-semibold text-white ring-1 ring-inset ring-white/25 ' +
    'transition-[background-color,transform] duration-150 hover:bg-white/20 motion-safe:active:scale-[0.97] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 cursor-pointer';

/** A secondary pill on white. */
export const SOFT_BTN =
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#f3eeff] font-semibold text-[#4c1d95] ' +
    'transition-[background-color,transform] duration-150 hover:bg-[#e8deff] motion-safe:active:scale-[0.97] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 cursor-pointer disabled:opacity-50 disabled:pointer-events-none';

export const Z_CARD =
    'rounded-[22px] bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_34px_-22px_rgba(46,10,107,0.35)]';

/** The yellow gift tile, a little tilted, like a sticker. */
export function GiftBadge({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
    const box = size === 'lg' ? 'h-16 w-16 rounded-[20px]' : size === 'sm' ? 'h-10 w-10 rounded-[13px]' : 'h-12 w-12 rounded-2xl';
    const ico = size === 'lg' ? 'h-8 w-8' : size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';
    return (
        <span
            aria-hidden="true"
            className={`flex shrink-0 -rotate-6 items-center justify-center bg-gradient-to-br from-[#ffe066] to-[#ffb800] text-[#7a2e00] shadow-[0_10px_20px_-10px_rgba(255,184,0,0.9),inset_0_1px_0_rgba(255,255,255,0.6)] ${box} ${className}`}
        >
            <Gift className={ico} strokeWidth={2.4} />
        </span>
    );
}

/** Four-point stars scattered on the hero. Decoration only. */
export function Sparkles({ className = '' }: { className?: string }) {
    const star = 'M12 0c.9 5.6 3.2 9.4 12 12-8.8 2.6-11.1 6.4-12 12-.9-5.6-3.2-9.4-12-12C8.8 9.4 11.1 5.6 12 0Z';
    return (
        <svg aria-hidden="true" viewBox="0 0 200 120" className={`pointer-events-none absolute ${className}`}>
            <path d={star} fill="#ffe066" transform="translate(150 14) scale(0.75)" />
            <path d={star} fill="#ffffff" opacity="0.55" transform="translate(178 58) scale(0.42)" />
            <path d={star} fill="#ff8fb1" opacity="0.9" transform="translate(120 72) scale(0.36)" />
            <circle cx="104" cy="22" r="2.4" fill="#ffffff" opacity="0.5" />
            <circle cx="190" cy="100" r="2" fill="#ffe066" opacity="0.8" />
        </svg>
    );
}

/**
 * The code on a coupon: code and link on the left, a dashed tear line with two
 * notches, and the copy button on the stub.
 */
export function InviteTicket({ code, linkLabel, copied, onCopy, compact = false }: {
    code: string;
    linkLabel: string;
    copied: boolean;
    onCopy: () => void;
    compact?: boolean;
}) {
    const stub = compact ? 84 : 104;
    const mask =
        `radial-gradient(circle at calc(100% - ${stub}px) 0, transparent 8px, #000 8.5px),` +
        `radial-gradient(circle at calc(100% - ${stub}px) 100%, transparent 8px, #000 8.5px)`;
    return (
        <div className="[filter:drop-shadow(0_14px_22px_rgba(20,0,60,0.35))]">
            <div
                className="relative flex items-stretch overflow-hidden rounded-2xl bg-white"
                style={{ WebkitMaskImage: mask, maskImage: mask, WebkitMaskComposite: 'source-in', maskComposite: 'intersect' }}
            >
                <div className={`min-w-0 flex-1 ${compact ? 'px-3.5 py-2.5' : 'px-4 py-3'}`}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-500">Your invite code</p>
                    <p className={`font-black tracking-[0.1em] text-[#2e0a6b] ${compact ? 'text-[19px]' : 'text-[23px]'} leading-tight`}>{code}</p>
                    <p className="truncate text-[11.5px] font-medium text-slate-500" title={linkLabel}>{linkLabel}</p>
                </div>
                <span aria-hidden="true" className="my-2 border-l-2 border-dashed border-violet-200" />
                <button
                    type="button"
                    onClick={onCopy}
                    style={{ width: stub }}
                    className="flex shrink-0 flex-col items-center justify-center gap-1 text-[12.5px] font-bold text-[#5b21b6] transition-colors hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400 cursor-pointer"
                    aria-label={copied ? 'Link copied' : 'Copy your invite link'}
                >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${copied ? 'bg-emerald-500 text-white' : 'bg-[#f3eeff]'}`}>
                        {copied ? <Check className="h-4 w-4" strokeWidth={3} /> : <Copy className="h-4 w-4" />}
                    </span>
                    {copied ? 'Copied' : 'Copy link'}
                </button>
            </div>
        </div>
    );
}

export const STAGES: { key: ReferralStage; label: string; hint: string }[] = [
    { key: 'signed_up', label: 'Signed up', hint: 'Made an account' },
    { key: 'made_test', label: 'Made a test', hint: 'Has a test of their own' },
    { key: 'getting_results', label: 'Getting results', hint: 'Their candidates are submitting' },
];

/** Three dots on a line, filled up to where they are. */
export function StageTrack({ stage, className = '' }: { stage: ReferralStage; className?: string }) {
    const at = STAGES.findIndex(s => s.key === stage);
    return (
        <span className={`inline-flex items-center ${className}`} aria-label={`${STAGES[at]?.label}, step ${at + 1} of 3`}>
            {STAGES.map((s, i) => (
                <React.Fragment key={s.key}>
                    {i > 0 && <span className={`h-[3px] w-4 rounded-full ${i <= at ? 'bg-[#7c3aed]' : 'bg-slate-200'}`} />}
                    <span
                        title={s.label}
                        className={`h-2.5 w-2.5 rounded-full ring-2 ${i < at ? 'bg-[#7c3aed] ring-[#7c3aed]' : i === at ? (at === 2 ? 'bg-emerald-500 ring-emerald-200' : 'bg-[#ff3269] ring-pink-200') : 'bg-white ring-slate-200'}`}
                    />
                </React.Fragment>
            ))}
        </span>
    );
}

export function PersonAvatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
    if (url) {
        return <img src={url} alt="" referrerPolicy="no-referrer" className="shrink-0 rounded-full object-cover ring-2 ring-white" style={{ width: size, height: size }} />;
    }
    const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
    return (
        <span
            className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] font-bold text-white ring-2 ring-white"
            style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
        >
            {letters}
        </span>
    );
}
