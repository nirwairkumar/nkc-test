/**
 * Building blocks shared by the demos on /math-test-maker: the frame every demo sits in
 * (DemoFrame: title, live tip, Restart, Full window), a phone drawn at natural size, a
 * browser window, sonner-style toasts, small product pieces (Avatar, Flag, the shadcn
 * Switch) and hooks. Forked from the cheating and Hindi guides' replica.tsx, with this
 * page's prefix (mt-) and stylesheet, so the pages never affect each other.
 */
import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode, type RefObject } from 'react';
import { Lock, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

/* ── Hooks ─────────────────────────────────────────────────────────────── */

/** True while the reader asks for reduced motion. */
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

/* ── Product pieces ────────────────────────────────────────────────────── */

/** components/exams card surface. */
export const CARD = 'rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)]';

/** components/exams/MonitorPanel.tsx avatar. */
export function Avatar({ name }: { name: string }) {
    const parts = name.trim().split(/\s+/);
    const initials = ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
    return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[13px] font-bold text-sky-700">{initials}</span>;
}

/** components/exams/MonitorPanel.tsx flag ("2 warnings", "Changed device"). */
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

/** components/ui/switch.tsx, as the test settings use it. */
export function UiSwitch({ checked, onChange, label, disabled }: { checked: boolean; onChange?: (v: boolean) => void; label: string; disabled?: boolean }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange?.(!checked)}
            className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-input'}`}
        >
            <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
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

export function Toasts({ items }: { items: ToastItem[] }) {
    return (
        <div className="mt-toasts mt-toasts--compact" aria-live="polite">
            {items.map((t) => (
                <div key={t.id} className="mt-toast" data-tone={t.tone ?? 'info'}>
                    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d={TOAST_ICON[t.tone ?? 'info']} />
                    </svg>
                    {t.text}
                </div>
            ))}
        </div>
    );
}

/** A toast queue: keeps the last two, each for `ms`. */
export function useToasts(ms = 3200) {
    const [items, setItems] = useState<ToastItem[]>([]);
    const next = useRef(1);
    const timers = useRef<number[]>([]);
    useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
    const push = useCallback(
        (text: string, tone?: ToastItem['tone']) => {
            const id = next.current++;
            setItems((list) => [...list.slice(-1), { id, text, tone }]);
            timers.current.push(window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), ms));
        },
        [ms],
    );
    const clear = useCallback(() => setItems([]), []);
    return { items, push, clear };
}

/* ── Device chrome ─────────────────────────────────────────────────────── */

export function StatusIcons() {
    return (
        <span className="mt-statusbar-icons" aria-hidden="true">
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
 * points wide, like most Android phones) and as tall as its box allows, so text is
 * never scaled down. The page inside scrolls.
 */
export function Phone({ children, label, time = '9:41', overlay }: { children: ReactNode; label: string; time?: string; overlay?: ReactNode }) {
    return (
        <div className="mt-phone" role="group" aria-label={label}>
            <div className="mt-phone-screen mt-screen">
                <div className="mt-phone-status">
                    <span>{time}</span>
                    <i className="mt-phone-island" aria-hidden="true" />
                    <StatusIcons />
                </div>
                <div className="mt-phone-view">{children}</div>
                {overlay}
                <i className="mt-phone-home" aria-hidden="true" />
            </div>
        </div>
    );
}

/** A desktop browser window around a replica (a phone gets a slimmer bar). */
export function BrowserWindow({ url, children, phone, className = '' }: { url: string; children: ReactNode; phone?: boolean; className?: string }) {
    return (
        <div className={`mt-window${phone ? ' mt-window--phone' : ''} ${className}`}>
            <div className="mt-window-bar" aria-hidden="true">
                <div className="mt-window-lights">
                    <i />
                    <i />
                    <i />
                </div>
                <span className="mt-window-url">
                    <Lock /> {url}
                </span>
            </div>
            <div className="mt-window-body">{children}</div>
        </div>
    );
}

/* ── The frame every demo sits in ──────────────────────────────────────── */

/**
 * A demo's title, a live tip, Restart, and "Full window": on a small laptop or a
 * phone the demo can take the whole window (Esc or Done returns). The demo stays
 * mounted either way, so nothing resets. `frameRef` reaches the <figure>, for a demo
 * that asks the browser for real full screen; `fullscreen` styles it while it is.
 */
export function DemoFrame({
    id,
    title,
    tip,
    onRestart,
    caption,
    children,
    wide,
    frameRef,
    fullscreen,
}: {
    id?: string;
    title: string;
    tip?: ReactNode;
    onRestart?: () => void;
    caption?: ReactNode;
    children: ReactNode;
    wide?: 'md' | 'lg';
    frameRef?: RefObject<HTMLElement>;
    fullscreen?: boolean;
}) {
    const [full, setFull] = useState(false);
    const ownRef = useRef<HTMLElement>(null);
    const ref = frameRef ?? ownRef;

    useEffect(() => {
        if (!full) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
        const root = document.documentElement;
        const before = root.style.overflow;
        root.style.overflow = 'hidden';
        document.addEventListener('keydown', onKey);
        return () => {
            root.style.overflow = before;
            document.removeEventListener('keydown', onKey);
        };
    }, [full]);

    const leave = () => {
        setFull(false);
        // Back to where the reader was: the demo itself.
        requestAnimationFrame(() => ref.current?.scrollIntoView({ block: 'start' }));
    };

    const isFull = full || !!fullscreen;
    return (
        <figure ref={ref as RefObject<HTMLElement>} id={id} className={`mt-widget mt-demo${wide ? ` mt-wide${wide === 'lg' ? '' : `-${wide}`}` : ''}${isFull ? ' is-full' : ''}`}>
            <div className="mt-demo-bar">
                <div className="mt-demo-head">
                    <p className="mt-demo-title">{title}</p>
                    {tip && (
                        <p className="mt-demo-tip" aria-live="polite">
                            {tip}
                        </p>
                    )}
                </div>
                <div className="mt-demo-controls">
                    {onRestart && (
                        <button type="button" className="mt-restart" onClick={onRestart}>
                            <RotateCcw aria-hidden="true" /> <span>Restart</span>
                        </button>
                    )}
                    {!fullscreen && (
                        <button type="button" className="mt-restart mt-expand" aria-pressed={full} onClick={() => (full ? leave() : setFull(true))} title={full ? 'Back to the page (Esc)' : 'Use the whole window'}>
                            {full ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
                            <span>{full ? 'Done' : 'Full window'}</span>
                        </button>
                    )}
                </div>
            </div>
            <div className="mt-demo-body">{children}</div>
            {caption && <figcaption>{caption}</figcaption>}
        </figure>
    );
}
