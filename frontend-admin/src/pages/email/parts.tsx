/**
 * Building blocks for admin → Email, in the analytics panel's iOS language:
 * a wide sheet, the email editor, the live preview and small form pieces.
 */
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Bold, Braces, Check, Link2, List, Monitor, MousePointerClick, Smartphone, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Segmented } from '../analytics/ui';
import { emailApi, type EmailDraft, type Variable } from './api';
import { BODY_HELP } from './model';

// ── Sheet: wide on desktop, full-height bottom sheet on phones ───────────────
export function WideSheet({
    open, onOpenChange, title, subtitle, children, footer, headerExtra, width = 'wide',
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    headerExtra?: React.ReactNode;
    width?: 'wide' | 'narrow';
}) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <Dialog.Content
                    className={cn(
                        'fixed z-50 flex flex-col bg-slate-50 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] outline-none',
                        'inset-x-0 bottom-0 h-[94vh] rounded-t-[22px]',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom data-[state=open]:duration-300 data-[state=closed]:duration-200',
                        width === 'wide'
                            ? 'md:inset-3 md:left-auto md:h-auto md:w-[min(1180px,calc(100vw-24px))] md:rounded-[22px]'
                            : 'md:inset-y-3 md:left-auto md:right-3 md:h-auto md:w-[600px] md:rounded-[22px]',
                        'md:data-[state=open]:slide-in-from-right md:data-[state=closed]:slide-out-to-right md:data-[state=open]:slide-in-from-bottom-0 md:data-[state=closed]:slide-out-to-bottom-0',
                    )}
                >
                    <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-300 md:hidden" aria-hidden="true" />
                    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200/80 px-5 pb-3 pt-3 md:pt-4">
                        <div className="min-w-0">
                            <Dialog.Title className="truncate !text-[17px] font-semibold tracking-[-0.01em] text-slate-900">{title}</Dialog.Title>
                            {subtitle ? (
                                <Dialog.Description className="mt-0.5 truncate text-[13px] text-slate-500">{subtitle}</Dialog.Description>
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
                    {footer && (
                        <div className="shrink-0 border-t border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md pb-[max(12px,env(safe-area-inset-bottom))] sm:px-5 md:rounded-b-[22px]">
                            {footer}
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

// ── Confirm (iOS alert) ──────────────────────────────────────────────────────
export function Confirm({
    open, onOpenChange, title, message, confirm, onConfirm, destructive,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    message: React.ReactNode;
    confirm: string;
    onConfirm: () => void;
    destructive?: boolean;
}) {
    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-slate-900/35 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
                <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[min(340px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[18px] bg-white/95 text-center shadow-2xl backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0">
                    <div className="px-5 pb-4 pt-5">
                        <AlertDialog.Title className="!text-[17px] font-semibold text-slate-900">{title}</AlertDialog.Title>
                        <AlertDialog.Description className="mt-1.5 text-[13px] leading-snug text-slate-600">{message}</AlertDialog.Description>
                    </div>
                    <div className="grid grid-cols-2 border-t border-slate-200">
                        <AlertDialog.Cancel className="h-11 border-r border-slate-200 text-[16px] text-sky-600 hover:bg-slate-50">Cancel</AlertDialog.Cancel>
                        <AlertDialog.Action onClick={onConfirm}
                            className={cn('h-11 text-[16px] font-semibold hover:bg-slate-50', destructive ? 'text-rose-600' : 'text-sky-600')}>
                            {confirm}
                        </AlertDialog.Action>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}

// ── Form pieces ──────────────────────────────────────────────────────────────
export const INPUT =
    'h-10 w-full rounded-xl border-0 bg-white px-3 text-[15px] text-slate-900 ring-1 ring-inset ring-slate-900/[0.08] placeholder:text-slate-400 ' +
    'focus:outline-none focus:ring-2 focus:ring-sky-500/50';

export const PRIMARY_BTN =
    'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-[15px] font-semibold text-white ' +
    'transition-[background-color,transform] hover:bg-slate-800 motion-safe:active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50';

export const SOFT_BTN =
    'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-[15px] font-semibold text-slate-800 ring-1 ring-slate-900/[0.08] ' +
    'transition-[background-color,transform] hover:bg-slate-50 motion-safe:active:scale-[0.98] disabled:opacity-50 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50';

export function Field({ label, hint, children, right }: { label: string; hint?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
                <span className="text-[13px] font-medium text-slate-600">{label}</span>
                {right && <span className="text-[12px] text-slate-400">{right}</span>}
            </span>
            {children}
            {hint && <span className="mt-1 block px-1 text-[12px] leading-snug text-slate-500">{hint}</span>}
        </label>
    );
}

export function Group({ title, children, footer, className }: { title?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; className?: string }) {
    return (
        <section className={className}>
            {title && <h3 className="mb-1.5 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</h3>}
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-900/[0.06]">{children}</div>
            {footer && <p className="mt-1.5 px-1 text-[12px] leading-snug text-slate-500">{footer}</p>}
        </section>
    );
}

/** Multi-select chips. Nothing picked = "any". */
export function ChoiceChips<T extends string>({
    options, value, onChange, anyLabel = 'Any', ariaLabel,
}: {
    options: { value: T; label: string; title?: string; count?: number }[];
    value: T[];
    onChange: (v: T[]) => void;
    anyLabel?: string;
    ariaLabel: string;
}) {
    const chip = (active: boolean) => cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50',
        active ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-inset ring-slate-900/[0.08] hover:bg-slate-50',
    );
    return (
        <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
            <button type="button" className={chip(value.length === 0)} aria-pressed={value.length === 0} onClick={() => onChange([])}>{anyLabel}</button>
            {options.map((o) => {
                const on = value.includes(o.value);
                return (
                    <button key={o.value} type="button" title={o.title} aria-pressed={on} className={chip(on)}
                        onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}>
                        {on && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        {o.label}
                        {o.count !== undefined && <span className={cn('tabular-nums', on ? 'text-white/70' : 'text-slate-400')}>{o.count}</span>}
                    </button>
                );
            })}
        </div>
    );
}

// ── The email editor ─────────────────────────────────────────────────────────
export function BodyEditor({
    value, onChange, variables, minRows = 14,
}: {
    value: string;
    onChange: (v: string) => void;
    variables: Record<string, Variable>;
    minRows?: number;
}) {
    const ref = useRef<HTMLTextAreaElement>(null);
    const [helpOpen, setHelpOpen] = useState(false);

    // Grow with the text, like Notes.
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.max(el.scrollHeight, minRows * 24)}px`;
    }, [value, minRows]);

    const edit = (fn: (sel: string) => { text: string; caret?: number }) => {
        const el = ref.current;
        if (!el) return;
        const start = el.selectionStart ?? value.length;
        const end = el.selectionEnd ?? value.length;
        const { text, caret } = fn(value.slice(start, end));
        const next = value.slice(0, start) + text + value.slice(end);
        onChange(next);
        requestAnimationFrame(() => {
            el.focus();
            const pos = start + (caret ?? text.length);
            el.setSelectionRange(pos, pos);
        });
    };

    const tools: { icon: React.ElementType; label: string; run: () => void }[] = [
        { icon: Bold, label: 'Bold', run: () => edit((s) => ({ text: `**${s || 'bold words'}**`, caret: s ? undefined : 2 })) },
        { icon: Link2, label: 'Link', run: () => edit((s) => ({ text: `[${s || 'link words'}](https://app.testoza.com/)` })) },
        {
            icon: MousePointerClick, label: 'Button',
            run: () => edit((s) => ({ text: `\n\n[[${s || 'Open My Tests'}]](https://app.testoza.com/my-tests)\n\n` })),
        },
        {
            icon: List, label: 'Bullets',
            run: () => edit((s) => ({ text: (s || 'first point\nsecond point').split('\n').map((l) => (l.startsWith('- ') ? l : `- ${l}`)).join('\n') })),
        },
    ];

    return (
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-inset ring-slate-900/[0.08] focus-within:ring-2 focus-within:ring-sky-500/50">
            <div className="flex items-center gap-0.5 border-b border-slate-100 px-1.5 py-1">
                {tools.map((t) => (
                    <button key={t.label} type="button" onClick={t.run} title={t.label} aria-label={t.label}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                        <t.icon className="h-4 w-4" aria-hidden="true" />
                        <span className="hidden sm:inline">{t.label}</span>
                    </button>
                ))}
                <Popover.Root>
                    <Popover.Trigger asChild>
                        <button type="button" title="Insert a person's detail"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold text-sky-700 hover:bg-sky-50">
                            <Braces className="h-4 w-4" aria-hidden="true" /> Detail
                        </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Content align="start" sideOffset={6} collisionPadding={12}
                            className="z-[70] w-72 overflow-hidden rounded-2xl bg-white p-1 shadow-xl ring-1 ring-slate-900/10">
                            {Object.entries(variables).filter(([k]) => k !== 'app' && k !== 'site').map(([key, v]) => (
                                <Popover.Close key={key} asChild>
                                    <button type="button"
                                        onClick={() => edit(() => ({ text: key === 'first_name' ? '{first_name|there}' : `{${key}}` }))}
                                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50">
                                        <span className="text-[14px] text-slate-800">{v.label}</span>
                                        <span className="truncate font-mono text-[11px] text-slate-400">{v.sample}</span>
                                    </button>
                                </Popover.Close>
                            ))}
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>
                <button type="button" onClick={() => setHelpOpen((o) => !o)} aria-expanded={helpOpen}
                    className="ml-auto h-8 rounded-lg px-2 text-[12px] font-semibold text-slate-500 hover:bg-slate-100">
                    {helpOpen ? 'Hide help' : 'How to format'}
                </button>
            </div>
            {helpOpen && (
                <dl className="grid grid-cols-1 gap-x-4 gap-y-1 border-b border-slate-100 bg-slate-50/70 px-3 py-2.5 text-[12px] sm:grid-cols-2">
                    {BODY_HELP.map(([code, what]) => (
                        <div key={code} className="flex items-baseline gap-2">
                            <dt className="shrink-0 font-mono text-[11.5px] text-slate-800">{code}</dt>
                            <dd className="text-slate-500">{what}</dd>
                        </div>
                    ))}
                </dl>
            )}
            <textarea
                ref={ref}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                spellCheck
                aria-label="Email text"
                className="block w-full resize-none border-0 bg-transparent px-4 py-3 text-[15px] leading-6 text-slate-900 focus:outline-none focus:ring-0"
            />
        </div>
    );
}

// ── Live preview ─────────────────────────────────────────────────────────────
function useDebounced<T>(value: T, ms = 400): T {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
}

export function EmailPreview({
    draft, userId, templateKey, fromName, people, onPickPerson, compact,
}: {
    draft: EmailDraft;
    userId: string | null;
    templateKey?: string | null;
    fromName: string;
    /** People to preview as (the first rows of the audience). */
    people?: { id: string; label: string }[];
    onPickPerson?: (id: string | null) => void;
    compact?: boolean;
}) {
    const d = useDebounced(draft);
    const [device, setDevice] = usePreviewDevice();
    const q = useQuery({
        queryKey: ['email', 'preview', d, userId, templateKey],
        queryFn: () => emailApi.preview({ ...d, user_id: userId, template_key: templateKey }),
        enabled: !!d.subject.trim() && !!d.body.trim(),
        staleTime: 60_000,
        placeholderData: (prev) => prev,
    });
    const frame = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState(560);
    // Links open in a new tab, so "click every link" works right here.
    const html = useMemo(() => (q.data?.html ?? '').replace('<head>', '<head><base target="_blank">'), [q.data?.html]);

    const fit = () => {
        const doc = frame.current?.contentDocument;
        if (doc?.body) setHeight(Math.min(Math.max(doc.body.scrollHeight + 8, 360), 2000));
    };
    useEffect(fit, [html, device]);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                {people && onPickPerson ? (
                    <label className="flex min-w-0 items-center gap-2 text-[13px] text-slate-500">
                        <span className="shrink-0">Preview as</span>
                        <select value={userId ?? ''} onChange={(e) => onPickPerson(e.target.value || null)}
                            className="h-8 min-w-0 max-w-[220px] truncate rounded-lg border-0 bg-white px-2 text-[13px] font-medium text-slate-800 ring-1 ring-inset ring-slate-900/[0.08] focus:ring-2 focus:ring-sky-500/50">
                            <option value="">A sample teacher</option>
                            {people.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                    </label>
                ) : <span />}
                <Segmented<'phone' | 'desktop'> size="sm" ariaLabel="Preview size" value={device} onChange={setDevice}
                    options={[
                        { value: 'phone', label: <span className="inline-flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" />Phone</span> },
                        { value: 'desktop', label: <span className="inline-flex items-center gap-1"><Monitor className="h-3.5 w-3.5" />Desktop</span> },
                    ]} />
            </div>

            {/* The inbox row people see before they open it. */}
            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-900/[0.06]">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[15px] font-semibold text-slate-900">{fromName || 'TestoZa'}</span>
                    <span className="shrink-0 text-[12px] text-slate-400">10:30 am</span>
                </div>
                <p className="truncate text-[14px] font-medium text-slate-800">{q.data?.subject || draft.subject || 'Subject'}</p>
                <p className="truncate text-[13px] text-slate-500">{q.data?.preheader || draft.preheader || 'Preview text shows here'}</p>
            </div>

            {q.data && q.data.warnings.length > 0 && (
                <ul className="space-y-1 rounded-2xl bg-amber-50 px-4 py-3 text-[13px] text-amber-900 ring-1 ring-inset ring-amber-600/20">
                    {q.data.warnings.map((w) => (
                        <li key={w} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{w}</li>
                    ))}
                </ul>
            )}

            <div className={cn('mx-auto overflow-hidden rounded-[20px] bg-slate-100 ring-1 ring-slate-900/[0.06] transition-[max-width] duration-300',
                device === 'phone' ? 'max-w-[390px]' : 'max-w-full', q.isFetching && 'opacity-70')}>
                {html ? (
                    <iframe ref={frame} title="Email preview" srcDoc={html} onLoad={fit}
                        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                        className="block w-full border-0 bg-slate-100" style={{ height: compact ? Math.min(height, 520) : height }} />
                ) : (
                    <div className="flex h-60 items-center justify-center px-6 text-center text-[13px] text-slate-500">
                        {q.isError ? 'Couldn’t draw the preview. Check the subject and text.' : 'Write a subject and some text to see the email.'}
                    </div>
                )}
            </div>
        </div>
    );
}

function usePreviewDevice(): ['phone' | 'desktop', (v: 'phone' | 'desktop') => void] {
    const [v, setV] = useState<'phone' | 'desktop'>(() => {
        try {
            return localStorage.getItem('tz_admin_email_device') === 'desktop' ? 'desktop' : 'phone';
        } catch {
            return 'phone';
        }
    });
    return [v, (next) => {
        setV(next);
        try { localStorage.setItem('tz_admin_email_device', next); } catch { /* storage blocked */ }
    }];
}
