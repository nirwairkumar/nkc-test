/**
 * The four "alternative" guides share one page shell, four widgets and this file:
 *
 *   /classplus-alternative   /teachmint-alternative
 *   /kahoot-alternative      /testportal-alternative
 *
 * One AltRival here is one page. The React widgets (pages/guides/alt/AltWidgets.tsx)
 * and the crawler text (the fallbackHtml in each guide file) are both built from it,
 * so what a reader clicks and what Google reads can never drift apart.
 *
 * Plain, dependency-free TypeScript, like the rest of src/guides: the Cloudflare worker
 * imports it too. No React, no '@/…' imports, no browser APIs. Icons are named here as
 * strings and mapped to Lucide components in AltWidgets.tsx.
 *
 * Every claim about another company was checked against that company's own pages on
 * 10 October 2026 and is written to stay true as prices change: where a figure is only
 * published by resellers and listing sites, this file says so instead of quoting it.
 * Sources are listed in each guide's `sources`.
 */

export type RivalKey = 'classplus' | 'teachmint' | 'kahoot' | 'testportal';

/** One row of the hero's transfer card. */
export interface AltSwapRow {
    icon: string;
    label: string;
}

/** A toggle in the "what do you use it for" widget. */
export interface AltUse {
    id: string;
    label: string;
    icon: string;
    tone: string;
    /** `core`: what the other product is really for. `exam`: the testing part. */
    kind: 'core' | 'exam';
}

export type Verdict = 'none' | 'keep' | 'split' | 'switch';

/** One theme of the side-by-side widget. */
export interface AltTheme {
    id: string;
    label: string;
    question: string;
    them: string[];
    us: string[];
    takeaway: string;
}

/** A step of the "move one paper across" checklist. */
export interface AltStep {
    id: string;
    title: string;
    detail: string;
    minutes: number;
}

/** How the other product scores an answer, in the marking widget. */
export interface AltScoring {
    /** Tile heading, e.g. "Kahoot points". */
    label: string;
    /**
     * `speed`   points fall as the clock runs (Kahoot's own formula)
     * `plain`   one mark for right, nothing off for wrong
     * `points`  a fixed number of points for right, nothing off for wrong
     */
    kind: 'speed' | 'plain' | 'points';
    /** Points a correct answer is worth at best. */
    best: number;
    /** Seconds on the clock, for `speed`. */
    seconds?: number;
    /** Under the number: why it is that number. */
    rightWhy: string;
    wrongWhy: string;
}

export interface AltRival {
    key: RivalKey;
    /** The product's name, as people type it. */
    name: string;
    /** What the product is, in one clause. Used in headings and the widget captions. */
    is: string;
    /** The hero's transfer card. */
    swap: {
        keepLabel: string;
        keep: AltSwapRow[];
        moveLabel: string;
        move: AltSwapRow[];
        foot: string;
    };
    /** Four numbers under the headline. `small` is set in a smaller type beside the number. */
    stats: { dt: string; dd: string; small?: string }[];
    /** Line under the byline: what the facts were checked against. */
    checked: string;
    uses: AltUse[];
    verdicts: Record<Verdict, { title: string; text: string }>;
    themes: AltTheme[];
    scoring: AltScoring;
    steps: AltStep[];
}

/**
 * The marking schemes in the widget. Partial marks are a separate idea (one or more
 * correct options), so the lab keeps to one correct answer and the text covers the rest.
 */
export const SCHEMES = [
    // `label` is the chip on a phone, so it stays short; `full` is what the result reads.
    { id: 'jee', label: 'JEE', full: 'JEE Main', right: 4, wrong: 1, note: 'Every wrong tick costs a quarter of a right one.' },
    { id: 'neet', label: 'NEET', full: 'NEET', right: 4, wrong: 1, note: '180 questions, so a guessing habit costs tens of marks.' },
    { id: 'ssc', label: 'SSC', full: 'SSC Tier 1', right: 2, wrong: 0.5, note: 'Each section has its own 15 minutes in the 2026 pattern.' },
    { id: 'bank', label: 'IBPS', full: 'IBPS prelims', right: 1, wrong: 0.25, note: 'A quarter mark off, and marks like 0.857 in some sections.' },
    { id: 'none', label: 'School', full: 'School test', right: 1, wrong: 0, note: 'No penalty: the usual school and college paper.' },
] as const;

export type Scheme = (typeof SCHEMES)[number];

/** A mark as it reads on a report card: 3, 3.5, −0.25. */
export const mark = (n: number) => {
    const s = Math.abs(n) % 1 === 0 ? String(Math.abs(n)) : String(Math.round(Math.abs(n) * 1000) / 1000);
    return n < 0 ? `−${s}` : s;
};

