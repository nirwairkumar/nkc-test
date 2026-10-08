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

export const CONDUCT_META: GuideMeta = {
    slug: 'how-to-conduct-online-exam',
    path: '/how-to-conduct-online-exam',
    title: 'How to conduct an online exam, step by step',
    seoTitle: 'How to Conduct an Online Exam: Step-by-Step Guide',
    description:
        'How to conduct an online exam, step by step: plan it, build the paper, let candidates join with a code, stop casual cheating, run the day and publish results.',
    dek:
        'Most online exams that go wrong fail on logistics, not questions: candidates who can’t log in, a phone that dies at minute 20, answers shared on WhatsApp, marks that take a week. Here is the whole process as an exam controller would run it, from planning to the rank list, with checklists you can use and an exam you can run yourself on this page.',
    author: 'TestoZa Team',
    datePublished: '2026-10-02T12:00:00+05:30',
    dateModified: '2026-10-02T12:00:00+05:30',
    readMinutes: 21,
    cover: {
        src: '/guides/how-to-conduct-online-exam/cover.png',
        alt: 'A teacher’s phone running an online exam in TestoZa: a six-digit join code, candidates joining, and the rank list when it ends',
        width: 1200,
        height: 630,
    },
    keywords: [
        'how to conduct online exam',
        'how to conduct an online exam',
        'conduct online exam',
        'how to conduct online test',
        'how to conduct online exam for students',
        'online exam process step by step',
        'how to prevent cheating in online exams',
        'online exam checklist',
        'conduct online exam on mobile',
        'online exam with join code',
        'conduct online exam free',
        'TestoZa',
    ],
    // Every exam starts with a paper; /exams can't create a sitting without one.
    cta: { label: 'Make your exam paper, free', href: '/generate-with-ai' },
};

export const HINDI_META: GuideMeta = {
    slug: 'hindi-online-test-maker',
    path: '/hindi-online-test-maker',
    title: 'Hindi online test maker: make tests in Hindi without a Hindi keyboard',
    seoTitle: 'Hindi Online Test Maker: Make Tests in Hindi Free',
    description:
        'Make online tests in Hindi without a Hindi keyboard: type in English letters, import Hindi papers with AI, make bilingual tests and share them free.',
    dek:
        'Most Hindi papers still begin as a Kruti Dev file, a photocopied booklet or a photo on WhatsApp. Here is how to turn them into online tests that read correctly on every student’s phone: typing Hindi in English letters, bringing old papers in without retyping, Hindi and English bilingual papers, and the mistakes that turn भारत into “Hkkjr”.',
    author: 'TestoZa Team',
    datePublished: '2026-10-03T12:00:00+05:30',
    dateModified: '2026-10-03T12:00:00+05:30',
    readMinutes: 24,
    cover: {
        src: '/guides/hindi-online-test-maker/cover.png',
        alt: 'TestoZa’s question card on a phone in हिंदी mode with the question “निर्वात में प्रकाश की चाल कितनी होती है”, typed in English letters, and Hindi word suggestions above it, beside the words Hindi online test maker',
        width: 1200,
        height: 630,
    },
    keywords: [
        'Hindi online test maker',
        'online test maker in Hindi',
        'create online test in Hindi',
        'Hindi quiz maker',
        'Hindi MCQ test maker',
        'bilingual test maker Hindi English',
        'type Hindi in online test',
        'Hindi medium online test',
        'Kruti Dev to Unicode online test',
        'हिंदी में ऑनलाइन टेस्ट कैसे बनाएं',
        'ऑनलाइन टेस्ट मेकर',
        'TestoZa',
    ],
    // Hindi typing lives in the test builder; AI import is one tap from there.
    cta: { label: 'Make a Hindi test, free', href: '/create-test' },
};

