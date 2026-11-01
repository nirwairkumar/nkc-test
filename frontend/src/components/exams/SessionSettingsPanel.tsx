import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { IdentityMode, MonitorData, ResultsRelease, StartMode, examSessionsApi, problemOf } from '@/lib/examSessionsApi';
import { PRIMARY_BTN } from '@/components/dashboard/dashboardUi';
import { ChoiceRow, Group, Row, Segmented } from './ios';
import { IDENTITY_HINT, IDENTITY_LABEL, RELEASE_LABEL } from './examFormat';

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Change a sitting before or during the exam. The check-in rule is fixed once anyone joins. */
export default function SessionSettingsPanel({ data, onChanged, onDeleted }: {
    data: MonitorData;
    onChanged: () => void;
    onDeleted: () => void;
}) {
    const ended = data.phase === 'ended';
    const [name, setName] = useState(data.name);
    const [opensAt, setOpensAt] = useState(toLocalInput(data.opens_at));
    const [closesAt, setClosesAt] = useState(toLocalInput(data.closes_at));
    const [lateEntry, setLateEntry] = useState(data.late_entry_minutes);
    const [startMode, setStartMode] = useState<StartMode>(data.start_mode);
    const [identity, setIdentity] = useState<IdentityMode>(data.identity_mode);
    const [walkIn, setWalkIn] = useState(data.allow_walk_in);
    const [release, setRelease] = useState<ResultsRelease>(data.results_release);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        setName(data.name);
        setOpensAt(toLocalInput(data.opens_at));
        setClosesAt(toLocalInput(data.closes_at));
        // Only reset on a different sitting; polling must not wipe what is being typed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.id]);

    const joined = data.counts.joined > 0;
    const live = data.phase === 'live';

    const save = async () => {
        setSaving(true);
        try {
            const patch: Record<string, unknown> = {
                name,
                late_entry_minutes: lateEntry,
                results_release: release,
                allow_walk_in: walkIn,
            };
            if (!live) {
                patch.start_mode = startMode;
                patch.opens_at = new Date(opensAt).toISOString();
            }
            patch.closes_at = new Date(closesAt).toISOString();
            if (!joined && identity !== data.identity_mode) patch.identity_mode = identity;
            await examSessionsApi.update(data.id, patch as any);
            toast.success('Saved');
            onChanged();
        } catch (err) {
            toast.error(problemOf(err).message);
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        try {
            await examSessionsApi.remove(data.id);
            toast.success('Exam deleted. Submitted answers stay in the test\'s results.');
            onDeleted();
        } catch (err) {
            toast.error(problemOf(err).message);
        }
    };

    return (
        <section className="max-w-2xl rounded-[22px] bg-[#f2f2f7] p-3 sm:p-4">
            {ended ? (
                <Group footer="This sitting has ended, so its settings are locked.">
                    <Row label="Name"><span className="truncate">{data.name}</span></Row>
                    <Row label="Check-in"><span>{IDENTITY_LABEL[data.identity_mode]}</span></Row>
                    <Row label="Results"><span>{RELEASE_LABEL[data.results_release]}</span></Row>
                </Group>
            ) : (
                <>
                    <Group header="Name">
                        <div className="px-4 py-2.5">
                            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} aria-label="Exam name"
                                className="h-10 w-full bg-transparent text-[17px] text-slate-900 outline-none" />
                        </div>
                    </Group>

                    <Group header="Time" footer={live ? 'The exam has started, so only the closing time can move.' : undefined}>
                        <Row label="Starts">
                            <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} disabled={live}
                                className="rounded-lg bg-slate-100 px-2 py-1.5 text-[15px] text-slate-900 outline-none disabled:opacity-50" aria-label="Start time" />
                        </Row>
                        <Row label="Closes">
                            <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)}
                                className="rounded-lg bg-slate-100 px-2 py-1.5 text-[15px] text-slate-900 outline-none" aria-label="Close time" />
                        </Row>
                        <Row label="Late entry">
                            <select value={lateEntry} onChange={(e) => setLateEntry(Number(e.target.value))} aria-label="Late entry" className="bg-transparent text-right text-[17px] text-slate-600 outline-none">
                                {[0, 5, 10, 15, 30, 60].map(m => <option key={m} value={m}>{m === 0 ? 'None' : `${m} min`}</option>)}
                            </select>
                        </Row>
                        {!live && (
                            <Row label="Start">
                                <Segmented<StartMode> value={startMode} onChange={setStartMode} ariaLabel="Start mode" options={[{ value: 'auto', label: 'On time' }, { value: 'manual', label: 'I tap Start' }]} />
                            </Row>
                        )}
                    </Group>

                    <Group header="Candidates check in with" footer={joined ? 'Candidates have joined, so this can no longer change.' : undefined}>
                        {(['name', 'roll', 'roll_pin'] as IdentityMode[]).map(mode => (
                            <ChoiceRow
                                key={mode}
                                selected={identity === mode}
                                onSelect={() => setIdentity(mode)}
                                title={IDENTITY_LABEL[mode]}
                                hint={IDENTITY_HINT[mode]}
                                disabled={joined || (mode === 'roll_pin' && !data.roster.with_pin)}
                            />
                        ))}
                        {data.class_id && identity !== 'roll_pin' && (
                            <Row label="Candidates not on the list" hint="Let them join by typing their name.">
                                <Switch checked={walkIn} onCheckedChange={setWalkIn} aria-label="Allow candidates not on the list" />
                            </Row>
                        )}
                    </Group>

                    <Group header="Show results to candidates">
                        {(['on_end', 'immediate', 'manual'] as ResultsRelease[]).map(mode => (
                            <ChoiceRow key={mode} selected={release === mode} onSelect={() => setRelease(mode)} title={RELEASE_LABEL[mode]} />
                        ))}
                    </Group>

                    <button type="button" onClick={save} disabled={saving} className={`${PRIMARY_BTN} mt-5 h-12 w-full`}>
                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save changes'}
                    </button>
                </>
            )}

            <Group className="mt-6">
                <button type="button" onClick={() => setConfirmDelete(true)} className="flex h-12 w-full items-center justify-center gap-2 text-[17px] text-red-600 hover:bg-red-50 cursor-pointer">
                    <Trash2 className="h-4 w-4" /> Delete this exam
                </button>
            </Group>

            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent className="max-w-[min(400px,calc(100vw-32px))] rounded-2xl">
                    <AlertDialogTitle>Delete "{data.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                        The code stops working and this sitting's monitor and rank list go away. Answers already submitted stay in the test's own results.
                    </AlertDialogDescription>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        <AlertDialogCancel className="m-0 h-11 rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={remove} className="h-11 rounded-xl bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}
