/**
 * Example content for /chemistry-question-paper-maker, shared by the page's demos and the
 * crawler text in chemistryQuestionPaperMaker.ts. Questions are written for this page
 * (the first one is the product's own "Tables & chemistry" sample photo); every answer was
 * checked by hand, with the working in a comment. Chemistry is stored the way TestoZa
 * stores it: text with $…$ around LaTeX, formulas and reactions in mhchem's \ce{}.
 * `plain` is a Unicode version for crawlers and for the moment before KaTeX loads.
 *
 * Plain TypeScript with no imports, so the Cloudflare worker can bundle it.
 */

export type OptionKey = 'A' | 'B' | 'C' | 'D';
export const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

export interface ChemQuestion {
    type: 'single' | 'numerical';
    topic: string;
    text: string;
    plain: string;
    options?: Record<OptionKey, string>;
    optionsPlain?: Record<OptionKey, string>;
    /** Options that are pictures (structures), as TestoZa's optionImages. */
    optionImages?: Record<OptionKey, string>;
    answer: OptionKey | number;
    /** Optional cropped figure, as the importer attaches it. */
    image?: string;
    imageSize?: [number, number];
}

const ASSET = '/guides/chemistry-question-paper-maker';

/**
 * "$[Ca²⁺] = 10^a M$, $[F⁻] = 10^b M$", each formula braced into one unit, so a narrow
 * screen wraps at the comma and never inside "[F⁻] = 10⁻⁵ M". (Built by joining, because
 * "${" inside a template string would start an interpolation.)
 */
const concentrations = (ca: string, f: string) =>
    ['$', String.raw`{[\ce{Ca^2+}] = 10^{`, ca, String.raw`}\ \text{M}}`, '$, $', String.raw`{[\ce{F-}] = 10^{`, f, String.raw`}\ \text{M}}`, '$'].join('');

/* ── The test on a student's phone (chem-exam) ─────────────────────────── */

export const PAPER = {
    title: 'Class 12 Chemistry · Weekly Test 6',
    minutes: 15,
    right: 4,
    wrong: 1,
};

