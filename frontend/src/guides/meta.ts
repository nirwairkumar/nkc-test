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

/** Newest first. */
export const GUIDE_METAS: GuideMeta[] = [BEST_PLATFORM_META];

/** Canonical URL of a guide. */
export const guideUrl = (path: string) => `${SITE_URL}${path}`;

/** Absolute URL for an asset path such as the cover image. */
export const guideAssetUrl = (path: string) => (path.startsWith('http') ? path : `${SITE_URL}${path}`);
