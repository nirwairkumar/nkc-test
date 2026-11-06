/**
 * The user guide (testoza.com/user-guide/*) as plain data: every page's title and
 * description, and the full text of the how-to pages.
 *
 * Dependency-free on purpose (no React, no '@/' imports, no browser globals):
 *  - pages/UserGuidePage.tsx renders the sidebar, titles and the step-by-step pages from it;
 *  - the SEO worker (infrastructure/cloudflare-worker/worker.js) bundles it and serves the
 *    same text as HTML, with JSON-LD, to search engines and AI assistants.
 *
 * Why: until November 2026 every /user-guide page reached ChatGPT, Bing, Perplexity and
 * Gemini as the homepage's marketing text (title "TestoZa User Guide & Tutorials", body
 * "generate quizzes from … YouTube videos"). Asked "how do I conduct a test on TestoZa?",
 * ChatGPT stitched an answer together from marketing guides, mixed up the test link and the
 * exam room, made batches look compulsory, linked no pages and showed other companies'
 * screenshots. This file is the answer they should read. Keep it true to the product: when a
 * button is renamed, change it here and the page and the crawlers change together.
 *
 * HTML in the strings below is limited to <strong>, <em>, <code> and <a href>, written here,
 * never user input.
 */

export const SITE = 'https://testoza.com';
export const APP = 'https://app.testoza.com';

export interface DocImage {
    /** Path under testoza.com, e.g. /user-guide/results/panel.webp */
    src: string;
    alt: string;
    width: number;
    height: number;
    caption?: string;
}

export interface DocStep {
    /** Anchor id on the page. */
    id: string;
    title: string;
    /** Paragraphs (inline HTML allowed, see the header). */
    body: string[];
    list?: { ordered?: boolean; items: string[] };
    /** Paragraphs after the list. */
    after?: string[];
    tip?: { title: string; text: string };
    /** The page where this step happens (used as the HowTo step url). */
    url?: string;
    image?: DocImage;
}

export interface DocItem {
    slug: string;
    title: string;
    description: string;
    /** Title for search results and the browser tab, when it should differ from `${title} – TestoZa Docs`. */
    seoTitle?: string;
    /** YYYY-MM-DD, shown to crawlers as dateModified. */
    updated: string;
}

export interface DocGroup {
    title: string;
    items: DocItem[];
}

// ─── Sidebar: every page, in order ──────────────────────────────────────────────

export const DOC_GROUPS: DocGroup[] = [
    {
        title: 'Start with TestoZa',
        items: [
            {
                slug: 'quick-start',
                title: 'Quick Start: Conduct a Test',
                seoTitle: 'How to Conduct an Online Test on TestoZa: Quick Start',
                description: 'Conduct an online test on TestoZa, step by step: make it from a PDF, photos or by typing, tap Conduct exam, share the link or a 6-digit join code, then read the results.',
                updated: '2026-11-06',
            },
            {
                slug: 'intro',
                title: 'Introduction',
                description: 'Get started with the TestoZa question creator and doc formatting tools.',
                updated: '2026-11-06',
            },
            {
                slug: 'bulk-test-upload',
                title: 'Bulk Test Upload',
                description: 'Learn how to format and upload massive tests in bulk using JSON formats.',
                updated: '2026-10-01',
            },
            {
                slug: 'solution-upload-guide',
                title: 'Solution Upload Guide',
                description: 'Learn how to format and bulk upload detailed step-by-step solutions for tests.',
                updated: '2026-10-01',
            },
            {
                slug: 'ai-test-generation',
                title: 'AI Test Generation',
                description: 'Understand how to harness AI models to auto-generate complete tests from text, PDFs or images.',
                updated: '2026-11-06',
            },
        ],
    },
    {
        title: 'Platform Overview',
        items: [
            {
                slug: 'live-exam-sessions',
                title: 'Live Exams with a Join Code',
                description: 'Let candidates join with a 6-digit code: a quick code for any live exam, or a full exam room with candidate lists, PINs, a live monitor, rank lists and report cards.',
                updated: '2026-11-06',
            },
            {
                slug: 'conduct-exam',
                title: 'Conduct Exams',
                description: 'Step-by-step guide with screenshots on how to activate, configure, and conduct exams on TestoZa.',
                updated: '2026-11-06',
            },
            {
                slug: 'view-results-guide',
                title: 'Understanding Results',
                description: 'Read every number on the Results panel, the Full report and All submissions: who wrote, ranks, each answer sheet, what to teach again, and the Excel file.',
                updated: '2026-11-02',
            },
        ],
    },
    {
        title: 'Free PDF Tools',
        items: [
            {
                slug: 'pdf-tools',
                title: 'Panna PDF Tools',
                description: 'Edit PDF text in its own font, erase for real, sign, and turn ChatGPT or LaTeX maths into a PDF. Free, and your file never leaves your device.',
                updated: '2026-11-01',
            },
        ],
    },
    {
        title: 'JSON Schema Reference',
        items: [
            { slug: 'schema-flat', title: 'Standard Test Format', description: 'Complete JSON reference for single-section flat tests.', updated: '2026-10-01' },
            { slug: 'schema-section', title: 'Section-wise Format', description: 'JSON format schema for JEE, NEET and multiple sections exams with attempt controls.', updated: '2026-10-01' },
            { slug: 'schema-solutions', title: 'Solutions JSON Format', description: 'JSON format reference for mapping detailed answers and explanations to question IDs.', updated: '2026-10-01' },
        ],
    },
    {
        title: 'Formatting & Syntax',
        items: [
            { slug: 'chemistry-notation', title: 'Chemistry (mhchem)', description: 'Chemical equations, redox reactions, equilibrium arrows, radioactive decays, skeletal organic structures.', updated: '2026-10-01' },
            { slug: 'notation-math', title: 'Mathematics (KaTeX)', description: 'Definite integrals, summations, fractions, limits, matrices, binomial equations.', updated: '2026-10-01' },
            { slug: 'notation-tables', title: 'Tables & LaTeX Arrays', description: 'Convert visual grids and matrix equations into professional KaTeX arrays.', updated: '2026-10-01' },
            { slug: 'notation-matching', title: 'Match Column System', description: 'Format double list column match questions using LaTeX array formatting.', updated: '2026-10-01' },
        ],
    },
    {
        title: 'AI Extractor Prompts',
        items: [
            { slug: 'ai-prompt-guide', title: 'AI OCR Parsing Prompt', description: 'Complete prompts and backslash escape instructions for Gemini / ChatGPT parsers.', updated: '2026-10-01' },
            { slug: 'prompt-sections', title: 'Multi-Section OCR Prompt', description: 'Optimized prompt for extracting multi-section papers with marking overrides.', updated: '2026-10-01' },
            { slug: 'prompt-solutions', title: 'Solutions OCR Prompt', description: 'Specialized prompt to OCR scan step-by-step solutions.', updated: '2026-10-01' },
        ],
    },
];

