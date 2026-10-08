/**
 * Facts and demo content for testoza.com/ssc-mock-test-platform (sscMockTestPlatform.ts and
 * pages/guides/ssc). Plain TypeScript, no React: the Cloudflare worker imports it too.
 *
 * Exam patterns as reported for the 2026 cycle (sources in the guide, checked 8 October 2026):
 *   - CGL 2026 Tier 1: 4 × 25 questions, 200 marks, 60 minutes, 15 minutes per section with a
 *     sectional timer (CGLE 2026 notice), +2 / −0.5; Hindi and English, English Comprehension
 *     in English only.
 *   - CHSL 2026 Tier 1: the same shape and sectional timer (CHSL 2026 notice, 7 September 2026).
 *   - CGL 2026 Tier 2, Paper I: Mathematical Abilities 30 Q / 30 min, Reasoning 30 Q / 30 min,
 *     English 45 Q / 40 min, General Awareness 25 Q / 20 min, Computer Knowledge 20 Q / 15 min
 *     (qualifying), then a 15-minute Data Entry Speed Test; +3 / −1.
 *   - MTS: Session I (Numerical & Mathematical Ability 20, Reasoning 20; 45 min; +3, no
 *     negative) and Session II (General Awareness 25, English 25; 45 min; +3 / −1).
 *   - GD Constable: 4 × 20 questions, 160 marks, 60 minutes on one clock, +2 / −0.25; English,
 *     Hindi and 13 regional languages.
 */

export type OptionKey = 'A' | 'B' | 'C' | 'D';
export const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

/* ── SSC patterns ─────────────────────────────────────────────────────── */

export interface PatternSection {
    name: string;
    questions: number;
    marks: number;
    /** Own minutes when the exam times sections (or sessions) separately. */
    minutes?: number;
    note?: string;
}

export interface SscPattern {
    id: string;
    /** Chip label. */
    label: string;
    name: string;
    /** 'sections': every section has its own clock; 'sessions': groups of sections share one; 'one': one clock. */
    timing: 'sections' | 'sessions' | 'one';
    minutes: number;
    right: string;
    wrong: string;
    languages: string;
    sections: PatternSection[];
    /** For 'sessions': which sections share each clock, with its minutes. */
    sessions?: { name: string; sections: number[]; minutes: number }[];
    /** How to set it up in TestoZa, one line each. */
    setup: { label: string; value: string }[];
    note: string;
}

