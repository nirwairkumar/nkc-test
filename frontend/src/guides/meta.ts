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
    dateModified: '2026-10-08T12:00:00+05:30',
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

export const SSC_META: GuideMeta = {
    slug: 'ssc-mock-test-platform',
    path: '/ssc-mock-test-platform',
    title: 'SSC mock test platform: run 2026-pattern mocks with 15-minute timed sections',
    seoTitle: 'SSC Mock Test Platform with Sectional Timing (2026)',
    description:
        'Run SSC CGL, CHSL, MTS and GD mocks online the 2026 way: 15-minute timed sections, +2/−0.5 marking, Hindi and English, and a result for every section.',
    dek:
        'In 2026 SSC gave every section of CGL and CHSL Tier 1 its own 15 minutes: a section closes when its time ends, and there is no going back. Here is how to build and run mocks that work the same way, what the change means for candidates, how to handle Hindi and English and negative marking, and how to read a result section by section. Every demo on this page works, including a paper whose sections close on their own.',
    author: 'TestoZa Team',
    datePublished: '2026-10-08T12:00:00+05:30',
    dateModified: '2026-10-08T12:00:00+05:30',
    readMinutes: 24,
    cover: {
        src: '/guides/ssc-mock-test-platform/cover.png',
        alt: 'A candidate’s phone on an SSC CGL Tier 1 mock in TestoZa with four sections, General Intelligence and Reasoning closed and General Awareness open with its own 15-minute clock',
        width: 1200,
        height: 630,
    },
    keywords: [
        'SSC mock test platform',
        'SSC mock test',
        'SSC CGL mock test 2026',
        'SSC CGL sectional timing',
        'SSC CHSL mock test',
        'SSC online test series for coaching institutes',
        'SSC test series software',
        'SSC MTS mock test',
        'SSC GD mock test',
        'SSC exam pattern 2026',
        'SSC negative marking',
        'SSC mock test in Hindi',
        'TestoZa',
    ],
    // An institute starts by building one Tier 1 paper.
    cta: { label: 'Build an SSC mock, free', href: '/create-test' },
};

export const BANK_META: GuideMeta = {
    slug: 'bank-exam-mock-test-platform',
    path: '/bank-exam-mock-test-platform',
    title: 'Bank exam mock test platform: IBPS and SBI mocks with real sectional timing',
    seoTitle: 'Bank Exam Mock Test Platform for IBPS, SBI & RRB (2026)',
    description:
        'Run IBPS PO, SBI PO, Clerk and RRB mocks the way the real papers run: a 20-minute clock per section, five options, decimal marks, −¼ negative marking and sectional cut-offs.',
    dek:
        'A bank paper is not one test, it is three or four separate tests back to back: every section has its own clock, its own marks per question and, in IBPS, its own cut-off. Here is how to build and run mocks that behave that way, why marks like 1.5 and 0.857 break most test software, what a 20-minute section does to a candidate, and how to read a result section by section. Every demo on this page works, including a prelims paper whose sections close on their own.',
    author: 'TestoZa Team',
    datePublished: '2026-10-09T12:00:00+05:30',
    dateModified: '2026-10-09T12:00:00+05:30',
    readMinutes: 25,
    cover: {
        src: '/guides/bank-exam-mock-test-platform/cover.png',
        alt: 'A candidate’s phone on an IBPS PO Prelims mock in TestoZa with three sections, English Language closed and Quantitative Aptitude open with its own 20-minute clock',
        width: 1200,
        height: 630,
    },
    keywords: [
        'bank exam mock test platform',
        'bank exam mock test software',
        'IBPS PO mock test',
        'SBI PO mock test',
        'IBPS Clerk mock test',
        'IBPS RRB mock test',
        'bank exam test series software for coaching institutes',
        'sectional timing mock test',
        'IBPS PO exam pattern 2026',
        'bank exam negative marking',
        'sectional cut off IBPS',
        'bank mock test in Hindi',
        'TestoZa',
    ],
    // A bank institute starts by building one prelims paper.
    cta: { label: 'Build a bank mock, free', href: '/create-test' },
};

/*
 * The four "alternative" guides share a page shell and four widgets
 * (pages/guides/alt) and a data file (guides/altData.ts). Each one answers a
 * different question, so they don't compete with each other in search:
 * Classplus is an app business, Teachmint now sells classroom hardware, Kahoot
 * is a game, Testportal is a hiring tool.
 */
