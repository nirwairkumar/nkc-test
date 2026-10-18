/**
 * How people reach the TestoZa team, in one place: the Help page (/help), the public
 * /support page and the footer all read from here. Change the number or hours here only.
 */

// Owner's request: the number is never printed on the site. It lives only inside the
// WhatsApp links and the QR code, so there is deliberately no display version here.
export const WHATSAPP_NUMBER = '919263087676';
export const SUPPORT_EMAIL = 'support@testoza.com';
export const SUPPORT_HOURS = '9 am – 9 pm IST';
export const REPLY_PROMISE = 'A person replies, usually within a few hours.';

export const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@TestoZaOfficial';

/** wa.me: opens the WhatsApp app on a phone; on a computer it offers the desktop app or WhatsApp Web. */
export const whatsAppAppUrl = (text: string) =>
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

/** Straight into WhatsApp Web, for computers without the desktop app. */
export const whatsAppWebUrl = (text: string) =>
    `https://web.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(text)}`;

export const whatsAppGreeting = (email?: string | null) =>
    email ? `Hi TestoZa team, I need help.\n\nMy account: ${email}` : 'Hi TestoZa team, I have a question.';

export type HelpTopic = 'create' | 'ai' | 'conduct' | 'results' | 'account' | 'other';

export const HELP_TOPICS: { value: HelpTopic; label: string }[] = [
    { value: 'create', label: 'Making a test' },
    { value: 'ai', label: 'AI import' },
    { value: 'conduct', label: 'Running an exam' },
    { value: 'results', label: 'Results' },
    { value: 'account', label: 'Account or plan' },
    { value: 'other', label: 'Something else' },
];

export const topicLabel = (t?: string | null) => HELP_TOPICS.find(x => x.value === t)?.label;
