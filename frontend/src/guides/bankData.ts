/**
 * Facts and demo content for testoza.com/bank-exam-mock-test-platform
 * (bankExamMockTestPlatform.ts and pages/guides/bank). Plain TypeScript, no React: the
 * Cloudflare worker imports it too.
 *
 * Patterns as reported for the 2026 cycle (sources in the guide, checked 9 October 2026).
 * Bank exams have five options a question, a clock for every section, and marks that are
 * often not whole numbers because a section's marks and its question count differ.
 *   - IBPS PO 2026 (CRP PO/MT-XVI, notified 1 July 2026) Prelims: English 30 Q, Quantitative
 *     Aptitude 35 Q, Reasoning Ability 35 Q; 100 marks, 60 minutes, 20 minutes a section.
 *     Coaching sources that have read the notification report the 2026 revision as English 30,
 *     Quant 30 and Reasoning 40 marks; the question counts agree everywhere, the marks split
 *     does not, so the guide says so and tells readers to check the call letter.
 *   - IBPS PO 2026 Mains: Reasoning and Computer Aptitude 40 Q / 60 marks / 50 min, Data
 *     Analysis and Interpretation 40 Q / 60 / 45, General, Economy and Banking Awareness
 *     50 Q / 60 / 35, English 40 Q / 20 / 30 — 170 Q, 200 marks, 160 min; then a 30-minute
 *     descriptive paper (essay and comprehension, 25 marks, English, typed).
 *   - SBI PO 2026 Prelims: English 40 Q / 40, Quant 30 Q / 30, Reasoning 30 Q / 30; 60 min,
 *     20 a section; reported to have no sectional cut-off. Mains: 170 Q / 200 marks / 180 min
 *     plus a 30-mark descriptive of three tasks chosen from six.
 *   - IBPS Clerk 2026 Prelims: English 30, Numerical Ability 35, Reasoning 35; 100 marks,
 *     60 min, 20 a section. Mains (revised): 160 Q / 200 marks / 125 min, no interview.
 *   - IBPS RRB 2026 Office Assistant Prelims: Reasoning 40 Q / 25 min, Numerical Ability
 *     40 Q / 20 min — 80 Q, 80 marks, 45 min, so the two sections are timed unequally.
 *   - Negative marking is a quarter of the marks the question carries, everywhere in the
 *     objective papers; nothing is taken off for a blank. The descriptive papers are not
 *     negatively marked.
 */

export type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E';
/** Bank exams print five options a question, not four. */
export const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D', 'E'];

/** A quarter of the question's marks, in every bank objective paper. */
export const NEG_FRACTION = 0.25;

/* ── Bank exam patterns ───────────────────────────────────────────────── */

export interface PatternSection {
    name: string;
    questions: number;
    marks: number;
    /** Its own minutes (every bank paper here times its sections). */
    minutes: number;
    note?: string;
}

export interface BankPattern {
    id: string;
    /** Chip label. */
    label: string;
    name: string;
    minutes: number;
    languages: string;
    sections: PatternSection[];
    /** The descriptive paper that follows, where there is one. */
    extra?: string;
    /** Whether the stage's marks count towards the final merit list. */
    counts: string;
    /** How to set it up in TestoZa, one line each. */
    setup: { label: string; value: string }[];
    note: string;
}

/** Marks a question of this section carries, and what a wrong one costs. */
export const perQuestionMarks = (s: PatternSection) => s.marks / s.questions;
export const perQuestionNegative = (s: PatternSection) => perQuestionMarks(s) * NEG_FRACTION;
/** "1.5", "0.857" — trailing zeros dropped, three decimals at most. */
export const marksLabel = (n: number) => String(Math.round(n * 1000) / 1000);