export const CLASSPLUS_META: GuideMeta = {
    slug: 'classplus-alternative',
    path: '/classplus-alternative',
    title: 'Classplus alternative: keep the app, or only move the tests?',
    seoTitle: 'Classplus Alternative for Tests & Mock Exams (2026)',
    description:
        'A Classplus alternative for the testing half: +4/−1 marking, join codes instead of student logins, AI papers from a PDF, rank lists and report cards.',
    dek:
        'Most people searching for a Classplus alternative don’t want another app. They want the tests to stop being the weakest part of the week, without a sales call, a yearly contract or a share of their fees. This guide separates the two halves of what Classplus sells — the app and the exams — says plainly which half a test platform can replace, and shows what moving just the exams looks like.',
    author: 'TestoZa Team',
    datePublished: '2026-10-10T12:00:00+05:30',
    dateModified: '2026-10-10T12:00:00+05:30',
    readMinutes: 17,
    cover: {
        src: '/guides/classplus-alternative/cover.png',
        alt: 'Two lists side by side: what a branded coaching app is for, and the testing jobs a dedicated exam platform does',
        width: 1200,
        height: 630,
    },
    keywords: [
        'Classplus alternative',
        'Classplus alternatives for coaching institutes',
        'Classplus competitors',
        'alternative to Classplus app',
        'Classplus pricing alternative',
        'online test platform for coaching institutes',
        'coaching institute test series software',
        'mock test platform with negative marking',
        'test platform without a branded app',
        'Classplus vs TestoZa',
        'TestoZa',
    ],
    cta: { label: 'Build your first test, free', href: '/create-test' },
};

export const TEACHMINT_META: GuideMeta = {
    slug: 'teachmint-alternative',
    path: '/teachmint-alternative',
    title: 'Teachmint alternative: exams on the phones your students already carry',
    seoTitle: 'Teachmint Alternative for Online Tests & Exams (2026)',
    description:
        'A Teachmint alternative for tests, not hardware: exam-pattern papers, +4/−1 marking, a six-digit join code, results per question, and prices you can read.',
    dek:
        'Teachmint began as a mobile-first teaching app. In 2026 its own homepage leads with Teachmint X, an interactive panel for classrooms, and a demo form. If you run a coaching institute or teach a batch whose students have phones rather than panels, the thing you need is smaller and more specific: software that builds a paper, runs it fairly and tells you what the batch got wrong.',
    author: 'TestoZa Team',
    datePublished: '2026-10-10T12:00:00+05:30',
    dateModified: '2026-10-10T12:00:00+05:30',
    readMinutes: 17,
    cover: {
        src: '/guides/teachmint-alternative/cover.png',
        alt: 'A classroom panel beside a student’s phone showing a timed test, over the words: the exam part, on the device they already have',
        width: 1200,
        height: 630,
    },
    keywords: [
        'Teachmint alternative',
        'Teachmint alternatives for coaching',
        'Teachmint competitors',
        'alternative to Teachmint app',
        'Teachmint for online tests',
        'online exam software for schools and coaching',
        'test platform for a batch on phones',
        'unit test software with negative marking',
        'Teachmint vs TestoZa',
        'school test software India',
        'TestoZa',
    ],
    cta: { label: 'Build your first test, free', href: '/create-test' },
};

export const KAHOOT_META: GuideMeta = {
    slug: 'kahoot-alternative',
    path: '/kahoot-alternative',
    title: 'Kahoot alternative: when a quiz game stops being a test',
    seoTitle: 'Kahoot Alternative for Real Tests & Mock Exams (2026)',
    description:
        'Kahoot scores on speed, up to 1000 points a question. A test scores on accuracy, with −1 for a wrong tick. Here is when to keep Kahoot and what to use instead.',
    dek:
        'Kahoot is the best thing in the room for the last ten minutes of a class, and the wrong thing for a paper whose marks go on a record. The reason is in its own documentation: points fall with every second a player takes, so it rewards the reflex that JEE, NEET, SSC and bank papers punish. This guide shows where that line falls, and how to run the tests that count without giving up the games.',
    author: 'TestoZa Team',
    datePublished: '2026-10-10T12:00:00+05:30',
    dateModified: '2026-10-10T12:00:00+05:30',
    readMinutes: 16,
    cover: {
        src: '/guides/kahoot-alternative/cover.png',
        alt: 'A game question worth 1000 points falling with the clock beside an exam question worth +4 with −1 for a wrong answer',
        width: 1200,
        height: 630,
    },
    keywords: [
        'Kahoot alternative',
        'Kahoot alternatives for teachers',
        'Kahoot alternative for exams',
        'Kahoot competitors',
        'free Kahoot alternative',
        'quiz game vs online test',
        'mock test platform with negative marking',
        'online test platform for teachers',
        'Kahoot player limit',
        'Kahoot vs TestoZa',
        'TestoZa',
    ],
    cta: { label: 'Build a test that counts, free', href: '/create-test' },
};

