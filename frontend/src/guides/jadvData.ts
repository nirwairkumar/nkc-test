/**
 * Example content for /jee-advanced-mock-test-software, shared by the page's demos and the
 * crawler text in jeeAdvancedMockTestSoftware.ts. Every question was written for this page
 * in the style of a recent JEE Advanced paper, and every answer was worked by hand (the
 * working is in a comment). Maths and chemistry are stored the way TestoZa stores them:
 * text with $…$ around LaTeX, formulas in mhchem's \ce{}. `plain` is a Unicode version for
 * crawlers and for the moment before KaTeX loads.
 *
 * Plain TypeScript with no imports, so the Cloudflare worker can bundle it.
 */

export type OptionKey = 'A' | 'B' | 'C' | 'D';
export const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

/** A numerical answer as the builder saves it (QuestionCard.tsx). */
export interface NumericSetting {
    exactMatch: boolean;
    exactAnswers: string;
    min: number;
    max: number;
}

export interface JadvQuestion {
    type: 'single' | 'multiple' | 'numerical';
    subject: 'Physics' | 'Chemistry' | 'Mathematics';
    /** The JEE Advanced section the question imitates. */
    section: string;
    topic: string;
    text: string;
    plain: string;
    options?: Record<OptionKey, string>;
    optionsPlain?: Record<OptionKey, string>;
    /** single: one key; multiple: every correct key; numerical: the builder's setting. */
    answer: OptionKey | OptionKey[] | NumericSetting;
    /** The answer as a reader would say it. */
    answerPlain: string;
    marks: number;
    negative: number;
    /** Multiple correct only: TestoZa's "JEE Advanced" partial marks. */
    partialMarking?: 'per_option';
}

/**
 * "P → 2, Q → 1, R → 3, S → 4" with each pair braced, so a narrow screen wraps at a comma
 * and never between an arrow and its number. (Built by joining, because "${" inside a
 * template string would start an interpolation.)
 */
const coding = (p: number, q: number, r: number, s: number) =>
    '$' + [['P', p], ['Q', q], ['R', r], ['S', s]].map(([k, v]) => '{' + k + ' \\to ' + v + '}').join(',\\ ') + '$';

/* ── The paper on a candidate's phone (jadv-exam) ──────────────────────── */

export const PAPER = {
    title: 'JEE Advanced Mock 4 · Paper 1',
    minutes: 20,
};

