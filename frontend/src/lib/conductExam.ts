/**
 * Starting and stopping a "Conduct exam" (private live link), shared by /dashboard and /my-tests.
 *
 * The backend finds a test by its `slug` column, so starting an exam must also set
 * `slug` to the conduct slug. The old dashboard only wrote `settings.conduct_exam`,
 * which produced a link that opened "test not found". Keep both pages on these helpers.
 */
import { shareLink } from '@/utils/canonicalUrl';

/** Exam settings a stopped exam goes back to (same defaults the settings panel starts from). */
export const DEFAULT_ENVIRONMENT_SETTINGS = {
    attempt_limit: undefined,
    strict_timer: false,
    allow_flexible_timer: true,
    tab_switch_mode: 'off' as const,
    disable_copy_paste: false,
    disable_actions: false,
    force_fullscreen: false,
    block_back_button: false,
    disable_exit_button: false,
    shuffle_questions: false,
    show_results_immediate: true,
    schedule: { enabled: false },
    // Candidate inputs start on (just Name) so every result can be matched to a person.
    start_form: { enabled: true, fields: [{ label: 'Name', required: true }] },
};

/** Update payload that makes `test` a live exam reachable at /test/<conductSlug>. */
export function buildStartConductPayload(test: any, conductSlug: string) {
    // Keep the public slug so it can be restored when the exam is removed.
    const originalSlug = test.visibility === 'public' && test.slug
        ? test.slug
        : (test.settings?.conduct_exam?.original_slug || null);

    const settings: any = {
        ...(test.settings || {}),
        conduct_exam: {
            enabled: true,
            conduct_slug: conductSlug,
            original_slug: originalSlug,
            started_at: new Date().toISOString(),
        },
    };

    // A test that never set candidate inputs gets the default (on, Name).
    if (!settings.start_form) {
        settings.start_form = DEFAULT_ENVIRONMENT_SETTINGS.start_form;
    }

    // An expired schedule would close the new link straight away.
    if (settings.schedule?.end_time && new Date(settings.schedule.end_time) < new Date()) {
        delete settings.schedule;
    }

    return {
        visibility: 'unlisted' as const,
        is_public: false,
        slug: conductSlug,
        settings,
    };
}

/** Update payload that stops a live exam; its results stay under "Ended exams". */
export function buildStopConductPayload(test: any) {
    const s = test.settings || {};
    const startForm = s.start_form?.enabled ? (s.start_form.fields || []) : [];
    return {
        visibility: 'private' as const,
        is_public: false,
        class_id: null,
        slug: `unlisted-${test.custom_id || test.id}`,
        settings: {
            ...DEFAULT_ENVIRONMENT_SETTINGS,
            conduct_exam: {
                ...(s.conduct_exam || {}),
                enabled: false,
                ended_at: new Date().toISOString(),
                // The settings above go back to defaults, so keep what "See your result"
                // (testoza.com/join/result) needs: were results shown, and what did the start form ask.
                results_visible: s.show_results_immediate !== false,
                start_fields: startForm.map((f: { label?: string }) => String(f?.label || '').trim()).filter(Boolean),
            },
        },
    };
}

/** True when anti-cheating has at least one switch turned on. */
export function isProctoringEnabled(test: any): boolean {
    const s = test?.settings;
    if (!s) return false;
    return !!(
        s.force_fullscreen ||
        (s.tab_switch_mode && s.tab_switch_mode !== 'off') ||
        s.disable_copy_paste ||
        s.disable_actions ||
        s.block_back_button ||
        s.disable_exit_button
    );
}

/**
 * The link candidates open for this test.
 *
 * `shareLink` pins it to one host. Built from `window.location.origin` it used to come
 * out as testoza.com/test/x or app.testoza.com/test/x depending on where the teacher
 * happened to be standing, so the same paper had two links.
 */
export function getExamUrl(test: any, origin?: string): string {
    const at = (path: string) => (origin ? `${origin}${path}` : shareLink(path));
    if (test?.settings?.conduct_exam?.enabled) {
        const conductSlug = test.settings.conduct_exam.conduct_slug || test.slug;
        if (conductSlug) return at(`/test/${conductSlug}`);
    }
    if (test?.visibility !== 'public' && test?.slug) return at(`/test/${test.slug}`);
    return at(`/test-intro/${test.id}`);
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
    // The question every candidate asks first, answered before they ask it.
    lines.push('', 'No app and no account needed — just type your name.');
    return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
}
