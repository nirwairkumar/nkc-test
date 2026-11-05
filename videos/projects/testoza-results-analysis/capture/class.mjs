// The demo class for "Understanding Results": one SSC CGL weekly mock (4 sections × 5 questions,
// +2 / −0.5, 20 min) and the 52 candidates who opened it (48 submitted, 4 dropped).
// Every per-question number the voice quotes is set here (PLAN), and the answers are dealt so that
// stronger candidates get more right. Deterministic: same seed, same class, every run.
// `node capture/class.mjs` prints the report numbers the script must match.

export const TITLE = 'SSC CGL Weekly Mock 12';
export const DURATION = 20;
export const MARKS = 2;
export const NEG = 0.5;
/** Sunday 25 Oct 2026, 10:00–10:35 IST. */
export const EXAM = { startedAt: '2026-10-25T04:30:00.000Z', endedAt: '2026-10-25T05:05:00.000Z' };

const q = (id, topic, question, options, correctAnswer) => ({
  id, type: 'single', marks: String(MARKS), negativeMarks: String(NEG), topic, question, options, correctAnswer,
  groupId: '', passageContent: '',
});

export const SECTIONS = [
  { name: 'Reasoning', questions: [
    q(1, 'Number series', 'Find the next number in the series: 3, 8, 15, 24, 35, ?', { A: '46', B: '48', C: '49', D: '50' }, 'B'),
    q(2, 'Coding-decoding', 'If CAT is written as 3120 (C = 3, A = 1, T = 20), how is DOG written?', { A: '4157', B: '4158', C: '3157', D: '4167' }, 'A'),
    q(3, 'Analogy', 'Doctor : Hospital :: Teacher : ?', { A: 'Student', B: 'School', C: 'Chalk', D: 'Exam' }, 'B'),
    q(4, 'Direction sense', 'Ravi walks 5 km north, turns right and walks 3 km, then turns right again and walks 5 km. How far is he from his starting point?', { A: '3 km', B: '5 km', C: '8 km', D: '13 km' }, 'A'),
    q(5, 'Classification', 'Find the odd one out.', { A: '121', B: '144', C: '169', D: '190' }, 'D'),
  ] },
  { name: 'General Awareness', questions: [
    q(6, 'Polity', 'Which Article of the Constitution of India abolishes untouchability?', { A: 'Article 14', B: 'Article 17', C: 'Article 21', D: 'Article 32' }, 'B'),
    q(7, 'History', 'In which year was the Battle of Plassey fought?', { A: '1757', B: '1764', C: '1857', D: '1761' }, 'A'),
    q(8, 'Science', 'Which gas makes up most of the Earth’s atmosphere?', { A: 'Oxygen', B: 'Carbon dioxide', C: 'Nitrogen', D: 'Argon' }, 'C'),
    q(9, 'Geography', 'Loktak Lake is in which state?', { A: 'Manipur', B: 'Mizoram', C: 'Assam', D: 'Meghalaya' }, 'A'),
    q(10, 'Economy', 'In India, who decides the repo rate?', { A: 'SEBI', B: 'The RBI’s Monetary Policy Committee', C: 'The Finance Commission', D: 'NITI Aayog' }, 'B'),
  ] },
  { name: 'Quantitative Aptitude', questions: [
    q(11, 'Percentage', 'What is 15% of 240?', { A: '32', B: '36', C: '38', D: '42' }, 'B'),
    q(12, 'Ratio', 'In a class the ratio of boys to girls is 3 : 2. If there are 40 girls, how many boys are there?', { A: '50', B: '60', C: '64', D: '80' }, 'B'),
    q(13, 'Discount', 'A shopkeeper gives two successive discounts of 20% and 10%. What single discount is the same as these two?', { A: '28%', B: '30%', C: '25%', D: '32%' }, 'A'),
    q(14, 'Average', 'The average of five numbers is 20. When one number is removed, the average of the rest is 18. Which number was removed?', { A: '22', B: '26', C: '28', D: '30' }, 'C'),
    q(15, 'Time and work', 'A can finish a piece of work in 12 days and B in 18 days. They work together for 4 days, and then A leaves. In how many more days will B finish the rest of the work?', { A: '6', B: '7', C: '8', D: '9' }, 'C'),
  ] },
  { name: 'English', questions: [
    q(16, 'Vocabulary', 'Choose the word closest in meaning to ABUNDANT.', { A: 'Scarce', B: 'Plentiful', C: 'Rare', D: 'Tiny' }, 'B'),
    q(17, 'Vocabulary', 'Choose the word opposite in meaning to ANCIENT.', { A: 'Old', B: 'Modern', C: 'Historic', D: 'Antique' }, 'B'),
    q(18, 'Idioms', 'What does the idiom “a piece of cake” mean?', { A: 'Something very easy', B: 'A sweet dish', C: 'A small share', D: 'A celebration' }, 'A'),
    q(19, 'Error spotting', 'Find the part with an error: One of my friend / is going / to Delhi tomorrow. / No error', { A: 'One of my friend', B: 'is going', C: 'to Delhi tomorrow.', D: 'No error' }, 'A'),
    q(20, 'Grammar', 'Fill in the blank: She has been working here ___ 2019.', { A: 'since', B: 'for', C: 'from', D: 'by' }, 'A'),
  ] },
];

