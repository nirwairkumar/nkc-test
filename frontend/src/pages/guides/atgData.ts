/**
 * Sample content for the AI test generator guide's hero and widgets: a Class 9
 * "Force and Laws of Motion" chapter. Every answer here has been worked out
 * (e.g. trolley: a = (8 − 2) / 3 = 2 m/s², F = 4 × 2 = 8 N; blocks: a = 20 / 5 =
 * 4 m/s², force on the 3 kg block = 3 × 4 = 12 N).
 */

export type DemoType = 'single' | 'multiple' | 'numerical';

export interface DemoQuestion {
    type: DemoType;
    /** As shown (Unicode maths). Bilingual text is "English\nHindi". */
    text: string;
    /** What is stored: LaTeX inside $…$, as the Raw switch shows it. */
    raw?: string;
    options?: [string, string][];
    /** Option key(s), or the numerical answer as displayed. */
    answer: string | string[] | null;
    page?: number;
    passage?: string;
    diagram?: boolean;
}

const opts = (a: string, b: string, c: string, d: string): [string, string][] => [
    ['A', a],
    ['B', b],
    ['C', c],
    ['D', d],
];

/** Generated in English + Hindi at Moderate: what the hero's run produces (cycled to 20). */
export const GENERATED_BILINGUAL: DemoQuestion[] = [
    {
        type: 'single',
        text: 'A trolley of mass 4 kg speeds up from 2 m/s to 8 m/s in 3 s. What net force acts on it?\n4 kg द्रव्यमान की एक ट्रॉली का वेग 3 s में 2 m/s से बढ़कर 8 m/s हो जाता है। उस पर कितना परिणामी बल लगता है?',
        options: opts('2 N', '8 N', '6 N', '32 N'),
        answer: 'B',
        page: 2,
    },
    {
        type: 'numerical',
        text: 'A net force of 15 N gives a body an acceleration of 3 m/s². What is its mass in kg?\n15 N का परिणामी बल किसी पिंड में 3 m/s² का त्वरण उत्पन्न करता है। उसका द्रव्यमान kg में कितना है?',
        answer: '5',
        page: 2,
    },
    {
        type: 'single',
        text: 'Which of these has the greatest inertia?\nइनमें से किसका जड़त्व सबसे अधिक है?',
        options: opts('A cricket ball\nक्रिकेट गेंद', 'A bicycle\nसाइकिल', 'A loaded truck\nभरा हुआ ट्रक', 'A football\nफ़ुटबॉल'),
        answer: 'C',
        page: 1,
    },
    {
        type: 'single',
        text: 'A gun recoils when a bullet is fired. Which law explains this?\nगोली चलने पर बंदूक पीछे की ओर झटका देती है। यह किस नियम से समझाया जाता है?',
        options: opts(
            "Newton's first law\nन्यूटन का पहला नियम",
            "Newton's second law\nन्यूटन का दूसरा नियम",
            "Newton's third law\nन्यूटन का तीसरा नियम",
            'The law of gravitation\nगुरुत्वाकर्षण का नियम',
        ),
        answer: 'C',
        page: 4,
    },
    {
        type: 'multiple',
        text: 'Which statements about 1 newton are correct?\n1 न्यूटन के बारे में कौन-से कथन सही हैं?',
        options: opts(
            'It gives 1 kg an acceleration of 1 m/s²\nयह 1 kg को 1 m/s² का त्वरण देता है',
            'It equals 1 kg m/s²\nयह 1 kg m/s² के बराबर है',
            'It equals 1 kg m/s\nयह 1 kg m/s के बराबर है',
            'It is the unit of momentum\nयह संवेग का मात्रक है',
        ),
        answer: ['A', 'B'],
        page: 2,
    },
    {
        type: 'single',
        text: 'A 0.2 kg ball moving at 10 m/s is stopped in 0.1 s. What average force stops it?\n10 m/s से चल रही 0.2 kg की गेंद 0.1 s में रुक जाती है। उसे रोकने वाला औसत बल कितना है?',
        options: opts('2 N', '20 N', '200 N', '0.2 N'),
        answer: 'B',
        page: 3,
    },
    {
        type: 'single',
        text: 'What is the momentum of a 50 kg runner moving at 6 m/s?\n6 m/s से दौड़ रहे 50 kg के धावक का संवेग कितना है?',
        options: opts('300 kg m/s', '56 kg m/s', '8.3 kg m/s', '3000 kg m/s'),
        answer: 'A',
        page: 3,
    },
    {
        type: 'numerical',
        text: 'A 1200 kg car accelerates at 2.5 m/s². Find the net force on it in newtons.\n1200 kg की एक कार 2.5 m/s² से त्वरित होती है। उस पर लगने वाला परिणामी बल न्यूटन में ज्ञात कीजिए।',
        answer: '3000',
        page: 2,
    },
    {
        type: 'single',
        text: 'Passengers lurch forward when a moving bus brakes suddenly. This is because of\nचलती बस में अचानक ब्रेक लगने पर यात्री आगे की ओर झुक जाते हैं। इसका कारण है',
        options: opts('inertia of motion\nगति का जड़त्व', 'inertia of rest\nविराम का जड़त्व', 'friction of the seats\nसीटों का घर्षण', 'gravity\nगुरुत्वाकर्षण'),
        answer: 'A',
        page: 1,
    },
    {
        type: 'single',
        text: 'Blocks of 2 kg and 3 kg touch on a smooth floor. A 20 N push acts on the 2 kg block. What force acts between them?\nचिकने फ़र्श पर 2 kg और 3 kg के गुटके एक-दूसरे को छू रहे हैं। 2 kg वाले गुटके पर 20 N का धक्का लगता है। उनके बीच कितना बल लगता है?',
        options: opts('20 N', '8 N', '12 N', '4 N'),
        answer: 'C',
        page: 4,
    },
];

