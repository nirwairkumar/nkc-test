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

export type ShareAppId = 'any' | 'whatsapp' | 'telegram' | 'email';

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
 * "any" (the share sheet).
 */
export function appShareHref(app: ShareAppId, text: string, link: string, title: string): string | null {
    const enc = encodeURIComponent;
    switch (app) {
        case 'whatsapp':
            return `https://wa.me/?text=${enc(text)}`;
        case 'telegram': {
            // tg:// opens the Telegram app itself. The t.me/share website is blocked on some
            // Indian networks ("can't provide a secure connection"). The link goes first, so
            // it is left out of the text below it.
            const rest = withoutBold(text).split('\n').filter(l => l.trim() !== link && l.trim() !== 'Exam link:').join('\n').replace(/\n{3,}/g, '\n\n').trim();
            return `tg://msg_url?url=${enc(link)}&text=${enc(rest)}`;
        }
        case 'email':
            return `mailto:?subject=${enc(title)}&body=${enc(withoutBold(text))}`;
        default:
            return null;
    }
}