/** Kahoot's own formula: 1 − (answer time ÷ time limit) ÷ 2, times the points possible. */
export const speedPoints = (secondsLeft: number, limit: number, best: number) => {
    const used = Math.max(0, Math.min(limit, limit - secondsLeft));
    return Math.round((1 - used / limit / 2) * best);
};

/** The question in the marking widget: the same one on all four pages, so the scoring is the only variable. */
export const LAB_QUESTION = {
    subject: 'Physics · Question 7 of 30',
    text: 'A body of mass 2 kg moving at 3 m s⁻¹ is brought to rest in 0.5 s. What is the average force on it?',
    options: [
        { key: 'A', text: '6 N' },
        { key: 'B', text: '12 N' },
        { key: 'C', text: '1.5 N' },
        { key: 'D', text: '3 N' },
    ],
    correct: 'B',
} as const;

// ── /classplus-alternative ──────────────────────────────────────────────────

const CLASSPLUS: AltRival = {
    key: 'classplus',
    name: 'Classplus',
    is: 'an app-and-business platform for coaching institutes',
    swap: {
        keepLabel: 'Needs a platform like Classplus',
        keep: [
            { icon: 'smartphone', label: 'Your own branded app on Play Store' },
            { icon: 'shopping-cart', label: 'Selling courses and batches online' },
            { icon: 'wallet', label: 'Fee collection, instalments, reminders' },
            { icon: 'video', label: 'Live and recorded lectures in the app' },
        ],
        moveLabel: 'Only needs a test platform',
        move: [
            { icon: 'clipboard-list', label: 'Weekly and chapter tests' },
            { icon: 'timer', label: 'Full mocks with +4/−1 marking' },
            { icon: 'list-ordered', label: 'Rank lists and report cards' },
            { icon: 'sparkles', label: 'Papers made from a PDF or a photo' },
        ],
        foot: 'If everything you tick is on the right, you are paying for an app to run tests.',
    },
    stats: [
        { dt: 'To start a test', dd: '0', small: 'setup fees' },
        { dt: 'Student app installs', dd: '0' },
        { dt: 'Share of your fees taken', dd: '0', small: '%' },
        { dt: 'Join code', dd: '6', small: 'digits' },
    ],
    checked: 'Classplus facts checked against its own website and public listings',
    uses: [
        { id: 'app', label: 'Your own app, with your name on it', icon: 'smartphone', tone: 'blue', kind: 'core' },
        { id: 'sell', label: 'Selling courses or batches online', icon: 'shopping-cart', tone: 'pink', kind: 'core' },
        { id: 'fees', label: 'Fees, instalments and receipts', icon: 'wallet', tone: 'green', kind: 'core' },
        { id: 'live', label: 'Live classes and recorded lectures', icon: 'video', tone: 'purple', kind: 'core' },
        { id: 'notice', label: 'Notices and parent messages', icon: 'messages-square', tone: 'teal', kind: 'core' },
        { id: 'weekly', label: 'Weekly or chapter tests', icon: 'clipboard-list', tone: 'blue', kind: 'exam' },
        { id: 'mocks', label: 'Full mocks with negative marking', icon: 'timer', tone: 'red', kind: 'exam' },
        { id: 'ranks', label: 'Rank lists, report cards, analysis', icon: 'list-ordered', tone: 'indigo', kind: 'exam' },
    ],
    verdicts: {
        none: { title: 'Switch on what you use', text: 'Tick what your institute actually opens in a normal week. The answer appears here.' },
        keep: {
            title: 'Keep the app platform',
            text: 'Your app, your course sales and your fee collection are the product you bought, and a test platform replaces none of them. If the price is the problem, compare app builders against each other, not against an exam tool.',
        },
        split: {
            title: 'Keep the app. Move the tests.',
            text: 'The common answer for a growing institute. Courses, fees and lectures stay where your students already are; tests move to software built for exam patterns, and you put the test link or the join code inside your own app.',
        },
        switch: {
            title: 'You are paying for an app to run tests',
            text: 'Everything you ticked is testing. An app, a storefront and a fee module are overhead for that, and they come with a yearly contract. A test platform does this part properly for a fraction of it.',
        },
    },
    themes: [
        {
            id: 'price',
            label: 'What it costs',
            question: 'What do you pay, and when do you find out?',
            them: [
                'No price on the website: you fill a form and a salesperson calls back with a quote.',
                'Reseller and listing sites put the annual figure anywhere between ₹8,000 and ₹50,000, some mentioning a setup fee and a share of what you sell. None of this is published by the company, so your quote is your own.',
                'Priced as a yearly platform contract, not per test.',
            ],
            us: [
                'The price list is a page on the site: ₹49 for 7 days, ₹149 for 30 days, ₹799 for a year.',
                'Building tests, running live exams, marking and rank lists cost nothing.',
                'No setup fee, no commission on your fees, nothing to negotiate.',
            ],
            takeaway: 'A quote you cannot see before a sales call is hard to compare. Decide what the testing part is worth to you first, then judge the quote on the rest.',
        },
        {
            id: 'questions',
            label: 'Getting questions in',
            question: 'You have last year’s paper as a PDF. How long until it is a test?',
            them: [
                'Questions are typed into the test module, or imported in the format the platform supports.',
                'Diagrams, equations and tables usually go in as images.',
                'A teacher’s evening, per paper, is the usual cost.',
            ],
            us: [
                'Upload the PDF or photograph the page: the AI reads questions, options, the answer key, diagrams and equations.',
                'Hindi, English or both, kept the way your material is written.',
                'You check the questions once in the builder and it is live.',
            ],
            takeaway: 'The real cost of a test platform is not the subscription. It is how many teacher-hours a paper takes to get in.',
        },
        {
            id: 'examday',
            label: 'Exam day',
            question: 'Sunday, 10 a.m., 120 students, one batch. What happens?',
            them: [
                'Students open your app, sign in with the account you created, and find the test.',
                'Anyone whose login has gone missing is a phone call during the exam.',
                'The app has to be installed on every student’s phone first.',
            ],
            us: [
                'Candidates go to testoza.com/join, type a six-digit code and check in by roll number: no account, no install.',
                'You see a lobby fill up, press Start, and watch who is writing, who has submitted and who left the screen.',
                '+5 or +10 minutes for one candidate, or more time for everyone still writing.',
            ],
            takeaway: 'Every login is a support call waiting to happen. A code and a roll number remove the whole category.',
        },
        {
            id: 'marking',
            label: 'Marking',
            question: 'Can it mark the way your exam marks?',
            them: [
                'Tests are auto-checked, which is the point of putting them online.',
                'How far the marking bends to an exam pattern — negative marks per question, partial credit, sections with their own time — depends on the module, and is worth demanding in the demo.',
            ],
            us: [
                'Marks and Wrong are two numbers on every question card: +4 and −1, +2 and −0.5, +1 and −0.25.',
                'Partial marks on multiple-correct questions, proportional or JEE Advanced style.',
                'Numerical answers accepted as a range, sections with their own clock.',
            ],
            takeaway: 'If a mock does not mark like the real paper, the rank list it produces is fiction, and students learn the wrong habits.',
        },
        {
            id: 'lockin',
            label: 'Leaving',
            question: 'What happens to your work if you stop paying?',
            them: [
                'Your students know your institute through an app that the platform publishes and hosts.',
                'Courses, recordings and the student list live inside it; ask in writing what you can export and in what format before you sign.',
            ],
            us: [
                'Results download as Excel, report cards print as PDF, rank lists copy out as text or go on WhatsApp.',
                'Your questions stay yours, and the test link is a web page: nothing to uninstall.',
            ],
            takeaway: 'Ask the exit question at the start, not when you are annoyed. The answer tells you what the contract is really about.',
        },
    ],
    scoring: {
        label: 'Plain right/wrong',
        kind: 'plain',
        best: 1,
        rightWhy: 'One mark for a correct answer, which is what a quiz module gives you unless you can set a penalty.',
        wrongWhy: 'Nothing off for a wrong answer: a guess is free, so students guess.',
    },
    steps: [
        { id: 'pick', title: 'Pick one paper you have already used', detail: 'Last Sunday’s test, with its answer key. Not a new paper: this is a dress rehearsal, so the content should be settled.', minutes: 2 },
        { id: 'import', title: 'Upload the PDF or photograph it', detail: 'The AI reads questions, options, the key, diagrams and equations. One paper, one upload.', minutes: 4 },
        { id: 'check', title: 'Read the questions once', detail: 'Fix anything the AI misread, set Marks and Wrong — +4 and −1 if that is your pattern — and the duration.', minutes: 8 },
        { id: 'roll', title: 'Paste the batch from Excel or WhatsApp', detail: 'Roll number, name, parent’s phone if you want report cards to go home. A paste is enough.', minutes: 3 },
        { id: 'run', title: 'Give the batch the six-digit code', detail: 'On the board, in your app, in the batch group. They join at testoza.com/join. Press Start when the lobby is full.', minutes: 3 },
    ],
};

