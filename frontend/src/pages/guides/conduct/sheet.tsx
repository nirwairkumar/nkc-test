/**
 * The New exam sheet (components/exams/NewExamSheet.tsx) and the Exams page behind it
 * (pages/exams/ExamsPage.tsx), as presentational pieces: NewExamDemo plays them, the
 * hero scripts them on a phone (`pressed` marks the control a finger is on, `tab` -1
 * keeps the scripted copy out of the tab order).
 */
import type { ReactNode, Ref } from 'react';
import { ArrowRight, CalendarClock, ChevronDown, ChevronRight, Copy, KeyRound, Loader2, MonitorPlay, Plus, Radio, Users } from 'lucide-react';
import QrCode from '@/components/exams/QrCode';
import { IDENTITY_HINT, IDENTITY_LABEL, RELEASE_LABEL, dayTime, timeOnly } from '@/components/exams/examFormat';
import { BATCHES, EXAM, PAPERS, spacedCode } from '@/guides/conductData';
import { CARD, ChoiceRow, Group, IOS_PRIMARY, PRIMARY_BTN, Row, Segmented, UiSwitch } from './replica';

export type IdentityMode = 'name' | 'roll' | 'roll_pin';
export type ResultsRelease = 'on_end' | 'immediate' | 'manual';
export type StartMode = 'auto' | 'manual';

const pad = (n: number) => String(n).padStart(2, '0');
export const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
/** The product lower-cases the whole label ("roll number + pin"); this keeps "PIN" and "I". */
export const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function nextHalfHour(): Date {
    const d = new Date(Date.now() + 20 * 60_000);
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() < 30 ? 30 : 60);
    return d;
}

export interface SheetValues {
    testId: string;
    classId: string;
    when: 'now' | 'later';
    date: string;
    time: string;
    lateEntry: number;
    startMode: StartMode;
    identity: IdentityMode;
    walkIn: boolean;
    release: ResultsRelease;
    name: string;
    showMore: boolean;
}

export interface Created {
    title: string;
    name: string;
    opensAt: string;
    now: boolean;
}

export type SheetControl = 'paper' | 'now' | 'more' | 'batch' | 'late' | 'manual' | 'roll_pin' | 'create' | 'open-room' | null;

export function sheetDerived(v: SheetValues) {
    const test = PAPERS.find((t) => t.id === v.testId) || null;
    const batch = BATCHES.find((b) => b.id === v.classId) || null;
    const duration = test?.minutes ?? 60;
    const startsAt = v.when === 'now' ? new Date() : new Date(`${v.date}T${v.time}`);
    const closesAt = new Date(startsAt.getTime() + (duration + v.lateEntry + 10) * 60_000);
    const pinReady = !!batch && batch.withPin > 0;
    const summary = [
        batch ? batch.name : 'No batch',
        `Check in: ${lowerFirst(IDENTITY_LABEL[v.identity])}`,
        v.lateEntry ? `${v.lateEntry} min late entry` : 'No late entry',
        `Results: ${lowerFirst(RELEASE_LABEL[v.release])}`,
    ].join(' · ');
    const problems: string[] = [];
    if (!v.testId) problems.push('Choose a question paper.');
    if (v.when === 'later' && (isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() - 5 * 60_000)) problems.push('Pick a start time that is still ahead.');
    return { test, batch, duration, startsAt, closesAt, pinReady, summary, problems };
}

/** The sheet's header row: Cancel · title · Create (or Done). */
export function SheetHeader({ title, leading, trailing, d }: { title: string; leading: ReactNode; trailing: ReactNode; d: boolean }) {
    return (
        <div className={`grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-2 ${d ? 'pt-4' : 'pt-2'}`}>
            <div className="justify-self-start">{leading}</div>
            <p className="truncate text-center text-[17px] font-semibold text-slate-900">{title}</p>
            <div className="justify-self-end">{trailing}</div>
        </div>
    );
}

