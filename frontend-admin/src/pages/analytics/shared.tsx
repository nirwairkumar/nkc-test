import {
    AlertTriangle, BadgeIndianRupee, Globe2, Link2, Mail, Megaphone, Monitor, MousePointerClick, Search, Smartphone,
    Sparkles, Tablet, Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { NotInstalledError } from './api';
import { CARD } from './ui';

export const CHANNEL_ICON: Record<string, React.ElementType> = {
    Direct: MousePointerClick,
    'Organic search': Search,
    'AI assistants': Sparkles,
    Social: Users,
    Referral: Link2,
    Email: Mail,
    Paid: BadgeIndianRupee,
    'Other campaign': Megaphone,
};

export const CHANNEL_HELP =
    'Direct: typed URL, bookmarks, or apps that hide the referrer (WhatsApp, Telegram). ' +
    'AI assistants: ChatGPT, Perplexity, Gemini, Claude, Copilot. Paid: Google Ads clicks or cpc tags.';

export function ChannelIcon({ channel, className = 'h-3.5 w-3.5' }: { channel: string; className?: string }) {
    const Icon = CHANNEL_ICON[channel] || Globe2;
    return <Icon className={className} aria-hidden="true" />;
}

export function DeviceIcon({ device, className = 'h-3.5 w-3.5' }: { device: string | null | undefined; className?: string }) {
    const Icon = device === 'mobile' ? Smartphone : device === 'tablet' ? Tablet : Monitor;
    return <Icon className={className} aria-hidden="true" />;
}

export const DEVICE_LABEL: Record<string, string> = { mobile: 'Mobile', desktop: 'Desktop', tablet: 'Tablet', other: 'Other' };


/** A per-viewer convenience (tab, period, site). Survives reloads; failures are ignored. */
export function usePersisted<T extends string>(key: string, initial: T, allowed: readonly T[]): [T, (v: T) => void] {
    const [value, setValue] = useState<T>(() => {
        try {
            const v = localStorage.getItem(key) as T | null;
            return v && allowed.includes(v) ? v : initial;
        } catch {
            return initial;
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem(key, value);
        } catch {
            /* storage blocked */
        }
    }, [key, value]);
    return [value, setValue];
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
    if (error instanceof NotInstalledError) return null; // the panel shows the setup card instead
    const status = (error as any)?.response?.status;
    return (
        <div className={`${CARD} flex items-start gap-3 p-4`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-rose-50 text-rose-600">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-slate-900">Couldn’t load this report</p>
                <p className="mt-0.5 text-[13px] text-slate-500">
                    {status === 401 || status === 403 ? 'Your admin session has expired — sign in again.' : 'The server didn’t answer. Try again in a moment.'}
                </p>
            </div>
            {onRetry && (
                <button type="button" onClick={onRetry} className="rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-200">
                    Retry
                </button>
            )}
        </div>
    );
}

/** A path, shortened for lists, with the site shown when not obvious. */
export function PathLabel({ path, host, showHost }: { path: string; host?: string | null; showHost?: boolean }) {
    return (
        <span className="inline-flex min-w-0 items-center gap-1.5">
            {showHost && host && host !== 'testoza.com' && host !== 'app.testoza.com' && (
                <span className="shrink-0 rounded-[5px] bg-slate-100 px-1 text-[10px] font-semibold text-slate-500">{host.replace('.testoza.com', '')}</span>
            )}
            <span className="truncate font-mono text-[12.5px]">{path}</span>
        </span>
    );
}
