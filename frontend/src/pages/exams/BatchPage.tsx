import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
    ChevronLeft, ChevronRight, KeyRound, Loader2, MoreHorizontal, Pencil, Plus, Printer, Search, Trash2, UserPlus,
} from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deleteClass } from '@/lib/classesApi';
import { ExamSession, NewPin, RosterStudent, batchesApi, examSessionsApi, problemOf } from '@/lib/examSessionsApi';
import { CARD, MENU_ITEM, MENU_TRIGGER, PILL_BTN, PRIMARY_BTN, Skeleton } from '@/components/dashboard/dashboardUi';
import AddStudentsSheet from '@/components/exams/AddStudentsSheet';
import NewExamSheet from '@/components/exams/NewExamSheet';
import { ChoiceRow, Group, IOS_PRIMARY, IosSheet } from '@/components/exams/ios';
import { dayTime } from '@/components/exams/examFormat';
import { PhaseBadge } from './ExamsPage';
import { useAuth } from '@/contexts/AuthContext';

/** One batch: its students, their PINs, and the exams it has sat. */
export default function BatchPage() {
    const { id = '' } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [batch, setBatch] = useState<{ id: string; name: string; students: RosterStudent[] } | null>(null);
    const [sessions, setSessions] = useState<ExamSession[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [adding, setAdding] = useState(false);
    const [pinsOpen, setPinsOpen] = useState(false);
    const [examOpen, setExamOpen] = useState(false);
    const [editing, setEditing] = useState<RosterStudent | null>(null);
    const [renaming, setRenaming] = useState(false);

    const load = useCallback(async () => {
        try {
            setBatch(await batchesApi.get(id));
            setError(null);
        } catch (err) {
            const p = problemOf(err);
            setError(p.status === 404 ? 'This batch does not exist, or it belongs to another account.' : p.message);
        }
        examSessionsApi.list().then(all => setSessions(all.filter(s => s.class_id === id))).catch(() => { });
    }, [id]);
    useEffect(() => { load(); }, [load]);

    const students = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = batch?.students || [];
        return q ? list.filter(s => s.full_name.toLowerCase().includes(q) || s.roll_no.toLowerCase().includes(q)) : list;
    }, [batch, query]);

    const openSlips = (pins: NewPin[]) => navigate(`/batches/${id}/slips`, { state: { pins, batchName: batch?.name } });

    const newPinFor = async (s: RosterStudent) => {
        try {
            const res = await batchesApi.makePins(id, { studentIds: [s.id] });
            openSlips(res.pins);
        } catch (err) {
            toast.error(problemOf(err).message);
        }
    };

    const removeStudent = async (s: RosterStudent) => {
        try {
            await batchesApi.removeStudent(id, s.id);
            toast.success(`${s.full_name} removed`);
            load();
        } catch (err) {
            toast.error(problemOf(err).message);
        }
    };

    if (error) {
        return (
            <div className="mx-auto max-w-xl px-4 py-16 text-center">
                <p className="text-[17px] font-semibold text-slate-900">{error}</p>
                <button type="button" onClick={() => navigate('/batches')} className="mt-4 text-[15px] font-semibold text-sky-700 hover:underline cursor-pointer">Back to batches</button>
            </div>
        );
    }
    if (!batch) return <div className="mx-auto max-w-4xl space-y-4 px-4 pt-8 sm:px-6"><Skeleton className="h-8 w-60" /><Skeleton className="h-72 w-full rounded-2xl" /></div>;

    const withPin = batch.students.filter(s => s.has_pin).length;

    return (
        <div className="mx-auto w-full max-w-4xl space-y-6 px-4 pb-16 pt-4 sm:px-6 sm:pt-6 lg:px-8">
            <button type="button" onClick={() => navigate('/batches')} className="-ml-2 inline-flex h-9 items-center rounded-full pr-3 text-[15px] font-medium text-sky-700 hover:bg-sky-50 cursor-pointer">
                <ChevronLeft className="h-5 w-5" /> Batches
            </button>

            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-[28px] font-bold leading-tight tracking-[-0.025em] text-slate-900 sm:text-[32px]">
                        <span className="truncate">{batch.name}</span>
                        <button type="button" aria-label="Rename batch" onClick={() => setRenaming(true)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer">
                            <Pencil className="h-4 w-4" />
                        </button>
                    </h1>
                    <p className="mt-1 text-[15px] text-slate-600">
                        {batch.students.length} candidate{batch.students.length === 1 ? '' : 's'}
                        {batch.students.length > 0 && ` · ${withPin === batch.students.length ? 'everyone has a PIN' : `${withPin} with PINs`}`}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" className={`${PRIMARY_BTN} h-11 px-4`} onClick={() => setAdding(true)}>
                        <UserPlus className="h-4 w-4" /> Add candidates
                    </button>
                    {batch.students.length > 0 && (
                        <button type="button" className={`${PILL_BTN} h-11 px-4`} onClick={() => setPinsOpen(true)}>
                            <KeyRound className="h-4 w-4 text-sky-600" /> PINs
                        </button>
                    )}
                    <button type="button" className={`${PILL_BTN} h-11 px-4`} onClick={() => setExamOpen(true)}>
                        <Plus className="h-4 w-4 text-sky-600" /> Exam for this batch
                    </button>
                </div>
            </header>

            {batch.students.length === 0 ? (
                <div className={`${CARD} px-6 py-12 text-center`}>
                    <h2 className="text-lg font-semibold text-slate-900">No candidates yet</h2>
                    <p className="mx-auto mt-1.5 max-w-sm text-[15px] text-slate-600">Copy the roll numbers and names from Excel and paste them. Parent phone numbers are optional but let you send results on WhatsApp.</p>
                    <button type="button" className={`${PRIMARY_BTN} mx-auto mt-5 h-11 px-5`} onClick={() => setAdding(true)}>
                        <UserPlus className="h-4 w-4" /> Add candidates
                    </button>
                </div>
            ) : (
                <section>
                    <div className="relative mb-3 max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or roll number" aria-label="Search candidates"
                            className="h-10 w-full rounded-xl bg-slate-200/60 pl-9 pr-3 text-[15px] text-slate-900 placeholder:text-slate-500 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/40" />
                    </div>
                    <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                        {students.map(s => (
                            <li key={s.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                                <span className="w-20 shrink-0 truncate text-[14px] font-semibold tabular-nums text-slate-500 sm:w-28">{s.roll_no}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[15px] text-slate-900">{s.full_name}</p>
                                    {s.parent_phone && <p className="text-[13px] text-slate-500">{s.parent_phone}</p>}
                                </div>
                                <span className={`hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium sm:inline-flex ${s.has_pin ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    <KeyRound className="h-3 w-3" /> {s.has_pin ? 'PIN set' : 'No PIN'}
                                </span>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button type="button" aria-label={`Actions for ${s.full_name}`} className={MENU_TRIGGER}><MoreHorizontal className="h-[18px] w-[18px]" /></button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
                                        <DropdownMenuItem className={MENU_ITEM} onClick={() => setEditing(s)}><Pencil className="mr-2.5 h-4 w-4 text-slate-500" /> Edit</DropdownMenuItem>
                                        <DropdownMenuItem className={MENU_ITEM} onClick={() => newPinFor(s)}><KeyRound className="mr-2.5 h-4 w-4 text-slate-500" /> {s.has_pin ? 'New PIN' : 'Make PIN'}</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className={`${MENU_ITEM} text-red-600 focus:bg-red-50 focus:text-red-600`} onClick={() => removeStudent(s)}><Trash2 className="mr-2.5 h-4 w-4" /> Remove</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </li>
                        ))}
                        {students.length === 0 && <li className="px-5 py-6 text-center text-[14px] text-slate-500">No candidate matches "{query}".</li>}
                    </ul>
                </section>
            )}

            {sessions.length > 0 && (
                <section>
                    <h2 className="mb-3 px-1 text-lg font-semibold tracking-[-0.01em] text-slate-900">Exams for this batch</h2>
                    <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                        {sessions.map(s => (
                            <li key={s.id}>
                                <button type="button" onClick={() => navigate(`/exams/${s.id}`)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 sm:px-5 cursor-pointer">
                                    <div className="min-w-0 flex-1">
                                        <p className="flex items-center gap-2 truncate text-[15px] font-semibold text-slate-900">{s.test.title} <PhaseBadge session={s} /></p>
                                        <p className="text-[13px] text-slate-500">{dayTime(s.opens_at)} · {s.counts.submitted} submitted</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <div className="pt-4">
                <DeleteBatch id={id} name={batch.name} onDeleted={() => navigate('/batches', { replace: true })} />
            </div>

            <AddStudentsSheet open={adding} onOpenChange={setAdding} classId={id} onDone={load} />
            <PinsSheet open={pinsOpen} onOpenChange={setPinsOpen} classId={id} missing={batch.students.length - withPin} total={batch.students.length} onMade={openSlips} />
            <EditStudentSheet student={editing} onClose={() => setEditing(null)} classId={id} onSaved={load} />
            <RenameSheet open={renaming} onOpenChange={setRenaming} id={id} name={batch.name} onSaved={load} />
            <NewExamSheet open={examOpen} onOpenChange={setExamOpen} ownerId={user?.id} presetClassId={id} onCreated={() => load()} />
        </div>
    );
}

function PinsSheet({ open, onOpenChange, classId, missing, total, onMade }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classId: string;
    missing: number;
    total: number;
    onMade: (pins: NewPin[]) => void;
}) {
    const [which, setWhich] = useState<'missing' | 'all'>(missing > 0 ? 'missing' : 'all');
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (open) setWhich(missing > 0 ? 'missing' : 'all'); }, [open, missing]);

    const make = async () => {
        setBusy(true);
        try {
            const res = await batchesApi.makePins(classId, { onlyMissing: which === 'missing' });
            onOpenChange(false);
            onMade(res.pins);
        } catch (err) {
            toast.error(problemOf(err).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <IosSheet open={open} onOpenChange={onOpenChange} title="PINs"
            footer={(
                <button type="button" className={IOS_PRIMARY} onClick={make} disabled={busy || (which === 'missing' && missing === 0)}>
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Printer className="h-5 w-5" /> Make PINs and print slips</>}
                </button>
            )}
        >
            <Group header="Make PINs for" footer="PINs are shown once, on the slips. TestoZa keeps only a scrambled copy, so a lost slip means a new PIN.">
                <ChoiceRow selected={which === 'missing'} onSelect={() => setWhich('missing')} disabled={missing === 0}
                    title={`Candidates without one (${missing})`} hint="Everyone else keeps their PIN." />
                <ChoiceRow selected={which === 'all'} onSelect={() => setWhich('all')}
                    title={`Everyone (${total})`} hint="All old PINs stop working." />
            </Group>
        </IosSheet>
    );
}

function EditStudentSheet({ student, onClose, classId, onSaved }: {
    student: RosterStudent | null;
    onClose: () => void;
    classId: string;
    onSaved: () => void;
}) {
    const [form, setForm] = useState({ roll_no: '', full_name: '', parent_phone: '' });
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (student) setForm({ roll_no: student.roll_no, full_name: student.full_name, parent_phone: student.parent_phone || '' });
    }, [student]);

    const save = async () => {
        if (!student) return;
        setBusy(true);
        try {
            await batchesApi.editStudent(classId, student.id, form);
            toast.success('Saved');
            onSaved();
            onClose();
        } catch (err) {
            toast.error(problemOf(err).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <IosSheet open={!!student} onOpenChange={(o) => { if (!o) onClose(); }} title="Edit candidate"
            footer={<button type="button" className={IOS_PRIMARY} onClick={save} disabled={busy || !form.roll_no.trim() || !form.full_name.trim()}>{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save'}</button>}>
            <Group>
                {([['roll_no', 'Roll number'], ['full_name', 'Full name'], ['parent_phone', "Parent's phone"]] as const).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-3 px-4 py-2">
                        <span className="w-32 shrink-0 text-[15px] text-slate-500">{label}</span>
                        <input value={form[key]} onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))} aria-label={label}
                            inputMode={key === 'parent_phone' ? 'tel' : undefined}
                            className="h-10 min-w-0 flex-1 bg-transparent text-[17px] text-slate-900 outline-none" />
                    </div>
                ))}
            </Group>
        </IosSheet>
    );
}

function RenameSheet({ open, onOpenChange, id, name, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; id: string; name: string; onSaved: () => void }) {
    const [value, setValue] = useState(name);
    useEffect(() => { if (open) setValue(name); }, [open, name]);
    const save = async () => {
        try {
            await batchesApi.rename(id, value.trim());
            onSaved();
            onOpenChange(false);
        } catch (err) {
            toast.error(problemOf(err).message);
        }
    };
    return (
        <IosSheet open={open} onOpenChange={onOpenChange} title="Rename batch"
            footer={<button type="button" className={IOS_PRIMARY} onClick={save} disabled={!value.trim()}>Save</button>}>
            <Group>
                <div className="px-4 py-2.5">
                    <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} maxLength={80} aria-label="Batch name"
                        className="h-10 w-full bg-transparent text-[17px] text-slate-900 outline-none" />
                </div>
            </Group>
        </IosSheet>
    );
}

function DeleteBatch({ id, name, onDeleted }: { id: string; name: string; onDeleted: () => void }) {
    const [confirm, setConfirm] = useState(false);
    const remove = async () => {
        const { error } = await deleteClass(id);
        if (error) {
            toast.error('Could not delete the batch');
            return;
        }
        toast.success(`"${name}" deleted`);
        onDeleted();
    };
    return confirm ? (
        <div className={`${CARD} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
            <p className="text-[14px] text-slate-700">Delete "{name}" and its candidate list? Exam results stay.</p>
            <div className="flex gap-2">
                <button type="button" className={PILL_BTN} onClick={() => setConfirm(false)}>Cancel</button>
                <button type="button" onClick={remove} className="inline-flex h-9 items-center rounded-full bg-red-600 px-4 text-[13px] font-semibold text-white hover:bg-red-700 cursor-pointer">Delete batch</button>
            </div>
        </div>
    ) : (
        <button type="button" onClick={() => setConfirm(true)} className="text-[14px] font-medium text-red-600 hover:underline cursor-pointer">Delete this batch</button>
    );
}