export const PATTERNS: BankPattern[] = [
    {
        id: 'ibps-po-pre',
        label: 'IBPS PO Prelims',
        name: 'IBPS PO 2026, Prelims',
        minutes: 60,
        languages: 'Hindi and English; the English section in English only',
        sections: [
            { name: 'English Language', questions: 30, marks: 30, minutes: 20 },
            { name: 'Quantitative Aptitude', questions: 35, marks: 30, minutes: 20 },
            { name: 'Reasoning Ability', questions: 35, marks: 40, minutes: 20 },
        ],
        counts: 'Qualifying only: prelims marks never enter the final merit list.',
        setup: [
            { label: 'Split into sections', value: 'On, 3 sections' },
            { label: 'Time each section', value: 'On, 20 min each' },
            { label: 'Marks per section', value: '1 / 0.857 / 1.143' },
            { label: 'Wrong answer', value: '0.25 / 0.214 / 0.286' },
            { label: 'Options a question', value: '5 (add a fifth in the builder)' },
        ],
        note: 'Coaching sources report that the 2026 revision moved marks between the sections (English 30, Quant 30, Reasoning 40) while the question counts stayed at 30 / 35 / 35. The marks split is the part they disagree on, so set yours from the call letter.',
    },
    {
        id: 'ibps-po-main',
        label: 'IBPS PO Mains',
        name: 'IBPS PO 2026, Mains',
        minutes: 160,
        languages: 'Hindi and English; English and the descriptive paper in English only',
        sections: [
            { name: 'Reasoning and Computer Aptitude', questions: 40, marks: 60, minutes: 50 },
            { name: 'Data Analysis and Interpretation', questions: 40, marks: 60, minutes: 45, note: 'On-screen calculator' },
            { name: 'General, Economy and Banking Awareness', questions: 50, marks: 60, minutes: 35 },
            { name: 'English Language', questions: 40, marks: 20, minutes: 30 },
        ],
        extra: 'Then a descriptive paper: essay and comprehension, 2 questions, 25 marks, 30 minutes, typed in English.',
        counts: 'Counts: the merit list is Mains (out of 225) and the interview, 80 : 20.',
        setup: [
            { label: 'Split into sections', value: 'On, 4 sections' },
            { label: 'Time each section', value: 'On, 50 / 45 / 35 / 30' },
            { label: 'Marks per section', value: '1.5 / 1.5 / 1.2 / 0.5' },
            { label: 'Wrong answer', value: '0.375 / 0.375 / 0.3 / 0.125' },
            { label: 'Scientific calculator', value: 'On (the real one shows it in Data Analysis only)' },
        ],
        note: 'Four sections, four different marks per question, and not one of them a whole number. An English question is worth 0.5 and a Reasoning question 1.5 — three times as much.',
    },
    {
        id: 'sbi-po-pre',
        label: 'SBI PO Prelims',
        name: 'SBI PO 2026, Prelims',
        minutes: 60,
        languages: 'Hindi and English; the English section in English only',
        sections: [
            { name: 'English Language', questions: 40, marks: 40, minutes: 20 },
            { name: 'Quantitative Aptitude', questions: 30, marks: 30, minutes: 20 },
            { name: 'Reasoning Ability', questions: 30, marks: 30, minutes: 20 },
        ],
        counts: 'Qualifying only; about ten times the vacancies go through, and there is no sectional cut-off.',
        setup: [
            { label: 'Split into sections', value: 'On, 3 sections' },
            { label: 'Time each section', value: 'On, 20 min each' },
            { label: 'Marks per section', value: '1 / 1 / 1' },
            { label: 'Wrong answer', value: '0.25' },
            { label: 'Options a question', value: '5' },
        ],
        note: 'SBI weights English differently from IBPS: 40 questions in the same 20 minutes, which is 30 seconds a question against IBPS’s 40. Same-looking paper, a different race.',
    },
    {
        id: 'sbi-po-main',
        label: 'SBI PO Mains',
        name: 'SBI PO 2026, Mains',
        minutes: 180,
        languages: 'Hindi and English; English and the descriptive paper in English only',
        sections: [
            { name: 'Reasoning and Computer Aptitude', questions: 40, marks: 60, minutes: 50 },
            { name: 'Data Analysis and Interpretation', questions: 30, marks: 60, minutes: 45 },
            { name: 'General, Economy and Banking Awareness', questions: 60, marks: 60, minutes: 45 },
            { name: 'English Language', questions: 40, marks: 20, minutes: 40 },
        ],
        extra: 'Then a 30-minute descriptive paper of 30 marks: three answers chosen from six tasks (email, situation analysis, report or précis), 10 marks each.',
        counts: 'Counts: Mains out of 230, converted with the interview stage into the merit list.',
        setup: [
            { label: 'Split into sections', value: 'On, 4 sections' },
            { label: 'Time each section', value: 'On, 50 / 45 / 45 / 40' },
            { label: 'Marks per section', value: '1.5 / 2 / 1 / 0.5' },
            { label: 'Wrong answer', value: '0.375 / 0.5 / 0.25 / 0.125' },
            { label: 'Attempt limit', value: 'For the “any three of six” descriptive tasks' },
        ],
        note: 'Data Analysis is the heaviest paper in banking: 30 questions worth 60 marks, so 2 marks each and 1.5 minutes each. A mock that marks it at 1 teaches the wrong triage.',
    },
    {
        id: 'ibps-clerk-pre',
        label: 'Clerk Prelims',
        name: 'IBPS Clerk 2026, Prelims',
        minutes: 60,
        languages: 'Hindi and English; the English section in English only',
        sections: [
            { name: 'English Language', questions: 30, marks: 30, minutes: 20 },
            { name: 'Numerical Ability', questions: 35, marks: 35, minutes: 20 },
            { name: 'Reasoning Ability', questions: 35, marks: 35, minutes: 20 },
        ],
        counts: 'Qualifying only: clerk selection is decided by the Mains alone.',
        setup: [
            { label: 'Split into sections', value: 'On, 3 sections' },
            { label: 'Time each section', value: 'On, 20 min each' },
            { label: 'Marks per section', value: '1 / 1 / 1' },
            { label: 'Wrong answer', value: '0.25' },
            { label: 'Options a question', value: '5' },
        ],
        note: 'The cleanest paper in banking to copy: one mark a question, a quarter off for a wrong answer, three sections of 20 minutes. Start a new test series here.',
    },
    {
        id: 'ibps-clerk-main',
        label: 'Clerk Mains',
        name: 'IBPS Clerk 2026, Mains',
        minutes: 125,
        languages: 'Hindi and English; the English section in English only',
        sections: [
            { name: 'General and Financial Awareness', questions: 40, marks: 50, minutes: 20 },
            { name: 'General English', questions: 40, marks: 40, minutes: 35 },
            { name: 'Reasoning Ability and Computer Aptitude', questions: 40, marks: 60, minutes: 35 },
            { name: 'Quantitative Aptitude', questions: 40, marks: 50, minutes: 35 },
        ],
        counts: 'Counts for everything: there is no interview for clerks, so this paper is the selection.',
        setup: [
            { label: 'Split into sections', value: 'On, 4 sections' },
            { label: 'Time each section', value: 'On, 20 / 35 / 35 / 35' },
            { label: 'Marks per section', value: '1.25 / 1 / 1.5 / 1.25' },
            { label: 'Wrong answer', value: '0.3125 / 0.25 / 0.375 / 0.3125' },
            { label: 'Options a question', value: '5' },
        ],
        note: 'Awareness gives 40 questions only 20 minutes — 30 seconds each — because it rewards recall, not working. The revised 2026 paper is 160 questions in 125 minutes.',
    },
    {
        id: 'rrb-oa',
        label: 'RRB Assistant',
        name: 'IBPS RRB 2026, Office Assistant Prelims',
        minutes: 45,
        languages: 'Hindi and English',
        sections: [
            { name: 'Reasoning', questions: 40, marks: 40, minutes: 25 },
            { name: 'Numerical Ability', questions: 40, marks: 40, minutes: 20 },
        ],
        counts: 'Qualifying only; the Mains decides, with no interview for Office Assistant.',
        setup: [
            { label: 'Split into sections', value: 'On, 2 sections' },
            { label: 'Time each section', value: 'On, 25 and 20 min' },
            { label: 'Marks per section', value: '1 / 1' },
            { label: 'Wrong answer', value: '0.25' },
            { label: 'Options a question', value: '5' },
        ],
        note: 'The one paper here whose sections are not the same length: 25 minutes for Reasoning and 20 for Numerical Ability. A platform that splits the time limit evenly cannot reproduce it.',
    },
];

