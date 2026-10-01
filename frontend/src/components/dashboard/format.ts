/* Wording and formatting shared by the dashboard cards. */

export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

export const pctText = (p: number | null | undefined) => (p === null || p === undefined ? '—' : `${Math.round(p)}%`);

export function timeAgo(date: Date, now: Date = new Date()): string {
    const mins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function timeOfDay(date: Date): string {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "Today 10:00 am", "Tomorrow 9:30 am", "Sat 4 Oct, 10:00 am". */
export function dayAndTime(date: Date, now: Date = new Date()): string {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((date.getTime() - start.getTime()) / 86400000);
    if (diffDays === 0) return `Today ${timeOfDay(date)}`;
    if (diffDays === 1) return `Tomorrow ${timeOfDay(date)}`;
    if (diffDays === -1) return `Yesterday ${timeOfDay(date)}`;
    return `${date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}, ${timeOfDay(date)}`;
}

/** "in 42 min", "in 3 hr", "in 2 days". */
export function untilText(date: Date, now: Date = new Date()): string {
    const mins = Math.ceil((date.getTime() - now.getTime()) / 60000);
    if (mins <= 1) return 'in a minute';
    if (mins < 60) return `in ${mins} min`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `in ${hours} hr`;
    return `in ${plural(Math.round(hours / 24), 'day')}`;
}

export function greeting(now: Date = new Date()): string {
    const h = now.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

export async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Older browsers / insecure context: fall back to a hidden textarea.
        try {
            const el = document.createElement('textarea');
            el.value = text;
            el.setAttribute('readonly', '');
            el.style.position = 'fixed';
            el.style.opacity = '0';
            document.body.appendChild(el);
            el.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(el);
            return ok;
        } catch {
            return false;
        }
    }
}
