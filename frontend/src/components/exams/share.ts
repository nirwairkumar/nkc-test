import type { ExamSession, ResultRow, SessionResults } from '@/lib/examSessionsApi';
import { formatCode, joinUrl } from '@/lib/examSessionsApi';
import { dayTime } from './examFormat';

const CHECK_IN: Record<ExamSession['identity_mode'], string> = {
    name: 'Type your full name',
    roll: 'Type your roll number',
    roll_pin: 'Type your roll number and the PIN on your slip',
};

/** The message a teacher drops into the batch WhatsApp group. */
export function inviteText(session: ExamSession): string {
    const facts = [session.batch, dayTime(session.opens_at), session.test.duration ? `${session.test.duration} min` : null].filter(Boolean).join(' · ');
    return [
        `📝 *${session.test.title}*`,
        facts,
        '',
        `1. Open ${joinUrl().replace(/^https?:\/\//, '')}`,
        `2. Enter code *${formatCode(session.join_code)}*`,
        `3. ${CHECK_IN[session.identity_mode]}`,
        '',
        `Direct link: ${joinUrl(session.join_code)}`,
    ].join('\n');
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

/** Rank list for the batch group: medals for the top three, everyone else numbered. */
export function rankListText(results: SessionResults): string {
    const avg = results.summary.average !== null && results.max_marks ? ` · Average ${fmt(results.summary.average)}/${fmt(results.max_marks)}` : '';
    const lines = [`🏆 *${results.test.title}* — ${results.name}`, `${results.rows.length} candidates${avg}`, ''];
    const medals = ['🥇', '🥈', '🥉'];
    results.rows.forEach(r => {
        const who = r.roll_no ? `${r.name} (${r.roll_no})` : r.name;
        const label = r.rank <= 3 ? medals[r.rank - 1] : `${r.rank}.`;
        lines.push(`${label} ${who} — ${fmt(r.score)}/${fmt(r.max_marks)}${r.percent !== null ? ` (${Math.round(r.percent)}%)` : ''}`);
    });
    if (results.absent.length) lines.push('', `Absent: ${results.absent.map(a => a.name).join(', ')}`);
    return lines.join('\n');
}

/** A short note to one parent. */
export function parentText(results: SessionResults, row: ResultRow, institute?: string | null): string {
    const sections = row.sections.length ? `\n${row.sections.map(s => `• ${s.name}: ${fmt(s.score)}/${fmt(s.max)}`).join('\n')}` : '';
    return [
        `Dear Parent,`,
        `${row.name}${row.roll_no ? ` (Roll ${row.roll_no})` : ''} scored *${fmt(row.score)}/${fmt(row.max_marks)}*${row.percent !== null ? ` (${Math.round(row.percent)}%)` : ''} in ${results.test.title}.`,
        `Rank: ${row.rank} of ${results.rows.length}. Class average: ${results.summary.average !== null ? fmt(results.summary.average) : '—'}.${sections}`,
        ...(institute ? ['', `— ${institute}`] : []),
    ].join('\n');
}

export function absentParentText(results: SessionResults, name: string, institute?: string | null): string {
    return [
        `Dear Parent,`,
        `${name} was absent for ${results.test.title} (${dayTime(results.opens_at)}). Please contact us about a re-test.`,
        institute ? `— ${institute}` : '',
    ].filter(Boolean).join('\n');
}

export const whatsappLink = (text: string, phone?: string | null) => {
    const digits = (phone || '').replace(/[^0-9]/g, '');
    // Indian numbers are usually saved without the country code.
    const to = digits.length === 10 ? `91${digits}` : digits;
    return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
};