export const isCorrectKey = (q: DemoQuestion, key: string) =>
    Array.isArray(q.answer) ? q.answer.includes(key) : q.answer === key;

export const TYPE_SHORT: Record<DemoType, string> = { single: 'Single', multiple: 'Multiple', numerical: 'Numerical' };
export const TYPE_LONG: Record<DemoType, string> = {
    single: 'Single choice',
    multiple: 'Multiple correct',
    numerical: 'Numerical',
};

/* ── Settings lab: one question slot, three difficulties, two languages ───── */

export type Difficulty = 'Easy' | 'Moderate' | 'Tough';

interface Bi {
    en: string;
    hi: string;
}
export interface LabQuestion {
    q: Bi;
    options: [string, Bi][];
    answer: string;
    why: string;
}
const same = (s: string): Bi => ({ en: s, hi: s });

export const LAB: Record<Difficulty, LabQuestion> = {
    Easy: {
        q: { en: 'What is the SI unit of force?', hi: 'बल का SI मात्रक क्या है?' },
        options: [
            ['A', { en: 'Joule', hi: 'जूल' }],
            ['B', { en: 'Newton', hi: 'न्यूटन' }],
            ['C', { en: 'Watt', hi: 'वाट' }],
            ['D', { en: 'Pascal', hi: 'पास्कल' }],
        ],
        answer: 'B',
        why: 'A direct concept check: one fact, recalled.',
    },
    Moderate: {
        q: {
            en: 'A trolley of mass 4 kg speeds up from 2 m/s to 8 m/s in 3 s. What net force acts on it?',
            hi: '4 kg द्रव्यमान की एक ट्रॉली का वेग 3 s में 2 m/s से बढ़कर 8 m/s हो जाता है। उस पर कितना परिणामी बल लगता है?',
        },
        options: [
            ['A', same('2 N')],
            ['B', same('8 N')],
            ['C', same('6 N')],
            ['D', same('32 N')],
        ],
        answer: 'B',
        why: 'Two steps: find the acceleration, then F = ma. Each wrong option is a real slip: 2 N is the acceleration alone, 6 N is the change in speed, 32 N uses the final speed.',
    },
    Tough: {
        q: {
            en: 'Two blocks of 2 kg and 3 kg lie in contact on a smooth floor. A 20 N horizontal force pushes the 2 kg block. What force does the 2 kg block exert on the 3 kg block?',
            hi: '2 kg और 3 kg के दो गुटके चिकने फ़र्श पर एक-दूसरे को छूते हुए रखे हैं। 20 N का क्षैतिज बल 2 kg वाले गुटके को धकेलता है। 2 kg वाला गुटका 3 kg वाले गुटके पर कितना बल लगाता है?',
        },
        options: [
            ['A', same('20 N')],
            ['B', same('8 N')],
            ['C', same('12 N')],
            ['D', same('4 N')],
        ],
        answer: 'C',
        why: 'The system accelerates at 4 m/s², and only the 3 kg block’s share counts. 20 N catches students who pass the whole force along; 8 N uses the wrong block.',
    },
};

