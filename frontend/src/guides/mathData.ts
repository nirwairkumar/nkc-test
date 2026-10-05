/**
 * Example content for /math-test-maker, shared by the page's demos and the crawler text
 * in mathTestMaker.ts. Questions are written for this page; every answer was checked by
 * hand (working in the comments). Maths is stored the way TestoZa stores it: text with
 * $…$ around LaTeX. `plain` is a Unicode version for crawlers and for the moment before
 * KaTeX loads.
 *
 * Plain TypeScript with no imports, so the Cloudflare worker can bundle it.
 */

export type OptionKey = 'A' | 'B' | 'C' | 'D';
export const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

export interface MathQuestion {
    type: 'single' | 'numerical';
    topic: string;
    text: string;
    plain: string;
    options?: Record<OptionKey, string>;
    optionsPlain?: Record<OptionKey, string>;
    answer: OptionKey | number;
    /** Optional cropped figure, as the importer attaches it. */
    image?: string;
}

/* ── The test on a student's phone (math-exam) ─────────────────────────── */

export const PAPER = {
    title: 'Class 12 Maths · Weekly Test 6',
    minutes: 15,
    right: 4,
    wrong: 1,
};

export const EXAM: MathQuestion[] = [
    {
        // d/dx tan²x = 2 tan x · sec²x (chain rule). The question from the handwritten photo.
        type: 'single',
        topic: 'Differentiation',
        text: String.raw`Find $\dfrac{d}{dx}\left(\tan^{2} x\right)$.`,
        plain: 'Find d/dx (tan² x).',
        options: { A: String.raw`$2\tan x$`, B: String.raw`$2\tan x\,\sec^{2} x$`, C: String.raw`$\sec^{4} x$`, D: String.raw`$2\sec^{2} x$` },
        optionsPlain: { A: '2 tan x', B: '2 tan x sec² x', C: 'sec⁴ x', D: '2 sec² x' },
        answer: 'B',
    },
    {
        // [−cos x] from 0 to π/2 = −0 + 1 = 1.
        type: 'single',
        topic: 'Integrals',
        text: String.raw`The value of $\displaystyle\int_{0}^{\pi/2} \sin x \,dx$ is`,
        plain: 'The value of ∫₀^(π/2) sin x dx is',
        options: { A: '$0$', B: '$1$', C: String.raw`$\dfrac{\pi}{2}$`, D: '$2$' },
        optionsPlain: { A: '0', B: '1', C: 'π/2', D: '2' },
        answer: 'B',
    },
    {
        // |A| = 2·4 − 3·1 = 5.
        type: 'single',
        topic: 'Determinants',
        text: String.raw`If $A = \begin{bmatrix} 2 & 3 \\ 1 & 4 \end{bmatrix}$, then $\lvert A \rvert$ is`,
        plain: 'If A = [2 3; 1 4], then |A| is',
        options: { A: '$5$', B: '$11$', C: '$-5$', D: '$8$' },
        optionsPlain: { A: '5', B: '11', C: '−5', D: '8' },
        answer: 'A',
    },
    {
        // log₂ x = 5 ⇒ x = 2⁵ = 32.
        type: 'numerical',
        topic: 'Logarithms',
        text: String.raw`If $\log_{2} x = 5$, find $x$.`,
        plain: 'If log₂ x = 5, find x.',
        answer: 32,
    },
    {
        // lim sin 3x / x = 3 · lim sin 3x / 3x = 3.
        type: 'single',
        topic: 'Limits',
        text: String.raw`$\displaystyle\lim_{x \to 0} \frac{\sin 3x}{x}$ is equal to`,
        plain: 'lim (x→0) sin 3x / x is equal to',
        options: { A: '$0$', B: '$1$', C: '$3$', D: String.raw`$\dfrac{1}{3}$` },
        optionsPlain: { A: '0', B: '1', C: '3', D: '1/3' },
        answer: 'C',
    },
    {
        // Sum 7 on two dice: (1,6)…(6,1) = 6 of 36 = 1/6.
        type: 'single',
        topic: 'Probability',
        text: 'Two fair dice are thrown together. The probability that the sum of the numbers is 7 is',
        plain: 'Two fair dice are thrown together. The probability that the sum of the numbers is 7 is',
        options: { A: String.raw`$\dfrac{1}{6}$`, B: String.raw`$\dfrac{1}{12}$`, C: String.raw`$\dfrac{7}{36}$`, D: String.raw`$\dfrac{5}{36}$` },
        optionsPlain: { A: '1/6', B: '1/12', C: '7/36', D: '5/36' },
        answer: 'A',
    },
];

