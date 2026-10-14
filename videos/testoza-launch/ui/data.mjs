// Sample paper used across every screen of the launch film.
export const TEST_TITLE = 'JEE Main 2026 · Physics Mock Test 01';
export const FILE_NAME = 'JEE_Main_Physics_Mock_01.pdf';
export const TEACHER = 'Prof. Rajesh Kumar';

const BASE = [
  {
    type: 'single',
    question: 'A ball is thrown vertically upward with a speed of $20\\,\\text{m/s}$. Taking $g = 10\\,\\text{m/s}^2$, the maximum height reached is:',
    options: { A: '$10\\,\\text{m}$', B: '$20\\,\\text{m}$', C: '$30\\,\\text{m}$', D: '$40\\,\\text{m}$' },
    correctAnswer: 'B', page: 1,
  },
  {
    type: 'single',
    question: 'Two resistors of $4\\,\\Omega$ and $12\\,\\Omega$ are connected in parallel. Their equivalent resistance is:',
    options: { A: '$3\\,\\Omega$', B: '$8\\,\\Omega$', C: '$16\\,\\Omega$', D: '$48\\,\\Omega$' },
    correctAnswer: 'A', page: 1,
  },
  {
    type: 'single',
    question: 'The de Broglie wavelength of an electron accelerated through a potential difference $V$ is proportional to:',
    options: { A: '$V$', B: '$\\sqrt{V}$', C: '$1/V$', D: '$1/\\sqrt{V}$' },
    correctAnswer: 'D', page: 1,
  },
  {
    type: 'numerical',
    question: 'A wire of length $2\\,\\text{m}$ carries a current of $5\\,\\text{A}$ perpendicular to a magnetic field of $0.4\\,\\text{T}$. The force on the wire (in N) is ____.',
    options: null, correctAnswer: '4', page: 2,
  },
  {
    type: 'single',
    question: 'In Young\'s double-slit experiment, if the slit separation is doubled and the screen distance is halved, the fringe width becomes:',
    options: { A: 'Unchanged', B: 'Half', C: 'One-fourth', D: 'Four times' },
    correctAnswer: 'C', page: 2,
  },
  {
    type: 'multiple',
    question: 'Which of the following quantities are conserved in a perfectly elastic collision?',
    options: { A: 'Linear momentum', B: 'Kinetic energy', C: 'Velocity of each body', D: 'Total energy' },
    correctAnswer: ['A', 'B', 'D'], page: 2,
  },
  {
    type: 'single',
    question: 'The time period of a simple pendulum of length $L$ on a planet where $g$ is one-fourth of Earth\'s value becomes:',
    options: { A: '$T/2$', B: '$T$', C: '$2T$', D: '$4T$' },
    correctAnswer: 'C', page: 3,
  },
  {
    type: 'single',
    question: 'A capacitor of $2\\,\\mu\\text{F}$ is charged to $100\\,\\text{V}$. The energy stored in it is:',
    options: { A: '$0.01\\,\\text{J}$', B: '$0.02\\,\\text{J}$', C: '$0.1\\,\\text{J}$', D: '$1\\,\\text{J}$' },
    correctAnswer: 'A', page: 3,
  },
  {
    type: 'single',
    question: 'The escape velocity from Earth\'s surface is $11.2\\,\\text{km/s}$. For a planet with twice the radius and the same density, it is:',
    options: { A: '$5.6\\,\\text{km/s}$', B: '$11.2\\,\\text{km/s}$', C: '$22.4\\,\\text{km/s}$', D: '$44.8\\,\\text{km/s}$' },
    correctAnswer: 'C', page: 4,
  },
  {
    type: 'single',
    question: 'A convex lens of focal length $20\\,\\text{cm}$ forms a real image twice the size of the object. The object distance is:',
    options: { A: '$10\\,\\text{cm}$', B: '$20\\,\\text{cm}$', C: '$30\\,\\text{cm}$', D: '$40\\,\\text{cm}$' },
    correctAnswer: 'C', page: 4,
  },
];

/** 30 questions: the ten above, then repeats (only the first ~10 are ever on screen). */
export const QUESTIONS = Array.from({ length: 30 }, (_, i) => ({
  ...BASE[i % BASE.length],
  id: i + 1,
  marks: 4,
  negativeMarks: 1,
  page: Math.min(6, 1 + Math.floor(i / 5)),
}));

/** The question the teacher adds by hand in the builder. */
export const ADDED_QUESTION = {
  id: 31,
  type: 'single',
  question: 'A block of mass $2\\,\\text{kg}$ slides on a frictionless surface at $3\\,\\text{m/s}$. Its kinetic energy is:',
  options: { A: '$3\\,\\text{J}$', B: '$6\\,\\text{J}$', C: '$9\\,\\text{J}$', D: '$18\\,\\text{J}$' },
  correctAnswer: 'C',
  marks: 4,
  negativeMarks: 1,
};
