/** A list of library emails: number in its series, who it's for, how it's doing, and how many it can go to today. */
import { ChevronRight, Clock, Send } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
import { istDate, num, relative } from '../analytics/format';
import { CARD, Chip } from '../analytics/ui';
import type { TemplateSummary } from './api';
import { readable, STAGE, WHO, WHO_TONE } from './model';

export default function TemplateList({ items, onSend, onOpen }: {
    items: TemplateSummary[];
    /** Playbook: a send button with today's count. */
    onSend?: (t: TemplateSummary) => void;
    /** Library: the row opens the editor. */
    onOpen?: (t: TemplateSummary) => void;
}) {
    return (
        <ul className={cn(CARD, 'divide-y divide-slate-100 overflow-hidden')}>
            {items.map((t) => (
                <li key={t.key} className="flex items-center gap-3 px-4 py-3">
                    <button type="button" onClick={() => (onOpen ?? onSend)?.(t)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                        <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                            t.track ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500')}
                            title={t.track ? `Email ${t.step} of its series` : 'One-off email'}>
                            {t.track ? t.step : '1×'}
                        </span>
                        <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-1.5">
                                <span className="truncate text-[15px] font-semibold text-slate-900">{t.name}</span>
                                {t.audiences.map((a) => <Chip key={a} tone={WHO_TONE[a]}>{WHO[a]?.plural ?? a}</Chip>)}
                                {t.stages.length > 1 && t.stages.map((s) => <Chip key={s}>{STAGE[s]?.short}</Chip>)}
                            </span>
                            <span className="mt-0.5 block truncate text-[13px] text-slate-600">{readable(t.subject)}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-slate-500">
                                <span>{t.sent ? `Sent to ${num(t.sent)}` : 'Not sent yet'}{t.last_sent_at ? `, last ${relative(t.last_sent_at)}` : ''}</span>
                                {t.waiting > 0 && (
                                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden="true" />
                                        {num(t.waiting)} waiting{t.next_ready_at ? `, next ready ${istDate(t.next_ready_at)}` : ''}
                                    </span>
                                )}
                            </span>
                        </span>
                    </button>
                    {onSend && !onOpen && (
                        <button type="button" onClick={() => onSend(t)} disabled={t.ready === 0}
                            className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
                                t.ready > 0 ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-slate-100 text-slate-400')}
                            title={t.ready > 0 ? `Review and send to ${t.ready}` : 'Nobody is ready for this email today'}>
                            {t.ready > 0 ? <><Send className="h-3.5 w-3.5" aria-hidden="true" />{num(t.ready)}</> : '0'}
                        </button>
                    )}
                    {onOpen && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />}
                </li>
            ))}
        </ul>
    );
}