export const DOC_ITEMS: DocItem[] = DOC_GROUPS.flatMap((g) => g.items);

const INTRO_SEO_TITLE = 'How to Create a Test Online – TestoZa User Guide for Teachers';
const INTRO_SEO_DESCRIPTION =
    'Step-by-step guide on how to create a test online using TestoZa. Learn to make exams, quizzes, and mock tests with our free online test creator for teachers. Covers AI generation, bulk upload, and LaTeX formatting.';

/** '' and old names → the page's current slug; null for a slug that has no page. */
export function resolveDocSlug(slug: string | undefined | null): string | null {
    if (!slug) return 'intro';
    if (slug === 'json-test-upload-guide') return 'bulk-test-upload';
    return DOC_ITEMS.some((i) => i.slug === slug) ? slug : null;
}

export function docItem(slug: string): DocItem | undefined {
    return DOC_ITEMS.find((i) => i.slug === slug);
}

export function docGroupTitle(slug: string): string {
    return DOC_GROUPS.find((g) => g.items.some((i) => i.slug === slug))?.title || 'Getting Started';
}

/** The page title without the site suffix (the SEO component adds " | TestoZa"). */
export function docSeoTitle(slug: string): string {
    if (slug === 'intro') return INTRO_SEO_TITLE;
    const item = docItem(slug);
    if (!item) return 'TestoZa User Guide';
    return item.seoTitle || `${item.title} – TestoZa Docs`;
}

export function docSeoDescription(slug: string): string {
    if (slug === 'intro') return INTRO_SEO_DESCRIPTION;
    return docItem(slug)?.description || INTRO_SEO_DESCRIPTION;
}

/** Canonical URL. The introduction is the user guide's front page. */
export function docUrl(slug: string): string {
    return slug === 'intro' ? `${SITE}/user-guide` : `${SITE}/user-guide/${slug}`;
}

// ─── Pictures ───────────────────────────────────────────────────────────────────

const RESULTS_PANEL: DocImage = {
    src: '/user-guide/results/panel.webp',
    width: 1343,
    height: 1090,
    alt: 'TestoZa Results panel: exam status, Full report button, Started, Writing now, Submitted and Dropped counts, Rank switch, search, Excel, average, highest and lowest marks, and each candidate’s answer sheet',
};
const RANK_LIST: DocImage = {
    src: '/user-guide/results/report-ranklist.webp',
    width: 1087,
    height: 780,
    alt: 'TestoZa rank list after an online test: Everyone and Below 40% filters, search by name or roll number, marks, percentage, right, wrong and left counts, and time taken',
};

// Current screens (captured 6 Nov 2026 from the demo educator account; demo data only).
// File names and alt text say what the picture shows, so image search can match
// "TestoZa live exam join code" to TestoZa's own screen.
const QS = '/user-guide/screens';
const SHOT_GENERATE: DocImage = {
    src: `${QS}/testoza-generate-with-ai-upload-pdf-or-photos.webp`, width: 1056, height: 660,
    alt: 'TestoZa Generate with AI: Upload Question Paper, Notes or Chapter (PDF or photos) with Choose File, or Create Test Manually',
};
const SHOT_TEST_CARD: DocImage = {
    src: `${QS}/testoza-my-tests-card-conduct-exam.webp`, width: 539, height: 347,
    alt: 'A test card in TestoZa My Tests with the Edit, Preview and Conduct exam buttons',
};
const SHOT_CONDUCT: DocImage = {
    src: `${QS}/testoza-conduct-online-exam-start-conducting.webp`, width: 600, height: 777,
    alt: 'TestoZa Conduct Online Exam window: the exam’s secure private link and the Start Conducting button',
};
const SHOT_SETTINGS: DocImage = {
    src: `${QS}/testoza-test-environment-settings-anti-cheating.webp`, width: 1344, height: 1215,
    alt: 'TestoZa Test Environment Settings: Force Full Screen, Tab/App Switch Detection with a warning limit, Disable Copy/Paste and Right Click, Save Settings',
};
const SHOT_LIVE: DocImage = {
    src: `${QS}/testoza-live-exam-link-join-code-qr.webp`, width: 1593, height: 591,
    alt: 'A live exam in TestoZa: exam link with Copy link and Share, a 6-digit join code for testoza.com/join, Candidate inputs, Settings, Results, Stop exam and a scan-to-share QR code',
};
const SHOT_EXAMS: DocImage = {
    src: `${QS}/testoza-exams-run-exam-with-6-digit-code.webp`, width: 1476, height: 576,
    alt: 'TestoZa Exams page: run an exam with a code in three steps (pick a paper and a time, show the 6-digit code, watch and share results) and the New exam button',
};
const SHOT_JOIN: DocImage = {
    src: `${QS}/testoza-join-exam-6-digit-code-phone.webp`, width: 780, height: 1406,
    alt: 'A candidate’s phone at testoza.com/join: Join your exam, six boxes for the 6-digit code, Continue, and See your result',
};

// ─── Quick start: conduct a test ────────────────────────────────────────────────

export interface QuickStart {
    intro: string[];
    ways: { name: string; when: string; how: string }[];
    linkSteps: DocStep[];
    roomSteps: DocStep[];
    candidateSteps: string[];
    notSupported: string[];
    faqs: { q: string; a: string }[];
}

const a = (href: string, text: string) => `<a href="${href}">${text}</a>`;

