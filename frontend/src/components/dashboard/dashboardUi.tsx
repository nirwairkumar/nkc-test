import React from 'react';

/* Shared look for the dashboard — the same iOS-style language as /my-tests (sky palette). */

export const CARD =
    'rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)]';

export const PRIMARY_BTN =
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary text-[15px] font-semibold text-white ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_24px_-12px_rgba(2,132,199,0.85)] ' +
    'transition-[background-color,transform] duration-150 hover:bg-[hsl(200,95%,30%)] motion-safe:active:scale-[0.97] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none';

export const PILL_BTN =
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-[13px] font-semibold text-slate-700 ' +
    'transition-[background-color,transform] duration-150 hover:bg-slate-200/80 motion-safe:active:scale-[0.97] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 cursor-pointer disabled:opacity-50 disabled:pointer-events-none';

export const TEXT_BTN =
    'inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-sky-700 transition-colors hover:bg-sky-50 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 cursor-pointer';

export const MENU_TRIGGER =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 data-[state=open]:bg-slate-100 data-[state=open]:text-slate-900 cursor-pointer';

export const MENU_ITEM = 'rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900 cursor-pointer';

export function SectionTitle({
    id, title, count, action, className = '',
}: { id?: string; title: string; count?: number; action?: React.ReactNode; className?: string }) {
    return (
        <div className={`mb-3 flex items-center justify-between gap-3 px-1 ${className}`}>
            <div className="flex min-w-0 items-center gap-2">
                <h2 id={id} className="truncate text-lg font-semibold tracking-[-0.01em] text-slate-900">
                    {title}
                </h2>
                {count !== undefined && (
                    <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">
                        {count}
                    </span>
                )}
            </div>
            {action}
        </div>
    );
}

const TONES = {
    sky: 'from-sky-500/15 to-sky-500/5 text-sky-700 ring-sky-500/20',
    emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-700 ring-emerald-500/20',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-700 ring-amber-500/25',
    violet: 'from-violet-500/15 to-violet-500/5 text-violet-700 ring-violet-500/20',
    rose: 'from-rose-500/15 to-rose-500/5 text-rose-700 ring-rose-500/20',
    slate: 'from-slate-500/10 to-slate-500/5 text-slate-600 ring-slate-500/15',
} as const;
export type Tone = keyof typeof TONES;

/** Rounded-square icon badge, like an iOS Settings row icon. */
export function IconTile({ icon: Icon, tone = 'sky', size = 'md' }: { icon: React.ComponentType<{ className?: string }>; tone?: Tone; size?: 'sm' | 'md' | 'lg' }) {
    const box = size === 'lg' ? 'h-12 w-12 rounded-[14px]' : size === 'sm' ? 'h-8 w-8 rounded-[9px]' : 'h-10 w-10 rounded-[11px]';
    const ico = size === 'lg' ? 'h-6 w-6' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
    return (
        <span className={`flex shrink-0 items-center justify-center bg-gradient-to-br ring-1 ring-inset ${box} ${TONES[tone]}`}>
            <Icon className={ico} />
        </span>
    );
}

export function LiveDot({ className = '' }: { className?: string }) {
    return (
        <span className={`relative flex h-2 w-2 shrink-0 ${className}`}>
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
    );
}

export function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

/** WhatsApp glyph (lucide has no brand icons). */
export function WhatsAppIcon({ className = 'h-4 w-4' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.1-.22-.16-.47-.29Z" />
        </svg>
    );
}