export const INSTRUCTION_PRESETS = [
    'Each question 4 marks, −1 for a wrong answer.',
    'Generate 30 questions, at least 8 numerical.',
    'Only from section 9.3, Newton’s second law.',
];

/* ── Review replica: an extracted unit test ─────────────────────────────── */

export const REVIEW_PASSAGE =
    'A fielder pulls her hands back while catching a fast cricket ball. The ball’s momentum falls to zero either way, but pulling back makes it happen over a longer time.';

export const REVIEW_QUESTIONS: DemoQuestion[] = [
    {
        type: 'single',
        text: 'A force of 10 N acts on a body of mass 2 kg. The acceleration produced is',
        raw: 'A force of $10\\,\\text{N}$ acts on a body of mass $2\\,\\text{kg}$. The acceleration produced is',
        options: opts('20 m/s²', '5 m/s²', '12 m/s²', '0.2 m/s²'),
        answer: 'B',
        page: 1,
    },
    {
        type: 'single',
        text: 'The velocity–time graph of a car is shown. What is its acceleration between 0 and 4 s?',
        raw: 'The velocity–time graph of a car is shown. What is its acceleration between $0$ and $4\\,\\text{s}$?',
        options: opts('4 m/s²', '5 m/s²', '20 m/s²', '80 m/s²'),
        answer: 'B',
        page: 1,
        diagram: true,
    },
    {
        type: 'numerical',
        text: 'A body starts from rest and reaches 10 m/s in 4 s. Find its acceleration in m/s².',
        raw: 'A body starts from rest and reaches $10\\,\\text{m s}^{-1}$ in $4\\,\\text{s}$. Find its acceleration in $\\text{m s}^{-2}$.',
        answer: '2.4 – 2.6',
        page: 2,
    },
    {
        type: 'multiple',
        text: 'Which of the following are vector quantities? (One or more options may be correct.)',
        raw: 'Which of the following are vector quantities? (One or more options may be correct.)',
        options: opts('Momentum', 'Mass', 'Force', 'Speed'),
        answer: ['A', 'C'],
        page: 2,
    },
    {
        type: 'single',
        text: 'A body moves with uniform velocity. The net force acting on it is',
        raw: 'A body moves with uniform velocity. The net force acting on it is',
        options: opts('zero', 'equal to its weight', 'in the direction of motion', 'opposite to the motion'),
        answer: null,
        page: 2,
    },
    {
        type: 'single',
        text: 'Why does pulling the hands back reduce the force on them?',
        raw: 'Why does pulling the hands back reduce the force on them?',
        options: opts(
            'It reduces the ball’s mass',
            'It increases the time taken to stop the ball',
            'It reduces the change in momentum',
            'It increases the ball’s speed',
        ),
        answer: 'B',
        page: 3,
        passage: REVIEW_PASSAGE,
    },
    {
        type: 'single',
        text: 'The SI unit of momentum is',
        raw: 'The SI unit of momentum is',
        options: opts('kg m/s', 'kg m/s²', 'N/s', 'J s'),
        answer: null,
        page: 3,
    },
    {
        type: 'single',
        text: 'Which law gives a measure of force?',
        raw: 'Which law gives a measure of force?',
        options: opts('Newton’s first law', 'Newton’s second law', 'Newton’s third law', 'The law of conservation of momentum'),
        answer: 'B',
        page: 4,
    },
];