export const EXAM: ChemQuestion[] = [
    {
        // The handwritten sample photo, typed exactly as written ("The ppt of …").
        // Precipitation when Q = [Ca²⁺][F⁻]² > Ksp = 1.7 × 10⁻¹⁰:
        // A 10⁻³·(10⁻⁵)² = 10⁻¹³, B 10⁻⁵·(10⁻³)² = 10⁻¹¹, C 10⁻²·(10⁻³)² = 10⁻⁸ (> Ksp), D 10⁻⁴·(10⁻⁴)² = 10⁻¹².
        type: 'single',
        topic: 'Ionic equilibrium',
        text: String.raw`The ppt of $\ce{CaF2}$ $(K_{sp} = 1.7 \times 10^{-10})$ is obtained when following are mixed.`,
        plain: 'The ppt of CaF₂ (Ksp = 1.7 × 10⁻¹⁰) is obtained when following are mixed.',
        options: {
            A: concentrations('-3', '-5'),
            B: concentrations('-5', '-3'),
            C: concentrations('-2', '-3'),
            D: concentrations('-4', '-4'),
        },
        optionsPlain: {
            A: '[Ca²⁺] = 10⁻³ M, [F⁻] = 10⁻⁵ M',
            B: '[Ca²⁺] = 10⁻⁵ M, [F⁻] = 10⁻³ M',
            C: '[Ca²⁺] = 10⁻² M, [F⁻] = 10⁻³ M',
            D: '[Ca²⁺] = 10⁻⁴ M, [F⁻] = 10⁻⁴ M',
        },
        answer: 'C',
    },
    {
        // E°cell = E°cathode − E°anode = 0.34 − (−0.76) = +1.10 V (the Daniell cell).
        type: 'single',
        topic: 'Electrochemistry',
        text: String.raw`For the cell $\mathrm{Zn}\,|\,\ce{Zn^2+}\,\|\,\ce{Cu^2+}\,|\,\mathrm{Cu}$, $E^{\circ}_{\text{cell}}$ is (given $E^{\circ}_{\ce{Zn^2+}/\ce{Zn}} = -0.76\ \text{V}$ and $E^{\circ}_{\ce{Cu^2+}/\ce{Cu}} = +0.34\ \text{V}$)`,
        plain: 'For the cell Zn | Zn²⁺ ‖ Cu²⁺ | Cu, E°cell is (given E°(Zn²⁺/Zn) = −0.76 V and E°(Cu²⁺/Cu) = +0.34 V)',
        options: { A: String.raw`$+1.10\ \text{V}$`, B: String.raw`$-1.10\ \text{V}$`, C: String.raw`$+0.42\ \text{V}$`, D: String.raw`$-0.42\ \text{V}$` },
        optionsPlain: { A: '+1.10 V', B: '−1.10 V', C: '+0.42 V', D: '−0.42 V' },
        answer: 'A',
    },
    {
        // 2-methylbut-2-ene is (CH₃)₂C=CH–CH₃: the double bond inside the chain, the methyl on
        // one end of it. The others are C₅H₁₀ isomers: pent-2-ene, 2-methylbut-1-ene, 3-methylbut-1-ene.
        type: 'single',
        topic: 'Hydrocarbons',
        text: 'Which of the following is the structure of 2-methylbut-2-ene?',
        plain: 'Which of the following is the structure of 2-methylbut-2-ene?',
        options: { A: '', B: '', C: '', D: '' },
        optionsPlain: {
            A: 'skeletal structure of pent-2-ene',
            B: 'skeletal structure of 2-methylbut-1-ene',
            C: 'skeletal structure of 2-methylbut-2-ene',
            D: 'skeletal structure of 3-methylbut-1-ene',
        },
        optionImages: {
            A: `${ASSET}/pent-2-ene.svg`,
            B: `${ASSET}/2-methylbut-1-ene.svg`,
            C: `${ASSET}/2-methylbut-2-ene.svg`,
            D: `${ASSET}/3-methylbut-1-ene.svg`,
        },
        answer: 'C',
    },
    {
        // C₃H₈ + 5O₂ → 3CO₂ + 4H₂O, so 2 mol of propane needs 2 × 5 = 10 mol of O₂.
        type: 'numerical',
        topic: 'Stoichiometry',
        text: String.raw`How many moles of $\ce{O2}$ are needed to burn $2$ mol of propane, $\ce{C3H8}$, completely?`,
        plain: 'How many moles of O₂ are needed to burn 2 mol of propane, C₃H₈, completely?',
        answer: 10,
    },
    {
        // First order: t½ = 0.693 / k = 0.693 / 0.0693 min⁻¹ = 10 min.
        type: 'single',
        topic: 'Chemical kinetics',
        text: String.raw`For a first-order reaction, $k = 0.0693\ \text{min}^{-1}$. Its half-life is`,
        plain: 'For a first-order reaction, k = 0.0693 min⁻¹. Its half-life is',
        options: { A: String.raw`$1\ \text{min}$`, B: String.raw`$10\ \text{min}$`, C: String.raw`$100\ \text{min}$`, D: String.raw`$0.1\ \text{min}$` },
        optionsPlain: { A: '1 min', B: '10 min', C: '100 min', D: '0.1 min' },
        answer: 'B',
    },
    {
        // S in SF₆: six bonding pairs, no lone pair, octahedral: sp³d².
        type: 'single',
        topic: 'Chemical bonding',
        text: String.raw`The hybridisation of sulphur in $\ce{SF6}$ is`,
        plain: 'The hybridisation of sulphur in SF₆ is',
        options: { A: '$sp^{3}$', B: '$sp^{3}d$', C: '$sp^{3}d^{2}$', D: '$dsp^{2}$' },
        optionsPlain: { A: 'sp³', B: 'sp³d', C: 'sp³d²', D: 'dsp²' },
        answer: 'C',
    },
];

/* ── AI import (chem-ai-import) ─────────────────────────────────────────── */

export type ImportSource = 'worksheet' | 'photo' | 'chapter';

