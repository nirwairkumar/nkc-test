/**
 * Building blocks shared by the product replicas on /how-to-conduct-online-exam.
 *
 * Class strings are copied from the product: components/dashboard/dashboardUi.tsx
 * (CARD, PRIMARY_BTN, PILL_BTN, MENU_TRIGGER, MENU_ITEM), components/exams/ios.tsx
 * (Group, Row, ChoiceRow, Segmented, IOS_PRIMARY), components/ui/switch.tsx and the
 * shadcn dropdown/alert-dialog, merged the way tailwind-merge merges them. Tailwind's
 * sm:/lg: variants follow the reader's window, not the replica, so each replica takes
 * a `d` (desktop) flag and resolves them itself.
 *
 * Also here: the frame every demo sits in (DemoFrame), which keeps a demo inside the
 * window and offers a full-window mode, and small hooks for visibility and motion.
 */
import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode, type RefObject } from 'react';
import { Check, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

/* ── Product class strings ─────────────────────────────────────────────── */

export const CARD = 'rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)]';
export const PRIMARY_BTN =
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary text-[15px] font-semibold text-white ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_24px_-12px_rgba(2,132,199,0.85)] ' +
    'transition-[background-color,transform] duration-150 hover:bg-[hsl(200,95%,30%)] motion-safe:active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:pointer-events-none';
export const PILL_BTN =
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-[13px] font-semibold text-slate-700 ' +
    'transition-[background-color,transform] duration-150 hover:bg-slate-200/80 motion-safe:active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:pointer-events-none';
export const MENU_TRIGGER = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer';
/** DropdownMenuContent merged with "w-56 rounded-xl p-1.5". */
export const MENU = 'z-50 min-w-[8rem] overflow-hidden border bg-popover text-popover-foreground shadow-md w-56 rounded-xl p-1.5';
/** DropdownMenuItem merged with MENU_ITEM; Radix focuses items on hover, hence hover: here. */
export const MENU_ITEM = 'relative flex w-full select-none items-center px-2 text-left text-sm outline-none transition-colors rounded-lg py-2 hover:bg-slate-100 hover:text-slate-900 cursor-pointer';
/** components/exams/ios.tsx */
export const IOS_PRIMARY =
    'inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-primary text-[17px] font-semibold text-white ' +
    'transition-[background-color,transform] hover:bg-[hsl(200,95%,30%)] motion-safe:active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none cursor-pointer';

/* ── components/exams/ios.tsx ──────────────────────────────────────────── */

export function Group({ header, footer, children }: { header?: ReactNode; footer?: ReactNode; children: ReactNode }) {
    return (
        <section className="mt-5 first:mt-1">
            {header && <h3 className="mb-1.5 px-4 text-[13px] font-normal uppercase tracking-[0.02em] text-slate-500">{header}</h3>}
            <div className="divide-y divide-slate-200/80 overflow-hidden rounded-[14px] bg-white">{children}</div>
            {footer && <p className="mt-1.5 px-4 text-[13px] leading-snug text-slate-500">{footer}</p>}
        </section>
    );
}