/* ── The demo paper: an IBPS PO Prelims in miniature ─────────────────── */

export interface BankQuestion {
    /** Lines of the question, English then Hindi, as a bilingual import stores them. */
    text: string[];
    /** Option lines (English, Hindi). */
    options: Record<OptionKey, string[]>;
    answer: OptionKey;
    /** For the crawler text and the result. */
    plain: string;
    answerPlain: string;
}

export interface BankSection {
    name: string;
    /** Short name for small screens. */
    short: string;
    questions: BankQuestion[];
}

/** Marks for every question of the demo paper, as in a prelims paper. */
export const DEMO_MARKS = { plus: 1, minus: 0.25 };
/** Each section's time in the demo (seconds); the real paper gives 20 minutes. */
export const DEMO_SECTION_SECONDS = 45;
export const DEMO_TITLE = 'IBPS PO Prelims · Mock 09';

const opts = (a: string[], b: string[], c: string[], d: string[], e: string[]): Record<OptionKey, string[]> => ({ A: a, B: b, C: c, D: d, E: e });

export const DEMO_SECTIONS: BankSection[] = [
    {
        name: 'English Language',
        short: 'English',
        questions: [
            {
                text: ['Select the word most similar in meaning to MITIGATE.'],
                options: opts(['Aggravate'], ['Alleviate'], ['Postpone'], ['Confirm'], ['Withdraw']),
                answer: 'B',
                plain: 'Select the word most similar in meaning to MITIGATE.',
                answerPlain: 'Alleviate',
            },
            {
                text: ['Select the option that best fills the blank.', 'The Reserve Bank has ______ the repo rate by 25 basis points.'],
                options: opts(['reduced'], ['reduce'], ['reducing'], ['reduces'], ['been reduce']),
                answer: 'A',
                plain: 'Select the option that best fills the blank: The Reserve Bank has ______ the repo rate by 25 basis points.',
                answerPlain: 'reduced',
            },
            {
                text: ['Select the correctly spelt word.'],
                options: opts(['Liability'], ['Liablity'], ['Lialibity'], ['Liabilty'], ['Liabillity']),
                answer: 'A',
                plain: 'Select the correctly spelt word: Liability, Liablity, Lialibity, Liabilty, Liabillity.',
                answerPlain: 'Liability',
            },
            {
                text: ['In banking, the word “collateral” most nearly means:'],
                options: opts(
                    ['An asset pledged as security for a loan'],
                    ['A joint account held by two people'],
                    ['The interest charged on an overdraft'],
                    ['A charge for closing an account early'],
                    ['A transfer between two branches'],
                ),
                answer: 'A',
                plain: 'In banking, the word “collateral” most nearly means:',
                answerPlain: 'An asset pledged as security for a loan',
            },
        ],
    },
    {
        name: 'Quantitative Aptitude',
        short: 'Quant',
        questions: [
            {
                text: [
                    'A sum of ₹12,000 is lent at 8% per annum simple interest. What is the interest earned in 3 years?',
                    '₹12,000 की राशि 8% वार्षिक साधारण ब्याज पर दी जाती है। 3 वर्षों में अर्जित ब्याज कितना होगा?',
                ],
                // 12000 × 0.08 × 3
                options: opts(['₹2,880'], ['₹2,400'], ['₹3,120'], ['₹2,760'], ['₹3,840']),
                answer: 'A',
                plain: 'A sum of ₹12,000 is lent at 8% per annum simple interest. What is the interest earned in 3 years?',
                answerPlain: '₹2,880 (12,000 × 0.08 × 3)',
            },
            {
                text: [
                    'A deposit of ₹25,000 grows to ₹28,750 in one year. What is the rate of simple interest?',
                    '₹25,000 की जमा राशि एक वर्ष में ₹28,750 हो जाती है। साधारण ब्याज की दर क्या है?',
                ],
                // 3750 / 25000 = 15%
                options: opts(['12%'], ['15%'], ['16.5%'], ['18%'], ['13.5%']),
                answer: 'B',
                plain: 'A deposit of ₹25,000 grows to ₹28,750 in one year. What is the rate of simple interest?',
                answerPlain: '15% (₹3,750 on ₹25,000)',
            },
            {
                text: [
                    'In a branch, the ratio of savings accounts to current accounts is 7 : 3. If the branch has 4,000 accounts in all, how many are current accounts?',
                    'एक शाखा में बचत खातों और चालू खातों का अनुपात 7 : 3 है। यदि शाखा में कुल 4,000 खाते हैं, तो चालू खाते कितने हैं?',
                ],
                // 4000 × 3/10
                options: opts(['1,200'], ['1,400'], ['2,800'], ['900'], ['1,500']),
                answer: 'A',
                plain: 'In a branch, the ratio of savings accounts to current accounts is 7 : 3. If the branch has 4,000 accounts in all, how many are current accounts?',
                answerPlain: '1,200',
            },
            {
                text: ['What is 36% of 1,250 minus 18% of 500?', '1,250 का 36% घटा 500 का 18% क्या है?'],
                // 450 − 90
                options: opts(['360'], ['370'], ['350'], ['340'], ['380']),
                answer: 'A',
                plain: 'What is 36% of 1,250 minus 18% of 500?',
                answerPlain: '360 (450 − 90)',
            },
        ],
    },
    {
        name: 'Reasoning Ability',
        short: 'Reasoning',
        questions: [
            {
                text: [
                    'Statements: All cheques are documents. Some documents are receipts. Which of the following conclusions definitely follows?',
                    'कथन: सभी चेक दस्तावेज़ हैं। कुछ दस्तावेज़ रसीदें हैं। निम्नलिखित में से कौन-सा निष्कर्ष निश्चित रूप से सही है?',
                ],
                options: opts(
                    ['Some cheques are receipts', 'कुछ चेक रसीदें हैं'],
                    ['No cheque is a receipt', 'कोई चेक रसीद नहीं है'],
                    ['All receipts are documents', 'सभी रसीदें दस्तावेज़ हैं'],
                    ['All documents are cheques', 'सभी दस्तावेज़ चेक हैं'],
                    ['None of these', 'इनमें से कोई नहीं'],
                ),
                answer: 'E',
                plain: 'Statements: All cheques are documents. Some documents are receipts. Which conclusion definitely follows?',
                answerPlain: 'None of these (the overlap is possible, not certain)',
            },
            {
                text: [
                    'In a certain code language, BANK is written as CBOL. How is LOAN written in that code?',
                    'किसी कूट भाषा में BANK को CBOL लिखा जाता है। उसी कूट में LOAN को कैसे लिखा जाएगा?',
                ],
                // every letter moves one place forward
                options: opts(['MPBO'], ['KNZM'], ['MPBN'], ['MQBO'], ['NPBO']),
                answer: 'A',
                plain: 'In a certain code language, BANK is written as CBOL. How is LOAN written in that code?',
                answerPlain: 'MPBO (each letter moves one place forward)',
            },
            {
                text: [
                    'Pointing to a woman, Rohan said, “She is the daughter of the only son of my grandmother.” How is the woman related to Rohan?',
                    'एक महिला की ओर इशारा करते हुए रोहन ने कहा, “वह मेरी दादी के इकलौते बेटे की बेटी है।” वह महिला रोहन से कैसे संबंधित है?',
                ],
                // grandmother's only son = Rohan's father; his daughter = his sister
                options: opts(['Sister', 'बहन'], ['Niece', 'भतीजी'], ['Cousin', 'चचेरी बहन'], ['Aunt', 'चाची'], ['Cannot be determined', 'निर्धारित नहीं किया जा सकता']),
                answer: 'A',
                plain: 'Pointing to a woman, Rohan said, “She is the daughter of the only son of my grandmother.” How is the woman related to Rohan?',
                answerPlain: 'Sister',
            },
            {
                text: [
                    'If A > B, B ≥ C and C < D, which of the following is definitely true?',
                    'यदि A > B, B ≥ C और C < D है, तो निम्नलिखित में से कौन निश्चित रूप से सत्य है?',
                ],
                options: opts(['A > C'], ['D > B'], ['A ≥ D'], ['C ≥ B'], ['B > D']),
                answer: 'A',
                plain: 'If A > B, B ≥ C and C < D, which of the following is definitely true?',
                answerPlain: 'A > C (A > B ≥ C)',
            },
        ],
    },
];

