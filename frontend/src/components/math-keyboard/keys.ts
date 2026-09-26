export interface MathKey {
  label: string;
  latex: string;
  display?: string;
  className?: string;
  /** Plain-English tooltip, written for teachers rather than LaTeX users. */
  hint?: string;
}

/**
 * The always-visible block, laid out like a phone number pad: variables on the
 * left, digits in the middle, operators and structures on the right.
 * Four rows — the old fifth row and the duplicate "^" key are folded in here.
 */
export const FIXED_ROWS: MathKey[][] = [
  [
    { label: 'x', latex: 'x', className: 'italic' },
    { label: '7', latex: '7' }, { label: '8', latex: '8' }, { label: '9', latex: '9' },
    { label: '÷', latex: '\\div ', hint: 'Divide' },
    { label: '(', latex: '(' }, { label: ')', latex: ')' },
    { label: '⁄', latex: '\\frac{?}{?}', display: '▫/▫', hint: 'Fraction — top over bottom' },
    { label: '√', latex: '\\sqrt{?}', hint: 'Square root' },
    { label: '∛', latex: '\\sqrt[3]{?}', hint: 'Cube root' },
  ],
  [
    { label: 'y', latex: 'y', className: 'italic' },
    { label: '4', latex: '4' }, { label: '5', latex: '5' }, { label: '6', latex: '6' },
    { label: '×', latex: '\\times ', hint: 'Multiply' },
    { label: '[', latex: '[' }, { label: ']', latex: ']' },
    { label: '□²', latex: '^{?}', display: '□ⁿ', hint: 'Power — x², 10³' },
    { label: '□₂', latex: '_{?}', display: '□ₙ', hint: 'Small number below — x₁, a₂' },
    { label: '|', latex: '|', hint: 'Straight bar' },
  ],
  [
    { label: 'z', latex: 'z', className: 'italic' },
    { label: '1', latex: '1' }, { label: '2', latex: '2' }, { label: '3', latex: '3' },
    { label: '−', latex: '-', hint: 'Minus' },
    { label: '<', latex: '<' }, { label: '>', latex: '>' },
    { label: '≤', latex: '\\leq ', hint: 'Less than or equal to' },
    { label: '≥', latex: '\\geq ', hint: 'Greater than or equal to' },
    { label: '%', latex: '\\%' },
  ],
  [
    { label: 'abc', latex: '__ABC__', className: 'action', hint: 'Letter keyboard' },
    { label: '0', latex: '0' }, { label: '.', latex: '.' }, { label: ',', latex: ',' },
    { label: '+', latex: '+' }, { label: '=', latex: '=' },
    { label: '/', latex: '/', hint: 'Slash — a/b on one line' },
    { label: '␣', latex: '\\,', className: 'space-key', hint: 'Space' },
  ],
];

export const ABC_ROWS: string[][] = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m'],
];

export type TopicId = 'algebra' | 'prealgebra' | 'trigonometry' | 'calculus' | 'statistics' | 'physics' | 'chemistry' | 'tables';

export interface TopicDef { id: TopicId; label: string; keys: MathKey[][]; }

