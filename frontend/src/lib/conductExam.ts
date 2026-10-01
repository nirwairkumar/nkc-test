/**
 * Starting and stopping a "Conduct exam" (private live link), shared by /dashboard and /my-tests.
 *
 * The backend finds a test by its `slug` column, so starting an exam must also set
 * `slug` to the conduct slug. The old dashboard only wrote `settings.conduct_exam`,
 * which produced a link that opened "test not found". Keep both pages on these helpers.
 */

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
    start_form: { enabled: false, fields: [] },
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
    return {
        visibility: 'private' as const,
        is_public: false,
        class_id: null,
        slug: `unlisted-${test.custom_id || test.id}`,
        settings: {
            ...DEFAULT_ENVIRONMENT_SETTINGS,
            conduct_exam: { ...(test.settings?.conduct_exam || {}), enabled: false, ended_at: new Date().toISOString() },
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

/** The link students open for this test. */
export function getExamUrl(test: any, origin: string = window.location.origin): string {
    if (test?.settings?.conduct_exam?.enabled) {
        const conductSlug = test.settings.conduct_exam.conduct_slug || test.slug;
        if (conductSlug) return `${origin}/test/${conductSlug}`;
    }
    if (test?.visibility !== 'public' && test?.slug) return `${origin}/test/${test.slug}`;
    return `${origin}/test-intro/${test.id}`;
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
    return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
}