export const TESTPORTAL_META: GuideMeta = {
    slug: 'testportal-alternative',
    path: '/testportal-alternative',
    title: 'Testportal alternative for Indian exams: marking, Hindi and phones',
    seoTitle: 'Testportal Alternative for Indian Exams (2026)',
    description:
        'Testportal is built for hiring and certification, metered by results a month. Indian exams need +4/−1, partial marks, Hindi papers and a batch on phones.',
    dek:
        'Testportal is a capable assessment tool, built for human resources, training and certification, with its own site offering English and Polski and its plans metered by test results a month. An Indian coaching institute needs something else: +4/−1 and partial marks, Hindi and bilingual papers, 400 candidates in one sitting, and a result read batch-first. This guide compares the two honestly and says where Testportal still wins.',
    author: 'TestoZa Team',
    datePublished: '2026-10-10T12:00:00+05:30',
    dateModified: '2026-10-10T12:00:00+05:30',
    readMinutes: 17,
    cover: {
        src: '/guides/testportal-alternative/cover.png',
        alt: 'A hiring test on a laptop beside an Indian entrance mock on a phone marked +4 and −1, in Hindi and English',
        width: 1200,
        height: 630,
    },
    keywords: [
        'Testportal alternative',
        'Testportal alternatives',
        'Testportal competitors',
        'alternative to Testportal for schools',
        'Testportal pricing alternative',
        'online exam software for Indian entrance exams',
        'test platform with negative marking and partial marks',
        'Hindi online test platform',
        'unlimited respondents online test',
        'Testportal vs TestoZa',
        'TestoZa',
    ],
    cta: { label: 'Build an exam-pattern paper, free', href: '/create-test' },
};

/*
 * Five more "alternative" guides on the same shell (15 October 2026). Each answers its
 * own question: Mettl is enterprise proctoring for laptops, ProProfs charges per quiz
 * taker, Socrative is a lesson check-in, SpeedExam meters exam attempts, and Canvas
 * quizzes live inside a course system that lost its free teacher accounts in 2026.
 */
export const METTL_META: GuideMeta = {
    slug: 'mercer-mettl-alternative',
    path: '/mercer-mettl-alternative',
    title: 'Mercer Mettl alternative for everyday tests on students’ phones',
    seoTitle: 'Mercer Mettl Alternative for Coaching Tests (2026)',
    description:
        'Mettl is built for hiring and high-stakes proctoring on laptops, priced by quote. For weekly tests and mocks on students’ phones, here is what to use instead.',
    dek:
        'Mercer Mettl is a serious enterprise product: webcam, AI and live proctoring, identity checks, a secure browser, psychometric and coding tests, sold through a demo. Its own help centre says proctored tests don’t run on phones. If what you need is a weekly test and a monthly mock for a batch whose only device is a phone, you need something much smaller. This guide shows where the line falls.',
    author: 'TestoZa Team',
    datePublished: '2026-10-15T12:00:00+05:30',
    dateModified: '2026-10-15T12:00:00+05:30',
    readMinutes: 16,
    cover: {
        src: '/guides/mercer-mettl-alternative/cover.png',
        alt: 'Two lists: what an enterprise proctoring suite is for, and the everyday tests a batch takes on phones',
        width: 1200,
        height: 630,
    },
    keywords: [
        'Mercer Mettl alternative',
        'Mettl alternative',
        'Mettl alternatives for coaching institutes',
        'Mettl competitors',
        'Mettl pricing alternative',
        'online exam software for coaching institutes',
        'online test platform that works on mobile',
        'mock test platform with negative marking',
        'exam software without webcam proctoring',
        'Mettl vs TestoZa',
        'TestoZa',
    ],
    cta: { label: 'Build your first test, free', href: '/create-test' },
};

export const PROPROFS_META: GuideMeta = {
    slug: 'proprofs-alternative',
    path: '/proprofs-alternative',
    title: 'ProProfs alternative: an exam platform that doesn’t charge per student',
    seoTitle: 'ProProfs Quiz Maker Alternative for Indian Exams (2026)',
    description:
        'ProProfs prices per quiz taker in dollars and caps free quizzes at 8 questions. For big mocks with +4/−1 and Hindi, try a platform with no per-student fee.',
    dek:
        'ProProfs Quiz Maker is a capable, well-made tool: negative marking, sections, 20+ question types, 70+ languages. Its price, though, counts people: $19.99 per 100 active quiz takers a month on its entry business plan, and a free plan capped at 8 quiz questions. For an institute whose whole business is putting more students through more papers, that meter is the problem. This guide works out what it costs and what to use instead.',
    author: 'TestoZa Team',
    datePublished: '2026-10-15T12:00:00+05:30',
    dateModified: '2026-10-15T12:00:00+05:30',
    readMinutes: 16,
    cover: {
        src: '/guides/proprofs-alternative/cover.png',
        alt: 'A price that grows with every quiz taker beside a flat yearly price for an exam platform',
        width: 1200,
        height: 630,
    },
    keywords: [
        'ProProfs alternative',
        'ProProfs Quiz Maker alternative',
        'ProProfs alternatives for teachers',
        'ProProfs competitors',
        'ProProfs pricing alternative',
        'quiz maker without per user pricing',
        'online test platform for coaching institutes',
        'mock test platform with negative marking',
        'Hindi online test maker',
        'ProProfs vs TestoZa',
        'TestoZa',
    ],
    cta: { label: 'Build your first test, free', href: '/create-test' },
};

