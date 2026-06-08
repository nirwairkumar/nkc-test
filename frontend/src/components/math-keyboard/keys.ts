export interface MathKey {
  label: string;
  latex: string;
  display?: string;
  className?: string;
}

export const FIXED_ROWS: MathKey[][] = [
  [
    { label: '(', latex: '(' }, { label: ')', latex: ')' }, { label: '|', latex: '|' },
    { label: '[', latex: '[' }, { label: ']', latex: ']' },
    { label: '√', latex: '\\sqrt{?}' }, { label: '∛', latex: '\\sqrt[3]{?}' }, { label: '≥', latex: '\\geq ' },
  ],
  [
    { label: 'x', latex: 'x', className: 'italic' }, { label: '7', latex: '7' },
    { label: '8', latex: '8' }, { label: '9', latex: '9' },
    { label: '⁄', latex: '\\frac{?}{?}', display: '▫/▫' },
    { label: '□²', latex: '^{?}', display: '□ⁿ' },
    { label: '□₂', latex: '_{?}', display: '□ₙ' }, { label: '≤', latex: '\\leq ' },
  ],
  [
    { label: 'y', latex: 'y', className: 'italic' }, { label: '4', latex: '4' },
    { label: '5', latex: '5' }, { label: '6', latex: '6' },
    { label: '/', latex: '/' }, { label: '^', latex: '^' },
    { label: '×', latex: '\\times ' }, { label: '>', latex: '>' },
  ],
  [
    { label: 'z', latex: 'z', className: 'italic' }, { label: '1', latex: '1' },
    { label: '2', latex: '2' }, { label: '3', latex: '3' },
    { label: '−', latex: '-' }, { label: '+', latex: '+' },
    { label: '÷', latex: '\\div ' }, { label: '<', latex: '<' },
  ],
  [
    { label: 'abc', latex: '__ABC__', className: 'action' },
    { label: ',', latex: ',' }, { label: '0', latex: '0' },
    { label: '.', latex: '.' }, { label: '%', latex: '\\%' },
    { label: '␣', latex: '\\,', className: 'space-key' }, { label: '=', latex: '=' },
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
        { label: '\\begin{pmatrix}\\end{pmatrix}', latex: '\\begin{pmatrix} ? & ? \\\\ ? & ? \\end{pmatrix}', display: '⊞' },
        { label: 'f(x)', latex: 'f(x)', display: 'f(x)' },
        { label: 'e', latex: 'e', className: 'italic' },
        { label: '∞', latex: '\\infty ' },
      ],
      [
        { label: 'ln', latex: '\\ln ' },
        { label: '×10', latex: '\\times 10^{?}', display: '×10ⁿ' },
        { label: '{ }', latex: '\\{ ? \\}', display: '{ }' },
        { label: 'i', latex: 'i', className: 'italic' },
      ],
      [
        { label: 'log', latex: '\\log ' },
        { label: 'log₍₎', latex: '\\log_{?}{?}', display: 'logₙ' },
        { label: '∩', latex: '\\cap ' },
        { label: '∪', latex: '\\cup ' },
      ],
      [
        { label: '±', latex: '\\pm ' },
        { label: '(,)', latex: '(?,?)', display: '(a,b)' },
        { label: 'π', latex: '\\pi ' },
        { label: '≠', latex: '\\neq ' },
      ],
    ],
  },
  {
    id: 'prealgebra', label: 'Pre-Algebra',
    keys: [
      [
        { label: '□', latex: '\\square ', display: '□' },
        { label: '○', latex: '\\circ ', display: '○' },
        { label: '△', latex: '\\triangle ', display: '△' },
        { label: 'π', latex: '\\pi ' },
      ],
      [
        { label: '▱', latex: '\\parallelogram ', display: '▱' },
        { label: '⏢', latex: '\\trapezoid ', display: '⏢' },
        { label: '∠', latex: '\\angle ' },
        { label: 'e', latex: 'e', className: 'italic' },
      ],
      [
        { label: '⊥', latex: '\\perp ' },
        { label: '∥', latex: '\\parallel ' },
        { label: '≅', latex: '\\cong ' },
        { label: '!', latex: '!' },
      ],
      [
        { label: '∼', latex: '\\sim ' },
        { label: '×10', latex: '\\times 10^{?}', display: '×10ⁿ' },
        { label: '°', latex: '^{\\circ}', display: '°' },
        { label: '≈', latex: '\\approx ' },
      ],
    ],
  },
  {
    id: 'trigonometry', label: 'Trigonometry',
    keys: [
      [
        { label: 'sin', latex: '\\sin ' },
        { label: '°', latex: '^{\\circ}', display: '°' },
        { label: 'f(x)', latex: 'f(x)' },
        { label: 'i', latex: 'i', className: 'italic' },
      ],
      [
        { label: 'cos', latex: '\\cos ' },
        { label: 'θ', latex: '\\theta ' },
        { label: 'ln', latex: '\\ln ' },
        { label: 'e', latex: 'e', className: 'italic' },
      ],
      [
        { label: 'tan', latex: '\\tan ' },
        { label: 'π', latex: '\\pi ' },
        { label: 'log', latex: '\\log ' },
        { label: 'logₙ', latex: '\\log_{?}{?}', display: 'logₙ' },
      ],
      [
        { label: 'cot', latex: '\\cot ' },
        { label: 'sec', latex: '\\sec ' },
        { label: 'csc', latex: '\\csc ' },
        { label: '∞', latex: '\\infty ' },
      ],
    ],
  },
  {
    id: 'calculus', label: 'Calculus',
    keys: [
      [
        { label: 'Σ', latex: '\\sum_{?}^{?}{?}' },
        { label: '∫', latex: '\\int ' },
        { label: '∫ₐᵇ', latex: '\\int_{?}^{?}{?}', display: '∫ₐᵇ' },
        { label: 'f(x)', latex: 'f(x)' },
      ],
      [
        { label: 'sin', latex: '\\sin ' },
        { label: '°', latex: '^{\\circ}', display: '°' },
        { label: 'θ', latex: '\\theta ' },
        { label: 'e', latex: 'e', className: 'italic' },
      ],
      [
        { label: 'i', latex: 'i', className: 'italic' },
        { label: 'π', latex: '\\pi ' },
        { label: 'log', latex: '\\log ' },
        { label: 'logₙ', latex: '\\log_{?}{?}', display: 'logₙ' },
      ],
      [
        { label: 'lim', latex: '\\lim_{? \\to ?}{?}' },
        { label: '∞', latex: '\\infty ' },
        { label: 'ln', latex: '\\ln ' },
        { label: "d/dx", latex: '\\frac{d}{dx}' },
      ],
    ],
  },
  {
    id: 'statistics', label: 'Statistics',
    keys: [
      [
        { label: 'nPr', latex: '_{?}P_{?}', display: 'ₙPᵣ' },
        { label: 'nCr', latex: '\\binom{?}{?}', display: 'ₙCᵣ' },
        { label: 'π', latex: '\\pi ' },
        { label: 'i', latex: 'i', className: 'italic' },
      ],
      [
        { label: 'P(X)', latex: 'P(X)', display: 'P(X)' },
        { label: 'x̄', latex: '\\bar{x}' },
        { label: 'e', latex: 'e', className: 'italic' },
        { label: '(,)', latex: '(?,?)', display: '(a,b)' },
      ],
      [
        { label: 'α', latex: '\\alpha ' },
        { label: 'μ', latex: '\\mu ' },
        { label: 'μ_x̄', latex: '\\mu_{\\bar{x}}' },
        { label: 'n!', latex: '!' },
      ],
      [
        { label: 'σ', latex: '\\sigma ' },
        { label: 'σ²', latex: '\\sigma^2 ' },
        { label: 'σ_x̄', latex: '\\sigma_{\\bar{x}}' },
        { label: 'Σ', latex: '\\sum ' },
      ],
    ],
  },
  {
    id: 'physics', label: 'Physics',
    keys: [
      [
        { label: 'F⃗', latex: '\\vec{F}' },
        { label: 'Δ', latex: '\\Delta ' },
        { label: 'ω', latex: '\\omega ' },
        { label: 'α', latex: '\\alpha ' },
      ],
      [
        { label: 'θ', latex: '\\theta ' },
        { label: 'λ', latex: '\\lambda ' },
        { label: 'μ', latex: '\\mu ' },
        { label: 'ε₀', latex: '\\varepsilon_0 ' },
      ],
      [
        { label: 'ℏ', latex: '\\hbar ' },
        { label: 'γ', latex: '\\gamma ' },
        { label: 'Ω', latex: '\\Omega ' },
        { label: 'ρ', latex: '\\rho ' },
      ],
      [
        { label: '∇', latex: '\\nabla ' },
        { label: '×10', latex: '\\times 10^{?}', display: '×10ⁿ' },
        { label: '→', latex: '\\rightarrow ' },
        { label: '∞', latex: '\\infty ' },
      ],
    ],
  },
  {
    id: 'chemistry', label: 'Chemistry',
    keys: [
      [
        { label: '→', latex: '\\ce{->}', display: '→' },
        { label: '⇌', latex: '\\ce{<=>}', display: '⇌' },
        { label: '↑', latex: '\\ce{^}', display: '↑(g)' },
        { label: '↓', latex: '\\ce{v}', display: '↓(s)' },
      ],
      [
        { label: 'ce{}', latex: '\\ce{?}', display: '\\ce{ }' },
        { label: 'Δ', latex: '\\Delta ' },
        { label: '°C', latex: '^{\\circ}\\text{C}' },
        { label: 'K', latex: '\\text{K}' },
      ],
      [
        { label: '(aq)', latex: '\\ce{(aq)}' },
        { label: '(s)', latex: '\\ce{(s)}' },
        { label: '(l)', latex: '\\ce{(l)}' },
        { label: '(g)', latex: '\\ce{(g)}' },
      ],
      [
        { label: 'Kₐ', latex: 'K_a ' },
        { label: 'Kᵦ', latex: 'K_b ' },
        { label: 'pH', latex: '\\text{pH}' },
        { label: 'mol', latex: '\\text{mol}' },
      ],
    ],
  },
  {
    id: 'tables', label: 'Tables',
    keys: [
      [
        { label: 'Header Table', latex: '__TABLE_HEADER', display: '田 Headered' },
        { label: 'Bordered Grid', latex: '__TABLE_GRID', display: '▦ Grid' },
      ],
      [
        { label: 'Match List', latex: '__TABLE_MATCH', display: '⇄ Match List' },
        { label: 'Simple List', latex: '__TABLE_LIST', display: '▤ Simple List' },
      ],
      [
        { label: 'Matrix', latex: '__TABLE_MATRIX', display: '⊞ Matrix' },
        { label: 'Determinant', latex: '__TABLE_DETERMINANT', display: '|x| Det' },
      ],
      [
        { label: 'Empty Grid', latex: '__TABLE_EMPTY', display: '□ Empty Grid' }
      ]
    ]
  }
];