export function Row({ label, children, hint }: { label: ReactNode; children?: ReactNode; hint?: ReactNode }) {
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

export function ChoiceRow({
    selected,
    onSelect,
    title,
    hint,
    disabled,
    badge,
    tab,
    pressed,
}: {
    selected: boolean;
    onSelect?: () => void;
    title: ReactNode;
    hint?: ReactNode;
    disabled?: boolean;
    badge?: ReactNode;
    tab?: number;
    pressed?: boolean;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={onSelect}
            tabIndex={tab}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer${pressed ? ' is-pressed bg-slate-50' : ''}`}
        >
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[17px] text-slate-900">
                    {title}
                    {badge}
                </div>
                {hint && <div className="mt-0.5 text-[13px] leading-snug text-slate-500">{hint}</div>}
            </div>
            <Check className={`h-5 w-5 shrink-0 text-sky-600 transition-opacity ${selected ? 'opacity-100' : 'opacity-0'}`} strokeWidth={2.5} />
        </button>
    );
}

export function Segmented<T extends string>({
    value,
    onChange,
    options,
    label,
    tab,
    pressed,
}: {
    value: T;
    onChange?: (v: T) => void;
    options: { value: T; label: ReactNode }[];
    label: string;
    tab?: number;
    pressed?: T | null;
}) {
    return (
        <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col rounded-[10px] bg-slate-200/70 p-0.5">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={value === o.value}
                    tabIndex={tab}
                    onClick={() => onChange?.(o.value)}
                    className={`h-8 whitespace-nowrap rounded-[8px] px-3 text-[13px] font-semibold transition-all cursor-pointer ${
                        value === o.value ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.14),0_1px_1px_rgba(15,23,42,0.04)]' : 'text-slate-600 hover:text-slate-900'
                    }${pressed === o.value ? ' is-pressed' : ''}`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

/** components/ui/switch.tsx (Radix Switch) as it renders. */
export function UiSwitch({ checked, onChange, label, tab }: { checked: boolean; onChange?: (v: boolean) => void; label: string; tab?: number }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            tabIndex={tab}
            onClick={() => onChange?.(!checked)}
            className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-primary' : 'bg-input'}`}
        >
            <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    );
}

/* ── Exam room pieces (pages/exams, components/exams) ──────────────────── */

export function Avatar({ name, muted }: { name: string; muted?: boolean }) {
    const parts = name.trim().split(/\s+/);
    const initials = ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
    return <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${muted ? 'bg-slate-100 text-slate-400' : 'bg-sky-50 text-sky-700'}`}>{initials}</span>;
}

export function Flag({ icon: Icon, tone, children }: { icon?: ComponentType<{ className?: string }>; tone: 'amber' | 'violet' | 'sky' | 'red'; children: ReactNode }) {
    const tones = {
        amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
        violet: 'bg-violet-50 text-violet-700 ring-violet-600/15',
        sky: 'bg-sky-50 text-sky-700 ring-sky-600/15',
        red: 'bg-red-50 text-red-700 ring-red-600/15',
    } as const;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset ${tones[tone]}`}>
            {Icon && <Icon className="h-3 w-3" />}
            {children}
        </span>
    );
}

export function Chip({ icon: Icon, children }: { icon: ComponentType<{ className?: string }>; children: ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-900/[0.06]">
            <Icon className="h-3.5 w-3.5 text-slate-400" /> {children}
        </span>
    );
}

export type RoomPhase = 'scheduled' | 'lobby' | 'live' | 'ended';

/** PhaseBadge from pages/exams/ExamsPage.tsx (manual start: "Waiting for you"). */
export function PhaseBadge({ phase, manual = true }: { phase: RoomPhase; manual?: boolean }) {
    const styles: Record<RoomPhase, string> = {
        live: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        lobby: 'bg-sky-50 text-sky-700 ring-sky-600/20',
        scheduled: 'bg-violet-50 text-violet-700 ring-violet-600/15',
        ended: 'bg-slate-100 text-slate-600 ring-slate-500/15',
    };
    const label = phase === 'lobby' && manual ? 'Waiting for you' : { scheduled: 'Scheduled', lobby: 'Lobby open', live: 'Live', ended: 'Ended' }[phase];
    return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none ring-1 ring-inset ${styles[phase]}`}>
            {phase === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />}
            {label}
        </span>
    );
}

/** A dropdown that opens inside the replica (the product's opens in a portal). */
export function Menu({ open, onClose, children, up, width = 'w-56' }: { open: boolean; onClose: () => void; children: ReactNode; up?: boolean; width?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            if (!ref.current?.parentElement?.contains(e.target as Node)) onClose();
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, onClose]);
    if (!open) return null;
    return (
        <div ref={ref} role="menu" className={`${MENU.replace('w-56', width)} co-menu-pop absolute right-0 ${up ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
            {children}
        </div>
    );
}