export const SOCRATIVE_META: GuideMeta = {
    slug: 'socrative-alternative',
    path: '/socrative-alternative',
    title: 'Socrative alternative: when a classroom check becomes a real test',
    seoTitle: 'Socrative Alternative for Real Tests & Mock Exams (2026)',
    description:
        'Socrative is a fast lesson check: 3 question types, a percentage score, 50 students in a free room. For marked tests and mocks, keep it and add an exam platform.',
    dek:
        'Socrative is one of the best tools for finding out, in two minutes, whether a lesson landed. Exit tickets, quick questions and Space Race all do that job well. A weekly test that goes on a record, or a mock for an entrance exam, is a different job: it needs negative marking, numerical answers, an exam screen and a rank list. This guide shows where that line falls, and how to keep both.',
    author: 'TestoZa Team',
    datePublished: '2026-10-15T12:00:00+05:30',
    dateModified: '2026-10-15T12:00:00+05:30',
    readMinutes: 15,
    cover: {
        src: '/guides/socrative-alternative/cover.png',
        alt: 'A quick classroom check scored as a percentage beside an exam paper marked +4 and −1',
        width: 1200,
        height: 630,
    },
    keywords: [
        'Socrative alternative',
        'Socrative alternatives for teachers',
        'Socrative alternative for tests',
        'Socrative competitors',
        'free Socrative alternative',
        'exit ticket vs online test',
        'online test platform with negative marking',
        'mock test platform for teachers',
        'Socrative student limit',
        'Socrative vs TestoZa',
        'TestoZa',
    ],
    cta: { label: 'Build a test that counts, free', href: '/create-test' },
};

export const SPEEDEXAM_META: GuideMeta = {
    slug: 'speedexam-alternative',
    path: '/speedexam-alternative',
    title: 'SpeedExam alternative: no attempt meter, no logins to hand out',
    seoTitle: 'SpeedExam Alternative for Coaching Institutes (2026)',
    description:
        'SpeedExam meters exam attempts a month, retakes included, and issues logins. Compare a platform with no attempt cap, a six-digit join code and NTA-style mocks.',
    dek:
        'SpeedExam is a solid online exam service, with webcam and AI proctoring, certificates and ten question types, used by companies and institutions in 128 countries. Its plans are metered by exam attempts a month, counting incomplete attempts and retakes, and candidates sign in with accounts the administrator manages. For a coaching institute running a weekly test and a monthly mock for every batch, both of those add up fast. This guide does the sums and shows the alternative.',
    author: 'TestoZa Team',
    datePublished: '2026-10-15T12:00:00+05:30',
    dateModified: '2026-10-15T12:00:00+05:30',
    readMinutes: 15,
    cover: {
        src: '/guides/speedexam-alternative/cover.png',
        alt: 'A monthly allowance of exam attempts running out beside a batch joining one exam with a six-digit code',
        width: 1200,
        height: 630,
    },
    keywords: [
        'SpeedExam alternative',
        'SpeedExam alternatives',
        'SpeedExam competitors',
        'SpeedExam pricing alternative',
        'online exam software without attempt limits',
        'online exam software for coaching institutes India',
        'mock test platform with join code',
        'NTA style mock test software',
        'online exam software with negative marking',
        'SpeedExam vs TestoZa',
        'TestoZa',
    ],
    cta: { label: 'Build your first test, free', href: '/create-test' },
};