export interface ImportExample {
    label: string;
    sub: string;
    mode: 'extract' | 'generate';
    title: string;
    seconds: string;
    page?: number;
    questions: ChemQuestion[];
}

export const IMPORTS: Record<ImportSource, ImportExample> = {
    worksheet: {
        label: 'Printed worksheet',
        sub: 'PDF · Extract its questions',
        mode: 'extract',
        title: 'Hydrocarbons and Atomic Structure: Practice Sheet 2',
        seconds: '10.8s',
        page: 1,
        questions: [
            {
                // CH₃–CH(CH₃)–CH(CH₃)–CH₂–CH₂–CH₃: longest chain 6 (hexane), methyls on C2 and C3
                // numbering from the left. B numbers from the wrong end, C miscounts the chain,
                // D counts every carbon (C₈H₁₈ is an octane isomer, not octane).
                type: 'single',
                topic: 'Nomenclature',
                text: 'The IUPAC name of the compound shown is',
                plain: 'The IUPAC name of the compound shown is',
                options: { A: '2,3-Dimethylhexane', B: '4,5-Dimethylhexane', C: '2,3-Dimethylpentane', D: 'Octane' },
                optionsPlain: { A: '2,3-Dimethylhexane', B: '4,5-Dimethylhexane', C: '2,3-Dimethylpentane', D: 'Octane' },
                answer: 'A',
                image: '/sample-questions-showcase/sceletor-chemical-structure-example.png',
                imageSize: [269, 97],
            },
            {
                // Cr (Z = 24): [Ar] 3d⁵ 4s¹, the half-filled d subshell (the exception to Aufbau).
                type: 'single',
                topic: 'Atomic structure',
                text: String.raw`The ground-state electronic configuration of chromium $(Z = 24)$ is`,
                plain: 'The ground-state electronic configuration of chromium (Z = 24) is',
                options: {
                    A: String.raw`$[\ce{Ar}]\,3d^{4}\,4s^{2}$`,
                    B: String.raw`$[\ce{Ar}]\,3d^{5}\,4s^{1}$`,
                    C: String.raw`$[\ce{Ar}]\,3d^{6}$`,
                    D: String.raw`$[\ce{Ar}]\,4s^{2}\,4p^{4}$`,
                },
                optionsPlain: { A: '[Ar] 3d⁴ 4s²', B: '[Ar] 3d⁵ 4s¹', C: '[Ar] 3d⁶', D: '[Ar] 4s² 4p⁴' },
                answer: 'B',
            },
        ],
    },
    photo: {
        label: 'Phone photo of a book',
        sub: 'Photo · Extract its questions',
        mode: 'extract',
        title: 'Equilibrium and Organic Reactions',
        seconds: '9.2s',
        page: 1,
        questions: [
            {
                // Kc = products over reactants, each raised to its coefficient: [NH₃]² / ([N₂][H₂]³).
                type: 'single',
                topic: 'Equilibrium',
                text: String.raw`For $\ce{N2(g) + 3H2(g) <=> 2NH3(g)}$, the equilibrium constant $K_{c}$ is`,
                plain: 'For N₂(g) + 3H₂(g) ⇌ 2NH₃(g), the equilibrium constant Kc is',
                options: {
                    A: String.raw`$\dfrac{[\ce{NH3}]^{2}}{[\ce{N2}][\ce{H2}]^{3}}$`,
                    B: String.raw`$\dfrac{[\ce{NH3}]}{[\ce{N2}][\ce{H2}]}$`,
                    C: String.raw`$\dfrac{[\ce{N2}][\ce{H2}]^{3}}{[\ce{NH3}]^{2}}$`,
                    D: String.raw`$\dfrac{2[\ce{NH3}]}{[\ce{N2}]\cdot 3[\ce{H2}]}$`,
                },
                optionsPlain: { A: '[NH₃]² / ([N₂][H₂]³)', B: '[NH₃] / ([N₂][H₂])', C: '[N₂][H₂]³ / [NH₃]²', D: '2[NH₃] / ([N₂] · 3[H₂])' },
                answer: 'A',
            },
            {
                // PCC stops a primary alcohol at the aldehyde; LiAlH₄ reduces; acidified KMnO₄ goes
                // on to ethanoic acid; conc. H₂SO₄ at 443 K dehydrates ethanol to ethene.
                type: 'single',
                topic: 'Alcohols and aldehydes',
                text: String.raw`Which reagent converts $\ce{CH3CH2OH}$ into $\ce{CH3CHO}$ without oxidising it further?`,
                plain: 'Which reagent converts CH₃CH₂OH into CH₃CHO without oxidising it further?',
                options: {
                    A: 'PCC (pyridinium chlorochromate)',
                    B: String.raw`$\ce{LiAlH4}$`,
                    C: String.raw`Acidified $\ce{KMnO4}$`,
                    D: String.raw`Conc. $\ce{H2SO4}$ at $443\ \text{K}$`,
                },
                optionsPlain: { A: 'PCC (pyridinium chlorochromate)', B: 'LiAlH₄', C: 'Acidified KMnO₄', D: 'Conc. H₂SO₄ at 443 K' },
                answer: 'A',
            },
        ],
    },
    chapter: {
        label: 'Textbook chapter',
        sub: 'PDF · Generate new questions',
        mode: 'generate',
        title: 'Some Basic Concepts of Chemistry',
        seconds: '12.9s',
        questions: [
            {
                // M(CO₂) = 12 + 2 × 16 = 44 g mol⁻¹; 4.4 g ÷ 44 g mol⁻¹ = 0.1 mol.
                type: 'single',
                topic: 'Mole concept',
                text: String.raw`The number of moles in $4.4\ \text{g}$ of $\ce{CO2}$ is`,
                plain: 'The number of moles in 4.4 g of CO₂ is',
                options: { A: '$0.1$', B: '$0.01$', C: '$1$', D: '$10$' },
                optionsPlain: { A: '0.1', B: '0.01', C: '1', D: '10' },
                answer: 'A',
            },
            {
                // M(NaOH) = 40 g mol⁻¹: 4 g = 0.1 mol, in 0.5 L: 0.1 ÷ 0.5 = 0.2 M.
                type: 'single',
                topic: 'Concentration',
                text: String.raw`$4\ \text{g}$ of $\ce{NaOH}$ is dissolved in water to make $500\ \text{mL}$ of solution. Its molarity is`,
                plain: '4 g of NaOH is dissolved in water to make 500 mL of solution. Its molarity is',
                options: { A: String.raw`$0.2\ \text{M}$`, B: String.raw`$0.1\ \text{M}$`, C: String.raw`$8\ \text{M}$`, D: String.raw`$0.008\ \text{M}$` },
                optionsPlain: { A: '0.2 M', B: '0.1 M', C: '8 M', D: '0.008 M' },
                answer: 'A',
            },
        ],
    },
};

