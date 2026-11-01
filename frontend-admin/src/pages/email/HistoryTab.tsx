/**
 * Admin → Email → History: every send and what happened after it.
 *   Came back  — visited TestoZa (signed in) or made a test within 7 days of the email
 *   Made a test — made a new test within 14 days (the outcome that matters most)
 *   Clicked    — visits through this email's links (utm_content = first 8 characters of the send id)
 * No open tracking on purpose: Apple Mail opens every email by itself, so opens mean little.
 */
import { useQuery } from '@tanstack/react-query';
import { History as HistoryIcon } from 'lucide-react';
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { istDateTime, num, relative } from '../analytics/format';
import { CARD, Chip, Empty, InfoTip, PILL_BTN, Skeleton } from '../analytics/ui';
import { emailApi, type Campaign, type Overview } from './api';
import { readable } from './model';
import { WideSheet } from './parts';
import { SendProgress, useSender } from './sender';

const STATUS_CHIP: Record<Campaign['status'], { label: string; tone: 'emerald' | 'sky' | 'amber' }> = {
    done: { label: 'Sent', tone: 'emerald' },
    sending: { label: 'Sending', tone: 'sky' },
    paused: { label: 'Paused', tone: 'amber' },
};

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—');

export default function HistoryTab({ overview, openId, onOpenId }: { overview?: Overview; openId: string | null; onOpenId: (id: string | null) => void }) {
    const [limit, setLimit] = useState(30);
    const q = useQuery({ queryKey: ['email', 'campaigns', limit], queryFn: () => emailApi.campaigns(limit), staleTime: 30_000 });
    const rows = q.data?.rows ?? [];

    const totals = rows.reduce((a, c) => ({
        sent: a.sent + c.sent, came_back: a.came_back + c.came_back, made_test: a.made_test + c.made_test, unsubscribed: a.unsubscribed + c.unsubscribed,
    }), { sent: 0, came_back: 0, made_test: 0, unsubscribed: 0 });

    return (
        <div className="space-y-4">
            {rows.length > 0 && (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Stat label="Emails sent" value={num(totals.sent)} />
                    <Stat label="Came back within 7 days" value={pct(totals.came_back, totals.sent)} sub={`${num(totals.came_back)} people`}
                        info="Visited TestoZa signed in, or made a test, within 7 days of their email. Some would have come anyway, so compare emails with each other, not with zero." />
                    <Stat label="Made a test within 14 days" value={pct(totals.made_test, totals.sent)} sub={`${num(totals.made_test)} people`}
                        info="The outcome that matters most for educators." />
                    <Stat label="Unsubscribed" value={pct(totals.unsubscribed, totals.sent)} sub={`${num(totals.unsubscribed)} people`}
                        info="Above 1% for one email means it reached the wrong people or said the wrong thing. Read it again before sending it more." />
                </div>
            )}

            {!q.data ? (
                <div className={cn(CARD, 'space-y-3 p-4')}>{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : rows.length === 0 ? (
                <div className={CARD}>
                    <Empty icon={HistoryIcon} title="Nothing sent yet">Your first send shows up here with who came back after it.</Empty>
                </div>
            ) : (
                <ul className={cn(CARD, 'divide-y divide-slate-100 overflow-hidden')}>
                    {rows.map((c) => (
                        <li key={c.id}>
                            <button type="button" onClick={() => onOpenId(c.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50">
                                <span className="min-w-0 flex-1">
                                    <span className="flex flex-wrap items-center gap-1.5">
                                        <span className="truncate text-[15px] font-semibold text-slate-900">{c.name}</span>
                                        <Chip tone={STATUS_CHIP[c.status].tone}>{STATUS_CHIP[c.status].label}</Chip>
                                    </span>
                                    <span className="mt-0.5 block truncate text-[13px] text-slate-600">{readable(c.subject)}</span>
                                    <span className="mt-0.5 block truncate text-[12px] text-slate-500">{c.audience_label} · {istDateTime(c.created_at)}</span>
                                </span>
                                <span className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-0.5 text-right text-[12px] sm:grid-cols-4">
                                    <Num label="sent" v={c.sent} />
                                    <Num label="came back" v={c.came_back} />
                                    <Num label="made a test" v={c.made_test} className="hidden sm:block" />
                                    <Num label="clicked" v={c.clicked} className="hidden sm:block" />
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {q.data && q.data.total > rows.length && (
                <div className="flex justify-center">
                    <button type="button" className={PILL_BTN} onClick={() => setLimit((l) => l + 30)}>Show older</button>
                </div>
            )}

            <CampaignSheet id={openId} hourlyLimit={overview?.limits.hourly_limit} onClose={() => onOpenId(null)} />
        </div>
    );
}

function Num({ label, v, className }: { label: string; v: number; className?: string }) {
    return (
        <span className={className}>
            <span className="block text-[15px] font-semibold tabular-nums text-slate-900">{num(v)}</span>
            <span className="text-slate-500">{label}</span>
        </span>
    );
}

function Stat({ label, value, sub, info }: { label: string; value: string; sub?: string; info?: string }) {
    return (
        <div className={cn(CARD, 'px-4 py-3.5')}>
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500">{label}{info && <InfoTip text={info} />}</span>
            <span className="mt-1 block text-[26px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 tabular-nums">{value}</span>
            <span className="text-[12px] text-slate-500">{sub}</span>
        </div>
    );
}

function CampaignSheet({ id, hourlyLimit, onClose }: { id: string | null; hourlyLimit?: number; onClose: () => void }) {
    const q = useQuery({ queryKey: ['email', 'campaign', id], queryFn: () => emailApi.campaign(id!), enabled: !!id, refetchInterval: 15_000 });
    const sender = useSender(id);
    const c = q.data?.campaign;
    const rec = q.data?.recipients ?? [];
    const sent = rec.filter((r) => r.status === 'sent');
    const active = sender.state.phase !== 'idle';

    const close = () => {
        if (sender.state.phase === 'sending' || sender.state.phase === 'waiting') void sender.pause();
        onClose();
    };

    return (
        <WideSheet open={!!id} onOpenChange={(o) => !o && close()} width="narrow"
            title={c?.name ?? 'Send'} subtitle={c ? `${c.audience_label} · ${istDateTime(c.created_at)}` : undefined}>
            {!c ? (
                <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : (
                <div className="space-y-5">
                    {(c.status !== 'done' || active) && (
                        <div className="rounded-2xl bg-white ring-1 ring-slate-900/[0.06]">
                            {active ? (
                                <SendProgress state={sender.state} planned={c.planned} hourlyLimit={hourlyLimit} onPause={sender.pause} onResume={sender.resume} />
                            ) : (
                                <div className="flex items-center gap-3 p-4">
                                    <p className="min-w-0 flex-1 text-[14px] text-slate-700">
                                        {c.status === 'paused' ? 'Paused.' : 'Didn’t finish (the window was closed).'} The rest of the audience hasn’t got it yet.
                                    </p>
                                    <button type="button" onClick={sender.resume}
                                        className="h-10 shrink-0 rounded-full bg-slate-900 px-4 text-[14px] font-semibold text-white hover:bg-slate-800">Resume</button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Mini label="Sent" v={sent.length} />
                        <Mini label="Came back" v={sent.filter((r) => r.came_back).length} of={sent.length} />
                        <Mini label="Clicked" v={sent.filter((r) => r.clicked).length} of={sent.length} />
                        <Mini label="Unsubscribed" v={sent.filter((r) => r.unsubscribed).length} of={sent.length} />
                    </div>

                    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-900/[0.06]">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">Subject</p>
                        <p className="mt-0.5 text-[15px] font-medium text-slate-900">{readable(c.subject)}</p>
                        <p className="mt-2 text-[12px] text-slate-500">From {c.from_name} &lt;{c.from_email}&gt; · replies to {c.reply_to ?? 'support@testoza.com'}</p>
                    </div>

                    <section>
                        <h3 className="mb-1.5 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">People ({num(rec.length)})</h3>
                        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/[0.06]">
                            {rec.map((r) => (
                                <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[14px] font-medium text-slate-900">{r.full_name || r.email}</span>
                                        <span className="block truncate text-[12px] text-slate-500">
                                            {r.status === 'failed' ? r.error || 'Failed' : `${r.email} · ${relative(r.sent_at)}`}
                                        </span>
                                    </span>
                                    <span className="flex shrink-0 flex-wrap justify-end gap-1">
                                        {r.status === 'failed' && <Chip tone="rose">Failed</Chip>}
                                        {r.status === 'sending' && <Chip tone="sky">Sending</Chip>}
                                        {r.came_back && <Chip tone="emerald">Came back</Chip>}
                                        {r.clicked && <Chip tone="sky">Clicked</Chip>}
                                        {r.unsubscribed && <Chip tone="rose">Unsubscribed</Chip>}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            )}
        </WideSheet>
    );
}

function Mini({ label, v, of }: { label: string; v: number; of?: number }) {
    return (
        <div className="rounded-2xl bg-white px-3.5 py-3 ring-1 ring-slate-900/[0.06]">
            <span className="text-[12px] font-medium text-slate-500">{label}</span>
            <span className="mt-0.5 block text-[22px] font-semibold leading-tight tabular-nums text-slate-900">{num(v)}</span>
            {of !== undefined && <span className="text-[11px] text-slate-400">{pct(v, of)}</span>}
        </div>
    );
}