/** components/TestoZaLogo.tsx, light colours only. */
export function Logo({ size }: { size: number }) {
    return (
        <span className="inline-flex select-none items-baseline tracking-tight" style={{ fontFamily: "'Outfit', sans-serif", fontSize: `${size * 0.72}px`, fontWeight: 700, lineHeight: 1 }}>
            <span className="text-[#056eab]">Testo</span>
            <span
                className="inline-block bg-gradient-to-b from-[#FFE885] via-[#F4B838] to-[#9E6400] bg-clip-text text-transparent"
                style={{
                    fontSize: '1.26em',
                    fontWeight: 900,
                    marginRight: '0.02em',
                    marginLeft: '0.02em',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.15)) drop-shadow(0 0 6px rgba(244, 184, 56, 0.45))',
                }}
            >
                Z
            </span>
            <span className="text-[#056eab]">a</span>
        </span>
    );
}

/* ── sonner toasts, drawn inside a replica ─────────────────────────────── */

export interface ToastItem {
    id: number;
    text: string;
    tone?: 'success' | 'info' | 'error' | 'warning';
}

const TOAST_ICON: Record<NonNullable<ToastItem['tone']>, string> = {
    success: 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z',
    info: 'M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z',
    error: 'M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
    warning:
        'M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
};

export function Toasts({ items, compact }: { items: ToastItem[]; compact?: boolean }) {
    return (
        <div className={`co-toasts${compact ? ' co-toasts--compact' : ''}`} aria-live="polite">
            {items.map((t) => (
                <div key={t.id} className="co-toast" data-tone={t.tone ?? 'success'}>
                    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d={TOAST_ICON[t.tone ?? 'success']} />
                    </svg>
                    {t.text}
                </div>
            ))}
        </div>
    );
}

/** A toast queue: keeps the last three, each for `ms`. */
export function useToasts(ms = 3400) {
    const [items, setItems] = useState<ToastItem[]>([]);
    const next = useRef(1);
    const timers = useRef<number[]>([]);
    useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
    const push = useCallback(
        (text: string, tone?: ToastItem['tone']) => {
            const id = next.current++;
            setItems((list) => [...list.slice(-2), { id, text, tone }]);
            timers.current.push(window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), ms));
        },
        [ms],
    );
    const clear = useCallback(() => setItems([]), []);
    return { items, push, clear };
}

/* ── The phone around interactive replicas ─────────────────────────────── */

export function StatusIcons() {
    return (
        <span className="co-statusbar-icons" aria-hidden="true">
            <svg width="17" height="11" viewBox="0 0 18 12">
                <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
                <rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor" />
                <rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor" />
                <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
            </svg>
            <svg width="15" height="11" viewBox="0 0 16 12">
                <path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.1-1.2A10.2 10.2 0 0 0 8 .6C5.3.6 2.8 1.6.9 3.4L2 4.6a8.6 8.6 0 0 1 6-2.4Z" fill="currentColor" />
                <path d="M8 5.6c1.4 0 2.6.5 3.6 1.4l1.1-1.2A6.9 6.9 0 0 0 8 4c-1.8 0-3.4.7-4.7 1.8l1.1 1.2c1-.9 2.2-1.4 3.6-1.4Z" fill="currentColor" />
                <path d="M8 9c.6 0 1.1.2 1.5.6L8 11.2 6.5 9.6c.4-.4.9-.6 1.5-.6Z" fill="currentColor" />
            </svg>
            <svg width="25" height="12" viewBox="0 0 27 13">
                <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="currentColor" strokeOpacity="0.4" fill="none" />
                <rect x="2" y="2" width="15" height="9" rx="2" fill="currentColor" />
                <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="currentColor" fillOpacity="0.45" />
            </svg>
        </span>
    );
}

/**
 * A phone for interactive replicas: the screen is drawn at its natural size (360
 * points wide, like most Android phones) and as tall as the demo frame allows, so
 * text is never scaled down. The page inside scrolls.
 */