/* ── One equation, four ways (chem-paste) ───────────────────────────────── */

/**
 * Question 17(B)(II) of CBSE's Class 12 Chemistry sample paper for 2026-27: "Complete and
 * balance the following reaction: Fe²⁺ + Cr₂O₇²⁻ + H⁺ →". Copying the paper's own text gives
 * `pdf` (checked 5 October 2026). The answer, `balanced`: Fe 6 = 6, Cr 2 = 2, O 7 = 7,
 * H 14 = 14, charge 12 − 2 + 14 = 24 = 18 + 6.
 */
export const DICHROMATE = {
    tex: String.raw`\ce{Fe^2+ + Cr2O7^2- + H+ ->}`,
    /** What teachers type into a plain form field. */
    typed: 'Fe^2+ + Cr2O7^2- + H^+ ->',
    /** Subscripts and charges drop to the line; the arrow, a symbol-font character (U+F0E0), arrives as a box. */
    pdf: 'Fe2+ + Cr2O7 2- + H+ □',
    plain: 'Fe²⁺ + Cr₂O₇²⁻ + H⁺ →',
    balanced: String.raw`\ce{6Fe^2+ + Cr2O7^2- + 14H+ -> 6Fe^3+ + 2Cr^3+ + 7H2O}`,
    balancedPlain: '6Fe²⁺ + Cr₂O₇²⁻ + 14H⁺ → 6Fe³⁺ + 2Cr³⁺ + 7H₂O',
    /** A real 1× screenshot of the typeset equation (PNG, 260 × 38), as teachers paste into forms. */
    screenshot: `${ASSET}/dichromate-screenshot.png`,
    screenshotBytes: 2890,
};

