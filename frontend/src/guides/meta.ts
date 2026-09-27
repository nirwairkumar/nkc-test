/**
 * Metadata of every guide: small enough for the router, footer and user guide
 * to import without pulling in any guide text. See types.ts.
 */
import type { GuideMeta } from './types';

export const SITE_URL = 'https://testoza.com';

export const BEST_PLATFORM_META: GuideMeta = {
    slug: 'best-online-test-platform',
    path: '/best-online-test-platform',
    title: 'The best online test platform for teachers, coaching institutes and students',
    seoTitle: 'Best Online Test Platform in 2026: Teachers, Coaching & Students',
    description:
        'What the best online test platform must do: timers, negative marking, fair exams on any phone, useful results, and practice tests made from a textbook photo.',
    dek:
        'Putting questions online is easy. Running a test that feels like the real exam, marks it the way your exam does and still works on a budget phone is the hard part. Here is what to look for, where the usual tools fall short, and how a student with only a textbook and a phone can build a proper mock.',
    author: 'TestoZa Team',
    datePublished: '2026-09-27T12:00:00+05:30',
    dateModified: '2026-09-27T12:00:00+05:30',
    readMinutes: 12,
    cover: {
        src: '/guides/best-online-test-platform/cover.png',
        alt: 'A phone turning a photographed textbook page into a timed practice test with a score ring',
        width: 1200,
        height: 630,
    },
    keywords: [
        'best online test platform',
        'online test conducting platform',
        'online exam platform for teachers',
        'online test platform for coaching institutes',
        'create test from photo',
        'practice test maker for students',
        'mock test maker with negative marking',
        'free online test maker',
        'Google Forms alternative for exams',
        'TestoZa',
    ],
};

export const CBT_META: GuideMeta = {
    slug: 'cbt-exam-software',
    path: '/cbt-exam-software',
    title: 'CBT exam software: run a real computer-based test from any browser',
    seoTitle: 'CBT Exam Software for Coaching Institutes & Schools (NTA-Style)',
    description:
        'CBT exam software for coaching institutes and schools: an NTA-style exam screen, exact marking schemes, calculator, keypad, exam rules and instant results.',
    dek:
        'NEET-UG is set to leave OMR sheets for computers in 2027, joining JEE Main, CUET, GATE and SSC. If your students will sit a computer-based test, they should practise on one. Here is what good CBT exam software does, how to run a CBT for a whole batch without a test centre, and where TestoZa fits.',
    author: 'TestoZa Team',
    datePublished: '2026-09-28T12:00:00+05:30',
    dateModified: '2026-09-28T12:00:00+05:30',
    readMinutes: 12,
    cover: {
        src: '/guides/cbt-exam-software/cover.png',
        alt: 'An NTA-style computer-based test on a tablet: question, numeric keypad, timer and colour-coded question palette',
        width: 1200,
        height: 630,
    },
    keywords: [
        'CBT exam software',
        'computer based test software',
        'online CBT exam platform',
        'CBT mock test software for coaching institutes',
        'NTA style CBT interface',
        'conduct CBT exam online',
        'CBT exam software for schools',
        'NEET CBT practice',
        'JEE Main CBT mock test',
        'TestoZa',
    ],
    cta: { label: 'Build a CBT paper, free', href: '/generate-with-ai' },
};

/** Newest first. */
export const GUIDE_METAS: GuideMeta[] = [CBT_META, BEST_PLATFORM_META];

/** Canonical URL of a guide. */
export const guideUrl = (path: string) => `${SITE_URL}${path}`;

/** Absolute URL for an asset path such as the cover image. */
export const guideAssetUrl = (path: string) => (path.startsWith('http') ? path : `${SITE_URL}${path}`);
