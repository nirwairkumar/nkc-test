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

export const NEET_META: GuideMeta = {
    slug: 'neet-online-test-software',
    path: '/neet-online-test-software',
    title: 'NEET online test software: build, run and analyse full NEET mocks online',
    seoTitle: 'NEET Online Test Software for Coaching Institutes',
    description:
        'NEET online test software for institutes and aspirants: 180-question mocks, +4/−1 marking, an NTA-style screen, AI from NCERT pages and per-question analysis.',
    dek:
        'About 20 lakh students sit NEET, and between 500 and 600 marks every single mark is worth roughly 800 ranks. The exam is also heading for computers. Here is what NEET online test software has to do, how institutes build and run full mocks without OMR sheets, and how an aspirant can practise the same way alone.',
    author: 'TestoZa Team',
    datePublished: '2026-10-01T12:00:00+05:30',
    dateModified: '2026-10-01T12:00:00+05:30',
    readMinutes: 20,
    cover: {
        src: '/guides/neet-online-test-software/cover.png',
        alt: 'TestoZa’s NTA-style exam screen on a phone, showing a NEET Botany diagram question with +4 | −1 marking',
        width: 1200,
        height: 630,
    },
    keywords: [
        'NEET online test software',
        'NEET mock test software',
        'NEET test series software',
        'online test platform for NEET coaching',
        'create NEET mock test online',
        'NEET CBT mock test',
        'NEET 2027 computer based test',
        'NEET negative marking',
        'NEET questions from NCERT with AI',
        'NTA style mock test',
        'TestoZa',
    ],
    cta: { label: 'Build a NEET mock, free', href: '/generate-with-ai' },
};

export const MOODLE_META: GuideMeta = {
    slug: 'moodle-alternative',
    path: '/moodle-alternative',
    title: 'Moodle alternative for online tests and exams: no server, no student logins',
    seoTitle: 'Moodle Alternative for Online Tests & Exams (2026)',
    description:
        'A Moodle alternative for online tests and exams: no server, plugins or student logins. Costs, an honest comparison, and how to switch or run both.',
    dek:
        'Moodle is free, mature and runs on more than 147,000 registered sites. It also needs a server, an administrator, an account for every student and a plugin for most new things. If what you mostly do in Moodle is set tests, here is what to keep, what to move, what it costs, and what switching to TestoZa actually involves.',
    author: 'TestoZa Team',
    datePublished: '2026-10-02T12:00:00+05:30',
    dateModified: '2026-10-02T12:00:00+05:30',
    readMinutes: 20,
    cover: {
        src: '/guides/moodle-alternative/cover.png',
        alt: 'A candidate joining a TestoZa exam on a phone with a six-digit code and a roll number, no account needed',
        width: 1200,
        height: 630,
    },
    keywords: [
        'Moodle alternative',
        'Moodle alternatives',
        'Moodle quiz alternative',
        'Moodle alternative for online exams',
        'free Moodle alternative',
        'MoodleCloud alternative',
        'Moodle alternative for schools',
        'Moodle alternative for coaching institutes',
        'Moodle alternative India',
        'Moodle negative marking',
        'online exam without student login',
        'TestoZa',
    ],
    cta: { label: 'Run your first test, free', href: '/generate-with-ai' },
};

/** Newest first. */
export const GUIDE_METAS: GuideMeta[] = [MOODLE_META, NEET_META, AI_TEST_GENERATOR_META, JEE_META, CBT_META, BEST_PLATFORM_META];

/** Canonical URL of a guide. */
export const guideUrl = (path: string) => `${SITE_URL}${path}`;

/** Absolute URL for an asset path such as the cover image. */
export const guideAssetUrl = (path: string) => (path.startsWith('http') ? path : `${SITE_URL}${path}`);