// ── /teachmint-alternative ──────────────────────────────────────────────────

const TEACHMINT: AltRival = {
    key: 'teachmint',
    name: 'Teachmint',
    is: 'a school platform now built around classroom hardware',
    swap: {
        keepLabel: 'Needs a school platform',
        keep: [
            { icon: 'monitor', label: 'Interactive panels in classrooms' },
            { icon: 'user-check', label: 'Attendance registers for a school' },
            { icon: 'wallet', label: 'Fees, admissions, receipts' },
            { icon: 'file-text', label: 'Term report cards and records' },
        ],
        moveLabel: 'Only needs a test platform',
        move: [
            { icon: 'clipboard-list', label: 'Unit tests and weekly tests' },
            { icon: 'timer', label: 'Entrance-pattern mocks' },
            { icon: 'smartphone', label: 'Practice on a student’s own phone' },
            { icon: 'list-ordered', label: 'Rank lists and per-question analysis' },
        ],
        foot: 'A panel in the classroom and a paper on exam day are two different purchases.',
    },
    stats: [
        { dt: 'Hardware to buy', dd: '0' },
        { dt: 'Demo calls to book', dd: '0' },
        { dt: 'Works on a ₹7,000 phone', dd: 'Yes' },
        { dt: 'Price, published', dd: '₹799', small: '/year' },
    ],
    checked: 'Teachmint facts checked against teachmint.com as it stood on 10 October 2026',
    uses: [
        { id: 'panel', label: 'Interactive panels or classroom devices', icon: 'monitor', tone: 'indigo', kind: 'core' },
        { id: 'attend', label: 'Attendance for every class, every day', icon: 'user-check', tone: 'green', kind: 'core' },
        { id: 'fees', label: 'Fees, admissions and receipts', icon: 'wallet', tone: 'orange', kind: 'core' },
        { id: 'records', label: 'Term report cards and school records', icon: 'file-text', tone: 'blue', kind: 'core' },
        { id: 'parents', label: 'Parent app and notices', icon: 'messages-square', tone: 'teal', kind: 'core' },
        { id: 'unit', label: 'Unit tests and weekly tests', icon: 'clipboard-list', tone: 'blue', kind: 'exam' },
        { id: 'mocks', label: 'Entrance-pattern mocks with negative marking', icon: 'timer', tone: 'red', kind: 'exam' },
        { id: 'practice', label: 'Practice tests students take at home', icon: 'smartphone', tone: 'purple', kind: 'exam' },
    ],
    verdicts: {
        none: { title: 'Switch on what you use', text: 'Tick what your school or institute runs on it today. The answer appears here.' },
        keep: {
            title: 'Keep the school platform',
            text: 'Attendance, fees, admissions and report cards are an administration system, and no exam tool replaces one. Compare it with other school ERPs, and keep the testing question separate.',
        },
        split: {
            title: 'Keep the records. Move the exams.',
            text: 'Attendance and fees stay in the school system. Tests move to software that marks the way entrance exams mark, and the marks come back as a spreadsheet for your report cards.',
        },
        switch: {
            title: 'You are using a school system for its quiz',
            text: 'Everything you ticked is testing. You do not need panels, an admissions module or a parent app to run a test — you need a paper, a clock and marking that matches your exam.',
        },
    },
    themes: [
        {
            id: 'product',
            label: 'What it is now',
            question: 'What are you actually buying in 2026?',
            them: [
                'Its own homepage leads with Teachmint X, an “AI-Powered Connected Classroom® Device”: interactive panels at 65, 75 and 86 inches, with Vision X for managing them across campuses.',
                'Software sits around that hardware: a connected-classroom platform that automates attendance, EduAI with a quiz and homework generator, clickers for the room.',
                'There is no published price. The page asks you to book a demo.',
            ],
            us: [
                'A website you open in a browser. Nothing to install, nothing to mount on a wall.',
                'Built for one job: building papers, running exams, marking them and reading the result.',
                'Prices are on the pricing page, and building and running tests is free.',
            ],
            takeaway: 'A company that leads with hardware is selling to schools that are fitting out rooms. If you are a coaching institute whose students have phones, you are not that buyer.',
        },
        {
            id: 'questions',
            label: 'Getting questions in',
            question: 'Where do the questions come from?',
            them: [
                'A quiz generator can produce questions, and teachers can write them.',
                'What happens to your own PDFs, printed papers and handwritten sheets is the question to ask in the demo.',
            ],
            us: [
                'Upload a PDF or a photo of a printed or handwritten page and the AI reads the questions, the options, the key, the diagrams and the equations.',
                'Or write them in the builder with an on-screen keyboard for integrals, vectors and chemical equations.',
                'Hindi typed with English letters, if that is faster for you.',
            ],
            takeaway: 'Generated questions are useful for revision. Your own question bank, typed and proofed over years, is the thing that must move.',
        },
        {
            id: 'examday',
            label: 'Exam day',
            question: 'How does a batch of 90 sit the same paper at the same time?',
            them: [
                'Through the school platform, with the student and parent apps, and accounts your office creates.',
                'Which assumes a school: a roll of enrolled students, classes, sections, an office that keeps accounts tidy.',
            ],
            us: [
                'A six-digit code at testoza.com/join. The candidate types it, checks in by name or roll number, and waits in a lobby.',
                'You press Start. The live list shows who is writing, how many questions they have answered, and who has left the exam screen.',
                'Papers submit themselves when the time runs out, and answers are saved to the server every 20 seconds, so a dead phone is not a lost paper.',
            ],
            takeaway: 'Exam day is the only day of the month where software either saves you or embarrasses you. Try it with one batch before you trust it with the series.',
        },
        {
            id: 'marking',
            label: 'Marking and results',
            question: 'What does the result tell a teacher?',
            them: [
                'Automated grading and progress reports, in the shape a school needs: a term, a subject, a report card.',
                'Good for a school year. Less suited to “was Q14 badly worded or badly taught?”',
            ],
            us: [
                'Rank list for the batch as papers come in, with the class average, highest and lowest.',
                'Per-question numbers: how many answered it, how many got it right, how long they spent, which option they fell for.',
                'Report cards to print, Excel to download, a WhatsApp message to a parent that you send yourself.',
            ],
            takeaway: 'A term grade tells a parent how a child is doing. A per-question breakdown tells a teacher what to do on Monday.',
        },
        {
            id: 'together',
            label: 'Using both',
            question: 'Can you keep the school system and still run exams elsewhere?',
            them: ['Yes. It is the normal arrangement, and nothing stops you linking out of it.'],
            us: [
                'Put the test link or the join code wherever your students already look: your app, the notice board, the batch group.',
                'Download results as Excel and type or import the totals into your school records.',
                'There is no LTI or ERP integration, so the handover is a spreadsheet. Say so out loud before you plan around it.',
            ],
            takeaway: 'Two tools that each do one job well, joined by a spreadsheet, beat one tool that half-does both.',
        },
    ],
    scoring: {
        label: 'Plain right/wrong',
        kind: 'plain',
        best: 1,
        rightWhy: 'One mark for a correct answer: the default in a quiz module built for classroom use.',
        wrongWhy: 'Nothing off for a wrong answer, so a blind guess is better than a blank.',
    },
    steps: [
        { id: 'pick', title: 'Pick last term’s unit test', detail: 'One paper you have already set and marked by hand, with its key. You will compare the two.', minutes: 2 },
        { id: 'import', title: 'Upload it, or photograph the printed sheet', detail: 'The AI reads it: questions, options, key, diagrams. Handwritten sheets work too.', minutes: 4 },
        { id: 'check', title: 'Set the marks and the clock', detail: 'Marks and Wrong per question, the duration, and sections if the paper has them. Read the questions once.', minutes: 8 },
        { id: 'roll', title: 'Paste the class list', detail: 'Roll number and name from your register, parents’ numbers if you want report cards sent home.', minutes: 3 },
        { id: 'run', title: 'Run it in one period', detail: 'Code on the board, students join at testoza.com/join, you press Start. The rank list is ready before the bell.', minutes: 3 },
    ],
};

