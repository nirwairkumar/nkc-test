/**
 * The "New exam" sheet, playable: sheet.tsx (components/exams/NewExamSheet.tsx) over
 * the Exams page. The reader picks a paper and a time, opens More options, chooses a
 * batch, the check-in and when results show, and creates the exam; the sheet ends on
 * the join code, as the product's does. On a wide frame the sheet is the product's
 * centred card (sm:w-[520px]); on a narrow one, its bottom sheet.
 *
 * It stays inside the window: the frame is --co-fit-h tall and the sheet's body
 * scrolls, with its footer button always in view.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { EXAM } from '@/guides/conductData';
import { DemoFrame, Toasts, useToasts, useWidth } from './replica';
import { ExamsBehind, ReadyView, SheetFooter, SheetForm, SheetHeader, localDate, localTime, nextHalfHour, sheetDerived, type Created, type SheetValues } from './sheet';

const blank = (start: Date): SheetValues => ({
    testId: '',
    classId: '',
    when: 'later',
    date: localDate(start),
    time: localTime(start),
    lateEntry: 15,
    startMode: 'auto',
    identity: 'name',
    walkIn: true,
    release: 'on_end',
    name: '',
    showMore: false,
});

export default function NewExamDemo() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const sheetBodyRef = useRef<HTMLDivElement>(null);
    const width = useWidth(bodyRef);
    const d = width >= 640;
    const toasts = useToasts();
    const initialStart = useMemo(nextHalfHour, []);

    const [open, setOpen] = useState(true);
    const [v, setV] = useState<SheetValues>(() => blank(initialStart));
    const [saving, setSaving] = useState(false);
    const [created, setCreated] = useState<Created | null>(null);
    const [listed, setListed] = useState<Created | null>(null);
    const { test, batch, startsAt, pinReady, problems } = sheetDerived(v);

    const set =
        <K extends keyof SheetValues>(key: K) =>
        (value: SheetValues[K]) =>
            setV((s) => ({ ...s, [key]: value }));
    const on = {
        testId: set('testId'),
        classId: set('classId'),
        when: set('when'),
        date: set('date'),
        time: set('time'),
        lateEntry: set('lateEntry'),
        startMode: set('startMode'),
        identity: set('identity'),
        walkIn: set('walkIn'),
        release: set('release'),
        name: set('name'),
        showMore: set('showMore'),
    };

    // Keep the check-in rule possible for the chosen batch (as the product does).
    useEffect(() => {
        setV((s) => (s.identity === 'roll_pin' && !pinReady ? { ...s, identity: batch ? 'roll' : 'name' } : s));
        // Only when the batch changes; never undo the reader's own choice.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [v.classId]);

    // Opening More options brings it into view.
    useEffect(() => {
        if (!v.showMore) return;
        const sc = sheetBodyRef.current;
        const el = sc?.querySelector<HTMLElement>('[data-more]');
        if (sc && el) sc.scrollTo({ top: el.offsetTop - 8, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }, [v.showMore]);

    const create = () => {
        if (problems.length || saving) return;
        setSaving(true);
        window.setTimeout(() => {
            const day = startsAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
            const made = { title: test?.title ?? EXAM.paper, name: v.name.trim() || `${batch ? batch.name : test?.title || 'Exam'} · ${day}`, opensAt: startsAt.toISOString(), now: v.when === 'now' };
            setCreated(made);
            setListed(made);
            setSaving(false);
        }, 700);
    };

    const reset = () => {
        setOpen(true);
        setV(blank(initialStart));
        setCreated(null);
        setListed(null);
        toasts.clear();
        sheetBodyRef.current?.scrollTo({ top: 0 });
    };

    const close = () => {
        setOpen(false);
        setCreated(null);
    };

    const openRoom = () => {
        close();
        document.getElementById('exam-room')?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    };

    let tip: string;
    if (!open) tip = listed ? 'Your exam is on the list with its code. Tap New exam to make another.' : 'Tap New exam.';
    else if (created) tip = 'That’s the code candidates type at testoza.com/join. The exam room is further down this page.';
    else if (!v.testId) tip = 'Choose the question paper first.';
    else if (!v.showMore) tip = 'That’s enough for a class quiz. Open More options for the batch, check-in and results.';
    else if (!v.classId) tip = 'Pick batch 12-A: its candidates have PINs.';
    else if (v.identity !== 'roll_pin' && pinReady) tip = 'Now choose Roll number + PIN, the safest check-in.';
    else tip = 'Create the exam to get its code.';

    const sheetClass = d
        ? 'co-sheet co-sheet--card flex w-[520px] max-w-[calc(100%-32px)] flex-col overflow-hidden bg-[#f2f2f7] shadow-2xl rounded-[22px]'
        : 'co-sheet co-sheet--bottom flex w-full flex-col overflow-hidden bg-[#f2f2f7] shadow-2xl rounded-t-[22px]';

    return (
        <DemoFrame title="Set up an exam" tip={<span key={tip}>{tip}</span>} onRestart={reset} wide="md" caption="A copy of TestoZa’s New exam sheet. The papers and batches are examples; nothing is saved or sent.">
            <div className="co-window co-window--fit" ref={bodyRef}>
                <div className="co-window-bar">
                    <div className="co-window-lights" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                    </div>
                    <div className="co-window-url">
                        <Lock aria-hidden="true" /> app.testoza.com/exams
                    </div>
                </div>
                <div className="co-window-body co-screen bg-slate-50">
                    <div className="co-room-scroller" aria-hidden={open || undefined}>
                        <ExamsBehind d={d} created={listed} onNew={() => setOpen(true)} nudge={!open} tab={open ? -1 : undefined} />
                    </div>
                    {open && (
                        <div className={`co-sheet-layer${d ? '' : ' is-bottom'}`}>
                            <div className="co-modal-scrim absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={close} />
                            <div role="dialog" aria-label={created ? 'Exam ready' : 'New exam'} className={sheetClass}>
                                {!d && <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />}
                                {created ? (
                                    <>
                                        <SheetHeader
                                            d={d}
                                            title="Exam ready"
                                            leading={<span />}
                                            trailing={
                                                <button type="button" onClick={close} className="h-9 rounded-full px-2 text-[17px] font-semibold text-sky-700 hover:bg-sky-500/10 cursor-pointer">
                                                    Done
                                                </button>
                                            }
                                        />
                                        <ReadyView
                                            created={created}
                                            onCopy={() => toasts.push('Message copied')}
                                            onWhatsApp={() => toasts.push('In the app this opens WhatsApp with the invitation filled in.', 'info')}
                                            onProjector={() => toasts.push('In the app this opens the projector view in a new tab.', 'info')}
                                            onOpenRoom={openRoom}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <SheetHeader
                                            d={d}
                                            title="New exam"
                                            leading={
                                                <button type="button" onClick={close} className="h-9 rounded-full px-2 text-[17px] text-sky-700 hover:bg-sky-500/10 cursor-pointer">
                                                    Cancel
                                                </button>
                                            }
                                            trailing={
                                                <button
                                                    type="button"
                                                    disabled={!!problems.length || saving}
                                                    onClick={create}
                                                    className="h-9 rounded-full px-2 text-[17px] font-semibold text-sky-700 hover:bg-sky-500/10 disabled:opacity-40 cursor-pointer"
                                                >
                                                    Create
                                                </button>
                                            }
                                        />
                                        <SheetForm v={v} on={on} bodyRef={sheetBodyRef} />
                                        <SheetFooter problems={problems} saving={saving} onCreate={create} />
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    <Toasts items={toasts.items} />
                </div>
            </div>
        </DemoFrame>
    );
}