/** The groups inside the New exam sheet. `on` is left out when scripted. */
export function SheetForm({
    v,
    on,
    pressed = null,
    tab,
    bodyRef,
}: {
    v: SheetValues;
    on?: { [K in keyof SheetValues]?: (value: SheetValues[K]) => void };
    pressed?: SheetControl;
    tab?: number;
    bodyRef?: Ref<HTMLDivElement>;
}) {
    const { test, batch, duration, startsAt, closesAt, pinReady, summary } = sheetDerived(v);
    const ring = (c: SheetControl) => (pressed === c ? ' is-pressed bg-slate-50' : '');
    return (
        <div ref={bodyRef} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-2">
            <Group header="Question paper" footer={test ? `${test.questions} questions · ${duration} min` : 'Only tests with questions are listed.'}>
                <div className={`px-4 py-2.5${ring('paper')}`}>
                    <select
                        tabIndex={tab}
                        value={v.testId}
                        onChange={(e) => on?.testId?.(e.target.value)}
                        aria-label="Question paper"
                        className="h-10 w-full rounded-lg bg-transparent text-[17px] text-slate-900 outline-none"
                    >
                        <option value="">Choose a test…</option>
                        {PAPERS.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.title}
                            </option>
                        ))}
                    </select>
                </div>
            </Group>

            <Group header="When" footer={`Nobody can write after ${timeOnly(closesAt.toISOString())}.`}>
                <Row label="Starts">
                    <Segmented<'now' | 'later'>
                        value={v.when}
                        tab={tab}
                        pressed={pressed === 'now' ? 'now' : null}
                        onChange={(x) => on?.when?.(x)}
                        label="Start"
                        options={[
                            { value: 'now', label: 'Now' },
                            { value: 'later', label: 'Later' },
                        ]}
                    />
                </Row>
                {v.when === 'later' && (
                    <Row label="Date and time">
                        <input
                            tabIndex={tab}
                            type="date"
                            value={v.date}
                            min={localDate(new Date())}
                            onChange={(e) => on?.date?.(e.target.value)}
                            className="w-[132px] rounded-lg bg-slate-100 px-2 py-1.5 text-[15px] text-slate-900 outline-none"
                            aria-label="Date"
                        />
                        <input
                            tabIndex={tab}
                            type="time"
                            value={v.time}
                            onChange={(e) => on?.time?.(e.target.value)}
                            className="rounded-lg bg-slate-100 px-2 py-1.5 text-[15px] text-slate-900 outline-none"
                            aria-label="Time"
                        />
                    </Row>
                )}
            </Group>

            {/* Everything below has a safe default. Most teachers never open it. */}
            <Group footer={v.showMore ? undefined : summary}>
                <button
                    type="button"
                    tabIndex={tab}
                    onClick={() => on?.showMore?.(!v.showMore)}
                    aria-expanded={v.showMore}
                    className={`flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[17px] text-slate-900 hover:bg-slate-50 cursor-pointer${ring('more')}`}
                >
                    <span>More options</span>
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${v.showMore ? 'rotate-180' : ''}`} />
                </button>
            </Group>

            {v.showMore && (
                <div data-more className="co-stage-in">
                    <Group
                        header="Batch"
                        footer={
                            batch ? `${batch.students} candidates on the list${batch.withPin ? `, ${batch.withPin} with PINs` : ''}.` : 'Optional. A batch lets candidates check in by roll number and shows who is absent.'
                        }
                    >
                        <div className={`px-4 py-2.5${ring('batch')}`}>
                            <select tabIndex={tab} value={v.classId} onChange={(e) => on?.classId?.(e.target.value)} aria-label="Batch" className="h-10 w-full bg-transparent text-[17px] text-slate-900 outline-none">
                                <option value="">No batch</option>
                                {BATCHES.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name} ({b.students})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </Group>

                    <Group header="Timing" footer="Candidates can wait in the lobby from 30 minutes before the start.">
                        <Row label="Late entry" hint="New candidates can join for this long after the start.">
                            <select
                                tabIndex={tab}
                                value={v.lateEntry}
                                onChange={(e) => on?.lateEntry?.(Number(e.target.value))}
                                aria-label="Late entry"
                                className={`bg-transparent text-right text-[17px] text-slate-600 outline-none${pressed === 'late' ? ' is-pressed' : ''}`}
                            >
                                {[0, 5, 10, 15, 30, 60].map((m) => (
                                    <option key={m} value={m}>
                                        {m === 0 ? 'None' : `${m} min`}
                                    </option>
                                ))}
                            </select>
                        </Row>
                        <Row label="Start" hint={v.startMode === 'manual' ? 'Candidates wait in the lobby until you tap Start.' : 'Starts by itself at the start time.'}>
                            <Segmented<StartMode>
                                value={v.startMode}
                                tab={tab}
                                pressed={pressed === 'manual' ? 'manual' : null}
                                onChange={(x) => on?.startMode?.(x)}
                                label="Start mode"
                                options={[
                                    { value: 'auto', label: 'On time' },
                                    { value: 'manual', label: 'I tap Start' },
                                ]}
                            />
                        </Row>
                    </Group>

                    <Group header="Candidates check in with" footer={v.identity === 'roll_pin' && batch && !pinReady ? 'This batch has no PINs yet. Make them on the batch page.' : undefined}>
                        {(['name', 'roll', 'roll_pin'] as IdentityMode[]).map((mode) => (
                            <ChoiceRow
                                key={mode}
                                tab={tab}
                                pressed={pressed === mode}
                                selected={v.identity === mode}
                                onSelect={() => on?.identity?.(mode)}
                                title={IDENTITY_LABEL[mode]}
                                hint={mode === 'roll_pin' && !pinReady ? 'Needs a batch whose candidates have PINs.' : IDENTITY_HINT[mode]}
                                disabled={mode === 'roll_pin' && !pinReady}
                                badge={mode === 'roll_pin' ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">Safest</span> : undefined}
                            />
                        ))}
                        {batch && v.identity !== 'roll_pin' && (
                            <Row label="Candidates not on the list" hint="Let them join by typing their name.">
                                <UiSwitch tab={tab} checked={v.walkIn} onChange={(x) => on?.walkIn?.(x)} label="Allow candidates not on the list" />
                            </Row>
                        )}
                    </Group>

                    <Group header="Show results to candidates" footer={v.release === 'on_end' ? 'Stops answers leaking to candidates who are still writing.' : undefined}>
                        {(['on_end', 'immediate', 'manual'] as ResultsRelease[]).map((mode) => (
                            <ChoiceRow
                                key={mode}
                                tab={tab}
                                selected={v.release === mode}
                                onSelect={() => on?.release?.(mode)}
                                title={RELEASE_LABEL[mode]}
                                badge={mode === 'on_end' ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Recommended</span> : undefined}
                            />
                        ))}
                    </Group>

                    <Group header="Name" footer="Shown to candidates and on results. Leave empty to use the batch and date.">
                        <div className="px-4 py-2.5">
                            <input
                                tabIndex={tab}
                                value={v.name}
                                onChange={(e) => on?.name?.(e.target.value)}
                                maxLength={120}
                                placeholder={batch ? `${batch.name} · ${startsAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : 'e.g. Batch A · Sunday mock'}
                                className="h-10 w-full bg-transparent text-[17px] text-slate-900 placeholder:text-slate-400 outline-none"
                                aria-label="Exam name"
                            />
                        </div>
                    </Group>
                </div>
            )}
        </div>
    );
}

