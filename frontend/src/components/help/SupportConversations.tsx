/**
 * "Your messages" on the Help page: each message as a conversation with the team, newest
 * first, with a reply box. Your own words sit on the right, the team's on the left, like
 * any chat app. Writing back puts the message back in the team's "Waiting" list and tells
 * them at once (backend services/support_mail.py).
 */
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { replyToSupportMessage, type MySupportMessage } from '@/lib/supportApi';
import { topicLabel } from '@/lib/helpContact';

const CARD =
    'rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)]';

const STATUS: Record<string, { label: string; className: string }> = {
    pending: { label: 'Waiting for reply', className: 'bg-amber-50 text-amber-800 ring-amber-600/20' },
    replied: { label: 'Replied', className: 'bg-sky-50 text-sky-700 ring-sky-600/15' },
    resolved: { label: 'Resolved', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' },
};

const when = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

export default function SupportConversations({ messages }: { messages: MySupportMessage[] }) {
    const [showAll, setShowAll] = useState(false);
    const shown = showAll ? messages : messages.slice(0, 3);
    return (
        <section className={`${CARD} overflow-hidden`} aria-labelledby="help-mine-heading">
            <h2 id="help-mine-heading" className="border-b border-slate-100 px-4 py-3.5 text-[15px] font-semibold tracking-[-0.01em] text-slate-900 sm:px-6">
                Your messages
            </h2>
            <ul className="divide-y divide-slate-100">
                {shown.map(m => <Conversation key={m.id} m={m} />)}
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

function Bubble({ mine, body, at }: { mine: boolean; body: string; at: string }) {
    return (
        <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] sm:max-w-[75%]">
                {!mine && <p className="mb-1 px-1 text-[11px] font-semibold text-slate-500">TestoZa team</p>}
                <div className={`whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                    mine ? 'rounded-br-md bg-sky-600 text-white' : 'rounded-bl-md bg-slate-100 text-slate-800'
                }`}>
                    {body}
                </div>
                <p className={`mt-1 px-1 text-[11px] text-slate-400 ${mine ? 'text-right' : ''}`}>{when(at)}</p>
            </div>
        </div>
    );
}

function Conversation({ m }: { m: MySupportMessage }) {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const s = STATUS[m.status || 'pending'] || STATUS.pending;
    const topic = topicLabel(m.topic);
    const teamSpoke = m.thread.some(t => t.author === 'team');

    const send = async () => {
        const body = text.trim();
        if (!body) return;
        setSending(true);
        try {
            await replyToSupportMessage(m.id, body);
            setText('');
            setOpen(false);
            toast.success('Sent. The team has been told.');
            qc.invalidateQueries({ queryKey: ['support', 'mine'] });
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || "Couldn't send that. Please try again.");
        } finally {
            setSending(false);
        }
    };

    return (
        <li className="px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.className}`}>{s.label}</span>
                {topic && <span className="font-medium text-slate-600">{topic}</span>}
            </div>

            <div className="mt-3 space-y-3">
                <Bubble mine body={m.message} at={m.created_at} />
                {m.thread.map(t => <Bubble key={t.id} mine={t.author === 'user'} body={t.body} at={t.created_at} />)}
            </div>

            {open ? (
                <div className="mt-3 rounded-2xl bg-slate-100 p-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-500/40">
                    <textarea
                        autoFocus
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
                        rows={3}
                        maxLength={5000}
                        placeholder="Write your reply…"
                        className="w-full resize-y bg-transparent px-2 py-1.5 text-[14px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => { setOpen(false); setText(''); }}
                            className="h-8 rounded-full px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-200/70 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={send}
                            disabled={sending || !text.trim()}
                            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-sky-600 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
                        >
                            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="mt-3 inline-flex h-8 items-center rounded-full bg-slate-100 px-3.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-200/80 cursor-pointer"
                >
                    {teamSpoke ? 'Reply' : 'Add more detail'}
                </button>
            )}
        </li>
    );
}
