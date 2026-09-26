/** Number, time and label formatting for the analytics panel (all times IST). */
import type { Summary } from './api';

const IST = 'Asia/Kolkata';
const intFmt = new Intl.NumberFormat('en-IN');
const compactFmt = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });

export const num = (n: number | null | undefined) => intFmt.format(Math.round(n ?? 0));
export const compact = (n: number | null | undefined) => {
    const v = n ?? 0;
    return Math.abs(v) < 10000 ? intFmt.format(Math.round(v)) : compactFmt.format(v);
};
export const pct = (n: number | null | undefined, digits = 0) =>
    n === null || n === undefined || !isFinite(n) ? '—' : `${n.toFixed(digits)}%`;
export const ratio = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null);

/** 45s · 3m 12s · 1h 04m */
export function duration(ms: number | null | undefined): string {
    const s = Math.round((ms ?? 0) / 1000);
    if (s <= 0) return '0s';
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
    return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

/** Period-over-period change. null when there is no base to compare with. */
export function change(cur: number, prev: number): number | null {
    if (!isFinite(cur) || !isFinite(prev)) return null;
    if (prev === 0) return cur === 0 ? 0 : null;
    return ((cur - prev) / prev) * 100;
}

export interface Derived {
    engagementRate: number | null;
    bounceRate: number | null;
    avgEngagedMs: number;
    viewsPerVisit: number;
    completionRate: number | null;
}

export function derive(s: Summary): Derived {
    const engagementRate = ratio(s.engaged_sessions, s.sessions);
    return {
        engagementRate,
        bounceRate: engagementRate === null ? null : 100 - engagementRate,
        avgEngagedMs: s.sessions ? s.engaged_ms_total / s.sessions : 0,
        viewsPerVisit: s.sessions ? s.session_pageviews / s.sessions : 0,
        completionRate: ratio(s.submissions, s.test_starts),
    };
}

// ── time ─────────────────────────────────────────────────────────────────────
export function relative(iso: string | null | undefined): string {
    if (!iso) return '—';
    const t = new Date(iso).getTime();
    if (isNaN(t)) return '—';
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 45) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    if (s < 7 * 86400) return `${Math.round(s / 86400)} d ago`;
    return istDate(iso);
}

export const istDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric' });
export const istDateTime = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { timeZone: IST, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
export const istTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { timeZone: IST, hour: 'numeric', minute: '2-digit', hour12: true });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Labels for series buckets, which arrive as IST wall-clock "YYYY-MM-DDTHH:MM". */
export function bucketLabel(t: string, bucket: string, long = false): string {
    const [d, time] = t.split('T');
    const [y, m, day] = d.split('-').map(Number);
    if (bucket === 'hour') {
        const h = Number(time.slice(0, 2));
        const hh = `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'am' : 'pm'}`;
        return long ? `${day} ${MONTHS[m - 1]}, ${hh}` : hh;
    }
    if (bucket === 'month') return long ? `${MONTHS[m - 1]} ${y}` : MONTHS[m - 1];
    if (bucket === 'week') return long ? `Week of ${day} ${MONTHS[m - 1]}` : `${day} ${MONTHS[m - 1]}`;
    return long ? `${day} ${MONTHS[m - 1]} ${y}` : `${day} ${MONTHS[m - 1]}`;
}

export const PERIOD_LABEL: Record<string, string> = {
    today: 'today',
    yesterday: 'yesterday',
    '7d': 'the last 7 days',
    '30d': 'the last 30 days',
    '90d': 'the last 90 days',
    '12m': 'the last 12 months',
};
export const PREVIOUS_LABEL: Record<string, string> = {
    today: 'yesterday at this time',
    yesterday: 'the day before',
    '7d': 'the previous 7 days',
    '30d': 'the previous 30 days',
    '90d': 'the previous 90 days',
    '12m': 'the previous 12 months',
};

// ── labels ───────────────────────────────────────────────────────────────────
let regionNames: Intl.DisplayNames | null = null;
try {
    regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
} catch {
    regionNames = null;
}

export function countryName(code: string | null | undefined): string {
    if (!code || code === 'XX') return 'Unknown';
    if (code === 'T1') return 'Tor network';
    try {
        return regionNames?.of(code) || code;
    } catch {
        return code;
    }
}

let languageNames: Intl.DisplayNames | null = null;
try {
    languageNames = new Intl.DisplayNames(['en'], { type: 'language' });
} catch {
    languageNames = null;
}

export function languageName(tag: string): string {
    try {
        return languageNames?.of(tag) || tag;
    } catch {
        return tag;
    }
}

export function siteLabel(host: string | null | undefined): string {
    if (!host) return '';
    if (host === 'testoza.com') return 'testoza.com';
    return host.replace('.testoza.com', '');
}

export function place(r: { city?: string | null; region?: string | null; country_code?: string | null }): string {
    // City-states (Dhaka, Delhi, Dubai) report the same city and region.
    const parts = [r.city, r.region !== r.city ? r.region : null].filter(Boolean);
    const country = countryName(r.country_code);
    if (!parts.length) return country;
    return r.country_code === 'IN' ? parts.join(', ') : `${parts.join(', ')}, ${country}`;
}

export function initials(name: string | null | undefined): string {
    const words = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
}

export const cap = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