export const PREVENT_CHEATING_META: GuideMeta = {
    slug: 'prevent-cheating-in-online-exams',
    path: '/prevent-cheating-in-online-exams',
    title: 'How to prevent cheating in online exams: what works, and what can’t',
    seoTitle: 'How to Prevent Cheating in Online Exams: What Works',
    description:
        'How to prevent cheating in online exams: 16 ways candidates cheat, what a browser can and can’t catch, and the paper, check-in and rules that stop it.',
    dek:
        'Cheating in online exams is common, and most of it isn’t clever: a quick search, a chatbot, a screenshot in the class group, a friend who sits the test. Here is how candidates actually cheat, what exam software can and can’t notice (this page will notice when you switch tabs), and how to write, set up and check an exam so that cheating rarely pays.',
    author: 'TestoZa Team',
    datePublished: '2026-10-04T12:00:00+05:30',
    dateModified: '2026-10-04T12:00:00+05:30',
    readMinutes: 26,
    cover: {
        src: '/guides/prevent-cheating-in-online-exams/cover.png',
        alt: 'A candidate’s phone on TestoZa’s exam screen showing “Warning 1/2: Tab Switching / Navigation is not allowed!”, beside the examiner’s exam room row with “1 warning”',
        width: 1200,
        height: 630,
    },
    keywords: [
        'prevent cheating in online exams',
        'how to prevent cheating in online exams',
        'how to stop cheating in online exams',
        'anti cheating online exam',
        'online exam cheating methods',
        'tab switch detection online exam',
        'can online exams detect cheating',
        'online exam proctoring without webcam',
        'prevent ChatGPT cheating in exams',
        'online exam security',
        'TestoZa',
    ],
    // Every secure exam starts with a paper; the rules are set on it.
    cta: { label: 'Make your exam paper, free', href: '/generate-with-ai' },
};

export const MATH_TEST_MAKER_META: GuideMeta = {
    slug: 'math-test-maker',
    path: '/math-test-maker',
    title: 'Math test maker with equations: make a maths test without learning LaTeX',
    seoTitle: 'Math Test Maker with Equations (No LaTeX Needed)',
    description:
        'Make a maths test with real equations: upload a PDF or photo and AI types the maths, or tap fractions, roots and integrals in. Sharp on any phone.',
    dek:
        'Typing one integral into an online form is hard enough; typing a whole paper takes a weekend. Here is how to get equations into a maths test the quick way (from the paper you already have, a photo, a few taps or a line of LaTeX), how to mark numerical answers fairly, and what students see on their phones. Every demo on this page works: type a formula, import a worksheet, sit a short test.',
    author: 'TestoZa Team',
    datePublished: '2026-10-04T12:00:00+05:30',
    dateModified: '2026-10-04T12:00:00+05:30',
    readMinutes: 20,
    cover: {
        src: '/guides/math-test-maker/cover.png',
        alt: 'A handwritten question, “Find d/dx (tan² x)”, beside a phone showing the same question typeset on TestoZa’s exam screen with four options',
        width: 1200,
        height: 630,
    },
    keywords: [
        'math test maker with equations',
        'math test maker',
        'maths test maker',
        'online math test maker',
        'math quiz maker with equations',
        'create math test online',
        'equation editor for online test',
        'how to add equations in online test',
        'Google Forms math equations',
        'maths question paper maker',
        'online maths test for students',
        'LaTeX quiz maker',
        'TestoZa',
    ],
    // A maths test usually starts from a paper the teacher already has.
    cta: { label: 'Make your maths test, free', href: '/generate-with-ai' },
};

