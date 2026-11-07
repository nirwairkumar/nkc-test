/**
 * Everything the pricing page says, in one place.
 *
 * Launch offer: every feature is free on every account until FREE_UNTIL (end of the day, IST).
 * After that moment the page switches by itself to the normal plans view, so it never keeps
 * promising a date that has already passed.
 *
 * Change these together:
 *   1. FREE_UNTIL_ISO + FREE_UNTIL_LABEL below,
 *   2. Admin → Pricing → "Unlock all premium" (app_settings.unlock_all_premium), which is what
 *      actually makes the paid features free.
 *
 * Copy rules (owner): plain words, no hype, no em dashes, "candidates" and "educators"
 * (never "students"/"teachers" for the people using the product).
 */

export const FREE_UNTIL_ISO = '2026-12-31T23:59:59.999+05:30';
export const FREE_UNTIL_LABEL = '31 December 2026';
export const FREE_UNTIL_STAMP = '31.12.2026';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days since 1970 on the Indian calendar (India has no daylight saving). */
const istDay = (d: Date) => Math.floor((d.getTime() + IST_OFFSET_MS) / DAY_MS);

export const isLaunchOn = (now: Date) => now.getTime() <= Date.parse(FREE_UNTIL_ISO);

/** 54 on 7 Nov 2026, 1 on 30 Dec, 0 on 31 Dec (the last free day). */
export const daysLeft = (now: Date) => Math.max(0, istDay(new Date(FREE_UNTIL_ISO)) - istDay(now));

export const daysLeftLabel = (now: Date) => {
    const n = daysLeft(now);
    if (n === 0) return 'Last free day today';
    return n === 1 ? '1 day left' : `${n} days left`;
};

/** "07 Nov 2026" in Indian time, for the bill. */
export const billDate = (now: Date) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).format(now);

export const HERO = {
    eyebrow: 'Pricing',
    titleLead: 'Free until',
    titleDate: FREE_UNTIL_LABEL,
    lede:
        'Every feature, for every educator. Make the paper, run the exam and read the results without paying anything until the year ends.',
    primary: 'Make a test',
    secondary: 'What happens in January',
    promises: ['No card needed', 'Candidates don’t need an account', 'Nothing to cancel'],
    /** Checked against real tests that have results (titles in these scripts/languages). */
    proof: 'Educators already run exams on TestoZa in Hindi, Tamil, Malayalam, Bengali, Uzbek, Spanish and English.',
};

/** Lines on the bill. Each is a feature that is included, not sold separately. */
export const BILL_LINES = [
    'AI import from PDF and photos',
    'Live exams, link and join code',
    'Anti-cheat rules',
    'Results, rank list and Excel',
    'Your logo on every test',
];

export interface Feature {
    title: string;
    text: string;
}

export interface FeatureGroup {
    key: string;
    title: string;
    note: string;
    items: Feature[];
}

/** Every line here is a shipped feature (checked in the code on 7 Nov 2026). */
export const FEATURE_GROUPS: FeatureGroup[] = [
    {
        key: 'make',
        title: 'Make the paper',
        note: 'From a PDF, a few photos or a blank page.',
        items: [
            { title: 'Import a PDF or photos', text: 'AI reads the questions, options and diagrams. You check everything before you save.' },
            { title: 'Hindi, English and 100+ languages', text: 'Write each question in Hindi or another language, next to the English.' },
            { title: 'Maths and chemistry', text: 'Equations, reactions and ions, typed with an on-screen keypad.' },
            { title: 'Marking that matches the real exam', text: 'Negative marks, sections with their own timers, numerical answers and JEE Advanced partial marks.' },
        ],
    },
    {
        key: 'run',
        title: 'Run the exam',
        note: 'On candidates’ own phones or in a computer lab.',
        items: [
            { title: 'One link, no app', text: 'Candidates open it on any phone or computer. They don’t make an account.' },
            { title: 'A join code for the exam hall', text: 'Write the 6-digit code on the board. Candidates type it and start.' },
            { title: 'Opens and closes on time', text: 'Set when the exam opens and when it shuts.' },
            { title: 'Anti-cheat rules', text: 'Full screen, tab-switch warnings, no copy-paste and a shuffled question order.' },
            { title: 'Safe if the internet drops', text: 'Answers stay saved on the device and go through when it reconnects.' },
        ],
    },
    {
        key: 'results',
        title: 'Results',
        note: 'Ready the moment a candidate submits.',
        items: [
            { title: 'Scores and a rank list', text: 'Every candidate’s marks and rank, without checking a single sheet.' },
            { title: 'See who’s writing now', text: 'Watch answer sheets come in while the exam is on.' },
            { title: 'Question-wise analysis', text: 'Which questions most candidates got wrong, and who needs help.' },
            { title: 'Excel download', text: 'Every result in one spreadsheet, whenever you want it.' },
        ],
    },
    {
        key: 'brand',
        title: 'Your institute',
        note: 'So the exam looks like yours.',
        items: [
            { title: 'Your name and logo on the test', text: 'Candidates see your institute at the top of every paper.' },
            { title: 'Batches and candidate details', text: 'Group candidates into batches. Ask for a roll number, phone or class before they start.' },
            { title: 'You choose what candidates see', text: 'Just the score, or their answers with solutions too.' },
        ],
    },
];