/** Per question, of the 48 who submitted: how many picked each option, and how many left it blank. */
const PLAN = {
  1: { A: 4, B: 38, C: 2, D: 1, blank: 3 },
  2: { A: 36, B: 6, C: 3, D: 1, blank: 2 },
  3: { A: 3, B: 42, C: 1, D: 1, blank: 1 },
  4: { A: 30, B: 10, C: 3, D: 1, blank: 4 },
  5: { A: 3, B: 4, C: 5, D: 34, blank: 2 },
  6: { A: 6, B: 29, C: 5, D: 3, blank: 5 },
  7: { A: 28, B: 7, C: 5, D: 2, blank: 6 },
  8: { A: 4, B: 1, C: 41, D: 1, blank: 1 },
  9: { A: 14, B: 11, C: 10, D: 8, blank: 5 },   // spread evenly: guessing
  10: { A: 7, B: 25, C: 7, D: 5, blank: 4 },
  11: { A: 4, B: 35, C: 4, D: 2, blank: 3 },
  12: { A: 5, B: 31, C: 2, D: 6, blank: 4 },
  13: { A: 11, B: 26, C: 4, D: 3, blank: 4 },   // the trap: 20% + 10% added up to 30%
  14: { A: 8, B: 9, C: 19, D: 3, blank: 9 },
  15: { A: 5, B: 7, C: 10, D: 4, blank: 22 },   // left blank: time ran out, or the chapter isn't done
  16: { A: 4, B: 39, C: 2, D: 1, blank: 2 },
  17: { A: 3, B: 41, C: 1, D: 2, blank: 1 },
  18: { A: 37, B: 3, C: 4, D: 2, blank: 2 },
  19: { A: 21, B: 4, C: 2, D: 17, blank: 4 },   // "No error" trap
  20: { A: 30, B: 12, C: 2, D: 1, blank: 3 },
};

const NAMES = [
  'Aditi Sharma', 'Rahul Verma', 'Sneha Patil', 'Mohd. Arif', 'Priyanka Yadav', 'Vikas Kumar', 'Neha Gupta', 'Saurabh Mishra',
  'Pooja Rani', 'Amit Chauhan', 'Kavita Joshi', 'Deepak Singh', 'Anjali Thakur', 'Rohit Meena', 'Shalini Dubey', 'Manish Tiwari',
  'Ritu Saini', 'Gaurav Pandey', 'Nisha Kumari', 'Arjun Nair', 'Simran Kaur', 'Karan Malhotra', 'Divya Iyer', 'Suresh Reddy',
  'Megha Jain', 'Ajay Rawat', 'Komal Sharma', 'Imran Khan', 'Swati Bhatt', 'Nitin Prajapati', 'Payal Soni', 'Harish Negi',
  'Tanvi Kulkarni', 'Ravi Shankar', 'Jyoti Bisht', 'Abhishek Roy', 'Preeti Chaudhary', 'Sunil Bairwa', 'Kirti Agarwal', 'Vivek Rathore',
  'Monika Sahu', 'Lalit Kumar', 'Sapna Devi', 'Rajat Sethi', 'Bhavna Rao', 'Yogesh Patel', 'Rekha Mondal', 'Sachin Gurjar',
  // dropped (started, never submitted)
  'Akash Jat', 'Muskan Ali', 'Pankaj Yadav', 'Sonal Mehra',
];
export const SUBMITTED = 48;
/** The four who left: how many they had answered, and how they left. */
export const DROPPED = [
  { answered: 2, how: 'stale', leftAfter: 3 }, { answered: 3, how: 'abandoned', leftAfter: 4 },
  { answered: 11, how: 'abandoned', leftAfter: 9 }, { answered: 14, how: 'stale', leftAfter: 13 },
];

function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const questions = SECTIONS.flatMap((s) => s.questions.map((qq) => ({ ...qq, section: s.name })));

