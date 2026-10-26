import { shareLink } from '@/utils/canonicalUrl';

/**
 * Invite links: app.testoza.com/invite/<CODE>.
 *
 * The invite page remembers the code in this browser; the first sign-in after that
 * (email or Google, see hooks/useReferralClaim) sends it to the backend, which credits
 * the code's owner if the account is new. The message text lives here so the dashboard
 * card, Settings and the phone share page all send the same words.
 */

const PENDING_KEY = 'tz_referral';
const VISITOR_KEY = 'tz_ref_visitor';
/** A link opened more than a month before signing up no longer counts. */
const PENDING_MS = 30 * 24 * 60 * 60 * 1000;

export interface PendingReferral {
    code: string;
    /** The referrer's name, for "Invited by …" on the sign-up form. */
    name?: string;
    at: number;
}

export function rememberReferral(code: string, name?: string) {
    try {
        localStorage.setItem(PENDING_KEY, JSON.stringify({ code, name, at: Date.now() } satisfies PendingReferral));
    } catch { /* storage blocked: the invite still opens, it just can't be credited */ }
}

export function pendingReferral(): PendingReferral | null {
    try {
        const raw = localStorage.getItem(PENDING_KEY);
        if (!raw) return null;
        const p = JSON.parse(raw) as PendingReferral;
        if (!p?.code || Date.now() - (p.at || 0) > PENDING_MS) {
            localStorage.removeItem(PENDING_KEY);
            return null;
        }
        return p;
    } catch {
        return null;
    }
}

export function forgetReferral() {
    try {
        localStorage.removeItem(PENDING_KEY);
    } catch { /* storage blocked */ }
}

/** A random id for this browser, so opening the same link twice counts once. */
export function referralVisitorId(): string {
    try {
        const saved = localStorage.getItem(VISITOR_KEY);
        if (saved) return saved;
        const id = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
        localStorage.setItem(VISITOR_KEY, id);
        return id;
    } catch {
        return '';
    }
}

export const inviteLink = (code: string) => shareLink(`/invite/${code}`);

/** "app.testoza.com/invite/ASHA7K2P", for showing the link without the https://. */
export const inviteLinkLabel = (code: string) => inviteLink(code).replace(/^https?:\/\//, '');

/** What the "Scan to share" QR holds: the phone opens the invite in the picked app. */
export const inviteShareQrUrl = (code: string, appCode: string) =>
    shareLink(`/share-invite/${code}${appCode ? `?to=${appCode}` : ''}`);

/** The WhatsApp message (WhatsApp shows *TestoZa* in bold). Every claim here is true of the product today. */
export function inviteMessage(name: string, link: string): string {
    return [
        "Hi! I've been using *TestoZa* for my class tests, and I think you'll like it too.",
        '',
        '📄 Upload a question paper (PDF, Word or a photo) and it becomes an online test in about a minute',
        '📱 Students write it on their phones. No app to install',
        '📊 Marks, ranks and an Excel sheet come out on their own',
        '',
        'Make your account with my invite link:',
        link,
        ...(name ? ['', `— ${name}`] : []),
    ].join('\n');
}

export function inviteEmail(name: string, link: string): { subject: string; body: string } {
    return {
        subject: 'Try TestoZa for your class tests',
        body: [
            'Hi,',
            '',
            "I've been using TestoZa for my class tests, and I think you'll like it too.",
            '',
            '• Upload a question paper (PDF, Word or a photo) and it becomes an online test in about a minute.',
            '• Students write it on their phones. No app to install.',
            '• Marks, ranks and an Excel sheet come out on their own.',
            '',
            'Make your account with my invite link:',
            link,
            ...(name ? ['', name] : []),
        ].join('\n'),
    };
}

const enc = encodeURIComponent;

/** On a computer most people mail from Gmail in the browser, where mailto: opens nothing. */
export const gmailComposeUrl = (to: string, subject: string, body: string) =>
    `https://mail.google.com/mail/?view=cm&fs=1${to ? `&to=${enc(to)}` : ''}&su=${enc(subject)}&body=${enc(body)}`;

export const outlookComposeUrl = (to: string, subject: string, body: string) =>
    `https://outlook.live.com/mail/0/deeplink/compose?${to ? `to=${enc(to)}&` : ''}subject=${enc(subject)}&body=${enc(body)}`;

export const mailAppUrl = (to: string, subject: string, body: string) =>
    `mailto:${enc(to)}?subject=${enc(subject)}&body=${enc(body)}`;

/** Straight into WhatsApp Web's chat picker (wa.me stops on a "use the app?" page on a computer). */
export const whatsappWebUrl = (text: string) => `https://web.whatsapp.com/send?text=${enc(text)}`;