export const QUICK_START: QuickStart = {
    intro: [
        `This is the short version: from an empty account to a marked rank list. Everything happens in a web browser on a phone or a computer, and the people taking your test (TestoZa calls them <strong>candidates</strong>) need no app and no account.`,
        `There are two ways to run a test. Start with the first one; move to the second when you run the same paper for several batches or send results to parents.`,
    ],
    ways: [
        {
            name: 'A test link',
            when: 'Class tests, homework, practice, a quick live test.',
            how: `${a(`${APP}/my-tests`, 'My Tests')} → <strong>Conduct exam</strong> → share the link (or add a 6-digit join code).`,
        },
        {
            name: 'An exam room',
            when: 'A mock at a fixed time with a lobby, a Start button, roll number + PIN check-in and a rank list per batch.',
            how: `${a(`${APP}/exams`, 'Exams')} → <strong>New exam</strong> → candidates type the code at ${a(`${SITE}/join`, 'testoza.com/join')}.`,
        },
    ],
    linkSteps: [
        {
            id: 'sign-in',
            title: 'Sign in',
            url: `${APP}/login`,
            body: [
                `Open ${a(`${APP}/login`, 'app.testoza.com/login')} and continue with Google, or sign up with your email and a password. The first time, choose <strong>Educator</strong> (or Institution) as your role.`,
            ],
        },
        {
            id: 'make-the-test',
            title: 'Make the test',
            url: `${APP}/generate-with-ai`,
            body: ['Pick whichever matches what you already have:'],
            list: {
                items: [
                    `<strong>A PDF or photos of a paper, notes or a chapter:</strong> open ${a(`${APP}/generate-with-ai`, 'Generate with AI')} and choose the file (PDF, PNG, JPG or WEBP; save Word and PowerPoint files as PDF first). <strong>Extract Questions</strong> keeps an existing paper’s questions, options and answer key exactly; <strong>Generate New Questions</strong> writes new ones from a chapter or notes. Review the questions, set any answer marked orange, then press <strong>Save &amp; continue</strong>. Details: ${a(`${SITE}/user-guide/ai-test-generation`, 'AI Test Generation')}.`,
                    `<strong>Typing or pasting:</strong> open ${a(`${APP}/create-test`, 'Create test')}. Add questions (single correct, multiple correct or a numerical answer), set marks and negative marks, sections and the timer. <strong>Fill from photo</strong> on a question reads one printed or handwritten question from a picture.`,
                    `<strong>Hundreds of questions at once:</strong> upload a JSON file (${a(`${SITE}/user-guide/bulk-test-upload`, 'Bulk Test Upload')}).`,
                ],
            },
            image: SHOT_GENERATE,
        },
        {
            id: 'check-it',
            title: 'Check it in My Tests',
            url: `${APP}/my-tests`,
            body: [
                `Open ${a(`${APP}/my-tests`, 'My Tests')} from the sidebar. Each test card has <strong>Edit</strong>, <strong>Preview</strong> and <strong>Conduct exam</strong> (and <strong>Results</strong> once someone has taken it). Press <strong>Preview</strong> to see the paper exactly as candidates will, and <strong>Edit</strong> to change anything.`,
            ],
            image: SHOT_TEST_CARD,
        },
        {
            id: 'go-live',
            title: 'Press Conduct exam, then Start Conducting',
            url: `${APP}/my-tests`,
            body: [
                `On the test’s card press <strong>Conduct exam</strong>. A window shows the exam’s own link; press <strong>Start Conducting</strong>. The test is now live and moves to the top of My Tests.`,
            ],
            image: SHOT_CONDUCT,
        },
        {
            id: 'set-the-rules',
            title: 'Set the rules in Settings',
            url: `${APP}/my-tests`,
            body: [`On the live exam press <strong>Settings</strong> (Test Environment Settings), then <strong>Save Settings</strong>:`],
            list: {
                items: [
                    '<strong>Proctoring &amp; Security:</strong> full screen, app-switch (tab-switch) detection with a warning limit, copy and paste off.',
                    '<strong>Access &amp; Control:</strong> one attempt per candidate, and <strong>Candidate inputs</strong>, the details asked before the test starts (name, roll number, phone and so on).',
                    '<strong>Results &amp; Timing:</strong> when candidates see their result and answer key, and a strict server-side timer.',
                ],
            },
            after: ['Until you turn the exam rules on, the card shows an amber <strong>Anti-cheating is off</strong> button as a reminder.'],
            image: SHOT_SETTINGS,
        },
        {
            id: 'share',
            title: 'Share the link, or a 6-digit join code',
            url: `${APP}/my-tests`,
            body: [
                `Press <strong>Share link</strong> on the live exam to send it to your class group on WhatsApp (on a computer the whole message is copied), or let them scan the QR code beside it.`,
                `Prefer a code? In the exam’s ••• menu choose <strong>Get a join code</strong>. Candidates open ${a(`${SITE}/join`, 'testoza.com/join')}, type the six digits and land on the same exam. The code stops working when you stop the exam.`,
            ],
            image: SHOT_LIVE,
        },
        {
            id: 'candidates-write',
            title: 'Candidates take the test',
            body: [
                'They open the link (or type the code), fill in the details you asked for and start. Answers are marked automatically from your answer key, and the paper submits itself when the time runs out.',
            ],
            image: SHOT_JOIN,
        },
        {
            id: 'results',
            title: 'Watch the results come in',
            url: `${APP}/my-tests`,
            body: [
                `Press <strong>Results</strong> on the exam. The panel counts who has <strong>Started</strong>, who is <strong>Writing now</strong>, who has <strong>Submitted</strong> and who <strong>Dropped</strong>, and refreshes itself every 30 seconds while it is open. Turn on <strong>Rank</strong> for the merit list, open any candidate’s answer sheet, or download <strong>Excel</strong>. <strong>Full report</strong> shows how the class did, the questions to teach again and a rank list to send on WhatsApp. Details: ${a(`${SITE}/user-guide/view-results-guide`, 'Understanding Results')}.`,
            ],
            image: RESULTS_PANEL,
        },
        {
            id: 'stop',
            title: 'Stop the exam',
            url: `${APP}/my-tests`,
            body: [
                `Press <strong>Stop exam</strong> and choose <strong>Stop &amp; Make Public</strong> (candidates can review the paper and results, and it stays open for practice) or <strong>Stop &amp; Make Private</strong> (no further access; results and analysis hidden from candidates). The results stay saved under Ended exams.`,
            ],
        },
    ],
    roomSteps: [
        {
            id: 'room-batch',
            title: 'Optional: make a batch',
            url: `${APP}/batches`,
            body: [
                `Only needed for roll-number check-in or an absent list. Open ${a(`${APP}/batches`, 'Batches')}, press <strong>New batch</strong>, then <strong>Add candidates</strong>: paste roll number, name and parent phone columns from Excel, upload an Excel or CSV file, or add them one by one. For mocks that go to parents, open <strong>PINs</strong> and press <strong>Make PINs</strong> to print a slip with a 4-digit PIN for every candidate.`,
            ],
        },
        {
            id: 'room-create',
            title: 'Create the exam',
            url: `${APP}/exams`,
            body: [
                `Open ${a(`${APP}/exams`, 'Exams')} and press <strong>New exam</strong> (or <strong>Give with a join code</strong> from a test’s menu on your dashboard). Only two things are needed: the question paper and when it starts. <strong>More options</strong> holds the rest, with safe defaults: no batch, name check-in, 15 minutes of late entry, results when the exam ends.`,
                `Press <strong>Create exam</strong>. You get the 6-digit code, a QR code and a WhatsApp message ready to send.`,
            ],
            image: SHOT_EXAMS,
        },
        {
            id: 'room-start',
            title: 'On exam day, open the room',
            body: [
                `Open the exam and press <strong>Projector</strong>: the code, the QR code and the names of candidates who have joined fill the screen, without marks. Candidates wait in the lobby. With <strong>On time</strong> the exam starts by itself; with <strong>I tap Start</strong>, press <strong>Start exam now</strong> and every candidate gets a Start button at the same moment.`,
            ],
        },
        {
            id: 'room-monitor',
            title: 'Watch it live',
            body: [
                'The <strong>Candidates</strong> tab refreshes every few seconds and lifts anyone who needs a look to the top: no signal, warnings, a changed device. Give one candidate (or everyone) more time, end one candidate’s paper, or issue a new PIN. A candidate whose phone dies joins again on any device with the same details; saved answers come back and the timer carries on.',
            ],
        },
        {
            id: 'room-results',
            title: 'End the exam and send results',
            body: [
                'Press <strong>End exam</strong>, or let it close on time; unfinished papers are submitted with their last saved answers. The <strong>Results</strong> tab has the rank list (<strong>Send rank list</strong> on WhatsApp), an Excel file, a WhatsApp message for each parent, printable report cards and a re-test with a new code for absentees.',
            ],
            image: RANK_LIST,
        },
    ],
    candidateSteps: [
        `Open the link from the teacher, or go to ${a(`${SITE}/join`, 'testoza.com/join')} and type the 6-digit code.`,
        'Type the details asked for: a name, a roll number, or a roll number and PIN.',
        'In an exam room, wait in the lobby until the exam starts.',
        'Answer, using Save &amp; Next, Mark for review and the question palette, then submit. The paper submits itself when time is up.',
        `See the result on the same page once it is released, or later at ${a(`${SITE}/join/result`, 'testoza.com/join/result')} with the same code and details.`,
    ],
    notSupported: [
        'Camera, microphone or screen-recording proctoring. Exam rules work in the browser: full screen (not on iPhone), app-switch detection, copy and paste off.',
        'Making a test from a YouTube video. The AI reads PDFs and pictures (PNG, JPG, WEBP).',
        'Uploading Word or PowerPoint files directly: save them as PDF first.',
        'Marking written (descriptive) answers. Question types are single correct, multiple correct (with optional partial marks) and numerical answers, exact or within a range.',
        'A mobile app or an offline mode. TestoZa runs in the browser.',
    ],
    faqs: [
        {
            q: 'Do candidates need an account or an app?',
            a: 'No. They open the link or type the 6-digit code at testoza.com/join, enter their name (or the details you asked for) and start, on any phone or computer with a browser.',
        },
        {
            q: 'What is the difference between Conduct exam and New exam?',
            a: 'Conduct exam (in My Tests) puts one test live behind a link, optionally with a join code; candidates can start whenever they open it. New exam (in Exams) creates an exam room for one sitting: a start time, a lobby, check-in by name, roll number or roll number + PIN, a live monitor and a rank list for that batch. The same paper can be used for many exam rooms.',
        },
        {
            q: 'Do I have to make a batch first?',
            a: 'No. Batches are optional. Without one, candidates check in with their name. Make a batch when you want roll-number or PIN check-in, an absent list or WhatsApp messages to parents.',
        },
        {
            q: 'How do I add negative marking?',
            a: 'Each question has a Marks and a Wrong field (for example +4 and −1) in the test builder; you can set them once for a section or a whole test. Partial marks for multiple-correct questions are Proportional or JEE Advanced.',
        },
        {
            q: 'Where do I see the answers each candidate gave?',
            a: 'Results → tap a candidate to open their answer sheet: every question, their answer, the right answer and the time they spent.',
        },
    ],
};