export const EXAM: JadvQuestion[] = [
    {
        // −25 = 20t − 5t² → t² − 4t − 5 = 0 → t = 5 s. Traps: 4 s is when it passes the top of
        // the tower again (2u/g), 2 s is the top of its flight (u/g), √5 s ignores the throw.
        type: 'single',
        subject: 'Physics',
        section: 'Section 1 · one correct option',
        topic: 'Kinematics',
        text: String.raw`A ball is thrown vertically upwards at $20\ \text{m s}^{-1}$ from the top of a tower $25\ \text{m}$ high. Taking $g = 10\ \text{m s}^{-2}$, the ball hits the ground after`,
        plain: 'A ball is thrown vertically upwards at 20 m s⁻¹ from the top of a tower 25 m high. Taking g = 10 m s⁻², the ball hits the ground after',
        options: { A: String.raw`$4\ \text{s}$`, B: String.raw`$5\ \text{s}$`, C: String.raw`$2\ \text{s}$`, D: String.raw`$\sqrt{5}\ \text{s}$` },
        optionsPlain: { A: '4 s', B: '5 s', C: '2 s', D: '√5 s' },
        answer: 'B',
        answerPlain: '(B) 5 s',
        marks: 3,
        negative: 1,
    },
    {
        // f′(x) = 3x² − 3 = 0 at x = ±1; f″(x) = 6x: f″(−1) < 0 (maximum), f″(1) > 0 (minimum).
        // f′ < 0 on (−1, 1), so f is decreasing there. x(x² − 3) = 0 → 0, ±√3: three roots.
        type: 'multiple',
        subject: 'Mathematics',
        section: 'Section 2 · one or more correct options',
        topic: 'Application of derivatives',
        text: String.raw`Let $f(x) = x^{3} - 3x$ for all real $x$. Which of the following statements is (are) TRUE?`,
        plain: 'Let f(x) = x³ − 3x for all real x. Which of the following statements is (are) TRUE?',
        options: {
            A: String.raw`$f$ has a local maximum at $x = -1$`,
            B: String.raw`$f$ has a local minimum at $x = 1$`,
            C: String.raw`$f$ is increasing on the interval $(-1,\ 1)$`,
            D: String.raw`The equation $f(x) = 0$ has three real roots`,
        },
        optionsPlain: {
            A: 'f has a local maximum at x = −1',
            B: 'f has a local minimum at x = 1',
            C: 'f is increasing on the interval (−1, 1)',
            D: 'The equation f(x) = 0 has three real roots',
        },
        answer: ['A', 'B', 'D'],
        answerPlain: '(A), (B) and (D)',
        marks: 4,
        negative: 2,
        partialMarking: 'per_option',
    },
    {
        // O₂ has two unpaired π* electrons; NO has one (11 valence electrons). N₂ and CO are
        // isoelectronic (10 valence electrons), all paired.
        type: 'multiple',
        subject: 'Chemistry',
        section: 'Section 2 · one or more correct options',
        topic: 'Chemical bonding',
        text: String.raw`Which of the following is (are) paramagnetic?`,
        plain: 'Which of the following is (are) paramagnetic?',
        options: { A: String.raw`$\ce{O2}$`, B: String.raw`$\ce{N2}$`, C: String.raw`$\ce{NO}$`, D: String.raw`$\ce{CO}$` },
        optionsPlain: { A: 'O₂', B: 'N₂', C: 'NO', D: 'CO' },
        answer: ['A', 'C'],
        answerPlain: '(A) and (C)',
        marks: 4,
        negative: 2,
        partialMarking: 'per_option',
    },
    {
        // tan⁻¹(1) − tan⁻¹(0) = π/4 = 0.7853…: 0.78 truncated, 0.79 rounded.
        type: 'numerical',
        subject: 'Mathematics',
        section: 'Section 3 · numerical value',
        topic: 'Definite integrals',
        text: String.raw`The value of $\int_{0}^{1} \frac{dx}{1+x^{2}}$, correct up to the 2nd decimal place, is ____.`,
        plain: 'The value of ∫₀¹ dx/(1 + x²), correct up to the 2nd decimal place, is ____.',
        answer: { exactMatch: false, exactAnswers: '', min: 0.78, max: 0.79 },
        answerPlain: '0.78 to 0.79 (π/4 = 0.785…)',
        marks: 4,
        negative: 0,
    },
    {
        // Fe²⁺ is d⁶; H₂O is a weak-field ligand, so high spin t₂g⁴ e_g²: 4 unpaired electrons.
        type: 'numerical',
        subject: 'Chemistry',
        section: 'Section 3 · non-negative integer',
        topic: 'Coordination compounds',
        text: String.raw`The number of unpaired electrons in $\ce{[Fe(H2O)6]^2+}$ is ____.`,
        plain: 'The number of unpaired electrons in [Fe(H₂O)₆]²⁺ is ____.',
        answer: { exactMatch: true, exactAnswers: '4', min: 0, max: 0 },
        answerPlain: '4',
        marks: 4,
        negative: 0,
    },
    {
        // P: sin 3x / x → 3 (2). Q: [x²]₀¹ = 1 (1). R: 2x at x = 2 → 4 (3). S: ⁴C₂ = 6 (4).
        // (5) 2 is the spare. Traps: P → 1 (sin x / x), Q → 5 (the integrand's 2), R ↔ S swapped.
        type: 'single',
        subject: 'Mathematics',
        section: 'Section 4 · matching lists',
        topic: 'Mixed: limits, integrals, P&C',
        text: String.raw`Match each entry in List-I with its value in List-II and choose the correct option. $\begin{array}{ll} \textbf{List-I} & \textbf{List-II} \\ (P)\ \lim_{x \to 0} \frac{\sin 3x}{x} & (1)\ 1 \\ (Q)\ \int_{0}^{1} 2x\,dx & (2)\ 3 \\ (R)\ \frac{d}{dx}\left(x^{2}\right) \text{ at } x = 2 & (3)\ 4 \\ (S)\ \binom{4}{2} & (4)\ 6 \\ & (5)\ 2 \end{array}$`,
        plain: 'Match each entry in List-I with its value in List-II. List-I: (P) lim x→0 of sin 3x / x; (Q) ∫₀¹ 2x dx; (R) d/dx (x²) at x = 2; (S) ⁴C₂. List-II: (1) 1 (2) 3 (3) 4 (4) 6 (5) 2.',
        options: {
            A: coding(2, 1, 3, 4),
            B: coding(2, 5, 3, 4),
            C: coding(1, 5, 3, 4),
            D: coding(2, 1, 4, 3),
        },
        optionsPlain: { A: 'P → 2, Q → 1, R → 3, S → 4', B: 'P → 2, Q → 5, R → 3, S → 4', C: 'P → 1, Q → 5, R → 3, S → 4', D: 'P → 2, Q → 1, R → 4, S → 3' },
        answer: 'A',
        answerPlain: '(A) P → 2, Q → 1, R → 3, S → 4',
        marks: 3,
        negative: 1,
    },
];

/* ── The marking rule (jadv-marking) ───────────────────────────────────── */

/** JEE Advanced's rule for one-or-more-correct questions, as recent papers print it. */
export const RULE = [
    { id: 'full', marks: '+4', when: 'Only if (all) the correct options are chosen' },
    { id: 'three', marks: '+3', when: 'All four options are correct but only three are chosen' },
    { id: 'two', marks: '+2', when: 'Three or more options are correct but only two are chosen, both correct' },
    { id: 'one', marks: '+1', when: 'Two or more options are correct but only one is chosen, and it is correct' },
    { id: 'none', marks: '0', when: 'None of the options is chosen (unanswered)' },
    { id: 'wrong', marks: '−2', when: 'In all other cases' },
] as const;

