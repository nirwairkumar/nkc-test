/**
 * The six-question NEET mini-mock used on testoza.com/neet-online-test-software.
 * The playable exam screen (pages/guides/neet/ExamDemo.tsx) and the crawler text
 * (neetOnlineTestSoftware.ts) both read it, so the questions people answer and the
 * questions search engines read are the same. Dependency-free like the rest of
 * src/guides (the Cloudflare worker bundles it).
 *
 * Each question is written in NTA's NEET style and checked against the NCERT
 * Class 11 textbooks (Physics: Motion in a Plane / Motion in a Straight Line;
 * Chemistry: Chemical Bonding; Biology: Photosynthesis in Higher Plants,
 * Respiration in Plants, Body Fluids and Circulation).
 */

export type OptionKey = 'A' | 'B' | 'C' | 'D';

export interface MiniMockQuestion {
    id: number;
    section: 'Physics' | 'Chemistry' | 'Botany' | 'Zoology';
    /** The NEET format, for captions and the crawler text. */
    format: string;
    /** Opening line(s) of the question. */
    lead: string;
    /** Labelled statements, each on its own line. */
    statements?: string[];
    /** List-I / List-II table. */
    table?: { head: [string, string]; rows: [string, string][] };
    /** Diagram drawn by the page (an image in a real test). */
    figure?: 'mitochondrion';
    /** Closing instruction. */
    tail?: string;
    options: Record<OptionKey, string>;
    answer: OptionKey;
    /** One-line explanation shown after submitting. */
    why: string;
}

export const MINI_MOCK_TITLE = 'NEET Mini Mock · Physics, Chemistry, Biology';
/** One minute a question, NEET's average pace. */
export const MINI_MOCK_SECONDS = 6 * 60;
export const MINI_MOCK_MARKS = { correct: 4, wrong: 1 };

export const MINI_MOCK: MiniMockQuestion[] = [
    {
        id: 1,
        section: 'Physics',
        format: 'Assertion–Reason',
        lead: 'Given below are two statements: one is labelled as Assertion A and the other is labelled as Reason R.',
        statements: [
            'Assertion A: A body moving along a circle at constant speed is accelerated.',
            'Reason R: The direction of its velocity changes continuously.',
        ],
        tail: 'In the light of the above statements, choose the correct answer from the options given below:',
        options: {
            A: 'Both A and R are true and R is the correct explanation of A',
            B: 'Both A and R are true but R is NOT the correct explanation of A',
            C: 'A is true but R is false',
            D: 'A is false but R is true',
        },
        answer: 'A',
        why: 'Velocity is a vector, so a change in its direction alone is an acceleration (the centripetal acceleration). R explains A.',
    },
    {
        id: 2,
        section: 'Physics',
        format: 'Single correct (numerical)',
        lead: 'A ball is thrown vertically upwards with a speed of 20 m s⁻¹. Taking g = 10 m s⁻², the maximum height it reaches is:',
        options: { A: '10 m', B: '20 m', C: '30 m', D: '40 m' },
        answer: 'B',
        why: 'h = u² / 2g = 400 / 20 = 20 m.',
    },
    {
        id: 3,
        section: 'Chemistry',
        format: 'Match List-I with List-II',
        lead: 'Match List-I with List-II.',
        table: {
            head: ['List-I (Molecule)', 'List-II (Shape)'],
            rows: [
                ['A. BeCl₂', 'I. Trigonal planar'],
                ['B. BF₃', 'II. Linear'],
                ['C. CH₄', 'III. Trigonal bipyramidal'],
                ['D. PCl₅', 'IV. Tetrahedral'],
            ],
        },
        tail: 'Choose the correct answer from the options given below:',
        options: {
            A: 'A-II, B-I, C-IV, D-III',
            B: 'A-I, B-II, C-IV, D-III',
            C: 'A-II, B-IV, C-I, D-III',
            D: 'A-III, B-I, C-IV, D-II',
        },
        answer: 'A',
        why: 'BeCl₂ is linear, BF₃ trigonal planar, CH₄ tetrahedral and PCl₅ trigonal bipyramidal.',
    },
    {
        id: 4,
        section: 'Botany',
        format: 'Statement I / Statement II',
        lead: 'Given below are two statements:',
        statements: [
            'Statement I: In C₄ plants, the first fixation of CO₂ in the mesophyll cells is carried out by PEP carboxylase.',
            'Statement II: In C₄ plants, the Calvin cycle takes place in the bundle sheath cells.',
        ],
        tail: 'In the light of the above statements, choose the most appropriate answer from the options given below:',
        options: {
            A: 'Both Statement I and Statement II are correct',
            B: 'Both Statement I and Statement II are incorrect',
            C: 'Statement I is correct but Statement II is incorrect',
            D: 'Statement I is incorrect but Statement II is correct',
        },
        answer: 'A',
        why: 'PEP carboxylase fixes CO₂ into oxaloacetate in the mesophyll; RuBisCO and the Calvin cycle work in the bundle sheath.',
    },
    {
        id: 5,
        section: 'Botany',
        format: 'Diagram-based',
        lead: 'The diagram shows a mitochondrion. Which labelled part is the site of the Krebs cycle?',
        figure: 'mitochondrion',
        options: { A: 'P', B: 'Q', C: 'R', D: 'S' },
        answer: 'C',
        why: 'The Krebs (TCA) cycle runs in the matrix, R. The electron transport system sits on the inner membrane and its cristae, Q.',
    },
    {
        id: 6,
        section: 'Zoology',
        format: 'Choose the incorrect statement',
        lead: 'Which one of the following statements about human blood is incorrect?',
        options: {
            A: 'Mature human red blood cells have no nucleus.',
            B: 'Neutrophils are the most abundant white blood cells.',
            C: 'Platelets are produced from megakaryocytes.',
            D: 'People with blood group AB have both anti-A and anti-B antibodies in their plasma.',
        },
        answer: 'D',
        why: 'Group AB carries both antigens on its red cells and neither antibody in its plasma, which is why AB is called the universal recipient.',
    },
];

/** Labels on the mitochondrion diagram, for alt text and the crawler text. */
export const MITOCHONDRION_LABELS = 'P, the outer membrane; Q, a crista of the inner membrane; R, the matrix; S, the space between the two membranes';