/* ── AI import (math-ai-import) ─────────────────────────────────────────── */

export type ImportSource = 'worksheet' | 'photo' | 'chapter';

export interface ImportExample {
    label: string;
    sub: string;
    mode: 'extract' | 'generate';
    title: string;
    seconds: string;
    page?: number;
    questions: MathQuestion[];
}

export const IMPORTS: Record<ImportSource, ImportExample> = {
    worksheet: {
        label: 'Printed worksheet',
        sub: 'PDF · Extract its questions',
        mode: 'extract',
        title: 'Quadratics and Trigonometry: Practice Sheet 3',
        seconds: '11.4s',
        page: 1,
        questions: [
            {
                // α + β = 7, αβ = 12 ⇒ α² + β² = 49 − 24 = 25.
                type: 'single',
                topic: 'Quadratic equations',
                text: String.raw`If $\alpha$ and $\beta$ are the roots of $x^{2} - 7x + 12 = 0$, then $\alpha^{2} + \beta^{2}$ is equal to`,
                plain: 'If α and β are the roots of x² − 7x + 12 = 0, then α² + β² is equal to',
                options: { A: '$25$', B: '$49$', C: '$24$', D: '$37$' },
                optionsPlain: { A: '25', B: '49', C: '24', D: '37' },
                answer: 'A',
            },
            {
                // AC = √(6² + 8²) = 10; sin C = opposite/hypotenuse = AB/AC = 6/10 = 3/5.
                type: 'single',
                topic: 'Trigonometry',
                text: String.raw`In the figure, $\triangle ABC$ is right-angled at $B$, with $AB = 6\text{ cm}$ and $BC = 8\text{ cm}$. Then $\sin C$ is`,
                plain: 'In the figure, triangle ABC is right-angled at B, with AB = 6 cm and BC = 8 cm. Then sin C is',
                options: { A: String.raw`$\dfrac{3}{5}$`, B: String.raw`$\dfrac{4}{5}$`, C: String.raw`$\dfrac{3}{4}$`, D: String.raw`$\dfrac{4}{3}$` },
                optionsPlain: { A: '3/5', B: '4/5', C: '3/4', D: '4/3' },
                answer: 'A',
                image: '/guides/math-test-maker/triangle-figure.svg',
            },
        ],
    },
    photo: {
        label: 'Phone photo of a book',
        sub: 'Photo · Extract its questions',
        mode: 'extract',
        title: 'Integrals and Matrices',
        seconds: '8.9s',
        page: 1,
        questions: [
            {
                // [x³/3] from 0 to 1 = 1/3.
                type: 'single',
                topic: 'Integrals',
                text: String.raw`The value of $\displaystyle\int_{0}^{1} x^{2}\,dx$ is`,
                plain: 'The value of ∫₀¹ x² dx is',
                options: { A: String.raw`$\dfrac{1}{3}$`, B: String.raw`$\dfrac{1}{2}$`, C: '$1$', D: String.raw`$\dfrac{2}{3}$` },
                optionsPlain: { A: '1/3', B: '1/2', C: '1', D: '2/3' },
                answer: 'A',
            },
            {
                // det = 1·4 − 2·3 = −2.
                type: 'single',
                topic: 'Matrices',
                text: String.raw`If $A = \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}$, then $\det A$ is`,
                plain: 'If A = [1 2; 3 4], then det A is',
                options: { A: '$-2$', B: '$2$', C: '$10$', D: '$-10$' },
                optionsPlain: { A: '−2', B: '2', C: '10', D: '−10' },
                answer: 'A',
            },
        ],
    },
    chapter: {
        label: 'Textbook chapter',
        sub: 'PDF · Generate new questions',
        mode: 'generate',
        title: 'Arithmetic Progressions',
        seconds: '13.7s',
        questions: [
            {
                // a = 3, d = 4: a₁₀ = 3 + 9·4 = 39.
                type: 'single',
                topic: 'Arithmetic progressions',
                text: String.raw`The $10^{\text{th}}$ term of the AP $3,\ 7,\ 11,\ \ldots$ is`,
                plain: 'The 10th term of the AP 3, 7, 11, … is',
                options: { A: '$39$', B: '$43$', C: '$40$', D: '$35$' },
                optionsPlain: { A: '39', B: '43', C: '40', D: '35' },
                answer: 'A',
            },
            {
                // 20 · 21 / 2 = 210.
                type: 'single',
                topic: 'Arithmetic progressions',
                text: String.raw`The value of $\displaystyle\sum_{k=1}^{20} k$ is`,
                plain: 'The value of Σ (k = 1 to 20) k is',
                options: { A: '$210$', B: '$200$', C: '$220$', D: '$190$' },
                optionsPlain: { A: '210', B: '200', C: '220', D: '190' },
                answer: 'A',
            },
        ],
    },
};

