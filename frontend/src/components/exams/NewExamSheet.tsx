import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, ChevronDown, Copy, Loader2, MonitorPlay } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { fetchTestsByUserId } from '@/lib/testsApi';
import {
    Batch, ExamSession, IdentityMode, ResultsRelease, StartMode, batchesApi, examSessionsApi, formatCode, joinUrl, problemOf,
} from '@/lib/examSessionsApi';
import { ChoiceRow, Group, IOS_PRIMARY, IosSheet, Row, Segmented } from './ios';
import { IDENTITY_HINT, IDENTITY_LABEL, RELEASE_LABEL, dayTime, timeOnly } from './examFormat';
import { inviteText, whatsappLink } from './share';
import QrCode from './QrCode';

interface NewExamSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ownerId: string | undefined;
    /** Admin acting for another teacher. */
    asUser?: string | null;
    presetTestId?: string | null;
    presetClassId?: string | null;
    onCreated?: (session: ExamSession) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function nextHalfHour(): Date {
    const d = new Date(Date.now() + 20 * 60_000);
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() < 30 ? 30 : 60);
    return d;
}

/** Create one sitting of a paper. Ends on the join code, ready to project or send. */
export default function NewExamSheet({ open, onOpenChange, ownerId, asUser, presetTestId, presetClassId, onCreated }: NewExamSheetProps) {
    const navigate = useNavigate();
    const [tests, setTests] = useState<any[] | null>(null);
    const [batches, setBatches] = useState<Batch[] | null>(null);
    const [created, setCreated] = useState<ExamSession | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initialStart = useMemo(nextHalfHour, [open]);
    const [testId, setTestId] = useState<string>('');
    const [classId, setClassId] = useState<string>('');
    const [when, setWhen] = useState<'now' | 'later'>('later');
    const [date, setDate] = useState(localDate(initialStart));
    const [time, setTime] = useState(localTime(initialStart));
    const [lateEntry, setLateEntry] = useState(15);
    const [startMode, setStartMode] = useState<StartMode>('auto');
    const [identity, setIdentity] = useState<IdentityMode>('name');
    const [walkIn, setWalkIn] = useState(true);
    const [release, setRelease] = useState<ResultsRelease>('on_end');
    const [name, setName] = useState('');
    const [showMore, setShowMore] = useState(false);

    useEffect(() => {
        if (!open) return;
        setCreated(null);
        setError(null);
        setTestId(presetTestId || '');
        setClassId(presetClassId || '');
        setShowMore(!!presetClassId);
        setDate(localDate(initialStart));
        setTime(localTime(initialStart));
        if (!ownerId) return;
        let tourCompleted = false;
        try { tourCompleted = localStorage.getItem(`creator_dashboard_tour_completed_${ownerId}`) === 'true'; } catch { /* ignore */ }
        fetchTestsByUserId(ownerId, { tourCompleted }).then(({ data }) => {
            const list = (Array.isArray(data) ? data : []).filter((t: any) => (t.total_questions || 0) > 0);
            list.sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
            setTests(list);
        });
        batchesApi.list(asUser).then(setBatches).catch(() => setBatches([]));
        // Reset and reload each time the sheet opens, not on every prop change while it is open.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const test = tests?.find(t => t.id === testId) || null;
    const batch = batches?.find(b => b.id === classId) || null;
    const duration = Number(test?.duration) || 60;
    const startsAt = when === 'now' ? new Date() : new Date(`${date}T${time}`);
    const closesAt = new Date(startsAt.getTime() + (duration + lateEntry + 10) * 60_000);
    const pinReady = !!batch && batch.with_pin > 0;

    // Keep the check-in rule possible for the chosen batch.
    useEffect(() => {
        if (identity === 'roll_pin' && !pinReady) setIdentity(batch ? 'roll' : 'name');
        // Only when the batch (or its PIN count) changes; never undo the teacher's own choice.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classId, batches]);

    // What "More options" is set to, so nobody has to open it to know.
    const summary = [
        batch ? batch.name : 'No batch',
        `Check in: ${IDENTITY_LABEL[identity].toLowerCase()}`,
        lateEntry ? `${lateEntry} min late entry` : 'No late entry',
        `Results: ${RELEASE_LABEL[release].toLowerCase()}`,
    ].join(' · ');

    const problems: string[] = [];
    if (!testId) problems.push('Choose a question paper.');
    if (when === 'later' && (isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() - 5 * 60_000)) problems.push('Pick a start time that is still ahead.');

    const create = async () => {
        if (problems.length || saving) return;
        setSaving(true);
        setError(null);
        try {
            // The default name uses the teacher's own date (the server only knows UTC).
            const day = startsAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
            const defaultName = `${batch ? batch.name : test?.title || 'Exam'} · ${day}`;
            const session = await examSessionsApi.create({
                test_id: testId,
                name: name.trim() || defaultName,
                class_id: classId || null,
                opens_at: startsAt.toISOString(),
                closes_at: closesAt.toISOString(),
                late_entry_minutes: lateEntry,
                start_mode: startMode,
                identity_mode: identity,
                allow_walk_in: identity === 'roll_pin' ? false : walkIn,
                results_release: release,
                as_user: asUser || undefined,
            });
            setCreated(session);
            onCreated?.(session);
        } catch (err) {
            setError(problemOf(err).message);
        } finally {
            setSaving(false);
        }
    };

    const copy = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copied`);
        } catch {
            toast.error('Could not copy');
        }
    };

    if (created) {
        return (
            <IosSheet
                open={open}
                onOpenChange={onOpenChange}
                title="Exam ready"
                leading={<span />}
                trailing={<button type="button" onClick={() => onOpenChange(false)} className="h-9 rounded-full px-2 text-[17px] font-semibold text-sky-700 hover:bg-sky-500/10 cursor-pointer">Done</button>}
            >
                <div className="rounded-[18px] bg-white p-6 text-center">
                    <p className="text-[13px] uppercase tracking-[0.02em] text-slate-500">Candidates go to <span className="font-semibold text-slate-700">{joinUrl().replace(/^https?:\/\//, '')}</span> and enter</p>
                    <p className="mt-2 text-[56px] font-bold leading-none tracking-[0.06em] text-slate-900 tabular-nums">{formatCode(created.join_code)}</p>
                    <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-2 ring-1 ring-slate-900/[0.06]">
                        <QrCode value={joinUrl(created.join_code)} size={148} />
                    </div>
                    <p className="mt-4 text-[15px] text-slate-600">
                        {created.test.title} · {dayTime(created.opens_at)}
                    </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => copy(inviteText(created), 'Message')} className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-white text-[15px] font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer">
                        <Copy className="h-4 w-4 text-sky-600" /> Copy message
                    </button>
                    <a href={whatsappLink(inviteText(created))} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#25D366] text-[15px] font-semibold text-white hover:brightness-95">
                        WhatsApp
                    </a>
                    <button type="button" onClick={() => window.open(`/exams/${created.id}/present`, '_blank')} className="col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-white text-[15px] font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer">
                        <MonitorPlay className="h-4 w-4 text-sky-600" /> Show code on the projector
                    </button>
                </div>
                <button type="button" className={`${IOS_PRIMARY} mt-4`} onClick={() => { onOpenChange(false); navigate(`/exams/${created.id}`); }}>
                    Open the exam room <ArrowRight className="h-5 w-5" />
                </button>
            </IosSheet>
        );
    }

    return (
        <IosSheet
            open={open}
            onOpenChange={onOpenChange}
            title="New exam"
            trailing={(
                <button type="button" disabled={!!problems.length || saving} onClick={create} className="h-9 rounded-full px-2 text-[17px] font-semibold text-sky-700 hover:bg-sky-500/10 disabled:opacity-40 cursor-pointer">
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create'}
                </button>
            )}
            footer={(
                <>
                    {error && <p className="mb-2 text-center text-[14px] text-red-600">{error}</p>}
                    <button type="button" className={IOS_PRIMARY} disabled={!!problems.length || saving} onClick={create}>
                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create exam and get the code'}
                    </button>
                    {!!problems.length && <p className="mt-2 text-center text-[13px] text-slate-500">{problems[0]}</p>}
                </>
            )}
        >
            <Group header="Question paper" footer={test ? `${test.total_questions} questions · ${duration} min` : 'Only tests with questions are listed.'}>
                <div className="px-4 py-2.5">
                    {tests === null ? (
                        <div className="flex h-10 items-center gap-2 text-[15px] text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading your tests…</div>
                    ) : tests.length === 0 ? (
                        <p className="py-2 text-[15px] text-slate-600">Make a test with questions first.</p>
                    ) : (
                        <select
                            value={testId}
                            onChange={(e) => setTestId(e.target.value)}
                            aria-label="Question paper"
                            className="h-10 w-full rounded-lg bg-transparent text-[17px] text-slate-900 outline-none"
                        >
                            <option value="">Choose a test…</option>
                            {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                        </select>
                    )}
                </div>
            </Group>

            <Group header="When" footer={`Nobody can write after ${timeOnly(closesAt.toISOString())}.`}>
                <Row label="Starts">
                    <Segmented<'now' | 'later'> value={when} onChange={setWhen} ariaLabel="Start" options={[{ value: 'now', label: 'Now' }, { value: 'later', label: 'Later' }]} />
                </Row>
                {when === 'later' && (
                    <Row label="Date and time">
                        <input type="date" value={date} min={localDate(new Date())} onChange={(e) => setDate(e.target.value)} className="rounded-lg bg-slate-100 px-2 py-1.5 text-[15px] text-slate-900 outline-none" aria-label="Date" />
                        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-lg bg-slate-100 px-2 py-1.5 text-[15px] text-slate-900 outline-none" aria-label="Time" />
                    </Row>
                )}
            </Group>

            {/* Everything below has a safe default. Most teachers never open it. */}
            <Group footer={showMore ? undefined : summary}>
                <button
                    type="button"
                    onClick={() => setShowMore(v => !v)}
                    aria-expanded={showMore}
                    className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[17px] text-slate-900 hover:bg-slate-50 cursor-pointer"
                >
                    <span>More options</span>
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${showMore ? 'rotate-180' : ''}`} />
                </button>
            </Group>

            {showMore && (<>
            <Group header="Batch" footer={batch ? `${batch.students} candidates on the list${batch.with_pin ? `, ${batch.with_pin} with PINs` : ''}.` : 'Optional. A batch lets candidates check in by roll number and shows who is absent.'}>
                <div className="px-4 py-2.5">
                    <select
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        aria-label="Batch"
                        className="h-10 w-full bg-transparent text-[17px] text-slate-900 outline-none"
                    >
                        <option value="">No batch</option>
                        {(batches || []).map(b => <option key={b.id} value={b.id}>{b.name} ({b.students})</option>)}
                    </select>
                </div>
            </Group>

            <Group header="Timing" footer="Candidates can wait in the lobby from 30 minutes before the start.">
                <Row label="Late entry" hint="New candidates can join for this long after the start.">
                    <select value={lateEntry} onChange={(e) => setLateEntry(Number(e.target.value))} aria-label="Late entry" className="bg-transparent text-right text-[17px] text-slate-600 outline-none">
                        {[0, 5, 10, 15, 30, 60].map(m => <option key={m} value={m}>{m === 0 ? 'None' : `${m} min`}</option>)}
                    </select>
                </Row>
                <Row label="Start" hint={startMode === 'manual' ? 'Candidates wait in the lobby until you tap Start.' : 'Starts by itself at the start time.'}>
                    <Segmented<StartMode> value={startMode} onChange={setStartMode} ariaLabel="Start mode" options={[{ value: 'auto', label: 'On time' }, { value: 'manual', label: 'I tap Start' }]} />
                </Row>
            </Group>

            <Group header="Candidates check in with" footer={identity === 'roll_pin' && batch && !pinReady ? 'This batch has no PINs yet. Make them on the batch page.' : undefined}>
                {(['name', 'roll', 'roll_pin'] as IdentityMode[]).map(mode => (
                    <ChoiceRow
                        key={mode}
                        selected={identity === mode}
                        onSelect={() => setIdentity(mode)}
                        title={IDENTITY_LABEL[mode]}
                        hint={mode === 'roll_pin' && !pinReady ? 'Needs a batch whose candidates have PINs.' : IDENTITY_HINT[mode]}
                        disabled={mode === 'roll_pin' && !pinReady}
                        badge={mode === 'roll_pin' ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">Safest</span> : undefined}
                    />
                ))}
                {batch && identity !== 'roll_pin' && (
                    <Row label="Candidates not on the list" hint="Let them join by typing their name.">
                        <Switch checked={walkIn} onCheckedChange={setWalkIn} aria-label="Allow candidates not on the list" />
                    </Row>
                )}
            </Group>

            <Group header="Show results to candidates" footer={release === 'on_end' ? 'Stops answers leaking to candidates who are still writing.' : undefined}>
                {(['on_end', 'immediate', 'manual'] as ResultsRelease[]).map(mode => (
                    <ChoiceRow
                        key={mode}
                        selected={release === mode}
                        onSelect={() => setRelease(mode)}
                        title={RELEASE_LABEL[mode]}
                        badge={mode === 'on_end' ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Recommended</span> : undefined}
                    />
                ))}
            </Group>

            <Group header="Name" footer="Shown to candidates and on results. Leave empty to use the batch and date.">
                <div className="px-4 py-2.5">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={120}
                        placeholder={batch ? `${batch.name} · ${startsAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : 'e.g. Batch A · Sunday mock'}
                        className="h-10 w-full bg-transparent text-[17px] text-slate-900 placeholder:text-slate-400 outline-none"
                        aria-label="Exam name"
                    />
                </div>
            </Group>
            </>)}
        </IosSheet>
    );
}