/* ── mhchem you can type straight into a question box (chem-notation) ──── */

export const NOTATION_GROUPS = ['Formulas and ions', 'Equations', 'Units, nuclei and organic'] as const;

export interface NotationRow {
    group: (typeof NOTATION_GROUPS)[number];
    want: string;
    type: string;
    plain: string;
}

export const NOTATION: NotationRow[] = [
    { group: 'Formulas and ions', want: 'A formula', type: String.raw`\ce{H2SO4}`, plain: 'H₂SO₄' },
    { group: 'Formulas and ions', want: 'An ion with its charge', type: String.raw`\ce{SO4^2-}`, plain: 'SO₄²⁻' },
    { group: 'Formulas and ions', want: 'A complex ion', type: String.raw`\ce{[Fe(CN)6]^3-}`, plain: '[Fe(CN)₆]³⁻' },
    { group: 'Formulas and ions', want: 'A hydrate', type: String.raw`\ce{CuSO4.5H2O}`, plain: 'CuSO₄·5H₂O' },
    { group: 'Formulas and ions', want: 'State symbols', type: String.raw`\ce{NaCl(aq)},\ \ce{H2O(l)}`, plain: 'NaCl(aq), H₂O(l)' },
    { group: 'Formulas and ions', want: 'Electron configuration', type: String.raw`1s^{2}\,2s^{2}\,2p^{6}\,3s^{1}`, plain: '1s² 2s² 2p⁶ 3s¹' },
    { group: 'Equations', want: 'A reaction', type: String.raw`\ce{2H2 + O2 -> 2H2O}`, plain: '2H₂ + O₂ → 2H₂O' },
    { group: 'Equations', want: 'An equilibrium', type: String.raw`\ce{N2 + 3H2 <=> 2NH3}`, plain: 'N₂ + 3H₂ ⇌ 2NH₃' },
    { group: 'Equations', want: 'Catalyst and heat on the arrow', type: String.raw`\ce{2KClO3 ->[MnO2][\Delta] 2KCl + 3O2}`, plain: '2KClO₃ → 2KCl + 3O₂ (MnO₂ above the arrow, Δ below)' },
    { group: 'Equations', want: 'A gas given off', type: String.raw`\ce{Zn + 2HCl -> ZnCl2 + H2 ^}`, plain: 'Zn + 2HCl → ZnCl₂ + H₂↑' },
    { group: 'Equations', want: 'A precipitate', type: String.raw`\ce{AgNO3 + NaCl -> AgCl v + NaNO3}`, plain: 'AgNO₃ + NaCl → AgCl↓ + NaNO₃' },
    { group: 'Equations', want: 'A half-reaction', type: String.raw`\ce{MnO4^- + 8H+ + 5e- -> Mn^2+ + 4H2O}`, plain: 'MnO₄⁻ + 8H⁺ + 5e⁻ → Mn²⁺ + 4H₂O' },
    { group: 'Units, nuclei and organic', want: 'Units', type: String.raw`\pu{0.1 mol L-1}`, plain: '0.1 mol L⁻¹' },
    { group: 'Units, nuclei and organic', want: 'Powers of ten', type: String.raw`K_{sp} = 1.7 \times 10^{-10}`, plain: 'Ksp = 1.7 × 10⁻¹⁰' },
    { group: 'Units, nuclei and organic', want: 'Enthalpy change', type: String.raw`\Delta_{r}H^{\circ} = -92\ \text{kJ mol}^{-1}`, plain: 'ΔrH° = −92 kJ mol⁻¹' },
    { group: 'Units, nuclei and organic', want: 'An isotope', type: String.raw`\ce{^{14}_{6}C}`, plain: '¹⁴₆C' },
    { group: 'Units, nuclei and organic', want: 'A nuclear reaction', type: String.raw`\ce{^{238}_{92}U -> ^{234}_{90}Th + ^{4}_{2}He}`, plain: '²³⁸₉₂U → ²³⁴₉₀Th + ⁴₂He' },
    { group: 'Units, nuclei and organic', want: 'Double and triple bonds', type: String.raw`\ce{CH2=CH2},\ \ce{HC#CH}`, plain: 'CH₂=CH₂, HC≡CH' },
];

