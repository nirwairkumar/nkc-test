import React, { useState } from 'react';
import { GraduationCap, Plus, Loader2 } from 'lucide-react';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { BatchRow } from '@/lib/teacherDashboardApi';
import { CARD, PRIMARY_BTN, TEXT_BTN } from './dashboardUi';
import { pctText, plural } from './format';

interface BatchesCardProps {
    batches: BatchRow[];
    isInstitution: boolean;
    onCreate: (name: string) => Promise<boolean>;
    onAssignTests: () => void;
}

/** One row per batch (a "class" in the data): how many tests it has and how it is scoring. */
export default function BatchesCard({ batches, isInstitution, onCreate, onAssignTests }: BatchesCardProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        setSaving(true);
        const ok = await onCreate(trimmed);
        setSaving(false);
        if (ok) {
            setName('');
            setOpen(false);
        }
    };

    const hasUnassignedBatches = batches.some(b => b.tests === 0);

    return (
        <section aria-labelledby="batches-heading" className={`${CARD} overflow-hidden`}>
            <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
                <h2 id="batches-heading" className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900">Batches</h2>
                <button type="button" onClick={() => setOpen(true)} className={TEXT_BTN}>
                    <Plus className="h-4 w-4" /> New batch
                </button>
            </div>

            {batches.length === 0 ? (
                <div className="px-4 pb-4 pt-2 sm:px-5">
                    <p className="text-[13px] leading-relaxed text-slate-600">
                        {isInstitution
                            ? 'Make one batch per class or timing, like "JEE 2027 – Morning". Put each test in a batch to see how every batch is doing here.'
                            : 'Teach more than one class? Make a batch for each so their results stay apart.'}
                    </p>
                    <button type="button" onClick={() => setOpen(true)} className={`${PRIMARY_BTN} mt-3 h-9 px-3.5 text-[13px]`}>
                        <GraduationCap className="h-4 w-4" /> Make a batch
                    </button>
                </div>
            ) : (
                <>
                    <ul className="mt-2 divide-y divide-slate-100">
                        {batches.map(b => (
                            <li key={b.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/15">
                                    <GraduationCap className="h-4 w-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[14px] font-medium text-slate-900" title={b.name}>{b.name}</p>
                                    <p className="text-[12px] text-slate-500">
                                        {plural(b.tests, 'test')}
                                        {b.students > 0 && ` · ${plural(b.students, 'student')}`}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-[15px] font-semibold text-slate-900 tabular-nums">{pctText(b.avgPct)}</p>
                                    <p className="text-[11px] text-slate-500">{b.results > 0 ? 'average' : 'no results'}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 sm:px-5">
                        <p className="text-[12px] text-slate-500">Last 60 days</p>
                        {hasUnassignedBatches && (
                            <button type="button" onClick={onAssignTests} className={TEXT_BTN}>Add tests to a batch</button>
                        )}
                    </div>
                </>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-[min(400px,calc(100vw-32px))] rounded-2xl">
                    <form onSubmit={submit}>
                        <DialogHeader>
                            <DialogTitle>New batch</DialogTitle>
                            <DialogDescription>
                                Give it the name your students know, like "Class 10 – B" or "NEET 2027 Evening".
                            </DialogDescription>
                        </DialogHeader>
                        <Input
                            autoFocus
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Batch name"
                            maxLength={60}
                            className="mt-4 h-11 rounded-xl text-[15px]"
                        />
                        <p className="mt-2 text-[12px] text-slate-500">
                            Then tap ••• on any test and choose "Add to batch".
                        </p>
                        <DialogFooter className="mt-5 gap-2 sm:gap-2">
                            <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-xl bg-slate-100 px-4 text-[15px] font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer">
                                Cancel
                            </button>
                            <button type="submit" disabled={!name.trim() || saving} className={`${PRIMARY_BTN} h-11 px-5`}>
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create batch
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </section>
    );
}
