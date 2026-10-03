/**
 * Roles exactly as people choose them at sign-up (frontend/src/pages/OnboardingPage.tsx:
 * Student · Teacher · Institution · Other). Admin access is NOT a role: it comes from
 * the `admins` table, so it is never offered here.
 */
import type { EducatorStage, FollowUp, PersonKind } from '../analytics/api';

export const ROLES = [
    { value: 'Teacher', label: 'Teacher', hint: 'Creates and runs tests' },
    { value: 'Institution', label: 'Institution', hint: 'School or coaching centre' },
    { value: 'Student', label: 'Student', hint: 'Takes tests' },
    { value: 'Other', label: 'Other', hint: 'The sign-up pop-up shows this as “Student / Independent Creator”' },
] as const;

export type Role = (typeof ROLES)[number]['value'];

/** Values that exist in old accounts but are no longer offered at sign-up. */
export const LEGACY_ROLES: Record<string, string> = {
    Guest: 'Guest — an old sign-up choice, no longer offered',
    Admin: 'Admin — a label only; admin access comes from the admins list',
};

export const KIND_LABEL: Record<PersonKind, string> = {
    educator: 'Educator',
    student: 'Student',
    unset: 'No role',
    candidate: 'Exam candidate',
    team: 'Team',
};

export const KIND_TONE: Record<PersonKind, 'sky' | 'emerald' | 'amber' | 'slate' | 'violet'> = {
    educator: 'sky',
    student: 'emerald',
    unset: 'amber',
    candidate: 'slate',
    team: 'violet',
};

export const STAGES: { key: EducatorStage; label: string; short: string }[] = [
    { key: 'signed_up', label: 'Signed up, no test yet', short: 'Signed up' },
    { key: 'created_test', label: 'Made a test, no results yet', short: 'Made a test' },
    { key: 'getting_results', label: 'Getting results', short: 'Getting results' },
    { key: 'went_quiet', label: 'Had results, quiet for 3+ weeks', short: 'Went quiet' },
];

export const FOLLOW_UP: Record<FollowUp, { title: string; why: string; subject: string; body: (first: string) => string }> = {
    no_results: {
        title: 'Made a test — nobody has taken it',
        why: 'One step from their first result. The best people to help.',
        subject: 'Your test on TestoZa',
        body: (first) =>
            `Hi ${first},\n\nI saw you made a test on TestoZa, but nobody has taken it yet.\n\n` +
            `Two quick ways to get answers in: share the test link in your WhatsApp group, or start it as a live exam ` +
            `and give candidates the join code — they just open testoza.com/join.\n\n` +
            `Would you like help setting up your first exam?\n\n— TestoZa team`,
    },
    no_test: {
        title: 'Signed up — no test yet',
        why: 'Interested, but stuck before the first test.',
        subject: 'Getting your first test ready on TestoZa',
        body: (first) =>
            `Hi ${first},\n\nThanks for signing up to TestoZa.\n\n` +
            `If you have a question paper (PDF, Word or even a photo), upload it and TestoZa turns it into an online ` +
            `test in about a minute.\n\nReply to this mail if you'd like help — happy to set it up with you.\n\n— TestoZa team`,
    },
    went_quiet: {
        title: 'Had results — quiet for 3+ weeks',
        why: 'Got value before; find out what stopped them.',
        subject: 'How are your exams going?',
        body: (first) =>
            `Hi ${first},\n\nIt's been a few weeks since your last exam on TestoZa.\n\n` +
            `Was anything missing or difficult? Your reply goes straight to me, and I read every one.\n\n— TestoZa team`,
    },
};

export function displayName(p: { full_name?: string | null; candidate_name?: string | null; email?: string | null; kind?: PersonKind }): string {
    if (p.kind === 'candidate') return p.candidate_name || 'Unnamed candidate';
    return p.full_name || p.email?.split('@')[0] || 'No name';
}

export function firstName(p: { full_name?: string | null; candidate_name?: string | null; email?: string | null; kind?: PersonKind }): string {
    const name = displayName(p);
    return name.split(/\s+/)[0] || 'there';
}

export function mailto(email: string, subject: string, body: string): string {
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