// ─── Conduct Exams (the link flow, with screenshots) ────────────────────────────

export const CONDUCT_EXAM_STEPS: DocStep[] = [
    {
        id: 'step-1',
        title: 'Access Your Dashboard & Creator Area',
        url: `${APP}/my-tests`,
        body: ['Open <strong>My Tests</strong> from the sidebar (or from the menu under your name in the top bar).'],
        list: { items: ['You will land on <strong>My Tests</strong>.', 'You will find all the tests you have created so far.'] },
        image: { src: '/user-guide/conduct-exams/step-1.png', width: 537, height: 420, alt: 'Step 1: Go to My Tests' },
    },
    {
        id: 'step-2',
        title: 'Choose the Test to Conduct',
        url: `${APP}/my-tests`,
        body: [
            'Find the test-card of the exam that you are going to conduct among your candidates.',
            'Click on the <strong>Conduct exam</strong> button of the test-card.',
        ],
        tip: {
            title: 'Verify Before Conducting',
            text: 'You can click on "Preview" to see your final live test view to recheck questions, options, timing, and sections. If you want to make changes, click "Edit" on the test card.',
        },
        image: SHOT_TEST_CARD,
    },
    {
        id: 'step-3',
        title: 'Activate the Test & Get Unlisted Link',
        body: [
            'A popup window will open where you can view and copy the unlisted link of the test card.',
            'Select <strong>Start Conducting</strong> to activate the test.',
        ],
        image: SHOT_CONDUCT,
    },
    {
        id: 'step-4',
        title: 'Manage the Active Exam Mode',
        body: ['Now your test is live and accessible via the unique link. The live exam card gives you these controls:'],
        list: {
            ordered: true,
            items: [
                '<strong>Settings</strong>: Apply proctoring, schedules, and custom settings.',
                '<strong>Results</strong>: View responses submitted under Active Exam mode.',
                '<strong>Share link</strong>: Send the exam link (or let candidates scan its QR code). <strong>Get a join code</strong> in the ••• menu adds a 6-digit code for testoza.com/join.',
                '<strong>Stop exam</strong>: Stop the exam.',
            ],
        },
        after: ['Click on <strong>Settings</strong> to configure the exam environment.'],
        image: SHOT_LIVE,
    },
    {
        id: 'step-5',
        title: 'Configure Proctoring & Security',
        body: [
            'You will land on the <strong>Test Environment Settings</strong> panel.',
            'Choose your desired proctoring preferences (e.g. Full Screen, Tab Switch Detection).',
            'Click on the <strong>Access &amp; Control</strong> section header to view more configurations.',
        ],
        image: SHOT_SETTINGS,
    },
    {
        id: 'step-6',
        title: 'Customize Access & Student Verification',
        body: [
            'Turn on the <strong>Attempt Limit</strong> toggles to restrict students to a single attempt.',
            'Turn on <strong>Candidate inputs</strong> to ask for details (e.g. Name, Roll No) before the exam starts. You can also edit them straight from a live exam’s card on My Tests.',
            'Now expand the <strong>Results &amp; Timing</strong> section header.',
        ],
        image: { src: '/user-guide/conduct-exams/step-6.png', width: 867, height: 541, alt: 'Step 6: Customize Access & Verification' },
    },
    {
        id: 'step-7',
        title: 'Enable Server-Side Timer & Save Settings',
        body: [
            'Under the Results &amp; Timing configurations, activate <strong>Server side timing</strong> and disable <strong>Flexible Timer</strong> to enforce a strict, synchronized countdown.',
            'Click the <strong>Save Settings</strong> button at the bottom of the panel to apply your proctoring and timing rules.',
        ],
        image: { src: '/user-guide/conduct-exams/step-7.png', width: 877, height: 558, alt: 'Step 7: Enforce Timer & Save' },
    },
    {
        id: 'step-8',
        title: 'Distribute Exam Link',
        body: [
            'Press <strong>Share link</strong> on the live exam and send it to your candidates via messaging apps or email.',
            'You can monitor student submissions in real-time by clicking the <strong>Results</strong> tab/button.',
        ],
        image: { src: '/user-guide/conduct-exams/step-8.png', width: 456, height: 162, alt: 'Step 8: Distribute Link' },
    },
    {
        id: 'step-9',
        title: 'Deactivate or Conclude the Exam',
        body: [
            'To stop accepting candidate responses, click <strong>Stop exam</strong> on the live exam. This takes the test out of Active Exam mode.',
            'You will be prompted with two closure modes:',
        ],
        list: {
            ordered: true,
            items: [
                '<strong>Stop &amp; Make Public</strong>: Allows candidates to analyze the exam and results; anonymous practice will be enabled.',
                '<strong>Stop &amp; Make Private</strong>: Restricts all further student access. Results and analysis are hidden from candidates.',
            ],
        },
        after: ['After selecting either option, your test will return to the inactive state.'],
        image: { src: '/user-guide/conduct-exams/step-9.png', width: 382, height: 307, alt: 'Step 9: Conclude Exam' },
    },
];

