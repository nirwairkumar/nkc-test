/**
 * Starting and stopping a "Conduct exam" (private live link), shared by /dashboard and /my-tests.
 *
 * The backend finds a test by its `slug` column, so starting an exam must also set
 * `slug` to the conduct slug. The old dashboard only wrote `settings.conduct_exam`,
 * which produced a link that opened "test not found". Keep both pages on these helpers.
 */
import { shareLink } from '@/utils/canonicalUrl';
import { inputFields, inputsOn } from '@/lib/candidateInputs';

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

    // A live exam starts with the timer enforced: a flexible timer lets candidates switch it
    // off and take unlimited time. The creator can turn it back on from the live card's settings.
    settings.allow_flexible_timer = false;

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

/**
 * The message an examiner sends to candidates. It should read like a notice from the
 * institute, not like a product: who, what, when, how long, one link, one instruction.
 * The old version ("📝 … Start here: … No app and no account needed") read as an advert,
 * and so did bold titles, emoji and an "Exam link:" label under a preview card that
 * already shows the title. Plain lines, the way a teacher would type it.
 */
export function examInviteText(test: any, opts: { startsAt?: Date | null } = {}): string {
    const s = test?.settings || {};
    const questions = test?.total_questions || test?.questions?.length || 0;
    const scheduled = s.schedule?.enabled && s.schedule.start_time ? new Date(s.schedule.start_time) : null;
    const startsAt = opts.startsAt || (scheduled && scheduled.getTime() > Date.now() ? scheduled : null);

    const lines = [test?.institution_name ? `${test.title} — ${test.institution_name}` : (test?.title || 'Exam')];
    const facts = [
        test?.duration ? `${test.duration} min` : '',
        questions ? `${questions} questions` : '',
    ].filter(Boolean).join(', ');
    const when = startsAt
        ? `Starts ${startsAt.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}.`
        : '';
    const detail = [facts ? `${facts}.` : '', when].filter(Boolean).join(' ');
    if (detail) lines.push(detail);

    lines.push('', getExamUrl(test));
    lines.push('', examInstruction(test));
    const code = s.conduct_exam?.enabled ? s.conduct_exam.join_code : null;
    if (code) lines.push(`Or open testoza.com/join and enter code ${code.slice(0, 3)} ${code.slice(3)}.`);
    return lines.join('\n');
}

/** "Open the link, enter your name and roll no, then tap Start." — from the real start form. */
function examInstruction(test: any): string {
    const s = test?.settings || {};
    if (s.login_required) return 'Open the link, sign in when asked, then tap Start.';
    if (!inputsOn(s)) return 'Open the link and tap Start.';
    const labels = inputFields(s).map(f => f.label.trim().toLowerCase());
    if (labels.length > 3) return 'Open the link, fill in your details, then tap Start.';
    const asked = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
    return `Open the link, enter your ${asked}, then tap Start.`;
}

/** wa.me link with a ready-to-send exam invitation. */
export function examWhatsAppUrl(test: any, opts: { startsAt?: Date | null } = {}): string {
    return `https://wa.me/?text=${encodeURIComponent(examInviteText(test, opts))}`;
}