// ── /kahoot-alternative ─────────────────────────────────────────────────────

const KAHOOT: AltRival = {
    key: 'kahoot',
    name: 'Kahoot',
    is: 'a game-based quiz tool for the energy of a live classroom',
    swap: {
        keepLabel: 'Kahoot is better at this',
        keep: [
            { icon: 'party-popper', label: 'Energy in the room, music, a podium' },
            { icon: 'zap', label: 'Five-minute revision games' },
            { icon: 'users', label: 'Icebreakers and training sessions' },
            { icon: 'smile', label: 'Making a dull chapter fun' },
        ],
        moveLabel: 'An exam platform is better at this',
        move: [
            { icon: 'timer', label: 'A 3-hour paper with a real clock' },
            { icon: 'minus-circle', label: 'Negative marking and partial credit' },
            { icon: 'list-ordered', label: 'Rank lists and per-question analysis' },
            { icon: 'file-text', label: 'Report cards parents can read' },
        ],
        foot: 'Keep both. Use the one that matches what the lesson is for.',
    },
    stats: [
        { dt: 'Points for answering fast', dd: '0' },
        { dt: 'Players in a free game', dd: '10', small: 'on Kahoot' },
        { dt: 'Candidates in one exam', dd: 'A batch' },
        { dt: 'Negative marking', dd: 'Yes' },
    ],
    checked: 'Kahoot’s scoring and plan limits checked against Kahoot’s own help centre and pricing pages',
    uses: [
        { id: 'energy', label: 'Energy and competition in the room', icon: 'party-popper', tone: 'pink', kind: 'core' },
        { id: 'revision', label: 'Quick revision at the end of a class', icon: 'zap', tone: 'orange', kind: 'core' },
        { id: 'ice', label: 'Icebreakers, training, team sessions', icon: 'users', tone: 'purple', kind: 'core' },
        { id: 'homework', label: 'Fun homework challenges', icon: 'smile', tone: 'teal', kind: 'core' },
        { id: 'weekly', label: 'Weekly tests that go on a record', icon: 'clipboard-list', tone: 'blue', kind: 'exam' },
        { id: 'mocks', label: 'Full mocks with negative marking', icon: 'timer', tone: 'red', kind: 'exam' },
        { id: 'ranks', label: 'Rank lists and report cards', icon: 'list-ordered', tone: 'indigo', kind: 'exam' },
        { id: 'analysis', label: 'Per-question analysis after the test', icon: 'bar-chart-3', tone: 'green', kind: 'exam' },
    ],
    verdicts: {
        none: { title: 'Switch on what you use', text: 'Tick what you open Kahoot for. The answer appears here, and it is often “keep it”.' },
        keep: {
            title: 'Keep Kahoot',
            text: 'Everything you ticked is what Kahoot is for, and it is very good at it. An exam platform would make those five minutes worse, not better. Stay where you are.',
        },
        split: {
            title: 'Keep Kahoot for the room. Test somewhere else.',
            text: 'The honest answer for most teachers. Kahoot for the last ten minutes of a class, an exam platform for the paper that goes on a record. They are different jobs and the same students benefit from both.',
        },
        switch: {
            title: 'You are using a game for an exam',
            text: 'Everything you ticked is assessment: marks that count, negative marking, ranks, analysis. Speed-scored game points cannot produce that, and students learn to answer fast rather than carefully.',
        },
    },
    themes: [
        {
            id: 'scoring',
            label: 'How answers score',
            question: 'What is a correct answer worth?',
            them: [
                'Up to 1000 points for a correct answer on a single-select question, and up to 500 points per correct answer on multi-select — but the number falls with every second the player takes.',
                'Kahoot’s own worked example: answer correctly in 2 seconds on a 30-second timer and you score 967 of 1000.',
                'Its help centre says the speed reduction cannot be switched off in live games; Accuracy mode, which scores only on correctness, is the way round it. Streak bonuses add more points on top.',
            ],
            us: [
                'A correct answer is worth the marks you typed on the question. Nothing else moves it.',
                'A wrong answer costs what you typed in Wrong: −1 against +4, −0.5 against +2, −0.25 against +1.',
                'Time is measured and reported per question, but it never changes the marks.',
            ],
            takeaway: 'Speed scoring teaches students to buzz in. JEE, NEET, SSC and bank papers punish exactly that habit, because a wrong tick costs marks a blank does not.',
        },
        {
            id: 'size',
            label: 'How many can play',
            question: 'Can your whole batch sit the same paper?',
            them: [
                'Live games are capped by plan. Kahoot’s free plan is commonly limited to around 10 players in a game, and paid personal and teacher tiers raise the cap in steps — 50, 100, 200 and up — with the exact numbers and prices changing from time to time.',
                'So the size of your batch decides your subscription tier.',
            ],
            us: [
                'A live exam takes a batch: candidates join with one code and there is no per-game player tier to buy.',
                'Running the exam is on the free plan. Paid plans are for exam rules and extras, at ₹49 a week, ₹149 a month or ₹799 a year.',
            ],
            takeaway: 'Check the player cap on the plan you are on before you promise a mock to 120 students.',
        },
        {
            id: 'paper',
            label: 'What a paper needs',
            question: 'Does it look and behave like the real exam?',
            them: [
                'A question on a shared screen, four coloured answer tiles, a per-question timer, music and a podium at the end.',
                'Question types centre on multiple choice, true/false and type-answer, with more formats on higher plans.',
                'Built to be watched together, which is the opposite of a student sitting a paper alone.',
            ],
            us: [
                'An NTA-style screen on the candidate’s own device: question palette, Mark for review, Save & Next, sections, a single clock for the whole paper.',
                'Numerical answers with a tolerance range, multiple-correct questions with partial marks, comprehension passages.',
                'Full screen enforced, tab switches counted, copy and right-click off, on paid plans.',
            ],
            takeaway: 'A mock is practice for a specific screen as much as for a syllabus. Practising on a game screen means exam day is the first time they see the real one.',
        },
        {
            id: 'after',
            label: 'After the test',
            question: 'What do you have the next morning?',
            them: [
                'Reports on how the game went: who answered what, question by question, and the podium.',
                'Useful for a teacher’s own read of a class. Not a rank list a parent will read or a mark sheet you can file.',
            ],
            us: [
                'A rank list with the class average, highest and lowest, which copies out or goes on WhatsApp.',
                'Per-question numbers: attempted, correct, average time, the wrong option most of them chose.',
                'Report cards to print or save as PDF, and the whole thing as Excel.',
            ],
            takeaway: 'If marks go into a record, into a parent conversation or into a batch decision, they need to come out as a document, not a leaderboard.',
        },
    ],
    scoring: {
        label: 'Kahoot points',
        kind: 'speed',
        best: 1000,
        seconds: 20,
        rightWhy: 'Correct, with the clock where it is: Kahoot’s formula is 1 − (time taken ÷ time limit) ÷ 2, times 1000.',
        wrongWhy: 'Wrong answers score nothing — and cost nothing. The guess was free.',
    },
    steps: [
        { id: 'pick', title: 'Keep Kahoot for Friday’s revision', detail: 'This is not a migration. Nothing you do here takes the fun out of your classroom.', minutes: 1 },
        { id: 'paper', title: 'Take the paper that needs to count', detail: 'One test whose marks go on a record: a weekly test, a chapter test, a mock.', minutes: 2 },
        { id: 'import', title: 'Upload the paper or photograph it', detail: 'PDF, printed sheet or handwriting. The AI reads questions, options, key and diagrams.', minutes: 5 },
        { id: 'marks', title: 'Type the marking scheme', detail: 'Marks and Wrong on each question — +4 and −1 for JEE and NEET, +2 and −0.5 for SSC — and the duration.', minutes: 6 },
        { id: 'run', title: 'Run it as a live exam', detail: 'Give the batch a six-digit code, press Start, and read the rank list and the per-question numbers afterwards.', minutes: 4 },
    ],
};