export const CANVAS_QUIZZES_META: GuideMeta = {
    slug: 'canvas-quizzes-alternative',
    path: '/canvas-quizzes-alternative',
    title: 'Canvas quizzes alternative after Free-for-Teacher',
    seoTitle: 'Canvas Quizzes Alternative for Teachers (2026)',
    description:
        'Canvas Free-for-Teacher closed in 2026; Canvas Lite caps courses at 50 learners and needs an ID check. For tests and mocks, a free alternative with a join code.',
    dek:
        'Canvas is a learning management system, and its quizzes live inside courses. In 2026 Instructure closed Canvas Free-for-Teacher after a security incident and replaced it with Canvas Lite: free, but with 50 learners per course and an identity check with your ID and a selfie. If you mostly used Canvas to run quizzes, this is a good moment to ask whether your tests need a course system at all. This guide answers that honestly.',
    author: 'TestoZa Team',
    datePublished: '2026-10-15T12:00:00+05:30',
    dateModified: '2026-10-15T12:00:00+05:30',
    readMinutes: 15,
    cover: {
        src: '/guides/canvas-quizzes-alternative/cover.png',
        alt: 'A quiz inside a course with an enrolment list beside an exam a whole batch joins with one code',
        width: 1200,
        height: 630,
    },
    keywords: [
        'Canvas quizzes alternative',
        'Canvas alternative for quizzes',
        'Canvas Free for Teacher alternative',
        'Canvas Lite alternative',
        'Canvas New Quizzes alternative',
        'Canvas LMS alternatives for teachers',
        'online quiz tool without LMS',
        'online test platform with negative marking',
        'free online exam platform for teachers',
        'Canvas vs TestoZa',
        'TestoZa',
    ],
    cta: { label: 'Build your first test, free', href: '/create-test' },
};

/*
 * Four "how to" guides share a page shell, six widgets and a data file
 * (pages/guides/howto, guides/howtoData.ts). Each one answers a different job, so they
 * don't compete with each other in search: running an exam on phones, putting a test
 * on a website, building a full-length mock, and sending a test on WhatsApp.
 */
export const MOBILE_EXAM_META: GuideMeta = {
    slug: 'mobile-friendly-online-exam',
    path: '/mobile-friendly-online-exam',
    title: 'Mobile-friendly online exam: a test your students can take on any phone',
    seoTitle: 'Mobile-Friendly Online Exam Software for Phones (2026)',
    description:
        'Run an online exam on students’ phones: no app or account, answers saved every 20 seconds, rejoin on another phone, and rules that work on Android and iPhone.',
    dek:
        'Most of your candidates will write on their own phone: an Android a few years old, on mobile data, with calls and WhatsApp arriving mid-paper. This guide sets out what a mobile-friendly online exam has to do, shows what the candidate sees on a six-inch screen, and walks through what happens when the signal drops or the battery dies.',
    author: 'TestoZa Team',
    datePublished: '2026-10-13T12:00:00+05:30',
    dateModified: '2026-10-13T12:00:00+05:30',
    readMinutes: 18,
    cover: {
        src: '/guides/mobile-friendly-online-exam/cover.png',
        alt: 'Mobile-friendly online exam: a call, no signal and a low battery beside answers saved every 20 seconds, rejoining on another phone and automatic submission',
        width: 1200,
        height: 630,
    },
    keywords: [
        'mobile friendly online exam',
        'online exam on mobile phone',
        'mobile online test platform',
        'conduct exam on mobile',
        'online exam without app',
        'take online test on phone',
        'online exam software for android',
        'online exam on iPhone',
        'what happens if internet disconnects during online exam',
        'mobile exam app alternative',
        'TestoZa',
    ],
    cta: { label: 'Build a phone-ready test, free', href: '/create-test' },
};

export const EMBED_META: GuideMeta = {
    slug: 'embed-test-on-website',
    path: '/embed-test-on-website',
    title: 'How to embed a test on your website: WordPress, Google Sites, Wix and Blogger',
    seoTitle: 'Embed an Online Test on Your Website: Free Code (2026)',
    description:
        'Add an online test to WordPress, Google Sites, Wix or Blogger: copy free button or card code that opens the exam full screen in its own tab. No plugin needed.',
    dek:
        'You have a website and you have a test, and you want students who visit one to take the other. This guide explains the two things “embed” can mean, why an exam should open in its own tab rather than inside your page, gives you the code for your own test, and shows where to paste it on eight website builders.',
    author: 'TestoZa Team',
    datePublished: '2026-10-13T12:00:00+05:30',
    dateModified: '2026-10-13T12:00:00+05:30',
    readMinutes: 15,
    cover: {
        src: '/guides/embed-test-on-website/cover.png',
        alt: 'Embed a test on your website: a Start the test button, a card or code box and a QR code on your page, and the exam opening in its own tab',
        width: 1200,
        height: 630,
    },
    keywords: [
        'embed test on website',
        'embed quiz in website',
        'add online test to wordpress',
        'embed test in google sites',
        'add quiz to wix website',
        'embed exam in blogger',
        'online test embed code',
        'test button html code',
        'iframe online test',
        'put a test on my website',
        'TestoZa',
    ],
    cta: { label: 'Make a test to put on your site', href: '/create-test' },
};