export function Phone({ children, label, time = '9:41', overlay }: { children: ReactNode; label: string; time?: string; overlay?: ReactNode }) {
    return (
        <div className="co-phone" role="group" aria-label={label}>
            <div className="co-phone-screen co-screen">
                <div className="co-phone-status">
                    <span>{time}</span>
                    <i className="co-phone-island" aria-hidden="true" />
                    <StatusIcons />
                </div>
                <div className="co-phone-view">{children}</div>
                {overlay}
                <i className="co-phone-home" aria-hidden="true" />
            </div>
        </div>
    );
}

/* ── Hooks ─────────────────────────────────────────────────────────────── */

export function useReducedMotion() {
    const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
        if (!mq) return;
        const on = () => setReduced(mq.matches);
        mq.addEventListener('change', on);
        return () => mq.removeEventListener('change', on);
    }, []);
    return reduced;
}

/** True while at least `threshold` of the element is on screen. */
export function useInView(ref: RefObject<HTMLElement>, threshold = 0.15) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || !('IntersectionObserver' in window)) {
            setVisible(true);
            return;
        }
        const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold });
        io.observe(el);
        return () => io.disconnect();
    }, [ref, threshold]);
    return visible;
}

/** The element's width, kept up to date. */
export function useWidth(ref: RefObject<HTMLElement>) {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = () => setWidth(el.clientWidth);
        measure();
        if (!('ResizeObserver' in window)) return;
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref]);
    return width;
}

/** Sets the `inert` attribute (React 18 has no prop for it), so decorative UI can't take focus or clicks. */
export function useInert(ref: RefObject<HTMLElement>, on: boolean) {
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (on) el.setAttribute('inert', '');
        else el.removeAttribute('inert');
    }, [ref, on]);
}

/* ── The frame every demo sits in ──────────────────────────────────────── */

/**
 * A demo's title, a live tip, Restart, and "Full window": on a small laptop or a
 * phone the demo can take the whole window (Esc or the button returns). The demo
 * stays mounted either way, so nothing resets.
 */
export function DemoFrame({
    id,
    title,
    tip,
    onRestart,
    controls,
    caption,
    children,
    wide,
    frameRef,
}: {
    id?: string;
    title: string;
    tip?: ReactNode;
    onRestart?: () => void;
    controls?: ReactNode;
    caption?: ReactNode;
    children: ReactNode;
    wide?: 'md' | 'lg' | 'xl';
    frameRef?: RefObject<HTMLElement>;
}) {
    const [full, setFull] = useState(false);
    const innerRef = useRef<HTMLElement>(null);
    const ref = frameRef ?? innerRef;

    useEffect(() => {
        if (!full) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
        const html = document.documentElement;
        const before = html.style.overflow;
        html.style.overflow = 'hidden';
        document.addEventListener('keydown', onKey);
        return () => {
            html.style.overflow = before;
            document.removeEventListener('keydown', onKey);
        };
    }, [full]);

    const leave = () => {
        setFull(false);
        // Back to where the reader was: the demo itself.
        requestAnimationFrame(() => ref.current?.scrollIntoView({ block: 'start' }));
    };

    return (
        <figure ref={ref as RefObject<HTMLElement>} id={id} className={`co-widget co-demo${wide ? ` co-wide${wide === 'lg' ? '' : `-${wide}`}` : ''}${full ? ' is-full' : ''}`}>
            <div className="co-demo-bar">
                <div className="co-demo-head">
                    <p className="co-demo-title">{title}</p>
                    {tip && (
                        <p className="co-demo-tip" aria-live="polite">
                            {tip}
                        </p>
                    )}
                </div>
                <div className="co-demo-controls">
                    {controls}
                    {onRestart && (
                        <button type="button" className="co-restart" onClick={onRestart}>
                            <RotateCcw aria-hidden="true" /> <span>Restart</span>
                        </button>
                    )}
                    <button type="button" className="co-restart co-expand" aria-pressed={full} onClick={() => (full ? leave() : setFull(true))} title={full ? 'Back to the page (Esc)' : 'Use the whole window'}>
                        {full ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
                        <span>{full ? 'Done' : 'Full window'}</span>
                    </button>
                </div>
            </div>
            <div className="co-demo-body">{children}</div>
            {caption && <figcaption>{caption}</figcaption>}
        </figure>
    );
}
