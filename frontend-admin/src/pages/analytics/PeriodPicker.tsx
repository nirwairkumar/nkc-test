/**
 * The period filter for Analytics and Live Activity: the preset segments, plus a
 * Custom segment that opens a calendar for any single IST day or day range.
 * Tap a day for that day alone; tap a second day to make it a range.
 */
import * as Popover from '@radix-ui/react-popover';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
    addDays, customRange, daysBetween, istToday, MAX_DAYS_BACK, rangeLabel, rangePeriod, weekday, type Period, type Preset,
} from './period';
import { Segmented } from './ui';

const CUSTOM = 'custom' as const;
type Range = { start: string; end: string };

export default function PeriodPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
    const [open, setOpen] = useState(false);
    const customRef = useRef<HTMLSpanElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const leftByOutsideClick = useRef(false);
    const range = customRange(value);
    const customButton = () => customRef.current?.closest('button') ?? null;

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            {/* The calendar lines up with the right edge of the whole control. */}
            <Popover.Anchor asChild>
                <div className="min-w-0 max-w-full">
                    <Segmented<Preset | typeof CUSTOM>
                        ariaLabel="Period"
                        value={range ? CUSTOM : (value as Preset)}
                        onChange={(v) => (v === CUSTOM ? setOpen((o) => !o) : onChange(v))}
                        options={[
                            { value: 'today', label: 'Today' },
                            { value: 'yesterday', label: 'Yesterday' },
                            { value: '7d', label: '7D', title: 'Last 7 days' },
                            { value: '30d', label: '30D', title: 'Last 30 days' },
                            { value: '90d', label: '90D', title: 'Last 90 days' },
                            { value: '12m', label: '12M', title: 'Last 12 months' },
                            {
                                value: CUSTOM,
                                title: range ? 'Change the date' : 'Pick any day or date range',
                                label: (
                                    <span ref={customRef} className="inline-flex items-center gap-1.5">
                                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                                        {range
                                            ? <span className="tabular-nums">{rangeLabel(range.start, range.end)}</span>
                                            : <span className="sr-only sm:not-sr-only">Custom</span>}
                                    </span>
                                ),
                            },
                        ]}
                    />
                </div>
            </Popover.Anchor>
            <Popover.Portal>
                <Popover.Content
                    ref={contentRef}
                    side="bottom"
                    align="end"
                    sideOffset={8}
                    collisionPadding={12}
                    aria-label="Pick a day or a date range"
                    onInteractOutside={(e) => {
                        // The Custom segment toggles the calendar itself; don't count it as an outside click.
                        if (customButton()?.contains(e.target as Node)) e.preventDefault();
                        else leftByOutsideClick.current = true;
                    }}
                    onOpenAutoFocus={(e) => {
                        e.preventDefault();
                        contentRef.current?.querySelector<HTMLElement>('[data-day][tabindex="0"]')?.focus({ preventScroll: true });
                    }}
                    onCloseAutoFocus={(e) => {
                        // No Radix trigger here, so hand focus back to the Custom segment (unless they clicked elsewhere).
                        e.preventDefault();
                        if (!leftByOutsideClick.current) customButton()?.focus({ preventScroll: true });
                        leftByOutsideClick.current = false;
                    }}
                    className={cn(
                        'z-[60] w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-2xl bg-white outline-none sm:w-auto',
                        'ring-1 ring-slate-900/[0.08] shadow-[0_2px_6px_rgba(15,23,42,0.06),0_24px_48px_-16px_rgba(15,23,42,0.3)]',
                        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1',
                    )}
                >
                    <RangeCalendar
                        initial={range}
                        onApply={(start, end) => { onChange(rangePeriod(start, end)); setOpen(false); }}
                    />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}

// ── Calendar ──────────────────────────────────────────────────────────────────
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

const monthOf = (day: string) => day.slice(0, 7);
function shiftMonth(ym: string, n: number): string {
    const [y, m] = ym.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}
/** Six Monday-first weeks, so the popover keeps its height from month to month. */
function monthCells(ym: string): (string | null)[] {
    const first = `${ym}-01`;
    const lead = (weekday(first) + 6) % 7;
    const length = daysBetween(first, `${shiftMonth(ym, 1)}-01`);
    return Array.from({ length: 42 }, (_, i) => (i >= lead && i < lead + length ? addDays(first, i - lead) : null));
}
const longDay = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const monthTitle = (ym: string) =>
    new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', month: 'long', year: 'numeric' });
