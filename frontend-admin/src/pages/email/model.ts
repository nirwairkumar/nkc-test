/**
 * Words and colours for admin → Email. Stage and group rules live in SQL
 * (public.email_people); these are only how they read on screen.
 */
import type { AudienceFilter, Stage, Status, TemplateSummary, Who } from './api';

export const STAGES: { key: Stage; label: string; short: string; goal: string; color: string }[] = [
    { key: 'new', label: 'Signed up, no test yet', short: 'Signed up', goal: 'Make their first test', color: '#94a3b8' },
    { key: 'drafted', label: 'Made a test, nobody took it', short: 'Made a test', goal: 'Get it to students', color: '#7dd3fc' },
    { key: 'tried', label: 'Tried it alone, or 1–4 answers', short: 'Tried it', goal: 'Run it with a whole class', color: '#38bdf8' },
    { key: 'active', label: 'Running exams (5+ answers)', short: 'Running exams', goal: 'Keep them happy, ask for word of mouth', color: '#0284c7' },
    { key: 'quiet', label: 'Ran exams, then quiet for 21+ days', short: 'Went quiet', goal: 'Win them back, learn why', color: '#f59e0b' },
];

export const STAGE: Record<Stage, (typeof STAGES)[number]> = Object.fromEntries(STAGES.map((s) => [s.key, s])) as any;

export const WHOS: { key: Who; label: string; plural: string; hint: string }[] = [
    { key: 'educator', label: 'Educator', plural: 'Educators', hint: 'Chose Teacher or Other at sign-up, or made a test' },
    { key: 'institution', label: 'Institution', plural: 'Institutions', hint: 'Chose Institution at sign-up' },
    { key: 'student', label: 'Student', plural: 'Students', hint: 'Chose Student at sign-up' },
    { key: 'corporate', label: 'Corporate', plural: 'Corporate', hint: 'Signed up with a company email. A school with its own domain can land here, so check the list' },
    { key: 'no_role', label: 'No role', plural: 'No role', hint: 'Skipped choosing a role and hasn’t made a test' },
];

export const WHO: Record<Who, (typeof WHOS)[number]> = Object.fromEntries(WHOS.map((w) => [w.key, w])) as any;

export const WHO_TONE: Record<Who, 'sky' | 'violet' | 'emerald' | 'amber' | 'slate'> = {
    educator: 'sky', institution: 'violet', student: 'emerald', corporate: 'amber', no_role: 'slate',
};

/** Why someone won't get the email, in the order the panel lists them. */
export const STATUS: Record<Status, { label: string; long: string; tone: 'emerald' | 'slate' | 'amber' | 'rose' | 'sky' }> = {
    ready: { label: 'Will get it', long: 'Will get the email', tone: 'emerald' },
    got_it: { label: 'Already got it', long: 'Already got this email', tone: 'slate' },
    earlier_step: { label: 'Earlier email first', long: 'Gets an earlier email of this series first', tone: 'slate' },
    too_soon: { label: 'Too soon', long: 'Too soon after joining, visiting, or the last email of this series', tone: 'sky' },
    cooldown: { label: 'Emailed this week', long: 'Got an email in the last 7 days', tone: 'amber' },
    monthly_cap: { label: '3 this month', long: 'Already got 3 emails in 30 days', tone: 'amber' },
    unsubscribed: { label: 'Unsubscribed', long: 'Unsubscribed or stopped by us', tone: 'rose' },
    bad_email: { label: 'Bad address', long: 'The address looks fake or mistyped', tone: 'rose' },
};

export const SKIP_ORDER: Exclude<Status, 'ready'>[] = [
    'got_it', 'earlier_step', 'too_soon', 'cooldown', 'monthly_cap', 'unsubscribed', 'bad_email',
];

export function audienceLabel(f: AudienceFilter, t?: Pick<TemplateSummary, 'stages' | 'audiences'> | null): string {
    const stages = f.stages?.length ? f.stages : t?.stages ?? [];
    const whos = f.whos?.length ? f.whos : t?.audiences ?? [];
    const who = whos.length ? whos.map((w) => WHO[w]?.plural ?? w).join(' & ') : 'Everyone';
    const stage = stages.length ? stages.map((s) => STAGE[s]?.short ?? s).join(', ') : 'any stage';
    const extra = [
        f.joined_within ? `joined in the last ${f.joined_within} days` : '',
        f.quiet_for ? `quiet for ${f.quiet_for}+ days` : '',
    ].filter(Boolean).join(', ');
    return `${who} · ${stage}${extra ? ` · ${extra}` : ''}`;
}

/** A gentle nudge when it's a poor moment to send (India time). Never blocks. */
export function sendTimeHint(now = new Date()): string | null {
    const parts = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata', weekday: 'short', hour: 'numeric', hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 12);
    const day = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const time = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });
    if (hour < 8 || hour >= 21) return `It’s ${time} in India. Emails sent now sit under newer ones by morning. Best: Tuesday to Thursday, 10–11 am.`;
    if (day === 'Sun') return 'It’s Sunday in India. Teachers read work email best Tuesday to Thursday, 10–11 am.';
    return null;
}

const VAR_WORD: Record<string, string> = {
    first_name: 'Name', name: 'Name', email: 'Email', test_title: 'Test name', top_test_title: 'Test name',
    top_test_results: 'N', results: 'N', tests_created: 'N',
};

/** "{test_title|Your test} is ready" → "‹Test name› is ready", for lists. */
export function readable(text: string): string {
    return text.replace(/\{([a-z_]+)(?:\|[^{}]*)?\}/g, (m, k: string) => (VAR_WORD[k] ? `‹${VAR_WORD[k]}›` : m));
}

/** "1 institution", "3 institutions". */
export function whoCount(who: Who, n: number): string {
    const w = WHO[who];
    if (!w) return `${n} ${who}`;
    return `${n} ${(n === 1 ? w.label : w.plural).toLowerCase()}`;
}

export const BODY_HELP: [string, string][] = [
    ['Blank line', 'new paragraph'],
    ['- item', 'bullet'],
    ['**words**', 'bold'],
    ['[words](https://…)', 'link'],
    ['[[Button]](https://…)', 'button, on its own line'],
    ['{first_name|there}', 'their detail, or the word after |'],
];