// ─── AI Test Generation ─────────────────────────────────────────────────────────

export const AI_GENERATION_INTRO =
    'The AI test generator turns a PDF or photos (PNG, JPG or WEBP) into a test. Save Word and PowerPoint files as PDF first. You need to be signed in.';

export const AI_GENERATION_STEPS: string[] = [
    `Open ${a(`${APP}/generate-with-ai`, 'Generate with AI')} and choose your file. Add an answer key if you have one.`,
    'Pick the language (same as the material, English, Hindi or both), the difficulty and any instructions such as marks or the number of questions.',
    'Choose <strong>Extract Questions</strong> to keep an existing paper exactly, or <strong>Generate New Questions</strong> to write new ones from a chapter or notes.',
    'Watch the questions arrive, then review them. Set any answer marked orange before you save.',
    'Press <strong>Save &amp; continue</strong>, or <strong>Edit</strong> to fine-tune the test in the builder first.',
];

// ─── Crawler copies of the two long docs (React: components/docs/*.tsx) ─────────
// These two pages are hand-built React with diagrams, so their text is kept here as a
// plain copy for crawlers. When you change LiveExamSessionsGuide.tsx or ResultsGuide.tsx,
// change the matching section below.

interface TextSection {
    h: string;
    p?: string[];
    list?: string[];
    ordered?: boolean;
    image?: DocImage;
}

const LIVE_EXAM_SECTIONS: TextSection[] = [
    {
        h: 'The quick way: a code for a live test',
        p: [
            'Already started a test as an online exam? Give it a code in two taps. Nothing else changes: same paper, same settings, same results page.',
        ],
        list: [
            'On your dashboard under <strong>Live now</strong>, or in <strong>My Tests</strong>, open the live exam’s ••• menu and press <strong>Get a join code</strong>.',
            'A new line appears under the exam link. The WhatsApp message now carries the code too.',
            `Write it on the board or say it out loud. Candidates open ${a(`${SITE}/join`, 'testoza.com/join')}, type it and land on the same exam page as the link.`,
        ],
        ordered: true,
        image: SHOT_LIVE,
    },
    {
        h: 'Quick code or exam room?',
        list: [
            'A code instead of a long link: both.',
            'Nothing to set up: quick code.',
            'Same paper for many batches with separate rank lists: exam room.',
            'Lobby, start together, live monitor, more time: exam room.',
            'Roll number + PIN check-in and an absent list: exam room.',
            'Rank list, report cards, results to parents: exam room.',
        ],
        p: ['Start with the quick code. Move to exam rooms when you run the same paper for several batches or send results to parents. Batches and PINs are optional extras.'],
    },
    {
        h: 'Three words to know',
        list: [
            '<strong>Question paper:</strong> a test you made in TestoZa, with its questions, marks and sections. You write it once.',
            '<strong>Exam:</strong> one time a batch sits that paper. It has its own code, start time, check-in rule and rank list. The same paper can be sat many times.',
            '<strong>Batch:</strong> a class or timing with a candidate list, like “JEE 2027 – Morning”. Optional, but lets candidates check in by roll number and shows you who was absent.',
        ],
    },
    {
        h: '1. Make a batch and add candidates',
        p: [`Open ${a(`${APP}/batches`, 'Batches')} in the menu, tap <strong>New batch</strong>, then <strong>Add candidates</strong>. Three ways:`],
        list: [
            '<strong>Paste</strong>: copy the roll-number, name and phone columns from Excel and paste.',
            '<strong>Excel / CSV</strong>: upload the sheet. Columns named “Roll No”, “Name” and “Parent Phone” are found automatically.',
            '<strong>One by one</strong>: for a new admission.',
        ],
    },
    {
        h: '2. Give candidates PINs (optional)',
        p: [
            'For mocks that go to parents, candidates check in with their roll number and a 4-digit PIN, the way JEE and NEET computer-based tests ask for an application number and password. On the batch page tap <strong>PINs</strong> → <strong>Make PINs</strong> and print the slips, three across an A4 sheet.',
            'PINs are shown only once, on the slips. TestoZa stores only a scrambled copy. If a candidate loses a slip, tap <strong>New PIN</strong> next to their name.',
        ],
    },
    {
        h: '3. Create the exam',
        p: [
            `Open ${a(`${APP}/exams`, 'Exams')} and tap <strong>New exam</strong> (or <strong>Give with a join code</strong> from a test’s menu on your dashboard). Only two things are needed: the question paper and when it starts. Everything else sits under <strong>More options</strong> with safe defaults (no batch, name check-in, 15 min late entry, results when the exam ends).`,
            `Tap <strong>Create exam</strong> and get the code, a QR code and a WhatsApp message ready to send: open testoza.com/join, enter the code, type your roll number and the PIN on your slip.`,
        ],
        image: SHOT_EXAMS,
    },
    {
        h: '4. On exam day',
        list: [
            'Open the exam and tap <strong>Projector</strong>. The code, QR code and the names of candidates who have joined fill the screen. No marks are shown on it.',
            'Candidates see “You’re in” and a countdown, or “Waiting for your examiner to start”. You see how many are in the lobby.',
            'With <strong>On time</strong> the exam starts by itself. With <strong>I tap Start</strong>, tap <strong>Start exam now</strong> and every candidate gets a Start button at the same moment. Their timer begins when they tap it.',
        ],
    },
    {
        h: '5. Watch the exam live',
        list: [
            'The <strong>Candidates</strong> tab refreshes every few seconds; anyone who needs a look comes to the top.',
            '<strong>More time</strong>: for one candidate (power cut, phone trouble) or for everyone still writing. It reaches their screen within 20 seconds.',
            '<strong>End for them</strong>: their screen submits by itself with whatever they have answered.',
            '<strong>Changed device</strong>: the candidate joined again from another phone with the same roll number (and PIN). Saved answers come back and the timer carries on.',
            '<strong>New PIN</strong>: tap it on their row and read it out; the old one stops working.',
            '“Warnings” count leaving full screen or switching apps, using the anti-cheating settings of the paper.',
        ],
    },
    {
        h: '6. Results, rank list and report cards',
        p: ['When the exam closes (or you tap <strong>End exam</strong>), anyone who started but never submitted has their last saved answers submitted for them. The Results tab shows:'],
        list: [
            'Average, highest and lowest marks, and the class average for each section.',
            'The rank list. Equal marks share a rank; fewer wrong answers, then fewer skipped, then less time break ties.',
            '<strong>Copy rank list / Send on WhatsApp</strong>: a ready message with medals for the top three and the absent candidates at the end.',
            '<strong>Excel</strong>: every candidate with section marks, time taken and warnings.',
            '<strong>Parent</strong>: a WhatsApp message to that candidate’s parent with marks, rank and section marks.',
            '<strong>Report cards</strong>: one A4 page per candidate with your institute’s logo, marks, rank, section table, strong and weak topics and a remark.',
            '<strong>Re-test for absentees</strong>: the same paper with a new code. Candidates who already sat it can’t join.',
        ],
        image: RANK_LIST,
    },
    {
        h: 'What candidates see',
        list: [
            'Six boxes for the code, with the phone’s number pad. No account, no email, no OTP.',
            'The exam name, your institute, time and number of questions, then name / roll number / PIN — whatever you chose.',
            '“You’re in”, a countdown or “Waiting for your examiner”, and how many have joined.',
            'The normal TestoZa exam screen, in full screen if your paper asks for it. Answers are saved to the server every 20 seconds.',
            `“Submitted”, then their marks, rank and section marks once results are released — also later at ${a(`${SITE}/join/result`, 'testoza.com/join/result')} (See your result).`,
        ],
        image: SHOT_JOIN,
    },
    {
        h: 'What TestoZa enforces for you',
        list: [
            'The database refuses a second submission for the same candidate in a sitting.',
            'With “when the exam ends”, nobody sees the answer key or results while others are still writing.',
            'Countdowns use TestoZa’s clock, so a phone set to the wrong time changes nothing. Nobody can write after the closing time.',
            'A code works only while its exam is open, and guessing is rate-limited.',
            'Scores are worked out by TestoZa from the answer key, never taken from the candidate’s phone.',
            'Late or offline submissions within 15 minutes are accepted and marked late; unsent answers are collected at the end.',
        ],
    },
];