export const FULL_LENGTH_META: GuideMeta = {
    slug: 'full-length-online-test-maker',
    path: '/full-length-online-test-maker',
    title: 'Full-length online test maker: a 3-hour mock that behaves like the real paper',
    seoTitle: 'Full-Length Online Test Maker for Mock Exams (2026)',
    description:
        'Make full-length mock tests online: 180 questions, sectional clocks, +4/−1 marking, answers saved for three hours and section-wise results. Free to build.',
    dek:
        'A full-length mock is the test that teaches the exam rather than the syllabus: the clock, the order, the stamina, the decision to leave a question blank. It is also the test online tools handle worst. This guide covers what full-length has to mean, the patterns of JEE, NEET, SSC and bank papers, and how to build, run and read one.',
    author: 'TestoZa Team',
    datePublished: '2026-10-13T12:00:00+05:30',
    dateModified: '2026-10-13T12:00:00+05:30',
    readMinutes: 16,
    cover: {
        src: '/guides/full-length-online-test-maker/cover.png',
        alt: 'Full-length online test maker: every question, the full duration, the exam’s sections and marking, and three hours without losing an answer',
        width: 1200,
        height: 630,
    },
    keywords: [
        'full length online test maker',
        'full length mock test maker',
        'create full length mock test online',
        'full length test series software',
        'online mock test with negative marking',
        '180 question NEET mock online',
        'JEE Main full length mock online',
        'sectional timing mock test',
        'Google Forms for mock tests',
        'three hour online exam',
        'TestoZa',
    ],
    cta: { label: 'Build a full-length mock, free', href: '/create-test' },
};

export const WHATSAPP_META: GuideMeta = {
    slug: 'share-test-on-whatsapp',
    path: '/share-test-on-whatsapp',
    title: 'How to share a test on WhatsApp so the whole batch opens it',
    seoTitle: 'How to Share an Online Test on WhatsApp (2026 Guide)',
    description:
        'Share an online test on WhatsApp the right way: one link or a six-digit code, a message students act on, the right preview card, and results back to the group.',
    dek:
        'For most Indian batches the test goes out in a WhatsApp group, and that is where many tests quietly fail: a bare link, two links, no word on signing up, sent at the wrong hour. This guide shows the messages that work, word for word, how to send them from a phone or a computer, and how to send the rank list and parent notes back the same evening.',
    author: 'TestoZa Team',
    datePublished: '2026-10-13T12:00:00+05:30',
    dateModified: '2026-10-13T12:00:00+05:30',
    readMinutes: 15,
    cover: {
        src: '/guides/share-test-on-whatsapp/cover.png',
        alt: 'Share a test on WhatsApp: the test’s name in bold, one link and no account in the group, then the rank list and a note to each parent afterwards',
        width: 1200,
        height: 630,
    },
    keywords: [
        'share test on whatsapp',
        'share online test link on whatsapp',
        'send quiz on whatsapp',
        'whatsapp online exam for students',
        'how to send test link to students',
        'share mock test in whatsapp group',
        'send result to parents on whatsapp',
        'rank list on whatsapp',
        'online test join code',
        'whatsapp test link preview',
        'TestoZa',
    ],
    cta: { label: 'Make a test to share, free', href: '/create-test' },
};

/*
 * A comparison page on the "how to" shell (pages/guides/howto): thirteen platforms sorted
 * by what the exam decides. Not the same search as /best-online-test-platform, which is
 * about what any test platform has to do; this one is the "best … in India" list.
 */
export const BEST_EXAM_INDIA_META: GuideMeta = {
    slug: 'best-online-exam-software-india',
    path: '/best-online-exam-software-india',
    title: 'Best online exam software in India: 13 platforms, compared honestly',
    seoTitle: 'Best Online Exam Software in India (2026): 13 Compared',
    description:
        'Compare 13 online exam platforms used in India, from TestoZa and Mettl to Eklavvya, TCS iON and Classplus: phones, negative marking, proctoring and real prices.',
    dek:
        'There is no single best online exam software. There is the right one for what your exam decides: a quick quiz in class, a Sunday mock for a coaching batch, or a recruitment test that needs a webcam and an ID check. This guide sorts thirteen platforms used in India by that job, checks each against eight things an Indian paper needs, and works out what a year costs at a real batch size.',
    author: 'TestoZa Team',
    datePublished: '2026-10-25T12:00:00+05:30',
    dateModified: '2026-10-25T12:00:00+05:30',
    readMinutes: 24,
    cover: {
        src: '/guides/best-online-exam-software-india/cover.png',
        alt: 'Best online exam software in India: a quick class quiz, weekly mocks on students’ phones and proctored exams, each with the platforms built for it',
        width: 1200,
        height: 630,
    },
    keywords: [
        'best online exam software in India',
        'online exam software India',
        'top online exam platforms in India',
        'online examination software',
        'online exam software for coaching institutes',
        'online exam software for schools',
        'online exam software with negative marking',
        'online exam software price India',
        'Mettl vs Eklavvya vs TestoZa',
        'mock test platform India',
        'TestoZa',
    ],
    cta: { label: 'Build your first test, free', href: '/create-test' },
};

