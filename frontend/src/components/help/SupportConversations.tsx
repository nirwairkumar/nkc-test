/**
 * "Your messages" on the Help page: each message as a conversation with the team. Your own
 * words sit on the right, the team's on the left, like any chat app.
 *
 *   Open (waiting or replied)  shown in full with a reply box. Writing back puts it back in
 *                              the team's "Waiting" list and tells them at once.
 *   Resolved                   closed: folded to one line, no reply box. Anything new is a
 *                              new message (one open conversation at a time).
 *   Delete (bin, right side)   removes it from this page. The team keeps it as read-only
 *                              history; an open one is closed (backend DELETE /support/messages/{id}).
 */
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Loader2, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    deleteMySupportMessage,
    isOpenConversation,
    replyToSupportMessage,
    type MySupportMessage,
} from '@/lib/supportApi';
import { topicLabel } from '@/lib/helpContact';

const CARD =
    'rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)]';

const STATUS: Record<string, { label: string; className: string }> = {
    pending: { label: 'Waiting for reply', className: 'bg-amber-50 text-amber-800 ring-amber-600/20' },
    replied: { label: 'Replied', className: 'bg-sky-50 text-sky-700 ring-sky-600/15' },
    resolved: { label: 'Resolved', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' },
};

/** The open conversation carries this id so "Go to your conversation" can scroll to it. */
export const OPEN_CONVERSATION_ID = 'help-open-conversation';
const SHOWN = 5;

const when = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
const day = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

/** Smooth scroll unless the person asked their device for less motion. */
export function scrollToHelp(id: string) {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

export default function SupportConversations({ messages }: { messages: MySupportMessage[] }) {
    const qc = useQueryClient();
    const [showAll, setShowAll] = useState(false);
    const [asking, setAsking] = useState<MySupportMessage | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Open first (there is normally just one), then resolved, newest first.
    const sorted = [...messages].sort((a, b) =>
        Number(isOpenConversation(b)) - Number(isOpenConversation(a)) || b.created_at.localeCompare(a.created_at));
    const shown = showAll ? sorted : sorted.slice(0, SHOWN);
    const firstOpen = sorted.find(isOpenConversation)?.id;

    const confirmDelete = async () => {
        const m = asking;
        if (!m) return;
        setDeleting(true);
        try {
            await deleteMySupportMessage(m.id);
            qc.setQueriesData<MySupportMessage[]>({ queryKey: ['support', 'mine'] }, old => old?.filter(x => x.id !== m.id));
            qc.invalidateQueries({ queryKey: ['support', 'mine'] });
            setAsking(null);
            toast.success('Conversation deleted');
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || "Couldn't delete that. Please try again.");
        } finally {
            setDeleting(false);
        }
    };

    const askingOpen = asking ? isOpenConversation(asking) : false;

    return (
        <section className={`${CARD} overflow-hidden`} aria-labelledby="help-mine-heading">
            <h2 id="help-mine-heading" className="border-b border-slate-100 px-4 py-3.5 text-[15px] font-semibold tracking-[-0.01em] text-slate-900 sm:px-6">
                Your messages
            </h2>
            <ul className="divide-y divide-slate-100">
                {shown.map(m => (
                    <Conversation key={m.id} m={m} anchor={m.id === firstOpen} onDelete={() => setAsking(m)} />
                ))}
            </ul>
            {sorted.length > SHOWN && (
                <button
                    type="button"
                    onClick={() => setShowAll(v => !v)}
                    className="w-full border-t border-slate-100 py-2.5 text-[13px] font-semibold text-sky-700 transition-colors hover:bg-slate-50 cursor-pointer"
                >
                    {showAll ? 'Show fewer' : `Show all ${sorted.length}`}
                </button>
            )}

            <AlertDialog open={!!asking} onOpenChange={o => { if (!o && !deleting) setAsking(null); }}>
                <AlertDialogContent className="max-w-[min(400px,calc(100vw-32px))] rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[15px] leading-relaxed">
                            {askingOpen
                                ? "It disappears from your Help page and is closed, so the team won't reply to it. Our team keeps a copy of past conversations."
                                : 'It disappears from your Help page. Our team keeps a copy of past conversations.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="h-11 rounded-xl" disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={e => { e.preventDefault(); confirmDelete(); }}
                            disabled={deleting}
                            className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700"
                        >
                            {deleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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

function Conversation({ m, anchor, onDelete }: { m: MySupportMessage; anchor: boolean; onDelete: () => void }) {
    const open = isOpenConversation(m);
    const [expanded, setExpanded] = useState(false);
    const s = STATUS[m.status || 'pending'] || STATUS.pending;
    const topic = topicLabel(m.topic);
    const showBody = open || expanded;

    const chips = (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.className}`}>{s.label}</span>
            {topic && <span className="font-medium text-slate-600">{topic}</span>}
            {!open && <span className="text-slate-400">{day(m.created_at)}</span>}
        </span>
    );

    return (
        <li id={anchor ? OPEN_CONVERSATION_ID : undefined} className="scroll-mt-20 px-4 py-4 sm:px-6">
            <div className="flex items-start gap-2">
                {open ? (
                    <div className="min-w-0 flex-1 pt-1">{chips}</div>
                ) : (
                    // Resolved: one line until opened.
                    <button
                        type="button"
                        onClick={() => setExpanded(v => !v)}
                        aria-expanded={expanded}
                        className="group -my-1 -ml-2 min-w-0 flex-1 rounded-xl px-2 py-1 text-left transition-colors hover:bg-slate-50 cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            <span className="min-w-0 flex-1">{chips}</span>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        </span>
                        {!expanded && <span className="mt-1 block truncate text-[13px] text-slate-500">{m.message}</span>}
                    </button>
                )}
                <button
                    type="button"
                    onClick={onDelete}
                    aria-label="Delete conversation"
                    title="Delete conversation"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 cursor-pointer"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>

            {showBody && (
                <>
                    <div className="mt-3 space-y-3">
                        <Bubble mine body={m.message} at={m.created_at} />
                        {m.thread.map(t => <Bubble key={t.id} mine={t.author === 'user'} body={t.body} at={t.created_at} />)}
                    </div>
                    {open ? (
                        <ReplyBox m={m} />
                    ) : (
                        <p className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-600">
                            Resolved{m.resolved_at ? ` on ${day(m.resolved_at)}` : ''}, so this conversation is closed.
                            Need more help? Write a new message above.
                        </p>
                    )}
                </>
            )}
        </li>
    );
}

function ReplyBox({ m }: { m: MySupportMessage }) {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
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
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || "Couldn't send that. Please try again.");
        } finally {
            setSending(false);
            // A 409 means the team resolved it meanwhile: refresh either way.
            qc.invalidateQueries({ queryKey: ['support', 'mine'] });
        }
    };

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-3 inline-flex h-8 items-center rounded-full bg-slate-100 px-3.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-200/80 cursor-pointer"
            >
                {teamSpoke ? 'Reply' : 'Add more detail'}
            </button>
        );
    }

    return (
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
    );
}
