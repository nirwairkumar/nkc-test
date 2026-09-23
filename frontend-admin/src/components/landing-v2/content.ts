/**
 * Landing Page V2 — single source of copy.
 *
 * Everything a non-developer would want to change lives here, so the section
 * components stay pure layout. Edit this file to re-word the page.
 *
 * Built from LANDING_PAGE_AUDIT.md. Referenced findings are noted inline.
 */

// ─────────────────────────────────────────────────────────────────────────────
// HERO  (audit C1, C2, M1)
// The live hero rotates four slogans inside the <h1> and has an empty
// subheadline (`&nbsp;`). Google renders JS, so it scores the rotating text —
// which contains none of the target keywords. Here the <h1> is ONE static
// sentence that matches the static HTML fallback, and the rotating element is
// demoted to a supporting line where it costs nothing.
// ─────────────────────────────────────────────────────────────────────────────
export const HERO = {
    eyebrow: "The Educator's Choice",
    h1: 'Free online test maker for teachers',
    // Keep this in sync with index.html's #seo-fallback so crawlers and users
    // see substantially the same page (audit T3).
    sub: 'Create and conduct exams with AI. Generate quizzes from PDFs, YouTube videos, or plain text in minutes — auto-graded, proctored, and free for unlimited students.',
    rotating: [
        'from a PDF',
        'from a YouTube video',
        'from your notes',
        'from a question bank',
    ],
    rotatingPrefix: 'Build a full paper',
    primaryCta: { label: 'Generate a test with AI', href: '/generate-with-ai' },
    secondaryCta: { label: 'Build one manually', href: '/create-test' },
    reassurance: 'Free forever for teachers · No card required · No student limit',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// PROOF  (audit C4)
//
// ⚠️  HONESTY NOTE — read before editing.
// The LIVE PlatformStatsSection shows "10,000+ Total Tests", "5,000+
// Contributors", "50+ Categories". Verified against the production database on
// 2026-09-23, the real figures were 186 tests, 66 users, 14 categories. Those
// claims are inflated roughly 50x.
//
// V2 therefore defaults to `capability` proof — statements that are true at any
// scale — instead of vanity metrics. Switch PROOF_MODE to 'metrics' only when
// the numbers below are refreshed from the database and are genuinely
// impressive. Never round up.
// ─────────────────────────────────────────────────────────────────────────────
export type ProofMode = 'capability' | 'metrics';
export const PROOF_MODE: ProofMode = 'capability';

/** Real values, read from production on 2026-09-23. Refresh before using. */
export const REAL_METRICS = {
    asOf: '2026-09-23',
    tests: 186,
    educators: 28,
    attemptsGraded: 303, // 225 registered + 78 anonymous
    categories: 14,
} as const;

export const CAPABILITY_PROOF = [
    { stat: 'No limit', label: 'Students per test' },
    { stat: 'No app', label: 'Works in any mobile browser' },
    { stat: 'Under 2 min', label: 'From PDF to ready paper' },
    { stat: 'Free', label: 'Unlimited tests for teachers' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// VALUE PROPS  (audit M2 — lead with the differentiator)
// Ordered by how hard each is for a competitor to copy.
// ─────────────────────────────────────────────────────────────────────────────
export const VALUE_PROPS = [
    {
        icon: 'sparkles',
        title: 'Turn any source into a paper',
        body: 'Upload a PDF, paste a YouTube link, or drop in raw text. AI writes MCQs, numericals, true/false and multi-select questions with explanations — then hands you an editable draft, not a locked export.',
        href: '/pdf-to-quiz',
        linkLabel: 'See PDF to quiz',
    },
    {
        icon: 'shield',
        title: 'Exam integrity that actually holds',
        body: 'Full-screen enforcement, tab-switch detection, copy-paste lock, and question and option randomisation. Violations are logged, and you choose whether to warn, lock, or auto-submit.',
        href: '/online-proctoring-software',
        linkLabel: 'See proctoring controls',
    },
    {
        icon: 'chart',
        title: 'Grading and analysis, done',
        body: 'Negative marking to your exact scheme, instant scoring on submission, per-question timing, section-wise breakdowns, rank lists and downloadable reports.',
        href: '/auto-grading-software',
        linkLabel: 'See auto-grading',
    },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// HOW IT WORKS  (audit — remove perceived effort)
// ─────────────────────────────────────────────────────────────────────────────
export const STEPS = [
    {
        n: '01',
        title: 'Bring your material',
        body: 'A chapter PDF, a lecture recording on YouTube, an old question paper, or nothing at all — start from a blank builder if you prefer.',
    },
    {
        n: '02',
        title: 'AI drafts the paper',
        body: 'Choose question count, difficulty and language. Every question lands in the editor where you can rewrite, reorder, re-mark or delete before anyone sees it.',
    },
    {
        n: '03',
        title: 'Share a link',
        body: 'Send the URL or QR code over WhatsApp, email or Google Classroom. Students open it in any browser. Results and analysis appear as they submit.',
    },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE DEEP-DIVES  (audit Part 4 — trimmed from six showcases to three)
// ─────────────────────────────────────────────────────────────────────────────
export const FEATURES = [
    {
        kicker: 'Question engine',
        title: 'Every question type a real exam needs',
        body: 'Single and multiple correct, numerical ranges with tolerance, assertion-reason, and comprehension passages. Per-question marks and negative marks, LaTeX for maths and chemistry, and images on both questions and options.',
        bullets: [
            'Per-question and per-section marking schemes',
            'Negative marking at -0.25, -0.33, -0.5, -1 or any value',
            'LaTeX and chemical notation rendered natively',
            'Section-wise papers with independent timers',
        ],
        visual: 'question',
    },
    {
        kicker: 'Conducting exams',
        title: 'Run a real exam, not a shared form',
        body: 'Schedule a window, require registration, and watch attempts in real time. Candidates get a distraction-free interface with a live timer, question palette, and a review-and-submit flow that matches what they will face in a computer-based test.',
        bullets: [
            'Scheduled start and end windows',
            'Live monitoring while the exam runs',
            'Attempt limits and section-wise attempt control',
            'Works on phones, tablets and low-end laptops',
        ],
        visual: 'exam',
    },
    {
        kicker: 'After the exam',
        title: 'Results your students can learn from',
        body: 'Scores are computed on the server the moment a paper is submitted. Students see their marks, accuracy, time per question and where they lost points. You see the cohort — topic weak spots, rank lists, and every attempt in one table.',
        bullets: [
            'Server-side scoring — no client-side tampering',
            'Per-topic and per-section performance breakdown',
            'Rank lists and percentile calculation',
            'Solutions and explanations released on your schedule',
        ],
        visual: 'results',
    },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// COMPARISON  (audit M3 — you already win this argument in the FAQ,
// so make it a table)
// ─────────────────────────────────────────────────────────────────────────────
export const COMPARISON = {
    columns: ['TestoZa', 'Google Forms', 'Quizizz'],
    rows: [
        { feature: 'Built for formal assessment', values: [true, false, 'partial'] },
        { feature: 'AI questions from PDF / YouTube', values: [true, false, 'partial'] },
        { feature: 'Negative marking', values: [true, false, false] },
        { feature: 'Tab-switch and full-screen proctoring', values: [true, false, false] },
        { feature: 'Section-wise papers with timers', values: [true, false, false] },
        { feature: 'Rank list and percentile', values: [true, false, 'partial'] },
        { feature: 'White-label branding', values: [true, false, 'partial'] },
        { feature: 'Unlimited students, free', values: [true, true, false] },
    ],
    footnote:
        'Comparison reflects the freely available tiers as understood on 2026-09-23. Competitor products change — verify before publishing, and re-check each claim you keep.',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TESTIMONIALS  (audit C4)
// ⚠️  These are PLACEHOLDERS with fictional attribution and must not ship.
// Replace with real, permissioned quotes or delete the section. A landing page
// with no testimonials is honest; one with invented testimonials is not.
// ─────────────────────────────────────────────────────────────────────────────
export const TESTIMONIALS_ARE_PLACEHOLDER = true;
export const TESTIMONIALS = [
    {
        quote: 'Replace this with a real quote from a teacher who uses TestoZa, with their permission.',
        name: 'Name',
        role: 'Role, Institution',
    },
    {
        quote: 'A second real quote. Specific beats glowing — "cut my paper-setting time from an evening to ten minutes" outperforms "great product".',
        name: 'Name',
        role: 'Role, Institution',
    },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// PRICING PREVIEW  (audit Part 4 — handle the unspoken objection)
// ─────────────────────────────────────────────────────────────────────────────
export const PRICING_PREVIEW = {
    title: 'Free for teachers. Properly free.',
    body: 'Unlimited tests, unlimited students, AI generation, proctoring and analytics on the free plan. Paid plans add white-label branding, custom domains and priority support for institutions.',
    bullets: ['No card to start', 'No student cap', 'No paywalled question types'],
    cta: { label: 'See plans and pricing', href: '/pricing' },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// FAQ  (audit T4, M3 — the strongest content on the current site, kept verbatim)
// Powers FAQPage JSON-LD.
// ─────────────────────────────────────────────────────────────────────────────
export const FAQS = [
    {
        q: 'How do I create a test from a PDF?',
        a: 'You can create a test from a PDF on TestoZa in under two minutes using our AI importer. Navigate to the AI Test Generator, upload your PDF (lecture notes, textbook chapters, or question banks), select your desired question count and difficulty, and click Generate. The AI extracts key concepts, creates multiple-choice or short-answer questions with detailed explanations, and loads them directly into your editable test builder.',
    },
    {
        q: 'Can I turn a YouTube video into a quiz?',
        a: 'Yes. Paste the YouTube video URL into the AI quiz generator and the system analyses the video transcript to generate relevant questions with correct answers and explanations. It is an ideal tool for flipped classrooms, homework assignments, and checking comprehension after video lessons.',
    },
    {
        q: 'How do I add negative marking to an online test?',
        a: 'Negative marking is set in the Test Settings panel while creating or editing any test. Under Scoring Settings, enable Negative Marking and specify the deduction per incorrect answer — such as -0.25, -0.33, -0.5, or -1. The platform applies it automatically on submission, matching competitive examination scoring rules.',
    },
    {
        q: 'How do I stop students from cheating in an online test?',
        a: 'TestoZa prevents cheating through layered exam controls. When setting up your test you can enable full-screen enforcement, tab-switch monitoring, copy-paste disabling, and question and option randomisation. If a student leaves the exam tab or attempts unauthorised navigation, TestoZa logs the infraction and can automatically submit or lock the test after a threshold you choose.',
    },
    {
        q: 'Can students take the test on a mobile phone?',
        a: 'Yes. Students can take any TestoZa test on phones, tablets or laptops without installing anything. Every test link opens in standard mobile browsers including Chrome, Safari and Firefox. The interface adapts to small screens while keeping the timer visible, question navigation clear, and full touch support for answering and submitting.',
    },
    {
        q: 'How do I share a test with my students?',
        a: 'Copy the unique test URL or generate a QR code from your dashboard. Distribute it via WhatsApp, email, Google Classroom, or your LMS. Students click the link, enter their name or roll number, and begin immediately — no downloads, no accounts required unless you want them.',
    },
    {
        q: 'Is TestoZa better than Google Forms for conducting tests?',
        a: 'TestoZa is purpose-built for educational assessment, whereas Google Forms is a survey tool. TestoZa provides exam timers, automatic negative marking, tab-switch detection, randomised question ordering, AI-powered generation, and student analytics with rank calculation — a professional computer-based testing experience without add-ons.',
    },
    {
        q: 'What is a free alternative to Quizizz for teachers?',
        a: 'TestoZa is a free alternative to Quizizz for educators who need formal, exam-grade assessments rather than gamified trivia. It offers unlimited test creation, AI question generation from PDFs and YouTube, customisable timers, negative marking and leaderboards — with no student limits or paywalled question types.',
    },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER  (audit C3 — THE highest-ROI SEO fix)
//
// The live site has ~15 keyword landing pages that nothing links to. Sitemaps
// say a URL exists; internal links say it matters. Every route below is real
// and already defined in frontend/src/App.tsx.
// ─────────────────────────────────────────────────────────────────────────────
export const FOOTER_LINKS = [
    {
        title: 'Create',
        links: [
            { label: 'AI test generator', href: '/generate-with-ai' },
            { label: 'Manual test builder', href: '/create-test' },
            { label: 'PDF to quiz', href: '/pdf-to-quiz' },
            { label: 'AI question generator', href: '/ai-question-generator' },
            { label: 'MCQ test maker', href: '/mcq-test-maker' },
            { label: 'Online quiz maker', href: '/online-quiz-maker' },
        ],
    },
    {
        title: 'Solutions',
        links: [
            { label: 'Online test maker', href: '/online-test-maker' },
            { label: 'Online exam software', href: '/online-exam-software' },
            { label: 'Exam software for schools', href: '/exam-software-for-schools' },
            { label: 'Online tests for coaching', href: '/online-test-for-coaching' },
            { label: 'Online proctoring software', href: '/online-proctoring-software' },
            { label: 'Assessment platform', href: '/assessment-platform' },
        ],
    },
    {
        title: 'Platform',
        links: [
            { label: 'Pricing and plans', href: '/pricing' },
            { label: 'Auto-grading software', href: '/auto-grading-software' },
            { label: 'Quiz creator', href: '/quiz-creator' },
            { label: 'Browse tests', href: '/more-tests' },
            { label: 'Convert a paper', href: '/convert' },
            { label: 'User guide', href: '/user-guide' },
        ],
    },
    {
        title: 'Company',
        links: [
            { label: 'About TestoZa', href: '/about' },
            { label: 'Blog', href: '/blog' },
            { label: 'News and updates', href: '/news' },
            { label: 'Support', href: '/support' },
            { label: 'Privacy policy', href: '/privacy-policy' },
            { label: 'Terms and conditions', href: '/terms-and-conditions' },
        ],
    },
] as const;

/** Primary navigation. Pricing is present — the live navbar omits it (audit C3). */
export const NAV_LINKS = [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Compare', href: '#compare' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'FAQ', href: '#faq' },
] as const;
