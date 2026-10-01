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

export const JEE_META: GuideMeta = {
    slug: 'jee-mock-test-platform',
    path: '/jee-mock-test-platform',
    title: 'JEE mock test platform: build real JEE papers without learning LaTeX',
    seoTitle: 'JEE Mock Test Platform for Faculty, Institutes & Students',
    description:
        'Build JEE Main and Advanced mocks with AI and the Sy Pad keyboard: integrals and chemical equations without LaTeX, an NTA-style exam screen and exact marking.',
    dek:
        'A JEE paper is the hardest kind of paper to put online. Integrals, determinants, reaction arrows and List-I/List-II tables usually mean someone learns LaTeX, or the questions go up as blurry screenshots. Here is how faculty build a real JEE Main or Advanced mock with AI and an on-screen maths keyboard, how an institute runs it for every batch, and how a student uses the same platform alone.',
    author: 'TestoZa Team',
    datePublished: '2026-09-28T12:00:00+05:30',
    dateModified: '2026-09-28T12:00:00+05:30',
    readMinutes: 19,
    cover: {
        src: '/guides/jee-mock-test-platform/cover.png',
        alt: 'The Sy Pad keyboard building a definite integral and a chemical equation inside a JEE question in TestoZa',
        width: 1200,
        height: 630,
    },
    keywords: [
        'JEE mock test platform',
        'JEE Main mock test platform',
        'JEE Advanced mock test',
        'create JEE mock test online',
        'online test platform for JEE coaching',
        'type chemical equations in online test',
        'maths equation keyboard for teachers',
        'LaTeX without coding',
        'mhchem chemical equations',
        'NTA style mock test',
        'TestoZa',
    ],
    cta: { label: 'Build a JEE mock, free', href: '/generate-with-ai' },
};

export const AI_TEST_GENERATOR_META: GuideMeta = {
    slug: 'ai-test-generator',
    path: '/ai-test-generator',
    title: 'AI test generator: turn any PDF or photo into a test you can share',
    seoTitle: 'AI Test Generator: Tests from PDFs & Photos, Free',
    description:
        'Free AI test generator for teachers and students. Upload a PDF or photo and get MCQs, numericals, diagrams and an answer key in minutes, in English or Hindi.',
    dek:
        'Upload an old question paper and get it back as an online test. Upload a chapter and get new questions written from it. Here is how an AI test generator works, what it gets right, what you still need to check, and how teachers, coaching institutes and students use the one built into TestoZa.',
    author: 'TestoZa Team',
    datePublished: '2026-10-01T12:00:00+05:30',
    dateModified: '2026-10-01T12:00:00+05:30',
    readMinutes: 18,
    cover: {
        src: '/guides/ai-test-generator/cover.png',
        alt: "TestoZa's AI test generator on a phone, generating questions from a physics chapter PDF, beside the words: AI test generator, PDF or photo in, test out",
        width: 1200,
        height: 630,
    },
    keywords: [
        'AI test generator',
        'AI test generator from PDF',
        'AI question paper generator',
        'create test from PDF with AI',
        'AI test maker from images',
        'AI MCQ generator for teachers',
        'generate questions from textbook',
        'Hindi AI test generator',
        'bilingual question paper generator',
        'free AI test generator',
        'TestoZa',
    ],
    cta: { label: 'Make a test with AI, free', href: '/generate-with-ai' },
};

/** Newest first. */
export const GUIDE_METAS: GuideMeta[] = [AI_TEST_GENERATOR_META, JEE_META, CBT_META, BEST_PLATFORM_META];

/** Canonical URL of a guide. */
export const guideUrl = (path: string) => `${SITE_URL}${path}`;

/** Absolute URL for an asset path such as the cover image. */
export const guideAssetUrl = (path: string) => (path.startsWith('http') ? path : `${SITE_URL}${path}`);