/* ── Guess or skip, with five options ────────────────────────────────── */

export interface Marking {
    id: string;
    label: string;
    exams: string;
    right: number;
    wrong: number;
}

export const MARKINGS: Marking[] = [
    { id: 'pre', label: '+1 / −0.25', exams: 'Every prelims paper, and Clerk Mains English', right: 1, wrong: 0.25 },
    { id: 'reasoning', label: '+1.5 / −0.375', exams: 'Mains Reasoning: 40 questions, 60 marks', right: 1.5, wrong: 0.375 },
    { id: 'di', label: '+2 / −0.5', exams: 'SBI PO Mains Data Analysis: 30 questions, 60 marks', right: 2, wrong: 0.5 },
    { id: 'ga', label: '+1.2 / −0.3', exams: 'IBPS PO Mains Awareness: 50 questions, 60 marks', right: 1.2, wrong: 0.3 },
    { id: 'eng', label: '+0.5 / −0.125', exams: 'Mains English: 40 questions, 20 marks', right: 0.5, wrong: 0.125 },
];

/** Expected marks of one guess among `left` of the five options (one of them right). */
export const guessValue = (m: Marking, left: number) => m.right / left - (m.wrong * (left - 1)) / left;

/* ── Sectional cut-offs ──────────────────────────────────────────────── */

export interface CutoffSection {
    name: string;
    short: string;
    questions: number;
    /** Starting marks of the candidate in the lab. */
    score: number;
    /** Starting qualifying mark for the section. */
    cutoff: number;
}

/** A Clerk-style prelims paper: one mark a question, so marks and questions match. */
export const CUTOFF_SECTIONS: CutoffSection[] = [
    { name: 'English Language', short: 'English', questions: 30, score: 7, cutoff: 10 },
    { name: 'Numerical Ability', short: 'Numerical', questions: 35, score: 25, cutoff: 10 },
    { name: 'Reasoning Ability', short: 'Reasoning', questions: 35, score: 28, cutoff: 12 },
];
/** The overall qualifying mark in the lab, out of 100. */
export const CUTOFF_OVERALL = 51;