export const TOPICS: TopicDef[] = [
  {
    id: 'algebra', label: 'Algebra',
    keys: [
      [
        { label: '|x|', latex: '|?|', display: '|x|', hint: 'Absolute value' },
        { label: 'f(x)', latex: 'f(x)', display: 'f(x)' },
        { label: 'e', latex: 'e', className: 'italic' },
        { label: '∞', latex: '\\infty ', hint: 'Infinity' },
      ],
      [
        { label: 'ln', latex: '\\ln ', hint: 'Natural log' },
        { label: '×10', latex: '\\times 10^{?}', display: '×10ⁿ', hint: 'Times ten to the power' },
        { label: '{ }', latex: '\\{ ? \\}', display: '{ }', hint: 'Set brackets' },
        { label: 'i', latex: 'i', className: 'italic' },
      ],
      [
        { label: 'log', latex: '\\log ' },
        { label: 'log₍₎', latex: '\\log_{?}{?}', display: 'logₙ', hint: 'Log with a base' },
        { label: '∩', latex: '\\cap ', hint: 'Intersection' },
        { label: '∪', latex: '\\cup ', hint: 'Union' },
      ],
      [
        { label: '±', latex: '\\pm ', hint: 'Plus or minus' },
        { label: '(,)', latex: '(?,?)', display: '(a,b)', hint: 'Point or pair' },
        { label: 'π', latex: '\\pi ', hint: 'Pi' },
        { label: '≠', latex: '\\neq ', hint: 'Not equal to' },
      ],
    ],
  },
  {
    id: 'prealgebra', label: 'Pre-Algebra',
    keys: [
      [
        { label: '□', latex: '\\square ', display: '□', hint: 'Square shape' },
        { label: '○', latex: '\\circ ', display: '○', hint: 'Circle shape' },
        { label: '△', latex: '\\triangle ', display: '△', hint: 'Triangle' },
        { label: 'π', latex: '\\pi ', hint: 'Pi' },
      ],
      [
        { label: '▱', latex: '\\text{▱}', hint: 'Parallelogram' },
        { label: '⏢', latex: '\\text{⏢}', hint: 'Trapezium' },
        { label: '∠', latex: '\\angle ', hint: 'Angle' },
        { label: 'e', latex: 'e', className: 'italic' },
      ],
      [
        { label: '⊥', latex: '\\perp ', hint: 'Perpendicular' },
        { label: '∥', latex: '\\parallel ', hint: 'Parallel' },
        { label: '≅', latex: '\\cong ', hint: 'Congruent' },
        { label: '!', latex: '!', hint: 'Factorial' },
      ],
      [
        { label: '∼', latex: '\\sim ', hint: 'Similar to' },
        { label: '×10', latex: '\\times 10^{?}', display: '×10ⁿ', hint: 'Times ten to the power' },
        { label: '°', latex: '^{\\circ}', display: '°', hint: 'Degree' },
        { label: '≈', latex: '\\approx ', hint: 'Approximately equal' },
      ],
    ],
  },
  {
    id: 'trigonometry', label: 'Trigonometry',
    keys: [
      [
        { label: 'sin', latex: '\\sin ' },
        { label: '°', latex: '^{\\circ}', display: '°', hint: 'Degree' },
        { label: 'f(x)', latex: 'f(x)' },
        { label: 'i', latex: 'i', className: 'italic' },
      ],
      [
        { label: 'cos', latex: '\\cos ' },
        { label: 'θ', latex: '\\theta ', hint: 'Theta' },
        { label: 'ln', latex: '\\ln ', hint: 'Natural log' },
        { label: 'e', latex: 'e', className: 'italic' },
      ],
      [
        { label: 'tan', latex: '\\tan ' },
        { label: 'π', latex: '\\pi ', hint: 'Pi' },
        { label: 'log', latex: '\\log ' },
        { label: 'logₙ', latex: '\\log_{?}{?}', display: 'logₙ', hint: 'Log with a base' },
      ],
      [
        { label: 'cot', latex: '\\cot ' },
        { label: 'sec', latex: '\\sec ' },
        { label: 'csc', latex: '\\csc ' },
        { label: '∞', latex: '\\infty ', hint: 'Infinity' },
      ],
    ],
  },
  {
    id: 'calculus', label: 'Calculus',
    keys: [
      [
        { label: 'Σ', latex: '\\sum\\limits_{?}^{?}{?}', display: '\\sum\\limits_{i=1}^{n}', hint: 'Sum from … to …' },
        { label: '∫', latex: '\\int ', hint: 'Integral' },
        { label: '∫ₐᵇ', latex: '\\int\\limits_{?}^{?}{?}', display: '\\int\\limits_{a}^{b}', hint: 'Integral from a to b' },
        { label: 'f(x)', latex: 'f(x)' },
      ],
      [
        { label: 'sin', latex: '\\sin ' },
        { label: '°', latex: '^{\\circ}', display: '°', hint: 'Degree' },
        { label: 'θ', latex: '\\theta ', hint: 'Theta' },
        { label: 'e', latex: 'e', className: 'italic' },
      ],
      [
        { label: 'i', latex: 'i', className: 'italic' },
        { label: 'π', latex: '\\pi ', hint: 'Pi' },
        { label: 'log', latex: '\\log ' },
        { label: 'logₙ', latex: '\\log_{?}{?}', display: 'logₙ', hint: 'Log with a base' },
      ],
      [
        { label: 'lim', latex: '\\lim_{? \\to ?}', display: '\\lim_{x \\to 0}', hint: 'Limit' },
        { label: '∞', latex: '\\infty ', hint: 'Infinity' },
        { label: 'ln', latex: '\\ln ', hint: 'Natural log' },
        { label: "d/dx", latex: '\\frac{d}{dx}', hint: 'Derivative' },
      ],
    ],
  },
  {
    id: 'statistics', label: 'Statistics',
    keys: [
      [
        { label: 'nPr', latex: '^{?}P_{?}', display: '^{n}P_{r}', hint: 'Permutations' },
        { label: 'nCr', latex: '^{?}C_{?}', display: '^{n}C_{r}', hint: 'Combinations' },
        { label: 'binom', latex: '\\binom{?}{?}', display: '\\binom{n}{r}', hint: 'Binomial coefficient' },
        { label: 'π', latex: '\\pi ', hint: 'Pi' },
      ],
      [
        { label: 'P(X)', latex: 'P(X)', display: 'P(X)', hint: 'Probability' },
        { label: 'x̄', latex: '\\bar{x}', hint: 'Mean (x bar)' },
        { label: 'e', latex: 'e', className: 'italic' },
        { label: 'i', latex: 'i', className: 'italic' },
      ],
      [
        { label: 'α', latex: '\\alpha ', hint: 'Alpha' },
        { label: 'μ', latex: '\\mu ', hint: 'Mu (mean)' },
        { label: 'μ_x̄', latex: '\\mu_{\\bar{x}}', hint: 'Mean of sample means' },
        { label: 'n!', latex: '!', hint: 'Factorial' },
      ],
      [
        { label: 'σ', latex: '\\sigma ', hint: 'Sigma (standard deviation)' },
        { label: 'σ²', latex: '\\sigma^2 ', hint: 'Variance' },
        { label: 'σ_x̄', latex: '\\sigma_{\\bar{x}}', hint: 'Standard error' },
        { label: 'Σ', latex: '\\sum\\limits_{?}^{?}{?}', display: '\\sum\\limits_{i=1}^{n}', hint: 'Sum from … to …' },
      ],
    ],
  },
  {
    id: 'physics', label: 'Physics',
    keys: [
      [
        { label: '\\vec{F}', latex: '\\vec{F}', hint: 'Vector F' },
        { label: 'Δ', latex: '\\Delta ', hint: 'Delta (change in)' },
        { label: 'ω', latex: '\\omega ', hint: 'Omega' },
        { label: 'α', latex: '\\alpha ', hint: 'Alpha' },
      ],
      [
        { label: 'θ', latex: '\\theta ', hint: 'Theta' },
        { label: 'λ', latex: '\\lambda ', hint: 'Lambda (wavelength)' },
        { label: 'μ', latex: '\\mu ', hint: 'Mu' },
        { label: 'ε₀', latex: '\\varepsilon_0 ', hint: 'Epsilon nought' },
      ],
      [
        { label: 'ℏ', latex: '\\hbar ', hint: 'h-bar' },
        { label: 'γ', latex: '\\gamma ', hint: 'Gamma' },
        { label: 'Ω', latex: '\\Omega ', hint: 'Ohm' },
        { label: 'ρ', latex: '\\rho ', hint: 'Rho (density)' },
      ],
      [
        { label: '∇', latex: '\\nabla ', hint: 'Nabla' },
        { label: '×10', latex: '\\times 10^{?}', display: '×10ⁿ', hint: 'Times ten to the power' },
        { label: '→', latex: '\\rightarrow ', hint: 'Right arrow' },
        { label: '∞', latex: '\\infty ', hint: 'Infinity' },
      ],
    ],
  },
  {
    id: 'chemistry', label: 'Chemistry',
    keys: [
      [
        { label: 'ce{}', latex: '\\ce{?}', display: 'Formula', className: 'highlight', hint: 'Chemical formula or reaction — then type H2O or 2H2 + O2 -> 2H2O' },
        { label: '→', latex: '\\ce{->}', display: '→', hint: 'Reaction arrow' },
        { label: '⇌', latex: '\\ce{<=>}', display: '⇌', hint: 'Reversible reaction' },
        { label: '→(▫/▫)', latex: '__TABLE_ARROW', display: '\\xrightarrow[\\square]{\\square}', className: 'highlight', hint: 'Arrow with conditions above and below (Δ, catalyst)' },
      ],
      [
        { label: '↑', latex: '\\ce{^}', display: '↑(g)', hint: 'Gas given off' },
        { label: '↓', latex: '\\ce{v}', display: '↓(s)', hint: 'Precipitate' },
        { label: 'Δ', latex: '\\Delta ', hint: 'Heat (Delta)' },
        { label: '°C', latex: '^{\\circ}\\text{C}', hint: 'Degree Celsius' },
      ],
      [
        { label: '(aq)', latex: '\\ce{(aq)}', hint: 'Dissolved in water' },
        { label: '(s)', latex: '\\ce{(s)}', hint: 'Solid' },
        { label: '(l)', latex: '\\ce{(l)}', hint: 'Liquid' },
        { label: '(g)', latex: '\\ce{(g)}', hint: 'Gas' },
      ],
      [
        { label: 'Kₐ', latex: 'K_a ', hint: 'Acid constant' },
        { label: 'Kᵦ', latex: 'K_b ', hint: 'Base constant' },
        { label: 'pH', latex: '\\text{pH}' },
        { label: 'mol', latex: '\\text{mol}', hint: 'Mole' },
      ],
    ],
  },
  {
    id: 'tables', label: 'Tables',
    keys: [
      [
        { label: 'Header Table', latex: '__TABLE_HEADER', display: '田 Headered', hint: 'Table with a heading row' },
        { label: 'Bordered Grid', latex: '__TABLE_GRID', display: '▦ Grid', hint: 'Table with every border' },
      ],
      [
        { label: 'Match List', latex: '__TABLE_MATCH', display: '⇄ Match List', hint: 'Match the columns' },
        { label: 'Simple List', latex: '__TABLE_LIST', display: '▤ Simple List', hint: 'Two lists side by side' },
      ],
      [
        { label: 'Matrix', latex: '__TABLE_MATRIX', display: '⊞ Matrix' },
        { label: 'Determinant', latex: '__TABLE_DETERMINANT', display: '|x| Det' },
      ],
      [
        { label: 'Empty Grid', latex: '__TABLE_EMPTY', display: '□ Empty Grid', hint: 'Blank grid, no borders' }
      ]
    ]
  }
];
