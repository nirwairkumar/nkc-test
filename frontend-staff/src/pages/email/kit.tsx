/**
 * Building blocks for Email on the team site: the same pieces as admin
 * (frontend-admin/src/pages/email/parts.tsx), written without Radix or framer-motion so this
 * app keeps its six pinned packages and its strict CSP (public/_headers).
 *
 * Email preview: the server's HTML goes into a sandboxed iframe through a blob: URL, never
 * srcdoc or innerHTML (Trusted Types forbids those). The iframe gets no scripts. It inherits
 * this app's CSP, which is why _headers allows `frame-src blob:` and inline style attributes.
 */
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Bold, Braces, Check, Info, Link2, List, Monitor, MousePointerClick, Smartphone, X } from 'lucide-react';
import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/components/ui';
import { emailApi, type EmailDraft, type Variable } from './api';
import { BODY_HELP } from './model';

// ── Remembered choices (a tab, a filter): this browser only, never required ─────
export function usePersisted<T extends string>(key: string, initial: T, allowed: readonly T[]): [T, (v: T) => void] {
    const [v, setV] = useState<T>(() => {
        try {
            const saved = localStorage.getItem(key) as T | null;
            return saved && allowed.includes(saved) ? saved : initial;
        } catch {
            return initial;
        }
    });
    return [v, (next) => {
        setV(next);
        try { localStorage.setItem(key, next); } catch { /* storage blocked */ }
    }];
}

// ── Small controls ───────────────────────────────────────────────────────────────
export const INPUT =
    'h-10 w-full rounded-xl bg-white px-3 text-[15px] text-slate-900 ring-1 ring-inset ring-slate-900/[0.1] placeholder:text-slate-400 ' +
    'focus:outline-none focus:ring-2 focus:ring-indigo-500/60 disabled:bg-slate-50 disabled:text-slate-600';