/** The class: { i, name, roll, answers{id: key}, correct, wrong, blank, score, ability, startMin, takenSec, dropped? }. */
export const TUNE = { seed: 2, span: 1.5, tail: 1, noise: 3.5 };
export function buildClass({ seed, span, tail, noise } = TUNE) {
  const rand = rng(seed);
  // Ability falls from the topper down, with a weaker tail (a batch that has split a little).
  const ability = Array.from({ length: SUBMITTED }, (_, i) => {
    const x = i / (SUBMITTED - 1);
    return span * (0.6 - x) - (x > 0.78 ? tail * (x - 0.78) / 0.22 : 0);
  });
  const answers = Array.from({ length: SUBMITTED }, () => ({}));
  for (const qq of questions) {
    const p = PLAN[qq.id];
    const right = p[qq.correctAnswer];
    const noisy = ability.map((a, i) => ({ i, v: a + (rand() - 0.5) * noise }));
    noisy.sort((x, y) => y.v - x.v);
    const rest = noisy.slice(right);
    noisy.slice(0, right).forEach(({ i }) => { answers[i][qq.id] = qq.correctAnswer; });
    // Blanks lean to the weaker side of the rest (except Q15: everyone runs out of time on it).
    const blankPick = rest.map(({ i, v }) => ({ i, w: (qq.id === 15 ? 0 : -v * 0.8) + rand() * 1.6 })).sort((x, y) => y.w - x.w);
    const blanks = new Set(blankPick.slice(0, p.blank).map((b) => b.i));
    const wrongPool = rest.filter(({ i }) => !blanks.has(i)).map(({ i }) => i).sort(() => rand() - 0.5);
    const keys = Object.keys(qq.options).filter((k) => k !== qq.correctAnswer);
    let k = 0;
    for (const key of keys) for (let n = 0; n < p[key]; n++) answers[wrongPool[k++]][qq.id] = key;
    if (k !== wrongPool.length) throw new Error(`Q${qq.id}: plan adds up to ${right + p.blank + k}, not ${SUBMITTED}`);
  }
  // Names follow the final rank (Aditi tops the list); roll numbers are mixed, as in a real batch.
  const roll = (k) => `CGL-${String(((k * 29) % NAMES.length) + 1).padStart(2, '0')}`;
  const scored = answers.map((a, i) => {
    let c = 0, w = 0;
    for (const qq of questions) { if (a[qq.id] === undefined) continue; if (a[qq.id] === qq.correctAnswer) c++; else w++; }
    return { i, score: c * MARKS - w * NEG, w, b: questions.length - c - w };
  }).sort((x, y) => y.score - x.score || x.w - y.w || x.b - y.b);
  const order = scored.map((s) => s.i);
  const people = NAMES.map((name, k) => ({ i: k, name, roll: roll(k) }));
  const out = order.map((src, k) => people[k]).map((c, k) => {
    const i = order[k];
    let correct = 0, wrong = 0;
    for (const qq of questions) { const a = answers[i][qq.id]; if (a === undefined) continue; if (a === qq.correctAnswer) correct++; else wrong++; }
    const blank = questions.length - correct - wrong;
    const score = correct * MARKS - wrong * NEG;
    const startMin = (c.i * 7 % 11) * 0.5;                               // opened between 10:00 and 10:05
    const takenSec = Math.round(Math.min(DURATION * 60 - 5, 640 + rand() * 420 + (questions.length - blank) * 14));
    return { ...c, answers: answers[i], correct, wrong, blank, score, startMin, takenSec };
  });
  const dropped = people.slice(SUBMITTED).map((c, k) => ({ ...c, ...DROPPED[k], startMin: 0.5 + k, dropped: true }));
  return { questions, submitted: out, dropped };
}

/* ── node capture/class.mjs: the numbers the report will show ───────────── */
if (process.argv[1] && process.argv[1].endsWith('class.mjs')) {
  const { questions: qs, submitted } = buildClass();
  const max = qs.length * MARKS;
  const ranked = [...submitted].sort((a, b) => b.score - a.score || a.wrong - b.wrong || a.blank - b.blank);
  const pcts = ranked.map((r) => (r.score / max) * 100);
  const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
  const bins = [0, 20, 40, 60, 80].map((f) => pcts.filter((p) => (f === 0 ? p < 20 : f === 80 ? p >= 80 : p >= f && p < f + 20)).length);
  console.log(`avg ${avg.toFixed(1)}% (${(avg * max / 100).toFixed(1)}/${max}) · high ${ranked[0].name} ${pcts[0].toFixed(1)}% · low ${ranked.at(-1).name} ${pcts.at(-1).toFixed(1)}%`);
  console.log('spread 0-19 / 20-39 / 40-59 / 60-79 / 80-100:', bins.join(' / '), '· below 40%:', pcts.filter((p) => p < 40).length);
  console.log('top 5:', ranked.slice(0, 5).map((r) => `${r.name} ${r.score}`).join(', '));
  console.log('bottom 5:', ranked.slice(-5).map((r) => `${r.name} ${r.score}`).join(', '));
  for (const s of SECTIONS) {
    const ids = s.questions.map((x) => x.id);
    const right = ids.reduce((n, id) => n + submitted.filter((c) => c.answers[id] === qs.find((x) => x.id === id).correctAnswer).length, 0);
    console.log(`${s.name}: ${(right / (ids.length * submitted.length) * 100).toFixed(1)}%`);
  }
  const negs = submitted.map((c) => c.wrong * NEG);
  console.log('negative marks lost: avg', (negs.reduce((a, b) => a + b, 0) / negs.length).toFixed(2), 'max', Math.max(...negs));
  const times = submitted.map((c) => c.takenSec / 60);
  console.log('time taken min', Math.min(...times).toFixed(1), 'max', Math.max(...times).toFixed(1));
}
