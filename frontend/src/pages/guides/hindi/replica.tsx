/**
 * Building blocks shared by the demos on /hindi-online-test-maker: the frame every
 * demo sits in (DemoFrame: title, live tip, Restart, Full window), a browser window
 * and a phone drawn at natural size, sonner-style toasts, and small hooks. Adapted
 * from the conduct guide's replica.tsx (pages/guides/conduct), with this page's
 * prefix (ht-) and stylesheet, so the two pages never affect each other.
 *
 * Tailwind's sm: variants follow the reader's window, not the replica, so replicas
 * take a `d` (desktop) flag and resolve them themselves.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Lock, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

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
        <div className="ht-toasts" aria-live="polite">
            {items.map((t) => (
                <div key={t.id} className="ht-toast" data-tone={t.tone ?? 'info'}>
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
    return { items, push };
}

/* ── Device chrome ─────────────────────────────────────────────────────── */

export function StatusIcons() {
    return (
        <span className="ht-statusbar-icons" aria-hidden="true">
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
        <div className="ht-phone" role="group" aria-label={label}>
            <div className="ht-phone-screen ht-screen">
                <div className="ht-phone-status">
                    <span>{time}</span>
                    <i className="ht-phone-island" aria-hidden="true" />
                    <StatusIcons />
                </div>
                <div className="ht-phone-view">{children}</div>
                {overlay}
                <i className="ht-phone-home" aria-hidden="true" />
            </div>
        </div>
    );
}

/** A Safari-style window around a desktop replica; `phone` gives it a phone's toolbar instead. */
export function BrowserWindow({ url, children, phone, className = '' }: { url: string; children: ReactNode; phone?: boolean; className?: string }) {
    return (
        <div className={`ht-window${phone ? ' ht-window--phone' : ''} ${className}`}>
            <div className="ht-window-bar" aria-hidden="true">
                <div className="ht-window-lights">
                    <i />
                    <i />
                    <i />
                </div>
                <span className="ht-window-url">
                    <Lock /> {url}
                </span>
            </div>
            <div className="ht-window-body">{children}</div>
        </div>
    );
}

/* ── The frame every demo sits in ──────────────────────────────────────── */

/**
 * A demo's title, a live tip, Restart, and "Full window": on a small laptop or a
 * phone the demo can take the whole window (Esc or Done returns). The demo stays
 * mounted either way, so nothing resets.
 */
export function DemoFrame({
    id,
    title,
    tip,
    onRestart,
    caption,
    children,
    wide,
}: {
    id?: string;
    title: string;
    tip?: ReactNode;
    onRestart?: () => void;
    caption?: ReactNode;
    children: ReactNode;
    wide?: 'md' | 'lg';
}) {
    const [full, setFull] = useState(false);
    const ref = useRef<HTMLElement>(null);

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

    return (
        <figure ref={ref} id={id} className={`ht-widget ht-demo${wide ? ` ht-wide${wide === 'lg' ? '' : `-${wide}`}` : ''}${full ? ' is-full' : ''}`}>
            <div className="ht-demo-bar">
                <div className="ht-demo-head">
                    <p className="ht-demo-title">{title}</p>
                    {tip && (
                        <p className="ht-demo-tip" aria-live="polite">
                            {tip}
                        </p>
                    )}
                </div>
                <div className="ht-demo-controls">
                    {onRestart && (
                        <button type="button" className="ht-restart" onClick={onRestart}>
                            <RotateCcw aria-hidden="true" /> <span>Restart</span>
                        </button>
                    )}
                    <button type="button" className="ht-restart ht-expand" aria-pressed={full} onClick={() => (full ? leave() : setFull(true))} title={full ? 'Back to the page (Esc)' : 'Use the whole window'}>
                        {full ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
                        <span>{full ? 'Done' : 'Full window'}</span>
                    </button>
                </div>
            </div>
            <div className="ht-demo-body">{children}</div>
            {caption && <figcaption>{caption}</figcaption>}
        </figure>
    );
}
