import React from 'react';
import { Mail, Share2 } from 'lucide-react';
import { shareLink } from '@/utils/canonicalUrl';

/**
 * The apps an examiner can send an exam to from their phone. The QR on a live exam card
 * opens /share-exam/<exam>?to=<app code> on the phone, which hands the invitation to that app.
 * "any" has no app of its own: the phone's share sheet lists every app it has.
 */

type IconProps = { className?: string };

export function WhatsAppGlyph({ className = 'h-4 w-4' }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.1-.22-.16-.47-.29Z" />
        </svg>
    );
}

export function TelegramGlyph({ className = 'h-4 w-4' }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
    );
}

export function DiscordGlyph({ className = 'h-4 w-4' }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.1.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.946 2.418-2.157 2.418z" />
        </svg>
    );
}

export type ShareAppId = 'any' | 'whatsapp' | 'telegram' | 'discord' | 'email';

export interface ShareApp {
    id: ShareAppId;
    /** Two letters in the QR link (?to=wa): short links make codes that scan at 112 px. */
    code: string;
    label: string;
    /** One line under the QR: what happens on the phone after scanning. */
    hint: string;
    Icon: React.ComponentType<IconProps>;
    /** Brand colour, for the selected chip and the phone page's buttons. */
    color: string;
}

export const SHARE_APPS: ShareApp[] = [
    { id: 'any', code: '', label: 'Any app', hint: 'Your phone lists every app', Icon: Share2, color: '#0284c7' },
    { id: 'whatsapp', code: 'wa', label: 'WhatsApp', hint: 'Opens WhatsApp to pick a chat', Icon: WhatsAppGlyph, color: '#25D366' },
    { id: 'telegram', code: 'tg', label: 'Telegram', hint: 'Opens Telegram to pick a chat', Icon: TelegramGlyph, color: '#229ED9' },
    { id: 'discord', code: 'dc', label: 'Discord', hint: 'Copies the message, opens Discord', Icon: DiscordGlyph, color: '#5865F2' },
    { id: 'email', code: 'em', label: 'Email', hint: 'Opens your email app', Icon: Mail, color: '#475569' },
];

/** By id ("whatsapp") or by its QR code ("wa"); anything else is "any app". */
export const shareAppById = (id: string | null | undefined): ShareApp =>
    SHARE_APPS.find(a => id && (a.id === id || a.code === id)) || SHARE_APPS[0];

/** The path segment that names an exam in its link: the conduct slug, else slug, else id. */
export const examKey = (test: any): string =>
    test?.settings?.conduct_exam?.conduct_slug || test?.slug || test?.id || '';

/** What the QR holds: a short link, so the code stays easy to scan at a small size. */
export const shareQrUrl = (test: any, app: ShareAppId): string => {
    const code = shareAppById(app).code;
    return shareLink(`/share-exam/${encodeURIComponent(examKey(test))}${code ? `?to=${code}` : ''}`);
};

/** WhatsApp bold (*Title*) is literal text everywhere else. */
export const withoutBold = (text: string) => text.replace(/\*/g, '');

/**
 * Where to send the phone for an app that takes a ready-made message, or null for
 * "any" (the share sheet) and Discord (no share link exists; the page copies instead).
 */
export function appShareHref(app: ShareAppId, text: string, link: string, title: string): string | null {
    const enc = encodeURIComponent;
    switch (app) {
        case 'whatsapp':
            return `https://wa.me/?text=${enc(text)}`;
        case 'telegram': {
            // Telegram puts the link first, so leave it out of the text below it.
            const rest = withoutBold(text).split('\n').filter(l => l.trim() !== link && l.trim() !== 'Exam link:').join('\n').replace(/\n{3,}/g, '\n\n').trim();
            return `https://t.me/share/url?url=${enc(link)}&text=${enc(rest)}`;
        }
        case 'email':
            return `mailto:?subject=${enc(title)}&body=${enc(withoutBold(text))}`;
        default:
            return null;
    }
}

/** Discord reads **double** asterisks as bold. */
export const discordText = (text: string) => text.replace(/^\*(.+)\*$/m, '**$1**');