// ── Five guides of 30 October 2026 on the "how to" shell (data in testMakerData.ts) ──

export const SECTIONAL_META: GuideMeta = {
    slug: 'sectional-test-maker',
    path: '/sectional-test-maker',
    title: 'Sectional test maker: sections with their own clocks, limits and marks',
    seoTitle: 'Sectional Test Maker: Section-wise Timer and Marks (2026)',
    description:
        'Make sectional tests online: one-section drills or full papers split into sections, each with its own timer, attempt limit and marks. Section-wise results.',
    dek:
        'In Indian exam preparation, a “sectional test” means two things: a short drill on one section, and a full paper divided into sections that each run on their own rules. This guide covers both: when each one helps, how to set section clocks, attempt limits and marks, which exams use them, and how to read a section-wise result.',
    author: 'TestoZa Team',
    datePublished: '2026-10-30T12:00:00+05:30',
    dateModified: '2026-10-30T12:00:00+05:30',
    readMinutes: 11,
    cover: {
        src: '/guides/sectional-test-maker/cover.png',
        alt: 'Sectional test maker: a paper split into sections, each with its own minutes, attempt limit and marks, and a section-wise result',
        width: 1200,
        height: 630,
    },
    keywords: [
        'sectional test maker',
        'sectional test online',
        'sectional mock test',
        'test with sectional timing',
        'section wise timer online test',
        'create test with sections',
        'sectional test for SSC',
        'sectional test for bank exams',
        'attempt any questions in a section',
        'TestoZa',
    ],
    cta: { label: 'Build a sectional test, free', href: '/create-test' },
};

export const TUITION_META: GuideMeta = {
    slug: 'online-test-for-tuition-teachers',
    path: '/online-test-for-tuition-teachers',
    title: 'Online tests for tuition teachers: a weekly test your students take on their phones',
    seoTitle: 'Online Test for Tuition Teachers: Weekly Tests on Phones',
    description:
        'How a home tutor or small tuition centre can run weekly online tests: questions from a textbook photo, a WhatsApp link, and marks and parent messages the same day.',
    dek:
        'You teach twenty students after school, in a front room or a rented hall. You don’t need institute software or an app with your name on it. You need this week’s chapter turned into a test tonight, a link students open on their phones, and marks you can show parents. This guide sets that up, step by step, with what it costs.',
    author: 'TestoZa Team',
    datePublished: '2026-10-30T12:00:00+05:30',
    dateModified: '2026-10-30T12:00:00+05:30',
    readMinutes: 11,
    cover: {
        src: '/guides/online-test-for-tuition-teachers/cover.png',
        alt: 'Online tests for tuition teachers: a textbook page turned into a test, shared on WhatsApp, with marks and a parent message the same evening',
        width: 1200,
        height: 630,
    },
    keywords: [
        'online test for tuition teachers',
        'online test for tuition',
        'online test for tution classes',
        'test app for tuition teachers',
        'weekly test for tuition students',
        'online test for home tutors',
        'how to take online test of students',
        'online test on WhatsApp',
        'TestoZa',
    ],
    cta: { label: 'Make this week’s test', href: '/generate-with-ai' },
};

export const CBSE_META: GuideMeta = {
    slug: 'cbse-online-test-maker',
    path: '/cbse-online-test-maker',
    title: 'CBSE online test maker: MCQs, assertion–reason and case-based questions for Classes 6 to 12',
    seoTitle: 'CBSE Online Test Maker for Classes 6 to 12 (2026-27)',
    description:
        'Make CBSE online tests from NCERT chapters and sample papers: MCQs, assertion–reason and case-based questions, no negative marking, in English or Hindi.',
    dek:
        'CBSE papers now carry many objective and competency-based questions: MCQs, assertion and reason, and case studies built on a passage. Those are exactly the parts an online test can set and mark for you. This guide shows how to build CBSE-style tests from NCERT chapters, how to use them through the school year, and what to keep on paper.',
    author: 'TestoZa Team',
    datePublished: '2026-10-30T12:00:00+05:30',
    dateModified: '2026-10-30T12:00:00+05:30',
    readMinutes: 10,
    cover: {
        src: '/guides/cbse-online-test-maker/cover.png',
        alt: 'CBSE online test maker: MCQs, assertion–reason, case-based questions and numericals marked online; written answers kept on paper',
        width: 1200,
        height: 630,
    },
    keywords: [
        'CBSE online test maker',
        'CBSE online test',
        'CBSE MCQ test maker',
        'online test for CBSE class 10',
        'case based questions online test',
        'assertion reason questions online test',
        'NCERT chapter test online',
        'CBSE periodic test online',
        'TestoZa',
    ],
    cta: { label: 'Make a CBSE chapter test', href: '/generate-with-ai' },
};