/* ── Range or exact (chem-numerical) ────────────────────────────────────── */

/**
 * [H⁺] = 0.002 M, so pH = −log(2 × 10⁻³) = 3 − 0.301 = 2.699, which is 2.70 to two decimal
 * places. Candidates also write 2.69 (truncated), 2.7, 2.71 (a rounding slip) and 3 (−log 10⁻³,
 * the 2 forgotten).
 */
export const NUMERIC = {
    text: String.raw`Calculate the pH of a $0.002\ \text{M}$ $\ce{HCl}$ solution, correct to two decimal places. (Use $\log 2 = 0.301$.)`,
    plain: 'Calculate the pH of a 0.002 M HCl solution, correct to two decimal places. (Use log 2 = 0.301.)',
    answers: [
        { name: 'Aarav', value: '2.70' },
        { name: 'Diya', value: '2.699' },
        { name: 'Kabir', value: '2.69' },
        { name: 'Meera', value: '2.7' },
        { name: 'Ishaan', value: '2.71' },
        { name: 'Sara', value: '3' },
    ],
    presets: [
        { id: 'exact', label: 'Exact: 2.70', setting: { exactMatch: true, exactAnswers: '2.70', min: 0, max: 0 } },
        { id: 'exact2', label: 'Exact: 2.70, 2.699', setting: { exactMatch: true, exactAnswers: '2.70, 2.699', min: 0, max: 0 } },
        { id: 'range', label: 'Range: 2.69 to 2.70', setting: { exactMatch: false, exactAnswers: '', min: 2.69, max: 2.7 } },
        { id: 'loose', label: 'Range: 2.6 to 2.8', setting: { exactMatch: false, exactAnswers: '', min: 2.6, max: 2.8 } },
    ],
};

/* ── What the wrong options say (chem-options) ──────────────────────────── */

/**
 * A made-up class of 40, the way the teacher analysis shows one question's option split.
 * Answer: water's own [H⁺] = 10⁻⁷ M is ten times the acid's. Solving x² − 10⁻⁸x − 10⁻¹⁴ = 0
 * gives [H⁺] = 1.05 × 10⁻⁷ M, pH = 6.98.
 */
export const OPTION_SPLIT = {
    text: String.raw`The pH of a $10^{-8}\ \text{M}$ $\ce{HCl}$ solution at $25\,^{\circ}\text{C}$ is closest to`,
    plain: 'The pH of a 10⁻⁸ M HCl solution at 25 °C is closest to',
    topic: 'Ionic equilibrium',
    students: 40,
    options: [
        { key: 'A' as OptionKey, tex: '$8$', plain: '8', count: 19, means: 'Applies pH = −log c without asking whether the answer makes sense: an acid can’t make water basic.', reteach: 'Before the formula, ask “can adding acid push the pH above 7?” Then add the 10⁻⁷ M of H⁺ that water already has.' },
        { key: 'B' as OptionKey, tex: '$6.98$', plain: '6.98', count: 12, means: 'Correct: water’s own 10⁻⁷ M of H⁺ outweighs the acid’s 10⁻⁸ M, so the pH sits just below 7.', reteach: '' },
        { key: 'C' as OptionKey, tex: '$7$', plain: '7', count: 7, means: 'Sees that the acid is too dilute to matter much, but forgets it still adds some H⁺: close, not right.', reteach: 'Show that 10⁻⁸ M is a tenth of water’s 10⁻⁷ M: small, but not nothing.' },
        { key: 'D' as OptionKey, tex: '$6$', plain: '6', count: 2, means: 'Two in forty: guessing, not a pattern.', reteach: 'Nothing to reteach; watch it next time.' },
    ],
    answer: 'B' as OptionKey,
};