// ── /testportal-alternative ─────────────────────────────────────────────────

const TESTPORTAL: AltRival = {
    key: 'testportal',
    name: 'Testportal',
    is: 'a business-first assessment tool for hiring, training and certification',
    swap: {
        keepLabel: 'Testportal’s home ground',
        keep: [
            { icon: 'briefcase', label: 'Screening job candidates' },
            { icon: 'award', label: 'Certificates after a course' },
            { icon: 'shield-check', label: 'Compliance and training records' },
            { icon: 'globe', label: 'Teams working in English or Polish' },
        ],
        moveLabel: 'An Indian exam platform’s home ground',
        move: [
            { icon: 'timer', label: '+4/−1, sections, 180-question mocks' },
            { icon: 'languages', label: 'Hindi and bilingual question papers' },
            { icon: 'smartphone', label: 'A budget Android phone on mobile data' },
            { icon: 'users', label: 'A batch joining with one code' },
        ],
        foot: 'Both mark tests automatically. They are built for different rooms.',
    },
    stats: [
        { dt: 'Monthly results cap', dd: 'None' },
        { dt: 'Interface in Hindi', dd: 'Yes' },
        { dt: 'Per-year price', dd: '₹799' },
        { dt: 'Negative marking', dd: 'Per question' },
    ],
    checked: 'Testportal facts checked against testportal.com as it stood on 10 October 2026',
    uses: [
        { id: 'hiring', label: 'Screening job applicants', icon: 'briefcase', tone: 'indigo', kind: 'core' },
        { id: 'certs', label: 'Certificates after a course', icon: 'award', tone: 'orange', kind: 'core' },
        { id: 'training', label: 'Staff training and compliance records', icon: 'shield-check', tone: 'teal', kind: 'core' },
        { id: 'open', label: 'Open-ended answers graded by a person', icon: 'pen-line', tone: 'purple', kind: 'core' },
        { id: 'entrance', label: 'Entrance-pattern mocks (JEE, NEET, SSC, bank)', icon: 'timer', tone: 'red', kind: 'exam' },
        { id: 'hindi', label: 'Hindi or bilingual papers', icon: 'languages', tone: 'green', kind: 'exam' },
        { id: 'batch', label: 'A whole batch sitting one paper live', icon: 'users', tone: 'blue', kind: 'exam' },
        { id: 'ranks', label: 'Rank lists and report cards for parents', icon: 'list-ordered', tone: 'pink', kind: 'exam' },
    ],
    verdicts: {
        none: { title: 'Switch on what you use', text: 'Tick what you run tests for. The answer appears here.' },
        keep: {
            title: 'Keep Testportal',
            text: 'Hiring tests, certification and compliance records are what it is built for, and it does them with proctoring and certificates an exam platform for coaching institutes does not have.',
        },
        split: {
            title: 'Keep it for the office. Test students elsewhere.',
            text: 'Recruitment and staff training stay where the certificates and records already are. Student exams move to software that marks like an Indian entrance paper and runs on the phone in a student’s pocket.',
        },
        switch: {
            title: 'You are running Indian exams on a hiring tool',
            text: 'Everything you ticked is student examining: entrance patterns, Hindi papers, batches, rank lists. A tool built for recruitment in Europe will keep making you work around it.',
        },
    },
    themes: [
        {
            id: 'who',
            label: 'Who it is for',
            question: 'Who does the product think you are?',
            them: [
                'Its own site splits customers into Business — Human Resources, training companies, certification, sales and customer service, language schools — and Education: teachers, schools, universities.',
                'Business comes first, and the pricing link goes to business plans.',
                'The interface language switch offers English and Polski.',
            ],
            us: [
                'Built for Indian teachers, coaching institutes and students sitting JEE, NEET, CUET, SSC, bank and school exams.',
                'Hindi throughout, including typing Hindi with English letters, and bilingual papers where each question carries both languages.',
                'Prices in rupees, UPI at checkout.',
            ],
            takeaway: 'Software carries the assumptions of the market it was built for. Those assumptions show up in the small things: languages, marking, what a “respondent” is.',
        },
        {
            id: 'price',
            label: 'How it is priced',
            question: 'What does the price meter actually count?',
            them: [
                'Listing sites put the plans around $29–$35 a month at the entry level and $99–$159 at the top, and describe a cap on test results per month — in the region of 30 on the cheapest plan, rising to a few thousand at the top.',
                'These are third-party figures and they disagree with each other, so treat them as a shape, not a quote: a monthly fee, in dollars, metered by results.',
                'A result cap is a strange meter for a coaching institute: one mock for 150 students is 150 results.',
            ],
            us: [
                'No cap on results, candidates or tests. One mock for 400 students is one mock.',
                '₹49 for 7 days, ₹149 for 30 days, ₹799 for a year, and building and running tests is free.',
                'Billed in rupees, so no card in dollars and no exchange-rate surprise.',
            ],
            takeaway: 'Work out what you pay per sitting, not per month. A per-result meter punishes exactly the thing an institute does most: putting a lot of students through one paper.',
        },
        {
            id: 'marking',
            label: 'Marking',
            question: 'Can it mark an Indian entrance paper?',
            them: [
                'Automatic grading of choice questions and self-grading open-ended questions, with an AI generator that writes questions from your material or a topic.',
                'Its feature list does not mention negative marking, partial credit on multiple-correct questions, or sections with their own clock. If your paper needs them, ask before you trial it.',
            ],
            us: [
                'Marks and Wrong on each question: +4/−1, +2/−0.5, +1/−0.25, or marks like 0.857 where a section needs them.',
                'Partial marks on multiple-correct questions, proportional or the JEE Advanced +1-per-option rule.',
                'Numerical answers as a range, two-decimal answers, and sections that close on their own clock.',
            ],
            takeaway: 'Marking is where general assessment tools and exam software part company. Everything else can be worked around; marking cannot.',
        },
        {
            id: 'device',
            label: 'The device',
            question: 'What is your candidate holding?',
            them: [
                'A desktop-first test page, with proctoring that can use a camera, a desktop recording or a secure browser, and live monitoring of a group through its Teams app.',
                'Strong for an invigilated test on a company laptop.',
            ],
            us: [
                'Built for a phone first: a four-year-old Android on patchy mobile data, with answers saved to the server every 20 seconds.',
                'Rejoin on another device and carry on from where the paper was.',
                'Full screen enforced, tab switches counted with a limit that can auto-submit, copy and right-click off — in an ordinary browser, with nothing to install.',
            ],
            takeaway: 'A secure browser that will not install on an Android phone protects nobody. Rules that work in the browser the student already has, do.',
        },
        {
            id: 'results',
            label: 'Results',
            question: 'Who reads the result?',
            them: [
                'Analytics and certificates, reporting built for an HR file or a training record.',
                'A single candidate’s score and a pass mark are the unit.',
            ],
            us: [
                'A batch is the unit: rank list, class average, highest and lowest, section-by-section.',
                'Per-question numbers for the teacher, and a report card the parent can read.',
                'Excel for your own records, WhatsApp for the batch group, printed slips for a notice board.',
            ],
            takeaway: 'Institutes do not act on one score. They act on where a student sits in a batch and which question the batch failed.',
        },
    ],
    scoring: {
        label: 'Points, no penalty',
        kind: 'points',
        best: 1,
        rightWhy: 'One point for a correct answer, scaled up to a percentage and a pass mark.',
        wrongWhy: 'Nothing taken off, which is right for a hiring test and wrong for a JEE mock.',
    },
    steps: [
        { id: 'pick', title: 'Pick one paper, not the question bank', detail: 'One mock or weekly test you have already used. Moving a bank is a project; moving a paper is an evening.', minutes: 2 },
        { id: 'import', title: 'Export it as a PDF and upload it', detail: 'Print the paper to PDF from wherever it lives now, with the answer key as a second file. The AI reads both.', minutes: 5 },
        { id: 'marks', title: 'Set the marking your exam uses', detail: 'Marks and Wrong per question, partial marks on multiple-correct, numerical ranges, sections with their own clock.', minutes: 9 },
        { id: 'lang', title: 'Add Hindi if your batch needs it', detail: 'Keep both languages on the question, or let the AI write the Hindi side from your English.', minutes: 4 },
        { id: 'run', title: 'Run one sitting end to end', detail: 'A code at testoza.com/join, a lobby, Start, and a rank list with per-question numbers at the end.', minutes: 4 },
    ],
};

export const ALT_RIVALS: Record<RivalKey, AltRival> = {
    classplus: CLASSPLUS,
    teachmint: TEACHMINT,
    kahoot: KAHOOT,
    testportal: TESTPORTAL,
};
