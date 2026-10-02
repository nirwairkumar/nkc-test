import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check } from 'lucide-react';

/*
 * iOS-style building blocks for the exam screens: a sheet (bottom sheet on phones,
 * centred card on desktop), inset grouped lists, a segmented control and choice rows.
 * Same palette as the dashboard (sky), system font sizes (13/15/17).
 */

export function IosSheet({
    open, onOpenChange, title, children, footer, leading, trailing, wide,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    leading?: React.ReactNode;
    trailing?: React.ReactNode;
    wide?: boolean;
}) {
    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
                <DialogPrimitive.Content
                    className={[
                        'fixed z-50 flex max-h-[94dvh] w-full flex-col overflow-hidden bg-[#f2f2f7] shadow-2xl outline-none',
                        'inset-x-0 bottom-0 rounded-t-[22px]',
                        'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom duration-300',
                        'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[88dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[22px]',
                        'sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95 sm:data-[state=closed]:slide-out-to-bottom-0',
                        wide ? 'sm:w-[640px]' : 'sm:w-[520px]',
                    ].join(' ')}
                >
                    <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
                    <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-2 pt-2 sm:pt-4">
                        <div className="justify-self-start">{leading ?? (
                            <DialogPrimitive.Close className="h-9 rounded-full px-2 text-[17px] text-sky-700 hover:bg-sky-500/10 cursor-pointer">Cancel</DialogPrimitive.Close>
                        )}</div>
                        <DialogPrimitive.Title className="truncate text-center text-[17px] font-semibold text-slate-900">{title}</DialogPrimitive.Title>
                        <div className="justify-self-end">{trailing}</div>
                    </div>
                    <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-2">{children}</div>
                    {footer && <div className="shrink-0 border-t border-slate-200/70 bg-[#f2f2f7]/95 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">{footer}</div>}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

/** An inset grouped list section, like iOS Settings. */
export function Group({ header, footer, children, className = '' }: {
    header?: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={`mt-5 first:mt-1 ${className}`}>
            {header && <h3 className="mb-1.5 px-4 text-[13px] font-normal uppercase tracking-[0.02em] text-slate-500">{header}</h3>}
            <div className="divide-y divide-slate-200/80 overflow-hidden rounded-[14px] bg-white">{children}</div>
            {footer && <p className="mt-1.5 px-4 text-[13px] leading-snug text-slate-500">{footer}</p>}
        </section>
    );
}

export function Row({ label, children, hint }: { label: React.ReactNode; children?: React.ReactNode; hint?: React.ReactNode }) {
    return (
        <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2">
            <div className="min-w-0">
                <div className="text-[17px] text-slate-900">{label}</div>
                {hint && <div className="text-[13px] leading-snug text-slate-500">{hint}</div>}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-[17px] text-slate-500">{children}</div>
        </div>
    );
}

/** A tappable row with a checkmark, for "choose one" lists. */
export function ChoiceRow({ selected, onSelect, title, hint, disabled, badge }: {
    selected: boolean;
    onSelect: () => void;
    title: React.ReactNode;
    hint?: React.ReactNode;
    disabled?: boolean;
    badge?: React.ReactNode;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={onSelect}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
        >
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[17px] text-slate-900">{title}{badge}</div>
                {hint && <div className="mt-0.5 text-[13px] leading-snug text-slate-500">{hint}</div>}
            </div>
            <Check className={`h-5 w-5 shrink-0 text-sky-600 transition-opacity ${selected ? 'opacity-100' : 'opacity-0'}`} strokeWidth={2.5} />
        </button>
    );
}

export function Segmented<T extends string>({ value, onChange, options, ariaLabel }: {
    value: T;
    onChange: (value: T) => void;
    options: { value: T; label: React.ReactNode }[];
    ariaLabel: string;
}) {
    return (
        <div role="radiogroup" aria-label={ariaLabel} className="grid auto-cols-fr grid-flow-col rounded-[10px] bg-slate-200/70 p-0.5">
            {options.map(o => (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={value === o.value}
                    onClick={() => onChange(o.value)}
                    className={`h-8 whitespace-nowrap rounded-[8px] px-3 text-[13px] font-semibold transition-all cursor-pointer ${value === o.value
                        ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.14),0_1px_1px_rgba(15,23,42,0.04)]'
                        : 'text-slate-600 hover:text-slate-900'}`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

export const IOS_INPUT =
    'w-full bg-transparent text-right text-[17px] text-slate-900 placeholder:text-slate-400 outline-none';

export const IOS_PRIMARY =
    'inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-primary text-[17px] font-semibold text-white ' +
    'transition-[background-color,transform] hover:bg-[hsl(200,95%,30%)] motion-safe:active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none cursor-pointer';