export const SCHOLARSHIP_META: GuideMeta = {
    slug: 'scholarship-admission-test-platform',
    path: '/scholarship-admission-test-platform',
    title: 'Scholarship admission test platform: run your institute’s scholarship test online',
    seoTitle: 'Scholarship Admission Test Platform for Coaching Institutes',
    description:
        'Run an admission-cum-scholarship test online or in your centre: registration details, one attempt, results on your day, scholarship slabs and a lead list.',
    dek:
        'Every admission season, coaching institutes run a scholarship test: part entrance exam, part open day, part the best enquiry list of the year. This guide covers how to run one at home, in your centre or at partner schools, how to keep it fair, how to turn scores into scholarship slabs, and how to follow up with every family who took it.',
    author: 'TestoZa Team',
    datePublished: '2026-10-30T12:00:00+05:30',
    dateModified: '2026-10-30T12:00:00+05:30',
    readMinutes: 11,
    cover: {
        src: '/guides/scholarship-admission-test-platform/cover.png',
        alt: 'Scholarship admission test platform: candidates register and join with a code; the institute gets a rank list, scholarship slabs and every phone number',
        width: 1200,
        height: 630,
    },
    keywords: [
        'scholarship admission test platform',
        'scholarship test online',
        'admission cum scholarship test',
        'conduct scholarship test online',
        'scholarship test for coaching institute',
        'online admission test software',
        'entrance test platform for coaching',
        'TestoZa',
    ],
    cta: { label: 'Set up a scholarship test', href: '/create-test' },
};

export const NEGATIVE_MARKING_META: GuideMeta = {
    slug: 'online-test-with-negative-marking',
    path: '/online-test-with-negative-marking',
    title: 'Online test with negative marking: set any scheme, and know when a guess pays',
    seoTitle: 'Online Test with Negative Marking: −1, −0.5, −0.25, −1/3',
    description:
        'Create online tests with negative marking: −1, −0.5, −0.25 or a third, per question, with partial marks. Every Indian exam’s scheme, and when to guess.',
    dek:
        'Negative marking takes two numbers to set and months to teach. This guide covers both halves: how to set +4/−1, a quarter or a third of a mark on any question, what each major Indian exam uses, the arithmetic of when to guess, and how to show students the marks they are throwing away.',
    author: 'TestoZa Team',
    datePublished: '2026-10-30T12:00:00+05:30',
    dateModified: '2026-10-30T12:00:00+05:30',
    readMinutes: 11,
    cover: {
        src: '/guides/online-test-with-negative-marking/cover.png',
        alt: 'Online test with negative marking: Marks and Wrong boxes on each question, and the negative marking schemes of JEE, NEET, SSC, bank exams, GATE and UPSC',
        width: 1200,
        height: 630,
    },
    keywords: [
        'online test with negative marking',
        'negative marking online test',
        'create test with negative marking',
        'negative marking in exams',
        'quiz maker with negative marking',
        'negative marking calculator',
        'should I guess in negative marking',
        'mock test with negative marking',
        'TestoZa',
    ],
    cta: { label: 'Build a test with negative marking', href: '/create-test' },
};

/** Newest first. */
export const GUIDE_METAS: GuideMeta[] = [SECTIONAL_META, TUITION_META, CBSE_META, SCHOLARSHIP_META, NEGATIVE_MARKING_META, BEST_EXAM_INDIA_META, METTL_META, PROPROFS_META, SOCRATIVE_META, SPEEDEXAM_META, CANVAS_QUIZZES_META, MOBILE_EXAM_META, EMBED_META, FULL_LENGTH_META, WHATSAPP_META, CLASSPLUS_META, TEACHMINT_META, KAHOOT_META, TESTPORTAL_META, BANK_META, SSC_META, JEE_ADVANCED_META, CHEMISTRY_META, MATH_TEST_MAKER_META, PREVENT_CHEATING_META, HINDI_META, CONDUCT_META, MOODLE_META,NEET_META, AI_TEST_GENERATOR_META, JEE_META, CBT_META, BEST_PLATFORM_META];

/** Canonical URL of a guide. */
export const guideUrl = (path: string) => `${SITE_URL}${path}`;

/** Absolute URL for an asset path such as the cover image. */
export const guideAssetUrl = (path: string) => (path.startsWith('http') ? path : `${SITE_URL}${path}`);