export type RuleId = (typeof RULE)[number]['id'];

/** Which line of the rule a choice falls under. */
export function ruleFor(key: OptionKey[], picked: OptionKey[]): RuleId {
    if (picked.length === 0) return 'none';
    if (picked.some((p) => !key.includes(p))) return 'wrong';
    if (picked.length === key.length) return 'full';
    if (picked.length === 3) return 'three';
    if (picked.length === 2) return 'two';
    return 'one';
}

/** Try-this chips under the marking lab: an answer key and a candidate's choice. */
export const MARKING_PRESETS: { id: string; label: string; key: OptionKey[]; picked: OptionKey[] }[] = [
    { id: 'two-of-three', label: '2 of 3 correct', key: ['A', 'B', 'D'], picked: ['A', 'B'] },
    { id: 'one-of-two', label: '1 of 2 correct', key: ['A', 'C'], picked: ['C'] },
    { id: 'three-of-four', label: '3 of 4 correct', key: ['A', 'B', 'C', 'D'], picked: ['A', 'B', 'D'] },
    { id: 'one-of-three', label: '1 of 3 correct', key: ['A', 'B', 'D'], picked: ['D'] },
    { id: 'one-wrong', label: 'One wrong pick', key: ['A', 'B', 'D'], picked: ['A', 'B', 'C'] },
];

/* ── Paper 1, a break, Paper 2 (jadv-papers) ───────────────────────────── */

export const SESSION = {
    title: 'JEE Advanced Full Mock 4',
    paper1Label: 'Paper 1',
    paper2Label: 'Paper 2',
    paper1: { title: 'Mock 4 · Paper 1', questions: 51, minutes: 180, marks: 180, score: 97, correct: 24, partial: 5, wrong: 9 },
    paper2: { title: 'Mock 4 · Paper 2', questions: 51, minutes: 180, marks: 180, score: 84, correct: 21, partial: 4, wrong: 11 },
    breakMinutes: 30,
};

/* ── Numerical answers to two decimals (jadv-numerical) ────────────────── */

export const NUMERIC = {
    text: EXAM[3].text,
    plain: EXAM[3].plain,
    answers: [
        { name: 'Aarav', value: '0.78' },
        { name: 'Diya', value: '0.79' },
        { name: 'Kabir', value: '0.785' },
        { name: 'Meera', value: '0.8' },
        { name: 'Ishaan', value: '0.77' },
        { name: 'Sara', value: '1.57' },
    ],
    presets: [
        { id: 'exact', label: 'Exact: 0.79', setting: { exactMatch: true, exactAnswers: '0.79', min: 0, max: 0 } },
        { id: 'exact2', label: 'Exact: 0.78, 0.79', setting: { exactMatch: true, exactAnswers: '0.78, 0.79', min: 0, max: 0 } },
        { id: 'range', label: 'Range: 0.78 to 0.79', setting: { exactMatch: false, exactAnswers: '', min: 0.78, max: 0.79 } },
        { id: 'loose', label: 'Range: 0.75 to 0.80', setting: { exactMatch: false, exactAnswers: '', min: 0.75, max: 0.8 } },
    ],
};

/* ── What the wrong options tell you (jadv-options) ────────────────────── */

/** Question 1 of the paper above, for a made-up batch of 60. 22 of 60 = 37%: "Hard". */
export const OPTION_SPLIT = {
    text: EXAM[0].text,
    plain: EXAM[0].plain,
    topic: 'Kinematics',
    students: 60,
    options: [
        { key: 'A' as OptionKey, tex: String.raw`$4\ \text{s}$`, plain: '4 s', count: 23, means: 'Uses t = 2u/g: the time to come back to the top of the tower. The 25 m below it has been forgotten.', reteach: 'Make the batch write the displacement with its sign first (−25 m), then solve the quadratic. One line of sign convention fixes this.' },
        { key: 'B' as OptionKey, tex: String.raw`$5\ \text{s}$`, plain: '5 s', count: 22, means: 'Correct: −25 = 20t − 5t², so t² − 4t − 5 = 0 and t = 5 s.', reteach: '' },
        { key: 'C' as OptionKey, tex: String.raw`$2\ \text{s}$`, plain: '2 s', count: 6, means: 'Stops at the top of the flight (t = u/g). Read the question, then answered a different one.', reteach: 'Ask “where does the motion end?” before choosing an equation.' },
        { key: 'D' as OptionKey, tex: String.raw`$\sqrt{5}\ \text{s}$`, plain: '√5 s', count: 9, means: 'Treats the ball as dropped from rest: t = √(2h/g). The throw upwards has been ignored.', reteach: 'A quick check works here: a ball thrown up must take longer than one that is dropped.' },
    ],
    answer: 'B' as OptionKey,
};
