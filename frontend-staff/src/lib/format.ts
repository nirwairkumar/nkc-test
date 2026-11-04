const IST = 'Asia/Kolkata';
const intFmt = new Intl.NumberFormat('en-IN');

export const num = (n: number | null | undefined) => intFmt.format(Math.round(n ?? 0));

export function relative(iso: string | null | undefined): string {
    if (!iso) return '—';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '—';
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 45) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    if (s < 7 * 86400) return `${Math.round(s / 86400)} d ago`;
    return dateOnly(iso);
}

export const dateOnly = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: IST });

export const dateTime = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: IST });

/** % change from previous to current, or null when there is nothing to compare. */
export function change(cur: number, prev: number): number | null {
    if (!prev) return cur ? null : 0;
    return ((cur - prev) / prev) * 100;
}

export function initials(name: string | null | undefined): string {
    const parts = (name || '?').trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function greeting(): string {
    const hour = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: IST }));
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-05T14:00" (IST wall clock from the server) → a short axis label. */
export function bucketLabel(t: string, bucket: string): string {
    const [d, time] = t.split('T');
    const [, m, day] = d.split('-');
    if (bucket === 'hour') return (time ?? '').slice(0, 5);
    if (bucket === 'month') return MONTHS[Number(m) - 1] ?? t;
    return `${Number(day)} ${MONTHS[Number(m) - 1] ?? ''}`;
}