export const AFTER = {
    eyebrow: 'After December',
    title: 'What happens on 1 January 2027',
    lede: 'No surprises. This is the plan.',
    steps: [
        {
            when: 'Now until 31 December 2026',
            title: 'Everything is free',
            text: 'No card. No limit on tests or candidates. Every feature on every account.',
        },
        {
            when: 'At least 30 days before anything changes',
            title: 'Prices show up here first',
            text: '2027 prices go on this page and to every educator by email. You’re never charged unless you pick a plan and pay.',
        },
        {
            when: 'From 1 January 2027',
            title: 'A free plan stays',
            text: 'Institutes that need more will pay for a plan. Your tests, results and answer sheets stay yours, and you can download them any time.',
        },
    ],
    priceCardTitle: 'Today’s paid plans',
    priceCardNote: 'For reference. Until 31 December you get all of it without picking one.',
    priceCardFoot: 'If prices change for 2027, you’ll see it here first.',
};

export const FOUNDER = {
    eyebrow: 'Why free?',
    name: 'Nirwair Kumar Chaudhary',
    role: 'Founder, TestoZa · IIT Madras',
    initials: 'NK',
    paragraphs: [
        'TestoZa is new, and I’d rather you run a real exam on it than look at a demo and leave. Your weekly test, a mock before the boards, a scholarship test with three hundred candidates: that’s how I find out what’s missing.',
        'So until 31 December, everything is open to everyone. After that, institutes that use it heavily will pay, so it can keep running. Individual educators will keep a free plan.',
        'If something doesn’t work the way your exam needs, tell me through Help. I read every message.',
    ],
    link: 'Write to me',
};

export interface Faq {
    q: string;
    a: string;
}

const FAQ_CANDIDATES: Faq = {
    q: 'Do candidates need an account?',
    a: 'No. They open your link or type the join code, fill in the details you ask for, and start.',
};
const FAQ_SCALE: Faq = {
    q: 'How many candidates can write at the same time?',
    a: 'Exams with a few hundred candidates writing together already run on TestoZa. Planning a few thousand at once? Tell us the date through Help so we can make sure it runs smoothly.',
};
const FAQ_OFFLINE: Faq = {
    q: 'What if a candidate’s internet drops mid-exam?',
    a: 'Their answers stay saved on the device and are sent when the connection comes back.',
};

export const LAUNCH_FAQS: Faq[] = [
    {
        q: 'Is it really free? What’s the catch?',
        a: 'Until 31 December 2026 there’s no catch: every feature is open on every account and there’s no card to enter. TestoZa is new and we want real exams running on it. From 2027, institutes that need more will pay, and a free plan stays.',
    },
    {
        q: 'Do I have to enter a card or pay anything now?',
        a: 'No. There’s nothing to buy before 31 December. You’re never charged unless you choose a plan and pay for it yourself.',
    },
    {
        q: 'What happens to my tests and results on 1 January?',
        a: 'They stay. Nothing is deleted or locked away, and you can download results to Excel any time.',
    },
    FAQ_CANDIDATES,
    FAQ_SCALE,
    FAQ_OFFLINE,
    {
        q: 'How will I pay from 2027?',
        a: 'Through Razorpay, with UPI, cards or net banking. Prices are in Indian rupees.',
    },
];

/** Shown once the launch offer has ended. */
export const REGULAR_FAQS: Faq[] = [
    {
        q: 'Does a plan renew by itself?',
        a: 'No. Each plan is a one-time payment for its period. Nothing is charged again unless you pay again.',
    },
    FAQ_CANDIDATES,
    FAQ_SCALE,
    FAQ_OFFLINE,
    {
        q: 'How do I pay?',
        a: 'Through Razorpay, with UPI, cards or net banking. Prices are in Indian rupees.',
    },
];

export const CLOSING = {
    title: 'Your next test can be live in ten minutes.',
    button: 'Make a test',
};