const ordered = (a: string, b: string): Range => (a <= b ? { start: a, end: b } : { start: b, end: a });

function shortcuts(today: string): (Range & { label: string })[] {
    const monday = addDays(today, -((weekday(today) + 6) % 7));
    const monthStart = `${monthOf(today)}-01`;
    return [
        { label: 'This week', start: monday, end: today },
        { label: 'Last week', start: addDays(monday, -7), end: addDays(monday, -1) },
        { label: 'This month', start: monthStart, end: today },
        { label: 'Last month', start: `${shiftMonth(monthOf(today), -1)}-01`, end: addDays(monthStart, -1) },
    ];
}

function RangeCalendar({ initial, onApply }: { initial: Range | null; onApply: (start: string, end: string) => void }) {
    const today = istToday();
    const min = addDays(today, -MAX_DAYS_BACK);
    const [draft, setDraft] = useState<Range | null>(initial);
    // The first day of a range, waiting for its second tap. Starts empty, so the first tap
    // after opening always picks that one day — even when a day was already chosen.
    const [anchor, setAnchor] = useState<string | null>(null);
    const [hover, setHover] = useState<string | null>(null);
    const [view, setView] = useState(monthOf(initial?.end ?? today));
    const [focusDay, setFocusDay] = useState(initial?.end ?? today);
    const gridRef = useRef<HTMLDivElement>(null);
    const keyMoved = useRef(false);

    useEffect(() => {
        if (!keyMoved.current) return;
        keyMoved.current = false;
        gridRef.current?.querySelector<HTMLElement>(`[data-day="${focusDay}"]`)?.focus();
    }, [focusDay]);

    const cells = monthCells(view);
    const enabled = (day: string) => day >= min && day <= today;
    // One roving tab stop in the grid; arrow keys move it.
    const tabDay = monthOf(focusDay) === view ? focusDay : cells.find((d): d is string => !!d && enabled(d));
    const shown = anchor && hover && hover !== anchor ? ordered(anchor, hover) : draft;

    const pick = (day: string) => {
        setFocusDay(day);
        if (anchor && day !== anchor) {
            setDraft(ordered(anchor, day));
            setAnchor(null);
        } else {
            setDraft({ start: day, end: day });
            setAnchor(day);
        }
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        const step = STEPS[e.key];
        const from = (e.target as HTMLElement).dataset.day;
        if (!step || !from) return;
        e.preventDefault();
        let next = addDays(from, step);
        if (next < min) next = min;
        if (next > today) next = today;
        keyMoved.current = true;
        setFocusDay(next);
        setView(monthOf(next));
        if (anchor) setHover(next);
    };

    const days = draft ? daysBetween(draft.start, draft.end) + 1 : 0;

    return (
        <div>
            <div className="flex flex-col sm:flex-row">
                {/* Quick picks: a scrolling row on phones, a side list from sm up */}
                <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-3 py-2.5 [scrollbar-width:none] sm:w-[132px] sm:shrink-0 sm:flex-col sm:gap-0.5 sm:overflow-visible sm:border-b-0 sm:border-r sm:p-2">
                    {shortcuts(today).map((s) => {
                        const active = draft?.start === s.start && draft?.end === s.end;
                        return (
                            <button
                                key={s.label}
                                type="button"
                                aria-pressed={active}
                                onClick={() => { setDraft(s); setAnchor(null); setHover(null); setView(monthOf(s.end)); setFocusDay(s.end); }}
                                className={cn(
                                    'h-7 shrink-0 whitespace-nowrap rounded-full px-3 text-[12px] font-semibold transition-colors',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50',
                                    'sm:h-8 sm:w-full sm:rounded-lg sm:px-2.5 sm:text-left sm:text-[13px] sm:font-medium',
                                    active ? 'bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-600/20 sm:font-semibold'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 sm:bg-transparent sm:hover:bg-slate-100',
                                )}
                            >
                                {s.label}
                            </button>
                        );
                    })}
                </div>

                <div className="p-3 sm:w-[296px]">
                    <div className="flex items-center justify-between pb-2 pl-1.5">
                        <p className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900" aria-live="polite">{monthTitle(view)}</p>
                        <div className="flex items-center gap-0.5">
                            <MonthButton label="Previous month" disabled={view <= monthOf(min)} onClick={() => setView(shiftMonth(view, -1))}>
                                <ChevronLeft className="h-4 w-4" />
                            </MonthButton>
                            <MonthButton label="Next month" disabled={view >= monthOf(today)} onClick={() => setView(shiftMonth(view, 1))}>
                                <ChevronRight className="h-4 w-4" />
                            </MonthButton>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 pb-1" aria-hidden="true">
                        {WEEK.map((d, i) => (
                            <span key={i} className="text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">{d}</span>
                        ))}
                    </div>

                    <div
                        ref={gridRef}
                        role="group"
                        aria-label={monthTitle(view)}
                        className="grid grid-cols-7 gap-y-0.5"
                        onKeyDown={onKeyDown}
                        onMouseLeave={() => setHover(null)}
                    >
                        {cells.map((day, i) => {
                            if (!day) return <span key={i} className="h-9" aria-hidden="true" />;
                            const col = i % 7;
                            const inRange = !!shown && day >= shown.start && day <= shown.end;
                            const edge = !!shown && (day === shown.start || day === shown.end);
                            const band = inRange && shown!.start !== shown!.end;
                            const isToday = day === today;
                            const off = !enabled(day);
                            return (
                                <div
                                    key={day}
                                    className={cn(
                                        'flex h-9 items-center justify-center',
                                        band && 'bg-sky-500/[0.1]',
                                        band && (day === shown!.start || col === 0 || day.endsWith('-01')) && 'rounded-l-full',
                                        band && (day === shown!.end || col === 6 || addDays(day, 1).endsWith('-01')) && 'rounded-r-full',
                                    )}
                                >
                                    <button
                                        type="button"
                                        data-day={day}
                                        disabled={off}
                                        tabIndex={day === tabDay ? 0 : -1}
                                        onClick={() => pick(day)}
                                        onMouseEnter={() => anchor && setHover(day)}
                                        aria-label={longDay(day)}
                                        aria-pressed={inRange}
                                        aria-current={isToday ? 'date' : undefined}
                                        className={cn(
                                            'relative flex h-9 w-9 items-center justify-center rounded-full text-[13px] tabular-nums transition-colors',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50',
                                            edge ? 'bg-sky-600 font-semibold text-white shadow-[0_1px_2px_rgba(2,132,199,0.35)]'
                                                : off ? 'cursor-default text-slate-300'
                                                    : inRange ? 'font-medium text-sky-900 hover:bg-sky-500/15'
                                                        : 'text-slate-700 hover:bg-slate-100',
                                            isToday && !edge && 'font-bold text-sky-700',
                                        )}
                                    >
                                        {Number(day.slice(8))}
                                        {isToday && !edge && <span className="absolute bottom-[5px] h-1 w-1 rounded-full bg-sky-600" aria-hidden="true" />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5">
                <div className="min-w-0">
                    <p className={cn('truncate text-[13px] font-semibold tabular-nums', draft ? 'text-slate-900' : 'text-slate-500')}>
                        {draft ? rangeLabel(draft.start, draft.end, true) : 'Pick a day'}
                    </p>
                    <p className="text-[11.5px] text-slate-500">
                        {!draft ? 'Or tap two days for a range'
                            : anchor ? 'Tap a second day for a range'
                                : days === 1 ? 'Tap any day to change it'
                                    : `${days} days · vs the ${days} days before`}
                    </p>
                </div>
                <button
                    type="button"
                    disabled={!draft}
                    onClick={() => draft && onApply(draft.start, draft.end)}
                    className="h-8 shrink-0 rounded-full bg-sky-600 px-4 text-[13px] font-semibold text-white transition-[background-color,transform] hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-40 motion-safe:active:scale-[0.97]"
                >
                    Apply
                </button>
            </div>
        </div>
    );
}

function MonthButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className="flex h-8 w-8 items-center justify-center rounded-full text-sky-700 transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 disabled:cursor-default disabled:text-slate-300 disabled:hover:bg-transparent"
        >
            {children}
        </button>
    );
}
