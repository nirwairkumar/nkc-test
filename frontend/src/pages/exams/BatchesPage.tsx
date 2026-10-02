import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronRight, GraduationCap, KeyRound, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClass } from '@/lib/classesApi';
import { Batch, batchesApi, problemOf } from '@/lib/examSessionsApi';
import { CARD, PRIMARY_BTN, Skeleton } from '@/components/dashboard/dashboardUi';
import { Group, IOS_PRIMARY, IosSheet } from '@/components/exams/ios';

/** /batches — one row per class or timing, with its student list and PINs. */
export default function BatchesPage() {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const asUser = isAdmin ? new URLSearchParams(window.location.search).get('userId') : null;
    const ownerId = asUser || user?.id;
    const [batches, setBatches] = useState<Batch[] | null>(null);
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            setBatches(await batchesApi.list(asUser));
        } catch (err) {
            toast.error(problemOf(err).message);
            setBatches([]);
        }
    }, [asUser]);
    useEffect(() => { if (ownerId) load(); }, [ownerId, load]);

    const create = async () => {
        if (!ownerId || !name.trim()) return;
        setSaving(true);
        const { data, error } = await createClass(name.trim(), ownerId);
        setSaving(false);
        if (error || !data) {
            toast.error('Could not create the batch');
            return;
        }
        setCreating(false);
        setName('');
        navigate(`/batches/${data.id}`);
    };

    return (
        <div className="mx-auto w-full max-w-4xl space-y-7 px-4 pb-16 pt-5 sm:px-6 sm:pt-8 lg:px-8">
            <header className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Candidates</p>
                    <h1 className="mt-1.5 text-[28px] font-bold leading-[1.1] tracking-[-0.025em] text-slate-900 sm:text-[34px]">Batches</h1>
                    <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-600">
                        A candidate list for each class or timing. Candidates then check in by roll number, every result lands on the right name, and you can see who was absent.
                    </p>
                </div>
                <button type="button" onClick={() => setCreating(true)} className={`${PRIMARY_BTN} h-11 px-4 sm:px-5`}>
                    <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} /> <span>New batch</span>
                </button>
            </header>

            {batches === null ? (
                <div className={`${CARD} space-y-3 p-5`}>{[0, 1, 2].map(i => <Skeleton key={i} className="h-14" />)}</div>
            ) : batches.length === 0 ? (
                <div className={`${CARD} px-6 py-12 text-center`}>
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/15 to-sky-500/5 text-sky-700 ring-1 ring-inset ring-sky-500/20">
                        <GraduationCap className="h-6 w-6" />
                    </span>
                    <h2 className="mt-4 text-lg font-semibold text-slate-900">Make your first batch</h2>
                    <p className="mx-auto mt-1.5 max-w-sm text-[15px] text-slate-600">Name it the way candidates know it, like "JEE 2027 – Morning". Then paste the candidate list from Excel.</p>
                    <button type="button" onClick={() => setCreating(true)} className={`${PRIMARY_BTN} mx-auto mt-5 h-11 px-5`}>
                        <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} /> New batch
                    </button>
                </div>
            ) : (
                <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                    {batches.map(b => (
                        <li key={b.id}>
                            <button type="button" onClick={() => navigate(`/batches/${b.id}`)} className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-slate-50 sm:px-5 cursor-pointer">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/15">
                                    <GraduationCap className="h-5 w-5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[16px] font-semibold text-slate-900">{b.name}</p>
                                    <p className="mt-0.5 flex flex-wrap gap-x-3 text-[13px] text-slate-500">
                                        <span>{b.students} candidate{b.students === 1 ? '' : 's'}</span>
                                        {b.students > 0 && (
                                            <span className={`inline-flex items-center gap-1 ${b.with_pin === b.students ? 'text-emerald-700' : ''}`}>
                                                <KeyRound className="h-3.5 w-3.5" /> {b.with_pin === b.students ? 'All have PINs' : `${b.with_pin} with PINs`}
                                            </span>
                                        )}
                                        {b.sittings > 0 && <span>{b.sittings} exam{b.sittings === 1 ? '' : 's'}</span>}
                                    </p>
                                </div>
                                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <IosSheet open={creating} onOpenChange={setCreating} title="New batch"
                footer={(
                    <button type="button" className={IOS_PRIMARY} disabled={!name.trim() || saving} onClick={create}>
                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create batch'}
                    </button>
                )}
            >
                <Group footer='The name your candidates know, like "Class 10 – B" or "NEET 2027 Evening".'>
                    <div className="px-4 py-2.5">
                        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Batch name"
                            onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
                            className="h-10 w-full bg-transparent text-[17px] text-slate-900 placeholder:text-slate-400 outline-none" aria-label="Batch name" />
                    </div>
                </Group>
            </IosSheet>
        </div>
    );
}