export const PATTERNS: SscPattern[] = [
    {
        id: 'cgl1',
        label: 'CGL Tier 1',
        name: 'SSC CGL 2026, Tier 1',
        timing: 'sections',
        minutes: 60,
        right: '+2',
        wrong: '−0.5',
        languages: 'Hindi and English; English Comprehension in English only',
        sections: [
            { name: 'General Intelligence and Reasoning', questions: 25, marks: 50, minutes: 15 },
            { name: 'General Awareness', questions: 25, marks: 50, minutes: 15 },
            { name: 'Quantitative Aptitude', questions: 25, marks: 50, minutes: 15 },
            { name: 'English Comprehension', questions: 25, marks: 50, minutes: 15 },
        ],
        setup: [
            { label: 'Split into sections', value: 'On, 4 sections' },
            { label: 'Time each section', value: 'On, 15 min each' },
            { label: 'Marks / Wrong', value: '2 / 0.5' },
            { label: 'Scientific calculator', value: 'Off' },
            { label: 'Time limit', value: '60 min (added up)' },
        ],
        note: 'New for 2026: each section closes after its 15 minutes and you can’t go back. Finishing early doesn’t buy time for the next section.',
    },
    {
        id: 'chsl1',
        label: 'CHSL Tier 1',
        name: 'SSC CHSL 2026, Tier 1',
        timing: 'sections',
        minutes: 60,
        right: '+2',
        wrong: '−0.5',
        languages: 'Hindi and English; English Language in English only',
        sections: [
            { name: 'English Language', questions: 25, marks: 50, minutes: 15 },
            { name: 'General Intelligence', questions: 25, marks: 50, minutes: 15 },
            { name: 'Quantitative Aptitude', questions: 25, marks: 50, minutes: 15 },
            { name: 'General Awareness', questions: 25, marks: 50, minutes: 15 },
        ],
        setup: [
            { label: 'Split into sections', value: 'On, 4 sections' },
            { label: 'Time each section', value: 'On, 15 min each' },
            { label: 'Marks / Wrong', value: '2 / 0.5' },
            { label: 'Scientific calculator', value: 'Off' },
            { label: 'Time limit', value: '60 min (added up)' },
        ],
        note: 'Same shape as CGL Tier 1, and from the 2026 notice the same 15-minute sectional timer.',
    },
    {
        id: 'cgl2',
        label: 'CGL Tier 2',
        name: 'SSC CGL 2026, Tier 2 Paper I',
        timing: 'sections',
        minutes: 135,
        right: '+3',
        wrong: '−1',
        languages: 'Hindi and English; the English module in English only',
        sections: [
            { name: 'Mathematical Abilities', questions: 30, marks: 90, minutes: 30 },
            { name: 'Reasoning and General Intelligence', questions: 30, marks: 90, minutes: 30 },
            { name: 'English Language and Comprehension', questions: 45, marks: 135, minutes: 40 },
            { name: 'General Awareness', questions: 25, marks: 75, minutes: 20 },
            { name: 'Computer Knowledge', questions: 20, marks: 60, minutes: 15, note: 'Qualifying' },
        ],
        setup: [
            { label: 'Split into sections', value: 'On, 5 sections' },
            { label: 'Time each section', value: 'On, 30 / 30 / 40 / 20 / 15' },
            { label: 'Marks / Wrong', value: '3 / 1' },
            { label: 'Scientific calculator', value: 'Off' },
            { label: 'Time limit', value: '135 min (added up)' },
        ],
        note: 'Every module has its own time. The 15-minute Data Entry Speed Test that follows is a typing task, which TestoZa doesn’t run.',
    },
    {
        id: 'mts',
        label: 'MTS',
        name: 'SSC MTS and Havaldar',
        timing: 'sessions',
        minutes: 90,
        right: '+3',
        wrong: '0, then −1',
        languages: 'English, Hindi and 13 regional languages',
        sections: [
            { name: 'Numerical and Mathematical Ability', questions: 20, marks: 60 },
            { name: 'Reasoning Ability and Problem Solving', questions: 20, marks: 60 },
            { name: 'General Awareness', questions: 25, marks: 75 },
            { name: 'English Language and Comprehension', questions: 25, marks: 75 },
        ],
        sessions: [
            { name: 'Session I · no negative marks', sections: [0, 1], minutes: 45 },
            { name: 'Session II · −1 a wrong answer', sections: [2, 3], minutes: 45 },
        ],
        setup: [
            { label: 'Split into sections', value: 'On, 2 sections: Session I and II' },
            { label: 'Time each section', value: 'On, 45 min each' },
            { label: 'Marks / Wrong', value: '3 / 0, then 3 / 1' },
            { label: 'Scientific calculator', value: 'Off' },
            { label: 'Time limit', value: '90 min (added up)' },
        ],
        note: 'Two sessions of 45 minutes. Make each session one TestoZa section, so its two subjects share the session’s clock.',
    },
    {
        id: 'gd',
        label: 'GD Constable',
        name: 'SSC GD Constable',
        timing: 'one',
        minutes: 60,
        right: '+2',
        wrong: '−0.25',
        languages: 'English, Hindi and 13 regional languages',
        sections: [
            { name: 'General Intelligence and Reasoning', questions: 20, marks: 40 },
            { name: 'General Knowledge and General Awareness', questions: 20, marks: 40 },
            { name: 'Elementary Mathematics', questions: 20, marks: 40 },
            { name: 'English or Hindi', questions: 20, marks: 40 },
        ],
        setup: [
            { label: 'Split into sections', value: 'On, 4 sections' },
            { label: 'Time each section', value: 'Off: one 60-minute clock' },
            { label: 'Marks / Wrong', value: '2 / 0.25' },
            { label: 'Scientific calculator', value: 'Off' },
            { label: 'Time limit', value: '60 min' },
        ],
        note: 'No sectional timer: candidates move between sections freely within one hour.',
    },
];

/* ── The demo paper: a CGL Tier 1 in miniature ───────────────────────── */

