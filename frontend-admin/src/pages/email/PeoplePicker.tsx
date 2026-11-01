/**
 * Compose → Who gets it: everyone in the email's audience with a tick box, name and email.
 * Untick someone to leave them out of this send; search anyone (any stage or group) and add
 * them. People who can't get it right now (emailed this week, unsubscribed…) show why and
 * have no tick. The send stores add_ids / skip_ids and the SQL honours both.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Check, Search, UserPlus, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { num, relative } from '../analytics/format';
import { Chip } from '../analytics/ui';
import { emailApi, type Person } from './api';
import { STAGE, STATUS, WHO } from './model';
import { INPUT } from './parts';

export default function PeoplePicker({ rows, skip, onToggle, onSetMany, addIds, onAdd, onRemoveAdded, more }: {
    rows: Person[];
    skip: Set<string>;
    onToggle: (id: string) => void;
    onSetMany: (ids: string[], ticked: boolean) => void;
    addIds: string[];
    onAdd: (id: string) => void;
    onRemoveAdded: (id: string) => void;
    /** People in the audience beyond the ones loaded (shown as a note). */
    more: number;
}) {
    const [q, setQ] = useState('');
    const shown = useMemo(() => {
        const s = q.trim().toLowerCase();
        return s ? rows.filter((r) => `${r.full_name ?? ''} ${r.email}`.toLowerCase().includes(s)) : rows;
    }, [rows, q]);
    const readyIds = shown.filter((r) => r.status === 'ready').map((r) => r.id);
    const allTicked = readyIds.length > 0 && readyIds.every((id) => !skip.has(id));

    return (
        <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center gap-2">
                <p className="mr-auto text-[13px] font-semibold text-slate-700">People</p>
                <label className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find in this list" aria-label="Find in this list"
                        className={cn(INPUT, 'h-8 w-44 rounded-full pl-8 text-[13px]')} />
                </label>
                <button type="button" disabled={!readyIds.length} onClick={() => onSetMany(readyIds, !allTicked)}
                    className="h-8 rounded-full bg-slate-100 px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50">
                    {allTicked ? 'Untick all' : 'Tick all'}
                </button>
            </div>

            <ul className="mt-2 max-h-96 divide-y divide-slate-100 overflow-y-auto rounded-xl bg-white ring-1 ring-slate-900/[0.06]">
                {shown.length === 0 && (
                    <li className="px-3 py-4 text-center text-[13px] text-slate-500">{rows.length ? 'Nobody matches.' : 'Nobody in this audience yet.'}</li>
                )}
                {shown.map((r) => (
                    <PersonRow key={r.id} r={r} ticked={r.status === 'ready' && !skip.has(r.id)}
                        onToggle={() => onToggle(r.id)} onRemove={r.added ? () => onRemoveAdded(r.id) : undefined} />
                ))}
                {more > 0 && !q && (
                    <li className="px-3 py-2 text-center text-[12px] text-slate-500">and {num(more)} more, not shown</li>
                )}
            </ul>

            <AddSomeone inList={new Set(rows.map((r) => r.id))} addIds={addIds} onAdd={onAdd} />
        </div>
    );
}

function PersonRow({ r, ticked, onToggle, onRemove }: { r: Person; ticked: boolean; onToggle: () => void; onRemove?: () => void }) {
    const can = r.status === 'ready';
    return (
        <li className={cn('flex items-center gap-3 px-3 py-2', !can && 'bg-slate-50/60')}>
            <button type="button" role="checkbox" aria-checked={ticked} disabled={!can} onClick={onToggle}
                aria-label={`${ticked ? 'Leave out' : 'Include'} ${r.full_name || r.email}`}
                title={can ? undefined : STATUS[r.status].long}
                className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 ring-inset transition-colors',
                    ticked ? 'bg-sky-600 text-white ring-sky-600' : 'bg-white ring-slate-300',
                    can ? 'cursor-pointer hover:ring-sky-500' : 'cursor-not-allowed opacity-40')}>
                {ticked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </button>
            <span className={cn('min-w-0 flex-1', !ticked && can && 'opacity-60')}>
                <span className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate text-[13px] font-semibold text-slate-900">{r.full_name || r.email.split('@')[0]}</span>
                    <span className="truncate text-[12px] text-slate-500">{r.email}</span>
                </span>
                <span className="block truncate text-[12px] text-slate-400">
                    {WHO[r.who]?.label ?? r.who} · {STAGE[r.stage]?.short ?? r.stage}
                    {r.last_emailed_at ? ` · emailed ${relative(r.last_emailed_at)}` : ''}
                </span>
            </span>
            {r.added && <Chip tone="violet" title="Added by hand for this send">Added</Chip>}
            {!can && <Chip tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Chip>}
            {onRemove && (
                <button type="button" onClick={onRemove} aria-label={`Remove ${r.full_name || r.email}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </li>
    );
}

/** Search anyone by name or email and add them to this send. */
function AddSomeone({ inList, addIds, onAdd }: { inList: Set<string>; addIds: string[]; onAdd: (id: string) => void }) {
    const [q, setQ] = useState('');
    const [term, setTerm] = useState('');
    useEffect(() => {
        const t = window.setTimeout(() => setTerm(q.trim()), 250);
        return () => window.clearTimeout(t);
    }, [q]);
    const found = useQuery({
        queryKey: ['email', 'audience', 'add-search', term],
        queryFn: () => emailApi.audience({ q: term, everyone: true, show: 'all' }, 8),
        enabled: term.length >= 2,
        placeholderData: keepPreviousData,
        staleTime: 15_000,
    });
    const results = term.length >= 2 ? found.data?.rows ?? [] : [];

    return (
        <div className="mt-3">
            <label className="relative block">
                <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add someone: search any name or email"
                    aria-label="Add someone by name or email" className={cn(INPUT, 'pl-9')} />
            </label>
            {term.length >= 2 && (
                <ul className="mt-1.5 divide-y divide-slate-100 overflow-hidden rounded-xl bg-white ring-1 ring-slate-900/[0.08] shadow-sm">
                    {found.isLoading && <li className="px-3 py-2.5 text-[13px] text-slate-500">Searching…</li>}
                    {!found.isLoading && results.length === 0 && (
                        <li className="px-3 py-2.5 text-[13px] text-slate-500">No one found for “{term}”.</li>
                    )}
                    {results.map((p) => {
                        const already = inList.has(p.id) || addIds.includes(p.id);
                        return (
                            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                                <span className="min-w-0 flex-1">
                                    <span className="flex min-w-0 items-baseline gap-2">
                                        <span className="truncate text-[13px] font-semibold text-slate-900">{p.full_name || p.email.split('@')[0]}</span>
                                        <span className="truncate text-[12px] text-slate-500">{p.email}</span>
                                    </span>
                                    <span className="block truncate text-[12px] text-slate-400">
                                        {WHO[p.who]?.label ?? 'Took a test'} · {STAGE[p.stage]?.short ?? p.stage}
                                    </span>
                                </span>
                                {already ? (
                                    <span className="text-[12px] font-semibold text-slate-400">In the list</span>
                                ) : (
                                    <button type="button" onClick={() => { onAdd(p.id); setQ(''); }}
                                        className="h-8 shrink-0 rounded-full bg-sky-600 px-3 text-[12px] font-semibold text-white hover:bg-sky-700">
                                        Add
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