const RESULTS_SECTIONS: TextSection[] = [
    {
        h: 'Where your results live',
        p: ['Three pages, three jobs. Use the <strong>Results panel</strong> while the exam runs (My Tests → Results), the <strong>Full report</strong> to plan your next class (panel → Full report), and <strong>All submissions</strong> to see how the batch moves over weeks (sidebar → All Submissions).'],
    },
    {
        h: 'Open the Results panel',
        p: [
            'In My Tests, press <strong>Results</strong> on a live exam, or on an exam under Ended exams (finished exams move there and their results stay saved). You can also find Results in a test’s ••• menu, and on your Dashboard a live exam has its own card.',
            'The panel works during a live exam too. While it is open and on screen it refreshes itself every 30 seconds.',
        ],
        image: { src: '/user-guide/results/open-results.webp', width: 1400, height: 484, alt: 'TestoZa My Tests, Ended exams: each exam has a Results button' },
    },
    {
        h: 'The Results panel at a glance',
        list: [
            'Exam status: Live now, Opens at a time (scheduled) or Exam ended, then the number of questions, total marks and minutes.',
            '<strong>Full report</strong>: the whole-class analysis, once at least one candidate has submitted.',
            'The four counts — <strong>Started</strong>, <strong>Writing now</strong>, <strong>Submitted</strong> and <strong>Dropped</strong> — are also tabs.',
            '<strong>Rank</strong>: off = newest submission first; on = sorted by merit.',
            '<strong>Search, Refresh, Excel</strong>: Excel downloads exactly what the table shows.',
            'Average, highest and lowest marks of the candidates in the table.',
            '<strong>Submitted</strong> filter: only the results from one day. Tests not run as a live exam also get a Mode filter (Public, Unlisted, Private).',
            '<strong>Answer sheet</strong>: one candidate’s full result — every question, their answer and the time spent.',
            '<strong>Delete</strong>: removes that result so the candidate can take the test again. It can’t be undone.',
        ],
        image: RESULTS_PANEL,
    },
    {
        h: 'Started, writing, submitted, dropped',
        p: [
            'Every candidate who opens the exam is counted once. Started = Writing now + Submitted + Dropped. During a live exam, someone in Dropped for a minute may just have a weak signal; once the exam has ended, Dropped is your list of candidates to check on.',
        ],
        image: { src: '/user-guide/results/panel-dropped.webp', width: 1343, height: 920, alt: 'TestoZa Results panel, Dropped tab: four candidates with how many questions they answered and why they dropped' },
    },
    {
        h: 'How ranks are decided',
        list: ['More marks.', 'Then fewer wrong answers.', 'Then fewer left blank.', 'Then submitted first (Results panel only).'],
        ordered: true,
        p: ['The Full report uses the first three rules only, so candidates still level share a rank: 1, 2, 2, 4.'],
    },
    {
        h: 'Filters and the Excel file',
        p: [
            'The Submitted (and Mode) filters change the table, the average, highest and lowest, the ranks and the Excel file; the four counts always count everyone. The Full report has its own Excel button with two sheets: Rank list and Questions (right, partly right, wrong, left blank, % right and the most-picked wrong option for every question).',
        ],
    },
    {
        h: 'One candidate’s answer sheet',
        p: ['Tap the chart icon on a row in the panel, or a name in the Full report’s rank list. It opens that candidate’s copy, marked: start and submit time, candidate inputs, marks, correct, wrong, partial and skipped, a breakdown by subject, and every question with the time spent.'],
        image: { src: '/user-guide/results/answer-sheet.webp', width: 1346, height: 1000, alt: 'TestoZa candidate answer sheet: start and submit time, candidate inputs, total marks, correct, wrong, partial, skipped and a breakdown by subject' },
    },
    {
        h: 'The Full report',
        p: [
            'Open it with <strong>Full report</strong> in the panel, or by tapping an exam in All submissions. While the exam is live it updates itself every 45 seconds; tries from your own account are not counted.',
        ],
        list: [
            'How the marks spread: candidates in each 20% band (red below 40%, amber 40–59%, green 60% and above).',
            'In plain words: who came first, how many need help, and the hardest question.',
            'Teach these again: questions fewer than half got right, hardest first (up to five).',
            'By section: the share of answers that were right in each section.',
            'The rank list, for everyone or only those below 40%, with Send rank list, Copy, Excel and Print.',
            'Question by question: green right, blue partly right, red wrong, grey left blank, in paper order or hardest first.',
        ],
        image: { src: '/user-guide/results/report.webp', width: 1400, height: 971, alt: 'TestoZa Full report: Send rank list, Copy, Excel and Print; how the class did; how the marks spread; teach these again; by section; and the rank list' },
    },
    {
        h: 'All submissions: the long view',
        p: ['Open <strong>All Submissions</strong> from the sidebar. It lists every exam your candidates wrote, newest first, with averages and below-40% counts. Tap one to open its Full report.'],
        image: { src: '/user-guide/results/all-submissions.webp', width: 1400, height: 966, alt: 'TestoZa All submissions: weekly mocks with their averages, below-40% counts and coloured bars' },
    },
    {
        h: 'A five-minute routine after every exam',
        list: [
            'Full report → how the class did: is the paper fair, and is the batch together?',
            'Send rank list, then pick your class group in WhatsApp.',
            'Teach these again: that is your discussion class, five questions, not twenty.',
            'Check Dropped in the panel: they didn’t finish at all.',
            'Download Excel from the panel or the report.',
        ],
        ordered: true,
    },
];

