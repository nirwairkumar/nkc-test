/**
 * Copy a test into another account (admin clone). Finds the account by name or email
 * on the server — the old dialog only listed users already loaded on the Users tab.
 */
import { useQuery } from '@tanstack/react-query';
import { Check, Loader2, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { adminCloneTest } from '@/lib/testsApi';
import { cn } from '@/lib/utils';
import { insightsApi, type PeopleRow } from '../analytics/api';
import { CreatorAvatar } from './display';

export default function CloneToUserDialog({ open, onOpenChange, test }: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    test: { id: string; title: string };
}) {
    const [input, setInput] = useState('');
    const [q, setQ] = useState('');
    const [picked, setPicked] = useState<PeopleRow | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => { if (!open) { setInput(''); setQ(''); setPicked(null); } }, [open]);
    useEffect(() => {
        const t = setTimeout(() => setQ(input.trim()), 300);
        return () => clearTimeout(t);
    }, [input]);

    const people = useQuery({
        queryKey: ['tests', 'clone-target', q],
        queryFn: () => insightsApi.people({ segment: 'members', q, sort: 'active', limit: 8 }),
        enabled: open && q.length >= 2,
        staleTime: 30_000,
    });

    const clone = async () => {
        if (!picked) return;
        setBusy(true);
        const { error } = await adminCloneTest(test.id, picked.id);
        setBusy(false);
        if (error) return toast.error(`Couldn’t copy the test: ${error}`);
        toast.success(`Copied to ${picked.full_name || picked.email}. It’s private in their My Tests.`);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-[22px] p-5">
                <DialogHeader>
                    <DialogTitle className="!text-[17px]">Copy to a user’s account</DialogTitle>
                    <DialogDescription className="text-[13px]">
                        “{test.title}” is copied as a private test in their My Tests. Settings, exam link and results are not copied.
                    </DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                        autoFocus
                        type="search"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Name or email"
                        aria-label="Find an account"
                        className="h-10 w-full rounded-xl border-transparent bg-slate-100 pl-9 pr-3 text-[14px] text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                </div>
                <div className="max-h-64 min-h-[96px] overflow-y-auto rounded-xl ring-1 ring-slate-900/[0.06]">
                    {q.length < 2 ? (
                        <p className="px-4 py-6 text-center text-[13px] text-slate-500">Type at least 2 letters.</p>
                    ) : people.isLoading ? (
                        <p className="flex items-center justify-center gap-2 px-4 py-6 text-[13px] text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Searching…</p>
                    ) : !people.data?.rows.length ? (
                        <p className="px-4 py-6 text-center text-[13px] text-slate-500">No account matches.</p>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {people.data.rows.map((p) => {
                                const on = picked?.id === p.id;
                                return (
                                    <li key={p.id}>
                                        <button type="button" onClick={() => setPicked(p)} aria-pressed={on}
                                            className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors', on ? 'bg-sky-50' : 'hover:bg-slate-50')}>
                                            <CreatorAvatar name={p.full_name || p.email || ''} url={p.avatar_url || undefined} size="md" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[14px] font-semibold text-slate-900">{p.full_name || 'No name'}</span>
                                                <span className="block truncate text-[12px] text-slate-500">{p.email}</span>
                                            </span>
                                            {on && <Check className="h-[18px] w-[18px] shrink-0 text-sky-600" strokeWidth={2.75} />}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => onOpenChange(false)} className="h-10 rounded-xl px-4 text-[14px] font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
                    <button type="button" onClick={clone} disabled={!picked || busy}
                        className="h-10 rounded-xl bg-sky-600 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40">
                        {busy ? 'Copying…' : picked ? `Copy to ${(picked.full_name || picked.email || '').split(' ')[0]}` : 'Copy'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