/* ── One equation, four ways (math-paste) ───────────────────────────────── */

export const QUADRATIC = {
    tex: String.raw`x = \dfrac{-b \pm \sqrt{b^{2} - 4ac}}{2a}`,
    /** What teachers type into a plain form field. */
    typed: 'x = (-b ± √(b^2 - 4ac)) / 2a',
    /** What copying it out of a typeset PDF usually gives: flattened powers, no fraction bar, the root sign gone. */
    pdf: 'x = −b ± b2 − 4ac\n2a',
    /** A real 2× screenshot of the typeset formula (PNG), as teachers paste into forms. */
    screenshot: '/guides/math-test-maker/quadratic-screenshot.png',
};

/* ── LaTeX you can type straight into a question box (math-notation) ───── */

export const NOTATION_GROUPS = ['Basics', 'Algebra and trigonometry', 'Calculus and matrices'] as const;

export interface NotationRow {
    group: (typeof NOTATION_GROUPS)[number];
    want: string;
    type: string;
    plain: string;
}

export const NOTATION: NotationRow[] = [
    { group: 'Basics', want: 'A fraction', type: String.raw`\frac{3}{4}`, plain: '3/4' },
    { group: 'Basics', want: 'A power', type: String.raw`x^{2} + e^{-x}`, plain: 'x² + e⁻ˣ' },
    { group: 'Basics', want: 'A subscript', type: String.raw`a_{n} = a_{1} + (n-1)d`, plain: 'aₙ = a₁ + (n−1)d' },
    { group: 'Basics', want: 'Square and cube roots', type: String.raw`\sqrt{2},\ \sqrt[3]{27}`, plain: '√2, ∛27' },
    { group: 'Basics', want: 'Signs', type: String.raw`\pm,\ \times,\ \div,\ \neq,\ \leq,\ \geq`, plain: '±, ×, ÷, ≠, ≤, ≥' },
    { group: 'Basics', want: 'Words inside maths', type: String.raw`\text{Area} = \pi r^{2}`, plain: 'Area = πr²' },
    { group: 'Algebra and trigonometry', want: 'Greek letters', type: String.raw`\pi,\ \theta,\ \alpha,\ \beta`, plain: 'π, θ, α, β' },
    { group: 'Algebra and trigonometry', want: 'Trigonometry', type: String.raw`\sin^{2}\theta + \cos^{2}\theta = 1`, plain: 'sin²θ + cos²θ = 1' },
    { group: 'Algebra and trigonometry', want: 'Degrees and angles', type: String.raw`\angle ABC = 90^{\circ}`, plain: '∠ABC = 90°' },
    { group: 'Algebra and trigonometry', want: 'A log with a base', type: String.raw`\log_{2} 8 = 3`, plain: 'log₂ 8 = 3' },
    { group: 'Algebra and trigonometry', want: 'Combinations', type: String.raw`\binom{n}{r} = {}^{n}C_{r}`, plain: 'C(n, r) = ⁿCᵣ' },
    { group: 'Algebra and trigonometry', want: 'A full-size fraction', type: String.raw`\dfrac{x+1}{2} = \dfrac{x-1}{3}`, plain: '(x+1)/2 = (x−1)/3' },
    { group: 'Calculus and matrices', want: 'A limit', type: String.raw`\lim_{x \to 0} \frac{\sin x}{x}`, plain: 'lim (x→0) sin x / x' },
    { group: 'Calculus and matrices', want: 'An integral', type: String.raw`\int_{0}^{1} x^{2}\,dx`, plain: '∫₀¹ x² dx' },
    { group: 'Calculus and matrices', want: 'A sum', type: String.raw`\sum_{k=1}^{n} k = \frac{n(n+1)}{2}`, plain: 'Σ k (k = 1 to n) = n(n+1)/2' },
    { group: 'Calculus and matrices', want: 'A matrix', type: String.raw`\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}`, plain: '[1 2; 3 4]' },
    { group: 'Calculus and matrices', want: 'A determinant', type: String.raw`\begin{vmatrix} a & b \\ c & d \end{vmatrix} = ad - bc`, plain: '|a b; c d| = ad − bc' },
    { group: 'Calculus and matrices', want: 'Vectors', type: String.raw`\vec{a} \cdot \vec{b} = |\vec{a}||\vec{b}|\cos\theta`, plain: 'a⃗ · b⃗ = |a⃗||b⃗| cos θ' },
];