export interface SscQuestion {
    /** Lines of the question, English then Hindi, as a bilingual import stores them. */
    text: string[];
    /** Option lines (English, Hindi). */
    options: Record<OptionKey, string[]>;
    answer: OptionKey;
    /** For the crawler text and the result. */
    plain: string;
    answerPlain: string;
}

export interface SscSection {
    name: string;
    /** Short name for small screens. */
    short: string;
    questions: SscQuestion[];
}

/** Marks for every question of the demo paper, as in CGL Tier 1. */
export const DEMO_MARKS = { plus: 2, minus: 0.5 };
/** Each section's time in the demo (seconds); the real paper gives 15 minutes. */
export const DEMO_SECTION_SECONDS = 45;
export const DEMO_TITLE = 'SSC CGL Tier 1 · Mock 07';

const opts = (a: string[], b: string[], c: string[], d: string[]): Record<OptionKey, string[]> => ({ A: a, B: b, C: c, D: d });

export const DEMO_SECTIONS: SscSection[] = [
    {
        name: 'General Intelligence and Reasoning',
        short: 'Reasoning',
        questions: [
            {
                text: ['Select the number that will replace the question mark (?) in the series.', 'दी गई श्रृंखला में प्रश्नचिह्न (?) के स्थान पर कौन-सी संख्या आएगी?', '3, 8, 15, 24, 35, ?'],
                // n² − 1 for n = 2…7
                options: opts(['46'], ['48'], ['49'], ['50']),
                answer: 'B',
                plain: 'Select the number that will replace the question mark in the series 3, 8, 15, 24, 35, ?',
                answerPlain: '48 (each term is one less than a square: 2² − 1 … 7² − 1)',
            },
            {
                text: ['In a certain code language, COLD is written as DPME. How is WARM written in that language?', 'किसी कूट भाषा में COLD को DPME लिखा जाता है। उसी भाषा में WARM को कैसे लिखा जाएगा?'],
                // every letter moves one place forward
                options: opts(['XBSN'], ['VZQL'], ['XCSN'], ['YBSN']),
                answer: 'A',
                plain: 'In a certain code language, COLD is written as DPME. How is WARM written in that language?',
                answerPlain: 'XBSN (each letter moves one place forward)',
            },
            {
                text: [
                    'Pointing to a man, Riya said, “He is the only son of my grandfather’s only son.” How is the man related to Riya?',
                    'एक आदमी की ओर इशारा करते हुए रिया ने कहा, “वह मेरे दादाजी के इकलौते बेटे का इकलौता बेटा है।” वह आदमी रिया से कैसे संबंधित है?',
                ],
                // grandfather's only son = Riya's father; his only son = her brother
                options: opts(['Father', 'पिता'], ['Uncle', 'चाचा'], ['Brother', 'भाई'], ['Cousin', 'चचेरा भाई']),
                answer: 'C',
                plain: 'Pointing to a man, Riya said, “He is the only son of my grandfather’s only son.” How is the man related to Riya?',
                answerPlain: 'Brother',
            },
        ],
    },
    {
        name: 'General Awareness',
        short: 'Awareness',
        questions: [
            {
                text: ['Who appoints the Chief Election Commissioner of India?', 'भारत के मुख्य निर्वाचन आयुक्त की नियुक्ति कौन करता है?'],
                // Article 324(2)
                options: opts(['The Prime Minister', 'प्रधानमंत्री'], ['The President', 'राष्ट्रपति'], ['The Chief Justice of India', 'भारत के मुख्य न्यायाधीश'], ['The Speaker of the Lok Sabha', 'लोकसभा अध्यक्ष']),
                answer: 'B',
                plain: 'Who appoints the Chief Election Commissioner of India?',
                answerPlain: 'The President (Article 324)',
            },
            {
                text: ['Which vitamin is made in the human skin when it is exposed to sunlight?', 'सूर्य के प्रकाश के संपर्क में आने पर मानव त्वचा में कौन-सा विटामिन बनता है?'],
                options: opts(['Vitamin A', 'विटामिन A'], ['Vitamin C', 'विटामिन C'], ['Vitamin K', 'विटामिन K'], ['Vitamin D', 'विटामिन D']),
                answer: 'D',
                plain: 'Which vitamin is made in the human skin when it is exposed to sunlight?',
                answerPlain: 'Vitamin D',
            },
            {
                text: ['In which year was the Battle of Plassey fought?', 'प्लासी का युद्ध किस वर्ष लड़ा गया था?'],
                options: opts(['1764'], ['1761'], ['1757'], ['1857']),
                answer: 'C',
                plain: 'In which year was the Battle of Plassey fought?',
                answerPlain: '1757',
            },
        ],
    },
    {
        name: 'Quantitative Aptitude',
        short: 'Quant',
        questions: [
            {
                text: ['If 15% of A is equal to 20% of B, then A : B is:', 'यदि A का 15%, B के 20% के बराबर है, तो A : B है:'],
                // 0.15A = 0.20B → A/B = 4/3
                options: opts(['3 : 4'], ['5 : 3'], ['2 : 3'], ['4 : 3']),
                answer: 'D',
                plain: 'If 15% of A is equal to 20% of B, then A : B is:',
                answerPlain: '4 : 3',
            },
            {
                text: [
                    'A shopkeeper marks an article 25% above its cost price and allows a discount of 12%. What is his profit per cent?',
                    'एक दुकानदार किसी वस्तु पर क्रय मूल्य से 25% अधिक मूल्य अंकित करता है और 12% की छूट देता है। उसका लाभ प्रतिशत क्या है?',
                ],
                // 1.25 × 0.88 = 1.10
                options: opts(['10%'], ['8%'], ['12%'], ['13%']),
                answer: 'A',
                plain: 'A shopkeeper marks an article 25% above its cost price and allows a discount of 12%. What is his profit per cent?',
                answerPlain: '10% (1.25 × 0.88 = 1.10)',
            },
            {
                text: ['The average of five consecutive odd numbers is 27. What is the largest of these numbers?', 'पाँच क्रमागत विषम संख्याओं का औसत 27 है। इनमें सबसे बड़ी संख्या कौन-सी है?'],
                // 23, 25, 27, 29, 31
                options: opts(['29'], ['33'], ['31'], ['35']),
                answer: 'C',
                plain: 'The average of five consecutive odd numbers is 27. What is the largest of these numbers?',
                answerPlain: '31 (the numbers are 23, 25, 27, 29, 31)',
            },
        ],
    },
    {
        name: 'English Comprehension',
        short: 'English',
        questions: [
            {
                text: ['Select the most appropriate synonym of the given word.', 'ABUNDANT'],
                options: opts(['Scarce'], ['Plentiful'], ['Abandoned'], ['Rare']),
                answer: 'B',
                plain: 'Select the most appropriate synonym of the word ABUNDANT.',
                answerPlain: 'Plentiful',
            },
            {
                text: ['Select the correctly spelt word.'],
                options: opts(['Accommodation'], ['Acommodation'], ['Accomodation'], ['Acomodation']),
                answer: 'A',
                plain: 'Select the correctly spelt word: Accommodation, Acommodation, Accomodation, Acomodation.',
                answerPlain: 'Accommodation',
            },
            {
                text: ['Select the most appropriate option to fill in the blank.', 'She has been working in this office ______ 2019.'],
                options: opts(['for'], ['from'], ['since'], ['by']),
                answer: 'C',
                plain: 'Select the most appropriate option to fill in the blank: She has been working in this office ______ 2019.',
                answerPlain: 'since',
            },
        ],
    },
];

/* ── Guess or skip ────────────────────────────────────────────────────── */

export interface Marking {
    id: string;
    label: string;
    exams: string;
    right: number;
    wrong: number;
}

export const MARKINGS: Marking[] = [
    { id: 'tier1', label: '+2 / −0.5', exams: 'CGL and CHSL Tier 1, Selection Post', right: 2, wrong: 0.5 },
    { id: 'gd', label: '+2 / −0.25', exams: 'GD Constable', right: 2, wrong: 0.25 },
    { id: 'tier2', label: '+3 / −1', exams: 'CGL and CHSL Tier 2, MTS Session II', right: 3, wrong: 1 },
    { id: 'mts1', label: '+3 / 0', exams: 'MTS Session I', right: 3, wrong: 0 },
];

/** Expected marks of one guess among `left` options (one of them right). */
export const guessValue = (m: Marking, left: number) => m.right / left - (m.wrong * (left - 1)) / left;
