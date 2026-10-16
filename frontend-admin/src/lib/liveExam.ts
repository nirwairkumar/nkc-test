/**
 * Live-exam helpers the results sheet needs, copied from the creator app
 * (frontend/src/lib/conductExam.ts and teacherDashboardApi.ts). Keep them in step.
 *
 * Links always point at the creator app: candidates never open the admin host.
 */

export const APP_ORIGIN = 'https://app.testoza.com';

/** "Writing now" = pinged within this window. Same value as the creator dashboard. */
export const WRITING_WINDOW_MS = 3 * 60 * 1000;

export function isLiveTest(t: any, now: Date): boolean {
    if (!t?.settings?.conduct_exam?.enabled) return false;
    const s = t.settings.schedule;
    if (s?.enabled && s.end_time && new Date(s.end_time) < now) return false;
    if (s?.enabled && s.start_time && new Date(s.start_time) > now) return false;
    return true;
}

/** The link candidates open for this test. */
export function getExamUrl(test: any): string {
    if (test?.settings?.conduct_exam?.enabled) {
        const conductSlug = test.settings.conduct_exam.conduct_slug || test.slug;
        if (conductSlug) return `${APP_ORIGIN}/test/${conductSlug}`;
    }
    if (test?.visibility !== 'public' && test?.slug) return `${APP_ORIGIN}/test/${test.slug}`;
    return `${APP_ORIGIN}/test-intro/${test.id}`;
}

/** wa.me link with a ready-to-send exam invitation. */
export function examWhatsAppUrl(test: any, opts: { startsAt?: Date | null } = {}): string {
    const questions = test.total_questions || test.questions?.length || 0;
    const lines = [`📝 *${test.title}*`];
    const facts = [questions ? `${questions} questions` : '', test.duration ? `${test.duration} min` : ''].filter(Boolean);
    if (facts.length) lines.push(facts.join(' · '));
    if (opts.startsAt) {
        lines.push(`Starts ${opts.startsAt.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`);
    }
    lines.push('', `Start here: ${getExamUrl(test)}`);
    const code = test?.settings?.conduct_exam?.enabled ? test.settings.conduct_exam.join_code : null;
    if (code) lines.push(`Or open testoza.com/join and enter code *${code.slice(0, 3)} ${code.slice(3)}*`);
    lines.push('', 'No app and no account needed — just type your name.');
    return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
}