export function Segmented<T extends string>({ options, value, onChange, ariaLabel, size = 'md' }: {
    options: { value: T; label: React.ReactNode }[];
    value: T;
    onChange: (v: T) => void;
    ariaLabel: string;
    size?: 'sm' | 'md';
}) {
    return (
        <div role="tablist" aria-label={ariaLabel} className="inline-flex max-w-full gap-0.5 rounded-xl bg-slate-200/70 p-0.5">
            {options.map((o) => (
                <button key={o.value} type="button" role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
                    className={cx('shrink-0 whitespace-nowrap rounded-[10px] font-semibold transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60',
                        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-3.5 text-[14px]',
                        value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                    {o.label}
                </button>
            ))}
        </div>
    );
}

/** An (i) that shows its text on hover or keyboard focus. */
export function InfoTip({ text }: { text: string }) {
    return (
        <span className="group relative inline-flex">
            <span tabIndex={0} className="inline-flex rounded-full text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60">
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">{text}</span>
            </span>
            <span aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 hidden w-64 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-[12px] font-normal leading-snug text-white shadow-lg group-focus-within:block group-hover:block">
                {text}
            </span>
        </span>
    );
}

export function FormField({ label, hint, children, right }: { label: string; hint?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
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

export function Group({ title, children, footer }: { title?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
    return (
        <section>
            {title && <h3 className="mb-1.5 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</h3>}
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-900/[0.06]">{children}</div>
            {footer && <p className="mt-1.5 px-1 text-[12px] leading-snug text-slate-500">{footer}</p>}
        </section>
    );
}

/** Multi-select chips. Nothing picked = "any". */
export function ChoiceChips<T extends string>({ options, value, onChange, anyLabel = 'Any', ariaLabel, disabled }: {
    options: { value: T; label: string; title?: string }[];
    value: T[];
    onChange: (v: T[]) => void;
    anyLabel?: string;
    ariaLabel: string;
    disabled?: boolean;
}) {
    const chip = (active: boolean) => cx(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors disabled:cursor-default',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60',
        active ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-inset ring-slate-900/[0.08] enabled:hover:bg-slate-50',
    );
    return (
        <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
            <button type="button" disabled={disabled} className={chip(value.length === 0)} aria-pressed={value.length === 0} onClick={() => onChange([])}>{anyLabel}</button>
            {options.map((o) => {
                const on = value.includes(o.value);
                return (
                    <button key={o.value} type="button" disabled={disabled} title={o.title} aria-pressed={on} className={chip(on)}
                        onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}>
                        {on && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

// ── Modal layers: a wide sheet and a small confirm, Escape closes the top one ──────
const layers: string[] = [];

function useLayer(open: boolean, onClose: () => void, panel: React.RefObject<HTMLElement>) {
    const id = useId();
    const close = useRef(onClose);
    close.current = onClose;
    useEffect(() => {
        if (!open) return;
        const before = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        layers.push(id);
        requestAnimationFrame(() => panel.current?.focus());
        const onKey = (e: KeyboardEvent) => {
            if (layers[layers.length - 1] !== id) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                close.current();
            } else if (e.key === 'Tab' && panel.current) {
                // Keep Tab inside the layer.
                const items = Array.from(panel.current.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
                )).filter((el) => el.offsetParent !== null);
                if (!items.length) return;
                const first = items[0], last = items[items.length - 1];
                if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            layers.splice(layers.indexOf(id), 1);
            if (!layers.length) document.body.style.overflow = overflow;
            before?.focus?.();
        };
    }, [open, id, panel]);
}

/** Wide on desktop, a tall bottom sheet on phones. */
export function Sheet({ open, onClose, title, subtitle, children, footer, width = 'wide' }: {
    open: boolean;
    onClose: () => void;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    width?: 'wide' | 'narrow';
}) {
    const panel = useRef<HTMLDivElement>(null);
    const titleId = useId();
    useLayer(open, onClose, panel);
    if (!open) return null;
    return createPortal(
        <div className="fixed inset-0 z-50">
            <button type="button" tabIndex={-1} aria-label="Close" onClick={onClose} className="absolute inset-0 h-full w-full cursor-default bg-slate-900/30" />
            <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
                className={cx(
                    'absolute flex flex-col bg-slate-50 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] outline-none',
                    'inset-x-0 bottom-0 h-[94dvh] rounded-t-[22px]',
                    width === 'wide'
                        ? 'md:inset-3 md:left-auto md:h-auto md:w-[min(1180px,calc(100vw-24px))] md:rounded-[22px]'
                        : 'md:inset-y-3 md:left-auto md:right-3 md:h-auto md:w-[600px] md:rounded-[22px]',
                )}>
                <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-300 md:hidden" aria-hidden="true" />
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200/80 px-5 pb-3 pt-3 md:pt-4">
                    <div className="min-w-0">
                        <h2 id={titleId} className="truncate text-[17px] font-semibold tracking-[-0.01em] text-slate-900">{title}</h2>
                        {subtitle && <p className="mt-0.5 truncate text-[13px] text-slate-500">{subtitle}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-slate-600 hover:bg-slate-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
                {footer && (
                    <div className="shrink-0 border-t border-slate-200/80 bg-white px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-5 md:rounded-b-[22px]">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}

export function Confirm({ open, onClose, title, message, confirm, onConfirm, destructive }: {
    open: boolean;
    onClose: () => void;
    title: string;
    message: React.ReactNode;
    confirm: string;
    onConfirm: () => void;
    destructive?: boolean;
}) {
    const panel = useRef<HTMLDivElement>(null);
    const titleId = useId();
    useLayer(open, onClose, panel);
    if (!open) return null;
    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <button type="button" tabIndex={-1} aria-label="Cancel" onClick={onClose} className="absolute inset-0 h-full w-full cursor-default bg-slate-900/35" />
            <div ref={panel} role="alertdialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
                className="relative w-[min(360px,100%)] overflow-hidden rounded-[18px] bg-white text-center shadow-2xl outline-none">
                <div className="px-5 pb-4 pt-5">
                    <h2 id={titleId} className="text-[17px] font-semibold text-slate-900">{title}</h2>
                    <div className="mt-1.5 text-[13px] leading-snug text-slate-600">{message}</div>
                </div>
                <div className="grid grid-cols-2 border-t border-slate-200">
                    <button type="button" onClick={onClose} className="h-11 border-r border-slate-200 text-[16px] text-indigo-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={() => { onClose(); onConfirm(); }}
                        className={cx('h-11 text-[16px] font-semibold hover:bg-slate-50', destructive ? 'text-rose-600' : 'text-indigo-600')}>
                        {confirm}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

// ── The email editor ─────────────────────────────────────────────────────────────
export function BodyEditor({ value, onChange, variables, minRows = 14, readOnly }: {
    value: string;
    onChange: (v: string) => void;
    variables: Record<string, Variable>;
    minRows?: number;
    readOnly?: boolean;
}) {
    const ref = useRef<HTMLTextAreaElement>(null);
    const [helpOpen, setHelpOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const menu = useRef<HTMLDivElement>(null);

    // Grow with the text, like Notes.
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.max(el.scrollHeight, minRows * 24)}px`;
    }, [value, minRows]);

    useEffect(() => {
        if (!detailOpen) return;
        const away = (e: MouseEvent) => { if (!menu.current?.contains(e.target as Node)) setDetailOpen(false); };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setDetailOpen(false); } };
        document.addEventListener('mousedown', away);
        document.addEventListener('keydown', esc, true);
        return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc, true); };
    }, [detailOpen]);

    const edit = (fn: (sel: string) => { text: string; caret?: number }) => {
        const el = ref.current;
        if (!el) return;
        const start = el.selectionStart ?? value.length;
        const end = el.selectionEnd ?? value.length;
        const { text, caret } = fn(value.slice(start, end));
        onChange(value.slice(0, start) + text + value.slice(end));
        requestAnimationFrame(() => {
            el.focus();
            const pos = start + (caret ?? text.length);
            el.setSelectionRange(pos, pos);
        });
    };

    const tools: { icon: React.ElementType; label: string; run: () => void }[] = [
        { icon: Bold, label: 'Bold', run: () => edit((s) => ({ text: `**${s || 'bold words'}**`, caret: s ? undefined : 2 })) },
        { icon: Link2, label: 'Link', run: () => edit((s) => ({ text: `[${s || 'link words'}](https://app.testoza.com/)` })) },
        { icon: MousePointerClick, label: 'Button', run: () => edit((s) => ({ text: `\n\n[[${s || 'Open My Tests'}]](https://app.testoza.com/my-tests)\n\n` })) },
        {
            icon: List, label: 'Bullets',
            run: () => edit((s) => ({ text: (s || 'first point\nsecond point').split('\n').map((l) => (l.startsWith('- ') ? l : `- ${l}`)).join('\n') })),
        },
    ];

    return (
        <div className={cx('rounded-2xl bg-white ring-1 ring-inset ring-slate-900/[0.1]', !readOnly && 'focus-within:ring-2 focus-within:ring-indigo-500/60')}>
            {!readOnly && (
                <div className="flex items-center gap-0.5 border-b border-slate-100 px-1.5 py-1">
                    {tools.map((t) => (
                        <button key={t.label} type="button" onClick={t.run} title={t.label} aria-label={t.label}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                            <t.icon className="h-4 w-4" aria-hidden="true" />
                            <span className="hidden sm:inline">{t.label}</span>
                        </button>
                    ))}
                    <div ref={menu} className="relative">
                        <button type="button" onClick={() => setDetailOpen((o) => !o)} aria-expanded={detailOpen} title="Insert a person's detail"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold text-indigo-700 hover:bg-indigo-50">
                            <Braces className="h-4 w-4" aria-hidden="true" /> Detail
                        </button>
                        {detailOpen && (
                            <div role="menu" className="absolute left-0 top-full z-[70] mt-1.5 max-h-80 w-72 overflow-y-auto rounded-2xl bg-white p-1 shadow-xl ring-1 ring-slate-900/10">
                                {Object.entries(variables).filter(([k]) => k !== 'app' && k !== 'site').map(([key, v]) => (
                                    <button key={key} type="button" role="menuitem"
                                        onClick={() => { setDetailOpen(false); edit(() => ({ text: key === 'first_name' ? '{first_name|there}' : `{${key}}` })); }}
                                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50">
                                        <span className="text-[14px] text-slate-800">{v.label}</span>
                                        <span className="truncate font-mono text-[11px] text-slate-400">{v.sample}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button type="button" onClick={() => setHelpOpen((o) => !o)} aria-expanded={helpOpen}
                        className="ml-auto h-8 rounded-lg px-2 text-[12px] font-semibold text-slate-500 hover:bg-slate-100">
                        {helpOpen ? 'Hide help' : 'How to format'}
                    </button>
                </div>
            )}
            {helpOpen && !readOnly && (
                <dl className="grid grid-cols-1 gap-x-4 gap-y-1 border-b border-slate-100 bg-slate-50/70 px-3 py-2.5 text-[12px] sm:grid-cols-2">
                    {BODY_HELP.map(([code, what]) => (
                        <div key={code} className="flex items-baseline gap-2">
                            <dt className="shrink-0 font-mono text-[11.5px] text-slate-800">{code}</dt>
                            <dd className="text-slate-500">{what}</dd>
                        </div>
                    ))}
                </dl>
            )}
            <textarea ref={ref} value={value} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} spellCheck
                aria-label="Email text" data-gramm="false"
                className="block w-full resize-none rounded-b-2xl border-0 bg-transparent px-4 py-3 text-[15px] leading-6 text-slate-900 focus:outline-none" />
        </div>
    );
}

// ── The rendered email, in a sandboxed frame ─────────────────────────────────────
export function MailFrame({ html, minHeight = 360, maxHeight = 2000 }: { html: string; minHeight?: number; maxHeight?: number }) {
    const frame = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState(560);
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        // Links open in a new tab, so "tap every link" works right here.
        const doc = html.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
        const u = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));
        setUrl(u);
        return () => URL.revokeObjectURL(u);
    }, [html]);

    const fit = () => {
        try {
            const body = frame.current?.contentDocument?.body;
            if (body) setHeight(Math.min(Math.max(body.scrollHeight + 8, minHeight), maxHeight));
        } catch {
            /* not readable: keep the last height */
        }
    };
    if (!url) return <div className="h-60" />;
    return (
        <iframe ref={frame} title="Email preview" src={url} onLoad={fit}
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            className="block w-full border-0 bg-white" style={{ height }} />
    );
}

function useDebounced<T>(value: T, ms = 400): T {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
}

type Device = 'phone' | 'desktop';
const DEVICES: readonly Device[] = ['phone', 'desktop'];

export function DeviceSwitch({ value, onChange }: { value: Device; onChange: (v: Device) => void }) {
    return (
        <Segmented<Device> size="sm" ariaLabel="Preview size" value={value} onChange={onChange} options={[
            { value: 'phone', label: <span className="inline-flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" aria-hidden="true" />Phone</span> },
            { value: 'desktop', label: <span className="inline-flex items-center gap-1"><Monitor className="h-3.5 w-3.5" aria-hidden="true" />Desktop</span> },
        ]} />
    );
}

export function useDevice() {
    return usePersisted<Device>('tz_team_email_device', 'phone', DEVICES);
}

/** The inbox row, warnings, and the email as it will arrive. */
export function EmailPreview({ draft, userId, templateKey, fromName, people, onPickPerson }: {
    draft: EmailDraft;
    userId: string | null;
    templateKey?: string | null;
    fromName: string;
    people?: { id: string; label: string }[];
    onPickPerson?: (id: string | null) => void;
}) {
    const d = useDebounced(draft);
    const [device, setDevice] = useDevice();
    const q = useQuery({
        queryKey: ['email', 'preview', d, userId, templateKey],
        queryFn: () => emailApi.preview({ ...d, user_id: userId, template_key: templateKey }),
        enabled: !!d.subject.trim() && !!d.body.trim(),
        staleTime: 60_000,
        placeholderData: (prev) => prev,
    });

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                {people && onPickPerson ? (
                    <label className="flex min-w-0 items-center gap-2 text-[13px] text-slate-500">
                        <span className="shrink-0">Preview as</span>
                        <select value={userId ?? ''} onChange={(e) => onPickPerson(e.target.value || null)}
                            className="h-8 min-w-0 max-w-[220px] truncate rounded-lg bg-white px-2 text-[13px] font-medium text-slate-800 ring-1 ring-inset ring-slate-900/[0.1] focus:outline-none focus:ring-2 focus:ring-indigo-500/60">
                            <option value="">A sample teacher</option>
                            {people.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                    </label>
                ) : <span />}
                <DeviceSwitch value={device} onChange={setDevice} />
            </div>

            <InboxRow from={fromName || 'TestoZa'} subject={q.data?.subject || draft.subject || 'Subject'}
                preheader={q.data?.preheader || draft.preheader || 'Preview text shows here'} />

            {q.data && q.data.warnings.length > 0 && (
                <ul className="space-y-1 rounded-2xl bg-amber-50 px-4 py-3 text-[13px] text-amber-900 ring-1 ring-inset ring-amber-600/20">
                    {q.data.warnings.map((w) => (
                        <li key={w} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{w}</li>
                    ))}
                </ul>
            )}

            <div className={cx('mx-auto overflow-hidden rounded-[20px] bg-white ring-1 ring-slate-900/[0.06] transition-[max-width] duration-300',
                device === 'phone' ? 'max-w-[390px]' : 'max-w-full', q.isFetching && 'opacity-70')}>
                {q.data?.html ? <MailFrame html={q.data.html} /> : (
                    <div className="flex h-60 items-center justify-center px-6 text-center text-[13px] text-slate-500">
                        {q.isError ? 'Couldn’t draw the preview. Check the subject and text.' : 'Write a subject and some text to see the email.'}
                    </div>
                )}
            </div>
        </div>
    );
}

export function InboxRow({ from, subject, preheader }: { from: string; subject: string; preheader: string }) {
    return (
        <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-900/[0.06]">
            <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[15px] font-semibold text-slate-900">{from}</span>
                <span className="shrink-0 text-[12px] text-slate-400">10:30 am</span>
            </div>
            <p className="truncate text-[14px] font-medium text-slate-800">{subject}</p>
            <p className="truncate text-[13px] text-slate-500">{preheader}</p>
        </div>
    );
}
