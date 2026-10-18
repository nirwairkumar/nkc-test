/**
 * The Help page body, shared by app.testoza.com/help (signed in, inside the app) and the
 * public testoza.com/support page.
 *
 *   Write to us         — the message reaches the team at once (admin → Support + email)
 *   Chat on WhatsApp    — QR + WhatsApp Web on a computer, one tap on a phone
 *   Learn it yourself   — User Guide and the YouTube channel
 *   Your messages       — signed in only: what you sent and our replies
 *   Common questions
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Book, ChevronRight, MessageSquareText } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { fetchMySupportMessages, type MySupportMessage } from '@/lib/supportApi';
import { topicLabel, YOUTUBE_CHANNEL_URL } from '@/lib/helpContact';
import HelpMessageForm from './HelpMessageForm';
import WhatsAppCard from './WhatsAppCard';
import { HELP_FAQS } from './helpFaq';

const CARD =
    'rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)]';

/** YouTube glyph (lucide's brand icons are deprecated). */
function YouTubeIcon({ className = 'h-4 w-4' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
            <path fill="#FF0000" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8Z" />
            <path fill="#FFFFFF" d="m9.6 15.6 6.3-3.6-6.3-3.6v7.2Z" />
        </svg>
    );
}

interface Props {
    /** Signed-in account email; absent on the public page. */
    accountEmail?: string | null;
    cameFrom?: string | null;
}

export default function HelpCenter({ accountEmail, cameFrom }: Props) {
    const signedIn = !!accountEmail;
    const qc = useQueryClient();
    const mine = useQuery({
        queryKey: ['support', 'mine', accountEmail],
        queryFn: fetchMySupportMessages,
        enabled: signedIn,
        staleTime: 30_000,
    });
    const messages = mine.data ?? [];

    return (
        <div className="space-y-4">
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                {/* Write to us */}
                <section className={`${CARD} p-4 sm:p-6`} aria-labelledby="help-write-heading">
                    <div className="mb-4 flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-600/10">
                            <MessageSquareText className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                            <h2 id="help-write-heading" className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">Write to us</h2>
                            <p className="text-[13px] text-slate-500">Tell us what's wrong in your own words. Hindi or English.</p>
                        </div>
                    </div>
                    <HelpMessageForm
                        accountEmail={accountEmail}
                        cameFrom={cameFrom}
                        onSent={() => qc.invalidateQueries({ queryKey: ['support', 'mine'] })}
                    />
                </section>

                <div className="space-y-4">
                    <WhatsAppCard email={accountEmail} />

                    {/* Learn it yourself */}
                    <section className={`${CARD} overflow-hidden`} aria-label="Guides and videos">
                        <ul className="divide-y divide-slate-100">
                            <li>
                                <Link to="/user-guide" className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 sm:px-5">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600">
                                        <Book className="h-[18px] w-[18px]" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[14px] font-semibold text-slate-900">User Guide</span>
                                        <span className="block text-[12.5px] text-slate-500">Step-by-step help for every feature</span>
                                    </span>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                                </Link>
                            </li>
                            <li>
                                <a
                                    href={YOUTUBE_CHANNEL_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 sm:px-5"
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-red-50">
                                        <YouTubeIcon className="h-[18px] w-[18px]" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[14px] font-semibold text-slate-900">Video tutorials</span>
                                        <span className="block text-[12.5px] text-slate-500">Watch how it's done on YouTube</span>
                                    </span>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                                </a>
                            </li>
                        </ul>
                    </section>
                </div>
            </div>

            {signedIn && messages.length > 0 && <MyMessages messages={messages} />}

            {/* Common questions */}
            <section className={`${CARD} overflow-hidden`} aria-labelledby="help-faq-heading">
                <h2 id="help-faq-heading" className="border-b border-slate-100 px-4 py-3.5 text-[15px] font-semibold tracking-[-0.01em] text-slate-900 sm:px-6">
                    Common questions
                </h2>
                <Accordion type="single" collapsible>
                    {HELP_FAQS.map((f, i) => (
                        <AccordionItem key={f.q} value={`faq-${i}`} className="border-slate-100 last:border-b-0">
                            <AccordionTrigger className="px-4 py-3.5 text-left text-[14px] font-medium text-slate-800 hover:no-underline hover:bg-slate-50/70 sm:px-6 [&>svg]:text-slate-400">
                                {f.q}
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 sm:px-6">
                                <p className="text-[14px] leading-relaxed text-slate-600">{f.a}</p>
                                {f.link && signedIn && (
                                    <Link to={f.link.to} className="mt-2 inline-flex items-center gap-0.5 text-[13px] font-semibold text-sky-700 hover:text-sky-800">
                                        {f.link.label} <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </section>
        </div>
    );
}

const STATUS: Record<string, { label: string; className: string }> = {
    pending: { label: 'Waiting for reply', className: 'bg-amber-50 text-amber-800 ring-amber-600/20' },
    replied: { label: 'Replied', className: 'bg-sky-50 text-sky-700 ring-sky-600/15' },
    resolved: { label: 'Resolved', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' },
};

const when = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

function MyMessages({ messages }: { messages: MySupportMessage[] }) {
    const [showAll, setShowAll] = React.useState(false);
    const shown = showAll ? messages : messages.slice(0, 3);
    return (
        <section className={`${CARD} overflow-hidden`} aria-labelledby="help-mine-heading">
            <h2 id="help-mine-heading" className="border-b border-slate-100 px-4 py-3.5 text-[15px] font-semibold tracking-[-0.01em] text-slate-900 sm:px-6">
                Your messages
            </h2>
            <ul className="divide-y divide-slate-100">
                {shown.map(m => {
                    const s = STATUS[m.status || 'pending'] || STATUS.pending;
                    const topic = topicLabel(m.topic);
                    return (
                        <li key={m.id} className="px-4 py-4 sm:px-6">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500">
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.className}`}>{s.label}</span>
                                {topic && <span className="font-medium text-slate-600">{topic}</span>}
                                <span>{when(m.created_at)}</span>
                            </div>
                            <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-[14px] leading-relaxed text-slate-700">{m.message}</p>
                            {m.reply && (
                                <div className="mt-3 rounded-xl bg-sky-50/70 px-3.5 py-3 ring-1 ring-inset ring-sky-600/10">
                                    <p className="text-[12px] font-semibold text-sky-800">
                                        TestoZa team <span className="font-normal text-sky-700/70">· {when(m.replied_at)}</span>
                                    </p>
                                    <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-slate-800">{m.reply}</p>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
            {messages.length > 3 && (
                <button
                    type="button"
                    onClick={() => setShowAll(v => !v)}
                    className="w-full border-t border-slate-100 py-2.5 text-[13px] font-semibold text-sky-700 transition-colors hover:bg-slate-50 cursor-pointer"
                >
                    {showAll ? 'Show fewer' : `Show all ${messages.length}`}
                </button>
            )}
        </section>
    );
}