// ─── Crawler HTML and JSON-LD (used by the SEO worker) ──────────────────────────

const esc = (s: string) =>
    s.replace(/&(?!(?:amp|lt|gt|quot|#\d+|#x[0-9a-f]+);)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Text without tags, for JSON-LD. */
const plain = (html: string) =>
    html
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();

const abs = (src: string) => (src.startsWith('http') ? src : `${SITE}${src}`);

function figureHtml(img: DocImage): string {
    const cap = img.caption || img.alt;
    return `<figure><img src="${esc(abs(img.src))}" alt="${esc(img.alt)}" width="${img.width}" height="${img.height}" loading="lazy" decoding="async"><figcaption>${esc(cap)}</figcaption></figure>`;
}

function listHtml(items: string[], ordered?: boolean): string {
    const tag = ordered ? 'ol' : 'ul';
    return `<${tag}>${items.map((i) => `<li>${i}</li>`).join('')}</${tag}>`;
}

function stepHtml(step: DocStep, n: number, level: 'h2' | 'h3' = 'h3'): string {
    return [
        `<section id="${step.id}">`,
        `<${level}>Step ${n}: ${esc(step.title)}</${level}>`,
        ...step.body.map((p) => `<p>${p}</p>`),
        step.list ? listHtml(step.list.items, step.list.ordered) : '',
        ...(step.after || []).map((p) => `<p>${p}</p>`),
        step.tip ? `<p><strong>${esc(step.tip.title)}:</strong> ${esc(step.tip.text)}</p>` : '',
        step.image ? figureHtml(step.image) : '',
        '</section>',
    ].join('');
}

function textSectionsHtml(sections: TextSection[]): string {
    return sections
        .map((s) =>
            [
                `<h2>${esc(s.h)}</h2>`,
                ...(s.p || []).map((p) => `<p>${p}</p>`),
                s.list ? listHtml(s.list, s.ordered) : '',
                s.image ? figureHtml(s.image) : '',
            ].join('')
        )
        .join('\n');
}

/** Every docs page as a list of links: the sidebar a reader sees on every page. */
function docsNavHtml(current: string): string {
    return `<nav aria-label="User guide"><h2>All TestoZa docs</h2>${DOC_GROUPS.map(
        (g) =>
            `<h3>${esc(g.title)}</h3><ul>${g.items
                .map((i) =>
                    i.slug === current
                        ? `<li><strong>${esc(i.title)}</strong>: ${esc(i.description)}</li>`
                        : `<li><a href="${docUrl(i.slug)}">${esc(i.title)}</a>: ${esc(i.description)}</li>`
                )
                .join('')}</ul>`
    ).join('')}</nav>`;
}

function quickStartBodyHtml(): string {
    const q = QUICK_START;
    return [
        ...q.intro.map((p) => `<p>${p}</p>`),
        '<h2>Two ways to run a test</h2>',
        `<ul>${q.ways.map((w) => `<li><strong>${esc(w.name)}</strong> — ${esc(w.when)} ${w.how}</li>`).join('')}</ul>`,
        '<h2>Way 1: conduct a test with a link</h2>',
        q.linkSteps.map((s, i) => stepHtml(s, i + 1)).join('\n'),
        '<h2>Way 2: an exam room with a join code, lobby and rank list</h2>',
        q.roomSteps.map((s, i) => stepHtml(s, i + 1)).join('\n'),
        '<h2>What candidates do</h2>',
        listHtml(q.candidateSteps, true),
        '<h2>What TestoZa does not do</h2>',
        listHtml(q.notSupported.map(esc)),
        '<h2>Questions</h2>',
        q.faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join(''),
    ].join('\n');
}

function introBodyHtml(): string {
    return [
        '<p>Welcome to the TestoZa Creator Documentation. Whether you are creating competitive exams like JEE/NEET, academic mock papers, or custom student assessments, this guide will help you build and format your content efficiently.</p>',
        `<p><strong>New to TestoZa?</strong> <a href="${docUrl('quick-start')}">Quick Start: conduct your first online test</a> takes you from an empty account to a marked rank list in nine steps, with the exact buttons to press.</p>`,
        '<p><strong>No-Code Test Creation:</strong> You do not need to write raw JSON schemas or LaTeX syntax manually. You can copy our optimized AI prompts, drop your PDFs or handwritten notes into ChatGPT/Gemini, and paste the generated questions directly into TestoZa.</p>',
    ].join('\n');
}

function pdfToolsBodyHtml(): string {
    const tools: [string, string, string][] = [
        ['https://pdf.testoza.com/edit-pdf', 'Edit PDF', 'Change existing text in the PDF’s own font, erase for real, sign, highlight and organise pages.'],
        ['https://pdf.testoza.com/edit-hindi-pdf', 'Edit Hindi PDF', 'Edit Hindi forms and documents with matras and conjuncts shaped correctly, and keep the text searchable.'],
        ['https://pdf.testoza.com/latex-to-pdf', 'LaTeX to PDF', 'Paste a LaTeX document or maths and download a clean, paged PDF with selectable text.'],
        ['https://pdf.testoza.com/chatgpt-to-pdf', 'ChatGPT to PDF', 'Save ChatGPT, Gemini or Claude answers as a PDF with every equation intact.'],
    ];
    return [
        '<p>Panna is TestoZa’s free set of PDF tools at <a href="https://pdf.testoza.com/">pdf.testoza.com</a>. It edits the existing text of a PDF in the document’s own font, deletes erased text from the file, and turns ChatGPT, Gemini or LaTeX maths into a clean PDF. Everything runs in your browser, so files are never uploaded, and there’s no sign-up or watermark.</p>',
        '<h2>The tools</h2>',
        `<ul>${tools.map(([h, t, d]) => `<li><a href="${h}">${t}</a>: ${esc(d)}</li>`).join('')}</ul>`,
    ].join('\n');
}

function docBodyHtml(slug: string): string {
    switch (slug) {
        case 'quick-start':
            return quickStartBodyHtml();
        case 'intro':
            return introBodyHtml();
        case 'conduct-exam':
            return CONDUCT_EXAM_STEPS.map((s, i) => stepHtml(s, i + 1, 'h2')).join('\n');
        case 'ai-test-generation':
            return [`<p>${AI_GENERATION_INTRO}</p>`, listHtml(AI_GENERATION_STEPS, true)].join('\n');
        case 'live-exam-sessions':
            return [
                '<p>Let candidates join with a 6-digit code at testoza.com/join: a quick code for any live exam, or a full exam room with candidate lists, PINs, a live monitor, rank lists and report cards.</p>',
                textSectionsHtml(LIVE_EXAM_SECTIONS),
            ].join('\n');
        case 'view-results-guide':
            return textSectionsHtml(RESULTS_SECTIONS);
        case 'pdf-tools':
            return pdfToolsBodyHtml();
        default:
            return `<p>${esc(docSeoDescription(slug))}</p><p>The full reference, with examples you can copy, opens in your browser on this page.</p>`;
    }
}

/** The whole page as plain HTML for <main>: what a reader without JavaScript (or an AI crawler) gets. */
export function docCrawlerHtml(slug: string): string {
    const item = docItem(slug);
    const title = slug === 'intro' ? 'TestoZa User Guide' : item?.title || 'TestoZa User Guide';
    return [
        `<nav aria-label="Breadcrumb"><a href="${SITE}/">TestoZa</a> › <a href="${SITE}/user-guide">User guide</a>${slug === 'intro' ? '' : ` › ${esc(title)}`}</nav>`,
        '<article>',
        `<h1>${esc(title)}</h1>`,
        `<p><em>${esc(docSeoDescription(slug))}</em></p>`,
        docBodyHtml(slug),
        item ? `<p>Last updated ${esc(item.updated)}.</p>` : '',
        '</article>',
        docsNavHtml(slug),
        `<p><a href="${APP}/login">Sign in to TestoZa</a> · <a href="${SITE}/join">Join an exam with a code</a> · <a href="${SITE}/guides">Guides</a> · <a href="${APP}/help">Help</a></p>`,
    ].join('\n');
}

/** The pictures on a page, for the image sitemap and og:image. */
export function docImages(slug: string): DocImage[] {
    switch (slug) {
        case 'quick-start':
            return [...QUICK_START.linkSteps, ...QUICK_START.roomSteps].flatMap((s) => (s.image ? [s.image] : []));
        case 'conduct-exam':
            return CONDUCT_EXAM_STEPS.flatMap((s) => (s.image ? [s.image] : []));
        case 'live-exam-sessions':
            return LIVE_EXAM_SECTIONS.flatMap((s) => (s.image ? [s.image] : []));
        case 'view-results-guide':
            return RESULTS_SECTIONS.flatMap((s) => (s.image ? [s.image] : []));
        default:
            return [];
    }
}

const ORG = {
    '@type': 'Organization',
    '@id': `${SITE}/#organization`,
    name: 'TestoZa',
    url: `${SITE}/`,
    logo: { '@type': 'ImageObject', url: `${SITE}/logo-testoza-square.png`, width: 1000, height: 1000 },
};

function howToSteps(steps: DocStep[], base: string) {
    return steps.map((s, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: s.title,
        text: plain([...s.body, ...(s.list ? s.list.items : []), ...(s.after || [])].join(' ')),
        url: `${base}#${s.id}`,
        ...(s.image ? { image: abs(s.image.src) } : {}),
    }));
}

/** One JSON-LD graph: TechArticle, HowTo where the page is a procedure, FAQPage, BreadcrumbList. */
export function docJsonLd(slug: string) {
    const url = docUrl(slug);
    const item = docItem(slug);
    const images = docImages(slug).map((i) => abs(i.src));
    const graph: Record<string, unknown>[] = [
        {
            '@type': 'TechArticle',
            '@id': `${url}#article`,
            headline: docSeoTitle(slug),
            description: docSeoDescription(slug),
            url,
            inLanguage: 'en',
            ...(item ? { dateModified: item.updated } : {}),
            ...(images.length ? { image: images } : {}),
            author: { '@id': `${SITE}/#organization` },
            publisher: { '@id': `${SITE}/#organization` },
            isPartOf: { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'TestoZa', url: `${SITE}/` },
            about: { '@type': 'SoftwareApplication', name: 'TestoZa', applicationCategory: 'EducationalApplication', operatingSystem: 'Web browser', url: `${SITE}/` },
        },
        ORG,
        {
            '@type': 'BreadcrumbList',
            '@id': `${url}#breadcrumb`,
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'TestoZa', item: `${SITE}/` },
                { '@type': 'ListItem', position: 2, name: 'User guide', item: `${SITE}/user-guide` },
                ...(slug === 'intro' ? [] : [{ '@type': 'ListItem', position: 3, name: item?.title || slug, item: url }]),
            ],
        },
    ];
    if (slug === 'quick-start') {
        graph.push({
            '@type': 'HowTo',
            '@id': `${url}#howto`,
            name: 'How to conduct an online test on TestoZa',
            description: docSeoDescription(slug),
            tool: [{ '@type': 'HowToTool', name: 'A phone or computer with a web browser' }],
            step: howToSteps(QUICK_START.linkSteps, url),
        });
        graph.push({
            '@type': 'FAQPage',
            '@id': `${url}#faq`,
            mainEntity: QUICK_START.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        });
    }
    if (slug === 'conduct-exam') {
        graph.push({ '@type': 'HowTo', '@id': `${url}#howto`, name: 'How to conduct an exam on TestoZa with a link', step: howToSteps(CONDUCT_EXAM_STEPS, url) });
    }
    if (slug === 'ai-test-generation') {
        graph.push({
            '@type': 'HowTo',
            '@id': `${url}#howto`,
            name: 'How to make a test from a PDF or photos with TestoZa AI',
            step: AI_GENERATION_STEPS.map((t, i) => ({ '@type': 'HowToStep', position: i + 1, text: plain(t) })),
        });
    }
    return { '@context': 'https://schema.org', '@graph': graph };
}
