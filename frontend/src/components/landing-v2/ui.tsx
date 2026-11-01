/**
 * Landing V2 — shared visual primitives.
 *
 * The structural work (headings, links, copy) is in the section files. This
 * module holds the *visual language* so it stays consistent across sections and
 * can be tuned in one place.
 *
 * Design notes — what makes a page read as "premium" rather than "bootstrap":
 *   • depth comes from layered shadow + a light-catching top border, not heavy
 *     1px outlines on everything
 *   • one accent colour (sky) with a single warm secondary (amber) from the
 *     TestoZa logo; everything else is neutral
 *   • gradients are used as *light sources*, not as decoration
 *   • a very low-opacity grain kills the flat "CSS gradient" look
 *   • motion is short (150–400ms), eased, and always respects
 *     prefers-reduced-motion
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/* ── Texture ─────────────────────────────────────────────────────────────── */

/**
 * Film grain. An inline SVG turbulence filter — no network request, and it
 * stops large gradient fills from banding on cheap displays.
 */
export function Grain({ opacity = 0.035 }: { opacity?: number }) {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
                opacity,
                backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
        />
    );
}

/** Soft radial light source. Used to lift dark sections off flat black. */
export function Orb({
    className = '',
    color = 'rgba(56,189,248,0.30)',
    size = 620,
    style,
}: { className?: string; color?: string; size?: number; style?: CSSProperties }) {
    return (
        <div
            aria-hidden="true"
            className={`pointer-events-none absolute rounded-full blur-[110px] ${className}`}
            style={{ width: size, height: size, background: color, ...style }}
        />
    );
}

/* ── Surfaces ────────────────────────────────────────────────────────────── */

/**
 * The workhorse card. `lift` adds a hover elevation; `glow` adds an accent
 * halo that fades in on hover. The inset top highlight is what sells the
 * "physical surface" effect.
 */
export function Surface({
    children, className = '', lift = false, glow = false, as: Tag = 'div',
}: {
    children: ReactNode; className?: string; lift?: boolean; glow?: boolean;
    as?: 'div' | 'article' | 'li' | 'figure';
}) {
    return (
        <Tag
            className={[
                'group/surface relative overflow-hidden rounded-2xl',
                'border border-slate-200/80 bg-white',
                'dark:border-white/[0.08] dark:bg-white/[0.02]',
                'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]',
                'dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_20px_40px_-24px_rgba(0,0,0,0.9)]',
                lift
                    ? 'transition-[transform,box-shadow,border-color] duration-300 ease-out motion-safe:hover:-translate-y-1 hover:border-sky-300/80 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_24px_48px_-20px_rgba(2,132,199,0.35)] dark:hover:border-sky-400/25'
                    : '',
                className,
            ].join(' ')}
        >
            {/* Top light catch */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-900/10 to-transparent dark:via-white/20"
            />
            {glow && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover/surface:opacity-100"
                    style={{
                        background:
                            'radial-gradient(420px circle at 50% 0%, rgba(56,189,248,0.10), transparent 70%)',
                    }}
                />
            )}
            <div className="relative z-[1] h-full">{children}</div>
        </Tag>
    );
}

/** Small pill label. */
export function Pill({
    children, tone = 'sky',
}: { children: ReactNode; tone?: 'sky' | 'amber' | 'emerald' | 'violet' | 'neutral' }) {
    const tones = {
        sky: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20',
        amber: 'bg-amber-50 text-amber-800 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
        emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
        violet: 'bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20',
        neutral: 'bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10',
    } as const;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${tones[tone]}`}>
            {children}
        </span>
    );
}

/** Icon in a tinted, ringed tile — reads more considered than a bare icon. */
export function IconTile({ children, tone = 'sky' }: { children: ReactNode; tone?: 'sky' | 'amber' | 'violet' }) {
    const tones = {
        sky: 'from-sky-500/15 to-sky-500/5 text-sky-600 ring-sky-500/20 dark:text-sky-300',
        amber: 'from-amber-500/15 to-amber-500/5 text-amber-600 ring-amber-500/20 dark:text-amber-300',
        violet: 'from-violet-500/15 to-violet-500/5 text-violet-600 ring-violet-500/20 dark:text-violet-300',
    } as const;
    return (
        <span
            className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-inset ${tones[tone]}`}
        >
            {children}
        </span>
    );
}

/* ── Rhythm ──────────────────────────────────────────────────────────────── */

/** Hairline section separator that fades at the edges. Softer than a border. */
export function Divider() {
    return (
        <div
            aria-hidden="true"
            className="mx-auto h-px w-full max-w-7xl bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10"
        />
    );
}

/** Consistent vertical rhythm + optional tinted background. */
export function Section({
    id, children, tone = 'default', className = '',
}: {
    id?: string; children: ReactNode; className?: string;
    tone?: 'default' | 'muted' | 'dark';
}) {
    const tones = {
        default: 'bg-white dark:bg-slate-950',
        muted: 'bg-slate-50/80 dark:bg-white/[0.015]',
        dark: 'bg-slate-950',
    } as const;
    return (
        <section id={id} className={`relative py-20 sm:py-28 ${id ? 'scroll-mt-16' : ''} ${tones[tone]} ${className}`}>
            {children}
        </section>
    );
}

/* ── Motion ──────────────────────────────────────────────────────────────── */

/**
 * Fade-and-rise on scroll. Children are always in the DOM so crawlers and
 * no-JS users see everything (LANDING_PAGE_AUDIT.md T3).
 */
export function Reveal({
    children, delay = 0, className = '',
}: { children: ReactNode; delay?: number; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setShown(true);
            return;
        }
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) { setShown(true); io.disconnect(); }
            },
            { rootMargin: '0px 0px -80px 0px', threshold: 0.05 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: shown ? 1 : 0,
                transform: shown ? 'none' : 'translateY(20px)',
                transition: `opacity .6s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .6s cubic-bezier(.16,1,.3,1) ${delay}ms`,
                willChange: shown ? 'auto' : 'opacity, transform',
            }}
        >
            {children}
        </div>
    );
}

/* ── Typography ──────────────────────────────────────────────────────────── */

export function SectionHeading({
    kicker, title, sub, align = 'center', tone = 'light',
}: {
    kicker?: string; title: string; sub?: string;
    align?: 'center' | 'left'; tone?: 'light' | 'dark';
}) {
    const isDark = tone === 'dark';
    return (
        <div className={`max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
            {kicker && (
                <p className={`mb-4 text-[11px] font-bold uppercase tracking-[0.22em] ${isDark ? 'text-sky-400' : 'text-sky-600 dark:text-sky-400'}`}>
                    {kicker}
                </p>
            )}
            <h2
                className={`text-balance text-3xl font-bold tracking-[-0.02em] sm:text-[2.5rem] sm:leading-[1.12] ${
                    isDark ? 'text-white' : 'text-slate-900 dark:text-white'
                }`}
            >
                {title}
            </h2>
            {sub && (
                <p className={`mt-5 text-pretty text-base leading-relaxed sm:text-[17px] ${isDark ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                    {sub}
                </p>
            )}
        </div>
    );
}