export const CHEMISTRY_META: GuideMeta = {
    slug: 'chemistry-question-paper-maker',
    path: '/chemistry-question-paper-maker',
    title: 'Chemistry question paper maker: tests and quizzes with real formulas and reactions',
    seoTitle: 'Chemistry Question Paper Maker & Quiz Creator',
    description:
        'Make chemistry question papers, tests and quizzes with real formulas: upload a PDF or photo and AI types H₂SO₄ and ⇌, or tap them in. Sharp on any phone.',
    dek:
        'A chemistry paper is full of things online forms can’t hold: subscripts, charges, reaction arrows, structures. Here is how to put one online the quick way (from the PDF or photo you already have, a few taps, or a line of mhchem), how to set structure questions and pH answers fairly, and what students see on their phones. Every demo on this page works: type a reaction, import a worksheet, sit a short test.',
    author: 'TestoZa Team',
    datePublished: '2026-10-05T12:00:00+05:30',
    dateModified: '2026-10-05T12:00:00+05:30',
    readMinutes: 24,
    cover: {
        src: '/guides/chemistry-question-paper-maker/cover.png',
        alt: 'A phone photo of a handwritten question on the precipitation of CaF₂ (Ksp = 1.7 × 10⁻¹⁰), read by TestoZa and shown typeset on a student’s exam screen',
        width: 1200,
        height: 630,
    },
    keywords: [
        'chemistry question paper maker',
        'chemistry test maker',
        'chemistry quiz maker',
        'chemistry exam creator',
        'online chemistry test',
        'chemistry MCQ test maker',
        'chemical equation editor for online test',
        'how to type chemical formulas in an online test',
        'Google Forms chemical formulas',
        'mhchem',
        'NEET chemistry test',
        'JEE chemistry mock test',
        'CBSE chemistry question paper',
        'TestoZa',
    ],
    // A chemistry paper usually starts from a PDF the teacher already has.
    cta: { label: 'Make your chemistry paper, free', href: '/generate-with-ai' },
};

export const JEE_ADVANCED_META: GuideMeta = {
    slug: 'jee-advanced-mock-test-software',
    path: '/jee-advanced-mock-test-software',
    title: 'JEE Advanced mock test software: two papers, real partial marking, one combined rank',
    seoTitle: 'JEE Advanced Mock Test Software for Institutes',
    description:
        'Run JEE Advanced mocks that mark like the real paper: Paper 1 and 2 with a break, +1-per-option partial marks, two-decimal answers, one score out of 360.',
    dek:
        'A JEE Advanced mock is two papers, four kinds of question and a marking scheme where one wrong tick costs more than a skipped question. Here is how to build one that marks exactly like the real paper, run both papers as one sitting, and read what the result says about each candidate. Every demo on this page works: tick options and watch the marks, sit a short paper, take the break.',
    author: 'TestoZa Team',
    datePublished: '2026-10-08T12:00:00+05:30',
    dateModified: '2026-10-08T12:00:00+05:30',
    readMinutes: 24,
    cover: {
        src: '/guides/jee-advanced-mock-test-software/cover.png',
        alt: 'A candidate’s phone on TestoZa’s exam screen with a JEE Advanced one-or-more-correct question worth +4 with −2 for a wrong option, marked +1 for each correct option chosen',
        width: 1200,
        height: 630,
    },
    keywords: [
        'JEE Advanced mock test software',
        'JEE Advanced mock test platform',
        'JEE Advanced online test series software',
        'JEE Advanced test series for coaching institutes',
        'JEE Advanced partial marking',
        'JEE Advanced marking scheme',
        'JEE Advanced paper 1 and paper 2 mock',
        'multiple correct questions with partial marks',
        'JEE Advanced numerical answer two decimal places',
        'match the list questions online test',
        'IIT JEE mock test software',
        'JEE Advanced CBT practice',
        'TestoZa',
    ],
    // An institute starts by building Paper 1.
    cta: { label: 'Build a JEE Advanced mock, free', href: '/create-test' },
};

/** Newest first. */
export const GUIDE_METAS: GuideMeta[] = [JEE_ADVANCED_META, CHEMISTRY_META, MATH_TEST_MAKER_META, PREVENT_CHEATING_META, HINDI_META, CONDUCT_META, MOODLE_META,NEET_META, AI_TEST_GENERATOR_META, JEE_META, CBT_META, BEST_PLATFORM_META];

/** Canonical URL of a guide. */
export const guideUrl = (path: string) => `${SITE_URL}${path}`;

/** Absolute URL for an asset path such as the cover image. */
export const guideAssetUrl = (path: string) => (path.startsWith('http') ? path : `${SITE_URL}${path}`);
