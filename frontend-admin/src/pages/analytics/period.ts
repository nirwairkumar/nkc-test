/**
 * Report periods: a preset, or any IST calendar day or day range the admin picks,
 * written "YYYY-MM-DD..YYYY-MM-DD" (start = end for one day). The backend resolves
 * both (resolve_period in app/routers/analytics/insights.py) and compares a custom
 * range with the same number of days before it.
 */
import { MONTHS } from './format';

export type Preset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | '12m';
export type Period = Preset | `${string}..${string}`;

export const PRESETS: readonly Preset[] = ['today', 'yesterday', '7d', '30d', '90d', '12m'];

/** How far back the calendar goes. Keeps every range inside the backend's 800-day cap. */
export const MAX_DAYS_BACK = 730;

const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 330 * 60_000; // India has no DST
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PRESET_LABEL: Record<Preset, string> = {
    today: 'today',
    yesterday: 'yesterday',
    '7d': 'the last 7 days',
    '30d': 'the last 30 days',
    '90d': 'the last 90 days',
    '12m': 'the last 12 months',
};
const PRESET_PREVIOUS: Record<Preset, string> = {
    today: 'yesterday at this time',
    yesterday: 'the day before',
    '7d': 'the previous 7 days',
    '30d': 'the previous 30 days',
    '90d': 'the previous 90 days',
    '12m': 'the previous 12 months',
};

// ── IST calendar days as "YYYY-MM-DD" (arithmetic in UTC, so no local-zone drift) ──
export const istToday = () => new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
const utc = (day: string) => Date.parse(`${day}T00:00:00Z`);
export const addDays = (day: string, n: number) => new Date(utc(day) + n * DAY_MS).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((utc(b) - utc(a)) / DAY_MS);
/** 0 = Sunday. */
export const weekday = (day: string) => new Date(utc(day)).getUTCDay();

function isDay(s: string | undefined): s is string {
    if (!s || !ISO_DAY.test(s)) return false;
    const t = utc(s);
    return !isNaN(t) && new Date(t).toISOString().slice(0, 10) === s; // rejects 2026-02-30
}

export const isPreset = (v: string): v is Preset => (PRESETS as readonly string[]).includes(v);

export function customRange(p: string): { start: string; end: string } | null {
    const [start, end, extra] = p.split('..');
    if (extra !== undefined || !isDay(start) || !isDay(end) || start > end) return null;
    return { start, end };
}

/** For usePersisted: a preset, or a well-formed custom range. */
export const isPeriod = (v: string): v is Period => isPreset(v) || customRange(v) !== null;

/** A day or range as a Period — the matching preset when one exists, so its segment lights up. */
export function rangePeriod(start: string, end: string): Period {
    if (start > end) [start, end] = [end, start];
    const today = istToday();
    if (end === today) {
        const span = daysBetween(start, end) + 1;
        if (span === 1) return 'today';
        if (span === 7) return '7d';
        if (span === 30) return '30d';
        if (span === 90) return '90d';
    }
    if (start === end && end === addDays(today, -1)) return 'yesterday';
    return `${start}..${end}`;
}

/** Query params for the analytics and exam-ops endpoints. */
export function periodParams(p: Period): { period: string; start?: string; end?: string } {
    const r = customRange(p);
    return r ? { period: 'custom', start: r.start, end: r.end } : { period: p };
}

// ── labels ───────────────────────────────────────────────────────────────────
/** "21 Oct" · "Tue 21 Oct" · "1–15 Oct" · "28 Sep – 5 Oct", with the year only when it isn't this one. */
export function rangeLabel(start: string, end: string, withWeekday = false): string {
    const [y1, m1, d1] = start.split('-').map(Number);
    const [y2, m2, d2] = end.split('-').map(Number);
    const thisYear = Number(istToday().slice(0, 4));
    if (start === end) {
        return `${withWeekday ? `${WEEKDAYS[weekday(start)]} ` : ''}${d1} ${MONTHS[m1 - 1]}${y1 !== thisYear ? ` ${y1}` : ''}`;
    }
    if (y1 !== y2) return `${d1} ${MONTHS[m1 - 1]} ${y1} – ${d2} ${MONTHS[m2 - 1]} ${y2}`;
    const year = y2 !== thisYear ? ` ${y2}` : '';
    return m1 === m2 ? `${d1}–${d2} ${MONTHS[m2 - 1]}${year}` : `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]}${year}`;
}

/** "the last 7 days", "Tue 21 Oct", "1–15 Oct". */
export function periodLabel(p: Period): string {
    if (isPreset(p)) return PRESET_LABEL[p];
    const r = customRange(p);
    return r ? rangeLabel(r.start, r.end, true) : p;
}

/** What the change percentages compare against. */
export function previousLabel(p: Period): string {
    if (isPreset(p)) return PRESET_PREVIOUS[p];
    const r = customRange(p);
    const days = r ? daysBetween(r.start, r.end) + 1 : 1;
    return days === 1 ? 'the day before' : `the previous ${days} days`;
}

/** For the end of a sentence: "today", "in the last 7 days", "on Tue 21 Oct", "during 1–15 Oct". */
export function inPeriod(p: Period): string {
    if (p === 'today' || p === 'yesterday') return p;
    if (isPreset(p)) return `in ${PRESET_LABEL[p]}`;
    const r = customRange(p);
    return r ? `${r.start === r.end ? 'on' : 'during'} ${rangeLabel(r.start, r.end, true)}` : p;
}