/** The sheet's sticky footer. */
export function SheetFooter({ problems, saving, onCreate, pressed, tab }: { problems: string[]; saving: boolean; onCreate?: () => void; pressed?: boolean; tab?: number }) {
    return (
        <div className="shrink-0 border-t border-slate-200/70 bg-[#f2f2f7]/95 px-4 pb-4 pt-3 backdrop-blur">
            <button type="button" tabIndex={tab} className={`${IOS_PRIMARY}${pressed ? ' is-pressed' : ''}`} disabled={!!problems.length || saving} onClick={onCreate}>
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create exam and get the code'}
            </button>
            {!!problems.length && <p className="mt-2 text-center text-[13px] text-slate-500">{problems[0]}</p>}
        </div>
    );
}

/** "Exam ready": the code, the QR code and the ways to share it. */
export function ReadyView({
    created,
    onCopy,
    onWhatsApp,
    onProjector,
    onOpenRoom,
    pressed,
    tab,
}: {
    created: Created;
    onCopy?: () => void;
    onWhatsApp?: () => void;
    onProjector?: () => void;
    onOpenRoom?: () => void;
    pressed?: boolean;
    tab?: number;
}) {
    return (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-2">
            <div className="co-stage-in">
                <div className="rounded-[18px] bg-white p-6 text-center">
                    <p className="text-[13px] uppercase tracking-[0.02em] text-slate-500">
                        Candidates go to <span className="font-semibold text-slate-700">testoza.com/join</span> and enter
                    </p>
                    <p className="mt-2 text-[56px] font-bold leading-none tracking-[0.06em] text-slate-900 tabular-nums">{spacedCode()}</p>
                    <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-2 ring-1 ring-slate-900/[0.06]">
                        <QrCode value={`https://testoza.com/join/${EXAM.code}`} size={148} />
                    </div>
                    <p className="mt-4 text-[15px] text-slate-600">
                        {created.title} · {dayTime(created.opensAt)}
                    </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        tabIndex={tab}
                        onClick={onCopy}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-white text-[15px] font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                    >
                        <Copy className="h-4 w-4 text-sky-600" /> Copy message
                    </button>
                    <button
                        type="button"
                        tabIndex={tab}
                        onClick={onWhatsApp}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#25D366] text-[15px] font-semibold text-white hover:brightness-95 cursor-pointer"
                    >
                        WhatsApp
                    </button>
                    <button
                        type="button"
                        tabIndex={tab}
                        onClick={onProjector}
                        className="col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-white text-[15px] font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                    >
                        <MonitorPlay className="h-4 w-4 text-sky-600" /> Show code on the projector
                    </button>
                </div>
                <button type="button" tabIndex={tab} className={`${IOS_PRIMARY} mt-4${pressed ? ' is-pressed' : ''}`} onClick={onOpenRoom}>
                    Open the exam room <ArrowRight className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}

/** pages/exams/ExamsPage.tsx with this guide's sittings. */
export function ExamsBehind({ d, created, onNew, nudge, pressed, tab }: { d: boolean; created: Created | null; onNew?: () => void; nudge?: boolean; pressed?: boolean; tab?: number }) {
    return (
        <div className={d ? 'mx-auto w-full max-w-5xl space-y-7 px-6 pb-16 pt-8' : 'mx-auto w-full max-w-5xl space-y-7 px-4 pb-16 pt-5'}>
            <header className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Exam room</p>
                    <p className={`mt-1.5 font-bold leading-[1.1] tracking-[-0.025em] text-slate-900 ${d ? 'text-[34px]' : 'text-[28px]'}`}>Exams</p>
                    <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-600">Give a paper to a batch with a 6-digit code. Watch who is writing, then send the rank list.</p>
                </div>
                <button type="button" tabIndex={tab} onClick={onNew} className={`${PRIMARY_BTN} h-11 ${d ? 'px-5' : 'px-4'}${nudge ? ' co-nudge' : ''}${pressed ? ' is-pressed' : ''}`}>
                    <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} /> <span>New exam</span>
                </button>
            </header>
            {created && (
                <section className="co-stage-in">
                    <h2 className="mb-3 flex items-center gap-2 px-1 text-lg font-semibold tracking-[-0.01em] text-slate-900">
                        {created.now ? <Radio className="h-[18px] w-[18px] text-emerald-600" /> : <CalendarClock className="h-[18px] w-[18px] text-slate-400" />} {created.now ? 'Live now' : 'Coming up'}
                        <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">1</span>
                    </h2>
                    <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden ${created.now ? 'ring-emerald-600/20' : ''}`}>
                        <li className={`flex w-full items-center gap-4 py-4 text-left ${d ? 'px-5' : 'px-4'}`}>
                            <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="truncate text-[16px] font-semibold text-slate-900">{created.name}</span>
                                    <span
                                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none ring-1 ring-inset ${
                                            created.now ? 'bg-sky-50 text-sky-700 ring-sky-600/20' : 'bg-violet-50 text-violet-700 ring-violet-600/15'
                                        }`}
                                    >
                                        {created.now ? 'Lobby open' : 'Scheduled'}
                                    </span>
                                </div>
                                <p className="mt-0.5 truncate text-[13px] text-slate-600">
                                    {created.title} · {dayTime(created.opensAt)}
                                </p>
                                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-500">
                                    <span className="inline-flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5" />0 joined
                                    </span>
                                </p>
                            </div>
                            {d && (
                                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 font-semibold tabular-nums tracking-[0.08em] text-slate-900">
                                    <KeyRound className="h-4 w-4 text-slate-400" /> {spacedCode()}
                                </span>
                            )}
                            <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                        </li>
                    </ul>
                </section>
            )}
            <section>
                <h2 className="mb-3 flex items-center gap-2 px-1 text-lg font-semibold tracking-[-0.01em] text-slate-900">
                    Earlier <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">2</span>
                </h2>
                <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                    {[
                        ['Unit Test 2', 'Physics: Electrostatics · Sat, 26 Sept, 10:00 am', '23 of 24 joined', '23 submitted'],
                        ['Weekly Test 7', 'Chemistry: Solutions · Sat, 19 Sept, 10:00 am', '24 of 24 joined', '24 submitted'],
                    ].map(([n, sub, joined, done]) => (
                        <li key={n} className={`flex w-full items-center gap-4 py-4 ${d ? 'px-5' : 'px-4'}`}>
                            <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="truncate text-[16px] font-semibold text-slate-900">{n}</span>
                                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold leading-none text-slate-600 ring-1 ring-inset ring-slate-500/15">
                                        Ended
                                    </span>
                                </div>
                                <p className="mt-0.5 truncate text-[13px] text-slate-600">{sub}</p>
                                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-500">
                                    <span className="inline-flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5" />
                                        {joined}
                                    </span>
                                    <span>{done}</span>
                                </p>
                            </div>
                            <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
