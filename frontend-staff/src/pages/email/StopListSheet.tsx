/**
 * The never-email list: unsubscribes, addresses that bounced, and people the team stopped by
 * hand. A team member can add an address (someone asked on WhatsApp or the phone not to get
 * emails); only the owner can take one off again, in admin → Email → Settings.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Button, Chip, Empty, ErrorBox, Skeleton } from '@/components/ui';
import { dateOnly, num } from '@/lib/format';
import { emailApi, errorText, type Suppression } from './api';
import { FormField, Group, INPUT, Sheet } from './kit';

const REASON: Record<Suppression['reason'], { label: string; tone: 'rose' | 'amber' | 'slate' }> = {
    unsubscribed: { label: 'Unsubscribed', tone: 'rose' },
    bounced: { label: 'Address doesn’t exist', tone: 'amber' },
    stopped: { label: 'Stopped by us', tone: 'slate' },
};

export default function StopListSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
    const qc = useQueryClient();
    const toast = useToast();
    const [input, setInput] = useState('');
    const [q, setQ] = useState('');
    const [email, setEmail] = useState('');
    const [note, setNote] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setQ(input.trim()), 350);
        return () => clearTimeout(t);
    }, [input]);

    const list = useQuery({ queryKey: ['email', 'suppressions', q], queryFn: () => emailApi.suppressions(q || undefined), enabled: open });
    const add = useMutation({
        mutationFn: () => emailApi.suppress(email.trim(), note.trim() || undefined),
        onSuccess: (r) => {
            toast(`${r.email} won’t get broadcasts any more.`);
            setEmail('');
            setNote('');
            void qc.invalidateQueries({ queryKey: ['email'] });
        },
        onError: (e) => toast(errorText(e), 'error'),
    });
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    return (
        <Sheet open={open} onClose={onClose} width="narrow" title="Never email"
            subtitle="Nobody on this list gets a broadcast, from admin or from here.">
            <div className="space-y-5">
                <Group title="Stop someone" footer="Automatic emails about their own exams still reach them. Only the owner can take an address off this list.">
                    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (valid) add.mutate(); }}>
                        <FormField label="Their email address">
                            <input type="email" className={INPUT} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="off" />
                        </FormField>
                        <FormField label="Why (optional)">
                            <input className={INPUT} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. Asked on WhatsApp" />
                        </FormField>
                        <Button type="submit" variant="danger" busy={add.isPending} disabled={!valid}>
                            <Ban className="h-4 w-4" aria-hidden="true" /> Stop emails to this address
                        </Button>
                    </form>
                </Group>

                <section>
                    <div className="mb-2 flex items-center justify-between gap-2 px-1">
                        <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                            On the list{list.data ? ` (${num(list.data.total)})` : ''}
                        </h3>
                    </div>
                    <label className="relative mb-2 block">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a full address to check it"
                            aria-label="Search the list" className={`${INPUT} pl-9`} />
                    </label>
                    {list.isError ? (
                        <ErrorBox message={errorText(list.error, 'Couldn’t load the list.')} onRetry={() => list.refetch()} />
                    ) : !list.data ? (
                        <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
                    ) : list.data.rows.length === 0 ? (
                        <div className="rounded-2xl bg-white ring-1 ring-slate-900/[0.06]">
                            <Empty icon={Ban} title={q ? 'Not on the list' : 'Nobody yet'}>{q ? 'This address can get broadcasts.' : undefined}</Empty>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/[0.06]">
                            {list.data.rows.map((r) => (
                                <li key={`${r.email}-${r.created_at}`} className="flex items-start gap-3 px-4 py-2.5">
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[14px] font-medium text-slate-900">{r.email}</span>
                                        <span className="block truncate text-[12px] text-slate-500">{r.note || '—'} · {dateOnly(r.created_at)}</span>
                                    </span>
                                    <Chip tone={REASON[r.reason]?.tone ?? 'slate'}>{REASON[r.reason]?.label ?? r.reason}</Chip>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </Sheet>
    );
}