/* ── Range or exact (math-numerical) ────────────────────────────────────── */

/** √5 = 2.2360679…, so "to two decimal places" is 2.24; candidates also write 2.23, 2.236 and 2.2. */
export const NUMERIC = {
    text: String.raw`Find the value of $\sqrt{5}$, correct to two decimal places.`,
    plain: 'Find the value of √5, correct to two decimal places.',
    answers: [
        { name: 'Aarav', value: '2.24' },
        { name: 'Diya', value: '2.236' },
        { name: 'Kabir', value: '2.23' },
        { name: 'Meera', value: '2.2' },
        { name: 'Ishaan', value: '2.25' },
        { name: 'Sara', value: '2.240' },
    ],
    presets: [
        { id: 'exact', label: 'Exact: 2.24', setting: { exactMatch: true, exactAnswers: '2.24', min: 0, max: 0 } },
        { id: 'exact2', label: 'Exact: 2.24, 2.236', setting: { exactMatch: true, exactAnswers: '2.24, 2.236', min: 0, max: 0 } },
        { id: 'range', label: 'Range: 2.23 to 2.24', setting: { exactMatch: false, exactAnswers: '', min: 2.23, max: 2.24 } },
        { id: 'loose', label: 'Range: 2.2 to 2.3', setting: { exactMatch: false, exactAnswers: '', min: 2.2, max: 2.3 } },
    ],
};

/* ── What the wrong options say (math-options) ──────────────────────────── */

/** A made-up class of 40, the way the teacher analysis shows one question's option split. */
export const OPTION_SPLIT = {
    text: String.raw`For every real number $x$, $\sqrt{x^{2}}$ is equal to`,
    plain: 'For every real number x, √(x²) is equal to',
    students: 40,
    options: [
        { key: 'A' as OptionKey, tex: '$x$', plain: 'x', count: 18, means: 'Forgets that x can be negative: √((−3)²) = 3, not −3.', reteach: 'Try x = −3 on the board before the rule.' },
        { key: 'B' as OptionKey, tex: String.raw`$\lvert x \rvert$`, plain: '|x|', count: 14, means: 'Correct: the square root is never negative.', reteach: '' },
        { key: 'C' as OptionKey, tex: String.raw`$\pm x$`, plain: '±x', count: 6, means: 'Mixes up √ with solving x² = a, where both signs are answers.', reteach: 'Separate “the root of a number” from “the roots of an equation”.' },
        { key: 'D' as OptionKey, tex: '$x^{2}$', plain: 'x²', count: 2, means: 'Two in forty: guessing, not a pattern.', reteach: 'Nothing to reteach; watch it next time.' },
    ],
    answer: 'B' as OptionKey,
};
