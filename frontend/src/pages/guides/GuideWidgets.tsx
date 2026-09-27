/**
 * Interactive widgets for guides (see GuideWidget in src/guides/types.ts).
 * Both are illustrations with example data, labelled as such, and both start
 * only when scrolled into view. With reduced motion they show their final state.
 */
import { useEffect, useRef, useState } from 'react';
import type { GuideWidget as GuideWidgetName } from '@/guides/types';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** True once the element has been on screen (immediately with reduced motion). */
function useSeen<T extends HTMLElement>(threshold = 0.35) {
    const ref = useRef<T>(null);
    const [seen, setSeen] = useState(false);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
            setSeen(true);
            return;
        }
        const io = new IntersectionObserver(
            ([e]) => {
                setVisible(e.isIntersecting);
                if (e.isIntersecting) setSeen(true);
            },
            { threshold },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [threshold]);
    return { ref, seen, visible };
}

/** Counts from 0 to `to` once `start` is true. */
function useCount(to: number, start: boolean, ms = 1400) {
    const [n, setN] = useState(0);
    useEffect(() => {
        if (!start) return;
        if (prefersReducedMotion()) {
            setN(to);
            return;
        }
        let raf = 0;
        const t0 = performance.now();
        const step = (t: number) => {
            const p = Math.min(1, (t - t0) / ms);
            setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [to, start, ms]);
    return n;
}

/* ── Live exam ─────────────────────────────────────────────────────────── */

const BANNERS = [
    { icon: '✓', tone: '#22c55e', title: 'Aarav submitted', text: '142 / 180 · 2 h 41 min' },
    { icon: '!', tone: '#f59e0b', title: 'Roll 23 left full screen', text: 'Warning 1 of 3 logged' },
    { icon: '▶', tone: '#0ea5e9', title: 'Batch B has started', text: '31 students writing' },
    { icon: '✓', tone: '#22c55e', title: 'Meera submitted', text: '128 / 180 · 2 h 55 min' },
];

function LiveExam() {
    const { ref, seen, visible } = useSeen<HTMLElement>();
    const joined = useCount(58, seen);
    const submitted = useCount(23, seen, 1800);
    const warnings = useCount(2, seen, 900);
    const [tick, setTick] = useState(0);
    const [clock, setClock] = useState(72 * 60 + 40);

    // New banner every 2.4 s and a running exam clock, only while on screen.
    useEffect(() => {
        if (!visible || prefersReducedMotion()) return;
        const b = window.setInterval(() => setTick((t) => t + 1), 2400);
        const c = window.setInterval(() => setClock((s) => Math.max(0, s - 1)), 1000);
        return () => {
            window.clearInterval(b);
            window.clearInterval(c);
        };
    }, [visible]);

    const h = Math.floor(clock / 3600);
    const m = Math.floor((clock % 3600) / 60);
    const s = clock % 60;

    return (
        <figure className="gd-widget" ref={ref}>
            <div className="gd-live" aria-hidden="true">
                <div className="gd-live-head">
                    <div className="gd-live-title">
                        <span className="gd-live-badge">
                            <i /> LIVE
                        </span>
                        Physics Mock 07 · Batch A &amp; B
                    </div>
                    <span className="gd-live-clock">
                        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')} left
                    </span>
                </div>
                <div className="gd-live-stats">
                    <div className="gd-live-stat">
                        <b>{joined}</b>
                        <span>Joined</span>
                    </div>
                    <div className="gd-live-stat">
                        <b>{submitted}</b>
                        <span>Submitted</span>
                    </div>
                    <div className="gd-live-stat">
                        <b>{warnings}</b>
                        <span>Warnings</span>
                    </div>
                </div>
                <div className="gd-live-bar">
                    <i style={{ width: `${(submitted / 58) * 100}%` }} />
                </div>
                <div className="gd-banners">
                    {/* Newest on top; older ones slide down, like iOS notifications. */}
                    {[0, 1, 2].map((slot) => {
                        const id = tick - slot;
                        const b = BANNERS[((id % BANNERS.length) + BANNERS.length) % BANNERS.length];
                        return (
                            <div
                                key={id}
                                className="gd-banner"
                                style={{
                                    zIndex: 3 - slot,
                                    opacity: 1 - slot * 0.25,
                                    transform: `translateY(${slot * 64}px) scale(${1 - slot * 0.02})`,
                                }}
                            >
                                <i style={{ background: b.tone }}>{b.icon}</i>
                                <div>
                                    <b>{b.title}</b>
                                    <span>{b.text}</span>
                                </div>
                                <small>{['now', '2m', '5m'][slot]}</small>
                            </div>
                        );
                    })}
                </div>
            </div>
            <figcaption>Illustration of the teacher’s view during a live exam (example data).</figcaption>
        </figure>
    );
}

/* ── Results rings ─────────────────────────────────────────────────────── */

const RINGS = [
    { label: 'Score', value: 78, r: 84, color: '#ff2d55' },
    { label: 'Accuracy', value: 84, r: 64, color: '#34c759' },
    { label: 'Time used', value: 92, r: 44, color: '#0ea5e9' },
];

const TOPICS = [
    { name: 'Newton’s laws', value: 92, tag: 'Strong', tone: '#34c759' },
    { name: 'Work and energy', value: 71, tag: 'Moderate', tone: '#f59e0b' },
    { name: 'Friction', value: 45, tag: 'Weak', tone: '#ff3b30' },
];

function ResultsRings() {
    const { ref, seen } = useSeen<HTMLElement>(0.4);
    return (
        <figure className="gd-widget" ref={ref}>
            <div className="gd-results" aria-hidden="true">
                <div className="gd-rings">
                    <svg viewBox="0 0 200 200">
                        {RINGS.map((ring) => {
                            const c = 2 * Math.PI * ring.r;
                            return (
                                <g key={ring.label}>
                                    <circle className="gd-ring-bg" cx="100" cy="100" r={ring.r} stroke={ring.color} />
                                    <circle
                                        className="gd-ring"
                                        cx="100"
                                        cy="100"
                                        r={ring.r}
                                        stroke={ring.color}
                                        strokeDasharray={c}
                                        strokeDashoffset={seen ? c * (1 - ring.value / 100) : c}
                                    />
                                </g>
                            );
                        })}
                    </svg>
                </div>
                <div>
                    <ul className="gd-ring-legend">
                        {RINGS.map((ring) => (
                            <li key={ring.label} style={{ ['--dot' as string]: ring.color }}>
                                {ring.label}
                                <b>{ring.value}%</b>
                            </li>
                        ))}
                    </ul>
                    <div className="gd-topics">
                        {TOPICS.map((t) => (
                            <div className="gd-topic" key={t.name} style={{ ['--tone' as string]: t.tone }}>
                                <span>{t.name}</span>
                                <em>{t.tag}</em>
                                <div className="gd-topic-bar">
                                    <i style={{ width: seen ? `${t.value}%` : '0%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <figcaption>Illustration of a student’s results: score, accuracy, time and topic strength (example data).</figcaption>
        </figure>
    );
}

/** The best-online-test-platform guide's widgets. */
export default function GuideWidget({ name }: { name: GuideWidgetName }) {
    if (name === 'live-exam') return <LiveExam />;
    if (name === 'results-rings') return <ResultsRings />;
    return null;
}
