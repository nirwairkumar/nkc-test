/**
 * iOS-flavoured building blocks for the analytics panel, in the same visual
 * language as the landing page and My Tests (sky accent, white cards with a
 * hairline ring, segmented controls, large titles).
 */
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Info, Minus, X } from 'lucide-react';
import React, { useId, useState } from 'react';
import { cn } from '@/lib/utils';

export const CARD =
    'rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)]';

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({
    title, subtitle, action, children, className, bodyClassName, info,
}: {
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    bodyClassName?: string;
    info?: string;
}) {
    return (
        <section className={cn(CARD, 'min-w-0', className)}>
            {(title || action) && (
                <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-4 pt-4 sm:px-5">
                    <div className="min-w-0">
                        {title && (
                            <h3 className="flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
                                {title}
                                {info && <InfoTip text={info} />}
                            </h3>
                        )}
                        {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </header>
            )}
            <div className={cn('px-4 pb-4 pt-3 sm:px-5', bodyClassName)}>{children}</div>
        </section>
    );
}

/** An (i) that explains a metric: hover on desktop, tap on phones. Positioned to stay on screen. */
export function InfoTip({ text }: { text: string }) {
    const [open, setOpen] = useState(false);
    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <button
                    type="button"
                    aria-label="What does this mean?"
                    onClick={(e) => { e.preventDefault(); setOpen(true); }}
                    onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
                    onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
                    className="relative z-10 -m-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                >
                    <Info className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    side="bottom"
                    align="center"
                    sideOffset={4}
                    collisionPadding={12}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    className="z-[60] w-64 rounded-xl bg-slate-900 px-3 py-2 text-[12px] font-normal leading-snug text-white shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0"
                >
                    {text}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}

// ── Segmented control (sliding selection) ─────────────────────────────────────
export function Segmented<T extends string>({
    value, options, onChange, size = 'md', className, ariaLabel,
}: {
    value: T;
    // Infer T from `value` only, so option literals don't widen it to string.
    options: { value: NoInfer<T>; label: React.ReactNode; title?: string }[];
    onChange: (v: NoInfer<T>) => void;
    size?: 'sm' | 'md';
    className?: string;
    ariaLabel?: string;
}) {
    const id = useId();
    return (
        <div
            role="tablist"
            aria-label={ariaLabel}
            className={cn('inline-flex max-w-full overflow-x-auto rounded-xl bg-slate-200/60 p-1 [scrollbar-width:none]', className)}
        >
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        title={o.title}
                        onClick={() => onChange(o.value)}
                        className={cn(
                            'relative shrink-0 whitespace-nowrap rounded-[9px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50',
                            size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3.5 text-[13px]',
                            active ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900',
                        )}
                    >
                        {active && (
                            <motion.span
                                layoutId={`seg-${id}`}
                                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                                className="absolute inset-0 rounded-[9px] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.12),0_1px_1px_rgba(15,23,42,0.04)]"
                            />
                        )}
                        <span className="relative">{o.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ── Change vs previous period ─────────────────────────────────────────────────
export function Delta({ value, invert = false, className, unit = '%' }: { value: number | null; invert?: boolean; className?: string; unit?: string }) {
    if (value === null || !isFinite(value)) {
        return <span className={cn('text-[12px] font-medium text-slate-400', className)}>new</span>;
    }
    const rounded = Math.round(value);
    if (rounded === 0) {
        return (
            <span className={cn('inline-flex items-center gap-0.5 text-[12px] font-semibold text-slate-500', className)}>
                <Minus className="h-3 w-3" aria-hidden="true" />0{unit}
            </span>
        );
    }
    const up = rounded > 0;
    const good = invert ? !up : up;
    const Icon = up ? ArrowUpRight : ArrowDownRight;
    return (
        <span
            className={cn('inline-flex items-center gap-0.5 text-[12px] font-semibold', good ? 'text-emerald-700' : 'text-rose-600', className)}
            aria-label={`${up ? 'Up' : 'Down'} ${Math.abs(rounded)}${unit === '%' ? '%' : ' points'}`}
        >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {Math.abs(rounded) > 999 ? '999+' : Math.abs(rounded)}{unit}
        </span>
    );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
export function StatTile({
    label, value, sub, delta, invert, selected, onClick, info, deltaTitle, deltaUnit,
}: {
    label: string;
    value: React.ReactNode;
    sub?: React.ReactNode;
    delta?: number | null;
    invert?: boolean;
    selected?: boolean;
    onClick?: () => void;
    info?: string;
    deltaTitle?: string;
    deltaUnit?: string;
}) {
    return (
        <div
            className={cn(
                CARD,
                'relative flex min-w-0 flex-col items-start px-4 py-3.5 text-left transition-[box-shadow,transform]',
                onClick && 'hover:ring-slate-900/[0.12] motion-safe:has-[>button:active]:scale-[0.985]',
                selected && 'ring-2 ring-sky-500/70 hover:ring-sky-500/70',
            )}
        >
            {onClick && (
                // The whole tile selects the chart metric; the (i) sits above this layer.
                <button
                    type="button"
                    onClick={onClick}
                    aria-pressed={!!selected}
                    aria-label={`Show ${label} on the chart`}
                    className="absolute inset-0 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                />
            )}
            <span className="pointer-events-none flex items-center gap-1.5 text-[13px] font-medium text-slate-500">
                {label}
                {info && <span className="pointer-events-auto"><InfoTip text={info} /></span>}
            </span>
            <span className="pointer-events-none mt-1 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-slate-900">{value}</span>
            <span className="pointer-events-none mt-1 flex min-h-[18px] flex-wrap items-center gap-x-2 gap-y-0.5">
                {delta !== undefined && <span title={deltaTitle}><Delta value={delta ?? null} invert={invert} unit={deltaUnit} /></span>}
                {sub && <span className="text-[12px] text-slate-500">{sub}</span>}
            </span>
        </div>
    );
}

// ── Bar list (top-N with proportional wash) ───────────────────────────────────
export interface BarListRow {
    id: string;
    label: React.ReactNode;
    title?: string;
    hint?: React.ReactNode;
    value: number;
    display?: React.ReactNode;
    extra?: React.ReactNode[];
    onClick?: () => void;
}

export function BarList({
    rows: allRows, valueLabel, extraLabels = [], empty = 'No data for this period yet.', max, initial,
}: {
    rows: BarListRow[];
    valueLabel: string;
    extraLabels?: string[];
    empty?: React.ReactNode;
    max?: number;
    /** Show this many rows first, with a "Show all" button for the rest. */
    initial?: number;
}) {
    const [expanded, setExpanded] = useState(false);
    if (!allRows.length) return <p className="py-6 text-center text-[13px] text-slate-500">{empty}</p>;
    const rows = initial && !expanded ? allRows.slice(0, initial) : allRows;
    const top = max ?? Math.max(...allRows.map((r) => r.value), 1);
    return (
        <div>
            <div className="mb-1.5 flex items-center justify-end gap-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {extraLabels.map((l) => <span key={l} className="hidden w-16 text-right sm:block">{l}</span>)}
                <span className="w-16 text-right">{valueLabel}</span>
            </div>
            <ul className="space-y-1">
                {rows.map((r) => {
                    const width = Math.max(2, (r.value / top) * 100);
                    const Inner = (
                        <>
                            <span className="relative min-w-0 flex-1">
                                <span
                                    aria-hidden="true"
                                    className="absolute inset-y-0 left-0 rounded-lg bg-sky-500/[0.11]"
                                    style={{ width: `${width}%` }}
                                />
                                <span className="relative flex min-w-0 items-center gap-2 px-2.5 py-[7px]">
                                    <span className="truncate text-[13px] font-medium text-slate-800" title={r.title}>{r.label}</span>
                                    {r.hint && <span className="shrink-0 truncate text-[12px] text-slate-400">{r.hint}</span>}
                                </span>
                            </span>
                            {(r.extra || []).map((x, i) => (
                                <span key={i} className="hidden w-16 shrink-0 text-right text-[12px] tabular-nums text-slate-500 sm:block">{x}</span>
                            ))}
                            <span className="w-16 shrink-0 text-right text-[13px] font-semibold tabular-nums text-slate-900">
                                {r.display ?? r.value}
                            </span>
                        </>
                    );
                    return (
                        <li key={r.id}>
                            {r.onClick ? (
                                <button type="button" onClick={r.onClick} className="flex w-full items-center gap-3 rounded-lg text-left transition-colors hover:bg-slate-50">
                                    {Inner}
                                </button>
                            ) : (
                                <div className="flex items-center gap-3">{Inner}</div>
                            )}
                        </li>
                    );
                })}
            </ul>
            {initial && allRows.length > initial && (
                <button type="button" onClick={() => setExpanded((v) => !v)}
                    className="mt-2 w-full rounded-lg py-1.5 text-[13px] font-semibold text-sky-700 transition-colors hover:bg-sky-50">
                    {expanded ? 'Show fewer' : `Show all ${allRows.length}`}
                </button>
            )}
        </div>
    );
}

// ── Small pieces ──────────────────────────────────────────────────────────────
export function Chip({ children, tone = 'slate', className, title }: {
    children: React.ReactNode;
    tone?: 'slate' | 'sky' | 'emerald' | 'amber' | 'violet' | 'rose';
    className?: string;
    title?: string;
}) {
    const tones = {
        slate: 'bg-slate-100 text-slate-600',
        sky: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/15',
        emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15',
        amber: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20',
        violet: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/15',
        rose: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/15',
    };
    return (
        <span title={title} className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', tones[tone], className)}>
            {children}
        </span>
    );
}

export function CountryCode({ code }: { code: string | null | undefined }) {
    return (
        <span className="inline-flex h-[18px] min-w-[26px] shrink-0 items-center justify-center rounded-[5px] bg-slate-100 px-1 text-[10px] font-bold tracking-wide text-slate-500">
            {code && code !== 'XX' ? code : '··'}
        </span>
    );
}

export function Empty({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children?: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-3 text-[15px] font-semibold text-slate-900">{title}</p>
            {children && <div className="mt-1 max-w-sm text-[13px] leading-relaxed text-slate-500">{children}</div>}
        </div>
    );
}

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn('animate-pulse rounded-xl bg-slate-200/70', className)} />;
}

export function TileSkeletons({ count = 4 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className={cn(CARD, 'px-4 py-3.5')}>
                    <Skeleton className="h-3 w-20 rounded-md" />
                    <Skeleton className="mt-3 h-7 w-24 rounded-md" />
                    <Skeleton className="mt-2 h-3 w-12 rounded-md" />
                </div>
            ))}
        </>
    );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
    return (
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
            <div>
                <h2 className="!text-[20px] font-bold tracking-[-0.02em] text-slate-900">{title}</h2>
                {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

export const PILL_BTN =
    'inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-900/[0.08] ' +
    'transition-[background-color,transform] duration-150 hover:bg-slate-50 motion-safe:active:scale-[0.97] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 cursor-pointer disabled:opacity-50';

// ── Sheet: right panel on desktop, bottom sheet on phones ─────────────────────
export function IosSheet({
    open, onOpenChange, title, subtitle, children, headerExtra,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
    headerExtra?: React.ReactNode;
}) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/25 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <Dialog.Content
                    className={cn(
                        'fixed z-50 flex flex-col bg-slate-50 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] outline-none',
                        'inset-x-0 bottom-0 h-[92vh] rounded-t-[22px]',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom data-[state=open]:duration-300 data-[state=closed]:duration-200',
                        'md:inset-x-auto md:inset-y-3 md:right-3 md:h-auto md:w-[560px] md:rounded-[22px] md:data-[state=open]:slide-in-from-right md:data-[state=closed]:slide-out-to-right md:data-[state=open]:slide-in-from-bottom-0 md:data-[state=closed]:slide-out-to-bottom-0',
                    )}
                >
                    <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-300 md:hidden" aria-hidden="true" />
                    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200/80 px-5 pb-3 pt-3 md:pt-4">
                        <div className="min-w-0">
                            <Dialog.Title className="truncate !text-[17px] font-semibold tracking-[-0.01em] text-slate-900">{title}</Dialog.Title>
                            {subtitle ? (
                                <Dialog.Description className="mt-0.5 text-[13px] text-slate-500">{subtitle}</Dialog.Description>
                            ) : (
                                <Dialog.Description className="sr-only">Details</Dialog.Description>
                            )}
                            {headerExtra}
                        </div>
                        <Dialog.Close className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-slate-600 transition-colors hover:bg-slate-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50">
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Dialog.Close>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

/** Grouped list rows, like iOS Settings. */
export function GroupedList({ children, className }: { children: React.ReactNode; className?: string }) {
    return <ul className={cn(CARD, 'divide-y divide-slate-100 overflow-hidden', className)}>{children}</ul>;
}

export function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <li className="flex items-center justify-between gap-4 px-4 py-2.5">
            <span className="text-[13px] text-slate-500">{label}</span>
            <span className="min-w-0 truncate text-right text-[13px] font-medium text-slate-900">{children}</span>
        </li>
    );
}
